import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { formatDate, initials } from "@/lib/utils";
import { Users } from "lucide-react";

interface CustomerRow extends Profile {
  email?: string;
  orderCount?: number;
  totalSpent?: number;
}

export function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: profiles }, { data: orders }] = await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("orders").select("user_id, total, payment_status"),
        ]);
        const prof = (profiles as Profile[]) ?? [];
        const orderRows = (orders as { user_id: string; total: number; payment_status: string }[]) ?? [];
        const enriched = prof.map((p) => {
          const userOrders = orderRows.filter((o) => o.user_id === p.id && o.payment_status === "paid");
          return {
            ...p,
            orderCount: userOrders.length,
            totalSpent: userOrders.reduce((s, o) => s + Number(o.total), 0),
          };
        });
        setCustomers(enriched);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>;
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <Users className="size-10 text-muted-foreground/40" />
        <p className="mt-4 font-semibold">No customers yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Registered customers will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-3">Customer</th>
            <th className="p-3 hidden sm:table-cell">Role</th>
            <th className="p-3 hidden md:table-cell">Joined</th>
            <th className="p-3 text-center">Orders</th>
            <th className="p-3 text-right">Total spent</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-muted/30">
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-xs font-bold text-white">
                    {initials(c.full_name) || "U"}
                  </div>
                  <div>
                    <p className="font-medium">{c.full_name ?? "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">ID: {c.id.slice(0, 8)}</p>
                  </div>
                </div>
              </td>
              <td className="p-3 hidden sm:table-cell">
                <Badge variant={c.role === "admin" ? "default" : "secondary"} className="capitalize">{c.role}</Badge>
              </td>
              <td className="p-3 hidden md:table-cell text-muted-foreground">{formatDate(c.created_at)}</td>
              <td className="p-3 text-center font-medium">{c.orderCount ?? 0}</td>
              <td className="p-3 text-right font-semibold">
                {c.totalSpent ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c.totalSpent) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
