import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { DemoModeBanner } from "@/components/layout/DemoModeBanner";

export function Layout() {
  const [cartOpen, setCartOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DemoModeBanner />
      <Header onOpenCart={() => setCartOpen(true)} />
      <main className="flex-1">
        <Outlet context={{ openCart: () => setCartOpen(true) }} />
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <CookieConsentBanner />
    </div>
  );
}
