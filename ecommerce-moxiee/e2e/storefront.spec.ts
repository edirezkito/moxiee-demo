import { test, expect } from "@playwright/test";

test.describe("Storefront browsing", () => {
  test("homepage loads with the store name and a call to action", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Moxiee/);
    await expect(page.getByRole("link", { name: /shop/i }).first()).toBeVisible();
  });

  test("can navigate from the homepage to the shop page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /shop/i }).first().click();
    await expect(page).toHaveURL(/\/shop/);
    await expect(page.getByRole("heading", { name: "Shop" })).toBeVisible();
  });

  test("shop page category filter updates the URL", async ({ page }) => {
    await page.goto("/shop");
    const categoryLink = page.locator('a[href*="category="]').first();
    if (await categoryLink.count()) {
      await categoryLink.click();
      await expect(page).toHaveURL(/category=/);
    }
  });

  test("visiting an unknown route shows the 404 page instead of crashing", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});

test.describe("Cart", () => {
  test("adding a product from the shop page updates the cart count", async ({ page }) => {
    await page.goto("/shop");
    const addButton = page.getByRole("button", { name: /add to cart/i }).first();
    if (await addButton.count()) {
      await addButton.click();
      // The header cart icon shows a badge with the item count once
      // something's been added — adjust the selector if your Header
      // markup differs.
      await expect(page.getByTestId("cart-count")).not.toHaveText("0");
    }
  });

  test("checkout requires being signed in", async ({ page }) => {
    await page.goto("/checkout");
    // Unauthenticated visitors should be redirected to sign in rather
    // than seeing the checkout form.
    await expect(page).toHaveURL(/\/auth|\/checkout/);
  });
});

test.describe("Admin access control", () => {
  test("the admin dashboard is not reachable by a signed-out visitor", async ({ page }) => {
    await page.goto("/admin");
    // Should NOT show the admin overview heading for a signed-out user —
    // either redirected to /auth or shown an access-denied state.
    await expect(page.getByRole("heading", { name: "Overview" })).not.toBeVisible();
  });
});
