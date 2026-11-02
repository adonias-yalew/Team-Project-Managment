import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics · WORKSPACE" }, { name: "description", content: "Analytics in WORKSPACE." }, { property: "og:title", content: "Analytics · WORKSPACE" }, { property: "og:description", content: "Analytics in WORKSPACE." }] }),
  component: Page,
});

function Page() {
  
  return (
    <AppShell>
      <PageHeader title="Analytics" subtitle="This section is coming next." />
      <div className="surface p-8 text-sm text-muted-foreground">Not built yet.</div>
    </AppShell>
  );
}
