import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  FolderKanban,
  GitPullRequest,
  Layers,
  ListTodo,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/workspace/app-shell";
import {
  AvatarStack,
  Bar,
  HealthBadge,
  MemberAvatar,
  PriorityBadge,
  Ring,
  StatusBadge,
  fmtDate,
} from "@/components/workspace/primitives";
import { TaskWorkspace } from "@/components/workspace/task-views";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import {
  CURRENT_USER_ID,
  activityFeed,
  isOverdue,
  iso,
  memberById,
  projectProgress,
  projects,
  weeklyProductivity,
  type Project,
  type Task,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export function OverviewPage() {
  const { tasks, planner, setPlanner, submissions, setCreating, setOpenTaskId } = useStore();
  const [activeTab, setActiveTab] = useState<"my_tasks" | "team_tasks" | "projects">("my_tasks");

  const me = memberById(CURRENT_USER_ID);

  // Computed metrics
  const myTasks = tasks.filter((t) => t.assignees.includes(CURRENT_USER_ID));
  const myActiveTasks = myTasks.filter((t) => t.status !== "done");
  const myCompletedTasks = myTasks.filter((t) => t.status === "done");
  const myCompletionRate =
    myTasks.length > 0 ? Math.round((myCompletedTasks.length / myTasks.length) * 100) : 0;

  const totalCompleted = tasks.filter((t) => t.status === "done").length;
  const overallCompletionRate =
    tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;

  const overdueTasks = tasks.filter((t) => isOverdue(t));
  const myOverdueTasks = myTasks.filter((t) => isOverdue(t));

  const pendingReviews = submissions.filter(
    (s) => s.status === "pending" && s.reviewerId === CURRENT_USER_ID,
  );

  const onTrackProjects = projects.filter((p) => p.health === "on_track").length;
  const atRiskProjects = projects.filter((p) => p.health === "at_risk").length;
  const offTrackProjects = projects.filter((p) => p.health === "off_track").length;

  // Toggle planner item
  const togglePlannerItem = (id: string) => {
    setPlanner((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  };

  const plannerCompletedCount = planner.filter((p) => p.done).length;

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Top Header / Greeting Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-5 shadow-xs sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="eyebrow text-primary font-semibold">Overview</span>
                <span className="text-border">•</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  Sprint 24 · Active
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Week 45 · 4 days remaining
                </span>
              </div>

              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Welcome back, {me.name.split(" ")[0]}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Here is your team's pulse, project delivery health, and priority sprint tasks.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 lg:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("projects")}
                className="h-9 gap-1.5 text-xs bg-card hover:bg-muted"
              >
                <FolderKanban className="size-3.5" />
                <span>View Projects</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setCreating(true)}
                className="h-9 gap-1.5 shadow-sm"
              >
                <Plus className="size-4" />
                <span>New Task</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Executive KPI Metrics Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Assigned to Me */}
          <div
            onClick={() => setActiveTab("my_tasks")}
            className="group surface-hover relative cursor-pointer overflow-hidden p-5"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow">My Active Tasks</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-info/10 text-info transition-colors group-hover:bg-info group-hover:text-white">
                <CheckSquareIcon className="size-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="font-display text-3xl font-semibold tracking-tight">
                {myActiveTasks.length}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                of {myTasks.length} total
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              <Bar value={myCompletionRate} />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{myCompletionRate}% completed</span>
                <span>
                  {myTasks.filter((t) => t.status === "in_progress").length} in progress
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Sprint Productivity & Velocity */}
          <div className="surface-hover p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Sprint Velocity</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="size-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="font-display text-3xl font-semibold tracking-tight">
                {overallCompletionRate}%
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                +8% vs last sprint
              </span>
            </div>

            {/* Micro Sparkline of Days (Mon - Sun) */}
            <div className="mt-3">
              <div className="flex items-end gap-1.5 h-6">
                {weeklyProductivity.map((item) => {
                  const heightPercent = Math.min(100, Math.max(15, (item.completed / 10) * 100));
                  return (
                    <div
                      key={item.day}
                      className="group/bar relative flex-1 flex flex-col items-center justify-end h-full"
                    >
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full rounded-xs bg-primary/30 transition-all group-hover/bar:bg-primary"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Mon</span>
                <span>27.3h focus</span>
                <span>Sun</span>
              </div>
            </div>
          </div>

          {/* Card 3: Action Needed / Deadlines */}
          <div
            onClick={() => {
              if (myOverdueTasks.length > 0) setActiveTab("my_tasks");
            }}
            className={cn(
              "surface-hover p-5 transition-colors",
              myOverdueTasks.length > 0 ? "border-destructive/30 bg-destructive/5" : "",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow">Attention Required</span>
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg",
                  myOverdueTasks.length > 0
                    ? "bg-destructive/15 text-destructive"
                    : "bg-warning/15 text-warning",
                )}
              >
                <AlertTriangle className="size-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div
                className={cn(
                  "font-display text-3xl font-semibold tracking-tight",
                  myOverdueTasks.length > 0 ? "text-destructive" : "",
                )}
              >
                {myOverdueTasks.length + pendingReviews.length}
              </div>
              <span className="text-xs font-medium text-muted-foreground">actions pending</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 font-medium border",
                  myOverdueTasks.length > 0
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : "bg-muted text-muted-foreground border-border/80",
                )}
              >
                {myOverdueTasks.length} overdue
              </span>
              <span className="rounded-md border border-warning/20 bg-warning/10 px-2 py-0.5 font-medium text-warning">
                {pendingReviews.length} reviews
              </span>
            </div>
          </div>

          {/* Card 4: Portfolio Delivery Health */}
          <div
            onClick={() => setActiveTab("projects")}
            className="group surface-hover cursor-pointer p-5"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow">Portfolio Health</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-foreground/80 group-hover:text-primary transition-colors">
                <Target className="size-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="font-display text-3xl font-semibold tracking-tight">
                {projects.length}
              </div>
              <span className="text-xs text-muted-foreground">active initiatives</span>
            </div>

            <div className="mt-3 flex items-center gap-3 text-[11px] font-medium">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="size-2 rounded-full bg-primary" />
                {onTrackProjects} on track
              </span>
              <span className="flex items-center gap-1.5 text-warning">
                <span className="size-2 rounded-full bg-warning" />
                {atRiskProjects} at risk
              </span>
              {offTrackProjects > 0 && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <span className="size-2 rounded-full bg-destructive" />
                  {offTrackProjects} off track
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Dashboard Workspace Segment Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
          <div className="inline-flex rounded-lg border bg-card p-1 shadow-xs">
            <button
              onClick={() => setActiveTab("my_tasks")}
              className={cn(
                "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all",
                activeTab === "my_tasks"
                  ? "bg-secondary text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CheckSquareIcon className="size-3.5" />
              <span>My Tasks</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                {myTasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("team_tasks")}
              className={cn(
                "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all",
                activeTab === "team_tasks"
                  ? "bg-secondary text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Users className="size-3.5" />
              <span>Team Workspace</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                {tasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("projects")}
              className={cn(
                "flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all",
                activeTab === "projects"
                  ? "bg-secondary text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Layers className="size-3.5" />
              <span>Projects Portfolio</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                {projects.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex size-2 rounded-full bg-primary" />
            <span>Real-time sync enabled</span>
          </div>
        </div>

        {/* Main Content Grid: 8 Columns Main Stage + 4 Columns Operations Sidebar */}
        <div className="grid gap-6 xl:grid-cols-12">
          {/* Main Stage (8 Cols) */}
          <div className="space-y-6 xl:col-span-8">
            {activeTab === "my_tasks" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Assigned Tasks</h2>
                    <p className="text-xs text-muted-foreground">
                      Tasks allocated to you for the current release sprint.
                    </p>
                  </div>
                </div>
                <TaskWorkspace tasks={myTasks} />
              </div>
            )}

            {activeTab === "team_tasks" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Team Tasks</h2>
                    <p className="text-xs text-muted-foreground">
                      Cross-functional delivery items across all engineering disciplines.
                    </p>
                  </div>
                </div>
                <TaskWorkspace tasks={tasks} showAssigneeFilter />
              </div>
            )}

            {activeTab === "projects" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Active Initiatives</h2>
                    <p className="text-xs text-muted-foreground">
                      Key product milestones and delivery health across teams.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {projects.map((proj) => (
                    <ProjectCard key={proj.id} project={proj} tasks={tasks} />
                  ))}
                </div>
              </div>
            )}

            {/* Active Projects Spotlight when on "My Tasks" or "Team Tasks" tab */}
            {activeTab !== "projects" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold tracking-tight">
                      Active Projects Snapshot
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("projects")}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    View all {projects.length} <ChevronRight className="size-3" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {projects.slice(0, 2).map((proj) => (
                    <ProjectCard key={proj.id} project={proj} tasks={tasks} compact />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Operational & Momentum Feed (4 Cols) */}
          <div className="space-y-6 xl:col-span-4">
            {/* Widget 1: Today's Focus & Planner Checklist */}
            <div className="surface overflow-hidden p-5">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ListTodo className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Today's Focus</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {plannerCompletedCount} of {planner.length} completed
                    </p>
                  </div>
                </div>
                <Ring
                  value={
                    planner.length > 0
                      ? Math.round((plannerCompletedCount / planner.length) * 100)
                      : 0
                  }
                  size={42}
                />
              </div>

              <div className="mt-3.5 space-y-2">
                {planner.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => togglePlannerItem(item.id)}
                    className={cn(
                      "group flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent p-2 transition-all hover:border-border hover:bg-muted/40",
                      item.done && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                        item.done
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border/90 bg-card group-hover:border-primary",
                      )}
                    >
                      {item.done && <CheckCircle2 className="size-3 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-xs font-medium leading-snug transition-colors",
                          item.done
                            ? "line-through text-muted-foreground"
                            : "text-foreground group-hover:text-primary",
                        )}
                      >
                        {item.title}
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        {item.time && (
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="size-2.5" />
                            {item.time}
                          </span>
                        )}
                        {item.recurring && (
                          <span className="rounded bg-muted px-1 py-0.2 font-medium">Daily</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 2: Pending Code Reviews & PR Approvals */}
            <div className="surface p-5">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-warning/15 text-warning">
                    <GitPullRequest className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Review Queue</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Submissions awaiting feedback
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                  {submissions.filter((s) => s.status === "pending").length}
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5">
                {submissions
                  .filter((s) => s.status === "pending")
                  .slice(0, 3)
                  .map((sub) => {
                    const author = memberById(sub.authorId);
                    return (
                      <div
                        key={sub.id}
                        className="rounded-xl border border-border/80 bg-muted/20 p-3 transition-all hover:border-primary/40 hover:bg-card"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-primary">
                            {sub.link}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {fmtDate(sub.submittedAt)}
                          </span>
                        </div>

                        <div className="mt-1.5 text-xs font-medium text-foreground line-clamp-1">
                          {sub.title}
                        </div>

                        <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-[11px]">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MemberAvatar id={sub.authorId} size="xs" />
                            <span className="truncate max-w-[120px]">{author?.name}</span>
                          </div>
                          <Link
                            to="/reviews"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-[11px]"
                          >
                            Review <ArrowUpRight className="size-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Widget 3: Live Pulse & Team Activity */}
            <div className="surface p-5">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-secondary text-foreground">
                    <Activity className="size-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Recent Pulse</h3>
                    <p className="text-[11px] text-muted-foreground">Real-time team activity</p>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 space-y-3">
                {activityFeed.slice(0, 4).map((feed) => {
                  const who = memberById(feed.who);
                  return (
                    <div key={feed.id} className="flex items-start gap-2.5 text-xs">
                      <MemberAvatar id={feed.who} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground leading-snug">
                          <span className="font-semibold">{who?.name}</span>{" "}
                          <span className="text-muted-foreground">{feed.text}</span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground/80 font-mono">
                          {feed.at}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function CheckSquareIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 11 3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function ProjectCard({
  project,
  tasks,
  compact,
}: {
  project: Project;
  tasks: Task[];
  compact?: boolean;
}) {
  const progress = projectProgress(project.id, tasks);
  const doneMilestones = project.milestones.filter((m) => m.done).length;

  return (
    <div className="surface-hover flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-xs transition-all duration-200 hover:border-primary/40">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-xs font-bold text-secondary-foreground font-mono">
              {project.code}
            </span>
            <div>
              <h4 className="text-sm font-semibold tracking-tight text-foreground">
                {project.name}
              </h4>
              <span className="text-[11px] text-muted-foreground">Due {fmtDate(project.deadline)}</span>
            </div>
          </div>
          <HealthBadge health={project.health} />
        </div>

        {!compact && (
          <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2.5 border-t border-border/50 pt-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Overall Progress</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <Bar value={progress} />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <AvatarStack ids={project.members} size="xs" max={3} />
          <span className="text-[11px] font-medium text-muted-foreground">
            {doneMilestones}/{project.milestones.length} milestones
          </span>
        </div>
      </div>
    </div>
  );
}
