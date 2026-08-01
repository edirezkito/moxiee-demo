// supabase/functions/stripe-refund/index.ts
//
// Issues a REAL refund through Stripe for a paid card/wallet order, then
// updates the order's status in the database. Only callable by an admin.
//
// This is what makes "Refunded" in the Admin Orders page an actual refund
// instead of just a label change — money is genuinely returned to the
// customer's card via Stripe.

import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
});

// Service role client: needed to update any order (not just the caller's
// own), after we've verified the caller is an admin below.
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      throw new Error("STRIPE_SECRET_KEY is not configured.");
    }

    // ---- 1. Authenticate the caller and confirm they're an admin ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseCaller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: userError,
    } = await supabaseCaller.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    const { data: profile } = await supabaseCaller
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      throw new Error("Only admins can issue refunds.");
    }

    // ---- 2. Load the order ----
    const { orderId, amount } = await req.json();
    if (!orderId) throw new Error("Missing orderId");

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    if (order.payment_method !== "card" && order.payment_method !== "wallet") {
      throw new Error(
        "This order wasn't paid through Stripe (likely Cash on Delivery) — refund it manually outside the app."
      );
    }
    if (order.payment_status !== "paid") {
      throw new Error(`Only "paid" orders can be refunded (this order is "${order.payment_status}").`);
    }
    if (!order.stripe_payment_intent_id) {
      throw new Error(
        "No Stripe payment record found on this order. It may have been placed before this feature was added — refund it manually in the Stripe Dashboard instead."
      );
    }

    // ---- 3. Issue the refund via Stripe ----
    // Full refund by default; pass `amount` (in dollars) for a partial refund.
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    // ---- 4. Reflect the refund in our own database ----
    const isFullRefund = !amount || amount >= Number(order.total);
    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "refunded",
        status: isFullRefund ? "refunded" : order.status,
      })
      .eq("id", orderId);

    return new Response(JSON.stringify({ refundId: refund.id, status: refund.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-refund error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
