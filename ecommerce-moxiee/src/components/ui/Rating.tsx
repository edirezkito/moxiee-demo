import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value: number;
  size?: number;
  className?: string;
  showValue?: boolean;
  count?: number;
}

export function Rating({ value, size = 16, className, showValue, count }: RatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={cn(
              "transition-colors",
              i <= Math.round(value)
                ? "fill-warning text-warning"
                : "fill-muted text-muted-foreground/40"
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-xs font-medium text-muted-foreground">
          {value.toFixed(1)}
          {count != null && count > 0 && ` (${count})`}
        </span>
      )}
    </div>
  );
}
