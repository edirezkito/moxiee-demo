import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Heart, User, Sun, Moon, Menu, X, LayoutDashboard, LogOut, Package } from "lucide-react";
import { CurrencySwitcher } from "@/components/layout/CurrencySwitcher";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCartStore } from "@/store/cartStore";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { label: "Shop", to: "/shop" },
  { label: "Fashion", to: "/shop?category=fashion" },
  { label: "Electronics", to: "/shop?category=electronics" },
  { label: "Beauty", to: "/shop?category=beauty" },
  { label: "Home", to: "/shop?category=home" },
];

export function Header({ onOpenCart }: { onOpenCart: () => void }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const cartCount = useCartStore((s) => s.count());
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
      setMobileOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="container-page flex h-16 items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="Moxiee" className="size-8 rounded-lg object-contain" />
          <span className="font-display text-lg font-bold tracking-tight">Moxiee</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                  isActive && "text-primary"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Search */}
        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-sm mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="h-9 w-full rounded-lg border border-input bg-muted/50 pl-9 pr-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <CurrencySwitcher />
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>

          {user && (
            <Link to="/account/wishlist" className="hidden sm:block">
              <Button variant="ghost" size="icon" aria-label="Wishlist">
                <Heart />
              </Button>
            </Link>
          )}

          <Button variant="ghost" size="icon" onClick={onOpenCart} className="relative" aria-label="Cart">
            <ShoppingBag />
            {cartCount > 0 && (
              <span data-testid="cart-count" className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Button>

          {user ? (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Account menu"
              >
                <User />
              </Button>
              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-card-hover"
                    >
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium truncate">{profile?.full_name || "Account"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="my-1 h-px bg-border" />
                      <Link to="/account" onClick={() => setUserMenuOpen(false)} className="menu-item">
                        <User className="size-4" /> My Profile
                      </Link>
                      <Link to="/account/orders" onClick={() => setUserMenuOpen(false)} className="menu-item">
                        <Package className="size-4" /> Orders
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="menu-item">
                          <LayoutDashboard className="size-4" /> Admin Dashboard
                        </Link>
                      )}
                      <div className="my-1 h-px bg-border" />
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          void signOut();
                          navigate("/");
                        }}
                        className="menu-item w-full text-left text-destructive"
                      >
                        <LogOut className="size-4" /> Sign out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/auth" className="hidden sm:block ml-1">
              <Button size="sm" variant="gradient">Sign in</Button>
            </Link>
          )}

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu />
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              className="absolute right-0 top-0 h-full w-72 max-w-[80vw] bg-background p-5 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-display text-lg font-bold">Menu</span>
                <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
                  <X />
                </Button>
              </div>
              <form onSubmit={onSearch} className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search products..."
                    className="h-10 w-full rounded-lg border border-input bg-muted/50 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </form>
              <nav className="flex flex-col gap-1">
                {navLinks.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    {l.label}
                  </Link>
                ))}
                {!user && (
                  <Link to="/auth" onClick={() => setMobileOpen(false)} className="mt-3">
                    <Button variant="gradient" className="w-full">Sign in</Button>
                  </Link>
                )}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
