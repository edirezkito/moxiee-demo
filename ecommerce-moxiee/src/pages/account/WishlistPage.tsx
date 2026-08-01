import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";
import { fetchWishlist, removeFromWishlist } from "@/lib/commerceApi";
import { useAuth } from "@/contexts/AuthContext";
import type { Product } from "@/types";
import { toast } from "@/store/toastStore";

export function WishlistPage() {
  const { user } = useAuth();
  const { refresh } = useWishlist();
  const [items, setItems] = useState<{ id: string; product: Product }[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    try {
      const data = await fetchWishlist(user.id);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  async function remove(id: string) {
    try {
      await removeFromWishlist(id);
      toast.success("Removed from wishlist");
      await load();
      refresh();
    } catch (e: any) {
      toast.error("Could not remove", e?.message);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <Heart className="size-10 text-muted-foreground/40" />
        <p className="mt-4 font-display font-semibold">Your wishlist is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">Tap the heart on any product to save it for later.</p>
        <Link to="/shop" className="mt-5">
          <Button variant="gradient">Browse products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map(({ id, product }) => (
          <div key={id} className="relative">
            <ProductCard product={product} />
            <button
              onClick={() => remove(id)}
              className="absolute left-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm backdrop-blur transition-all hover:scale-110"
              aria-label="Remove from wishlist"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
