import { useEffect, useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Brand, Category, Product } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/toastStore";
import { ImageDropzone } from "@/components/admin/ImageDropzone";
import { cn, formatCurrency, slugify } from "@/lib/utils";

interface ProductWithRelations extends Product {
  category?: Category | null;
  brand?: Brand | null;
}

const emptyForm = {
  name: "",
  description: "",
  price: "",
  discount_price: "",
  stock: "",
  sku: "",
  category_id: "",
  brand_id: "",
  images: [] as string[],
  is_featured: false,
  is_bestseller: false,
  is_active: true,
};

export function AdminProducts() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ data: p }, { data: c }, { data: b }] = await Promise.all([
        supabase.from("products").select("*, category:categories(*), brand:brands(*)").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
        supabase.from("brands").select("*").order("name"),
      ]);
      setProducts((p as ProductWithRelations[]) ?? []);
      setCategories((c as Category[]) ?? []);
      setBrands((b as Brand[]) ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(p: ProductWithRelations) {
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      discount_price: p.discount_price ? String(p.discount_price) : "",
      stock: String(p.stock),
      sku: p.sku ?? "",
      category_id: p.category_id ?? "",
      brand_id: p.brand_id ?? "",
      images: p.images,
      is_featured: p.is_featured,
      is_bestseller: p.is_bestseller,
      is_active: p.is_active,
    });
    setEditingId(p.id);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const images = form.images;
      const payload = {
        name: form.name,
        slug: slugify(form.name) + "-" + Math.random().toString(36).slice(2, 6),
        description: form.description || null,
        price: Number(form.price) || 0,
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        stock: Number(form.stock) || 0,
        sku: form.sku || null,
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        images,
        is_featured: form.is_featured,
        is_bestseller: form.is_bestseller,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from("products").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingId);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Product created");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error("Could not save product", err?.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Product deleted");
      await load();
    } catch (e: any) {
      toast.error("Could not delete", e?.message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="pl-9" />
        </div>
        <Button variant="gradient" size="sm" onClick={openCreate}><Plus className="size-4" /> Add product</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Package className="size-10 text-muted-foreground/40" />
          <p className="mt-4 font-semibold">No products yet</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Add your first product</Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3 hidden sm:table-cell">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3 hidden sm:table-cell">Stock</th>
                <th className="p-3 hidden md:table-cell">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {p.images[0] ? (
                          <img src={p.images[0]} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="size-full bg-gradient-to-br from-primary/10 to-violet/10" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{p.category?.name ?? "—"}</td>
                  <td className="p-3 font-medium">{formatCurrency(p.price)}</td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className={cn("font-medium", p.stock <= 0 ? "text-destructive" : p.stock < 10 ? "text-warning" : "text-foreground")}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <div className="flex gap-1">
                      {p.is_featured && <Badge variant="default">Featured</Badge>}
                      {p.is_bestseller && <Badge variant="warning">Best</Badge>}
                      {!p.is_active && <Badge variant="destructive">Hidden</Badge>}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => onDelete(p.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Edit product" : "Add product"} className="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Product name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <Label>Discount price ($)</Label>
              <Input type="number" step="0.01" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Brand</Label>
              <Select value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
                <option value="">None</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Product Images</Label>
              <ImageDropzone images={form.images} onChange={(images) => setForm({ ...form, images })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="size-4 rounded border-input" /> Featured</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_bestseller} onChange={(e) => setForm({ ...form, is_bestseller: e.target.checked })} className="size-4 rounded border-input" /> Bestseller</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-4 rounded border-input" /> Active</label>
          </div>
          <Button type="submit" variant="gradient" className="w-full" disabled={saving}>{saving ? "Saving..." : "Save product"}</Button>
        </form>
      </Modal>
    </div>
  );
}
