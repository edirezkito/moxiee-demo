import { useState } from "react";
import { X, Sparkles } from "lucide-react";

const DISMISS_KEY = "moxiee-demo-banner-dismissed";

/**
 * Shows a persistent "this is a demo" ribbon when VITE_DEMO_MODE=true.
 * Intended for a public live-preview deployment used to sell this
 * template — it tells prospective buyers exactly how to safely try
 * checkout and the admin dashboard, which builds trust much faster than
 * a silent demo they're afraid to "break".
 *
 * Does nothing (renders null) unless VITE_DEMO_MODE is explicitly "true",
 * so it never accidentally shows up on a real client's live store.
 */
export function DemoModeBanner() {
  const isDemo = import.meta.env.VITE_DEMO_MODE === "true";
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "1");

  if (!isDemo || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="relative z-[110] bg-gradient-to-r from-primary-600 to-violet-500 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Sparkles className="size-4 shrink-0" />
        <span>
          You're viewing a <strong>live demo</strong> — nothing here is real. Try checkout with
          test card <code className="rounded bg-white/20 px-1.5 py-0.5">4242 4242 4242 4242</code>,
          any future expiry, any CVC.
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss demo banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-white/20"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
