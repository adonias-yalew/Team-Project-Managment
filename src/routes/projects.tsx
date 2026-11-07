import { AppShell } from "@/components/workspace/app-shell";
import { ComingSoonPage } from "@/components/workspace/primitives";

export function ProjectsPage() {
  return (
    <AppShell>
      <ComingSoonPage
        title="Projects"
        subtitle="Portfolio planning and team delivery."
        description="The project hub is being refined so teams can track launches, milestones, and cross-functional work from a single source of truth."
        highlights={[
          "Portfolio snapshots across active and upcoming initiatives",
          "Milestone health dashboards with delivery confidence signals",
          "Clear owner visibility for launch readiness and blockers",
        ]}
      />
    </AppShell>
  );
}
