import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, ShoppingBag, Users, Package, TrendingUp, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

interface OrderRow {
  id: string;
  total: number;
  status: string;
  created_at: string;
}

export function AdminOverview() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState<OrderRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: o }, { count: pc }, { count: cc }] = await Promise.all([
          supabase.from("orders").select("id, total, status, created_at").order("created_at", { ascending: false }),
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
        ]);
        setOrders((o as OrderRow[]) ?? []);
        setRecent(((o as OrderRow[]) ?? []).slice(0, 6));
        setProductCount(pc ?? 0);
        setCustomerCount(cc ?? 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + Number(o.total), 0), [orders]);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;

  // sales last 7 days
  const salesData = useMemo(() => {
    const days: { name: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const dayOrders = orders.filter((o) => {
        const t = new Date(o.created_at);
        return t >= d && t < next;
      });
      days.push({
        name: d.toLocaleDateString("en-US", { weekday: "short" }),
        revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
        orders: dayOrders.length,
      });
    }
    return days;
  }, [orders]);

  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => { map[o.status] = (map[o.status] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const stats = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, trend: "+12.5%" },
    { label: "Orders", value: String(orders.length), icon: ShoppingBag, trend: "+8.2%" },
    { label: "Products", value: String(productCount), icon: Package, trend: `${productCount} live` },
    { label: "Customers", value: String(customerCount), icon: Users, trend: "+5.1%" },
    { label: "Avg. Order Value", value: formatCurrency(avgOrder), icon: TrendingUp, trend: "+3.4%" },
  ];

  if (loading) {
    return <div className="skeleton h-96 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </div>
                <span className="text-xs font-medium text-success flex items-center gap-0.5">
                  <ArrowUpRight className="size-3" /> {s.trend}
                </span>
              </div>
              <p className="mt-3 font-display text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "0.875rem",
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No orders yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend fontSize={12} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-semibold">#{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                  </div>
                  <Badge variant="default" className="capitalize">{o.status}</Badge>
                  <span className="font-display font-bold">{formatCurrency(o.total)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
