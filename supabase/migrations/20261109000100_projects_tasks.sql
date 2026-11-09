-- Persistent workspace project and task data. All access is constrained by the
-- existing workspace membership RLS boundary.
create type public.task_status as enum ('todo', 'in_progress', 'review', 'done');
create type public.task_priority as enum ('urgent', 'high', 'medium', 'low');
create type public.project_status as enum ('active', 'completed', 'archived');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  status public.project_status not null default 'active',
  due_date date,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create index projects_workspace_status_idx on public.projects(workspace_id, status, created_at desc);
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text not null default '' check (char_length(description) <= 10000),
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date date,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, workspace_id) references public.projects(id, workspace_id) on delete cascade,
  unique (id, workspace_id)
);
create index tasks_workspace_status_idx on public.tasks(workspace_id, status, due_date);
create index tasks_project_idx on public.tasks(project_id) where project_id is not null;
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null,
  user_id uuid not null,
  assigned_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id),
  foreign key (workspace_id, user_id) references public.workspace_members(workspace_id, user_id) on delete cascade,
  foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade
);
create index task_assignees_user_idx on public.task_assignees(user_id, task_id);

create function public.create_workspace_task(
  p_workspace_id uuid, p_project_id uuid, p_title text, p_description text,
  p_status public.task_status, p_priority public.task_priority, p_due_date date, p_assignee_ids uuid[]
)
returns uuid language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_actor uuid := (select auth.uid()); v_task_id uuid;
begin
  if v_actor is null or not private.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace is not available' using errcode = '42501';
  end if;
  if p_project_id is not null and not exists (select 1 from public.projects where id = p_project_id and workspace_id = p_workspace_id) then
    raise exception 'Choose a project in the active workspace' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_assignee_ids), 0) > 100 or exists (
    select 1 from unnest(coalesce(p_assignee_ids, array[]::uuid[])) as requested(user_id)
    where not exists (select 1 from public.workspace_members wm where wm.workspace_id = p_workspace_id and wm.user_id = requested.user_id)
  ) then raise exception 'Assignees must be workspace members' using errcode = '22023'; end if;
  insert into public.tasks(workspace_id, project_id, title, description, status, priority, due_date, created_by)
  values (p_workspace_id, p_project_id, p_title, coalesce(p_description, ''), coalesce(p_status, 'todo'), coalesce(p_priority, 'medium'), p_due_date, v_actor)
  returning id into v_task_id;
  insert into public.task_assignees(task_id, workspace_id, user_id, assigned_by)
  select v_task_id, p_workspace_id, distinct_users.user_id, v_actor
  from (select distinct user_id from unnest(coalesce(p_assignee_ids, array[]::uuid[])) as requested(user_id)) distinct_users;
  return v_task_id;
end;
$$;
revoke all on function public.create_workspace_task(uuid, uuid, text, text, public.task_status, public.task_priority, date, uuid[]) from public, anon;
grant execute on function public.create_workspace_task(uuid, uuid, text, text, public.task_status, public.task_priority, date, uuid[]) to authenticated;

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null,
  author_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, author_id) references public.workspace_members(workspace_id, user_id) on delete cascade,
  foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade
);
create index task_comments_task_created_idx on public.task_comments(task_id, created_at);

create table public.task_activity (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  event text not null check (char_length(event) between 1 and 300),
  created_at timestamptz not null default now(),
  foreign key (task_id, workspace_id) references public.tasks(id, workspace_id) on delete cascade
);
create index task_activity_task_created_idx on public.task_activity(task_id, created_at desc);

create function public.record_task_comment_activity()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
begin
  insert into public.task_activity(task_id, workspace_id, actor_id, event)
  values (new.task_id, new.workspace_id, coalesce((select auth.uid()), new.author_id), 'added a comment');
  return new;
end;
$$;
revoke all on function public.record_task_comment_activity() from public, anon, authenticated;
create trigger task_comments_activity after insert on public.task_comments for each row execute function public.record_task_comment_activity();

create function public.record_task_assignment_activity()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
begin
  insert into public.task_activity(task_id, workspace_id, actor_id, event)
  values (
    coalesce(new.task_id, old.task_id),
    coalesce(new.workspace_id, old.workspace_id),
    coalesce((select auth.uid()), new.assigned_by, old.assigned_by),
    'updated task assignments'
  );
  return coalesce(new, old);
end;
$$;
revoke all on function public.record_task_assignment_activity() from public, anon, authenticated;
create trigger task_assignees_activity after insert or delete on public.task_assignees for each row execute function public.record_task_assignment_activity();

create function public.record_task_activity()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_actor uuid := coalesce((select auth.uid()), new.created_by);
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity(task_id, workspace_id, actor_id, event)
    values (new.id, new.workspace_id, v_actor, 'created this task');
  else
    if old.status is distinct from new.status then
      insert into public.task_activity(task_id, workspace_id, actor_id, event)
      values (new.id, new.workspace_id, v_actor, 'changed status to ' || replace(new.status::text, '_', ' '));
    end if;
    if old.priority is distinct from new.priority then
      insert into public.task_activity(task_id, workspace_id, actor_id, event)
      values (new.id, new.workspace_id, v_actor, 'changed priority to ' || new.priority::text);
    end if;
    if old.title is distinct from new.title or old.description is distinct from new.description or old.due_date is distinct from new.due_date then
      insert into public.task_activity(task_id, workspace_id, actor_id, event)
      values (new.id, new.workspace_id, v_actor, 'updated task details');
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.record_task_activity() from public, anon, authenticated;
create trigger tasks_activity after insert or update on public.tasks for each row execute function public.record_task_activity();

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_activity enable row level security;

create policy projects_select_member on public.projects for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy projects_insert_manager on public.projects for insert to authenticated
with check (created_by = (select auth.uid()) and private.is_workspace_admin(workspace_id));
create policy projects_update_manager on public.projects for update to authenticated
using (private.is_workspace_admin(workspace_id)) with check (private.is_workspace_admin(workspace_id));
create policy projects_delete_manager on public.projects for delete to authenticated
using (private.is_workspace_admin(workspace_id));
revoke all on public.projects from public, anon, authenticated;
grant select on public.projects to authenticated;
grant insert (workspace_id, name, description, status, due_date, created_by) on public.projects to authenticated;
grant update (name, description, status, due_date) on public.projects to authenticated;
grant delete on public.projects to authenticated;

create policy tasks_select_workspace_member on public.tasks for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy tasks_insert_workspace_member on public.tasks for insert to authenticated
with check (created_by = (select auth.uid()) and private.is_workspace_member(workspace_id));
create policy tasks_update_workspace_member on public.tasks for update to authenticated
using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));
create policy tasks_delete_creator_or_admin on public.tasks for delete to authenticated
using (created_by = (select auth.uid()) or private.is_workspace_admin(workspace_id));
revoke all on public.tasks from public, anon, authenticated;
grant select on public.tasks to authenticated;
grant insert (workspace_id, project_id, title, description, status, priority, due_date, created_by) on public.tasks to authenticated;
grant update (project_id, title, description, status, priority, due_date) on public.tasks to authenticated;
grant delete on public.tasks to authenticated;

create policy task_assignees_select_member on public.task_assignees for select to authenticated
using (private.is_workspace_member(workspace_id));
revoke all on public.task_assignees from public, anon, authenticated;
grant select on public.task_assignees to authenticated;

create function public.set_task_assignees(p_task_id uuid, p_user_ids uuid[])
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_workspace_id uuid; v_creator uuid; v_actor uuid := (select auth.uid());
begin
  select workspace_id, created_by into v_workspace_id, v_creator from public.tasks where id = p_task_id for update;
  if v_workspace_id is null or v_actor is null or not private.is_workspace_member(v_workspace_id) then
    raise exception 'Task not found or unavailable' using errcode = '42501';
  end if;
  if v_creator <> v_actor and not private.is_workspace_admin(v_workspace_id) then
    raise exception 'Only the task creator or a workspace manager may change assignments' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_user_ids), 0) > 100 or exists (
    select 1 from unnest(coalesce(p_user_ids, array[]::uuid[])) as requested(user_id)
    where not exists (select 1 from public.workspace_members wm where wm.workspace_id = v_workspace_id and wm.user_id = requested.user_id)
  ) then raise exception 'Assignees must be workspace members' using errcode = '22023'; end if;
  delete from public.task_assignees where task_id = p_task_id;
  insert into public.task_assignees(task_id, workspace_id, user_id, assigned_by)
  select p_task_id, v_workspace_id, requested.user_id, v_actor
  from (select distinct user_id from unnest(coalesce(p_user_ids, array[]::uuid[])) as picked(user_id)) requested;
end;
$$;
revoke all on function public.set_task_assignees(uuid, uuid[]) from public, anon;
grant execute on function public.set_task_assignees(uuid, uuid[]) to authenticated;

create policy task_comments_select_member on public.task_comments for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy task_comments_insert_member on public.task_comments for insert to authenticated
with check (author_id = (select auth.uid()) and private.is_workspace_member(workspace_id) and exists (
  select 1 from public.tasks t where t.id = task_comments.task_id and t.workspace_id = task_comments.workspace_id
));
create policy task_comments_delete_author_or_admin on public.task_comments for delete to authenticated
using (author_id = (select auth.uid()) or private.is_workspace_admin(workspace_id));
revoke all on public.task_comments from public, anon, authenticated;
grant select on public.task_comments to authenticated;
grant insert (task_id, workspace_id, author_id, body) on public.task_comments to authenticated;
grant delete on public.task_comments to authenticated;

create policy task_activity_select_member on public.task_activity for select to authenticated
using (private.is_workspace_member(workspace_id));
revoke all on public.task_activity from public, anon, authenticated;
grant select on public.task_activity to authenticated;

