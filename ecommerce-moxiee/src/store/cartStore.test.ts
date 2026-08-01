import { describe, it, expect, beforeEach, vi } from "vitest";

// The cart store fires a "persist to server" call (Supabase) as a side
// effect on every mutation. We mock the client so tests run fully offline
// and don't depend on real network/auth state — we're testing the cart
// math here, not the sync-to-server behavior.
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(),
  },
}));

import { useCartStore } from "@/store/cartStore";
import type { Product, ProductVariation } from "@/types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    name: "Test Product",
    slug: "test-product",
    description: null,
    price: 100,
    discount_price: null,
    stock: 10,
    sku: null,
    category_id: null,
    brand_id: null,
    images: [],
    is_featured: false,
    is_bestseller: false,
    is_active: true,
    rating: 0,
    review_count: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  } as Product;
}

describe("cartStore", () => {
  beforeEach(() => {
    // Reset to a clean cart before every test — the store is a module
    // singleton, so state leaks across tests otherwise.
    useCartStore.setState({ lines: [], promoCode: null });
  });

  it("adds a new product as a new line", () => {
    useCartStore.getState().add(makeProduct(), null, 1);
    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().lines[0]).toMatchObject({ productId: "prod-1", quantity: 1, unitPrice: 100 });
  });

  it("increases quantity instead of duplicating when adding the same product again", () => {
    const product = makeProduct();
    useCartStore.getState().add(product, null, 1);
    useCartStore.getState().add(product, null, 2);
    const lines = useCartStore.getState().lines;
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
  });

  it("uses the discount price when one is set", () => {
    useCartStore.getState().add(makeProduct({ price: 100, discount_price: 80 }), null, 1);
    expect(useCartStore.getState().lines[0].unitPrice).toBe(80);
  });

  it("adds the variation's price adjustment on top of the base price", () => {
    const variation = { id: "var-1", price_adjustment: 15 } as ProductVariation;
    useCartStore.getState().add(makeProduct({ price: 50 }), variation, 1);
    expect(useCartStore.getState().lines[0].unitPrice).toBe(65);
  });

  it("treats different variations of the same product as separate lines", () => {
    const product = makeProduct();
    const variationA = { id: "var-a", price_adjustment: 0 } as ProductVariation;
    const variationB = { id: "var-b", price_adjustment: 0 } as ProductVariation;
    useCartStore.getState().add(product, variationA, 1);
    useCartStore.getState().add(product, variationB, 1);
    expect(useCartStore.getState().lines).toHaveLength(2);
  });

  it("removes a line", () => {
    useCartStore.getState().add(makeProduct(), null, 1);
    useCartStore.getState().remove("prod-1", null);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it("removes the line when quantity is set to 0 or less", () => {
    useCartStore.getState().add(makeProduct(), null, 2);
    useCartStore.getState().setQty("prod-1", null, 0);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it("clears the whole cart and any applied promo code", () => {
    useCartStore.getState().add(makeProduct(), null, 1);
    useCartStore.getState().applyPromo("SAVE10");
    useCartStore.getState().clear();
    expect(useCartStore.getState().lines).toHaveLength(0);
    expect(useCartStore.getState().promoCode).toBeNull();
  });

  it("count() sums quantities across all lines, not just line count", () => {
    useCartStore.getState().add(makeProduct({ id: "prod-1" }), null, 2);
    useCartStore.getState().add(makeProduct({ id: "prod-2" }), null, 3);
    expect(useCartStore.getState().count()).toBe(5);
  });
});
