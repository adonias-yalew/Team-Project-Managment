import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";
import { TaskWorkspace } from "@/components/workspace/task-views";
import { useStore } from "@/lib/store";
import { useAuth } from "@/modules/auth/auth-context";

export function MyTasksPage() {
  const { tasks } = useStore();
  const { user } = useAuth();

  return (
    <AppShell>
      <PageHeader title="My Tasks" subtitle="Tasks assigned to you." />
      <TaskWorkspace tasks={tasks.filter((t) => t.assignees.includes(user?.id ?? ""))} />
    </AppShell>
  );
}
