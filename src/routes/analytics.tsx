import { AppShell } from "@/components/workspace/app-shell";
import { ComingSoonPage } from "@/components/workspace/primitives";

export function AnalyticsPage() {
  return (
    <AppShell>
      <ComingSoonPage
        title="Analytics"
        subtitle="Performance trends, work signals, and healthy delivery indicators."
        description="The analytics layer is being shaped to surface what is working, where momentum is slipping, and which teams need more support."
        highlights={[
          "Workload and throughput trends across teams and projects",
          "Delivery health indicators by sprint or planning cycle",
          "Decision-ready insights for balancing capacity and focus",
        ]}
      />
    </AppShell>
  );
}
