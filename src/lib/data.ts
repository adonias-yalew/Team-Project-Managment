// Shared task domain labels and small date helpers. Workspace records live in Supabase.

export type Priority = "urgent" | "high" | "medium" | "low";
export type Status = "todo" | "in_progress" | "review" | "done";

export interface Comment {
  id: string;
  authorId: string;
  body: string;
  at: string;
}

export const iso = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

export const statusLabel: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
};

export const priorityLabel: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const isOverdue = (task: { status: Status; due: string }) =>
  task.status !== "done" && Boolean(task.due) && task.due < iso(0);
