// supabase/functions/send-order-email/index.ts
//
// Sends the order confirmation email for orders that don't go through
// Stripe (i.e. Cash on Delivery). Called by the client right after a
// successful COD order. Card/wallet orders are emailed automatically by
// the stripe-webhook function instead.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";
import { buildOrderConfirmationEmail } from "../_shared/orderEmailTemplate.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const { orderId } = await req.json();
    if (!orderId) throw new Error("Missing orderId");

    // .eq("user_id", user.id) ensures a user can only trigger this for
    // their own order — same protection RLS gives on direct table reads.
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity, unit_price")
      .eq("order_id", orderId);

    if (user.email) {
      const html = buildOrderConfirmationEmail(order, items ?? []);
      await sendEmail(user.email, `Order confirmed — #${order.id.slice(0, 8)}`, html);
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-order-email error:", err);
    // Non-fatal from the client's point of view — the order itself already
    // succeeded — so we still return 200-ish info but with an error field.
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
