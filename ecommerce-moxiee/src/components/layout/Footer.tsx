import { Link } from "react-router-dom";
import { Twitter, Instagram, Facebook, Github, Mail } from "lucide-react";

const footerLinks = {
  Shop: [
    { label: "All Products", to: "/shop" },
    { label: "Featured", to: "/shop?sort=featured" },
    { label: "Best Sellers", to: "/shop?sort=bestseller" },
    { label: "On Sale", to: "/shop?sort=sale" },
  ],
  Company: [
    { label: "About Us", to: "/" },
    { label: "Careers", to: "/" },
    { label: "Press", to: "/" },
    { label: "Sustainability", to: "/" },
  ],
  Support: [
    { label: "Help Center", to: "/" },
    { label: "Shipping", to: "/refund-policy" },
    { label: "Returns", to: "/refund-policy" },
    { label: "Track Order", to: "/account/orders" },
  ],
  Legal: [
    { label: "Privacy Policy", to: "/privacy-policy" },
    { label: "Terms of Service", to: "/terms-of-service" },
    { label: "Refund Policy", to: "/refund-policy" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container-page py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Moxiee" className="size-8 rounded-lg object-contain" />
              <span className="font-display text-lg font-bold">Moxiee</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Premium products for modern living. Curated quality, fast shipping, and a checkout your customers can trust.
            </p>
            <div className="mt-4 flex gap-2">
              {[Twitter, Instagram, Facebook, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  aria-label="Social link"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-display text-sm font-semibold mb-3">{title}</h4>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Moxiee. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="size-3.5" />
            support@moxiee.store
          </div>
        </div>
      </div>
    </footer>
  );
}
