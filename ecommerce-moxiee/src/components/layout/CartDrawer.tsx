import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X, Plus, Minus, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { effectivePrice, formatCurrency } from "@/lib/utils";
import { toast } from "@/store/toastStore";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { lines, setQty, remove, clear } = useCartStore();
  const { user } = useAuth();
  const navigate = useNavigate();

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  function goCheckout() {
    if (!user) {
      toast.warning("Sign in required", "Please sign in to complete your order.");
      navigate("/auth");
      onClose();
      return;
    }
    onClose();
    navigate("/cart");
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5" />
                <h2 className="font-display text-lg font-semibold">
                  Your Cart ({lines.length})
                </h2>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X />
              </Button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                  <ShoppingBag className="size-7 text-muted-foreground" />
                </div>
                <p className="font-display font-semibold">Your cart is empty</p>
                <p className="text-sm text-muted-foreground">Add something you love to get started.</p>
                <Link to="/shop" onClick={onClose}>
                  <Button variant="gradient" className="mt-2">Browse products</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                  <div className="flex flex-col gap-4">
                    {lines.map((line) => {
                      const key = `${line.productId}-${line.variationId ?? "base"}`;
                      return (
                        <div key={key} className="flex gap-3">
                          <div className="size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                            <div className="size-full bg-gradient-to-br from-primary/10 to-violet/10" />
                          </div>
                          <div className="flex flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium line-clamp-1">Item {line.productId.slice(0, 6)}</p>
                              <button
                                onClick={() => remove(line.productId, line.variationId)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                aria-label="Remove"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatCurrency(line.unitPrice)}</p>
                            <div className="mt-auto flex items-center justify-between">
                              <div className="flex items-center rounded-lg border border-border">
                                <button
                                  onClick={() => setQty(line.productId, line.variationId, line.quantity - 1)}
                                  className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
                                  aria-label="Decrease"
                                >
                                  <Minus className="size-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                                <button
                                  onClick={() => setQty(line.productId, line.variationId, line.quantity + 1)}
                                  className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
                                  aria-label="Increase"
                                >
                                  <Plus className="size-3" />
                                </button>
                              </div>
                              <span className="text-sm font-semibold">
                                {formatCurrency(line.unitPrice * line.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={clear}
                    className="mt-4 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear cart
                  </button>
                </div>

                <div className="border-t border-border p-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-display text-lg font-bold">{formatCurrency(subtotal)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Shipping & taxes calculated at checkout.</p>
                  <Button variant="gradient" className="w-full" onClick={goCheckout}>
                    Proceed to Checkout
                  </Button>
                  <Link to="/cart" onClick={onClose} className="block">
                    <Button variant="outline" className="w-full">View full cart</Button>
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export { effectivePrice };
