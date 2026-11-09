import { NavLink, useLocation } from "react-router-dom";
import { useState, type ReactNode } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  Users,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useAuth } from "@/modules/auth/auth-context";
import { toast } from "sonner";
import { TaskDialog } from "./task-dialog";
import { TaskDrawer } from "./task-drawer";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/my-tasks", label: "My Tasks", icon: ListTodo },
  { to: "/team-tasks", label: "Team Tasks", icon: ListTodo },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { to: "/my-workspace", label: "My Workspace", icon: BriefcaseBusiness },
  { to: "/workspaces", label: "Shared Workspaces", icon: Users },
  { to: "/learning", label: "Learning Paths", icon: BookOpen },
  { to: "/reviews", label: "Reviews & Feedback", icon: MessageSquareText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const path = location.pathname;
  const { user } = useAuth();
  const fullName =
    typeof user?.user_metadata?.["full_name"] === "string"
      ? user.user_metadata["full_name"]
      : (user?.email ?? "Account");
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

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
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-lg border border-sidebar-border p-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium">
          {initials}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{fullName}</div>
          <div className="truncate text-[11px] text-sidebar-muted">{user?.email}</div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  sampleContent = true,
}: {
  children: ReactNode;
  sampleContent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { setCreating, workspaces, activeWorkspaceId, setActiveWorkspaceId } = useStore();
  const { user, signOut } = useAuth();

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
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex-1" />
          <div className="ml-auto flex items-center gap-3">
            {workspaces.length > 1 && (
              <label className="sr-only" htmlFor="active-workspace">
                Active workspace
              </label>
            )}
            {workspaces.length > 1 && (
              <select
                id="active-workspace"
                aria-label="Active workspace"
                value={activeWorkspaceId}
                onChange={(event) => setActiveWorkspaceId(event.currentTarget.value)}
                className="h-9 max-w-48 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            )}
            {sampleContent && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <span className="hidden sm:inline">New task</span>
              </Button>
            )}
            <button
              className="rounded-md p-2 text-muted-foreground hover:bg-muted"
              aria-label="Sign out"
              title={user?.email}
              onClick={() =>
                void signOut().catch((error: unknown) =>
                  toast.error(error instanceof Error ? error.message : "Could not sign out."),
                )
              }
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8 fade-up">{children}</main>
      </div>
      {sampleContent && <TaskDialog />}
      {sampleContent && <TaskDrawer />}
    </div>
  );
}
