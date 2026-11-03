import { NavLink, useLocation } from "react-router-dom";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { CURRENT_USER_ID, memberById } from "@/lib/data";
import { MemberAvatar } from "./primitives";
import { TaskDialog } from "./task-dialog";
import { TaskDrawer } from "./task-drawer";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  { to: "/team-tasks", label: "Team Tasks", icon: Users },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/planner", label: "Daily Planner", icon: CalendarCheck },
  { to: "/learning", label: "Learning Paths", icon: BookOpen },
  { to: "/reviews", label: "Reviews & Feedback", icon: MessageSquareText },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const path = location.pathname;
  const { submissions } = useStore();
  const pending = submissions.filter((s) => s.status === "pending" && s.reviewerId === CURRENT_USER_ID).length;
  const me = memberById(CURRENT_USER_ID);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary font-display text-sm font-semibold text-sidebar-primary-foreground">
          W
        </div>
        <span className="text-[13px] font-semibold tracking-[0.18em]">WORKSPACE</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
                  isActive || (to === "/" ? path === "/" : path.startsWith(to))
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("size-4", isActive && "text-sidebar-primary")} />
                  <span className="flex-1">{label}</span>
                  {to === "/reviews" && pending > 0 && (
                    <span className="rounded bg-sidebar-primary px-1.5 text-[10px] font-semibold text-sidebar-primary-foreground">
                      {pending}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-lg border border-sidebar-border p-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
          {me.initials}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{me.name}</div>
          <div className="truncate text-[11px] text-sidebar-muted">{me.role}</div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { setCreating } = useStore();

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">
        <SidebarNav />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search tasks, projects, people…"
              className="h-9 w-full rounded-md border bg-card pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> <span className="hidden sm:inline">New task</span>
            </Button>
            <MemberAvatar id={CURRENT_USER_ID} size="md" />
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8 fade-up">{children}</main>
      </div>
      <TaskDialog />
      <TaskDrawer />
    </div>
  );
}
