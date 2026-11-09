-- Resending rotates the single-use token; the previous email link becomes invalid.
create or replace function public._get_workspace_invitation_email_details(p_invitation_id uuid, p_actor_id uuid)
returns table(invitee_email text, workspace_name text, inviter_name text, intended_role public.workspace_role, expires_at timestamptz)
language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select i.invited_email, w.name, coalesce(p.full_name, 'A Flowtask workspace manager'), i.intended_role, i.expires_at
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id and w.workspace_type = 'team'
  left join public.profiles p on p.id = p_actor_id
  where i.id = p_invitation_id and i.invited_email is not null and i.delivery_status = 'pending'
    and i.revoked_at is null and i.expires_at > now()
    and exists (select 1 from public.workspace_members where workspace_id = i.workspace_id and user_id = p_actor_id and role in ('owner', 'admin'));
$$;
revoke all on function public._get_workspace_invitation_email_details(uuid, uuid) from public, anon, authenticated;
grant execute on function public._get_workspace_invitation_email_details(uuid, uuid) to service_role;

create function public._prepare_workspace_invitation_resend(p_invitation_id uuid, p_actor_id uuid, p_token_hash text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_workspace_id uuid; v_status text; v_updated_at timestamptz;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  select workspace_id into v_workspace_id from public.workspace_invitations where id = p_invitation_id;
  if v_workspace_id is null then return false; end if;
  perform 1 from public.workspaces where id = v_workspace_id and workspace_type = 'team' for update;
  if not found or not exists (select 1 from public.workspace_members where workspace_id = v_workspace_id and user_id = p_actor_id and role in ('owner', 'admin')) then
    return false;
  end if;
  select delivery_status, updated_at into v_status, v_updated_at from public.workspace_invitations where id = p_invitation_id for update;
  if not exists (
    select 1 from public.workspace_invitations i where i.id = p_invitation_id and i.invited_email is not null
      and i.revoked_at is null and i.expires_at > now() and i.accepted_at is null
      and not exists (select 1 from public.workspace_invitation_responses r where r.invitation_id = i.id)
  ) or (v_status not in ('sent', 'failed') and not (v_status = 'pending' and v_updated_at <= now() - interval '5 minutes')) then return false; end if;
  update public.workspace_invitations set token_hash = p_token_hash, delivery_status = 'pending', sent_at = null where id = p_invitation_id;
  return true;
end;
$$;
revoke all on function public._prepare_workspace_invitation_resend(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public._prepare_workspace_invitation_resend(uuid, uuid, text) to service_role;
