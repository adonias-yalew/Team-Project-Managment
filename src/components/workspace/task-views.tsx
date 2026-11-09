import { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  LayoutGrid,
  List,
  MessageSquare,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { isOverdue, statusLabel, type Status } from "@/lib/data";
import type { WorkspaceTask } from "@/lib/store";
import { PriorityBadge, StatusBadge, fmtDate } from "./primitives";
import { cn } from "@/lib/utils";

const columns: { id: Status; title: string; color: string; dot: string; countBg: string }[] = [
  {
    id: "todo",
    title: "To do",
    color: "border-border/80",
    dot: "bg-muted-foreground/60",
    countBg: "bg-muted",
  },
  {
    id: "in_progress",
    title: "In progress",
    color: "border-info/30",
    dot: "bg-info",
    countBg: "bg-info/10 text-info",
  },
  {
    id: "review",
    title: "In review",
    color: "border-warning/30",
    dot: "bg-warning",
    countBg: "bg-warning/15 text-warning",
  },
  {
    id: "done",
    title: "Completed",
    color: "border-primary/30",
    dot: "bg-primary",
    countBg: "bg-primary/10 text-primary",
  },
];

function TaskCard({ t }: { t: WorkspaceTask }) {
  const { setOpenTaskId, projects, members } = useStore();
  const project = projects.find((p) => p.id === t.projectId);
  const overdue = isOverdue(t);

  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", t.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => setOpenTaskId(t.id)}
      className="group relative w-full cursor-grab rounded-xl border border-border/80 bg-card p-3.5 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:cursor-grabbing active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
          {project?.name ?? "No project"}
        </span>
        <PriorityBadge p={t.priority} />
      </div>

      <div className="mt-2.5 text-[13px] font-medium leading-snug text-foreground group-hover:text-primary transition-colors">
        {t.title}
      </div>

      {t.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
          {t.description}
        </p>
      )}

      <div className="mt-3.5 flex items-center justify-between border-t border-border/50 pt-2.5 text-xs">
        <div className="flex -space-x-1.5" aria-label="Task assignees">
          {t.assignees.slice(0, 3).map((id) => {
            const member = members.find((candidate) => candidate.id === id);
            return (
              <span
                key={id}
                title={member?.name}
                className="inline-flex size-5 items-center justify-center rounded-full bg-secondary text-[8px] font-medium text-secondary-foreground ring-2 ring-card"
              >
                {member?.initials ?? "?"}
              </span>
            );
          })}
          {t.assignees.length > 3 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[8px] ring-2 ring-card">
              +{t.assignees.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-[11px]">
          {t.comments.length > 0 && (
            <span
              className="flex items-center gap-1 text-muted-foreground"
              title={`${t.comments.length} comments`}
            >
              <MessageSquare className="size-3" />
              <span>{t.comments.length}</span>
            </span>
          )}

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
              overdue
                ? "bg-destructive/10 text-destructive font-semibold"
                : "text-muted-foreground bg-muted/60",
            )}
          >
            {overdue ? <AlertCircle className="size-3" /> : <CalendarDays className="size-3" />}
            {fmtDate(t.due)}
          </span>
        </div>
      </div>
    </button>
  );
}

function Board({ tasks }: { tasks: WorkspaceTask[] }) {
  const { setStatus, setCreating } = useStore();
  const [over, setOver] = useState<Status | null>(null);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => {
        const items = tasks.filter((t) => t.status === col.id);
        const isTarget = over === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(col.id);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("text/plain");
              if (taskId) setStatus(taskId, col.id);
              setOver(null);
            }}
            className={cn(
              "flex flex-col rounded-2xl border bg-muted/30 p-3 transition-all duration-200",
              col.color,
              isTarget && "ring-2 ring-primary/40 bg-primary/5 border-primary/50",
            )}
          >
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between px-1.5 py-1">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", col.dot)} />
                <span className="text-xs font-semibold text-foreground tracking-tight">
                  {col.title}
                </span>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", col.countBg)}>
                {items.length}
              </span>
            </div>

            {/* Tasks Container */}
            <div className="flex-1 space-y-2.5 min-h-[140px]">
              {items.map((t) => (
                <TaskCard key={t.id} t={t} />
              ))}

              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                  <div className="size-8 rounded-full bg-muted/60 flex items-center justify-center mb-1.5 text-muted-foreground/60">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <span>No tasks in this lane</span>
                  <span className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Drag tasks here
                  </span>
                </div>
              )}
            </div>

            {col.id === "todo" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreating(true)}
                className="mt-2.5 w-full justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" /> Add task
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListView({ tasks }: { tasks: WorkspaceTask[] }) {
  const { setOpenTaskId, projects, members } = useStore();

  return (
    <div className="surface overflow-hidden divide-y divide-border/60">
      <div className="hidden grid-cols-[1.4fr_140px_120px_100px_110px_90px] items-center gap-4 border-b bg-muted/40 px-4 py-3 eyebrow md:grid">
        <span>Task Title</span>
        <span>Project</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Assignees</span>
        <span className="text-right">Due Date</span>
      </div>

      <div className="divide-y divide-border/50">
        {tasks.map((t) => {
          const project = projects.find((p) => p.id === t.projectId);
          const overdue = isOverdue(t);

          return (
            <button
              key={t.id}
              onClick={() => setOpenTaskId(t.id)}
              className="group grid w-full grid-cols-1 gap-2.5 px-4 py-3.5 text-left text-sm transition-colors hover:bg-muted/40 md:grid-cols-[1.4fr_140px_120px_100px_110px_90px] md:items-center md:gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="size-2 rounded-full shrink-0 bg-primary/70 group-hover:scale-125 transition-transform" />
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {t.title}
                  </div>
                  {t.description && (
                    <div className="text-xs text-muted-foreground truncate hidden sm:block">
                      {t.description}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground truncate">
                <span className="inline-flex items-center rounded bg-secondary/80 px-1.5 py-0.5 font-medium text-secondary-foreground">
                  {project?.name || "—"}
                </span>{" "}
                <span className="hidden xl:inline">{project?.name}</span>
              </div>

              <div>
                <StatusBadge s={t.status} />
              </div>

              <div>
                <PriorityBadge p={t.priority} />
              </div>

              <div className="flex -space-x-1.5">
                {t.assignees.slice(0, 2).map((id) => {
                  const member = members.find((candidate) => candidate.id === id);
                  return (
                    <span
                      key={id}
                      title={member?.name}
                      className="inline-flex size-5 items-center justify-center rounded-full bg-secondary text-[8px] ring-2 ring-card"
                    >
                      {member?.initials ?? "?"}
                    </span>
                  );
                })}
              </div>

              <div className="text-right">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs",
                    overdue ? "font-semibold text-destructive" : "text-muted-foreground",
                  )}
                >
                  {overdue && <AlertCircle className="size-3" />}
                  {fmtDate(t.due)}
                </span>
              </div>
            </button>
          );
        })}

        {tasks.length === 0 && (
          <div className="p-12 text-center">
            <Filter className="mx-auto size-8 text-muted-foreground/40 mb-2" />
            <div className="text-sm font-medium">No tasks found</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskWorkspace({
  tasks,
  showAssigneeFilter,
  defaultFilterPreset,
}: {
  tasks: WorkspaceTask[];
  showAssigneeFilter?: boolean;
  defaultFilterPreset?: "all" | "in_progress" | "urgent" | "due_soon";
}) {
  const [view, setView] = useState<"board" | "list">("board");
  const { projects, members, loading, error } = useStore();
  const [project, setProject] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatusFilter] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchProject = project === "all" || t.projectId === project;
      const matchPriority = priority === "all" || t.priority === priority;
      const matchStatus = status === "all" || t.status === status;
      const matchAssignee = assignee === "all" || t.assignees.includes(assignee);
      const matchSearch =
        !search.trim() ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        projects
          .find((p) => p.id === t.projectId)
          ?.name.toLowerCase()
          .includes(search.toLowerCase());

      return matchProject && matchPriority && matchStatus && matchAssignee && matchSearch;
    });
  }, [tasks, projects, project, priority, status, assignee, search]);

  const hasActiveFilters =
    project !== "all" ||
    priority !== "all" ||
    status !== "all" ||
    assignee !== "all" ||
    search !== "";

  const resetFilters = () => {
    setProject("all");
    setPriority("all");
    setStatusFilter("all");
    setAssignee("all");
    setSearch("");
  };

  return (
    <div className="space-y-4">
      {/* Control / Toolbar Strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Board / List View Switcher */}
          <div className="inline-flex rounded-lg border bg-card p-1 shadow-xs">
            <button
              onClick={() => setView("board")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === "board"
                  ? "bg-secondary text-secondary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" /> Board
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-secondary text-secondary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-3.5" /> List
            </button>
          </div>

          {/* Project Filter */}
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger className="h-8.5 w-[140px] sm:w-[150px] bg-card text-xs">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8.5 w-[130px] bg-card text-xs">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee Filter */}
          {showAssigneeFilter && (
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-8.5 w-[140px] bg-card text-xs">
                <SelectValue placeholder="All assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>

        {/* Search input + Counter */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-48 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="h-8.5 pl-8 text-xs bg-card"
            />
          </div>
          <span className="shrink-0 rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-xs">
            <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>

      {/* Render View */}
      {error ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : loading ? (
        <div className="surface p-10 text-center text-sm text-muted-foreground" role="status">
          Loading workspace tasks…
        </div>
      ) : view === "board" ? (
        <Board tasks={filtered} />
      ) : (
        <ListView tasks={filtered} />
      )}
    </div>
  );
}
