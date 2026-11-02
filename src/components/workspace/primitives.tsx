import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { memberById, priorityLabel, statusLabel, type Priority, type Status } from "@/lib/data";

export function MemberAvatar({ id, size = "sm" }: { id: string; size?: "xs" | "sm" | "md" }) {
  const m = memberById(id);
  const s = size === "xs" ? "size-5 text-[9px]" : size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs";
  return (
    <span
      title={m?.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground ring-2 ring-card",
        s,
      )}
    >
      {m?.initials}
    </span>
  );
}

export function AvatarStack({ ids, size = "sm", max = 4 }: { ids: string[]; size?: "xs" | "sm" | "md"; max?: number }) {
  return (
    <div className="flex -space-x-1.5">
      {ids.slice(0, max).map((id) => (
        <MemberAvatar key={id} id={id} size={size} />
      ))}
      {ids.length > max && (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground ring-2 ring-card">
          +{ids.length - max}
        </span>
      )}
    </div>
  );
}

const priorityStyle: Record<Priority, string> = {
  urgent: "bg-destructive-soft text-destructive",
  high: "bg-warning-soft text-warning",
  medium: "bg-info-soft text-info",
  low: "bg-muted text-muted-foreground",
};
const priorityDot: Record<Priority, string> = {
  urgent: "bg-destructive",
  high: "bg-warning",
  medium: "bg-info",
  low: "bg-muted-foreground",
};

export function PriorityBadge({ p }: { p: Priority }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium", priorityStyle[p])}>
      <span className={cn("size-1.5 rounded-full", priorityDot[p])} />
      {priorityLabel[p]}
    </span>
  );
}

const statusStyle: Record<Status, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-info-soft text-info",
  review: "bg-warning-soft text-warning",
  done: "bg-primary-soft text-primary",
};
export function StatusBadge({ s }: { s: Status }) {
  return <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", statusStyle[s])}>{statusLabel[s]}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("surface p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 font-display text-[28px] leading-none tracking-tight">{value}</div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Ring({ value, size = 56, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={5} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - value / 100)}
          className="fill-none stroke-primary transition-all duration-700"
        />
      </svg>
      <span className="absolute text-xs font-semibold">{label ?? `${value}%`}</span>
    </div>
  );
}

export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
