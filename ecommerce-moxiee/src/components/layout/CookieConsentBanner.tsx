import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "moxiee-cookie-consent"; // "accepted" | "declined"

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) setVisible(true);
  }, []);

  function choose(value: "accepted" | "declined") {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
    // Notify the rest of the app (e.g. analytics init) that consent changed.
    window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: value }));
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card/95 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="container-page flex flex-col items-center gap-4 py-4 sm:flex-row">
        <Cookie className="hidden size-8 shrink-0 text-primary sm:block" />
        <p className="flex-1 text-sm text-muted-foreground">
          We use essential cookies to keep you signed in and remember your cart. We'd also like
          to use optional cookies to understand how the store is used. See our{" "}
          <Link to="/privacy-policy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => choose("declined")}>
            Essential only
          </Button>
          <Button variant="gradient" size="sm" onClick={() => choose("accepted")}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns whether the visitor has consented to optional (non-essential)
 * cookies. Use this before initializing analytics/marketing scripts, e.g.:
 *
 *   if (hasOptionalCookieConsent()) initAnalytics();
 *   window.addEventListener("cookie-consent-change", (e) => {
 *     if (e.detail === "accepted") initAnalytics();
 *   });
 */
export function hasOptionalCookieConsent(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "accepted";
}
