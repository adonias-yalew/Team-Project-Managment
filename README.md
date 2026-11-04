# Workspace

A React, TypeScript, and Vite workspace dashboard with Supabase Auth and a PostgreSQL privacy foundation. React Router remains the application router. The current task, planner, project, learning, review, and analytics screens use shared in-memory sample data; they are not connected to user-specific database records yet.

## Local development

Requirements: Node.js 20.19+ or 22.12+, npm, and Docker for Supabase local development.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Set `.env.local` using the local Supabase values described below. The dashboard routes require an authenticated user. Without configuration, the login page explains which environment values are missing. Frontend code may use only the publishable/anon key; `.env.server.local` must never be imported or loaded from `src/`. Service-role/secret operations belong only in Supabase Edge Functions or a trusted backend API route.

## Supabase setup

1. Install the Supabase CLI using its official installation instructions and start Docker.
2. Run `npx supabase start` from the repository root. Record the local API URL and publishable/anon key printed by the CLI.
3. Set `VITE_SUPABASE_URL` to the local API URL and `VITE_SUPABASE_PUBLISHABLE_KEY` to the local publishable key in `.env.local`. `VITE_SUPABASE_ANON_KEY` is supported as a compatibility fallback.
4. Run `npx supabase db reset` to apply migrations, then `npx supabase test db` to execute the RLS tests.
5. For a hosted project, link the project with the CLI, review the pending migration, then use `npx supabase db push`. Never put a service-role or secret key in a `VITE_` variable.

Email confirmations are enabled in `supabase/config.toml`. For hosted projects, configure the SMTP provider, site URL, and allowed redirect URLs in Supabase Auth URL configuration. Allow the app's `/` confirmation redirect and `/reset-password` recovery redirect for each environment.

## Database and authentication

The migrations in `supabase/migrations` create profiles, workspaces, memberships, invitations, RLS policies, and an Auth user trigger. Phase 1 creates the profile and one private personal workspace with an owner membership in the same transaction and backfills existing users. Phase 2 is additive: it adds team workspace details, member/role operations, invitation responses, and trusted invitation endpoints. Auth owns password handling, sessions, verification, recovery, and password hashing.

The typed client is in `src/integrations/supabase`; the Auth provider and pages are in `src/modules/auth`. `Database` types are maintained alongside the schema. Update these types whenever a migration changes the schema.

## Security architecture and policies

- RLS is enabled on every Phase 1 application table.
- Profiles can be read and updated only by their owner. SQL column grants exclude the profile ID and timestamps.
- Workspace reads require an explicit membership. Personal workspaces are created with a single owner membership; there is no public discovery policy.
- Team workspace name/slug updates require an owner or admin membership. Membership rows are readable only by their members; the browser has no membership write grants.
- Invitation token hashes are never exposed to clients. Workspace mutations use narrowly scoped RPCs; invite creation, token preview, and token acceptance/decline run in `supabase/functions/workspace-invitations` using the service role only on the server. The function verifies the caller's session and confirmed email before accepting an email-bound invite.
- Owners can manage all workspace roles and transfer ownership. Admins can manage ordinary members and invite member/admin roles, but cannot assign or remove owners. Members can view the roster and leave. The final owner cannot leave or be removed until ownership is transferred.
- Invitations expire within 30 days. Email-bound links are single-use; share links have an owner-selected limit of 1–100 uses. Links use 256-bit random tokens, store only SHA-256 hashes, and are limited to 5 creates per minute and 20 preview/response requests per minute per account, plus a 20-per-hour creation cap. Managers can revoke pending invitations.
- Workspace invitations are sent by the `workspace-invitations` Edge Function through Brevo's transactional email API. Email links are single-use, bound to the invited address, and stored in the database only as hashes. It records `sent` only after Brevo returns HTTP 201 and that status persists in the database; non-201/network failures return an error and attempt to mark the invite `failed`. A Brevo API acceptance does not guarantee inbox delivery; monitor Brevo transactional logs and webhooks for bounces.
- The two `private` membership-check functions are `SECURITY DEFINER` only to prevent recursive membership RLS. They use fixed search paths, derive identity from `auth.uid()`, reveal only membership/admin booleans for a supplied workspace, and are executable only by authenticated users.
- Route guards improve the user experience; PostgreSQL RLS is the authorization boundary.

Database RLS tests are in `supabase/tests/database`. After starting the local stack and applying migrations with `npx supabase db reset`, run `npx supabase test db`. They use isolated test users and real table permissions/RLS. Do not substitute frontend-only checks for these tests.

### Phase 2 deployment

Review `supabase/migrations/20261103000200_workspaces_invitations.sql` before applying it to a hosted project; no hosted database has been changed from this workspace. The migration aborts before modifying schema if Phase 1 has any invitation rows, so those records can be reviewed instead of assigned an assumed email-delivery state. Configure the two Brevo integrations separately:

### Supabase Auth messages

1. In Brevo, verify the sender/domain. Under **Settings → SMTP & API → SMTP**, generate an SMTP key and copy the SMTP login shown there.
2. In Supabase, open **Authentication → SMTP Settings** (`/project/<project-ref>/auth/smtp`) and enable custom SMTP. Set:
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - User: the Brevo SMTP login
   - Password: the Brevo SMTP key
   - Sender email: your verified sender address
   - Sender name: `Flowtask`
3. Keep email confirmations enabled, secure email change enabled (both current and new addresses confirm), `mailer_autoconfirm=false`, and the current Site URL and redirect allow-list. Keep Supabase's confirmation and recovery templates using `{{ .ConfirmationURL }}`. Supabase Auth continues generating and validating its own tokens. Do not use the Brevo API key as the SMTP password.

### Workspace invitation emails

1. In Supabase Dashboard **Edge Functions → Secrets**, set `BREVO_API_KEY` to the restricted transactional API key, `BREVO_SENDER_EMAIL` to the verified sender address, `BREVO_SENDER_NAME` to `Flowtask`, and `APP_BASE_URL` to the app's HTTPS origin.
2. Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into the Edge Function runtime. Never put any of these credentials in a `VITE_` variable or frontend environment file.
3. After approval, apply the Phase 2 migration and deploy with `npx supabase functions deploy workspace-invitations`.

Disable click tracking/link rewriting for Auth emails so Supabase confirmation links remain intact. Configure SPF, DKIM, and DMARC in Brevo, then test signup confirmation, password reset, email change (confirmations to both addresses), invitation send, failed-send status, and link acceptance. See the [Supabase Custom SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp), [Supabase Edge Function secrets guide](https://supabase.com/docs/guides/functions/secrets), [Brevo SMTP setup](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP), and [Brevo transactional email API](https://developers.brevo.com/reference/send-transac-email).

## Abuse prevention configuration

The browser uses Supabase Auth's password, verification, recovery, and session APIs. Auth errors are normalized, and password-reset confirmation text does not reveal whether an email exists. Supabase Auth applies service-side rate limits; these project-level controls must be reviewed/configured in the Supabase Dashboard:

- Set suitable email send limits and SMTP provider limits for sign-up, confirmation, and recovery.
- Review Auth rate limits for sign-in, sign-up, token verification, and password recovery for the deployed plan and expected traffic.
- Set Supabase's Auth minimum password length to at least 8 characters and enable leaked-password protection where available. The forms also require uppercase, lowercase, number, and symbol; those character-mix checks run in the UI and can be bypassed by callers using the Auth API directly.
- CAPTCHA is not wired into the current forms: the app does not collect or submit CAPTCHA tokens. Add a provider widget/token flow before enabling required Supabase CAPTCHA, or sign-up/sign-in/recovery requests may be rejected.
- Keep Site URL and redirect allow-list limited to the app's actual HTTPS domains.
- For future invitation, upload, comment, and sensitive account endpoints, use Edge Functions with trusted server-side rate limiting. Do not trust client timestamps, counters, or forwarded IP headers.

No custom rate-limiting service or CAPTCHA integration is active in this phase.

## Scripts

```sh
npm run dev
npm run build
npm run lint
npm test
npx supabase db reset
npx supabase test db
```

## Phase 1 limits

The existing task/project product screens remain sample-data views held in browser memory, not private user data. They are visible to any signed-in account and do not write to Supabase. Task/project CRUD, project memberships, workspace file storage, and outbound invitation email are not part of Phase 2. Do not use sample screen content for real private work until later data-access phases replace it with RLS-protected queries.
