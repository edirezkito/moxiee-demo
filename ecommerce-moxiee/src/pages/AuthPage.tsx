import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { toast } from "@/store/toastStore";

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from ?? "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (form.password.length < 6) {
          toast.error("Password too short", "Use at least 6 characters.");
          return;
        }
        const { error } = await signUp(form.email, form.password, form.fullName);
        if (error) {
          toast.error("Sign up failed", error);
          return;
        }
        toast.success("Welcome to Moxiee!", "Your account is ready.");
        navigate(from);
      } else {
        const { error } = await signIn(form.email, form.password);
        if (error) {
          toast.error("Sign in failed", error);
          return;
        }
        toast.success("Welcome back!", "You're now signed in.");
        navigate(from);
      }
    } catch (err: any) {
      toast.error("Something went wrong", err?.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border shadow-soft lg:grid-cols-2">
        {/* Visual side */}
        <div className="relative hidden bg-gradient-to-br from-primary-700 via-primary-600 to-violet-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-white/15 font-display font-bold">L</div>
              <span className="font-display text-xl font-bold">Moxiee</span>
            </Link>
          </div>
          <div className="relative">
            <Sparkles className="size-8 mb-4" />
            <h2 className="font-display text-3xl font-bold leading-tight">
              {mode === "signin" ? "Welcome back to premium shopping." : "Join thousands of happy shoppers."}
            </h2>
            <p className="mt-3 text-white/80">
              {mode === "signin"
                ? "Sign in to track orders, manage your wishlist, and check out faster."
                : "Create your account to unlock exclusive deals, faster checkout, and order tracking."}
            </p>
          </div>
          <div className="relative flex gap-6 text-sm">
            <div><p className="font-display text-2xl font-bold">50k+</p><p className="text-white/70">Customers</p></div>
            <div><p className="font-display text-2xl font-bold">12k+</p><p className="text-white/70">Products</p></div>
            <div><p className="font-display text-2xl font-bold">4.9★</p><p className="text-white/70">Rating</p></div>
          </div>
        </div>

        {/* Form side */}
        <div className="bg-card p-8 sm:p-10">
          <div className="mb-6">
            <div className="inline-flex rounded-lg border border-border p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "signin" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold">
            {mode === "signin" ? "Sign in to your account" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin" ? "Enter your credentials to continue." : "Fill in your details to get started."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Label>Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      required
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder="Jane Doe"
                      className="pl-9"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label>Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@email.com"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"} <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
