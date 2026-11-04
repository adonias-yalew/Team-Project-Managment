-- Phase 1 privacy foundation. Auth user creation and its private workspace are atomic.
create type public.workspace_type as enum ('personal', 'team');
create type public.workspace_role as enum ('owner', 'admin', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 100),
  username text unique check (username is null or username ~ '^[a-zA-Z0-9_]{3,30}$'),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text unique check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  workspace_type public.workspace_type not null default 'team',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  constraint workspace_members_workspace_user_unique unique (workspace_id, user_id)
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_email text not null check (char_length(invited_email) between 3 and 320),
  intended_role public.workspace_role not null default 'member' check (intended_role in ('admin', 'member')),
  token_hash text not null unique check (char_length(token_hash) >= 64),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  max_uses integer not null default 1 check (max_uses between 1 and 100),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((accepted_at is null) = (accepted_by is null))
);

create index workspace_members_user_idx on public.workspace_members(user_id, workspace_id);
create index workspace_invitations_workspace_idx on public.workspace_invitations(workspace_id, expires_at);
create unique index workspaces_one_personal_per_owner on public.workspaces(created_by) where workspace_type = 'personal';

create function public.set_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger workspace_invitations_updated_at before update on public.workspace_invitations for each row execute function public.set_updated_at();
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Membership checks use a small, fixed-search-path definer function to avoid recursive RLS.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.is_workspace_member(p_workspace_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.user_id = (select auth.uid())
  );
$$;

create function private.is_workspace_admin(p_workspace_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner', 'admin')
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.is_workspace_admin(uuid) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;

create function public.initialize_new_user()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_name text;
  v_workspace_id uuid;
begin
  v_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  if v_name is null then v_name := coalesce(nullif(split_part(new.email, '@', 1), ''), 'New member'); end if;

  insert into public.profiles (id, full_name)
  values (new.id, left(v_name, 100))
  on conflict (id) do nothing;

  insert into public.workspaces (name, workspace_type, created_by)
  values (left(v_name, 100) || '''s Personal Workspace', 'personal', new.id)
  on conflict (created_by) where workspace_type = 'personal' do nothing;

  select w.id into strict v_workspace_id
  from public.workspaces w where w.created_by = new.id and w.workspace_type = 'personal';

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.initialize_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.initialize_new_user();

-- Backfill existing accounts atomically when applying this migration to a populated project.
insert into public.profiles (id, full_name)
select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(u.email, '@', 1), ''), 'New member'), 100)
from auth.users u on conflict (id) do nothing;

insert into public.workspaces (name, workspace_type, created_by)
select left(p.full_name, 100) || '''s Personal Workspace', 'personal', p.id
from public.profiles p
on conflict (created_by) where workspace_type = 'personal' do nothing;

insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.created_by, 'owner'
from public.workspaces w
where w.workspace_type = 'personal'
on conflict (workspace_id, user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy workspaces_select_member on public.workspaces for select to authenticated
using (private.is_workspace_member(id));
create policy workspaces_update_admin on public.workspaces for update to authenticated
using (workspace_type = 'team' and private.is_workspace_admin(id))
with check (workspace_type = 'team' and private.is_workspace_admin(id));

create policy workspace_members_select_member on public.workspace_members for select to authenticated
using (user_id = (select auth.uid()) or private.is_workspace_member(workspace_id));

create policy workspace_invitations_select_admin on public.workspace_invitations for select to authenticated
using (private.is_workspace_admin(workspace_id));

revoke all on public.profiles, public.workspaces, public.workspace_members, public.workspace_invitations from anon, authenticated;
grant select on public.profiles, public.workspaces, public.workspace_members to authenticated;
grant update (full_name, username, avatar_url, bio) on public.profiles to authenticated;
grant update (name, slug) on public.workspaces to authenticated;
-- No client write grants for memberships or invitations in Phase 1.
