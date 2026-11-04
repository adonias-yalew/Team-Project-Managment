import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-card">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary">WORKSPACE</p>
        <h1 className="mt-5 font-display text-3xl">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That address doesn’t match a page in this workspace.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Go to workspace
        </Link>
      </section>
    </main>
  );
}
