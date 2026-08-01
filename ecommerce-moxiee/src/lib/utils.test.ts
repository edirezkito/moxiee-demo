import { describe, it, expect } from "vitest";
import { formatCurrency, slugify, discountPercent, effectivePrice, pluralize, initials } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats a positive number as USD", () => {
    expect(formatCurrency(19.99)).toBe("$19.99");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("treats null/undefined as zero instead of throwing", () => {
    expect(formatCurrency(null)).toBe("$0.00");
    expect(formatCurrency(undefined)).toBe("$0.00");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(9.999)).toBe("$10.00");
  });
});

describe("discountPercent", () => {
  it("returns 0 when there is no discount price", () => {
    expect(discountPercent(100, null)).toBe(0);
    expect(discountPercent(100, undefined)).toBe(0);
  });

  it("returns 0 when discount price is not actually lower", () => {
    expect(discountPercent(100, 100)).toBe(0);
    expect(discountPercent(100, 120)).toBe(0);
  });

  it("computes the correct rounded percentage off", () => {
    expect(discountPercent(100, 75)).toBe(25);
    expect(discountPercent(50, 45)).toBe(10);
  });
});

describe("effectivePrice", () => {
  it("returns the regular price when there's no valid discount", () => {
    expect(effectivePrice(100, null)).toBe(100);
    expect(effectivePrice(100, 150)).toBe(100); // "discount" higher than price is ignored
  });

  it("returns the discount price when it's genuinely lower", () => {
    expect(effectivePrice(100, 80)).toBe(80);
  });

  // Regression guard: this is the exact rule used server-side in the
  // stripe-checkout Edge Function to compute what a customer is charged —
  // if this ever drifts from that logic, checkout totals would mismatch
  // what's displayed on the site.
  it("matches the pricing rule used at checkout", () => {
    const price = 59;
    const discount = 45;
    expect(effectivePrice(price, discount)).toBe(45);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Classic Leather Tote")).toBe("classic-leather-tote");
  });

  it("strips special characters", () => {
    expect(slugify("50% Off Sale!!")).toBe("50-off-sale");
  });

  it("collapses repeated hyphens/spaces", () => {
    expect(slugify("  Extra   Spaces  ")).toBe("extra-spaces");
  });
});

describe("pluralize", () => {
  it("uses the singular form for a count of 1", () => {
    expect(pluralize(1, "item")).toBe("item");
  });

  it("uses the default plural (adds 's') for other counts", () => {
    expect(pluralize(0, "item")).toBe("items");
    expect(pluralize(5, "item")).toBe("items");
  });

  it("uses a custom plural when provided", () => {
    expect(pluralize(2, "category", "categories")).toBe("categories");
  });
});

describe("initials", () => {
  it("returns up to 2 uppercase initials from a full name", () => {
    expect(initials("Jane Doe")).toBe("JD");
  });

  it("returns empty string for missing input", () => {
    expect(initials(null)).toBe("");
    expect(initials(undefined)).toBe("");
  });
});
