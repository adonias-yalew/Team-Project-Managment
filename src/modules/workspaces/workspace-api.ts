import { getSupabaseClient } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
type Member = Database["public"]["Functions"]["list_workspace_members"]["Returns"][number];
type WorkspaceInvitation =
  Database["public"]["Functions"]["list_workspace_invitations"]["Returns"][number];
type MyInvitation =
  Database["public"]["Functions"]["list_my_workspace_invitations"]["Returns"][number];
export type WorkspaceRole = "owner" | "admin" | "member";

async function client() {
  const supabase = await getSupabaseClient();
  if (!supabase)
    throw new Error("Supabase is not configured. Add the project URL and publishable key.");
  return supabase;
}

export async function invokeInvitation<T>(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>,
  body: Record<string, unknown>,
) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    console.warn("workspace-invitations auth token unavailable", { reason: "session_read_failed" });
    throw new Error("Your session could not be refreshed. Sign in again and retry.");
  }
  if (!session?.access_token) {
    console.warn("workspace-invitations auth token unavailable", { reason: "no_active_session" });
    throw new Error("Sign in to continue.");
  }
  return supabase.functions.invoke<T>("workspace-invitations", {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
}

function message(error: { message: string }): Error {
  const normalized = error.message.toLowerCase();
  if (
    normalized.includes("not found") ||
    normalized.includes("unavailable") ||
    normalized.includes("authorized")
  ) {
    return new Error(
      "You do not have permission to do that, or this workspace is no longer available.",
    );
  }
  if (normalized.includes("already exists"))
    return new Error("A pending invitation already exists for that email.");
  if (normalized.includes("rate limit"))
    return new Error("Too many requests. Wait a little and try again.");
  if (
    normalized.includes("expiration") ||
    normalized.includes("characters") ||
    normalized.includes("valid email")
  ) {
    return new Error(error.message);
  }
  return new Error("We could not complete that workspace request. Please try again.");
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw message(error);
  if (data === null) throw new Error("No workspace data was returned.");
  return data;
}

export async function listSharedWorkspaces(
  userId: string,
): Promise<{ workspace: Workspace; role: WorkspaceRole }[]> {
  const supabase = await client();
  const [workspaces, memberships] = await Promise.all([
    supabase
      .from("workspaces")
      .select("*")
      .eq("workspace_type", "team")
      .order("created_at", { ascending: false }),
    supabase.from("workspace_members").select("workspace_id, role").eq("user_id", userId),
  ]);
  const rows = unwrap(workspaces.data, workspaces.error);
  const memberRows = unwrap(memberships.data, memberships.error);
  const roleById = new Map(
    memberRows.map((membership) => [membership.workspace_id, membership.role]),
  );
  return rows.flatMap((workspace) => {
    const role = roleById.get(workspace.id);
    return role ? [{ workspace, role }] : [];
  });
}

export async function getPersonalWorkspace(userId: string): Promise<Workspace> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("workspace_type", "personal")
    .eq("created_by", userId)
    .single();
  return unwrap(data, error);
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();
  return unwrap(data, error);
}

export async function createTeamWorkspace(input: {
  name: string;
  description: string;
  avatarUrl: string | null;
}): Promise<string> {
  const supabase = await client();
  const { data, error } = await supabase.rpc("create_team_workspace", {
    p_name: input.name,
    p_description: input.description || null,
    p_avatar_url: input.avatarUrl,
  });
  return unwrap(data, error);
}

export async function uploadWorkspaceLogo(workspaceId: string, file: File): Promise<string> {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) throw new Error("Choose a PNG, JPEG, WebP, or GIF image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Workspace logos must be 5 MB or smaller.");
  const supabase = await client();
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${workspaceId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("workspace-logos").upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error("Logo upload failed. Check your connection and try again.");
  return supabase.storage.from("workspace-logos").getPublicUrl(path).data.publicUrl;
}

export async function updateWorkspace(
  workspaceId: string,
  input: { name: string; description: string; avatarUrl: string | null },
): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("workspaces")
    .update({
      name: input.name,
      description: input.description || null,
      avatar_url: input.avatarUrl,
    })
    .eq("id", workspaceId)
    .select("id")
    .single();
  unwrap(data, error);
}

export async function listWorkspaceMembers(workspaceId: string): Promise<Member[]> {
  const supabase = await client();
  const { data, error } = await supabase.rpc("list_workspace_members", {
    p_workspace_id: workspaceId,
  });
  return unwrap(data, error);
}

export async function changeMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc("change_workspace_member_role", {
    p_workspace_id: workspaceId,
    p_target_user_id: userId,
    p_new_role: role,
  });
  if (error) throw message(error);
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc("remove_workspace_member", {
    p_workspace_id: workspaceId,
    p_target_user_id: userId,
  });
  if (error) throw message(error);
}

export async function transferOwnership(workspaceId: string, userId: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc("transfer_workspace_ownership", {
    p_workspace_id: workspaceId,
    p_new_owner_user_id: userId,
  });
  if (error) throw message(error);
}

export async function deleteTeamWorkspace(
  workspaceId: string,
  confirmationName: string,
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc("delete_team_workspace", {
    p_workspace_id: workspaceId,
    p_confirmation_name: confirmationName,
  });
  if (error) throw message(error);
}

export async function listWorkspaceInvitations(
  workspaceId: string,
): Promise<WorkspaceInvitation[]> {
  const supabase = await client();
  const { data, error } = await supabase.rpc("list_workspace_invitations", {
    p_workspace_id: workspaceId,
  });
  return unwrap(data, error);
}

export async function listMyInvitations(): Promise<MyInvitation[]> {
  const supabase = await client();
  const { data, error } = await supabase.rpc("list_my_workspace_invitations");
  return unwrap(data, error);
}

export interface CreatedInvitation {
  invitationId: string;
  link: string | null;
  delivery: "sent" | "not_applicable";
}

export async function createInvitation(input: {
  workspaceId: string;
  email: string | null;
  role: WorkspaceRole;
  expiresInHours: number;
  maxUses: number;
}): Promise<CreatedInvitation> {
  const supabase = await client();
  const { data, error } = await invokeInvitation<CreatedInvitation>(supabase, {
    action: "create",
    workspaceId: input.workspaceId,
    email: input.email,
    role: input.role,
    expiresInHours: input.expiresInHours,
    maxUses: input.maxUses,
  });
  if (error) {
    let detail = error.message;
    if ("context" in error && error.context instanceof Response) {
      const payload = await error.context
        .clone()
        .json()
        .catch(() => null);
      if (payload && typeof payload.error === "string") detail = payload.error;
    }
    throw new Error(detail || "Invitation service did not complete the request.");
  }
  if (!data) throw new Error("Invitation service did not return a result.");
  return data;
}

export interface InvitationPreview {
  invitation_id: string;
  workspace_id: string;
  workspace_name: string;
  description: string | null;
  avatar_url: string | null;
  intended_role: WorkspaceRole;
  expires_at: string;
  remaining_uses: number;
}

type InvitationFunctionResponse = {
  error?: string;
  invitation?: InvitationPreview;
  workspaceId?: string;
  ok?: true;
};

export async function invitationErrorMessage(cause: unknown, fallback: string): Promise<string> {
  if (
    cause &&
    typeof cause === "object" &&
    "context" in cause &&
    cause.context instanceof Response
  ) {
    const payload = await cause.context
      .clone()
      .json()
      .catch(() => null);
    if (payload && typeof payload.error === "string") return payload.error;
  }
  if (
    cause &&
    typeof cause === "object" &&
    "message" in cause &&
    typeof cause.message === "string"
  ) {
    return cause.message === "Edge Function returned a non-2xx status code"
      ? fallback
      : cause.message;
  }
  return fallback;
}

export async function invitationAction(
  action: "preview" | "accept" | "decline",
  token: string,
): Promise<InvitationPreview | { workspaceId: string } | { ok: true }> {
  const supabase = await client();
  const { data, error } = await invokeInvitation<InvitationFunctionResponse>(supabase, {
    action,
    token,
  });
  if (error)
    throw new Error(await invitationErrorMessage(error, "Invitation service is unavailable."));
  if (!data) throw new Error("Invitation service is unavailable.");
  if (data.error) throw new Error(data.error as string);
  if (action === "preview") return data.invitation as InvitationPreview;
  return data as { workspaceId: string } | { ok: true };
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await invokeInvitation<InvitationFunctionResponse>(supabase, {
    action: "revoke",
    invitationId,
  });
  if (error)
    throw new Error(await invitationErrorMessage(error, "The invitation could not be revoked."));
  if (data?.error) throw new Error(data.error);
}

export async function resendInvitation(invitationId: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await invokeInvitation<InvitationFunctionResponse>(supabase, {
    action: "resend",
    invitationId,
  });
  if (error)
    throw new Error(
      await invitationErrorMessage(error, "The invitation email could not be resent."),
    );
  if (data?.error) throw new Error(data.error);
}

export async function respondToEmailInvitation(
  invitationId: string,
  response: "accept" | "decline",
): Promise<string | null> {
  const supabase = await client();
  const { data, error } = await invokeInvitation<InvitationFunctionResponse>(supabase, {
    action: response === "accept" ? "accept_email" : "decline_email",
    invitationId,
  });
  if (error)
    throw new Error(await invitationErrorMessage(error, "The invitation could not be updated."));
  if (data?.error) throw new Error(data.error);
  return typeof data?.workspaceId === "string" ? data.workspaceId : null;
}
