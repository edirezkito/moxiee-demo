import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils";

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  default: Info,
};

const variantClass = {
  success: "border-success/30 text-success",
  error: "border-destructive/30 text-destructive",
  warning: "border-warning/30 text-warning",
  default: "border-border text-primary",
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-auto sm:max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = iconMap[t.variant ?? "default"];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-card/95 p-4 shadow-card-hover backdrop-blur",
                variantClass[t.variant ?? "default"]
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
