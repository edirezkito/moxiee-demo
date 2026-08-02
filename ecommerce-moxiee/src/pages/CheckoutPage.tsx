import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Truck, ShieldCheck, Check, Lock, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useDisplayPrice } from "@/lib/useDisplayPrice";
import { useCurrencyStore } from "@/store/currencyStore";
import { CURRENCIES } from "@/lib/currency";
import { placeOrder } from "@/lib/commerceApi";
import { createStripeCheckoutSession, sendOrderConfirmationEmail } from "@/lib/paymentApi";
import { toast } from "@/store/toastStore";

const SHIPPING_THRESHOLD = 75;
const SHIPPING_FLAT = 9.99;

const paymentMethods = [
  { id: "card", label: "Card / Digital Wallet", icon: CreditCard, desc: "Visa, Mastercard, Amex, Apple Pay, Google Pay" },
  { id: "cod", label: "Cash on Delivery", icon: Truck, desc: "Pay when it arrives" },
];

export function CheckoutPage() {
  const { lines, promoCode, clear } = useCartStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const money = useDisplayPrice();
  const currency = useCurrencyStore((s) => s.currency);
  const [form, setForm] = useState({
    full_name: "",
    email: user?.email ?? "",
    street: "",
    city: "",
    postal_code: "",
    country: "United States",
    phone: "",
  });

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const shipping = subtotal >= SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;
  const discount = 0; // handled in cart; checkout uses current totals

  if (lines.length === 0) {
    return (
      <div className="container-page flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Nothing to check out</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your cart is empty.</p>
        <Link to="/shop" className="mt-6">
          <Button variant="gradient">Browse products</Button>
        </Link>
      </div>
    );
  }

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.warning("Sign in required", "Please sign in to place an order.");
      navigate("/auth");
      return;
    }
    setPlacing(true);
    try {
      if (paymentMethod === "card") {
        // Real payment: redirect to Stripe's hosted Checkout page. The
        // order is created server-side (status "pending"/"unpaid") and
        // only flips to "paid" once Stripe confirms payment via webhook.
        const { url } = await createStripeCheckoutSession({
          items: lines.map((l) => ({
            productId: l.productId,
            variationId: l.variationId,
            quantity: l.quantity,
          })),
          shippingAddress: form,
          promoCode,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/checkout`,
          currency,
        });
        window.location.href = url;
        return; // navigating away, keep the button disabled until then
      }

      // Cash on Delivery: no payment gateway involved, order goes straight
      // to "processing" with payment_status "unpaid" (collected on arrival).
      const order = await placeOrder({
        userId: user.id,
        items: lines.map((l) => ({
          product: { id: l.productId, name: l.name, images: l.image ? [l.image] : [], price: l.unitPrice, discount_price: null } as any,
          variationId: l.variationId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        subtotal,
        discount,
        shipping,
        total,
        promoCode,
        paymentMethod,
        shippingAddress: form,
        currency,
        fxRate: CURRENCIES[currency]?.rate ?? 1,
      });
      clear();
      sendOrderConfirmationEmail(order.id); // fire-and-forget
      toast.success("Order placed!", "We'll send you a confirmation shortly.");
      navigate(`/account/orders/${order.id}`);
    } catch (err: any) {
      toast.error("Checkout failed", err?.message ?? "Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-3xl font-bold">Checkout</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Complete your order in a few quick steps.</p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left: shipping + payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">1</span>
              <h2 className="font-display text-lg font-semibold">Shipping information</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required value={form.full_name} onChange={(v) => update("full_name", v)} />
              <Field label="Email" type="email" required value={form.email} onChange={(v) => update("email", v)} />
              <div className="sm:col-span-2">
                <Field label="Street address" required value={form.street} onChange={(v) => update("street", v)} />
              </div>
              <Field label="City" required value={form.city} onChange={(v) => update("city", v)} />
              <Field label="Postal code" required value={form.postal_code} onChange={(v) => update("postal_code", v)} />
              <div>
                <Label>Country</Label>
                <Select value={form.country} onChange={(e) => update("country", e.target.value)}>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>United Kingdom</option>
                  <option>Australia</option>
                  <option>Germany</option>
                  <option>France</option>
                  <option>Singapore</option>
                  <option>Indonesia</option>
                </Select>
              </div>
              <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">2</span>
              <h2 className="font-display text-lg font-semibold">Payment method</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentMethods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
                    paymentMethod === m.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <m.icon className={cn("size-5", paymentMethod === m.id ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                  {paymentMethod === m.id && (
                    <Check className="ml-auto size-4 text-primary" />
                  )}
                </button>
              ))}
            </div>

            {paymentMethod === "card" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-5"
              >
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3.5" /> You'll be redirected to Stripe's secure checkout to complete payment.
                </p>
              </motion.div>
            )}
            {paymentMethod === "cod" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-5"
              >
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3.5" /> Pay with cash when your order arrives.
                </p>
              </motion.div>
            )}
          </section>
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Order summary</h2>
            <div className="mt-4 max-h-64 space-y-3 overflow-y-auto scrollbar-thin pr-1">
              {lines.map((l) => {
                const key = `${l.productId}-${l.variationId ?? "base"}`;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                      {l.image ? (
                        <img src={l.image} alt={l.name} className="size-full object-cover" />
                      ) : (
                        <div className="size-full bg-gradient-to-br from-primary/10 to-violet/10" />
                      )}
                      <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                        {l.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{money(l.unitPrice)}</p>
                    </div>
                    <span className="text-sm font-semibold">{money(l.unitPrice * l.quantity)}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{money(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className={shipping === 0 ? "text-success font-medium" : "font-medium"}>{shipping === 0 ? "Free" : money(shipping)}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Total</span><span className="font-display text-xl font-bold">{money(total)}</span></div>
            </div>

            <Button type="submit" variant="gradient" size="lg" className="mt-5 w-full" disabled={placing}>
              {placing
                ? paymentMethod === "cod" ? "Placing order..." : "Redirecting to Stripe..."
                : <>{paymentMethod === "cod" ? "Place order" : "Continue to payment"} <ArrowRight className="size-4" /></>}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="size-3.5" /> Secure</span>
              <span className="flex items-center gap-1"><Truck className="size-3.5" /> Fast delivery</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
