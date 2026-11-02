import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";

export const Route = createFileRoute("/planner")({
  head: () => ({ meta: [{ title: "Daily Planner · WORKSPACE" }, { name: "description", content: "Daily Planner in WORKSPACE." }, { property: "og:title", content: "Daily Planner · WORKSPACE" }, { property: "og:description", content: "Daily Planner in WORKSPACE." }] }),
  component: Page,
});

function Page() {
  
  return (
    <AppShell>
      <PageHeader title="Daily Planner" subtitle="This section is coming next." />
      <div className="surface p-8 text-sm text-muted-foreground">Not built yet.</div>
    </AppShell>
  );
}
