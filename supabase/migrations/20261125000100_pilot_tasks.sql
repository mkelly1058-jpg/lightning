begin;

create schema lightning_private;
revoke all on schema lightning_private from public;
grant usage on schema lightning_private to authenticated;

create table public.staff_profiles (
  id uuid primary key references auth.users (id),
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  role text not null check (role in ('staff', 'admin')),
  active boolean not null default true
);

create table public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.staff_profiles (id),
  created_by uuid not null references public.staff_profiles (id),
  title text not null check (length(title) between 1 and 160),
  next_action text not null check (length(next_action) between 1 and 1000),
  scope text not null check (scope in ('personal', 'department')),
  priority text not null check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  status text not null default 'To do' check (status in ('To do', 'In progress', 'Waiting', 'Done', 'Cancelled')),
  due_date date,
  undated_reason text,
  waiting_on text,
  chase_date date,
  outcome_note text,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  check (due_date is not null or coalesce(length(undated_reason), 0) between 1 and 500),
  check (status <> 'Waiting' or (chase_date is not null and coalesce(length(waiting_on), 0) between 1 and 200)),
  check (status not in ('Done', 'Cancelled') or coalesce(length(outcome_note), 0) between 1 and 1000)
);

create index staff_tasks_owner_due_idx on public.staff_tasks (owner_id, due_date);
create index staff_tasks_activity_idx on public.staff_tasks (updated_at desc, id desc);

create table public.staff_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.staff_tasks (id),
  actor_id uuid not null references public.staff_profiles (id),
  previous_status text,
  new_status text not null,
  version integer not null,
  outcome_note text,
  recorded_at timestamptz not null default statement_timestamp(),
  unique (task_id, version)
);

alter table public.staff_profiles enable row level security;
alter table public.staff_tasks enable row level security;
alter table public.staff_task_events enable row level security;
revoke all on public.staff_profiles, public.staff_tasks, public.staff_task_events from public, anon, authenticated;
grant select on public.staff_profiles, public.staff_tasks, public.staff_task_events to authenticated;

create function lightning_private.role_for_actor()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.staff_profiles
  where id = (select auth.uid()) and active;
$$;

revoke all on function lightning_private.role_for_actor() from public, anon, authenticated;
grant execute on function lightning_private.role_for_actor() to authenticated;

create policy staff_profiles_read on public.staff_profiles
for select to authenticated using (
  (select lightning_private.role_for_actor()) = 'admin'
  or (id = (select auth.uid()) and active)
);

create policy staff_tasks_read on public.staff_tasks
for select to authenticated using (
  (select lightning_private.role_for_actor()) = 'admin'
  or (owner_id = (select auth.uid()) and (select lightning_private.role_for_actor()) = 'staff')
);

create policy staff_task_events_read on public.staff_task_events
for select to authenticated using ((select lightning_private.role_for_actor()) = 'admin');

create function public.create_staff_task(
  p_title text,
  p_next_action text,
  p_priority text,
  p_due_date date,
  p_undated_reason text,
  p_owner_id uuid default null
)
returns public.staff_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := lightning_private.role_for_actor();
  task_owner uuid := coalesce(p_owner_id, actor_id);
  new_task public.staff_tasks;
begin
  if actor_role is null or (p_owner_id is not null and actor_role <> 'admin') then
    raise exception 'Task creation is unavailable for this account.' using errcode = '42501';
  end if;
  -- Lock the owner while assigning to serialize with deactivation.
  perform 1 from public.staff_profiles where id = task_owner and active for share;
  if not found then
    raise exception 'Select an active owner.' using errcode = '22023';
  end if;

  insert into public.staff_tasks (owner_id, created_by, title, next_action, scope, priority, due_date, undated_reason)
  values (
    task_owner, actor_id, trim(p_title), trim(p_next_action),
    case when p_owner_id is null then 'personal' else 'department' end,
    p_priority, p_due_date, case when p_due_date is null then nullif(trim(p_undated_reason), '') end
  )
  returning * into new_task;

  insert into public.staff_task_events (task_id, actor_id, new_status, version)
  values (new_task.id, actor_id, new_task.status, new_task.version);

  return new_task;
end;
$$;

create function public.update_staff_task_status(
  p_task_id uuid,
  p_expected_version integer,
  p_status text,
  p_waiting_on text default null,
  p_chase_date date default null,
  p_outcome_note text default null
)
returns public.staff_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := lightning_private.role_for_actor();
  existing public.staff_tasks;
  updated public.staff_tasks;
begin
  if actor_role is null then
    raise exception 'Task is unavailable for this account.' using errcode = '42501';
  end if;

  select * into existing from public.staff_tasks
  where id = p_task_id and (actor_role = 'admin' or owner_id = actor_id)
  for update;

  if not found then
    raise exception 'Task is unavailable for this account.' using errcode = '42501';
  end if;
  if p_expected_version is distinct from existing.version then
    raise exception 'Someone updated this task. Reload it before saving.' using errcode = '40001';
  end if;
  if p_status = 'Cancelled' and existing.scope = 'department' and actor_role <> 'admin' then
    raise exception 'Only an administrator can cancel department work.' using errcode = '42501';
  end if;

  update public.staff_tasks
  set status = p_status,
      waiting_on = case when p_status = 'Waiting' then nullif(trim(p_waiting_on), '') end,
      chase_date = case when p_status = 'Waiting' then p_chase_date end,
      outcome_note = case when p_status in ('Done', 'Cancelled') then nullif(trim(p_outcome_note), '') end,
      updated_at = statement_timestamp(),
      version = version + 1
  where id = existing.id
  returning * into updated;

  insert into public.staff_task_events (task_id, actor_id, previous_status, new_status, version, outcome_note)
  values (updated.id, actor_id, existing.status, updated.status, updated.version, updated.outcome_note);

  return updated;
end;
$$;

revoke all on function public.create_staff_task(text, text, text, date, text, uuid) from public, anon, authenticated;
revoke all on function public.update_staff_task_status(uuid, integer, text, text, date, text) from public, anon, authenticated;
grant execute on function public.create_staff_task(text, text, text, date, text, uuid) to authenticated;
grant execute on function public.update_staff_task_status(uuid, integer, text, text, date, text) to authenticated;

commit;
