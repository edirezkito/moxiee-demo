import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOrderById } from "@/lib/commerceApi";
import { supabase } from "@/lib/supabase";
import { toast } from "@/store/toastStore";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const statusSteps = ["pending", "processing", "shipped", "delivered"];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // A customer can only self-cancel an order that hasn't been paid yet
  // (Cash on Delivery) and hasn't shipped. Paid Card/Wallet orders need an
  // actual Stripe refund, which only an admin can issue (see Admin >
  // Orders) — so we don't offer self-cancel for those to avoid the order
  // saying "cancelled" while money was still taken.
  const canCancel =
    order &&
    order.payment_status === "unpaid" &&
    (order.status === "pending" || order.status === "processing");

  async function cancelOrder() {
    if (!order || !confirm("Cancel this order? This cannot be undone.")) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);
      if (error) throw error;
      setOrder({ ...order, status: "cancelled" });
      toast.success("Order cancelled", "Your order has been cancelled.");
    } catch (e: any) {
      toast.error("Couldn't cancel order", e?.message ?? "Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        const data = await fetchOrderById(id, user.id);
        setOrder(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, id]);

  if (loading) {
    return <div className="skeleton h-96 rounded-xl" />;
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="size-10 text-muted-foreground/40" />
        <p className="mt-4 font-semibold">Order not found</p>
        <Link to="/account/orders" className="mt-4">
          <Button variant="outline">Back to orders</Button>
        </Link>
      </div>
    );
  }

  const currentStep = statusSteps.indexOf(order.status);

  return (
    <div className="space-y-6">
      <Link to="/account/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to orders
      </Link>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Order #{order.id.slice(0, 8)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Placed on {formatDateTime(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="capitalize">{order.status}</Badge>
            <Badge variant={order.payment_status === "paid" ? "success" : "warning"} className="capitalize">{order.payment_status}</Badge>
            {canCancel && (
              <Button variant="outline" size="sm" disabled={cancelling} onClick={cancelOrder}>
                {cancelling ? "Cancelling..." : "Cancel order"}
              </Button>
            )}
            {order.payment_status === "paid" && (order.status === "pending" || order.status === "processing") && (
              <span className="text-xs text-muted-foreground">
                Already paid — email{" "}
                <a href="mailto:support@moxiee.store" className="underline">support@moxiee.store</a>{" "}
                to request a cancellation/refund.
              </span>
            )}
          </div>
        </div>

        {/* Status tracker */}
        {order.status !== "cancelled" && order.status !== "refunded" && (
          <div className="mt-6 flex items-center">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                    i <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <span className="mt-1.5 text-xs capitalize text-muted-foreground">{step}</span>
                </div>
                {i < statusSteps.length - 1 && (
                  <div className={`mx-2 h-0.5 flex-1 ${i < currentStep ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        )}
        {order.tracking_number && (
          <div className="mt-5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <span className="text-muted-foreground">
              {order.carrier ? `${order.carrier} tracking number:` : "Tracking number:"}
            </span>{" "}
            <span className="font-mono font-semibold">{order.tracking_number}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display font-semibold mb-4">Items</h3>
        <div className="space-y-3">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-gradient-to-br from-primary/10 to-violet/10" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.product_name}</p>
                <p className="text-sm text-muted-foreground">Qty: {item.quantity} · {formatCurrency(item.unit_price)}</p>
              </div>
              <span className="font-semibold">{formatCurrency(item.unit_price * item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary + shipping */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold mb-3">Payment summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-success">-{formatCurrency(order.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{order.shipping === 0 ? "Free" : formatCurrency(order.shipping)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span className="font-display text-lg font-bold">{formatCurrency(order.total)}</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold mb-3">Shipping address</h3>
          {order.shipping_address ? (
            <address className="text-sm not-italic text-muted-foreground leading-relaxed">
              {order.shipping_address.full_name}<br />
              {order.shipping_address.street}<br />
              {order.shipping_address.city}, {order.shipping_address.postal_code}<br />
              {order.shipping_address.country}
              {order.shipping_address.phone && <><br />{order.shipping_address.phone}</>}
            </address>
          ) : (
            <p className="text-sm text-muted-foreground">No shipping address on file.</p>
          )}
        </div>
      </div>
    </div>
  );
}
