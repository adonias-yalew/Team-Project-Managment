import { AppShell } from "@/components/workspace/app-shell";
import { ComingSoonPage } from "@/components/workspace/primitives";

export function PlannerPage() {
  return (
    <AppShell>
      <ComingSoonPage
        title="Daily Planner"
        subtitle="Plan your day around priorities, meetings, and focus blocks."
        description="This planner will help turn your long-term goals into clear, actionable daily plans with momentum tracking and protected focus time."
        highlights={[
          "Smart daily time blocks aligned to top priorities",
          "Meeting and task batching to reduce context switching",
          "Focus streaks that keep momentum visible across the week",
        ]}
      />
    </AppShell>
  );
}
