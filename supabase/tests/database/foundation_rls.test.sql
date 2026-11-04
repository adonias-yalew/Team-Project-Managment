create extension if not exists pgtap with schema extensions;

begin;
select plan(14);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'phase1-a@example.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Phase One A"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'phase1-b@example.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Phase One B"}'::jsonb, now(), now());

select is((select count(*)::int from public.profiles), 2, 'account trigger creates profiles');
select is((select count(*)::int from public.workspaces where workspace_type = 'personal'), 2, 'account trigger creates private personal workspaces');
select is((select count(*)::int from public.workspace_members where role = 'owner'), 2, 'account trigger assigns each user as workspace owner');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*)::int from public.profiles), 1, 'authenticated user reads only their own profile');
select is((select count(*)::int from public.workspaces), 1, 'authenticated user cannot discover another personal workspace');
select is((select count(*)::int from public.workspace_members), 1, 'authenticated user sees only their own workspace membership');

update public.profiles set full_name = 'Tampered' where id = '00000000-0000-4000-8000-0000000000b2';
select is((select full_name from public.profiles where id = '00000000-0000-4000-8000-0000000000a1'), 'Phase One A', 'profile update cannot affect another account');

select throws_ok(
  $$insert into public.workspace_members (workspace_id, user_id, role) select id, '00000000-0000-4000-8000-0000000000a1', 'owner' from public.workspaces where workspace_type = 'personal' and created_by = '00000000-0000-4000-8000-0000000000b2'$$,
  '42501', null, 'members cannot self-promote or add privileged memberships'
);
select throws_ok(
  $$update public.workspace_members set role = 'owner' where user_id = '00000000-0000-4000-8000-0000000000b2'$$,
  '42501', null, 'members cannot change another member role'
);
select throws_ok(
  $$delete from public.workspaces where workspace_type = 'personal'$$,
  '42501', null, 'clients cannot delete protected workspaces'
);

reset role;
select is((select full_name from public.profiles where id = '00000000-0000-4000-8000-0000000000b2'), 'Phase One B', 'other user profile remains unchanged after attempted update');
set local role anon;
select throws_ok($$select * from public.workspaces$$, '42501', null, 'unauthenticated clients cannot read protected workspaces');
reset role;
insert into public.workspaces (name, workspace_type, created_by)
values ('Duplicate personal workspace', 'personal', '00000000-0000-4000-8000-0000000000a1')
on conflict (created_by) where workspace_type = 'personal' do nothing;
select is((select count(*)::int from public.workspaces where workspace_type = 'personal' and created_by = '00000000-0000-4000-8000-0000000000a1'), 1, 'retry cannot create a duplicate personal workspace');
select is((select count(*)::int from public.workspaces where workspace_type = 'personal' and created_by = '00000000-0000-4000-8000-0000000000a1'), 1, 'one personal workspace exists per account');

select * from finish();
rollback;
