import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Home } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-8xl font-extrabold text-gradient">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved. Let's get you back on track.
      </p>
      <Link to="/" className="mt-6">
        <Button variant="gradient" size="lg"><Home className="size-4" /> Back to home</Button>
      </Link>
    </div>
  );
}
