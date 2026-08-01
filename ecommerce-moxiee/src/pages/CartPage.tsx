import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, X } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPromotionByCode } from "@/lib/catalogApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useDisplayPrice } from "@/lib/useDisplayPrice";
import { toast } from "@/store/toastStore";
import { motion, AnimatePresence } from "framer-motion";

const SHIPPING_THRESHOLD = 75;
const SHIPPING_FLAT = 9.99;

export function CartPage() {
  const { lines, setQty, remove, promoCode, applyPromo } = useCartStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const money = useDisplayPrice();
  const [promoInput, setPromoInput] = useState(promoCode ?? "");
  const [promoLoading, setPromoLoading] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = (subtotal * discountPercent) / 100;
  const shipping = subtotal >= SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FLAT;
  const total = subtotal - discount + shipping;

  async function applyCode() {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    try {
      const promo = await fetchPromotionByCode(promoInput.trim());
      if (!promo) {
        toast.error("Invalid code", "This promo code doesn't exist or has expired.");
        setDiscountPercent(0);
        return;
      }
      if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        toast.error("Code expired", "This promo code is no longer valid.");
        setDiscountPercent(0);
        return;
      }
      setDiscountPercent(Number(promo.discount_percent));
      applyPromo(promo.code);
      toast.success("Promo applied", `${promo.discount_percent}% off your order.`);
    } catch (err: any) {
      toast.error("Could not apply promo", err?.message);
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo() {
    applyPromo(null);
    setPromoInput("");
    setDiscountPercent(0);
  }

  function checkout() {
    if (!user) {
      toast.warning("Sign in required", "Please sign in to complete your order.");
      navigate("/auth");
      return;
    }
    navigate("/checkout");
  }

  if (lines.length === 0) {
    return (
      <div className="container-page flex flex-col items-center justify-center py-24 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-9 text-muted-foreground" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Looks like you haven't added anything yet.</p>
        <Link to="/shop" className="mt-6">
          <Button variant="gradient" size="lg">Start shopping <ArrowRight className="size-4" /></Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-3xl font-bold">Shopping Cart</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{lines.length} item{lines.length !== 1 ? "s" : ""} in your cart</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {lines.map((line) => {
              const key = `${line.productId}-${line.variationId ?? "base"}`;
              return (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <div className="size-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {line.image ? (
                      <img src={line.image} alt={line.name} className="size-full object-cover" />
                    ) : (
                      <div className="size-full bg-gradient-to-br from-primary/10 to-violet/10" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{line.name}</p>
                        {line.variationLabel && <p className="text-xs text-muted-foreground">{line.variationLabel}</p>}
                        <p className="text-xs text-muted-foreground">Unit price: {money(line.unitPrice)}</p>
                      </div>
                      <button
                        onClick={() => remove(line.productId, line.variationId)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          onClick={() => setQty(line.productId, line.variationId, line.quantity - 1)}
                          className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Decrease"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-medium">{line.quantity}</span>
                        <button
                          onClick={() => setQty(line.productId, line.variationId, line.quantity + 1)}
                          className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Increase"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="font-display text-lg font-bold">
                        {money(line.unitPrice * line.quantity)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all">
            <ArrowRight className="size-4 rotate-180" /> Continue shopping
          </Link>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Order Summary</h2>

            {/* Promo */}
            <div className="mt-4">
              {promoCode && discountPercent > 0 ? (
                <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="size-4 text-success" />
                    <span className="font-medium">{promoCode}</span>
                    <span className="text-success">-{discountPercent}%</span>
                  </div>
                  <button onClick={removePromo} className="text-muted-foreground hover:text-destructive">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Promo code"
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={applyCode} disabled={promoLoading}>
                    {promoLoading ? "..." : "Apply"}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <Row label="Subtotal" value={money(subtotal)} />
              {discount > 0 && <Row label="Discount" value={`-${money(discount)}`} accent="text-success" />}
              <Row
                label="Shipping"
                value={shipping === 0 ? "Free" : money(shipping)}
                accent={shipping === 0 ? "text-success" : undefined}
              />
              {subtotal < SHIPPING_THRESHOLD && subtotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  Add {money(SHIPPING_THRESHOLD - subtotal)} more for free shipping.
                </p>
              )}
              <div className="border-t border-border pt-3">
                <Row label="Total" value={money(total)} bold />
              </div>
            </div>

            <Button variant="gradient" size="lg" className="mt-5 w-full" onClick={checkout}>
              Proceed to checkout <ArrowRight className="size-4" />
            </Button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Secure 256-bit SSL encrypted checkout
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={`${bold ? "font-display text-lg font-bold" : "font-medium"} ${accent ?? ""}`}>{value}</span>
    </div>
  );
}
