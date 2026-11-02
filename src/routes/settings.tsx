import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · WORKSPACE" }, { name: "description", content: "Settings in WORKSPACE." }, { property: "og:title", content: "Settings · WORKSPACE" }, { property: "og:description", content: "Settings in WORKSPACE." }] }),
  component: Page,
});

function Page() {
  
  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="This section is coming next." />
      <div className="surface p-8 text-sm text-muted-foreground">Not built yet.</div>
    </AppShell>
  );
}
