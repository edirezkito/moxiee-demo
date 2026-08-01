import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/store/toastStore";
import { addToWishlist, fetchWishlist, removeFromWishlist } from "@/lib/commerceApi";
import { useCallback, useEffect, useState } from "react";

interface WishlistEntry {
  id: string;
  productId: string;
}

let cache: WishlistEntry[] = [];
let loadPromise: Promise<void> | null = null;

export function useWishlist() {
  const { user } = useAuth();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!user) {
      cache = [];
      return;
    }
    if (!loadPromise) {
      loadPromise = (async () => {
        const items = await fetchWishlist(user.id);
        cache = items.map((i) => ({ id: i.id, productId: i.product.id }));
        setTick((t) => t + 1);
        loadPromise = null;
      })();
    }
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const items = await fetchWishlist(user.id);
    cache = items.map((i) => ({ id: i.id, productId: i.product.id }));
    setTick((t) => t + 1);
  }, [user]);

  const has = useCallback((productId: string) => cache.some((c) => c.productId === productId), []);

  const toggle = useCallback(
    async (productId: string) => {
      if (!user) {
        toast.warning("Sign in required", "Please sign in to save items to your wishlist.");
        return;
      }
      const existing = cache.find((c) => c.productId === productId);
      if (existing) {
        await removeFromWishlist(existing.id);
        cache = cache.filter((c) => c.id !== existing.id);
        setTick((t) => t + 1);
      } else {
        await addToWishlist(user.id, productId);
        cache = [...cache, { id: "tmp-" + productId, productId }];
        setTick((t) => t + 1);
        toast.success("Saved to wishlist");
        // refresh to get the real id
        refresh();
      }
    },
    [user, refresh]
  );

  return { toggle, has, refresh, items: cache };
}
