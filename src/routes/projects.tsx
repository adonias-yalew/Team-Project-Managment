import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects · WORKSPACE" }, { name: "description", content: "Projects in WORKSPACE." }, { property: "og:title", content: "Projects · WORKSPACE" }, { property: "og:description", content: "Projects in WORKSPACE." }] }),
  component: Page,
});

function Page() {
  
  return (
    <AppShell>
      <PageHeader title="Projects" subtitle="This section is coming next." />
      <div className="surface p-8 text-sm text-muted-foreground">Not built yet.</div>
    </AppShell>
  );
}
