import { AppShell } from "@/components/workspace/app-shell";
import { ComingSoonPage } from "@/components/workspace/primitives";

export function LearningPage() {
  return (
    <AppShell>
      <ComingSoonPage
        title="Learning Paths"
        subtitle="Skills, growth plans, and coaching in one place."
        description="The learning workspace is being designed to help teams map skill growth, book learning sessions, and connect development goals to delivery outcomes."
        highlights={[
          "Tailored learning journeys for individuals and teams",
          "Skills matrix tracking across current and target capability levels",
          "Suggested next steps tied to project and role milestones",
        ]}
      />
    </AppShell>
  );
}
