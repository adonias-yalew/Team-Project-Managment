function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendBrevoInvitation(input: {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  to: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  expiresAt: string;
  link: string;
}): Promise<boolean> {
  const workspace = escapeHtml(input.workspaceName);
  const inviter = escapeHtml(input.inviterName);
  const role = escapeHtml(input.role);
  const expires = escapeHtml(
    new Date(input.expiresAt).toISOString().slice(0, 16).replace("T", " ") + " UTC",
  );
  const safeLink = escapeHtml(input.link);
  const subjectWorkspace = input.workspaceName.replace(/[\r\n]+/g, " ").slice(0, 120);
  const textContent = `${input.inviterName} invited you to join ${input.workspaceName} on Flowtask as ${input.role}. Accept your invitation: ${input.link}\nThis invitation expires ${expires}.`;
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": input.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: input.senderName, email: input.senderEmail },
        to: [{ email: input.to }],
        subject: `You're invited to join ${subjectWorkspace} on Flowtask`,
        textContent,
        htmlContent: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a"><p>${inviter} invited you to join</p><h1>${workspace}</h1><p>Your role will be <strong>${role}</strong>.</p><p><a href="${safeLink}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Accept invitation</a></p><p>This invitation expires ${expires}. Sign in with the email address this invitation was sent to.</p><p style="font-size:12px;color:#64748b">If you were not expecting this invitation, you can ignore this email.</p></div>`,
      }),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    return response.status === 201;
  } catch {
    return false;
  }
}
