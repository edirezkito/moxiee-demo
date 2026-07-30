import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { SlidersHorizontal, X, Search as SearchIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchBrands, fetchCategories, fetchProducts, type ProductQuery } from "@/lib/catalogApi";
import type { Brand, Category, Product } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn, formatCurrency } from "@/lib/utils";
import { Seo } from "@/components/Seo";

const PER_PAGE = 12;

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = params.get("search") ?? "";
  const categorySlug = params.get("category") ?? "";
  const brandSlug = params.get("brand") ?? "";
  const sort = (params.get("sort") ?? "newest") as ProductQuery["sortBy"] | "featured" | "bestseller" | "sale";
  const onSale = params.get("sale") === "1";
  const minPrice = params.get("minPrice") ? Number(params.get("minPrice")) : undefined;
  const maxPrice = params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined;
  const page = Number(params.get("page") ?? "1");

  useEffect(() => {
    (async () => {
      try {
        const [c, b] = await Promise.all([fetchCategories(), fetchBrands()]);
        setCategories(c);
        setBrands(b);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const query: ProductQuery = {
          search: search || undefined,
          categorySlug: categorySlug || undefined,
          brandSlug: brandSlug || undefined,
          onSale: onSale || undefined,
          minPrice,
          maxPrice,
          sortBy: ["newest", "price-asc", "price-desc", "rating", "popular"].includes(sort as string)
            ? (sort as ProductQuery["sortBy"])
            : "newest",
          page,
          perPage: PER_PAGE,
        };
        if (sort === "featured") query.featured = true;
        if (sort === "bestseller") query.bestseller = true;
        if (sort === "sale") query.onSale = true;
        const { items, total: t } = await fetchProducts(query);
        if (!mounted) return;
        setProducts(items);
        setTotal(t);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [search, categorySlug, brandSlug, sort, onSale, minPrice, maxPrice, page]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  }

  function clearAll() {
    setParams(new URLSearchParams(), { replace: true });
  }

  const activeFilterCount = useMemo(
    () => [categorySlug, brandSlug, onSale ? "1" : "", minPrice != null ? "1" : "", maxPrice != null ? "1" : ""].filter(Boolean).length,
    [categorySlug, brandSlug, onSale, minPrice, maxPrice]
  );

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-semibold mb-3">Categories</h3>
        <div className="flex flex-col gap-1.5">
          <FilterCheckbox
            label="All categories"
            checked={!categorySlug}
            onChange={() => update("category", null)}
          />
          {categories.map((c) => (
            <FilterCheckbox
              key={c.id}
              label={c.name}
              checked={categorySlug === c.slug}
              onChange={() => update("category", c.slug)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-semibold mb-3">Brands</h3>
        <div className="flex flex-col gap-1.5">
          <FilterCheckbox label="All brands" checked={!brandSlug} onChange={() => update("brand", null)} />
          {brands.map((b) => (
            <FilterCheckbox
              key={b.id}
              label={b.name}
              checked={brandSlug === b.slug}
              onChange={() => update("brand", b.slug)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-semibold mb-3">Price range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice ?? ""}
            onChange={(e) => update("minPrice", e.target.value || null)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice ?? ""}
            onChange={(e) => update("maxPrice", e.target.value || null)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-semibold mb-3">Availability</h3>
        <FilterCheckbox
          label="On sale only"
          checked={onSale}
          onChange={() => update("sale", onSale ? null : "1")}
        />
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearAll}>
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="container-page py-8">
      <Seo
        title="Shop"
        description="Browse all products at Moxiee — filter by category, brand, and price to find exactly what you're looking for."
      />
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Shop</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {loading ? "Loading products..." : `${total} ${total === 1 ? "product" : "products"} found`}
          {search && <> for "<span className="font-medium text-foreground">{search}</span>"</>}
        </p>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {categorySlug && (
            <FilterChip label={categories.find((c) => c.slug === categorySlug)?.name ?? categorySlug} onClear={() => update("category", null)} />
          )}
          {brandSlug && (
            <FilterChip label={brands.find((b) => b.slug === brandSlug)?.name ?? brandSlug} onClear={() => update("brand", null)} />
          )}
          {onSale && <FilterChip label="On sale" onClear={() => update("sale", null)} />}
          {minPrice != null && <FilterChip label={`Min ${formatCurrency(minPrice)}`} onClear={() => update("minPrice", null)} />}
          {maxPrice != null && <FilterChip label={`Max ${formatCurrency(maxPrice)}`} onClear={() => update("maxPrice", null)} />}
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24">{FilterPanel}</div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="size-4" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">Sort by</span>
              <Select value={sort ?? "newest"} onChange={(e) => update("sort", e.target.value)} className="w-44">
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top rated</option>
                <option value="popular">Most reviewed</option>
                <option value="featured">Featured</option>
                <option value="bestseller">Best sellers</option>
                <option value="sale">On sale</option>
              </Select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="skeleton aspect-square" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-3 w-1/3" />
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <SearchIcon className="size-10 text-muted-foreground/40" />
              <p className="mt-4 font-display text-lg font-semibold">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
              {activeFilterCount > 0 && (
                <Button variant="outline" className="mt-4" onClick={clearAll}>Clear filters</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => update("page", String(Math.max(1, page - 1)))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                  return (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => update("page", String(p))}
                    >
                      {p}
                    </Button>
                  );
                }
                if (Math.abs(p - page) === 2) {
                  return <span key={p} className="px-1 text-muted-foreground">…</span>;
                }
                return null;
              })}
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => update("page", String(Math.min(totalPages, page + 1)))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            className="absolute left-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-background p-5 scrollbar-thin"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Filters</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setFiltersOpen(false)}>
                <X />
              </Button>
            </div>
            {FilterPanel}
            <Button variant="gradient" className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
              Show {total} results
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function FilterCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted">
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded border transition-colors",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="size-3" fill="none">
            <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={cn(checked && "font-medium text-foreground")}>{label}</span>
    </label>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Badge variant="default" className="gap-1.5 py-1 pl-3">
      {label}
      <button onClick={onClear} className="hover:text-destructive" aria-label="Remove filter">
        <X className="size-3" />
      </button>
    </Badge>
  );
}
