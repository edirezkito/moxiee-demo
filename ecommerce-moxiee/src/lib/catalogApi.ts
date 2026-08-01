import { supabase } from "@/lib/supabase";
import type { Category, Brand, Product, ProductVariation, Testimonial, Promotion, Review, Banner } from "@/types";

// ---------- Banners ----------
export async function fetchBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data as Banner[];
}

// ---------- Categories ----------
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Category[];
}

export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as Category | null;
}

// ---------- Brands ----------
export async function fetchBrands(): Promise<Brand[]> {
  const { data, error } = await supabase.from("brands").select("*").order("name");
  if (error) throw error;
  return data as Brand[];
}

// ---------- Products ----------
export interface ProductQuery {
  search?: string;
  categorySlug?: string;
  brandSlug?: string;
  featured?: boolean;
  bestseller?: boolean;
  onSale?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "newest" | "price-asc" | "price-desc" | "rating" | "popular";
  page?: number;
  perPage?: number;
}

export async function fetchProducts(query: ProductQuery = {}): Promise<{ items: Product[]; total: number }> {
  const {
    search,
    categorySlug,
    brandSlug,
    featured,
    bestseller,
    onSale,
    minPrice,
    maxPrice,
    sortBy = "newest",
    page = 1,
    perPage = 12,
  } = query;

  let q = supabase
    .from("products")
    .select("*, category:categories(*), brand:brands(*)", { count: "exact" })
    .eq("is_active", true);

  if (search) {
    q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`);
  }
  if (categorySlug) {
    const { data: cat, error: catErr } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (catErr) throw catErr;
    // No matching category: force an empty result instead of silently
    // ignoring the filter.
    q = q.eq("category_id", cat?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (brandSlug) {
    const { data: br, error: brErr } = await supabase
      .from("brands")
      .select("id")
      .eq("slug", brandSlug)
      .maybeSingle();
    if (brErr) throw brErr;
    q = q.eq("brand_id", br?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (featured) q = q.eq("is_featured", true);
  if (bestseller) q = q.eq("is_bestseller", true);
  if (onSale) q = q.not("discount_price", "is", null).lt("discount_price", "price");
  if (minPrice != null) q = q.gte("price", minPrice);
  if (maxPrice != null) q = q.lte("price", maxPrice);

  switch (sortBy) {
    case "price-asc":
      q = q.order("price", { ascending: true });
      break;
    case "price-desc":
      q = q.order("price", { ascending: false });
      break;
    case "rating":
      q = q.order("rating", { ascending: false });
      break;
    case "popular":
      q = q.order("review_count", { ascending: false });
      break;
    default:
      q = q.order("created_at", { ascending: false });
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return { items: (data as Product[]) ?? [], total: count ?? 0 };
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), brand:brands(*), product_variations(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function fetchRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  if (!product.category_id) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), brand:brands(*)")
    .eq("is_active", true)
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .limit(limit);
  if (error) throw error;
  return (data as Product[]) ?? [];
}

export async function fetchFeaturedProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), brand:brands(*)")
    .eq("is_active", true)
    .eq("is_featured", true)
    .limit(limit);
  if (error) throw error;
  return (data as Product[]) ?? [];
}

export async function fetchBestsellers(limit = 8): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), brand:brands(*)")
    .eq("is_active", true)
    .eq("is_bestseller", true)
    .limit(limit);
  if (error) throw error;
  return (data as Product[]) ?? [];
}

export async function fetchOnSaleProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), brand:brands(*)")
    .eq("is_active", true)
    .not("discount_price", "is", null)
    .lt("discount_price", "price")
    .limit(limit);
  if (error) throw error;
  return (data as Product[]) ?? [];
}

// ---------- Testimonials ----------
export async function fetchTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Testimonial[]) ?? [];
}

// ---------- Promotions ----------
export async function fetchPromotionByCode(code: string): Promise<Promotion | null> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data as Promotion | null;
}

// ---------- Reviews ----------
export async function fetchProductReviews(productId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles:profiles(full_name, avatar_url)")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Review[]) ?? [];
}

export async function createReview(input: {
  productId: string;
  userId: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const { error } = await supabase.from("reviews").insert({
    product_id: input.productId,
    user_id: input.userId,
    rating: input.rating,
    comment: input.comment,
  });
  if (error) throw error;
  // recompute rating server-side
  const { error: rpcError } = await supabase.rpc("recalc_product_rating", { p_product_id: input.productId });
  if (rpcError) console.warn("recalc_product_rating failed:", rpcError.message);
}

// ---------- Newsletter ----------
export async function subscribeNewsletter(email: string): Promise<void> {
  const { error } = await supabase.from("newsletter_subscribers").upsert({ email }, { onConflict: "email" });
  if (error) throw error;
}

// ---------- Admin: product CRUD ----------
export async function createProduct(input: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
  const { data, error } = await supabase.from("products").insert(input).select().single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Admin: categories ----------
export async function createCategory(input: { name: string; slug: string; description?: string; image_url?: string }): Promise<void> {
  const { error } = await supabase.from("categories").insert(input);
  if (error) throw error;
}

export async function updateCategory(id: string, patch: Partial<Category>): Promise<void> {
  const { error } = await supabase.from("categories").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
