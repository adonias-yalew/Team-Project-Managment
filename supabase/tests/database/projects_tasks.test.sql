create extension if not exists pgtap with schema extensions;

begin;
select plan(13);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'projects-owner@example.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Projects Owner"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'projects-member@example.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Projects Member"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-0000000000e3', 'authenticated', 'authenticated', 'projects-outsider@example.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Projects Outsider"}'::jsonb, now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('test.workspace_a', public.create_team_workspace('Projects Team A', null, null)::text, true);
select set_config('test.project_id', '', true);
select set_config('test.owner_task_id', '', true);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e3', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('test.workspace_b', public.create_team_workspace('Projects Team B', null, null)::text, true);
reset role;

insert into public.workspace_members(workspace_id, user_id, role)
values (current_setting('test.workspace_a')::uuid, '00000000-0000-4000-8000-0000000000e2', 'member');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into public.projects(workspace_id, name, created_by)
values (current_setting('test.workspace_a')::uuid, 'Authorized project', '00000000-0000-4000-8000-0000000000e1')
returning set_config('test.project_id', id::text, true);
select set_config('test.owner_task_id', public.create_workspace_task(
  current_setting('test.workspace_a')::uuid, current_setting('test.project_id')::uuid,
  'Owner task', '', 'todo', 'medium', null, array[]::uuid[]
)::text, true);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e2', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select ok(has_function_privilege('authenticated', 'public.create_workspace_task(uuid,uuid,text,text,public.task_status,public.task_priority,date,uuid[])', 'EXECUTE'), 'workspace members can call the guarded task creation RPC');
select ok(not has_function_privilege('anon', 'public.create_workspace_task(uuid,uuid,text,text,public.task_status,public.task_priority,date,uuid[])', 'EXECUTE'), 'anonymous users cannot create tasks');
select is((select count(*)::int from public.projects where id = current_setting('test.project_id')::uuid), 1, 'workspace members can read their workspace projects');
select is((select count(*)::int from public.projects where workspace_id = current_setting('test.workspace_b')::uuid), 0, 'workspace members cannot read another workspace projects');
select throws_ok(
  format('insert into public.projects(workspace_id, name, created_by) values (%L::uuid, %L, %L::uuid)', current_setting('test.workspace_a'), 'Member project', '00000000-0000-4000-8000-0000000000e2'),
  '42501', null, 'ordinary members cannot create projects'
);
select is(public.create_workspace_task(
  current_setting('test.workspace_a')::uuid, current_setting('test.project_id')::uuid,
  'Member task', 'Created by a member', 'todo', 'high', current_date + 3,
  array['00000000-0000-4000-8000-0000000000e2'::uuid]
) is not null, true, 'workspace members can create tasks assigned to workspace members');
select throws_ok(
  format('select public.set_task_assignees(%L::uuid, array[%L::uuid])', current_setting('test.owner_task_id'), '00000000-0000-4000-8000-0000000000e2'),
  '42501', null, 'members cannot reassign tasks created by another user'
);
select is((select count(*)::int from public.tasks where workspace_id = current_setting('test.workspace_a')), 2, 'task records are persisted in the workspace');
select ok((select relrowsecurity from pg_class where oid = 'public.projects'::regclass), 'project row-level security is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.tasks'::regclass), 'task row-level security is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.task_assignees'::regclass), 'task assignment row-level security is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.task_comments'::regclass), 'task comment row-level security is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.task_activity'::regclass), 'task activity row-level security is enabled');
reset role;

select * from finish();
rollback;
