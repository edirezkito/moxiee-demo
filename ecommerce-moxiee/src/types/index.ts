export type UserRole = "customer" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  country: string | null;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductVariation {
  id: string;
  product_id: string;
  name: string;
  value: string;
  stock: number;
  price_adjustment: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  stock: number;
  sku: string | null;
  category_id: string | null;
  brand_id: string | null;
  images: string[];
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_bestseller: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  brand?: Brand | null;
  product_variations?: ProductVariation[];
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "avatar_url"> | null;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  content: string;
  avatar_url: string | null;
  rating: number;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  promo_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variation_id: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  product?: Product;
  variation?: ProductVariation | null;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variation_id: string | null;
  product_name: string;
  product_image: string | null;
  variation_value: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  promo_code: string | null;
  shipping_address: {
    full_name?: string;
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
  } | null;
  created_at: string;
  updated_at: string;
  tracking_number?: string | null;
  carrier?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  tax?: number;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  currency?: string;
  fx_rate?: number;
  order_items?: OrderItem[];
}

export interface Promotion {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  is_active: boolean;
  valid_until: string | null;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}
