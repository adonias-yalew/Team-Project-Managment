import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleUserRound,
  Copy,
  ExternalLink,
  LoaderCircle,
  Plus,
  RotateCw,
  Settings2,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/workspace/app-shell";
import { useStore } from "@/lib/store";
import { useAuth } from "@/modules/auth/auth-context";
import type { Database } from "@/integrations/supabase/types";
import {
  changeMemberRole,
  createInvitation,
  createTeamWorkspace,
  deleteTeamWorkspace,
  getPersonalWorkspace,
  getWorkspace,
  listMyInvitations,
  listSharedWorkspaces,
  listWorkspaceInvitations,
  listWorkspaceMembers,
  removeMember,
  respondToEmailInvitation,
  revokeInvitation,
  resendInvitation,
  transferOwnership,
  updateWorkspace,
  uploadWorkspaceLogo,
  type WorkspaceRole,
} from "./workspace-api";
import {
  canAssignOwner,
  canChangeRole,
  canDeleteWorkspace,
  canManageMembers,
  canManageWorkspace,
  canRemoveMember,
} from "./workspace-permissions";
import { Notice } from "./workspace-ui";

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
type Member = Database["public"]["Functions"]["list_workspace_members"]["Returns"][number];
type Invite = Database["public"]["Functions"]["list_workspace_invitations"]["Returns"][number];

const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55";
const secondaryClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55";
const inputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

function PageTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function LoadingState({ label = "Loading workspace…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500"
      role="status"
    >
      <LoaderCircle className="size-5 animate-spin" />
      {label}
    </div>
  );
}

function WorkspaceAvatar({
  workspace,
  size = "md",
}: {
  workspace: Pick<Workspace, "name" | "avatar_url">;
  size?: "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const initials = workspace.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  const dimensions = size === "lg" ? "size-16 rounded-2xl text-xl" : "size-12 rounded-xl text-base";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-blue-50 font-semibold text-blue-900 ring-1 ring-inset ring-blue-100 ${dimensions}`}
    >
      {workspace.avatar_url && !failed ? (
        <img
          src={workspace.avatar_url}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials || <BriefcaseBusiness className="size-5" />
      )}
    </span>
  );
}

function WorkspaceHero({
  workspace,
  role,
  memberCount,
  children,
}: {
  workspace: Workspace;
  role: WorkspaceRole;
  memberCount: number;
  children?: ReactNode;
}) {
  return (
    <section className="relative mb-7 overflow-hidden rounded-2xl bg-slate-900 p-6 text-white sm:p-9">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-28 size-72 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="absolute -right-4 -top-12 size-48 rounded-full border border-white/10"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
        <WorkspaceAvatar workspace={workspace} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
            Shared workspace
          </p>
          <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
            {workspace.name}
          </h1>
          <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-300">
            {workspace.description || "A shared space for your team to stay aligned."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-200">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1">
              <Shield className="size-4 text-blue-200" />
              {role[0]?.toUpperCase()}
              {role.slice(1)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1">
              <Users className="size-4 text-blue-200" />
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </span>
          </div>
        </div>
        {children && <div className="relative flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}

export function MyWorkspacePage() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    void getPersonalWorkspace(user.id)
      .then(setWorkspace)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Personal workspace is unavailable."),
      )
      .finally(() => setLoading(false));
  }, [user]);
  return (
    <AppShell sampleContent={false}>
      <PageTitle
        eyebrow="Personal"
        title="My Workspace"
        subtitle="A private space for your own projects and plans."
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <Notice>{error}</Notice>
      ) : workspace ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <WorkspaceAvatar workspace={workspace} size="lg" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Private workspace
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">{workspace.name}</h2>
              <p className="mt-2 text-sm text-slate-600">
                Only you can access this workspace. Shared workspace membership never grants access
                to your personal space.
              </p>
            </div>
          </div>
          <div className="mt-7 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-600">
              Personal project management will be connected to this workspace in a later phase.
            </p>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

export function SharedWorkspacesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<{ workspace: Workspace; role: WorkspaceRole }[]>([]);
  const [invites, setInvites] = useState<Awaited<ReturnType<typeof listMyInvitations>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    void Promise.all([listSharedWorkspaces(user.id), listMyInvitations()])
      .then(([workspaces, received]) => {
        setItems(workspaces);
        setInvites(received.filter((invite) => invite.status === "pending"));
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Shared workspaces could not be loaded."),
      )
      .finally(() => setLoading(false));
  }, [user]);
  return (
    <AppShell sampleContent={false}>
      <PageTitle
        eyebrow="Collaboration"
        title="Shared Workspaces"
        subtitle="Workspaces you own or have joined. Membership does not automatically grant access to projects."
        action={
          <Link to="/workspaces/new" className={buttonClass}>
            <Plus className="size-4" />
            Create workspace
          </Link>
        }
      />
      {invites.length > 0 && (
        <Link
          to="/invitations"
          className="mb-6 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"
        >
          <span>
            You have {invites.length} pending workspace{" "}
            {invites.length === 1 ? "invitation" : "invitations"}.
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            Review <ArrowRight className="size-4" />
          </span>
        </Link>
      )}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <Notice>{error}</Notice>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Users className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-slate-950">No shared workspaces yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Create a workspace for your team or accept an invitation from a collaborator.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/workspaces/new" className={buttonClass}>
              <Plus className="size-4" />
              Create workspace
            </Link>
            <Link to="/invitations" className={secondaryClass}>
              View invitations
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ workspace, role }) => (
            <Link
              key={workspace.id}
              to={`/workspaces/${workspace.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <WorkspaceAvatar workspace={workspace} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold text-slate-950">
                    {workspace.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
                    {workspace.description || "No description added."}
                  </p>
                </div>
                <ChevronRight className="mt-1 size-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
              </div>
              <span className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                {role}
              </span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export function CreateWorkspacePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (name.trim().length < 1 || name.trim().length > 120) {
      setError("Workspace name must be 1 to 120 characters.");
      return;
    }
    if (description.length > 1000) {
      setError("Description must be 1000 characters or fewer.");
      return;
    }
    setBusy(true);
    try {
      const id = await createTeamWorkspace({
        name: name.trim(),
        description: description.trim(),
        avatarUrl: null,
      });
      if (logoFile) {
        const avatarUrl = await uploadWorkspaceLogo(id, logoFile);
        await updateWorkspace(id, {
          name: name.trim(),
          description: description.trim(),
          avatarUrl,
        });
      }
      navigate(`/workspaces/${id}`, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace could not be created.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppShell sampleContent={false}>
      <Link
        to="/workspaces"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="size-4" />
        Back to shared workspaces
      </Link>
      <PageTitle
        eyebrow="New workspace"
        title="Create a shared workspace"
        subtitle="You’ll become its owner. You can invite teammates after it’s created."
      />
      <form
        onSubmit={submit}
        className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      >
        <Field
          label="Workspace name"
          required
          value={name}
          onChange={setName}
          maxLength={120}
          placeholder="e.g. Community Outreach"
        />
        <Field
          label="Description"
          value={description}
          onChange={setDescription}
          maxLength={1000}
          textarea
          placeholder="What will your team work on here?"
        />
        <LogoFileField file={logoFile} onChange={setLogoFile} />
        {error && <Notice>{error}</Notice>}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <Link to="/workspaces" className={secondaryClass}>
            Cancel
          </Link>
          <button disabled={busy} className={buttonClass}>
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {busy ? "Creating…" : "Create workspace"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function LogoFileField({
  file,
  onChange,
  currentUrl,
  onRemove,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  currentUrl?: string | null;
  onRemove?: () => void;
}) {
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : currentUrl),
    [file, currentUrl],
  );
  useEffect(() => {
    if (!file) return;
    return () => URL.revokeObjectURL(previewUrl!);
  }, [file, previewUrl]);
  return (
    <div className="block space-y-2 text-sm font-medium text-slate-800">
      <label className="block space-y-2">
        Logo image (optional)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => onChange(event.currentTarget.files?.[0] ?? null)}
          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-medium"
        />
      </label>
      <span className="block text-xs font-normal leading-5 text-slate-500">
        Choose a PNG, JPEG, WebP, or GIF image up to 5 MB. A workspace monogram is used if omitted.
      </span>
      {(previewUrl || file) && (
        <div className="flex items-center gap-3">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Workspace logo preview"
              className="size-12 rounded-xl object-cover"
            />
          )}
          {file && (
            <span className="min-w-0 truncate text-xs font-normal text-slate-600">{file.name}</span>
          )}
          {file && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-slate-600 underline"
            >
              Clear selection
            </button>
          )}
          {currentUrl && onRemove && !file && (
            <button type="button" onClick={onRemove} className="text-xs text-rose-700 underline">
              Remove logo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
  textarea = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  textarea?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-800">
      {label}
      {textarea ? (
        <textarea
          required={required}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={4}
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <input
          required={required}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
      {hint && <span className="block text-xs font-normal leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

function useWorkspace(workspaceId: string | undefined) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!workspaceId) {
      setError("Workspace not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [current, memberList] = await Promise.all([
        getWorkspace(workspaceId),
        listWorkspaceMembers(workspaceId),
      ]);
      if (current.workspace_type !== "team") {
        setError("This page is only available for shared workspaces.");
        setWorkspace(null);
      } else {
        setWorkspace(current);
        setMembers(memberList);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { workspace, members, loading, error, reload };
}

export function WorkspaceOverviewPage() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { workspace, members, loading, error } = useWorkspace(workspaceId);
  const myRole = members.find((member) => member.member_user_id === user?.id)?.role ?? "member";
  return (
    <AppShell sampleContent={false}>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <Notice>{error}</Notice>
      ) : workspace ? (
        <>
          <Link
            to="/workspaces"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            All shared workspaces
          </Link>
          <WorkspaceHero workspace={workspace} role={myRole} memberCount={members.length}>
            <Link
              to={`/workspaces/${workspace.id}/members`}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              <Users className="size-4" />
              Members
            </Link>
            {canManageMembers(myRole) && (
              <Link
                to={`/workspaces/${workspace.id}/invitations`}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                <Plus className="size-4" />
                Invitations
              </Link>
            )}
            {canManageWorkspace(myRole) && (
              <Link
                to={`/workspaces/${workspace.id}/settings`}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                <Settings2 className="size-4" />
                Settings
              </Link>
            )}
          </WorkspaceHero>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-950">Workspace overview</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {workspace.description ||
                  "Add a description in workspace settings so members know what this space is for."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to={`/workspaces/${workspace.id}/members`} className={secondaryClass}>
                  View members <ArrowRight className="size-4" />
                </Link>
                {canManageMembers(myRole) && (
                  <Link to={`/workspaces/${workspace.id}/invitations`} className={secondaryClass}>
                    Manage invitations <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Your access
              </p>
              <p className="mt-2 text-xl font-semibold capitalize text-slate-950">{myRole}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Workspace membership organizes people. It does not grant access to projects
                automatically.
              </p>
            </section>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

export function WorkspaceMembersPage() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { workspace, members, loading, error, reload } = useWorkspace(workspaceId);
  const [messageText, setMessageText] = useState("");
  const [busyId, setBusyId] = useState("");
  const [transferTarget, setTransferTarget] = useState("");
  const myMember = members.find((member) => member.member_user_id === user?.id);
  const myRole = myMember?.role ?? "member";
  const ownerCount = members.filter((member) => member.role === "owner").length;
  const otherMembers = members.filter((member) => member.member_user_id !== user?.id);

  async function changeRole(member: Member, role: WorkspaceRole) {
    if (
      !workspace ||
      !canChangeRole(myRole, member.role, role) ||
      member.member_user_id === user?.id
    )
      return;
    setBusyId(member.member_user_id);
    setMessageText("");
    try {
      await changeMemberRole(workspace.id, member.member_user_id, role);
      await reload();
    } catch (cause) {
      setMessageText(cause instanceof Error ? cause.message : "Role could not be changed.");
    } finally {
      setBusyId("");
    }
  }
  async function remove(member: Member, leaving = false) {
    if (!workspace || (!leaving && !canRemoveMember(myRole, member.role, ownerCount))) return;
    if (
      !window.confirm(
        leaving ? `Leave ${workspace.name}?` : `Remove ${member.full_name} from ${workspace.name}?`,
      )
    )
      return;
    setBusyId(member.member_user_id);
    setMessageText("");
    try {
      await removeMember(workspace.id, member.member_user_id);
      if (leaving) window.location.assign("/workspaces");
      else await reload();
    } catch (cause) {
      setMessageText(cause instanceof Error ? cause.message : "Member could not be removed.");
    } finally {
      setBusyId("");
    }
  }
  async function transfer() {
    if (!workspace || !transferTarget) return;
    const target = members.find((member) => member.member_user_id === transferTarget);
    if (
      !target ||
      !window.confirm(`Transfer ownership to ${target.full_name}? You will become an Admin.`)
    )
      return;
    setBusyId("transfer");
    setMessageText("");
    try {
      await transferOwnership(workspace.id, target.member_user_id);
      setTransferTarget("");
      await reload();
    } catch (cause) {
      setMessageText(
        cause instanceof Error ? cause.message : "Ownership could not be transferred.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppShell sampleContent={false}>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <Notice>{error}</Notice>
      ) : workspace ? (
        <>
          <BackToWorkspace workspace={workspace} />
          <PageTitle
            eyebrow="Workspace members"
            title="People"
            subtitle={`${members.length} ${members.length === 1 ? "person has" : "people have"} access to ${workspace.name}.`}
            action={
              canManageMembers(myRole) ? (
                <Link className={buttonClass} to={`/workspaces/${workspace.id}/invitations`}>
                  <Plus className="size-4" />
                  Invite people
                </Link>
              ) : undefined
            }
          />
          {messageText && (
            <div className="mb-5">
              <Notice>{messageText}</Notice>
            </div>
          )}
          {canAssignOwner(myRole) && otherMembers.length > 0 && (
            <section className="mb-5 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label
                  htmlFor="transfer-owner"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Transfer ownership
                </label>
                <select
                  id="transfer-owner"
                  value={transferTarget}
                  onChange={(event) => setTransferTarget(event.currentTarget.value)}
                  className={inputClass}
                >
                  <option value="">Select a member…</option>
                  {otherMembers.map((member) => (
                    <option key={member.member_user_id} value={member.member_user_id}>
                      {member.full_name} ({member.role})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-600">
                  You will remain in the workspace as an Admin.
                </p>
              </div>
              <button
                className={secondaryClass}
                disabled={!transferTarget || busyId === "transfer"}
                onClick={() => void transfer()}
              >
                {busyId === "transfer" ? "Transferring…" : "Transfer ownership"}
              </button>
            </section>
          )}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[minmax(0,1fr)_150px_240px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Member</span>
              <span>Role</span>
              <span className="text-right">Actions</span>
            </div>
            {members.map((member) => {
              const isMe = member.member_user_id === user?.id;
              const canEdit =
                !isMe &&
                canManageMembers(myRole) &&
                (myRole === "owner" || member.role === "member");
              const canRemove = !isMe && canRemoveMember(myRole, member.role, ownerCount);
              return (
                <div
                  key={member.member_user_id}
                  className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-0 md:grid md:grid-cols-[minmax(0,1fr)_150px_240px] md:items-center md:gap-4 md:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                      {member.full_name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0] ?? "")
                        .join("")
                        .toUpperCase() || <CircleUserRound className="size-5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {member.full_name}
                        {isMe && (
                          <span className="ml-2 text-xs font-normal text-slate-500">You</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                    {member.role}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {canEdit && (
                      <select
                        aria-label={`Change ${member.full_name}'s role`}
                        value={member.role}
                        onChange={(event) =>
                          void changeRole(member, event.currentTarget.value as WorkspaceRole)
                        }
                        disabled={busyId === member.member_user_id}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        {canAssignOwner(myRole) && <option value="owner">Owner</option>}
                      </select>
                    )}
                    {canRemove && (
                      <button
                        disabled={busyId === member.member_user_id}
                        onClick={() => void remove(member)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </button>
                    )}
                    {isMe && myRole !== "owner" && (
                      <button
                        disabled={busyId === member.member_user_id}
                        onClick={() => void remove(member, true)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Leave workspace
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </AppShell>
  );
}

function BackToWorkspace({ workspace }: { workspace: Workspace }) {
  return (
    <Link
      to={`/workspaces/${workspace.id}`}
      className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
    >
      <ArrowLeft className="size-4" />
      {workspace.name}
    </Link>
  );
}

function statusStyle(status: string) {
  if (status === "accepted") return "bg-emerald-50 text-emerald-800";
  if (status === "declined" || status === "revoked") return "bg-slate-100 text-slate-600";
  if (status === "expired") return "bg-amber-50 text-amber-800";
  return "bg-blue-50 text-blue-800";
}

function deliveryStatusLabel(status: Invite["delivery_status"]) {
  if (status === "sent") return "accepted by Brevo";
  return status.replaceAll("_", " ");
}

export function WorkspaceInvitationsPage() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { workspace, members, loading, error, reload } = useWorkspace(workspaceId);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [shareable, setShareable] = useState(false);
  const [hours, setHours] = useState(168);
  const [maxUses, setMaxUses] = useState(1);
  const [createdLink, setCreatedLink] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const myRole = members.find((member) => member.member_user_id === user?.id)?.role ?? "member";

  const loadInvitations = useCallback(async () => {
    if (!workspaceId) return;
    setInviteLoading(true);
    setInviteError("");
    try {
      setInvites(await listWorkspaceInvitations(workspaceId));
    } catch (cause) {
      setInviteError(cause instanceof Error ? cause.message : "Invitations could not be loaded.");
    } finally {
      setInviteLoading(false);
    }
  }, [workspaceId]);
  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setCreatedLink("");
    setSuccessMessage("");
    setCopied(false);
    if (!workspaceId) return;
    if (!shareable && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const result = await createInvitation({
        workspaceId,
        email: shareable ? null : email.trim(),
        role,
        expiresInHours: hours,
        maxUses: shareable ? maxUses : 1,
      });
      if (result.link) setCreatedLink(result.link);
      else setSuccessMessage("Invitation email sent through Brevo.");
      setEmail("");
      await loadInvitations();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Invitation could not be created.");
      await loadInvitations();
    } finally {
      setBusy(false);
    }
  }
  async function revoke(invite: Invite) {
    if (!window.confirm("Revoke this invitation? Its link will stop working.")) return;
    setBusy(true);
    setFormError("");
    try {
      await revokeInvitation(invite.id);
      await loadInvitations();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Invitation could not be revoked.");
    } finally {
      setBusy(false);
    }
  }
  async function resend(invite: Invite) {
    setBusy(true);
    setFormError("");
    try {
      await resendInvitation(invite.id);
      setSuccessMessage(
        `A new invitation link was emailed to ${invite.invited_email}. The previous email link has been invalidated.`,
      );
      await loadInvitations();
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : "Invitation email could not be resent.",
      );
      await loadInvitations();
    } finally {
      setBusy(false);
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
    } catch {
      setFormError(
        "Copy was blocked by the browser. Select and copy the invitation link manually.",
      );
    }
  }

  return (
    <AppShell sampleContent={false}>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <Notice>{error}</Notice>
      ) : workspace ? (
        <>
          <BackToWorkspace workspace={workspace} />
          <PageTitle
            eyebrow="Workspace invitations"
            title="Invite people"
            subtitle="Invite by email or create a shareable, usage-limited link."
          />
          {!canManageMembers(myRole) ? (
            <Notice>You need an Owner or Admin role to manage invitations.</Notice>
          ) : (
            <>
              <form
                onSubmit={submit}
                className="mb-8 grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:grid-cols-2"
              >
                <div className="lg:col-span-2">
                  <p className="text-sm font-semibold text-slate-950">New invitation</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Workspace access and the selected role are checked again when an invitation is
                    accepted.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 lg:col-span-2">
                  <input
                    id="shareable-link"
                    type="checkbox"
                    checked={shareable}
                    disabled={role === "owner"}
                    onChange={(event) => setShareable(event.currentTarget.checked)}
                    className="mt-1 size-4 accent-blue-800"
                  />
                  <label htmlFor="shareable-link">
                    <span className="block text-sm font-medium text-slate-900">
                      Create a shareable link
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                      Anyone with the link can sign in and join until it expires or reaches its use
                      limit. Owner invitations always require a specific email.
                    </span>
                  </label>
                </div>
                {!shareable && (
                  <Field
                    label="Invitee email"
                    required
                    value={email}
                    onChange={setEmail}
                    placeholder="teammate@example.com"
                  />
                )}
                <label className="block space-y-2 text-sm font-medium text-slate-800">
                  Workspace role
                  <select
                    value={role}
                    onChange={(event) => {
                      const next = event.currentTarget.value as WorkspaceRole;
                      setRole(next);
                      if (next === "owner") setShareable(false);
                    }}
                    className={inputClass}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    {canAssignOwner(myRole) && <option value="owner">Owner</option>}
                  </select>
                  {role === "owner" && (
                    <span className="block text-xs font-normal text-amber-800">
                      Owner invitations are restricted to a verified email address.
                    </span>
                  )}
                </label>
                <label className="block space-y-2 text-sm font-medium text-slate-800">
                  Link expires
                  <select
                    value={hours}
                    onChange={(event) => setHours(Number(event.currentTarget.value))}
                    className={inputClass}
                  >
                    <option value={24}>In 24 hours</option>
                    <option value={168}>In 7 days</option>
                    <option value={720}>In 30 days</option>
                  </select>
                </label>
                {shareable && (
                  <label className="block space-y-2 text-sm font-medium text-slate-800">
                    Maximum accepted uses
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={maxUses}
                      onChange={(event) => setMaxUses(Number(event.currentTarget.value))}
                      className={inputClass}
                    />
                  </label>
                )}
                <div className="flex items-end lg:justify-end">
                  <button disabled={busy} className={buttonClass}>
                    {busy && <LoaderCircle className="size-4 animate-spin" />}
                    {busy ? (
                      "Creating invitation…"
                    ) : (
                      <>
                        <Plus className="size-4" />
                        {shareable ? "Create shareable link" : "Send email invitation"}
                      </>
                    )}
                  </button>
                </div>
                {formError && (
                  <div className="lg:col-span-2">
                    <Notice>{formError}</Notice>
                  </div>
                )}
                {createdLink && (
                  <div className="lg:col-span-2">
                    <Notice kind="info">
                      <span className="font-semibold">Shareable invitation link created.</span> The
                      raw link is shown only now, and the database stores only its hash.
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          readOnly
                          value={createdLink}
                          aria-label="Created invitation link"
                          className="h-10 min-w-0 flex-1 rounded-md border border-blue-200 bg-white px-3 text-xs text-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => void copyLink()}
                          className={secondaryClass}
                        >
                          <Copy className="size-4" />
                          {copied ? "Copied" : "Copy link"}
                        </button>
                      </div>
                    </Notice>
                  </div>
                )}
                {successMessage && (
                  <div className="lg:col-span-2">
                    <Notice kind="success">{successMessage}</Notice>
                  </div>
                )}
              </form>
              <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950">Invitation history</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Pending and completed invitations for this workspace.
                    </p>
                  </div>
                  <button
                    className={secondaryClass}
                    onClick={() => void loadInvitations()}
                    disabled={inviteLoading}
                  >
                    {inviteLoading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                {inviteError ? (
                  <Notice>{inviteError}</Notice>
                ) : inviteLoading ? (
                  <LoadingState label="Loading invitations…" />
                ) : invites.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                    No invitations have been created for this workspace.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <article
                        key={invite.id}
                        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-950">
                              {invite.invited_email || "Shareable invitation link"}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyle(invite.status)}`}
                            >
                              {invite.status}
                            </span>
                          </div>
                          <p className="mt-1 text-sm capitalize text-slate-600">
                            {invite.intended_role} · {invite.accepted_count}/{invite.max_uses}{" "}
                            accepted · expires {new Date(invite.expires_at).toLocaleDateString()}
                          </p>
                          {invite.invited_email && (
                            <p className="mt-1 text-xs text-slate-500">
                              Email delivery: {deliveryStatusLabel(invite.delivery_status)}
                            </p>
                          )}
                          {invite.declined_count > 0 && (
                            <p className="mt-1 text-xs text-slate-500">
                              {invite.declined_count} declined
                            </p>
                          )}
                        </div>
                        {invite.status === "pending" && (
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {invite.invited_email && (
                              <button
                                disabled={busy}
                                onClick={() => void resend(invite)}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <RotateCw className="size-4" /> Resend email
                              </button>
                            )}
                            <button
                              disabled={busy}
                              onClick={() => void revoke(invite)}
                              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"
                            >
                              <Trash2 className="size-4" />
                              Revoke
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      ) : null}
    </AppShell>
  );
}

export function MyInvitationsPage() {
  const navigate = useNavigate();
  const { refreshWorkspaces, setActiveWorkspaceId } = useStore();
  const [invites, setInvites] = useState<Awaited<ReturnType<typeof listMyInvitations>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setInvites(await listMyInvitations());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invitations could not be loaded.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function respond(id: string, action: "accept" | "decline") {
    setBusyId(id);
    setError("");
    try {
      const workspaceId = await respondToEmailInvitation(id, action);
      if (workspaceId) {
        await refreshWorkspaces().catch(() => undefined);
        setActiveWorkspaceId(workspaceId);
        navigate(`/workspaces/${workspaceId}`, { replace: true });
      } else await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Your invitation response could not be saved.",
      );
    } finally {
      setBusyId("");
    }
  }
  return (
    <AppShell sampleContent={false}>
      <PageTitle
        eyebrow="Invitations"
        title="Invitations to you"
        subtitle="Invitations sent to your verified account email."
      />
      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}
      {loading ? (
        <LoadingState />
      ) : invites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          No email invitations are associated with this account.
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <article
              key={invite.id}
              className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-950">{invite.workspace_name}</p>
                <p className="mt-1 text-sm capitalize text-slate-600">
                  {invite.intended_role} · expires{" "}
                  {new Date(invite.expires_at).toLocaleDateString()}
                </p>
                <span
                  className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyle(invite.status)}`}
                >
                  {invite.status}
                </span>
              </div>
              {invite.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busyId === invite.id}
                    onClick={() => void respond(invite.id, "decline")}
                    className={secondaryClass}
                  >
                    Decline
                  </button>
                  <button
                    disabled={busyId === invite.id}
                    onClick={() => void respond(invite.id, "accept")}
                    className={buttonClass}
                  >
                    {busyId === invite.id ? "Please wait…" : "Accept invitation"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspace, members, loading, error, reload } = useWorkspace(workspaceId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [busy, setBusy] = useState(false);
  const myRole = members.find((member) => member.member_user_id === user?.id)?.role ?? "member";
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description ?? "");
      setAvatarUrl(workspace.avatar_url ?? "");
      setLogoFile(null);
      setRemoveLogo(false);
    }
  }, [workspace]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessageText("");
    if (!workspace) return;
    if (!name.trim() || name.trim().length > 120 || description.length > 1000) {
      setMessageText("Check the workspace name and description length.");
      return;
    }
    setBusy(true);
    try {
      const nextAvatarUrl = logoFile
        ? await uploadWorkspaceLogo(workspace.id, logoFile)
        : removeLogo
          ? null
          : avatarUrl || null;
      await updateWorkspace(workspace.id, {
        name: name.trim(),
        description: description.trim(),
        avatarUrl: nextAvatarUrl,
      });
      setMessageText("Workspace details saved.");
      await reload();
    } catch (cause) {
      setMessageText(
        cause instanceof Error ? cause.message : "Workspace details could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deleteWorkspace() {
    if (!workspace || confirmName !== workspace.name) return;
    if (
      !window.confirm(
        `Permanently delete ${workspace.name} and its membership and invitation records? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setMessageText("");
    try {
      await deleteTeamWorkspace(workspace.id, confirmName);
      navigate("/workspaces", { replace: true });
    } catch (cause) {
      setMessageText(cause instanceof Error ? cause.message : "Workspace could not be deleted.");
      setBusy(false);
    }
  }
  return (
    <AppShell sampleContent={false}>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <Notice>{error}</Notice>
      ) : workspace ? (
        <>
          <BackToWorkspace workspace={workspace} />
          <PageTitle
            eyebrow="Workspace settings"
            title="Workspace details"
            subtitle="Update the name and details members see."
          />
          {!canManageWorkspace(myRole) ? (
            <Notice>You need an Owner or Admin role to edit workspace details.</Notice>
          ) : (
            <>
              <form
                onSubmit={save}
                className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
              >
                <Field
                  label="Workspace name"
                  required
                  value={name}
                  onChange={setName}
                  maxLength={120}
                />
                <Field
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  maxLength={1000}
                  textarea
                />
                <LogoFileField
                  file={logoFile}
                  onChange={(file) => {
                    setLogoFile(file);
                    if (file) setRemoveLogo(false);
                  }}
                  currentUrl={removeLogo ? null : workspace.avatar_url}
                  onRemove={() => {
                    setRemoveLogo(true);
                    setLogoFile(null);
                  }}
                />
                {messageText && (
                  <Notice kind={messageText === "Workspace details saved." ? "success" : "error"}>
                    {messageText}
                  </Notice>
                )}
                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <button className={buttonClass} disabled={busy}>
                    {busy && <LoaderCircle className="size-4 animate-spin" />}
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
              {canDeleteWorkspace(myRole) && (
                <section className="mt-8 max-w-2xl rounded-2xl border border-rose-200 bg-white p-5 sm:p-7">
                  <h2 className="text-lg font-semibold text-rose-900">Delete workspace</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This permanently removes this shared workspace, its memberships, and its
                    invitations. Personal workspaces cannot be deleted here.
                  </p>
                  <label className="mt-4 block space-y-2 text-sm font-medium text-slate-800">
                    Type <span className="font-semibold">{workspace.name}</span> to confirm
                    <input
                      value={confirmName}
                      onChange={(event) => setConfirmName(event.currentTarget.value)}
                      className={inputClass}
                    />
                  </label>
                  <button
                    onClick={() => void deleteWorkspace()}
                    disabled={busy || confirmName !== workspace.name}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Trash2 className="size-4" />
                    Delete workspace
                  </button>
                </section>
              )}
            </>
          )}
        </>
      ) : null}
    </AppShell>
  );
}
