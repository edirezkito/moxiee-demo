import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/Button";

export function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const clear = useCartStore((s) => s.clear);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // Payment was confirmed by Stripe's redirect back to this page — safe
    // to empty the local cart now. The order's actual payment_status is
    // set by the stripe-webhook function, independent of this page.
    if (!cleared) {
      clear();
      setCleared(true);
    }
  }, [clear, cleared]);

  return (
    <div className="container-page flex flex-col items-center justify-center py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="size-9" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold">Payment successful</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Thanks for your order! We're confirming your payment with Stripe — this usually only
        takes a few seconds, and you'll see the order status update automatically.
      </p>
      <div className="mt-8 flex gap-3">
        {orderId && (
          <Link to={`/account/orders/${orderId}`}>
            <Button variant="gradient">View order</Button>
          </Link>
        )}
        <Link to="/shop">
          <Button variant="outline">Continue shopping</Button>
        </Link>
      </div>
    </div>
  );
}
