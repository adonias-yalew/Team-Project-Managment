import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";

export function ProjectsPage() {
  return (
    <AppShell>
      <PageHeader title="Projects" subtitle="This section is coming next." />
      <div className="surface p-8 text-sm text-muted-foreground">Not built yet.</div>
    </AppShell>
  );
}
