import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";

export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title: "Reviews & Feedback · WORKSPACE" }, { name: "description", content: "Reviews & Feedback in WORKSPACE." }, { property: "og:title", content: "Reviews & Feedback · WORKSPACE" }, { property: "og:description", content: "Reviews & Feedback in WORKSPACE." }] }),
  component: Page,
});

function Page() {
  
  return (
    <AppShell>
      <PageHeader title="Reviews & Feedback" subtitle="This section is coming next." />
      <div className="surface p-8 text-sm text-muted-foreground">Not built yet.</div>
    </AppShell>
  );
}
