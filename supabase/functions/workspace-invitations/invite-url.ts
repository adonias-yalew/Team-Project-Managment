export function makeInviteUrl(configured: string | undefined, token: string): string | null {
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return null;
    }
    url.pathname = "/invitations/accept";
    url.search = `?token=${encodeURIComponent(token)}`;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
