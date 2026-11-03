import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";
import { TaskWorkspace } from "@/components/workspace/task-views";
import { useStore } from "@/lib/store";
import { CURRENT_USER_ID } from "@/lib/data";

export function MyTasksPage() {
  const { tasks } = useStore();

  return (
    <AppShell>
      <PageHeader title="My Tasks" subtitle="Tasks assigned to you." />
      <TaskWorkspace tasks={tasks.filter((t) => t.assignees.includes(CURRENT_USER_ID))} />
    </AppShell>
  );
}
