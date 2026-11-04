create extension if not exists pgtap with schema extensions;

begin;
select plan(14);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', 'phase2-owner@example.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Phase Two Owner"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-0000000000d4', 'authenticated', 'authenticated', 'phase2-member@example.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Phase Two Member"}'::jsonb, now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000c3', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('test.workspace_id', public.create_team_workspace('Phase Two Team', 'A secure team', null)::text, true);
reset role;
insert into public.workspace_members(workspace_id, user_id, role)
values (current_setting('test.workspace_id')::uuid, '00000000-0000-4000-8000-0000000000d4', 'member');

select ok(has_function_privilege('authenticated', 'public.create_team_workspace(text,text,text)', 'EXECUTE'), 'authenticated users can create a team through the guarded RPC');
select ok(not has_function_privilege('anon', 'public.create_team_workspace(text,text,text)', 'EXECUTE'), 'anonymous users cannot create a team');
select ok(has_function_privilege('service_role', 'public._create_workspace_invitation(uuid,uuid,text,public.workspace_role,text,timestamp with time zone,integer)', 'EXECUTE'), 'only the trusted server role can create invitations');
select ok(not has_function_privilege('authenticated', 'public._create_workspace_invitation(uuid,uuid,text,public.workspace_role,text,timestamp with time zone,integer)', 'EXECUTE'), 'authenticated clients cannot call the internal invitation creator');
select ok(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in (
    '_consume_workspace_invitation', '_create_workspace_invitation', '_preview_workspace_invitation',
    '_accept_workspace_invitation', '_decline_workspace_invitation', '_respond_to_email_workspace_invitation',
    '_get_workspace_invitation_email_details', '_set_workspace_invitation_delivery_status'
  ) and has_function_privilege('authenticated', p.oid, 'EXECUTE')
), 'authenticated clients cannot call any trusted invitation lifecycle function directly');
select ok(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in (
    '_consume_workspace_invitation', '_create_workspace_invitation', '_preview_workspace_invitation',
    '_accept_workspace_invitation', '_decline_workspace_invitation', '_respond_to_email_workspace_invitation',
    '_get_workspace_invitation_email_details', '_set_workspace_invitation_delivery_status'
  ) and not has_function_privilege('service_role', p.oid, 'EXECUTE')
), 'the trusted Edge Function role can call each invitation lifecycle function');
select ok(not has_column_privilege('authenticated', 'public.workspace_invitations', 'token_hash', 'SELECT'), 'clients cannot read invitation token hashes');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000c3', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(format('select public.change_workspace_member_role(%L::uuid, %L::uuid, ''admin''::public.workspace_role)', current_setting('test.workspace_id'), '00000000-0000-4000-8000-0000000000d4'), 'owner can promote a member to admin');
select is((select role::text from public.workspace_members where workspace_id = current_setting('test.workspace_id')::uuid and user_id = '00000000-0000-4000-8000-0000000000d4'), 'admin', 'promotion updates the member role');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000d4', true);
select throws_ok(format('select public.change_workspace_member_role(%L::uuid, %L::uuid, ''owner''::public.workspace_role)', current_setting('test.workspace_id'), '00000000-0000-4000-8000-0000000000c3'), '42501', null, 'an ordinary member cannot change workspace roles');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000c3', true);
select lives_ok(format('select public.transfer_workspace_ownership(%L::uuid, %L::uuid)', current_setting('test.workspace_id'), '00000000-0000-4000-8000-0000000000d4'), 'owner can transfer ownership to an existing member');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000d4', true);
select is((select count(*)::int from public.workspaces where workspace_type = 'personal' and created_by = '00000000-0000-4000-8000-0000000000c3'), 0, 'a member cannot read another account personal workspace');
select throws_ok(format('select public.remove_workspace_member(%L::uuid, %L::uuid)', current_setting('test.workspace_id'), '00000000-0000-4000-8000-0000000000d4'), '42501', null, 'the final owner cannot remove themselves');
reset role;
select is((select role::text from public.workspace_members where workspace_id = current_setting('test.workspace_id')::uuid and user_id = '00000000-0000-4000-8000-0000000000d4'), 'owner', 'ownership transfer gives the selected member the owner role');

select * from finish();
rollback;
