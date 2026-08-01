import { supabase } from "@/lib/supabase";
import type { Address, CartItem, Order, OrderItem, Product } from "@/types";

// ---------- Addresses ----------
export async function fetchAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false });
  if (error) throw error;
  return (data as Address[]) ?? [];
}

export async function createAddress(input: Omit<Address, "id" | "created_at" | "user_id"> & { user_id: string }): Promise<void> {
  if (input.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", input.user_id);
  }
  const { error } = await supabase.from("addresses").insert(input);
  if (error) throw error;
}

export async function updateAddress(id: string, patch: Partial<Address>, userId: string): Promise<void> {
  if (patch.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
  }
  const { error } = await supabase.from("addresses").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Cart ----------
export async function fetchCartWithProducts(userId: string): Promise<CartItem[]> {
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!cart) return [];
  const { data, error } = await supabase
    .from("cart_items")
    .select("*, product:products(*, category:categories(*), brand:brands(*)), variation:product_variations(*)")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CartItem[]) ?? [];
}

// ---------- Orders ----------
export async function fetchUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Order[]) ?? [];
}

export async function fetchOrderById(orderId: string, userId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

export async function fetchAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Order[]) ?? [];
}

export async function updateOrderStatus(orderId: string, status: Order["status"], paymentStatus?: Order["payment_status"]): Promise<void> {
  const patch: Record<string, string> = { status, updated_at: new Date().toISOString() };
  if (paymentStatus) patch.payment_status = paymentStatus;
  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) throw error;
}

export interface PlaceOrderInput {
  userId: string;
  items: { product: Product; variationId: string | null; quantity: number; unitPrice: number }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  promoCode: string | null;
  paymentMethod: string;
  /** Currency the customer had selected via the currency switcher, purely
   *  for display/record purposes — COD amounts are still USD-denominated
   *  since no card is charged through Stripe. Defaults to USD. */
  currency?: string;
  fxRate?: number;
  shippingAddress: {
    full_name: string;
    email?: string;
    street: string;
    city: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
}

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  // Real card/wallet payments go through the "stripe-checkout" Edge
  // Function (see src/lib/paymentApi.ts) instead of this function — Stripe
  // only marks an order "paid" via its webhook after payment succeeds.
  // This function is now used for Cash on Delivery only, where "paid"
  // isn't true yet at order time.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId,
      status: "processing",
      payment_status: input.paymentMethod === "cod" ? "unpaid" : "paid",
      payment_method: input.paymentMethod,
      subtotal: input.subtotal,
      discount: input.discount,
      shipping: input.shipping,
      total: input.total,
      promo_code: input.promoCode,
      shipping_address: input.shippingAddress,
      currency: input.currency ?? "USD",
      fx_rate: input.fxRate ?? 1,
    })
    .select()
    .single();
  if (orderError) throw orderError;

  const orderItems: Omit<OrderItem, "id" | "created_at" | "order_id">[] = input.items.map((i) => ({
    order_id: order.id,
    product_id: i.product.id,
    variation_id: i.variationId,
    product_name: i.product.name,
    product_image: i.product.images[0] ?? null,
    variation_value: null,
    quantity: i.quantity,
    unit_price: i.unitPrice,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems as any);
  if (itemsError) throw itemsError;

  // decrement stock for each product
  for (const item of input.items) {
    await supabase.rpc("decrement_stock", { p_product_id: item.product.id, p_qty: item.quantity }).then(({ error }) => {
      if (error) console.warn("decrement_stock failed:", error.message);
    });
  }

  // clear server cart
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (cart) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  }

  return order as Order;
}

// ---------- Wishlist ----------
export async function fetchWishlist(userId: string): Promise<{ id: string; product: Product }[]> {
  const { data: wl } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!wl) return [];
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("*, product:products(*, category:categories(*), brand:brands(*))")
    .eq("wishlist_id", wl.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as any[]) ?? []).map((d) => ({ id: d.id, product: d.product as Product }));
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  // ensure a wishlist exists
  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  let wishlistId = existing?.id;
  if (!wishlistId) {
    const { data: created } = await supabase
      .from("wishlists")
      .insert({ user_id: userId })
      .select("id")
      .single();
    wishlistId = created?.id;
  }
  if (!wishlistId) return;
  await supabase.from("wishlist_items").upsert(
    { wishlist_id: wishlistId, product_id: productId },
    { onConflict: "wishlist_id,product_id" }
  );
}

export async function removeFromWishlist(itemId: string): Promise<void> {
  const { error } = await supabase.from("wishlist_items").delete().eq("id", itemId);
  if (error) throw error;
}

// ---------- Admin: customers ----------
export async function fetchAllProfiles(): Promise<{ id: string; full_name: string | null; role: string; email: string; created_at: string }[]> {
  // profiles has RLS that lets admin read all. We also need email from auth.users,
  // but the anon client can't read auth.users. Instead we join via a stored approach:
  // the admin dashboard only needs profiles; email is approximated from auth metadata is not available.
  // So we surface profiles with whatever data is available.
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as any[]) ?? [];
}
