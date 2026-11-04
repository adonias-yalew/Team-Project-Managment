import { afterEach, describe, expect, it, vi } from "vitest";
import { invokeInvitation } from "@/modules/workspaces/workspace-api";

afterEach(() => vi.restoreAllMocks());

describe("workspace invitation function authentication", () => {
  it("sends the current access token as a bearer authorization header", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    const client = {
      auth: {
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session: { access_token: "fresh-token" } }, error: null }),
      },
      functions: { invoke },
    } as never;

    await invokeInvitation(client, { action: "create" });

    expect(invoke).toHaveBeenCalledWith("workspace-invitations", {
      body: { action: "create" },
      headers: { Authorization: "Bearer fresh-token" },
    });
  });

  it("does not invoke the function without an active session", async () => {
    const invoke = vi.fn();
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
      functions: { invoke },
    } as never;
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(invokeInvitation(client, { action: "create" })).rejects.toThrow(
      "Sign in to continue.",
    );
    expect(invoke).not.toHaveBeenCalled();
  });
});
