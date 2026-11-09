import { Link } from "react-router-dom";
import { ArrowRight, KeyRound, Settings2, Users } from "lucide-react";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";
import { useAuth } from "@/modules/auth/auth-context";
import { useStore } from "@/lib/store";

function SettingsLink({
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: typeof KeyRound;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/30"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const { workspaces, activeWorkspaceId, members, loading, error } = useStore();
  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);
  const role = members.find((member) => member.id === user?.id)?.role;
  const canManage = role === "owner" || role === "admin";
  const name =
    typeof user?.user_metadata?.["full_name"] === "string"
      ? user.user_metadata["full_name"]
      : "Account";

  return (
    <AppShell sampleContent={false}>
      <PageHeader title="Settings" subtitle="Your account and the selected workspace." />
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="surface p-5 sm:p-6">
          <h2 className="font-semibold">Account</h2>
          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm font-medium">{name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-1 break-all text-sm font-medium">{user?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email status</dt>
              <dd className="mt-1 text-sm font-medium">
                {user?.email_confirmed_at ? "Verified" : "Verification needed"}
              </dd>
            </div>
          </dl>
          <div className="mt-5 border-t pt-5">
            <SettingsLink
              to="/forgot-password"
              title="Reset password"
              description="Request a secure password reset email for this account."
              icon={KeyRound}
            />
          </div>
        </section>
        <section className="surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Active workspace</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {loading ? "Loading workspace…" : (workspace?.name ?? "No workspace selected")}
              </p>
            </div>
            {workspace && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize text-muted-foreground">
                {workspace.workspace_type}
              </span>
            )}
          </div>
          {workspace && workspace.workspace_type === "team" ? (
            <div className="mt-5 space-y-3">
              <SettingsLink
                to={`/workspaces/${workspace.id}/members`}
                title="Workspace members"
                description="View the team roster and your role."
                icon={Users}
              />
              {canManage && (
                <>
                  <SettingsLink
                    to={`/workspaces/${workspace.id}/settings`}
                    title="Workspace details"
                    description="Update the workspace name, description, and logo."
                    icon={Settings2}
                  />
                  <SettingsLink
                    to={`/workspaces/${workspace.id}/invitations`}
                    title="Invitations"
                    description="Send, resend, and revoke workspace invitations."
                    icon={Users}
                  />
                </>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Your personal workspace is private to your account. Use the workspace selector in the
              header to manage a shared workspace.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
