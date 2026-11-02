import { useState } from "react";
import { CalendarDays, FolderKanban, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { isOverdue, memberById, priorityLabel, projectById, statusLabel, type Priority, type Status } from "@/lib/data";
import { MemberAvatar, fmtDate } from "./primitives";
import { cn } from "@/lib/utils";

export function TaskDrawer() {
  const { tasks, openTaskId, setOpenTaskId, setStatus, updateTask, addComment } = useStore();
  const task = tasks.find((t) => t.id === openTaskId);
  const [comment, setComment] = useState("");

  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && setOpenTaskId(null)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {task && (
          <>
            <SheetHeader className="text-left">
              <span className="eyebrow">{projectById(task.projectId)?.code}-{task.id.replace("t", "")}</span>
              <SheetTitle className="font-display text-xl font-medium">{task.title}</SheetTitle>
            </SheetHeader>
            <div className="mt-5 grid grid-cols-[110px_1fr] items-center gap-y-3 text-sm">
              <span className="text-muted-foreground">Status</span>
              <Select value={task.status} onValueChange={(v) => setStatus(task.id, v as Status)}>
                <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-muted-foreground">Priority</span>
              <Select value={task.priority} onValueChange={(v) => updateTask(task.id, { priority: v as Priority })}>
                <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(priorityLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-muted-foreground">Assignees</span>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((a) => (
                  <span key={a} className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pr-2.5 pl-0.5 text-xs">
                    <MemberAvatar id={a} size="xs" /> {memberById(a).name}
                  </span>
                ))}
              </div>
              <span className="text-muted-foreground">Due</span>
              <span className={cn("flex items-center gap-1.5", isOverdue(task) && "text-destructive")}>
                <CalendarDays className="size-3.5" /> {fmtDate(task.due)} {isOverdue(task) && "· Overdue"}
              </span>
              <span className="text-muted-foreground">Project</span>
              <span className="flex items-center gap-1.5"><FolderKanban className="size-3.5" /> {projectById(task.projectId)?.name}</span>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-foreground/80">{task.description || "No description."}</p>
            <Tabs defaultValue="comments" className="mt-6">
              <TabsList>
                <TabsTrigger value="comments">Comments ({task.comments.length})</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="comments" className="space-y-4 pt-3">
                {task.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
                {task.comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <MemberAvatar id={c.authorId} />
                    <div className="text-sm">
                      <div className="font-medium">{memberById(c.authorId).name} <span className="font-normal text-muted-foreground">· {c.at}</span></div>
                      <p className="mt-0.5 text-foreground/80">{c.body}</p>
                    </div>
                  </div>
                ))}
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => { e.preventDefault(); if (comment.trim()) { addComment(task.id, comment.trim()); setComment(""); } }}
                >
                  <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" />
                  <Button type="submit" size="icon" aria-label="Send comment" disabled={!comment.trim()}><Send className="size-4" /></Button>
                </form>
              </TabsContent>
              <TabsContent value="activity" className="pt-3">
                <ol className="space-y-3 border-l pl-4">
                  {task.activity.length === 0 && <li className="text-sm text-muted-foreground">No activity yet.</li>}
                  {task.activity.map((a, i) => (
                    <li key={i} className="relative text-sm">
                      <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-primary" />
                      {a.text} <span className="text-muted-foreground">· {a.at}</span>
                    </li>
                  ))}
                </ol>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
