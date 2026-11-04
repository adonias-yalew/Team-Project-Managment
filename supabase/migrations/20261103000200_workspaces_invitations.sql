-- Phase 2 additions. Phase 1 objects are altered in place; the foundation migration is not rerun.

do $$
begin
  if exists (select 1 from public.workspace_invitations) then
    raise exception 'Review existing workspace invitations before applying Phase 2; no existing invitation has delivery history.';
  end if;
end;
$$;

alter table public.workspaces
  add column description text check (description is null or char_length(description) <= 1000),
  add column avatar_url text check (avatar_url is null or (avatar_url like 'https://%' and char_length(avatar_url) <= 2048));

alter table public.workspace_invitations alter column invited_email drop not null;
alter table public.workspace_invitations
  add column delivery_status text not null default 'not_applicable'
    check (delivery_status in ('not_applicable', 'pending', 'sent', 'failed')),
  add column sent_at timestamptz;
alter table public.workspace_invitations drop constraint if exists workspace_invitations_intended_role_check;
alter table public.workspace_invitations
  add constraint workspace_invitations_intended_role_check check (intended_role in ('owner', 'admin', 'member'));

create index workspace_invitations_creator_idx on public.workspace_invitations(created_by, created_at desc);
create index workspace_invitations_workspace_email_idx on public.workspace_invitations(workspace_id, lower(invited_email)) where invited_email is not null;

create type public.workspace_invitation_response as enum ('accepted', 'declined');
create table public.workspace_invitation_responses (
  invitation_id uuid not null references public.workspace_invitations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response public.workspace_invitation_response not null,
  responded_at timestamptz not null default now(),
  primary key (invitation_id, user_id)
);
alter table public.workspace_invitation_responses enable row level security;
revoke all on public.workspace_invitation_responses from public, anon, authenticated;

create table public.workspace_invitation_attempt_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('create', 'preview', 'accept', 'decline', 'revoke')),
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (user_id, action, window_start)
);
alter table public.workspace_invitation_attempt_windows enable row level security;
revoke all on public.workspace_invitation_attempt_windows from public, anon, authenticated;

create function public.create_team_workspace(p_name text, p_description text default null, p_avatar_url text default null)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 120 then
    raise exception 'Workspace name must be 1 to 120 characters' using errcode = '22023';
  end if;
  if p_description is not null and char_length(p_description) > 1000 then
    raise exception 'Description must be 1000 characters or fewer' using errcode = '22023';
  end if;
  if p_avatar_url is not null and (p_avatar_url not like 'https://%' or char_length(p_avatar_url) > 2048) then
    raise exception 'Logo URL must be an HTTPS URL under 2048 characters' using errcode = '22023';
  end if;
  insert into public.workspaces (name, description, avatar_url, workspace_type, created_by)
  values (trim(p_name), nullif(trim(p_description), ''), p_avatar_url, 'team', v_user_id)
  returning id into v_workspace_id;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');
  return v_workspace_id;
end;
$$;
revoke all on function public.create_team_workspace(text, text, text) from public, anon;
grant execute on function public.create_team_workspace(text, text, text) to authenticated;

create function public.list_workspace_members(p_workspace_id uuid)
returns table(member_user_id uuid, full_name text, avatar_url text, role public.workspace_role, joined_at timestamptz)
language plpgsql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if (select auth.uid()) is null or not private.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace not found or unavailable' using errcode = '42501';
  end if;
  return query
  select wm.user_id, coalesce(p.full_name, 'Workspace member'), p.avatar_url, wm.role, wm.joined_at
  from public.workspace_members wm
  left join public.profiles p on p.id = wm.user_id
  where wm.workspace_id = p_workspace_id
  order by case wm.role when 'owner' then 0 when 'admin' then 1 else 2 end, p.full_name;
end;
$$;
revoke all on function public.list_workspace_members(uuid) from public, anon;
grant execute on function public.list_workspace_members(uuid) to authenticated;

create function public.change_workspace_member_role(p_workspace_id uuid, p_target_user_id uuid, p_new_role public.workspace_role)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_role public.workspace_role;
  v_target_role public.workspace_role;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform 1 from public.workspaces where id = p_workspace_id and workspace_type = 'team' for update;
  if not found then raise exception 'Workspace not found or unavailable' using errcode = '42501'; end if;
  select role into v_actor_role from public.workspace_members where workspace_id = p_workspace_id and user_id = v_actor;
  select role into v_target_role from public.workspace_members where workspace_id = p_workspace_id and user_id = p_target_user_id for update;
  if v_actor_role is null or v_actor_role not in ('owner', 'admin') or v_target_role is null then
    raise exception 'Workspace member role cannot be changed' using errcode = '42501';
  end if;
  if p_target_user_id = v_actor then raise exception 'Use ownership transfer to change your Owner role' using errcode = '42501'; end if;
  if v_actor_role = 'admin' and (v_target_role <> 'member' or p_new_role = 'owner') then
    raise exception 'Admins may change ordinary member roles only' using errcode = '42501';
  end if;
  if p_new_role = 'owner' and v_actor_role <> 'owner' then
    raise exception 'Only an Owner may assign the Owner role' using errcode = '42501';
  end if;
  if v_target_role = 'owner' and p_new_role <> 'owner'
    and (select count(*) from public.workspace_members where workspace_id = p_workspace_id and role = 'owner') <= 1 then
    raise exception 'Transfer ownership before demoting the final Owner' using errcode = '42501';
  end if;
  update public.workspace_members set role = p_new_role where workspace_id = p_workspace_id and user_id = p_target_user_id;
end;
$$;
revoke all on function public.change_workspace_member_role(uuid, uuid, public.workspace_role) from public, anon;
grant execute on function public.change_workspace_member_role(uuid, uuid, public.workspace_role) to authenticated;

create function public.remove_workspace_member(p_workspace_id uuid, p_target_user_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_role public.workspace_role;
  v_target_role public.workspace_role;
  v_owner_count integer;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform 1 from public.workspaces where id = p_workspace_id and workspace_type = 'team' for update;
  if not found then raise exception 'Workspace not found or unavailable' using errcode = '42501'; end if;
  select role into v_actor_role from public.workspace_members where workspace_id = p_workspace_id and user_id = v_actor;
  select role into v_target_role from public.workspace_members where workspace_id = p_workspace_id and user_id = p_target_user_id for update;
  if v_target_role is null then raise exception 'Workspace member was not found' using errcode = 'P0002'; end if;
  if p_target_user_id <> v_actor then
    if v_actor_role = 'admin' and v_target_role <> 'member' then
      raise exception 'Admins may remove ordinary members only' using errcode = '42501';
    elsif v_actor_role <> 'admin' or v_actor_role is null then
      raise exception 'Only an Owner or Admin may remove another member' using errcode = '42501';
    end if;
  elsif v_target_role = 'owner' then
    raise exception 'Transfer ownership before leaving this workspace' using errcode = '42501';
  elsif v_actor_role is null then
    raise exception 'Workspace member was not found' using errcode = '42501';
  end if;
  if v_target_role = 'owner' then
    select count(*) into v_owner_count from public.workspace_members where workspace_id = p_workspace_id and role = 'owner';
    if v_owner_count <= 1 then raise exception 'Transfer ownership before removing the final Owner' using errcode = '42501'; end if;
  end if;
  delete from public.workspace_members where workspace_id = p_workspace_id and user_id = p_target_user_id;
end;
$$;
revoke all on function public.remove_workspace_member(uuid, uuid) from public, anon;
grant execute on function public.remove_workspace_member(uuid, uuid) to authenticated;

create function public.transfer_workspace_ownership(p_workspace_id uuid, p_new_owner_user_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform 1 from public.workspaces where id = p_workspace_id and workspace_type = 'team' for update;
  if not found or not exists (
    select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = v_actor and role = 'owner'
  ) then raise exception 'Only a workspace Owner may transfer ownership' using errcode = '42501'; end if;
  if p_new_owner_user_id = v_actor or not exists (
    select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = p_new_owner_user_id
  ) then raise exception 'Select another existing team member' using errcode = '22023'; end if;
  update public.workspace_members set role = 'owner' where workspace_id = p_workspace_id and user_id = p_new_owner_user_id;
  update public.workspace_members set role = 'admin' where workspace_id = p_workspace_id and user_id = v_actor;
end;
$$;
revoke all on function public.transfer_workspace_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_workspace_ownership(uuid, uuid) to authenticated;

create function public.delete_team_workspace(p_workspace_id uuid, p_confirmation_name text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  perform 1 from public.workspaces where id = p_workspace_id and workspace_type = 'team' for update;
  if not found then raise exception 'Workspace deletion is not authorized' using errcode = '42501'; end if;
  if (select auth.uid()) is null or not exists (
    select 1 from public.workspace_members wm join public.workspaces w on w.id = wm.workspace_id
    where wm.workspace_id = p_workspace_id and wm.user_id = (select auth.uid()) and wm.role = 'owner'
      and w.workspace_type = 'team' and w.name = p_confirmation_name
  ) then raise exception 'Workspace deletion is not authorized' using errcode = '42501'; end if;
  delete from public.workspaces where id = p_workspace_id and workspace_type = 'team';
end;
$$;
revoke all on function public.delete_team_workspace(uuid, text) from public, anon;
grant execute on function public.delete_team_workspace(uuid, text) to authenticated;

create function public.revoke_workspace_invitation(p_invitation_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_workspace_id uuid;
begin
  select workspace_id into v_workspace_id from public.workspace_invitations where id = p_invitation_id;
  if v_workspace_id is not null then
    perform 1 from public.workspaces where id = v_workspace_id for update;
    perform 1 from public.workspace_invitations where id = p_invitation_id and workspace_id = v_workspace_id for update;
    if not found then v_workspace_id := null; end if;
  end if;
  if v_workspace_id is null or not private.is_workspace_admin(v_workspace_id) then
    raise exception 'Invitation not found or unavailable' using errcode = '42501';
  end if;
  update public.workspace_invitations set revoked_at = coalesce(revoked_at, now()) where id = p_invitation_id;
end;
$$;
revoke all on function public.revoke_workspace_invitation(uuid) from public, anon;
grant execute on function public.revoke_workspace_invitation(uuid) to authenticated;

create function public.list_workspace_invitations(p_workspace_id uuid)
returns table(
  id uuid, workspace_id uuid, invited_email text, intended_role public.workspace_role,
  expires_at timestamptz, revoked_at timestamptz, max_uses integer,
  accepted_count bigint, declined_count bigint, status text, delivery_status text,
  created_by uuid, created_at timestamptz
)
language plpgsql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if (select auth.uid()) is null or not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Workspace invitations are unavailable' using errcode = '42501';
  end if;
  return query
  select i.id, i.workspace_id, i.invited_email, i.intended_role, i.expires_at, i.revoked_at, i.max_uses,
    coalesce(r.accepted_count, 0), coalesce(r.declined_count, 0),
    case
      when i.revoked_at is not null then 'revoked'
      when i.expires_at <= now() then 'expired'
      when i.accepted_at is not null or coalesce(r.accepted_count, 0) >= i.max_uses then 'accepted'
      when i.invited_email is not null and coalesce(r.declined_count, 0) > 0 then 'declined'
      else 'pending'
    end,
    i.delivery_status, i.created_by, i.created_at
  from public.workspace_invitations i
  left join lateral (
    select count(*) filter (where ir.response = 'accepted') as accepted_count,
      count(*) filter (where ir.response = 'declined') as declined_count
    from public.workspace_invitation_responses ir where ir.invitation_id = i.id
  ) r on true
  where i.workspace_id = p_workspace_id
  order by i.created_at desc;
end;
$$;
revoke all on function public.list_workspace_invitations(uuid) from public, anon;
grant execute on function public.list_workspace_invitations(uuid) to authenticated;

create function public._get_workspace_invitation_email_details(p_invitation_id uuid, p_actor_id uuid)
returns table(invitee_email text, workspace_name text, inviter_name text, intended_role public.workspace_role, expires_at timestamptz)
language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select i.invited_email, w.name, coalesce(p.full_name, 'A Flowtask workspace owner'), i.intended_role, i.expires_at
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id and w.workspace_type = 'team'
  left join public.profiles p on p.id = p_actor_id
  where i.id = p_invitation_id and i.created_by = p_actor_id
    and i.invited_email is not null and i.delivery_status = 'pending'
    and i.revoked_at is null and i.expires_at > now()
    and exists (select 1 from public.workspace_members where workspace_id = i.workspace_id and user_id = p_actor_id and role in ('owner', 'admin'));
$$;
revoke all on function public._get_workspace_invitation_email_details(uuid, uuid) from public, anon, authenticated;
grant execute on function public._get_workspace_invitation_email_details(uuid, uuid) to service_role;

create function public._set_workspace_invitation_delivery_status(p_invitation_id uuid, p_status text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_status not in ('sent', 'failed') then return false; end if;
  update public.workspace_invitations
    set delivery_status = p_status, sent_at = case when p_status = 'sent' then now() else null end
    where id = p_invitation_id and invited_email is not null and delivery_status = 'pending';
  return found;
end;
$$;
revoke all on function public._set_workspace_invitation_delivery_status(uuid, text) from public, anon, authenticated;
grant execute on function public._set_workspace_invitation_delivery_status(uuid, text) to service_role;

create function public.list_my_workspace_invitations()
returns table(
  id uuid, workspace_id uuid, workspace_name text, invited_email text,
  intended_role public.workspace_role, expires_at timestamptz, status text
)
language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select i.id, i.workspace_id, w.name, i.invited_email, i.intended_role, i.expires_at,
    case
      when i.revoked_at is not null then 'revoked'
      when i.expires_at <= now() then 'expired'
      when response.response = 'accepted' then 'accepted'
      when response.response = 'declined' then 'declined'
      when i.accepted_at is not null then 'accepted'
      else 'pending'
    end
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  left join public.workspace_invitation_responses response on response.invitation_id = i.id and response.user_id = (select auth.uid())
  where (select auth.uid()) is not null
    and i.invited_email is not null
    and i.delivery_status = 'sent'
    and exists (
      select 1 from auth.users u
      where u.id = (select auth.uid()) and u.email_confirmed_at is not null
        and lower(u.email) = lower((select auth.jwt() ->> 'email'))
    )
    and lower(i.invited_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  order by i.created_at desc;
$$;
revoke all on function public.list_my_workspace_invitations() from public, anon;
grant execute on function public.list_my_workspace_invitations() to authenticated;

-- These private operations are callable only by the trusted invitations Edge Function.
create function public._consume_workspace_invitation(p_user_id uuid, p_action text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_count integer;
  v_limit integer;
  v_window timestamptz := date_trunc('minute', now());
begin
  if p_action not in ('create', 'preview', 'accept', 'decline', 'revoke') then return false; end if;
  v_limit := case p_action when 'create' then 5 else 20 end;
  delete from public.workspace_invitation_attempt_windows where window_start < now() - interval '2 hours';
  insert into public.workspace_invitation_attempt_windows(user_id, action, window_start, attempts)
  values (p_user_id, p_action, v_window, 1)
  on conflict (user_id, action, window_start) do update
    set attempts = public.workspace_invitation_attempt_windows.attempts + 1
  returning attempts into v_count;
  return v_count <= v_limit;
end;
$$;
revoke all on function public._consume_workspace_invitation(uuid, text) from public, anon, authenticated;
grant execute on function public._consume_workspace_invitation(uuid, text) to service_role;

create function public._create_workspace_invitation(
  p_actor_id uuid, p_workspace_id uuid, p_invited_email text, p_role public.workspace_role,
  p_token_hash text, p_expires_at timestamptz, p_max_uses integer
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor_role public.workspace_role;
  v_workspace_type public.workspace_type;
  v_invitation_id uuid;
begin
  select w.workspace_type into v_workspace_type from public.workspaces w where w.id = p_workspace_id for update;
  select wm.role into v_actor_role from public.workspace_members wm where wm.workspace_id = p_workspace_id and wm.user_id = p_actor_id;
  if v_workspace_type is distinct from 'team' or v_actor_role is null or v_actor_role not in ('owner', 'admin') then
    raise exception 'Invitation creation is not authorized' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('owner', 'admin', 'member') or (p_role = 'owner' and v_actor_role <> 'owner') then
    raise exception 'You cannot assign that workspace role' using errcode = '42501';
  end if;
  if p_invited_email is not null and (char_length(trim(p_invited_email)) not between 3 and 320 or p_max_uses <> 1) then
    raise exception 'Email invitations must be valid and single-use' using errcode = '22023';
  end if;
  if p_invited_email is not null and p_invited_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  if p_invited_email is not null and exists (
    select 1 from auth.users u join public.workspace_members wm on wm.user_id = u.id
    where wm.workspace_id = p_workspace_id and lower(u.email) = lower(trim(p_invited_email))
  ) then raise exception 'That account is already a workspace member' using errcode = '23505'; end if;
  if (p_invited_email is null and p_max_uses not between 1 and 100)
    or (p_invited_email is not null and p_max_uses <> 1) then
    raise exception 'Link use limit must be between 1 and 100' using errcode = '22023';
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception 'Invitation token or expiration is invalid' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor_id::text, 928374));
  if (select count(*) from public.workspace_invitations i where i.created_by = p_actor_id and i.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Invitation rate limit reached' using errcode = 'P0001';
  end if;
  if p_invited_email is not null and exists (
    select 1 from public.workspace_invitations i
    where i.workspace_id = p_workspace_id and lower(i.invited_email) = lower(trim(p_invited_email))
      and i.revoked_at is null and i.expires_at > now() and i.accepted_at is null
      and i.delivery_status <> 'failed'
      and not exists (select 1 from public.workspace_invitation_responses r where r.invitation_id = i.id and r.response = 'declined')
  ) then raise exception 'A pending invitation already exists for that email' using errcode = '23505'; end if;
  insert into public.workspace_invitations(workspace_id, invited_email, intended_role, token_hash, expires_at, max_uses, created_by, delivery_status)
  values (p_workspace_id, nullif(lower(trim(p_invited_email)), ''), p_role, p_token_hash, p_expires_at, p_max_uses, p_actor_id,
    case when p_invited_email is null then 'not_applicable' else 'pending' end)
  returning id into v_invitation_id;
  return v_invitation_id;
end;
$$;
revoke all on function public._create_workspace_invitation(uuid, uuid, text, public.workspace_role, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public._create_workspace_invitation(uuid, uuid, text, public.workspace_role, text, timestamptz, integer) to service_role;

create function public._preview_workspace_invitation(p_token_hash text, p_user_id uuid, p_user_email text)
returns table(invitation_id uuid, workspace_id uuid, workspace_name text, description text, avatar_url text, intended_role public.workspace_role, expires_at timestamptz, remaining_uses integer)
language plpgsql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  return query
  select i.id, w.id, w.name, w.description, w.avatar_url, i.intended_role, i.expires_at,
    greatest(i.max_uses - (select count(*)::int from public.workspace_invitation_responses r where r.invitation_id = i.id and r.response = 'accepted'), 0)
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id and w.workspace_type = 'team'
  where i.token_hash = p_token_hash and i.revoked_at is null and i.expires_at > now() and i.accepted_at is null
    and (i.invited_email is null or i.delivery_status = 'sent')
    and (i.invited_email is null or lower(i.invited_email) = lower(p_user_email))
    and not exists (select 1 from public.workspace_invitation_responses r where r.invitation_id = i.id and r.user_id = p_user_id)
    and (select count(*) from public.workspace_invitation_responses r where r.invitation_id = i.id and r.response = 'accepted') < i.max_uses;
end;
$$;
revoke all on function public._preview_workspace_invitation(text, uuid, text) from public, anon, authenticated;
grant execute on function public._preview_workspace_invitation(text, uuid, text) to service_role;

create function public._accept_workspace_invitation(p_token_hash text, p_user_id uuid, p_user_email text)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_invitation public.workspace_invitations%rowtype;
  v_workspace_id uuid;
  v_workspace_type public.workspace_type;
  v_prior public.workspace_invitation_response;
  v_accepted_count integer;
begin
  select workspace_id into v_workspace_id from public.workspace_invitations where token_hash = p_token_hash;
  if v_workspace_id is null then raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002'; end if;
  perform 1 from public.workspaces where id = v_workspace_id and workspace_type = 'team' for update;
  if not found then raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002'; end if;
  select * into v_invitation from public.workspace_invitations where token_hash = p_token_hash and workspace_id = v_workspace_id for update;
  if not found or v_invitation.revoked_at is not null or v_invitation.expires_at <= now()
    or (v_invitation.invited_email is not null and v_invitation.delivery_status <> 'sent') then
    raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002';
  end if;
  if v_invitation.invited_email is not null and lower(v_invitation.invited_email) <> lower(p_user_email) then
    raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002';
  end if;
  select response into v_prior from public.workspace_invitation_responses where invitation_id = v_invitation.id and user_id = p_user_id;
  if v_prior = 'accepted' then return v_invitation.workspace_id; end if;
  if v_prior = 'declined' or v_invitation.accepted_at is not null then raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002'; end if;
  select workspace_type into v_workspace_type from public.workspaces where id = v_invitation.workspace_id;
  if v_workspace_type is distinct from 'team' then raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002'; end if;
  if exists (select 1 from public.workspace_members where workspace_id = v_invitation.workspace_id and user_id = p_user_id) then
    raise exception 'This account already belongs to the workspace' using errcode = '23505';
  end if;
  select count(*) into v_accepted_count from public.workspace_invitation_responses where invitation_id = v_invitation.id and response = 'accepted';
  if v_accepted_count >= v_invitation.max_uses then raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002'; end if;
  insert into public.workspace_members(workspace_id, user_id, role)
  values (v_invitation.workspace_id, p_user_id, v_invitation.intended_role)
  on conflict (workspace_id, user_id) do nothing;
  insert into public.workspace_invitation_responses(invitation_id, user_id, response)
  values (v_invitation.id, p_user_id, 'accepted');
  if v_accepted_count + 1 >= v_invitation.max_uses then
    update public.workspace_invitations set accepted_at = coalesce(accepted_at, now()), accepted_by = coalesce(accepted_by, p_user_id) where id = v_invitation.id;
  end if;
  return v_invitation.workspace_id;
end;
$$;
revoke all on function public._accept_workspace_invitation(text, uuid, text) from public, anon, authenticated;
grant execute on function public._accept_workspace_invitation(text, uuid, text) to service_role;

create function public._decline_workspace_invitation(p_token_hash text, p_user_id uuid, p_user_email text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_invitation public.workspace_invitations%rowtype;
  v_workspace_id uuid;
  v_prior public.workspace_invitation_response;
begin
  select workspace_id into v_workspace_id from public.workspace_invitations where token_hash = p_token_hash;
  if v_workspace_id is null then raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002'; end if;
  perform 1 from public.workspaces where id = v_workspace_id and workspace_type = 'team' for update;
  if not found then raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002'; end if;
  select * into v_invitation from public.workspace_invitations where token_hash = p_token_hash and workspace_id = v_workspace_id for update;
  if not found or v_invitation.revoked_at is not null or v_invitation.expires_at <= now()
    or (v_invitation.invited_email is not null and v_invitation.delivery_status <> 'sent')
    or v_invitation.accepted_at is not null
    or (v_invitation.invited_email is not null and lower(v_invitation.invited_email) <> lower(p_user_email)) then
    raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002';
  end if;
  select response into v_prior from public.workspace_invitation_responses where invitation_id = v_invitation.id and user_id = p_user_id;
  if v_prior = 'declined' then return; end if;
  if v_prior = 'accepted' then raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002'; end if;
  insert into public.workspace_invitation_responses(invitation_id, user_id, response)
  values (v_invitation.id, p_user_id, 'declined');
end;
$$;
revoke all on function public._decline_workspace_invitation(text, uuid, text) from public, anon, authenticated;
grant execute on function public._decline_workspace_invitation(text, uuid, text) to service_role;

create function public._respond_to_email_workspace_invitation(
  p_invitation_id uuid, p_user_id uuid, p_user_email text, p_response public.workspace_invitation_response
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_invitation public.workspace_invitations%rowtype;
  v_workspace_id uuid;
  v_prior public.workspace_invitation_response;
begin
  select workspace_id into v_workspace_id from public.workspace_invitations where id = p_invitation_id;
  if v_workspace_id is null then raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002'; end if;
  perform 1 from public.workspaces where id = v_workspace_id and workspace_type = 'team' for update;
  if not found then raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002'; end if;
  select * into v_invitation from public.workspace_invitations where id = p_invitation_id and workspace_id = v_workspace_id for update;
  if not found or v_invitation.invited_email is null or lower(v_invitation.invited_email) <> lower(p_user_email)
    or v_invitation.revoked_at is not null or v_invitation.expires_at <= now()
    or v_invitation.delivery_status <> 'sent' then
    raise exception 'Invitation is invalid or unavailable' using errcode = 'P0002';
  end if;
  select response into v_prior from public.workspace_invitation_responses where invitation_id = v_invitation.id and user_id = p_user_id;
  if v_prior = p_response then return case when p_response = 'accepted' then v_invitation.workspace_id else null end; end if;
  if v_prior is not null or v_invitation.accepted_at is not null then
    raise exception 'Invitation has already been answered' using errcode = 'P0002';
  end if;
  if p_response = 'accepted' then
    if exists (select 1 from public.workspace_members where workspace_id = v_invitation.workspace_id and user_id = p_user_id) then
      raise exception 'This account already belongs to the workspace' using errcode = '23505';
    end if;
    insert into public.workspace_members(workspace_id, user_id, role)
    values (v_invitation.workspace_id, p_user_id, v_invitation.intended_role)
    on conflict (workspace_id, user_id) do nothing;
    update public.workspace_invitations set accepted_at = now(), accepted_by = p_user_id where id = v_invitation.id;
  end if;
  insert into public.workspace_invitation_responses(invitation_id, user_id, response)
  values (v_invitation.id, p_user_id, p_response);
  return case when p_response = 'accepted' then v_invitation.workspace_id else null end;
end;
$$;
revoke all on function public._respond_to_email_workspace_invitation(uuid, uuid, text, public.workspace_invitation_response) from public, anon, authenticated;
grant execute on function public._respond_to_email_workspace_invitation(uuid, uuid, text, public.workspace_invitation_response) to service_role;

grant update (name, slug, description, avatar_url) on public.workspaces to authenticated;

-- Publicly readable logo objects; uploads and removals require workspace admin rights.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workspace-logos', 'workspace-logos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy workspace_logos_insert_admin on storage.objects for insert to authenticated
with check (
  bucket_id = 'workspace-logos'
  and (case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then private.is_workspace_admin(((storage.foldername(name))[1])::uuid) else false end)
);
create policy workspace_logos_update_admin on storage.objects for update to authenticated
using (
  bucket_id = 'workspace-logos'
  and (case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then private.is_workspace_admin(((storage.foldername(name))[1])::uuid) else false end)
)
with check (
  bucket_id = 'workspace-logos'
  and (case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then private.is_workspace_admin(((storage.foldername(name))[1])::uuid) else false end)
);
create policy workspace_logos_delete_admin on storage.objects for delete to authenticated
using (
  bucket_id = 'workspace-logos'
  and (case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then private.is_workspace_admin(((storage.foldername(name))[1])::uuid) else false end)
);
