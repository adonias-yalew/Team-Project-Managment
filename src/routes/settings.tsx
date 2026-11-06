import { AppShell } from "@/components/workspace/app-shell";
import { ComingSoonPage } from "@/components/workspace/primitives";

export function SettingsPage() {
  return (
    <AppShell>
      <ComingSoonPage
        title="Settings"
        subtitle="Control the workspace experience, roles, and preferences."
        description="The settings experience is being designed to make personalisation, workspace controls, and team policies easy to understand and maintain."
        highlights={[
          "Personalized workspace preferences and view defaults",
          "Role and access controls for team and project governance",
          "Notification and alert settings aligned to how work flows",
        ]}
      />
    </AppShell>
  );
}
