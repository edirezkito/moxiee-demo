import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Plus, Trash2, Pencil, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "@/lib/commerceApi";
import type { Address } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/toastStore";

const emptyForm = {
  label: "Home",
  full_name: "",
  street: "",
  city: "",
  postal_code: "",
  country: "United States",
  phone: "",
  is_default: false,
};

export function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) return;
    try {
      const data = await fetchAddresses(user.id);
      setAddresses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  function openCreate() {
    setForm({ ...emptyForm, full_name: "" });
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(addr: Address) {
    setForm({
      label: addr.label,
      full_name: addr.full_name,
      street: addr.street,
      city: addr.city,
      postal_code: addr.postal_code,
      country: addr.country,
      phone: addr.phone ?? "",
      is_default: addr.is_default,
    });
    setEditingId(addr.id);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateAddress(editingId, form, user.id);
        toast.success("Address updated");
      } else {
        await createAddress({ ...form, user_id: user.id });
        toast.success("Address added");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error("Could not save address", err?.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteAddress(id);
      toast.success("Address removed");
      await load();
    } catch (e: any) {
      toast.error("Could not delete", e?.message);
    }
  }

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{addresses.length} saved address{addresses.length !== 1 ? "es" : ""}</p>
        <Button variant="gradient" size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <MapPin className="size-10 text-muted-foreground/40" />
          <p className="mt-4 font-display font-semibold">No addresses saved</p>
          <p className="mt-1 text-sm text-muted-foreground">Add a shipping address for faster checkout.</p>
          <Button variant="outline" className="mt-5" onClick={openCreate}>Add your first address</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{addr.label}</span>
                  {addr.is_default && <span className="rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Default</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(addr)} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => onDelete(addr.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <address className="mt-3 not-italic text-sm leading-relaxed text-muted-foreground">
                {addr.full_name}<br />
                {addr.street}<br />
                {addr.city}, {addr.postal_code}<br />
                {addr.country}
                {addr.phone && <><br />{addr.phone}</>}
              </address>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Edit address" : "Add address"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Label</Label>
              <Select value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}>
                <option>Home</option>
                <option>Work</option>
                <option>Other</option>
              </Select>
            </div>
            <div>
              <Label>Full name</Label>
              <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Street address</Label>
              <Input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Postal code</Label>
              <Input required value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
            </div>
            <div>
              <Label>Country</Label>
              <Select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                <option>United States</option>
                <option>Canada</option>
                <option>United Kingdom</option>
                <option>Australia</option>
                <option>Germany</option>
                <option>France</option>
                <option>Singapore</option>
                <option>Indonesia</option>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="size-4 rounded border-input"
            />
            Set as default address
          </label>
          <Button type="submit" variant="gradient" className="w-full" disabled={saving}>
            {saving ? "Saving..." : <>Save address <Check className="size-4" /></>}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
