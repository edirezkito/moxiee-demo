// supabase/functions/stripe-webhook/index.ts
//
// Receives events directly from Stripe (not from the browser). Verifies
// the webhook signature, then marks the matching order as paid and
// decrements stock — this is the ONLY place an order is marked "paid",
// which is what makes this a real payment integration rather than a
// client-side "trust me" flow.

import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";
import { buildOrderConfirmationEmail } from "../_shared/orderEmailTemplate.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

// Service role client: required because this runs with no logged-in user
// (Stripe calls this directly), so it must bypass RLS to update the order.
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : String(err)}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (!orderId) break;

        await supabaseAdmin
          .from("orders")
          .update({
            status: "processing",
            payment_status: "paid",
            stripe_payment_intent_id:
              typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
            // Stripe Tax calculated the real tax amount on its hosted page;
            // reflect the tax-inclusive total back into our own records so
            // "total" always matches what the customer was actually charged.
            tax: (session.total_details?.amount_tax ?? 0) / 100,
            total: (session.amount_total ?? 0) / 100,
          })
          .eq("id", orderId)
          .eq("payment_status", "unpaid"); // idempotent: won't double-decrement on retries

        const { data: items } = await supabaseAdmin
          .from("order_items")
          .select("product_id, quantity")
          .eq("order_id", orderId);

        for (const item of items ?? []) {
          if (item.product_id) {
            await supabaseAdmin.rpc("decrement_stock", {
              p_product_id: item.product_id,
              p_qty: item.quantity,
            });
          }
        }

        // Send the order confirmation email — best effort, doesn't fail
        // the webhook if email sending has an issue.
        try {
          const { data: fullOrder } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();
          const customerEmail = session.customer_details?.email ?? session.customer_email;
          if (fullOrder && customerEmail) {
            const html = buildOrderConfirmationEmail(fullOrder, items ?? []);
            await sendEmail(customerEmail, `Order confirmed — #${orderId.slice(0, 8)}`, html);
          }
        } catch (emailErr) {
          console.error("Failed to send order confirmation email:", emailErr);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (!orderId) break;

        await supabaseAdmin
          .from("orders")
          .update({ status: "cancelled", payment_status: "failed" })
          .eq("id", orderId)
          .eq("payment_status", "unpaid");
        break;
      }

      default:
        // Ignore other event types.
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-webhook handler error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
