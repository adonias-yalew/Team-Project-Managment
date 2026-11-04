import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBrevoInvitation } from "./brevo.ts";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

type Action =
  "create" | "preview" | "accept" | "decline" | "accept_email" | "decline_email" | "revoke";
type Body = {
  action?: Action;
  workspaceId?: string;
  invitationId?: string;
  email?: string | null;
  role?: "owner" | "admin" | "member";
  expiresInHours?: number;
  maxUses?: number;
  token?: string;
};

const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

function logAuthFailure(reason: string, details: Record<string, string | number | undefined> = {}) {
  console.warn("workspace-invitations authentication failed", { reason, ...details });
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function makeInviteUrl(token: string): string | null {
  const configured = Deno.env.get("APP_BASE_URL");
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1")
      return null;
    url.pathname = "/invitations/accept";
    url.search = "?token=" + encodeURIComponent(token);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond(405, { error: "Method not allowed." });

  const authorization = request.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!authorization) {
    logAuthFailure("authorization_header_missing");
    return respond(401, { error: "Sign in to continue." });
  }
  if (!bearerMatch) {
    logAuthFailure("authorization_header_malformed");
    return respond(401, { error: "Sign in to continue." });
  }
  const accessToken = bearerMatch[1];

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error("workspace-invitations runtime configuration missing", {
      missing: [
        !supabaseUrl ? "SUPABASE_URL" : null,
        !anonKey ? "SUPABASE_ANON_KEY" : null,
        !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
      ].filter(Boolean),
    });
    return respond(503, { error: "Invitation service is not configured." });
  }

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { authorization } } });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(accessToken);
  if (authError) {
    logAuthFailure("supabase_rejected_access_token", {
      status: authError.status,
      code: authError.code,
      errorType: authError.name,
    });
    return respond(401, { error: "Your session is invalid or expired. Sign in again." });
  }
  if (!user) {
    logAuthFailure("supabase_returned_no_user");
    return respond(401, { error: "Your session is invalid or expired. Sign in again." });
  }
  if (!user.email) {
    logAuthFailure("authenticated_user_has_no_email");
    return respond(401, { error: "Your session is invalid or expired. Sign in again." });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return respond(400, { error: "Invalid request." });
  }
  const action = body.action;
  if (
    !action ||
    !["create", "preview", "accept", "decline", "accept_email", "decline_email", "revoke"].includes(
      action,
    )
  ) {
    return respond(400, { error: "Invalid request." });
  }

  const rateAction =
    action === "accept_email" ? "accept" : action === "decline_email" ? "decline" : action;
  const { data: allowed, error: rateError } = await adminClient.rpc(
    "_consume_workspace_invitation",
    {
      p_user_id: user.id,
      p_action: rateAction,
    },
  );
  if (rateError || !allowed)
    return respond(429, { error: "Too many invitation requests. Try again shortly." });

  if (action === "revoke") {
    if (!body.invitationId) return respond(400, { error: "Choose an invitation to revoke." });
    const { error } = await userClient.rpc("revoke_workspace_invitation", {
      p_invitation_id: body.invitationId,
    });
    return error
      ? respond(400, { error: "The invitation could not be revoked." })
      : respond(200, { ok: true });
  }

  if (action === "create") {
    if (!body.workspaceId || !body.role || !["owner", "admin", "member"].includes(body.role)) {
      return respond(400, { error: "Workspace and role are required." });
    }
    const email = body.email?.trim().toLowerCase() || null;
    if (!user.email_confirmed_at)
      return respond(403, { error: "Verify your email address before inviting people." });
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320)) {
      return respond(400, { error: "Enter a valid email address." });
    }
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME");
    if (
      email &&
      (!brevoApiKey ||
        !senderEmail ||
        !senderName ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail) ||
        senderName.length > 100 ||
        /[\r\n]/.test(senderName))
    ) {
      return respond(503, { error: "Brevo invitation email is not configured." });
    }
    if (body.role === "owner" && !email)
      return respond(400, { error: "Owner invitations must be bound to a specific email." });
    const hours = Number.isInteger(body.expiresInHours) ? body.expiresInHours! : 168;
    if (hours < 1 || hours > 720)
      return respond(400, { error: "Choose an expiration between 1 hour and 30 days." });
    const maxUses = email ? 1 : Number.isInteger(body.maxUses) ? body.maxUses! : 1;
    if (maxUses < 1 || maxUses > 100)
      return respond(400, { error: "Link use limit must be between 1 and 100." });
    const rawToken = createToken();
    const link = makeInviteUrl(rawToken);
    if (!link)
      return respond(503, { error: "Invitation links are not configured for this deployment." });

    const { data: invitationId, error } = await adminClient.rpc("_create_workspace_invitation", {
      p_actor_id: user.id,
      p_workspace_id: body.workspaceId,
      p_invited_email: email,
      p_role: body.role,
      p_token_hash: await hashToken(rawToken),
      p_expires_at: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      p_max_uses: maxUses,
    });
    if (error || !invitationId)
      return respond(400, {
        error: "You cannot create this invitation. Check your role and invitation details.",
      });
    if (!email) return respond(200, { invitationId, link, delivery: "not_applicable" });

    const { data: detailRows, error: detailError } = await adminClient.rpc(
      "_get_workspace_invitation_email_details",
      { p_invitation_id: invitationId, p_actor_id: user.id },
    );
    const details = detailRows?.[0];
    if (detailError || !details || !link) {
      const { data: markedFailed, error: markError } = await adminClient.rpc(
        "_set_workspace_invitation_delivery_status",
        {
          p_invitation_id: invitationId,
          p_status: "failed",
        },
      );
      return respond(502, {
        error:
          markError || !markedFailed
            ? "The invitation email could not be sent and its delivery status could not be saved. Refresh invitation history before retrying."
            : "The invitation was created, but its email could not be sent. It is marked as failed; check history before trying again.",
      });
    }

    const delivered = await sendBrevoInvitation({
      apiKey: brevoApiKey!,
      senderEmail: senderEmail!,
      senderName: senderName!,
      to: details.invitee_email,
      workspaceName: details.workspace_name,
      inviterName: details.inviter_name,
      role: details.intended_role,
      expiresAt: details.expires_at,
      link,
    });
    if (!delivered) {
      const { data: markedFailed, error: markError } = await adminClient.rpc(
        "_set_workspace_invitation_delivery_status",
        {
          p_invitation_id: invitationId,
          p_status: "failed",
        },
      );
      return respond(502, {
        error:
          markError || !markedFailed
            ? "Brevo did not confirm the email, and its delivery status could not be saved. Refresh invitation history before retrying."
            : "Brevo did not confirm the email. The invitation is marked as failed; check history before retrying.",
      });
    }

    const { data: markedSent, error: statusError } = await adminClient.rpc(
      "_set_workspace_invitation_delivery_status",
      { p_invitation_id: invitationId, p_status: "sent" },
    );
    if (statusError || !markedSent) {
      return respond(502, {
        error:
          "Brevo accepted the message, but delivery status could not be saved. Refresh invitation history before retrying.",
      });
    }
    return respond(200, { invitationId, link: null, delivery: "sent" });
  }

  if (action === "accept_email" || action === "decline_email") {
    if (!body.invitationId) return respond(400, { error: "Choose an invitation to respond to." });
    if (!user.email_confirmed_at)
      return respond(403, {
        error: "Verify your email address before responding to an invitation.",
      });
    const response = action === "accept_email" ? "accepted" : "declined";
    const { data: workspaceId, error } = await adminClient.rpc(
      "_respond_to_email_workspace_invitation",
      {
        p_invitation_id: body.invitationId,
        p_user_id: user.id,
        p_user_email: user.email,
        p_response: response,
      },
    );
    return error
      ? respond(400, {
          error: "This invitation is invalid, expired, revoked, or has already been answered.",
        })
      : respond(200, action === "accept_email" ? { workspaceId } : { ok: true });
  }

  if (
    (action === "preview" || action === "accept" || action === "decline") &&
    !user.email_confirmed_at
  ) {
    return respond(403, {
      error: "Verify your email address before responding to a workspace invitation.",
    });
  }

  if (!body.token || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) {
    return respond(400, { error: "This invitation is invalid or unavailable." });
  }
  const token_hash = await hashToken(body.token);
  if (action === "preview") {
    const { data, error } = await adminClient.rpc("_preview_workspace_invitation", {
      p_token_hash: token_hash,
      p_user_id: user.id,
      p_user_email: user.email,
    });
    if (error || !data?.length)
      return respond(404, {
        error: "This invitation is invalid, expired, revoked, or intended for another email.",
      });
    return respond(200, { invitation: data[0] });
  }
  if (action === "accept") {
    const { data: workspaceId, error } = await adminClient.rpc("_accept_workspace_invitation", {
      p_token_hash: token_hash,
      p_user_id: user.id,
      p_user_email: user.email,
    });
    return error || !workspaceId
      ? respond(400, {
          error: "This invitation is invalid, expired, revoked, or has already been used.",
        })
      : respond(200, { workspaceId });
  }
  const { error } = await adminClient.rpc("_decline_workspace_invitation", {
    p_token_hash: token_hash,
    p_user_id: user.id,
    p_user_email: user.email,
  });
  return error
    ? respond(400, { error: "This invitation is invalid or unavailable." })
    : respond(200, { ok: true });
});
