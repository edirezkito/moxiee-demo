import { Link } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { useCartStore } from "@/store/cartStore";
import { useWishlist } from "@/hooks/useWishlist";
import { cn, discountPercent, effectivePrice } from "@/lib/utils";
import { useDisplayPrice } from "@/lib/useDisplayPrice";
import type { Product } from "@/types";
import { HeartButton } from "@/components/product/HeartButton";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const add = useCartStore((s) => s.add);
  const { toggle, has } = useWishlist();
  const isWished = has(product.id);
  const money = useDisplayPrice();
  const price = effectivePrice(product.price, product.discount_price);
  const off = discountPercent(product.price, product.discount_price);
  const outOfStock = product.stock <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      className="group relative"
    >
      <Link
        to={`/product/${product.slug}`}
        className="block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.images[0] ?? "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=600"}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {off > 0 && <Badge variant="destructive">-{off}%</Badge>}
            {product.is_bestseller && <Badge variant="warning">Bestseller</Badge>}
            {outOfStock && <Badge variant="secondary">Out of stock</Badge>}
          </div>
          <div className="absolute right-3 top-3">
            <HeartButton active={isWished} onClick={() => toggle(product.id)} />
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.brand?.name ?? product.category?.name}
          </p>
          <h3 className="mt-1 line-clamp-1 font-display text-sm font-semibold leading-tight">
            {product.name}
          </h3>
          <Rating value={product.rating} count={product.review_count} showValue className="mt-1.5" />

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-base font-bold">{money(price)}</span>
              {off > 0 && (
                <span className="text-xs text-muted-foreground line-through">
                  {money(product.price)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <button
        onClick={() => add(product, null, 1)}
        disabled={outOfStock}
        className={cn(
          "absolute bottom-4 right-4 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-all duration-300",
          "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
          "hover:bg-primary-600 active:scale-90 disabled:opacity-0 disabled:cursor-not-allowed"
        )}
        aria-label="Add to cart"
      >
        <ShoppingCart className="size-4" />
      </button>
    </motion.div>
  );
}
