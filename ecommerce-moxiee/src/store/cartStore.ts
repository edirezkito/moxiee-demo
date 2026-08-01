import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { CartItem, Product, ProductVariation } from "@/types";

interface CartLine {
  productId: string;
  variationId: string | null;
  quantity: number;
  unitPrice: number;
}

interface CartState {
  lines: CartLine[];
  promoCode: string | null;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  add: (product: Product, variation?: ProductVariation | null, qty?: number) => void;
  remove: (productId: string, variationId: string | null) => void;
  setQty: (productId: string, variationId: string | null, qty: number) => void;
  clear: () => void;
  applyPromo: (code: string | null) => void;
  syncFromServer: (items: CartItem[]) => void;
  count: () => number;
}

function lineKey(productId: string, variationId: string | null) {
  return `${productId}::${variationId ?? "base"}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      promoCode: null,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      add: (product, variation, qty = 1) => {
        const variationId = variation?.id ?? null;
        const unitPrice = variation
          ? Number(product.discount_price ?? product.price) + Number(variation.price_adjustment)
          : Number(product.discount_price ?? product.price);
        const key = lineKey(product.id, variationId);
        set((state) => {
          const existing = state.lines.find((l) => lineKey(l.productId, l.variationId) === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                lineKey(l.productId, l.variationId) === key
                  ? { ...l, quantity: l.quantity + qty }
                  : l
              ),
            };
          }
          return { lines: [...state.lines, { productId: product.id, variationId, quantity: qty, unitPrice }] };
        });
        void persistToServer();
      },
      remove: (productId, variationId) => {
        const key = lineKey(productId, variationId);
        set((state) => ({ lines: state.lines.filter((l) => lineKey(l.productId, l.variationId) !== key) }));
        void persistToServer();
      },
      setQty: (productId, variationId, qty) => {
        if (qty <= 0) {
          get().remove(productId, variationId);
          return;
        }
        const key = lineKey(productId, variationId);
        set((state) => ({
          lines: state.lines.map((l) =>
            lineKey(l.productId, l.variationId) === key ? { ...l, quantity: qty } : l
          ),
        }));
        void persistToServer();
      },
      clear: () => {
        set({ lines: [], promoCode: null });
        void persistToServer();
      },
      applyPromo: (code) => {
        set({ promoCode: code });
        void persistToServer();
      },
      syncFromServer: (items) => {
        set({
          lines: items.map((i) => ({
            productId: i.product_id,
            variationId: i.variation_id,
            quantity: i.quantity,
            unitPrice: Number(i.unit_price),
          })),
          promoCode: null,
        });
      },
      count: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
    }),
    {
      name: "moxiee-cart",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

// Persist cart to server when authenticated. The anon user keeps cart locally only.
// We access auth via a one-off subscription rather than importing the hook here.
async function persistToServer() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return;
  const userId = session.user.id;
  const lines = useCartStore.getState().lines;
  const promoCode = useCartStore.getState().promoCode;

  // upsert a single cart row per user
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let cartId = cart?.id;
  if (!cartId) {
    const { data: newCart } = await supabase
      .from("carts")
      .insert({ user_id: userId, promo_code: promoCode })
      .select("id")
      .single();
    cartId = newCart?.id;
  } else {
    await supabase.from("carts").update({ promo_code: promoCode, updated_at: new Date().toISOString() }).eq("id", cartId);
  }
  if (!cartId) return;

  // replace items
  await supabase.from("cart_items").delete().eq("cart_id", cartId);
  if (lines.length === 0) return;
  await supabase.from("cart_items").insert(
    lines.map((l) => ({
      cart_id: cartId,
      product_id: l.productId,
      variation_id: l.variationId,
      quantity: l.quantity,
      unit_price: l.unitPrice,
    }))
  );
}

export async function loadServerCart(userId: string) {
  const { data: cart } = await supabase
    .from("carts")
    .select("id, promo_code, cart_items(id, product_id, variation_id, quantity, unit_price, product:products(*))")
    .eq("user_id", userId)
    .maybeSingle();
  if (cart && (cart as any).cart_items) {
    useCartStore.getState().syncFromServer((cart as any).cart_items as CartItem[]);
  }
}
