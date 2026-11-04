import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";

export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/";
  return value;
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
        role="status"
      >
        Checking your session…
      </div>
    );
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
