import { useEffect, useState } from "react";
import { Truck, PackageCheck, Search, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "@/store/toastStore";

// Common carriers with a trackable URL pattern — the tracking number is
// appended to build a one-click "Track on carrier site" link. Add more
// here as needed; unknown carriers just skip the link.
const CARRIER_TRACK_URLS: Record<string, string> = {
  ups: "https://www.ups.com/track?tracknum=",
  fedex: "https://www.fedex.com/fedextrack/?trknbr=",
  usps: "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
  dhl: "https://www.dhl.com/en/express/tracking.html?AWB=",
  jne: "https://www.jne.co.id/en/tracking/trace?awb=",
  jnt: "https://www.jet.co.id/track?awb=",
};

interface Row {
  order: Order;
  trackingDraft: string;
  carrierDraft: string;
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function AdminTrackOrders() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showDelivered, setShowDelivered] = useState(false);

  useEffect(() => {
    load();
  }, [showDelivered]);

  async function load() {
    setLoading(true);
    try {
      let query = supabase.from("orders").select("*").order("shipped_at", { ascending: false, nullsFirst: false });
      query = showDelivered ? query.in("status", ["shipped", "delivered"]) : query.eq("status", "shipped");
      const { data, error } = await query;
      if (error) throw error;
      setRows((data ?? []).map((o) => ({ order: o, trackingDraft: o.tracking_number ?? "", carrierDraft: o.carrier ?? "" })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveTracking(row: Row) {
    setSavingId(row.order.id);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          tracking_number: row.trackingDraft || null,
          carrier: row.carrierDraft || null,
          shipped_at: row.order.shipped_at ?? new Date().toISOString(),
        })
        .eq("id", row.order.id);
      if (error) throw error;
      toast.success("Tracking saved", "The customer will see this on their order.");
      load();
    } catch (e: any) {
      toast.error("Couldn't save tracking", e?.message ?? "Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function markDelivered(row: Row) {
    setSavingId(row.order.id);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered", delivered_at: new Date().toISOString() })
        .eq("id", row.order.id);
      if (error) throw error;
      toast.success("Marked as delivered");
      load();
    } catch (e: any) {
      toast.error("Couldn't update order", e?.message ?? "Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = rows.filter(
    (r) =>
      !search ||
      r.order.id.toLowerCase().includes(search.toLowerCase()) ||
      r.order.tracking_number?.toLowerCase().includes(search.toLowerCase())
  );

  const inTransitCount = rows.filter((r) => r.order.status === "shipped").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Track Orders</h1>
          <p className="text-sm text-muted-foreground">
            {inTransitCount} order{inTransitCount === 1 ? "" : "s"} currently in transit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order # or tracking #"
              className="w-64 pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowDelivered((v) => !v)}>
            {showDelivered ? "Hide delivered" : "Show delivered too"}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Truck className="mx-auto mb-2 size-8 opacity-50" />
          No orders are currently in transit. Orders appear here once you set their status to
          "Shipped" in Admin &gt; Orders.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const carrierKey = row.carrierDraft.trim().toLowerCase();
            const trackUrl = CARRIER_TRACK_URLS[carrierKey];
            const transitDays = daysSince(row.order.shipped_at);
            const delivered = row.order.status === "delivered";

            return (
              <div key={row.order.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-sm font-semibold">#{row.order.id.slice(0, 8)}</span>{" "}
                    <Badge variant={delivered ? "success" : "warning"} className="ml-2 capitalize">
                      {row.order.status}
                    </Badge>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.order.shipping_address?.full_name ?? "—"} &middot; Placed{" "}
                      {formatDate(row.order.created_at)}
                      {row.order.shipped_at && (
                        <>
                          {" "}
                          &middot; Shipped {formatDate(row.order.shipped_at)}
                          {transitDays !== null && !delivered && (
                            <span className={transitDays > 7 ? "font-semibold text-destructive" : ""}>
                              {" "}
                              ({transitDays}d in transit)
                            </span>
                          )}
                        </>
                      )}
                      {row.order.delivered_at && <> &middot; Delivered {formatDateTime(row.order.delivered_at)}</>}
                    </p>
                  </div>
                  {!delivered && (
                    <Button
                      variant="gradient"
                      size="sm"
                      disabled={savingId === row.order.id}
                      onClick={() => markDelivered(row)}
                    >
                      <PackageCheck className="size-4" /> Mark delivered
                    </Button>
                  )}
                </div>

                {!delivered && (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs text-muted-foreground">Carrier</label>
                      <Input
                        value={row.carrierDraft}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.order.id === row.order.id ? { ...r, carrierDraft: e.target.value } : r))
                          )
                        }
                        placeholder="e.g. UPS, FedEx, JNE"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-[2] min-w-[180px]">
                      <label className="text-xs text-muted-foreground">Tracking number</label>
                      <Input
                        value={row.trackingDraft}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.order.id === row.order.id ? { ...r, trackingDraft: e.target.value } : r))
                          )
                        }
                        placeholder="1Z999AA10123456784"
                        className="h-8 font-mono text-sm"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={savingId === row.order.id}
                      onClick={() => saveTracking(row)}
                    >
                      Save
                    </Button>
                    {trackUrl && row.order.tracking_number && (
                      <a
                        href={`${trackUrl}${row.order.tracking_number}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Track on carrier site <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
