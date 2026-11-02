import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";

export const Route = createFileRoute("/learning")({
  head: () => ({ meta: [{ title: "Learning Paths · WORKSPACE" }, { name: "description", content: "Learning Paths in WORKSPACE." }, { property: "og:title", content: "Learning Paths · WORKSPACE" }, { property: "og:description", content: "Learning Paths in WORKSPACE." }] }),
  component: Page,
});

function Page() {
  
  return (
    <AppShell>
      <PageHeader title="Learning Paths" subtitle="This section is coming next." />
      <div className="surface p-8 text-sm text-muted-foreground">Not built yet.</div>
    </AppShell>
  );
}
