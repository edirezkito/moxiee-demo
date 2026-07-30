import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Truck, ShieldCheck, RotateCcw, Headphones, Sparkles, Tag } from "lucide-react";
import {
  fetchBanners,
  fetchBestsellers,
  fetchCategories,
  fetchBrands,
  fetchFeaturedProducts,
  fetchOnSaleProducts,
  fetchTestimonials,
} from "@/lib/catalogApi";
import { subscribeNewsletter } from "@/lib/catalogApi";
import type { Banner, Brand, Category, Product, Testimonial } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";
import { Button as Btn } from "@/components/ui/Button";
import { toast } from "@/store/toastStore";
import { Rating } from "@/components/ui/Rating";
import { Seo } from "@/components/Seo";

// Hero grid layout: 4 slots with alternating aspect ratios. If fewer than 4
// banners are configured in the admin dashboard, later slots are simply
// skipped rather than breaking the layout.
const HERO_SLOT_ASPECT = ["aspect-[3/4]", "aspect-square", "aspect-square", "aspect-[3/4]"];

export function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [onSale, setOnSale] = useState<Product[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [bn, c, b, f, bs, os, t] = await Promise.all([
          fetchBanners(),
          fetchCategories(),
          fetchBrands(),
          fetchFeaturedProducts(8),
          fetchBestsellers(8),
          fetchOnSaleProducts(8),
          fetchTestimonials(),
        ]);
        if (!mounted) return;
        setBanners(bn);
        setCategories(c);
        setBrands(b);
        setFeatured(f);
        setBestsellers(bs);
        setOnSale(os);
        setTestimonials(t);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <Seo
        title="Moxiee"
        description="Shop curated fashion, electronics, beauty, and home products at Moxiee — fast shipping, secure checkout, easy returns."
      />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -right-32 -top-32 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-32 bottom-0 size-96 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="container-page relative py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" />
                New season collection live
              </div>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Premium products,
                <span className="block text-gradient">delivered beautifully.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                Shop curated fashion, electronics, beauty and home essentials from the world's best brands. Fast, secure, and designed for the way you live.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/shop">
                  <Button variant="gradient" size="lg">
                    Shop now <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link to="/shop?category=fashion">
                  <Button variant="outline" size="lg">Explore fashion</Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-6">
                {[
                  { icon: Truck, label: "Free shipping over $75" },
                  { icon: ShieldCheck, label: "Secure checkout" },
                  { icon: RotateCcw, label: "30-day returns" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <f.icon className="size-4 text-primary" />
                    {f.label}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative hidden lg:block"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img
                    src="https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=500"
                    alt="Fashion"
                    className="aspect-[3/4] w-full rounded-2xl object-cover shadow-soft"
                  />
                  <img
                    src="https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=500"
                    alt="Beauty"
                    className="aspect-square w-full rounded-2xl object-cover shadow-soft"
                  />
                </div>
                <div className="space-y-4 pt-10">
                  <img
                    src="https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=500"
                    alt="Electronics"
                    className="aspect-square w-full rounded-2xl object-cover shadow-soft"
                  />
                  <img
                    src="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=500"
                    alt="Home"
                    className="aspect-[3/4] w-full rounded-2xl object-cover shadow-soft"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-border bg-muted/30">
        <div className="container-page grid grid-cols-2 gap-px sm:grid-cols-4">
          {[
            { icon: Truck, title: "Fast Shipping", desc: "Free over $75" },
            { icon: ShieldCheck, title: "Secure Payment", desc: "256-bit SSL" },
            { icon: RotateCcw, title: "Easy Returns", desc: "30 day policy" },
            { icon: Headphones, title: "24/7 Support", desc: "Always here" },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-3 px-4 py-5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-16">
        <SectionHeader
          eyebrow="Browse"
          title="Shop by category"
          subtitle="Find exactly what you need across our curated departments."
          link={{ to: "/shop", label: "View all" }}
        />
        {loading ? (
          <CategoryGridSkeleton />
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/shop?category=${cat.slug}`}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-card-hover hover:-translate-y-1"
                >
                  <div className="relative size-20 overflow-hidden rounded-full bg-muted">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="size-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="size-full bg-gradient-to-br from-primary/20 to-violet/20" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-center">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Featured */}
      <section className="container-page py-12">
        <SectionHeader
          eyebrow="Handpicked"
          title="Featured products"
          subtitle="Our editors' favorite picks this week."
          link={{ to: "/shop", label: "Shop all" }}
        />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* Promo banner */}
      <section className="container-page py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-700 via-primary-600 to-violet-600 px-8 py-14 text-white sm:px-14">
          <div className="absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-white/10 blur-2xl" />
          <div className="relative max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <Tag className="size-3.5" /> Limited time
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Up to 40% off seasonal favorites</h2>
            <p className="mt-3 text-white/80">Refresh your essentials with our biggest sale of the season. New markdowns added weekly.</p>
            <Link to="/shop?sort=sale" className="mt-6 inline-block">
              <Btn variant="secondary" size="lg" className="bg-white text-primary-700 hover:bg-white/90">
                Shop the sale <ArrowRight className="size-4" />
              </Btn>
            </Link>
          </div>
        </div>
      </section>

      {/* Best sellers */}
      <section className="container-page py-12">
        <SectionHeader
          eyebrow="Trending"
          title="Best sellers"
          subtitle="What everyone's buying right now."
          link={{ to: "/shop?sort=bestseller", label: "See more" }}
        />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : bestsellers.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* On sale */}
      <section className="bg-muted/30 py-16">
        <div className="container-page">
          <SectionHeader
            eyebrow="Save more"
            title="On sale this week"
            subtitle="Don't miss out — these deals won't last."
            link={{ to: "/shop?sort=sale", label: "All deals" }}
          />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : onSale.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </div>
      </section>

      {/* Brand partners */}
      {brands.length > 0 && (
        <section className="container-page py-16">
          <SectionHeader eyebrow="Trusted by" title="Brand partners" subtitle="The names behind the products you love." />
          <div className="mt-8 overflow-hidden">
            <div className="flex gap-12 animate-marquee">
              {[...brands, ...brands].map((b, i) => (
                <div key={b.id + i} className="flex shrink-0 items-center gap-3 opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="h-8 w-auto" />
                  ) : (
                    <span className="font-display text-xl font-bold text-foreground/70">{b.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-muted/30 py-16">
          <div className="container-page">
            <SectionHeader
              eyebrow="Loved by shoppers"
              title="What our customers say"
              subtitle="Thousands of happy customers and counting."
            />
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {testimonials.slice(0, 3).map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-border bg-card p-6 shadow-card"
                >
                  <Rating value={t.rating} />
                  <p className="mt-4 text-sm leading-relaxed text-foreground/90">"{t.content}"</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-sm font-semibold text-white">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <NewsletterSection />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  link,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  link?: { to: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h2 className="mt-1.5 font-display text-2xl font-bold sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link.to} className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all">
          {link.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await subscribeNewsletter(email);
      toast.success("Subscribed!", "You're on the list. Watch your inbox for deals.");
      setEmail("");
    } catch (err: any) {
      toast.error("Could not subscribe", err?.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="container-page py-16">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center sm:p-14">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-xl">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Get 10% off your first order</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join our newsletter for exclusive deals, new arrivals, and styling tips.
          </p>
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="h-11 flex-1 rounded-lg border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" variant="gradient" size="lg" disabled={submitting}>
              {submitting ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    </section>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="skeleton aspect-square" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-5 w-1/3" />
      </div>
    </div>
  );
}

function CategoryGridSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5">
          <div className="skeleton size-20 rounded-full" />
          <div className="skeleton h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
