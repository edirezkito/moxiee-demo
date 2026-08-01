import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Minus, Plus, ShoppingCart, Heart, Share2, Truck, ShieldCheck, RotateCcw,
  ChevronRight, Star, Check,
} from "lucide-react";
import { fetchProductBySlug, fetchProductReviews, fetchRelatedProducts, createReview } from "@/lib/catalogApi";
import type { Product, ProductVariation, Review } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { ProductCard } from "@/components/product/ProductCard";
import { HeartButton } from "@/components/product/HeartButton";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { toast } from "@/store/toastStore";
import { useOutletContext } from "react-router-dom";
import { cn, discountPercent, effectivePrice, formatDate } from "@/lib/utils";
import { Seo } from "@/components/Seo";
import { useDisplayPrice } from "@/lib/useDisplayPrice";
import { Textarea, Label } from "@/components/ui/Input";

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const money = useDisplayPrice();
  const add = useCartStore((s) => s.add);
  const { toggle, has } = useWishlist();
  const { openCart } = useOutletContext<{ openCart: () => void }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"description" | "reviews">("description");

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const p = await fetchProductBySlug(slug);
        if (!mounted) return;
        setProduct(p);
        if (p) {
          setActiveImage(0);
          setSelectedVariation(p.product_variations?.[0] ?? null);
          setQty(1);
          const [rel, revs] = await Promise.all([
            fetchRelatedProducts(p, 4),
            fetchProductReviews(p.id),
          ]);
          if (!mounted) return;
          setRelated(rel);
          setReviews(revs);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  const price = useMemo(() => {
    if (!product) return 0;
    const base = effectivePrice(product.price, product.discount_price);
    return selectedVariation ? base + Number(selectedVariation.price_adjustment) : base;
  }, [product, selectedVariation]);

  if (loading) {
    return (
      <div className="container-page py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="skeleton aspect-square rounded-2xl" />
          <div className="space-y-4">
            <div className="skeleton h-4 w-1/4" />
            <div className="skeleton h-10 w-3/4" />
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-page flex flex-col items-center justify-center py-24 text-center">
        <p className="font-display text-2xl font-bold">Product not found</p>
        <p className="mt-2 text-sm text-muted-foreground">The product you're looking for doesn't exist or has been removed.</p>
        <Link to="/shop" className="mt-6">
          <Button variant="gradient">Back to shop</Button>
        </Link>
      </div>
    );
  }

  const off = discountPercent(product.price, product.discount_price);
  const outOfStock = (selectedVariation?.stock ?? product.stock) <= 0;

  function handleAddToCart() {
    if (!product) return;
    add(product, selectedVariation, qty);
    toast.success("Added to cart", `${qty} × ${product.name}`);
    openCart();
  }

  return (
    <div className="container-page py-8">
      <Seo
        title={product.name}
        description={product.description?.slice(0, 155) ?? `Shop ${product.name} at Moxiee.`}
        image={product.images?.[0]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          image: product.images,
          brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: effectivePrice(product.price, product.discount_price),
            availability: outOfStock
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
          },
          ...(product.review_count > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: product.rating,
                  reviewCount: product.review_count,
                },
              }
            : {}),
        }}
      />
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="size-3.5" />
        <Link to="/shop" className="hover:text-foreground">Shop</Link>
        {product.category && (
          <>
            <ChevronRight className="size-3.5" />
            <Link to={`/shop?category=${product.category.slug}`} className="hover:text-foreground">{product.category.name}</Link>
          </>
        )}
        <ChevronRight className="size-3.5" />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <motion.div
            key={activeImage}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted"
          >
            <img
              src={product.images[activeImage] ?? "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=800"}
              alt={product.name}
              className="size-full object-cover"
            />
            {off > 0 && (
              <Badge variant="destructive" className="absolute left-4 top-4">-{off}%</Badge>
            )}
          </motion.div>

          {product.images.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    "aspect-square overflow-hidden rounded-lg border-2 transition-all",
                    i === activeImage ? "border-primary" : "border-border hover:border-primary/40"
                  )}
                >
                  <img src={img} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            {product.brand && <Badge variant="secondary">{product.brand.name}</Badge>}
            {product.is_bestseller && <Badge variant="warning">Bestseller</Badge>}
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold leading-tight">{product.name}</h1>

          <div className="mt-3 flex items-center gap-3">
            <Rating value={product.rating} showValue count={product.review_count} />
            {product.sku && <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>}
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold">{money(price)}</span>
            {off > 0 && (
              <span className="text-lg text-muted-foreground line-through">{money(product.price)}</span>
            )}
            {off > 0 && <Badge variant="success">Save {off}%</Badge>}
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm">
            {outOfStock ? (
              <span className="font-medium text-destructive">Out of stock</span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-success">
                <Check className="size-4" /> In stock ({selectedVariation?.stock ?? product.stock} available)
              </span>
            )}
          </div>

          {product.description && (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          )}

          {/* Variations */}
          {product.product_variations && product.product_variations.length > 0 && (
            <div className="mt-6">
              <Label>{product.product_variations[0]?.name}</Label>
              <div className="flex flex-wrap gap-2">
                {product.product_variations.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariation(v)}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      selectedVariation?.id === v.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {v.value}
                    {v.price_adjustment > 0 && ` (+${money(v.price_adjustment)})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty + Add to cart */}
          <div className="mt-7 flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-12 text-center font-medium">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <Button
              variant="gradient"
              size="lg"
              className="flex-1"
              disabled={outOfStock}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="size-5" /> Add to cart
            </Button>
            <HeartButton
              active={has(product.id)}
              onClick={() => toggle(product.id)}
              size={22}
              className="border border-border"
            />
            <Button
              variant="outline"
              size="icon"
              className="size-12"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success("Link copied", "Share it with your friends.");
              }}
              aria-label="Share"
            >
              <Share2 />
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-7 grid grid-cols-3 gap-3 border-t border-border pt-6">
            {[
              { icon: Truck, label: "Free shipping over $75" },
              { icon: ShieldCheck, label: "Secure checkout" },
              { icon: RotateCcw, label: "30-day returns" },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-2 text-center">
                <f.icon className="size-5 text-primary" />
                <span className="text-xs text-muted-foreground">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs: description / reviews */}
      <div className="mt-12">
        <div className="flex gap-1 border-b border-border">
          <TabButton active={tab === "description"} onClick={() => setTab("description")}>Description</TabButton>
          <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>
            Reviews ({reviews.length})
          </TabButton>
        </div>

        <div className="py-6">
          {tab === "description" ? (
            <div className="max-w-3xl">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description || "No description available for this product yet."}
              </p>
            </div>
          ) : (
            <ReviewsSection
              reviews={reviews}
              productId={product.id}
              userId={user?.id}
              onSubmitted={async () => {
                const revs = await fetchProductReviews(product.id);
                setReviews(revs);
              }}
            />
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-2xl font-bold">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative -mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors",
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ReviewsSection({
  reviews,
  productId,
  userId,
  onSubmitted,
}: {
  reviews: Review[];
  productId: string;
  userId?: string;
  onSubmitted: () => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      toast.warning("Sign in required", "Please sign in to write a review.");
      return;
    }
    if (!comment.trim()) {
      toast.warning("Add a comment", "Please share your thoughts in the comment field.");
      return;
    }
    setSubmitting(true);
    try {
      await createReview({ productId, userId, rating, comment: comment.trim() });
      toast.success("Review posted", "Thanks for sharing your feedback!");
      setComment("");
      setRating(5);
      await onSubmitted();
    } catch (err: any) {
      toast.error("Could not post review", err?.message);
    } finally {
      setSubmitting(false);
    }
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* List */}
      <div className="lg:col-span-2 space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Star className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-3 font-medium">No reviews yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to review this product.</p>
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-sm font-semibold text-white">
                  {(r.profiles?.full_name ?? "U").charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{r.profiles?.full_name ?? "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                </div>
                <div className="ml-auto">
                  <Rating value={r.rating} />
                </div>
              </div>
              {r.comment && <p className="mt-3 text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))
        )}
      </div>

      {/* Write a review */}
      <div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold">Write a review</h3>
          {reviews.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Rating value={avg} />
              <span className="text-sm font-medium">{avg.toFixed(1)} average</span>
            </div>
          )}
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div>
              <Label>Your rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i)}
                    aria-label={`${i} stars`}
                  >
                    <Star
                      className={cn(
                        "size-7 transition-colors",
                        i <= rating ? "fill-warning text-warning" : "text-muted-foreground/40"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Your review</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={4}
              />
            </div>
            <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
              {submitting ? "Posting..." : "Post review"}
            </Button>
            {!userId && (
              <p className="text-xs text-muted-foreground text-center">You need to be signed in to review.</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
