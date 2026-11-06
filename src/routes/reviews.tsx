import { AppShell } from "@/components/workspace/app-shell";
import { ComingSoonPage } from "@/components/workspace/primitives";

export function ReviewsPage() {
  return (
    <AppShell>
      <ComingSoonPage
        title="Reviews & Feedback"
        subtitle="Feedback loops that keep people and work moving forward."
        description="This review space will centralize outcomes, stakeholder check-ins, and feedback summaries so improvement cycles stay visible and actionable."
        highlights={[
          "Clear one-on-one and team review dashboards",
          "Feedback trends surfaced over time to identify patterns",
          "Action items that convert conversations into accountable work",
        ]}
      />
    </AppShell>
  );
}
