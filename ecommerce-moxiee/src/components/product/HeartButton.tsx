import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeartButtonProps {
  active: boolean;
  onClick: () => void;
  size?: number;
  className?: string;
}

export function HeartButton({ active, onClick, size = 18, className }: HeartButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-all hover:scale-110 active:scale-90",
        className
      )}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        size={size}
        className={cn("transition-colors", active ? "fill-destructive text-destructive" : "text-foreground")}
      />
    </button>
  );
}
