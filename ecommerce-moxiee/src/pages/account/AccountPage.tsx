import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { User, Package, Heart, MapPin, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn, initials } from "@/lib/utils";

const sidebarLinks = [
  { to: "/account", label: "Profile", icon: User, end: true },
  { to: "/account/orders", label: "Orders", icon: Package },
  { to: "/account/wishlist", label: "Wishlist", icon: Heart },
  { to: "/account/addresses", label: "Addresses", icon: MapPin },
];

export function AccountPage() {
  const { profile, user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">My Account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Manage your profile, orders, and preferences.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-lg font-bold text-white">
                {initials(profile?.full_name) || "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{profile?.full_name ?? "Account"}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 flex flex-col gap-1">
            {sidebarLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                  )
                }
              >
                <l.icon className="size-4" /> {l.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <LayoutDashboard className="size-4" /> Admin Dashboard
              </NavLink>
            )}
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </nav>
        </aside>

        {/* Content */}
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
