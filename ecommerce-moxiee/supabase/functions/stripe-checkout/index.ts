// supabase/functions/stripe-checkout/index.ts
//
// Creates a real Stripe Checkout Session for the current user's cart.
//
// Security note: prices, stock, and the promo code discount are all
// re-verified here on the server using the database as the source of
// truth. Nothing from the client request body is trusted for pricing —
// the client only tells us WHICH products/variations/quantities are in
// the cart; we look up the actual prices ourselves.

import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getCurrency, usdToStripeAmount, DEFAULT_CURRENCY } from "../_shared/currency.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
});

const SHIPPING_THRESHOLD = 75;
const SHIPPING_FLAT = 9.99;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured. Set it with: supabase secrets set STRIPE_SECRET_KEY=sk_..."
      );
    }

    // Authenticate the caller using their own JWT, so RLS applies normally
    // for the order insert below (a user can only ever insert an order for
    // themselves — see the RLS policy on public.orders).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    const body = await req.json();
    const cartItems: { productId: string; variationId: string | null; quantity: number }[] = body.items ?? [];
    const shippingAddress = body.shippingAddress ?? null;
    const promoCode: string | null = body.promoCode ?? null;
    const successUrl: string = body.successUrl;
    // The currency the customer had selected in the storefront's currency
    // switcher. Falls back to USD if missing/unrecognized — never trust
    // an unlisted code, since it maps directly to a real Stripe charge.
    const currencyCode: string = getCurrency(body.currency).code ?? DEFAULT_CURRENCY;
    const fxRate = getCurrency(currencyCode).rate;
    const cancelUrl: string = body.cancelUrl;

    if (!cartItems.length) throw new Error("Cart is empty");
    if (!successUrl || !cancelUrl) throw new Error("Missing successUrl/cancelUrl");

    // ---- 1. Look up authoritative product data ----
    const productIds = [...new Set(cartItems.map((i) => i.productId))];
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, discount_price, images, stock, is_active")
      .in("id", productIds);
    if (productsError) throw productsError;

    const variationIds = cartItems.map((i) => i.variationId).filter(Boolean) as string[];
    const { data: variations } = variationIds.length
      ? await supabase.from("product_variations").select("id, price_adjustment").in("id", variationIds)
      : { data: [] as { id: string; price_adjustment: number }[] };

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const orderItemsToInsert: Record<string, unknown>[] = [];
    let subtotal = 0;

    for (const cartItem of cartItems) {
      const product = products?.find((p) => p.id === cartItem.productId);
      if (!product || !product.is_active) {
        throw new Error(`A product in your cart is no longer available.`);
      }
      if (product.stock < cartItem.quantity) {
        throw new Error(`"${product.name}" only has ${product.stock} left in stock.`);
      }

      const variation = cartItem.variationId
        ? variations?.find((v) => v.id === cartItem.variationId)
        : null;
      const basePrice = Number(product.discount_price ?? product.price);
      const unitPrice = basePrice + (variation ? Number(variation.price_adjustment) : 0);

      subtotal += unitPrice * cartItem.quantity;

      const image = Array.isArray(product.images) ? product.images[0] : undefined;
      line_items.push({
        price_data: {
          currency: currencyCode.toLowerCase(),
          product_data: {
            name: product.name,
            images: image ? [image] : undefined,
          },
          // unitPrice is in USD (our base currency) — convert to the
          // customer's selected currency for the ACTUAL Stripe charge, so
          // what they're billed always matches what they saw on-site.
          unit_amount: usdToStripeAmount(unitPrice, currencyCode),
          tax_behavior: "exclusive",
        },
        quantity: cartItem.quantity,
      });

      orderItemsToInsert.push({
        product_id: product.id,
        variation_id: cartItem.variationId,
        product_name: product.name,
        product_image: image ?? null,
        quantity: cartItem.quantity,
        unit_price: unitPrice,
      });
    }

    // ---- 2. Validate promo code server-side ----
    let discount = 0;
    let stripeDiscounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (promoCode) {
      const { data: promo } = await supabase
        .from("promotions")
        .select("discount_percent, is_active, valid_until")
        .eq("code", promoCode)
        .maybeSingle();

      const isValid =
        promo?.is_active && (!promo.valid_until || new Date(promo.valid_until) > new Date());

      if (isValid) {
        discount = Math.round(subtotal * (Number(promo!.discount_percent) / 100) * 100) / 100;
        if (discount > 0) {
          const coupon = await stripe.coupons.create({
            amount_off: usdToStripeAmount(discount, currencyCode),
            currency: currencyCode.toLowerCase(),
            duration: "once",
            name: `Promo: ${promoCode}`,
          });
          stripeDiscounts = [{ coupon: coupon.id }];
        }
      }
    }

    // ---- 3. Shipping ----
    const shipping = subtotal - discount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
    if (shipping > 0) {
      line_items.push({
        price_data: {
          currency: currencyCode.toLowerCase(),
          product_data: { name: "Shipping" },
          unit_amount: usdToStripeAmount(shipping, currencyCode),
          tax_behavior: "exclusive",
        },
        quantity: 1,
      });
    }

    // Tax is NOT calculated here — Stripe Tax calculates it live on the
    // hosted Checkout page based on the address the customer enters there
    // (more accurate than a hand-rolled rate table, and stays correct as
    // tax rates/rules change). See "automatic_tax" below. `total` here is
    // pre-tax; the real, tax-inclusive amount is captured from Stripe in
    // the webhook once payment completes.
    const total = subtotal - discount + shipping;

    // ---- 4. Create the order as "pending / unpaid" BEFORE redirecting to
    // Stripe. This guarantees we never lose a cart even if the buyer closes
    // the tab mid-payment, and the webhook only has to flip its status.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        payment_status: "unpaid",
        payment_method: "card",
        subtotal,
        discount,
        shipping,
        total,
        promo_code: promoCode,
        shipping_address: shippingAddress,
        currency: currencyCode,
        fx_rate: fxRate,
      })
      .select()
      .single();
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsToInsert.map((i) => ({ ...i, order_id: order.id })));
    if (itemsError) throw itemsError;

    // ---- 5. Create the Stripe Checkout Session ----
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      discounts: stripeDiscounts,
      customer_email: user.email ?? undefined,
      // Stripe Tax: automatically calculates the correct tax (VAT/GST/
      // sales tax) for the customer's address. Requires Stripe Tax to be
      // turned on in the Stripe Dashboard first — see CLIENT_README.md.
      // If it isn't enabled, Stripe simply charges $0 tax, so this is
      // safe to leave on even before the merchant sets it up.
      // Disabled by default: Stripe Tax requires a verified business
      // address (head office), and Stripe doesn't yet fully support
      // Indonesia-based merchant accounts for this. Turn this back on
      // once you have a Stripe account in a supported country and have
      // completed the Tax setup in your Stripe Dashboard.
      automatic_tax: { enabled: false },
      shipping_address_collection: {
        allowed_countries: [
          "US", "CA", "GB", "AU", "NZ", "DE", "FR", "ES", "IT", "NL",
          "BE", "SE", "NO", "DK", "FI", "IE", "PT", "AT", "CH", "PL",
          "SG", "MY", "ID", "PH", "TH", "VN", "JP", "KR", "AE", "SA",
          "IN", "BR", "MX", "ZA",
        ],
      },
      // Session link expires in 30 minutes — keeps "abandoned" pending
      // orders short-lived instead of sitting around for 24h (Stripe's
      // default). See stripe-webhook's checkout.session.expired handler.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}order_id=${order.id}`,
      cancel_url: cancelUrl,
      metadata: { order_id: order.id, user_id: user.id },
    });

    // ---- 6. Save the Stripe session id on the order, so we can look up
    // and refund this payment later from the admin dashboard.
    await supabase.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url, orderId: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-checkout error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
