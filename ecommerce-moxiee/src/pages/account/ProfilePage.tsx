import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { toast } from "@/store/toastStore";

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated", "Your changes have been saved.");
    } catch (err: any) {
      toast.error("Could not save", err?.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-5 border-b border-border">
          <h2 className="font-display text-lg font-semibold">Profile details</h2>
          <p className="text-sm text-muted-foreground">Update your personal information.</p>
        </div>
        <form onSubmit={onSave} className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted/50" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={profile?.role ?? "customer"} disabled className="bg-muted/50 capitalize" />
            </div>
          </div>
          <Button type="submit" variant="gradient" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
