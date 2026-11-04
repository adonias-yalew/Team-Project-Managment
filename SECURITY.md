# Workspace and authentication security notes

## Database authorization

See `supabase/migrations/20261103000100_secure_foundation.sql` for the complete grants and RLS policies. RLS is enabled for profiles, workspaces, workspace members, and workspace invitations. A user's personal workspace is not public or discoverable; access is through its owner membership. Workspace membership is independent of project permissions. Projects and project-level authorization are not yet implemented.

Frontend code may read only the Supabase URL and publishable/anon key. Nothing under `src/` may import or load `.env.server.local`. Service-role/secret-key operations run only in a Supabase Edge Function or trusted backend API route; never in React code or a Vite-bundled module. `.env.server.local` is explicitly Git-ignored.

Workspace membership has no direct client write privileges. Phase 2 exposes narrow RPCs for workspace creation, role changes, removal, ownership transfer, and deletion. Invitation lifecycle operations use `supabase/functions/workspace-invitations`; its service-role key is read only in the Edge Function. The Edge Function sends email invitations through Brevo's transactional API after checking the verified caller and workspace permissions. The browser receives no raw token for email invitations; the database stores only a SHA-256 token hash. Never store or log a raw token.

Invitations are limited to 30 days. Email-bound invites are single-use and require a confirmed matching email. Share links are limited to 1–100 acceptances. The Edge Function applies per-user request limits; the database also caps creation at 20 per hour. Workspace membership and invitation authorization are checked in SQL, not trusted from route state or browser role flags. Email delivery status is set to `sent` only after Brevo returns HTTP 201, and to `failed` when sending is not confirmed. A provider acceptance is not proof of inbox delivery; monitor Brevo transactional logs and bounces.

Supabase Auth mail is a separate path: configure Supabase Custom SMTP with Brevo's SMTP login and SMTP key. Do not use the Brevo API key as the SMTP password. Auth confirmations, recovery, and secure email-change confirmations continue through Supabase Auth; do not generate application-owned Auth tokens. Disable link tracking/rewriting for Auth email templates.

The Auth insert trigger is security-definer because it must atomically initialize records across protected tables. It uses a fixed search path, takes the new ID only from the trusted `auth.users` row, does not grant clients execute permission, and raises on failure so the Auth insert rolls back. Two private membership helpers are narrowly security-definer to avoid recursive RLS.

## Test coverage

Run `npx supabase db reset` against the local Supabase stack, then `npx supabase test db` to run the SQL tests in `supabase/tests/database`. Authentication forms also validate inputs client-side, but Supabase remains responsible for credential security and server-side Auth limits.

No hosted Supabase project credentials are present in this repository, so hosted authorization checks are not run from this workspace. Never report local SQL tests as passed unless the local Supabase suite actually completes.

## Dashboard checklist

- Configure Supabase Auth Custom SMTP with Brevo SMTP credentials; keep confirmation and secure email-change settings enabled and preserve Supabase's `ConfirmationURL` templates.
- Set Edge Function secrets `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME=Flowtask`, and `APP_BASE_URL` in the Supabase Dashboard. The API key is for the Edge Function only; Auth SMTP uses a separate Brevo SMTP key/login.
- Restrict Auth Site URL and redirect allow-list to the app's real domains plus required local development URLs.
- Review Supabase Auth rate limits and email limits for the project's plan and traffic.
- CAPTCHA/Turnstile token collection is not wired into these forms. Add the provider widget and pass tokens into Auth requests before requiring CAPTCHA in Supabase; otherwise Auth requests may be rejected.
- Set the server-side Auth minimum password length to at least 8 characters and enable leaked-password protection where available; frontend validation alone is not an enforcement boundary.
- The sign-up/reset forms additionally require uppercase, lowercase, number, and symbol characters. These character-mix checks run in the browser and are not enforced for callers using Supabase Auth directly.
- Keep service-role and secret keys exclusively in trusted server environments; frontend gets only publishable/anon keys.
- Review backups, database access, and production migration process before launch.
- Before hosted rollout, review and apply the additive Phase 2 migration and deploy the `workspace-invitations` Edge Function. Supabase injects service credentials into the Edge Function runtime; do not add them to any `VITE_` variable or import `.env.server.local` from `src/`.

CAPTCHA and custom endpoint rate limiting are not active features.
