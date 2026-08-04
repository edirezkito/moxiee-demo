import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/toastStore";
import { slugify } from "@/lib/utils";
import { ImageDropzone } from "@/components/admin/ImageDropzone";

const emptyForm = { name: "", slug: "", description: "", image_url: "" };

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      setCategories((data as Category[]) ?? []);
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

  function openEdit(c: Category) {
    setForm({ name: c.name, slug: c.slug, description: c.description ?? "", image_url: c.image_url ?? "" });
    setEditingId(c.id);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        image_url: form.image_url || null,
      };
      if (editingId) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Category updated");
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
        toast.success("Category created");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error("Could not save category", err?.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Category deleted");
      await load();
    } catch (e: any) {
      toast.error("Could not delete", e?.message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{categories.length} categories</p>
        <Button variant="gradient" size="sm" onClick={openCreate}><Plus className="size-4" /> Add category</Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Tags className="size-10 text-muted-foreground/40" />
          <p className="mt-4 font-semibold">No categories yet</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Add your first category</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-12 overflow-hidden rounded-lg bg-muted">
                    {c.image_url ? <img src={c.image_url} alt="" className="size-full object-cover" /> : <div className="size-full bg-gradient-to-br from-primary/10 to-violet/10" />}
                  </div>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">/{c.slug}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground" aria-label="Edit"><Pencil className="size-4" /></button>
                  <button onClick={() => onDelete(c.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="size-4" /></button>
                </div>
              </div>
              {c.description && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Edit category" : "Add category"}>
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
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Category Image</Label>
            <ImageDropzone
              images={form.image_url ? [form.image_url] : []}
              onChange={(images) => setForm({ ...form, image_url: images[images.length - 1] ?? "" })}
              maxImages={1}
            />
          </div>
          <Button type="submit" variant="gradient" className="w-full" disabled={saving}>{saving ? "Saving..." : "Save category"}</Button>
        </form>
      </Modal>
    </div>
  );
}
