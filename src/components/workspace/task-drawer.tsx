import { useState } from "react";
import { CalendarDays, FolderKanban, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { isOverdue, priorityLabel, statusLabel, type Priority, type Status } from "@/lib/data";
import { useAuth } from "@/modules/auth/auth-context";
import { cn } from "@/lib/utils";

export function TaskDrawer() {
  const {
    tasks,
    projects,
    members,
    openTaskId,
    setOpenTaskId,
    setStatus,
    updateTask,
    addComment,
    deleteTask,
    setTaskAssignees,
  } = useStore();
  const [comment, setComment] = useState("");
  const { user } = useAuth();
  const task = tasks.find((item) => item.id === openTaskId);
  const project = task ? projects.find((item) => item.id === task.projectId) : undefined;
  const memberRole = members.find((member) => member.id === user?.id)?.role;
  const canAssign = Boolean(
    task && (task.createdBy === user?.id || memberRole === "owner" || memberRole === "admin"),
  );
  const fail = (cause: unknown) =>
    toast.error(cause instanceof Error ? cause.message : "The task could not be updated.");

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && setOpenTaskId(null)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {task && (
          <>
            <SheetHeader className="text-left">
              <span className="eyebrow">{project?.name ?? "Workspace task"}</span>
              <SheetTitle className="font-display text-xl font-medium">{task.title}</SheetTitle>
            </SheetHeader>
            <Input
              aria-label="Task title"
              defaultValue={task.title}
              key={`${task.id}-title`}
              maxLength={240}
              className="mt-4 font-medium"
              onBlur={(event) => {
                const title = event.currentTarget.value.trim();
                if (title && title !== task.title) void updateTask(task.id, { title }).catch(fail);
              }}
            />
            <div className="mt-5 grid grid-cols-[100px_1fr] items-center gap-y-3 text-sm">
              <span className="text-muted-foreground">Status</span>
              <Select
                value={task.status}
                onValueChange={(value) => void setStatus(task.id, value as Status).catch(fail)}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabel).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">Priority</span>
              <Select
                value={task.priority}
                onValueChange={(value) =>
                  void updateTask(task.id, { priority: value as Priority }).catch(fail)
                }
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabel).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">Assignees</span>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={task.assignees.includes(member.id)}
                      disabled={!canAssign}
                      onChange={(event) => {
                        const next = event.currentTarget.checked
                          ? [...task.assignees, member.id]
                          : task.assignees.filter((id) => id !== member.id);
                        void setTaskAssignees(task.id, next).catch(fail);
                      }}
                    />
                    {member.name}
                  </label>
                ))}
                {members.length === 0 && (
                  <span className="text-muted-foreground">No workspace members.</span>
                )}
              </div>
              <span className="text-muted-foreground">Due</span>
              <label
                className={cn("flex items-center gap-1.5", isOverdue(task) && "text-destructive")}
              >
                <CalendarDays className="size-3.5" />
                <input
                  aria-label="Task due date"
                  type="date"
                  value={task.due}
                  onChange={(event) =>
                    void updateTask(task.id, { due: event.currentTarget.value }).catch(fail)
                  }
                  className="rounded border bg-background px-2 py-1 text-xs"
                />
                {isOverdue(task) && "· Overdue"}
              </label>
              <span className="text-muted-foreground">Project</span>
              <label className="flex items-center gap-1.5">
                <FolderKanban className="size-3.5" />
                <Select
                  value={task.projectId ?? "none"}
                  onValueChange={(value) =>
                    void updateTask(task.id, { projectId: value === "none" ? null : value }).catch(
                      fail,
                    )
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="mt-6 space-y-2">
              <label
                htmlFor="task-description"
                className="text-xs font-medium text-muted-foreground"
              >
                Description
              </label>
              <Textarea
                id="task-description"
                rows={3}
                defaultValue={task.description}
                key={task.id}
                onBlur={(event) => {
                  const value = event.currentTarget.value;
                  if (value !== task.description)
                    void updateTask(task.id, { description: value }).catch(fail);
                }}
                placeholder="Add details for this task"
              />
            </div>
            <Tabs defaultValue="comments" className="mt-6">
              <TabsList>
                <TabsTrigger value="comments">Comments ({task.comments.length})</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="comments" className="space-y-4 pt-3">
                {task.comments.length === 0 && (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                )}
                {task.comments.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px]">
                      {members.find((member) => member.id === item.authorId)?.initials ?? "?"}
                    </span>
                    <div className="text-sm">
                      <div className="font-medium">
                        {members.find((member) => member.id === item.authorId)?.name ??
                          "Workspace member"}{" "}
                        <span className="font-normal text-muted-foreground">· {item.at}</span>
                      </div>
                      <p className="mt-0.5 text-foreground/80">{item.body}</p>
                    </div>
                  </div>
                ))}
                <form
                  className="flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (comment.trim())
                      void addComment(task.id, comment.trim())
                        .then(() => setComment(""))
                        .catch(fail);
                  }}
                >
                  <Textarea
                    rows={2}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Write a comment…"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    aria-label="Send comment"
                    disabled={!comment.trim()}
                  >
                    <Send className="size-4" />
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="activity" className="pt-3">
                <ol className="space-y-3 border-l pl-4">
                  {task.activity.length === 0 && (
                    <li className="text-sm text-muted-foreground">No activity yet.</li>
                  )}
                  {task.activity.map((item, index) => (
                    <li key={`${item.at}-${index}`} className="relative text-sm">
                      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                      {item.text} <span className="text-muted-foreground">· {item.at}</span>
                    </li>
                  ))}
                </ol>
              </TabsContent>
            </Tabs>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("Delete this task? This cannot be undone.")) return;
                void deleteTask(task.id)
                  .then(() => setOpenTaskId(null))
                  .catch(fail);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-md border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="size-3.5" />
              Delete task
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
