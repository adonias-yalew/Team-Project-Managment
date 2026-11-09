import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/modules/auth/auth-context";
import { getSupabaseClient } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  getPersonalWorkspace,
  listSharedWorkspaces,
  listWorkspaceMembers,
} from "@/modules/workspaces/workspace-api";
import type { Priority, Status, Comment } from "./data";

type LooseClient = SupabaseClient<Database>;
export interface WorkspaceOption {
  id: string;
  name: string;
  workspace_type: "personal" | "team";
}
export interface WorkspacePerson {
  id: string;
  name: string;
  role: string;
  initials: string;
}
export interface WorkspaceProject {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: "active" | "completed" | "archived";
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  taskCount: number;
}
export interface WorkspaceTask {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assignees: string[];
  projectId: string | null;
  due: string;
  comments: Comment[];
  activity: { at: string; text: string }[];
  createdBy: string;
  workspaceId: string;
}

interface Store {
  tasks: WorkspaceTask[];
  projects: WorkspaceProject[];
  members: WorkspacePerson[];
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  addTask: (
    task: Omit<WorkspaceTask, "id" | "comments" | "activity" | "createdBy" | "workspaceId">,
  ) => Promise<void>;
  updateTask: (
    id: string,
    patch: Partial<
      Pick<WorkspaceTask, "title" | "description" | "status" | "priority" | "projectId" | "due">
    >,
  ) => Promise<void>;
  setStatus: (id: string, status: Status) => Promise<void>;
  addComment: (id: string, body: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setTaskAssignees: (id: string, userIds: string[]) => Promise<void>;
  addProject: (project: {
    name: string;
    description: string;
    dueDate: string | null;
  }) => Promise<void>;
  updateProject: (
    id: string,
    project: {
      name: string;
      description: string;
      dueDate: string | null;
      status: WorkspaceProject["status"];
    },
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  openTaskId: string | null;
  setOpenTaskId: (id: string | null) => void;
  creating: boolean;
  setCreating: (value: boolean) => void;
}

const Context = createContext<Store | null>(null);
const relative = (value: string) => formatDistanceToNow(new Date(value), { addSuffix: true });
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The workspace data could not be loaded. Check your connection and permissions.";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [activeWorkspaceId, setActiveId] = useState("");
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [members, setMembers] = useState<WorkspacePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const reloadSequence = useRef(0);

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveId(id);
    try {
      localStorage.setItem("flowtask.activeWorkspace", id);
    } catch {
      /* Storage can be disabled. */
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) return;
    const [personal, shared] = await Promise.all([
      getPersonalWorkspace(user.id),
      listSharedWorkspaces(user.id),
    ]);
    setWorkspaces([personal, ...shared.map(({ workspace }) => workspace)]);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setWorkspaces([]);
      setActiveId("");
      setTasks([]);
      setProjects([]);
      setMembers([]);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    void Promise.all([getPersonalWorkspace(user.id), listSharedWorkspaces(user.id)])
      .then(([personal, shared]) => {
        if (cancelled) return;
        const options: WorkspaceOption[] = [personal, ...shared.map(({ workspace }) => workspace)];
        setWorkspaces(options);
        let saved = "";
        try {
          saved = localStorage.getItem("flowtask.activeWorkspace") ?? "";
        } catch {
          /* Storage can be disabled. */
        }
        setActiveId(options.some((w) => w.id === saved) ? saved : personal.id);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const reload = useCallback(async () => {
    const requestId = ++reloadSequence.current;
    if (!user || !activeWorkspaceId) {
      setTasks([]);
      setProjects([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const supabase = (await getSupabaseClient()) as LooseClient | null;
      if (!supabase)
        throw new Error("Supabase is not configured. Add the project URL and publishable key.");
      const [projectResult, taskResult, memberResult] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("workspace_id", activeWorkspaceId)
          .order("created_at", { ascending: false }),
        supabase
          .from("tasks")
          .select("*")
          .eq("workspace_id", activeWorkspaceId)
          .order("created_at", { ascending: false }),
        listWorkspaceMembers(activeWorkspaceId),
      ]);
      if (projectResult.error) throw projectResult.error;
      if (taskResult.error) throw taskResult.error;
      const rawTasks = taskResult.data ?? [];
      const ids = rawTasks.map((task) => task.id);
      const [assigneeResult, commentResult, activityResult] = ids.length
        ? await Promise.all([
            supabase.from("task_assignees").select("task_id,user_id").in("task_id", ids),
            supabase
              .from("task_comments")
              .select("id,task_id,author_id,body,created_at")
              .in("task_id", ids)
              .order("created_at"),
            supabase
              .from("task_activity")
              .select("task_id,event,created_at")
              .in("task_id", ids)
              .order("created_at", { ascending: false }),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ];
      if (assigneeResult.error) throw assigneeResult.error;
      if (commentResult.error) throw commentResult.error;
      if (activityResult.error) throw activityResult.error;
      const assignees = new Map<string, string[]>();
      for (const row of assigneeResult.data ?? [])
        assignees.set(row.task_id, [...(assignees.get(row.task_id) ?? []), row.user_id]);
      const comments = new Map<string, Comment[]>();
      for (const row of commentResult.data ?? [])
        comments.set(row.task_id, [
          ...(comments.get(row.task_id) ?? []),
          { id: row.id, authorId: row.author_id, body: row.body, at: relative(row.created_at) },
        ]);
      const activity = new Map<string, { at: string; text: string }[]>();
      for (const row of activityResult.data ?? [])
        activity.set(row.task_id, [
          ...(activity.get(row.task_id) ?? []),
          { at: relative(row.created_at), text: row.event },
        ]);
      if (requestId !== reloadSequence.current) return;
      const mappedTasks: WorkspaceTask[] = rawTasks.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        assignees: assignees.get(row.id) ?? [],
        projectId: row.project_id,
        due: row.due_date ?? "",
        comments: comments.get(row.id) ?? [],
        activity: activity.get(row.id) ?? [],
        createdBy: row.created_by,
        workspaceId: row.workspace_id,
      }));
      const taskCounts = new Map<string, number>();
      for (const task of mappedTasks)
        if (task.projectId)
          taskCounts.set(task.projectId, (taskCounts.get(task.projectId) ?? 0) + 1);
      setProjects(
        (projectResult.data ?? []).map((row) => ({
          id: row.id,
          workspaceId: row.workspace_id,
          name: row.name,
          description: row.description,
          status: row.status,
          dueDate: row.due_date,
          createdBy: row.created_by,
          createdAt: row.created_at,
          taskCount: taskCounts.get(row.id) ?? 0,
        })),
      );
      setTasks(mappedTasks);
      setMembers(
        memberResult.map((member) => ({
          id: member.member_user_id,
          name: member.full_name,
          role: member.role,
          initials: member.full_name
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase(),
        })),
      );
    } catch (cause) {
      if (requestId !== reloadSequence.current) return;
      setTasks([]);
      setProjects([]);
      setMembers([]);
      setError(errorMessage(cause));
    } finally {
      if (requestId === reloadSequence.current) setLoading(false);
    }
  }, [user, activeWorkspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const runMutation = useCallback(
    async (work: (supabase: LooseClient) => PromiseLike<unknown>) => {
      if (!user || !activeWorkspaceId)
        throw new Error("Choose a workspace before changing its data.");
      const supabase = (await getSupabaseClient()) as LooseClient | null;
      if (!supabase) throw new Error("Supabase is not configured.");
      const result = (await work(supabase)) as { error?: { message: string } | null };
      if (result?.error) throw result.error;
      await reload();
    },
    [user, activeWorkspaceId, reload],
  );

  const value = useMemo<Store>(
    () => ({
      tasks,
      projects,
      members,
      workspaces,
      activeWorkspaceId,
      setActiveWorkspaceId,
      refreshWorkspaces,
      loading,
      error,
      reload,
      addTask: async (task) =>
        runMutation((db) =>
          db.rpc("create_workspace_task", {
            p_workspace_id: activeWorkspaceId,
            p_project_id: task.projectId,
            p_title: task.title.trim(),
            p_description: task.description,
            p_status: task.status,
            p_priority: task.priority,
            p_due_date: task.due || null,
            p_assignee_ids: task.assignees,
          }),
        ),
      updateTask: async (id, patch) =>
        runMutation(async (db) => {
          const changes: {
            title?: string;
            description?: string;
            status?: Status;
            priority?: Priority;
            project_id?: string | null;
            due_date?: string | null;
          } = {};
          if (patch.title !== undefined) changes.title = patch.title;
          if (patch.description !== undefined) changes.description = patch.description;
          if (patch.status !== undefined) changes.status = patch.status;
          if (patch.priority !== undefined) changes.priority = patch.priority;
          if (patch.projectId !== undefined) changes.project_id = patch.projectId || null;
          if (patch.due !== undefined) changes.due_date = patch.due || null;
          return db
            .from("tasks")
            .update(changes)
            .eq("id", id)
            .eq("workspace_id", activeWorkspaceId);
        }),
      setStatus: async (id, status) =>
        runMutation((db) =>
          db.from("tasks").update({ status }).eq("id", id).eq("workspace_id", activeWorkspaceId),
        ),
      addComment: async (id, body) =>
        runMutation((db) =>
          db.from("task_comments").insert({
            task_id: id,
            workspace_id: activeWorkspaceId,
            author_id: user!.id,
            body: body.trim(),
          }),
        ),
      deleteTask: async (id) =>
        runMutation((db) =>
          db.from("tasks").delete().eq("id", id).eq("workspace_id", activeWorkspaceId),
        ),
      setTaskAssignees: async (id, userIds) =>
        runMutation((db) => db.rpc("set_task_assignees", { p_task_id: id, p_user_ids: userIds })),
      addProject: async (project) =>
        runMutation((db) =>
          db.from("projects").insert({
            workspace_id: activeWorkspaceId,
            name: project.name.trim(),
            description: project.description,
            due_date: project.dueDate,
            created_by: user!.id,
          }),
        ),
      updateProject: async (id, project) =>
        runMutation((db) =>
          db
            .from("projects")
            .update({
              name: project.name.trim(),
              description: project.description,
              due_date: project.dueDate,
              status: project.status,
            })
            .eq("id", id)
            .eq("workspace_id", activeWorkspaceId),
        ),
      deleteProject: async (id) =>
        runMutation((db) =>
          db.from("projects").delete().eq("id", id).eq("workspace_id", activeWorkspaceId),
        ),
      openTaskId,
      setOpenTaskId,
      creating,
      setCreating,
    }),
    [
      tasks,
      projects,
      members,
      workspaces,
      activeWorkspaceId,
      setActiveWorkspaceId,
      refreshWorkspaces,
      loading,
      error,
      reload,
      runMutation,
      user,
      openTaskId,
      creating,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("useStore outside StoreProvider");
  return value;
}
