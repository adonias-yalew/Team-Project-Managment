import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { memberById, priorityLabel, statusLabel, type Priority, type Status } from "@/lib/data";

export function MemberAvatar({ id, size = "sm" }: { id: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const m = memberById(id);
  const s =
    size === "xs"
      ? "size-5 text-[9px]"
      : size === "sm"
      ? "size-7 text-[10px]"
      : size === "md"
      ? "size-8 text-xs"
      : "size-10 text-sm";
  return (
    <span
      title={m?.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-secondary/80 font-medium text-secondary-foreground ring-2 ring-card shadow-xs transition-transform hover:scale-105",
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
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted font-medium text-[10px] text-muted-foreground ring-2 ring-card">
          +{ids.length - max}
        </span>
      )}
    </div>
  );
}

const priorityStyle: Record<Priority, string> = {
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-warning/15 text-warning border-warning/25",
  medium: "bg-info/15 text-info border-info/25",
  low: "bg-muted text-muted-foreground border-border/60",
};
const priorityDot: Record<Priority, string> = {
  urgent: "bg-destructive",
  high: "bg-warning",
  medium: "bg-info",
  low: "bg-muted-foreground",
};

export function PriorityBadge({ p }: { p: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight",
        priorityStyle[p],
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", priorityDot[p])} />
      {priorityLabel[p]}
    </span>
  );
}

const statusStyle: Record<Status, { bg: string; dot: string }> = {
  todo: { bg: "bg-muted/80 text-muted-foreground border-border/80", dot: "bg-muted-foreground/70" },
  in_progress: { bg: "bg-info/10 text-info border-info/20", dot: "bg-info" },
  review: { bg: "bg-warning/15 text-warning border-warning/25", dot: "bg-warning" },
  done: { bg: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" },
};

export function StatusBadge({ s }: { s: Status }) {
  const meta = statusStyle[s];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium", meta.bg)}>
      <span className={cn("size-1.5 rounded-full shrink-0", meta.dot)} />
      {statusLabel[s]}
    </span>
  );
}

export function HealthBadge({ health }: { health: "on_track" | "at_risk" | "off_track" }) {
  const meta = {
    on_track: { label: "On Track", bg: "bg-primary/10 text-primary border-primary/25", dot: "bg-primary" },
    at_risk: { label: "At Risk", bg: "bg-warning/15 text-warning border-warning/25", dot: "bg-warning" },
    off_track: { label: "Off Track", bg: "bg-destructive/10 text-destructive border-destructive/25", dot: "bg-destructive" },
  }[health];

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", meta.bg)}>
      <span className={cn("size-1.5 rounded-full shrink-0", meta.dot)} />
      {meta.label}
    </span>
  );
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

export function ComingSoonPage({
  title,
  subtitle,
  description,
  highlights,
}: {
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
}) {
  const stats = [
    { label: "Planned", value: "03", hint: "focus areas" },
    { label: "In review", value: "07", hint: "team ideas" },
    { label: "Ready soon", value: "12", hint: "ship-ready tasks" },
  ];

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="surface p-4">
            <div className="eyebrow">{stat.label}</div>
            <div className="mt-3 font-display text-[30px] leading-none tracking-tight">{stat.value}</div>
            <div className="mt-2 text-xs text-muted-foreground">{stat.hint}</div>
          </div>
        ))}
      </div>

      <section className="surface overflow-hidden">
        <div className="border-b bg-gradient-to-r from-primary/8 via-primary-soft to-transparent px-5 py-4 sm:px-6">
          <div className="eyebrow">Workspace preview</div>
          <h2 className="mt-2 text-lg font-semibold">A polished experience is on the way</h2>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <p className="text-sm leading-7 text-muted-foreground">{description}</p>

            <div className="mt-6 space-y-3">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border bg-card/60 px-3 py-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                    ✓
                  </span>
                  <span className="text-sm font-medium text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card p-4">
            <div className="eyebrow">Priority</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-2xl font-semibold">Q4</div>
                <div className="text-xs text-muted-foreground">Release focus</div>
              </div>
              <div className="space-y-3">
                {[
                  { label: "UI polish", value: "92%" },
                  { label: "Team flow", value: "88%" },
                  { label: "Automation", value: "76%" },
                ].map((meta) => (
                  <div key={meta.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{meta.label}</span>
                      <span>{meta.value}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: meta.value }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  badge,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "surface-hover relative overflow-hidden p-4 sm:p-5",
        onClick && "cursor-pointer",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary/80 text-foreground/80">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="font-display text-[30px] font-medium leading-none tracking-tight">{value}</div>
        {badge}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 56, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={5} className="fill-none stroke-muted/60" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - clamped / 100)}
          className="fill-none stroke-primary transition-all duration-700"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold">{label ?? `${clamped}%`}</span>
    </div>
  );
}

export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
