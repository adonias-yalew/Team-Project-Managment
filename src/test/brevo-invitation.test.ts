import { afterEach, describe, expect, it, vi } from "vitest";
import { sendBrevoInvitation } from "../../supabase/functions/workspace-invitations/brevo";

const sampleInvite = {
  apiKey: "test-api-key",
  senderEmail: "no-reply@example.test",
  senderName: "Flowtask",
  to: "teammate@example.test",
  workspaceName: "Research & Planning",
  inviterName: "A Workspace Owner",
  role: "member",
  expiresAt: "2026-12-01T10:00:00.000Z",
  link: "https://flowtask.example.test/invitations/accept?token=opaque-token",
};

afterEach(() => vi.unstubAllGlobals());

describe("Brevo workspace invitation sender", () => {
  it("sends the invitation through the transactional API with escaped HTML", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 201 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendBrevoInvitation(sampleInvite)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "api-key": "test-api-key" }),
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body));
    expect(payload.sender).toEqual({ email: sampleInvite.senderEmail, name: "Flowtask" });
    expect(payload.to).toEqual([{ email: sampleInvite.to }]);
    expect(payload.htmlContent).toContain("Research &amp; Planning");
    expect(payload.htmlContent).toContain(sampleInvite.link);
  });

  it("reports failure unless Brevo returns its documented 201 success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 500 }));
    await expect(sendBrevoInvitation(sampleInvite)).resolves.toBe(false);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failure")));
    await expect(sendBrevoInvitation(sampleInvite)).resolves.toBe(false);
  });
});
