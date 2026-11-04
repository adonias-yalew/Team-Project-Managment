import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, LoaderCircle, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/workspace/app-shell";
import { invitationAction, type InvitationPreview } from "@/modules/workspaces/workspace-api";
import { Notice } from "@/modules/workspaces/workspace-ui";

const actionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-55";
const mutedClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-55";

export function InvitationAcceptPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get("token") ?? "";
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) window.history.replaceState(window.history.state, "", location.pathname);
    if (!token) {
      setError("This invitation link is missing its token.");
      setLoading(false);
      return;
    }
    void invitationAction("preview", token)
      .then((result) => setInvitation(result as InvitationPreview))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "This invitation is unavailable."),
      )
      .finally(() => setLoading(false));
  }, [token, location.pathname]);

  async function respond(action: "accept" | "decline") {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const result = await invitationAction(action, token);
      if (action === "accept" && "workspaceId" in result)
        navigate(`/workspaces/${result.workspaceId}`, { replace: true });
      else navigate("/workspaces", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your response could not be saved.");
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
        Shared workspaces
      </Link>
      <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-900 px-6 py-7 text-white sm:px-9">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">
            Workspace invitation
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Review your invitation</h1>
          <p className="mt-2 text-sm text-slate-300">
            Confirm the workspace and role before joining.
          </p>
        </div>
        <div className="space-y-5 p-6 sm:p-9">
          {loading ? (
            <p className="flex items-center gap-3 py-6 text-sm text-slate-600" role="status">
              <LoaderCircle className="size-5 animate-spin" />
              Checking invitation…
            </p>
          ) : error && !invitation ? (
            <Notice>{error}</Notice>
          ) : invitation ? (
            <>
              {error && <Notice>{error}</Notice>}
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-900">
                  <Users className="size-6" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {invitation.workspace_name}
                  </h2>
                  {invitation.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {invitation.description}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-slate-700">
                    You’ll join as{" "}
                    <strong className="capitalize">{invitation.intended_role}</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                <p>
                  Workspace membership lets you participate in this shared space. It does not
                  automatically grant access to its projects.
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Expires {new Date(invitation.expires_at).toLocaleString()} ·{" "}
                {invitation.remaining_uses}{" "}
                {invitation.remaining_uses === 1 ? "acceptance" : "acceptances"} remaining
              </p>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  disabled={busy}
                  onClick={() => void respond("decline")}
                  className={mutedClass}
                >
                  Decline
                </button>
                <button
                  disabled={busy}
                  onClick={() => void respond("accept")}
                  className={actionClass}
                >
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {busy ? "Saving…" : "Accept invitation"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
