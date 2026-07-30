import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { loadServerCart, useCartStore } from "@/store/cartStore";
import { Layout } from "@/components/layout/Layout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { Toaster } from "@/components/ui/Toaster";

import { HomePage } from "@/pages/HomePage";
import { ShopPage } from "@/pages/ShopPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { CartPage } from "@/pages/CartPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { CheckoutSuccessPage } from "@/pages/CheckoutSuccessPage";
import { AuthPage } from "@/pages/AuthPage";
import { AccountPage } from "@/pages/account/AccountPage";
import { ProfilePage } from "@/pages/account/ProfilePage";
import { OrdersPage } from "@/pages/account/OrdersPage";
import { OrderDetailPage } from "@/pages/account/OrderDetailPage";
import { WishlistPage } from "@/pages/account/WishlistPage";
import { AddressesPage } from "@/pages/account/AddressesPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PrivacyPolicyPage } from "@/pages/legal/PrivacyPolicyPage";
import { TermsOfServicePage } from "@/pages/legal/TermsOfServicePage";
import { RefundPolicyPage } from "@/pages/legal/RefundPolicyPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy-load admin section (heavy Recharts dependency)
const AdminPage = lazy(() => import("@/pages/admin/AdminPage").then((m) => ({ default: m.AdminPage })));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview").then((m) => ({ default: m.AdminOverview })));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts").then((m) => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders").then((m) => ({ default: m.AdminOrders })));
const AdminCustomers = lazy(() => import("@/pages/admin/AdminCustomers").then((m) => ({ default: m.AdminCustomers })));
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories").then((m) => ({ default: m.AdminCategories })));
const AdminBrands = lazy(() => import("@/pages/admin/AdminBrands").then((m) => ({ default: m.AdminBrands })));
const AdminBanners = lazy(() => import("@/pages/admin/AdminBanners").then((m) => ({ default: m.AdminBanners })));

function AdminFallback() {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();
  const cartHydrated = useCartStore((s) => s.hydrated);

  // When a user is signed in and the local cart has hydrated, load server cart.
  useEffect(() => {
    if (user && cartHydrated) {
      loadServerCart(user.id);
    }
  }, [user, cartHydrated]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="product/:slug" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="terms-of-service" element={<TermsOfServicePage />} />
          <Route path="refund-policy" element={<RefundPolicyPage />} />
          <Route path="auth" element={<AuthPage />} />

          <Route
            path="account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          >
            <Route index element={<ProfilePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="addresses" element={<AddressesPage />} />
          </Route>

          <Route
            path="admin"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={<AdminFallback />}>
                  <AdminPage />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route index element={<Suspense fallback={<AdminFallback />}><AdminOverview /></Suspense>} />
            <Route path="products" element={<Suspense fallback={<AdminFallback />}><AdminProducts /></Suspense>} />
            <Route path="orders" element={<Suspense fallback={<AdminFallback />}><AdminOrders /></Suspense>} />
            <Route path="customers" element={<Suspense fallback={<AdminFallback />}><AdminCustomers /></Suspense>} />
            <Route path="categories" element={<Suspense fallback={<AdminFallback />}><AdminCategories /></Suspense>} />
            <Route path="brands" element={<Suspense fallback={<AdminFallback />}><AdminBrands /></Suspense>} />
            <Route path="banners" element={<Suspense fallback={<AdminFallback />}><AdminBanners /></Suspense>} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
