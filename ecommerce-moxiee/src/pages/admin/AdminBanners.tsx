import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Banner } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/store/toastStore";

const emptyForm = { title: "", subtitle: "", image_url: "", link_url: "", sort_order: "0", is_active: true };

export function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("banners").select("*").order("sort_order");
      if (error) throw error;
      setBanners((data as Banner[]) ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ ...emptyForm, sort_order: String(banners.length) });
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(b: Banner) {
    setForm({
      title: b.title ?? "",
      subtitle: b.subtitle ?? "",
      image_url: b.image_url,
      link_url: b.link_url ?? "",
      sort_order: String(b.sort_order),
      is_active: b.is_active,
    });
    setEditingId(b.id);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title || null,
        subtitle: form.subtitle || null,
        image_url: form.image_url,
        link_url: form.link_url || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from("banners").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Banner updated");
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
        toast.success("Banner created");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error("Could not save banner", err?.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(b: Banner) {
    try {
      const { error } = await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      toast.error("Could not update", e?.message);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this banner?")) return;
    try {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
      toast.success("Banner deleted");
      await load();
    } catch (e: any) {
      toast.error("Could not delete", e?.message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {banners.length} banners · {banners.filter((b) => b.is_active).length} live on homepage
        </p>
        <Button variant="gradient" size="sm" onClick={openCreate}><Plus className="size-4" /> Add banner</Button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Banners appear on the homepage hero section, ordered by "Order" (lowest first). Toggle a banner off to hide
        it without deleting it.
      </p>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <ImageIcon className="size-10 text-muted-foreground/40" />
          <p className="mt-4 font-semibold">No banners yet</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Add your first banner</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {banners.map((b) => (
            <div key={b.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img src={b.image_url} alt="" className="size-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{b.title || "(no title)"}</p>
                  <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Live" : "Hidden"}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">{b.subtitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">Order: {b.sort_order}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button onClick={() => toggleActive(b)} className="text-muted-foreground hover:text-foreground" aria-label="Toggle visibility">
                  {b.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <button onClick={() => openEdit(b)} className="text-muted-foreground hover:text-foreground" aria-label="Edit"><Pencil className="size-4" /></button>
                <button onClick={() => onDelete(b.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Edit banner" : "Add banner"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Image URL</Label>
            <Input required value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Subtitle (optional)</Label>
            <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </div>
          <div>
            <Label>Link URL (optional)</Label>
            <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/shop?category=fashion" />
          </div>
          <div>
            <Label>Order</Label>
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-4 rounded border-input" />
            Show on homepage
          </label>
          <Button type="submit" variant="gradient" className="w-full" disabled={saving}>{saving ? "Saving..." : "Save banner"}</Button>
        </form>
      </Modal>
    </div>
  );
}
