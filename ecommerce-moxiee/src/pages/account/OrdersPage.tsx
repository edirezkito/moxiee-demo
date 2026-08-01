import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserOrders } from "@/lib/commerceApi";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive"> = {
  pending: "warning",
  processing: "default",
  shipped: "default",
  delivered: "success",
  cancelled: "destructive",
  refunded: "destructive",
};

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await fetchUserOrders(user.id);
        setOrders(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <Package className="size-10 text-muted-foreground/40" />
        <p className="mt-4 font-display font-semibold">No orders yet</p>
        <p className="mt-1 text-sm text-muted-foreground">When you place your first order, it'll show up here.</p>
        <Link to="/shop" className="mt-5">
          <Button variant="gradient">Start shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          to={`/account/orders/${order.id}`}
          className="block rounded-xl border border-border bg-card p-5 transition-all hover:shadow-card-hover"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                <Badge variant={statusVariant[order.status] ?? "default"} className="capitalize">{order.status}</Badge>
                {order.payment_status === "paid" && <Badge variant="success">Paid</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(order.created_at)} · {order.order_items?.length ?? 0} item(s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-lg font-bold">{formatCurrency(order.total)}</span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
