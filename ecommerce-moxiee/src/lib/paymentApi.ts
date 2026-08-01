import { supabase } from "@/lib/supabase";

interface StripeCheckoutInput {
  items: { productId: string; variationId: string | null; quantity: number }[];
  shippingAddress: Record<string, string>;
  promoCode: string | null;
  successUrl: string;
  cancelUrl: string;
  /** The currency the shopper has selected in the currency switcher —
   *  Stripe will actually charge the card in this currency. */
  currency: string;
}

/**
 * Calls the "stripe-checkout" Supabase Edge Function, which re-validates
 * prices/stock/promo server-side and creates a real Stripe Checkout
 * Session. Returns the hosted Stripe URL to redirect the browser to.
 */
export async function createStripeCheckoutSession(
  input: StripeCheckoutInput
): Promise<{ url: string; orderId: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be signed in to check out.");
  }

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Could not start checkout. Please try again.");
  }
  return data;
}

/**
 * Sends the order confirmation email for a Cash on Delivery order.
 * (Card/wallet orders are emailed automatically by the stripe-webhook
 * function once Stripe confirms payment — no need to call this for those.)
 * Best-effort: failures here should not block the checkout success flow.
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-order-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ orderId }),
    });
  } catch (err) {
    console.warn("Could not send order confirmation email:", err);
  }
}
