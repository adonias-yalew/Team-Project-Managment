import { describe, expect, it } from "vitest";
import type { AuthError } from "@supabase/supabase-js";
import { safeAuthError } from "@/modules/auth/auth-context";
import { safeReturnTo } from "@/modules/auth/require-auth";
import { isStrongPassword } from "@/modules/auth/password-validation";

describe("auth security boundaries", () => {
  it("accepts only local absolute return paths", () => {
    expect(safeReturnTo("/projects?view=list")).toBe("/projects?view=list");
    expect(safeReturnTo("https://evil.example")).toBe("/");
    expect(safeReturnTo("//evil.example/path")).toBe("/");
    expect(safeReturnTo("/\\evil.example")).toBe("/");
    expect(safeReturnTo(undefined)).toBe("/");
  });

  it("returns safe authentication messages", () => {
    expect(safeAuthError({ status: 429, message: "too many requests" } as AuthError)).toContain(
      "Too many attempts",
    );
    expect(safeAuthError({ status: 400, message: "Invalid login credentials" } as AuthError)).toBe(
      "Email or password is incorrect.",
    );
    expect(
      safeAuthError({ status: 400, message: "unexpected internal detail" } as AuthError),
    ).not.toContain("internal detail");
  });

  it("enforces the sign-up password rules", () => {
    expect(isStrongPassword("Abcdef1!")).toBe(true);
    expect(isStrongPassword("abcdef1!")).toBe(false);
    expect(isStrongPassword("ABCDEFG1!")).toBe(false);
    expect(isStrongPassword("Abcdefgh!")).toBe(false);
    expect(isStrongPassword("Abcdef12")).toBe(false);
    expect(isStrongPassword("Abcdef1")).toBe(false);
    expect(isStrongPassword("Abcdef123".repeat(9))).toBe(false);
  });
});
