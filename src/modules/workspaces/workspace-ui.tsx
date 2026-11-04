import type { ReactNode } from "react";

export function Notice({
  children,
  kind = "error",
}: {
  children: ReactNode;
  kind?: "error" | "success" | "info";
}) {
  const styles =
    kind === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : kind === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-blue-200 bg-blue-50 text-blue-900";
  return (
    <p
      className={`rounded-lg border px-4 py-3 text-sm ${styles}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
