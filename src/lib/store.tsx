import { createContext, useContext, useState, type ReactNode } from "react";
import {
  initialPlanner,
  initialSubmissions,
  initialTasks,
  learningPaths as initialPaths,
  CURRENT_USER_ID,
  type LearningPath,
  type PlannerItem,
  type Status,
  type Submission,
  type Task,
} from "./data";

// In-memory session state only (resets on reload). This is the seam to swap for
// a remote data layer later.
interface Store {
  tasks: Task[];
  addTask: (t: Omit<Task, "id" | "comments" | "activity">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  setStatus: (id: string, s: Status) => void;
  addComment: (id: string, body: string) => void;
  planner: PlannerItem[];
  setPlanner: (fn: (p: PlannerItem[]) => PlannerItem[]) => void;
  submissions: Submission[];
  decide: (id: string, status: Submission["status"], scores: Record<string, number>, feedback: string) => void;
  paths: LearningPath[];
  toggleLesson: (pathId: string, lessonId: string) => void;
  openTaskId: string | null;
  setOpenTaskId: (id: string | null) => void;
  creating: boolean;
  setCreating: (v: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [planner, setPlannerState] = useState(initialPlanner);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [paths, setPaths] = useState(initialPaths);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const updateTask = (id: string, patch: Partial<Task>) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const value: Store = {
    tasks,
    addTask: (t) =>
      setTasks((ts) => [
        { ...t, id: `t${Date.now()}`, comments: [], activity: [{ at: "Just now", text: "Task created" }] },
        ...ts,
      ]),
    updateTask,
    setStatus: (id, s) =>
      setTasks((ts) =>
        ts.map((t) =>
          t.id === id && t.status !== s
            ? { ...t, status: s, activity: [{ at: "Just now", text: `Status changed` }, ...t.activity] }
            : t,
        ),
      ),
    addComment: (id, body) =>
      setTasks((ts) =>
        ts.map((t) =>
          t.id === id
            ? { ...t, comments: [...t.comments, { id: `c${Date.now()}`, authorId: CURRENT_USER_ID, body, at: "Just now" }] }
            : t,
        ),
      ),
    planner,
    setPlanner: (fn) => setPlannerState(fn),
    submissions,
    decide: (id, status, scores, feedback) =>
      setSubmissions((s) => s.map((x) => (x.id === id ? { ...x, status, scores, feedback } : x))),
    paths,
    toggleLesson: (pathId, lessonId) =>
      setPaths((ps) =>
        ps.map((p) =>
          p.id !== pathId
            ? p
            : {
                ...p,
                modules: p.modules.map((m) => ({
                  ...m,
                  lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, done: !l.done } : l)),
                })),
              },
        ),
      ),
    openTaskId,
    setOpenTaskId,
    creating,
    setCreating,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
