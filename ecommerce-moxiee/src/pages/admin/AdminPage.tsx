import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, Tags, Award, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/brands", label: "Brands", icon: Award },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
];

export function AdminPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container-page py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your store from one place.</p>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to store
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside>
            <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col scrollbar-thin">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    cn(
                      "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-foreground"
                    )
                  }
                >
                  <l.icon className="size-4" /> {l.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
