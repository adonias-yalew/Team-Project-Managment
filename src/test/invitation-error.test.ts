import { describe, expect, it } from "vitest";
import { invitationErrorMessage } from "@/modules/workspaces/workspace-api";
import { makeInviteUrl } from "../../supabase/functions/workspace-invitations/invite-url";

describe("workspace invitation errors", () => {
  it("builds a clickable link on the configured production app origin", () => {
    expect(makeInviteUrl("https://flowtask.example/app/", "token-value")).toBe(
      "https://flowtask.example/invitations/accept?token=token-value",
    );
  });

  it("rejects a non-HTTPS public invitation origin", () => {
    expect(makeInviteUrl("http://flowtask.example", "token-value")).toBeNull();
  });

  it("preserves the server explanation for a rejected invitation", async () => {
    const error = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: new Response(JSON.stringify({ error: "This invitation is expired." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    });
    await expect(invitationErrorMessage(error, "Invitation unavailable.")).resolves.toBe(
      "This invitation is expired.",
    );
  });

  it("uses a clear fallback when the function response has no useful body", async () => {
    await expect(
      invitationErrorMessage(
        new Error("Edge Function returned a non-2xx status code"),
        "Invitation unavailable.",
      ),
    ).resolves.toBe("Invitation unavailable.");
  });
});
