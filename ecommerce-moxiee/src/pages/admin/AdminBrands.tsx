import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Brand } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/toastStore";
import { slugify } from "@/lib/utils";

const emptyForm = { name: "", slug: "", logo_url: "", country: "" };

export function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      setBrands((data as Brand[]) ?? []);
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
    setForm(emptyForm);
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(b: Brand) {
    setForm({ name: b.name, slug: b.slug, logo_url: b.logo_url ?? "", country: b.country ?? "" });
    setEditingId(b.id);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        logo_url: form.logo_url || null,
        country: form.country || null,
      };
      if (editingId) {
        const { error } = await supabase.from("brands").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Brand updated");
      } else {
        const { error } = await supabase.from("brands").insert(payload);
        if (error) throw error;
        toast.success("Brand created");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error("Could not save brand", err?.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this brand? Products assigned to it will keep their brand_id set to null.")) return;
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      toast.success("Brand deleted");
      await load();
    } catch (e: any) {
      toast.error("Could not delete", e?.message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{brands.length} brands</p>
        <Button variant="gradient" size="sm" onClick={openCreate}><Plus className="size-4" /> Add brand</Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Award className="size-10 text-muted-foreground/40" />
          <p className="mt-4 font-semibold">No brands yet</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Add your first brand</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt="" className="size-full object-contain" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">{b.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">/{b.slug}{b.country ? ` · ${b.country}` : ""}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="text-muted-foreground hover:text-foreground" aria-label="Edit"><Pencil className="size-4" /></button>
                  <button onClick={() => onDelete(b.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Edit brand" : "Add brand"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" />
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://... (leave empty to show text logo)" />
          </div>
          <div>
            <Label>Country (optional)</Label>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. Japan" />
          </div>
          <Button type="submit" variant="gradient" className="w-full" disabled={saving}>{saving ? "Saving..." : "Save brand"}</Button>
        </form>
      </Modal>
    </div>
  );
}
