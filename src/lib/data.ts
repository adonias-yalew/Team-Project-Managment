// Sample data and domain types. Replace these exports with Lovable Cloud queries later;
// components consume the types only, so swapping the source won't require UI rewrites.

export type Priority = "urgent" | "high" | "medium" | "low";
export type Status = "todo" | "in_progress" | "review" | "done";

export interface Member {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface Comment {
  id: string;
  authorId: string;
  body: string;
  at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assignees: string[];
  projectId: string;
  due: string; // ISO date
  comments: Comment[];
  activity: { at: string; text: string }[];
}

export interface Milestone {
  id: string;
  title: string;
  due: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  members: string[];
  deadline: string;
  milestones: Milestone[];
  health: "on_track" | "at_risk" | "off_track";
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  done: boolean;
}
export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}
export interface LearningPath {
  id: string;
  title: string;
  description: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  modules: Module[];
  resources: { title: string; kind: "Article" | "Video" | "Course" | "Book"; url: string }[];
  milestones: { title: string; done: boolean }[];
}

export interface Submission {
  id: string;
  title: string;
  authorId: string;
  reviewerId: string;
  projectId: string;
  submittedAt: string;
  link: string;
  summary: string;
  status: "pending" | "approved" | "rejected" | "changes";
  scores?: Record<string, number>;
  feedback?: string;
}

export interface PlannerItem {
  id: string;
  title: string;
  time?: string;
  recurring: boolean;
  done: boolean;
}

const today = new Date();
export const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const CURRENT_USER_ID = "u1";

export const members: Member[] = [
  { id: "u1", name: "Adonias Yalew", role: "Product Engineer", initials: "AY" },
  { id: "u2", name: "Selam Tesfaye", role: "Frontend Engineer", initials: "ST" },
  { id: "u3", name: "Dawit Bekele", role: "Backend Engineer", initials: "DB" },
  { id: "u4", name: "Hana Girma", role: "Product Designer", initials: "HG" },
  { id: "u5", name: "Yonas Alemu", role: "DevOps Engineer", initials: "YA" },
];

export const projects: Project[] = [
  {
    id: "p1",
    name: "Client Portal v2",
    code: "CP",
    description:
      "Rebuild of the customer-facing portal with self-serve billing, usage dashboards and a redesigned onboarding flow.",
    members: ["u1", "u2", "u4"],
    deadline: iso(24),
    health: "on_track",
    milestones: [
      { id: "m1", title: "Design system finalized", due: iso(-12), done: true },
      { id: "m2", title: "Billing integration", due: iso(4), done: false },
      { id: "m3", title: "Beta release", due: iso(18), done: false },
    ],
  },
  {
    id: "p2",
    name: "Payments API",
    code: "PA",
    description:
      "Unified payments service supporting mobile money and card rails with idempotent webhooks and reconciliation.",
    members: ["u1", "u3", "u5"],
    deadline: iso(10),
    health: "at_risk",
    milestones: [
      { id: "m4", title: "Provider sandbox", due: iso(-20), done: true },
      { id: "m5", title: "Reconciliation jobs", due: iso(-2), done: false },
      { id: "m6", title: "Production rollout", due: iso(10), done: false },
    ],
  },
  {
    id: "p3",
    name: "Internal Ops Toolkit",
    code: "OT",
    description:
      "Lightweight admin tooling for support and finance teams: lookups, refunds, account notes and audit trails.",
    members: ["u2", "u3", "u4", "u5"],
    deadline: iso(45),
    health: "on_track",
    milestones: [
      { id: "m7", title: "Discovery interviews", due: iso(-5), done: true },
      { id: "m8", title: "MVP screens", due: iso(15), done: false },
    ],
  },
  {
    id: "p4",
    name: "Mobile App Launch",
    code: "MA",
    description: "First public release of the companion mobile app for iOS and Android.",
    members: ["u1", "u2", "u4", "u5"],
    deadline: iso(6),
    health: "off_track",
    milestones: [
      { id: "m9", title: "Store assets", due: iso(-1), done: false },
      { id: "m10", title: "Public launch", due: iso(6), done: false },
    ],
  },
];

const c = (id: string, authorId: string, body: string, at: string): Comment => ({ id, authorId, body, at });

export const initialTasks: Task[] = [
  { id: "t1", title: "Implement invoice list with filters", description: "Paginated invoice table with status, date range and amount filters. Use the shared table primitives.", status: "in_progress", priority: "high", assignees: ["u1", "u2"], projectId: "p1", due: iso(0), comments: [c("c1", "u2", "I can take the date range picker.", "2h ago")], activity: [{ at: "Yesterday", text: "Status changed to In progress" }, { at: "3 days ago", text: "Task created by Hana Girma" }] },
  { id: "t2", title: "Webhook signature verification", description: "Verify HMAC signatures for all inbound provider webhooks and reject replays older than 5 minutes.", status: "review", priority: "urgent", assignees: ["u1", "u3"], projectId: "p2", due: iso(-1), comments: [], activity: [{ at: "Today", text: "Submitted for review" }] },
  { id: "t3", title: "Onboarding empty states", description: "Design empty states for the first-run dashboard and projects list.", status: "todo", priority: "medium", assignees: ["u4"], projectId: "p1", due: iso(3), comments: [], activity: [{ at: "2 days ago", text: "Task created" }] },
  { id: "t4", title: "Reconciliation cron job", description: "Nightly job comparing provider settlements with internal ledger; alert on mismatches.", status: "in_progress", priority: "high", assignees: ["u3", "u5"], projectId: "p2", due: iso(-2), comments: [c("c2", "u5", "Staging cron is set up.", "1d ago")], activity: [{ at: "1 day ago", text: "Yonas Alemu commented" }] },
  { id: "t5", title: "App store screenshots", description: "Produce 6 localized screenshots per platform.", status: "todo", priority: "urgent", assignees: ["u4", "u1"], projectId: "p4", due: iso(1), comments: [], activity: [] },
  { id: "t6", title: "Refund lookup screen", description: "Search by transaction ID or phone number; show refund eligibility.", status: "todo", priority: "low", assignees: ["u2"], projectId: "p3", due: iso(9), comments: [], activity: [] },
  { id: "t7", title: "CI pipeline for mobile builds", description: "Automate signed builds for both platforms on tagged releases.", status: "done", priority: "high", assignees: ["u5"], projectId: "p4", due: iso(-4), comments: [], activity: [{ at: "4 days ago", text: "Marked as done" }] },
  { id: "t8", title: "Usage chart component", description: "Reusable area chart for usage metrics with tooltips.", status: "done", priority: "medium", assignees: ["u1"], projectId: "p1", due: iso(-3), comments: [], activity: [{ at: "3 days ago", text: "Marked as done" }] },
  { id: "t9", title: "Audit trail data model", description: "Append-only audit events table and query API.", status: "review", priority: "medium", assignees: ["u3"], projectId: "p3", due: iso(5), comments: [], activity: [] },
  { id: "t10", title: "Push notification opt-in flow", description: "Contextual permission prompt after first meaningful action.", status: "in_progress", priority: "medium", assignees: ["u2", "u4"], projectId: "p4", due: iso(2), comments: [], activity: [] },
  { id: "t11", title: "Write API idempotency docs", description: "Document idempotency keys and retry behaviour for partners.", status: "todo", priority: "low", assignees: ["u1"], projectId: "p2", due: iso(7), comments: [], activity: [] },
  { id: "t12", title: "Account notes permissions", description: "Restrict note visibility by team role.", status: "done", priority: "low", assignees: ["u5", "u3"], projectId: "p3", due: iso(-6), comments: [], activity: [] },
];

export const activityFeed = [
  { id: "a1", who: "u3", text: "submitted Webhook signature verification for review", at: "12 min ago" },
  { id: "a2", who: "u4", text: "uploaded new onboarding mockups to Client Portal v2", at: "48 min ago" },
  { id: "a3", who: "u5", text: "completed CI pipeline for mobile builds", at: "2 h ago" },
  { id: "a4", who: "u2", text: "commented on Implement invoice list with filters", at: "3 h ago" },
  { id: "a5", who: "u1", text: "finished the module “Advanced TypeScript Patterns”", at: "Yesterday" },
];

export const learningPaths: LearningPath[] = [
  {
    id: "l1", title: "Systems Design Fundamentals", level: "Intermediate",
    description: "Reason about scale, consistency and failure in distributed systems.",
    modules: [
      { id: "lm1", title: "Scalability basics", lessons: [{ id: "x1", title: "Vertical vs horizontal", minutes: 20, done: true }, { id: "x2", title: "Load balancing", minutes: 25, done: true }, { id: "x3", title: "Caching strategies", minutes: 30, done: true }] },
      { id: "lm2", title: "Data & consistency", lessons: [{ id: "x4", title: "CAP in practice", minutes: 30, done: true }, { id: "x5", title: "Replication", minutes: 35, done: false }, { id: "x6", title: "Partitioning", minutes: 35, done: false }] },
      { id: "lm3", title: "Reliability", lessons: [{ id: "x7", title: "Queues & retries", minutes: 25, done: false }, { id: "x8", title: "Observability", minutes: 30, done: false }] },
    ],
    resources: [
      { title: "Designing Data-Intensive Applications", kind: "Book", url: "https://dataintensive.net" },
      { title: "System Design Primer", kind: "Article", url: "https://github.com/donnemartin/system-design-primer" },
    ],
    milestones: [{ title: "Complete scalability module", done: true }, { title: "Design a URL shortener", done: false }, { title: "Present design review", done: false }],
  },
  {
    id: "l2", title: "Advanced TypeScript", level: "Advanced",
    description: "Generics, conditional types and type-safe API design.",
    modules: [
      { id: "lm4", title: "Type-level programming", lessons: [{ id: "y1", title: "Conditional types", minutes: 25, done: true }, { id: "y2", title: "Mapped types", minutes: 25, done: true }, { id: "y3", title: "Template literal types", minutes: 20, done: true }] },
      { id: "lm5", title: "API design", lessons: [{ id: "y4", title: "Branded types", minutes: 15, done: true }, { id: "y5", title: "Builders & inference", minutes: 30, done: false }] },
    ],
    resources: [{ title: "Type Challenges", kind: "Course", url: "https://github.com/type-challenges/type-challenges" }, { title: "TypeScript Handbook", kind: "Article", url: "https://www.typescriptlang.org/docs/" }],
    milestones: [{ title: "Solve 20 medium challenges", done: true }, { title: "Refactor shared types package", done: false }],
  },
  {
    id: "l3", title: "Product Thinking for Engineers", level: "Foundation",
    description: "Discovery, prioritization and measuring outcomes.",
    modules: [
      { id: "lm6", title: "Discovery", lessons: [{ id: "z1", title: "Customer interviews", minutes: 20, done: false }, { id: "z2", title: "Opportunity trees", minutes: 25, done: false }] },
      { id: "lm7", title: "Metrics", lessons: [{ id: "z3", title: "North star metrics", minutes: 20, done: false }] },
    ],
    resources: [{ title: "Continuous Discovery Habits", kind: "Book", url: "https://www.producttalk.org" }],
    milestones: [{ title: "Run 3 customer interviews", done: false }],
  },
];

export const reviewCriteria = ["Correctness", "Code quality", "Testing", "Communication"];

export const initialSubmissions: Submission[] = [
  { id: "s1", title: "Webhook signature verification", authorId: "u3", reviewerId: "u1", projectId: "p2", submittedAt: iso(0), link: "PR #482", summary: "Adds HMAC verification middleware with replay protection and unit tests for edge cases.", status: "pending" },
  { id: "s2", title: "Audit trail data model", authorId: "u3", reviewerId: "u1", projectId: "p3", submittedAt: iso(-1), link: "PR #477", summary: "Append-only events table with indexed queries by actor and entity.", status: "pending" },
  { id: "s3", title: "Invoice list filters", authorId: "u1", reviewerId: "u2", projectId: "p1", submittedAt: iso(-1), link: "PR #475", summary: "Filter bar with URL-synced state and empty states.", status: "pending" },
  { id: "s4", title: "CI pipeline for mobile builds", authorId: "u5", reviewerId: "u1", projectId: "p4", submittedAt: iso(-4), link: "PR #461", summary: "Signed builds on tags, cached dependencies.", status: "approved", scores: { Correctness: 5, "Code quality": 4, Testing: 4, Communication: 5 }, feedback: "Clean pipeline, nice caching. Consider documenting secret rotation." },
  { id: "s5", title: "Usage chart component", authorId: "u1", reviewerId: "u4", projectId: "p1", submittedAt: iso(-3), link: "PR #458", summary: "Reusable area chart.", status: "approved", scores: { Correctness: 5, "Code quality": 5, Testing: 3, Communication: 4 }, feedback: "Looks great. Tooltip spacing matches the spec." },
  { id: "s6", title: "Account notes permissions", authorId: "u5", reviewerId: "u3", projectId: "p3", submittedAt: iso(-6), link: "PR #449", summary: "Role-based note visibility.", status: "rejected", scores: { Correctness: 2, "Code quality": 3, Testing: 2, Communication: 4 }, feedback: "Permission checks happen only in the UI; move them server-side." },
];

export const initialPlanner: PlannerItem[] = [
  { id: "d1", title: "Morning planning (15 min)", time: "08:30", recurring: true, done: true },
  { id: "d2", title: "Deep work: invoice filters", time: "09:00", recurring: false, done: true },
  { id: "d3", title: "Review Dawit's webhook PR", time: "11:30", recurring: false, done: false },
  { id: "d4", title: "Learning: Replication lesson", time: "16:00", recurring: true, done: false },
  { id: "d5", title: "Inbox zero", time: "17:30", recurring: true, done: false },
  { id: "d6", title: "Write tomorrow's top 3", time: "18:00", recurring: true, done: false },
];

// Last 14 days daily completion %, oldest first
export const completionHistory = [62, 80, 100, 75, 90, 40, 0, 85, 100, 100, 70, 95, 88, 33];

export const weeklyProductivity = [
  { day: "Mon", completed: 5, planned: 6, focus: 4.5 },
  { day: "Tue", completed: 7, planned: 7, focus: 5.2 },
  { day: "Wed", completed: 4, planned: 6, focus: 3.8 },
  { day: "Thu", completed: 6, planned: 6, focus: 5.6 },
  { day: "Fri", completed: 8, planned: 9, focus: 6.1 },
  { day: "Sat", completed: 2, planned: 2, focus: 1.5 },
  { day: "Sun", completed: 1, planned: 2, focus: 0.8 },
];

export const taskTrend = [
  { week: "W36", created: 18, completed: 14 },
  { week: "W37", created: 22, completed: 19 },
  { week: "W38", created: 16, completed: 20 },
  { week: "W39", created: 25, completed: 21 },
  { week: "W40", created: 20, completed: 23 },
  { week: "W41", created: 19, completed: 22 },
  { week: "W42", created: 24, completed: 26 },
  { week: "W43", created: 21, completed: 24 },
];

export const memberById = (id: string) => members.find((m) => m.id === id)!;
export const projectById = (id: string) => projects.find((p) => p.id === id);

export const statusLabel: Record<Status, string> = { todo: "To do", in_progress: "In progress", review: "In review", done: "Done" };
export const priorityLabel: Record<Priority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };

export const pathProgress = (p: LearningPath) => {
  const lessons = p.modules.flatMap((m) => m.lessons);
  return Math.round((lessons.filter((l) => l.done).length / lessons.length) * 100);
};

export const projectProgress = (projectId: string, tasks: Task[]) => {
  const t = tasks.filter((x) => x.projectId === projectId);
  if (!t.length) return 0;
  return Math.round((t.filter((x) => x.status === "done").length / t.length) * 100);
};

export const isOverdue = (t: Task) => t.status !== "done" && t.due < iso(0);
