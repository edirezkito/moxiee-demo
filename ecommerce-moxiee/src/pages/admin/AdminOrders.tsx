import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingCart, Undo2 } from "lucide-react";
import { toast } from "@/store/toastStore";

const statusOptions: Order["status"][] = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
// "refunded" is intentionally left out here — it's only ever set by the
// real Stripe refund action below, never picked manually, so the label
// can't drift out of sync with an actual refund.
const paymentOptions: Order["payment_status"][] = ["unpaid", "paid", "failed"];

// A "pending"/"unpaid" order older than this is almost certainly an
// abandoned Stripe Checkout session — the customer opened checkout but
// never completed payment. The checkout.session.expired webhook already
// auto-cancels these after 30 minutes (see stripe-checkout), but this
// flags any that slip through (e.g. a missed webhook delivery) so admins
// can spot and clean them up manually too.
const ABANDONED_AFTER_MINUTES = 45;
function isAbandoned(o: Order): boolean {
  if (o.status !== "pending" || o.payment_status !== "unpaid") return false;
  const ageMinutes = (Date.now() - new Date(o.created_at).getTime()) / 60000;
  return ageMinutes > ABANDONED_AFTER_MINUTES;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive"> = {
  pending: "warning",
  processing: "default",
  shipped: "default",
  delivered: "success",
  cancelled: "destructive",
  refunded: "destructive",
};

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setOrders((data as Order[]) ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function updateStatus(id: string, status: Order["status"], paymentStatus?: Order["payment_status"]) {
    try {
      const patch: Record<string, string> = { status, updated_at: new Date().toISOString() };
      if (paymentStatus) patch.payment_status = paymentStatus;
      // Auto-stamp shipped/delivered timestamps so Admin > Track Orders has
      // something to sort/measure by, even if tracking # is added later.
      if (status === "shipped") patch.shipped_at = new Date().toISOString();
      if (status === "delivered") patch.delivered_at = new Date().toISOString();
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status, payment_status: paymentStatus ?? o.payment_status } : o)));
    } catch (e: any) {
      console.error(e);
    }
  }

  async function refundOrder(order: Order) {
    if (!confirm(`Refund ${formatCurrency(order.total)} to the customer via Stripe? This cannot be undone.`)) {
      return;
    }
    setRefundingId(order.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refund failed");

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, payment_status: "refunded", status: "refunded" } : o))
      );
      toast.success("Refund issued", "The customer will see the refund on their statement in a few days.");
    } catch (e: any) {
      toast.error("Refund failed", e?.message ?? "Please try again.");
    } finally {
      setRefundingId(null);
    }
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-lg" />)}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <ShoppingCart className="size-10 text-muted-foreground/40" />
        <p className="mt-4 font-semibold">No orders yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Orders will appear here once customers start buying.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
          <option value="all">All orders</option>
          {statusOptions.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} order(s)</span>
      </div>

      <div className="space-y-3">
        {filtered.map((o) => (
          <div key={o.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">#{o.id.slice(0, 8)}</p>
                  <Badge variant={statusVariant[o.status] ?? "default"} className="capitalize">{o.status}</Badge>
                  <Badge variant={o.payment_status === "paid" ? "success" : "warning"} className="capitalize">{o.payment_status}</Badge>
                  {isAbandoned(o) && (
                    <Badge variant="destructive" title="No payment completed within 45 minutes — likely abandoned at Stripe checkout.">
                      Abandoned
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(o.created_at)} · {o.order_items?.length ?? 0} item(s) · {o.payment_method}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-lg font-bold">{formatCurrency(o.total)}</span>
                {o.currency && o.currency !== "USD" && (
                  <span className="ml-1 text-xs text-muted-foreground" title="Amount above is the USD-equivalent bookkeeping total. Customer was actually charged in this currency.">
                    (paid in {o.currency})
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">Update status:</span>
              <Select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value as Order["status"])} className="h-8 w-36 text-xs">
                {statusOptions.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </Select>
              <Select value={o.payment_status} onChange={(e) => updateStatus(o.id, o.status, e.target.value as Order["payment_status"])} className="h-8 w-28 text-xs">
                {paymentOptions.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </Select>
              {(o.payment_method === "card" || o.payment_method === "wallet") && o.payment_status === "paid" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={refundingId === o.id}
                  onClick={() => refundOrder(o)}
                >
                  <Undo2 className="size-3.5" />
                  {refundingId === o.id ? "Refunding..." : "Refund via Stripe"}
                </Button>
              )}
              {o.payment_status === "refunded" && (
                <span className="text-xs text-muted-foreground">✓ Refunded via Stripe</span>
              )}
              {isAbandoned(o) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => updateStatus(o.id, "cancelled", "failed")}
                >
                  Cancel abandoned order
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
