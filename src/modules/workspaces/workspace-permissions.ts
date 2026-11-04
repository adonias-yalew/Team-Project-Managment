import type { WorkspaceRole } from "./workspace-api";

export const canManageWorkspace = (role: WorkspaceRole) => role === "owner" || role === "admin";
export const canManageMembers = (role: WorkspaceRole) => role === "owner" || role === "admin";
export const canAssignOwner = (role: WorkspaceRole) => role === "owner";
export const canDeleteWorkspace = (role: WorkspaceRole) => role === "owner";

export function canChangeRole(
  actor: WorkspaceRole,
  target: WorkspaceRole,
  next: WorkspaceRole,
): boolean {
  if (actor === "owner") return target !== "owner" || next === "owner";
  return actor === "admin" && target === "member" && next !== "owner";
}

export function canRemoveMember(
  actor: WorkspaceRole,
  target: WorkspaceRole,
  ownerCount: number,
): boolean {
  if (target === "owner" && ownerCount <= 1) return false;
  if (actor === "owner") return true;
  return actor === "admin" && target === "member";
}
