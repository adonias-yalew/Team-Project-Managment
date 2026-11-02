import { useMemo, useState } from "react";
import { CalendarDays, LayoutGrid, List, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { isOverdue, members, projectById, projects, statusLabel, type Status, type Task } from "@/lib/data";
import { AvatarStack, PriorityBadge, StatusBadge, fmtDate } from "./primitives";
import { cn } from "@/lib/utils";

const columns: Status[] = ["todo", "in_progress", "review", "done"];

function TaskCard({ t }: { t: Task }) {
  const { setOpenTaskId } = useStore();
  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
      onClick={() => setOpenTaskId(t.id)}
      className="surface w-full cursor-grab p-3.5 text-left transition-shadow hover:shadow-pop active:cursor-grabbing"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{projectById(t.projectId)?.name}</span>
        <PriorityBadge p={t.priority} />
      </div>
      <div className="mt-2 text-sm leading-snug font-medium">{t.title}</div>
      <div className="mt-3 flex items-center justify-between">
        <AvatarStack ids={t.assignees} size="xs" />
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {t.comments.length > 0 && <span className="flex items-center gap-1"><MessageSquare className="size-3" />{t.comments.length}</span>}
          <span className={cn("flex items-center gap-1", isOverdue(t) && "text-destructive")}>
            <CalendarDays className="size-3" />{fmtDate(t.due)}
          </span>
        </div>
      </div>
    </button>
  );
}

function Board({ tasks }: { tasks: Task[] }) {
  const { setStatus } = useStore();
  const [over, setOver] = useState<Status | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((s) => {
        const items = tasks.filter((t) => t.status === s);
        return (
          <div
            key={s}
            onDragOver={(e) => { e.preventDefault(); setOver(s); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setStatus(e.dataTransfer.getData("text/plain"), s); setOver(null); }}
            className={cn("rounded-xl bg-muted/60 p-3 transition-colors", over === s && "bg-primary-soft")}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-semibold">{statusLabel[s]}</span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2.5">
              {items.map((t) => <TaskCard key={t.id} t={t} />)}
              {items.length === 0 && <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Drop tasks here</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ tasks }: { tasks: Task[] }) {
  const { setOpenTaskId } = useStore();
  return (
    <div className="surface overflow-hidden">
      <div className="hidden grid-cols-[1fr_140px_110px_100px_90px] gap-4 border-b px-4 py-2.5 eyebrow md:grid">
        <span>Task</span><span>Project</span><span>Status</span><span>Priority</span><span>Due</span>
      </div>
      {tasks.map((t) => (
        <button
          key={t.id}
          onClick={() => setOpenTaskId(t.id)}
          className="grid w-full grid-cols-1 gap-2 border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-muted/50 md:grid-cols-[1fr_140px_110px_100px_90px] md:items-center md:gap-4"
        >
          <span className="flex items-center gap-3">
            <AvatarStack ids={t.assignees} size="xs" max={2} />
            <span className="font-medium">{t.title}</span>
          </span>
          <span className="truncate text-muted-foreground">{projectById(t.projectId)?.name}</span>
          <span><StatusBadge s={t.status} /></span>
          <span><PriorityBadge p={t.priority} /></span>
          <span className={cn("text-muted-foreground", isOverdue(t) && "text-destructive")}>{fmtDate(t.due)}</span>
        </button>
      ))}
      {tasks.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No tasks match these filters.</div>}
    </div>
  );
}

export function TaskWorkspace({ tasks, showAssigneeFilter }: { tasks: Task[]; showAssigneeFilter?: boolean }) {
  const [view, setView] = useState<"board" | "list">("board");
  const [project, setProject] = useState("all");
  const [priority, setPriority] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (project === "all" || t.projectId === project) &&
          (priority === "all" || t.priority === priority) &&
          (assignee === "all" || t.assignees.includes(assignee)),
      ),
    [tasks, project, priority, assignee],
  );
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border bg-card p-0.5">
          {(["board", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn("flex items-center gap-1.5 rounded px-2.5 py-1 text-xs capitalize", view === v ? "bg-secondary font-medium" : "text-muted-foreground")}
            >
              {v === "board" ? <LayoutGrid className="size-3.5" /> : <List className="size-3.5" />} {v}
            </button>
          ))}
        </div>
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="h-8 w-40 bg-card text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-8 w-36 bg-card text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        {showAssigneeFilter && (
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="h-8 w-40 bg-card text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} tasks</span>
      </div>
      {view === "board" ? <Board tasks={filtered} /> : <ListView tasks={filtered} />}
    </div>
  );
}
