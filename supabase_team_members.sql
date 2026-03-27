-- 拼桌成员表 + 加入/退出 RPC（避免重复加入、人数一致）
-- Supabase → SQL Editor 执行
-- 若已有 public.teams 表，下面建表语句不会覆盖原表。

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  restaurant_name text not null,
  creator_name text not null,
  current_people int not null default 1 check (current_people >= 0),
  target_people int not null check (target_people >= 2 and target_people <= 8),
  meet_time text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_teams_created_at on public.teams (created_at desc);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists idx_team_members_user_id on public.team_members (user_id);
create index if not exists idx_team_members_team_id on public.team_members (team_id);

alter table public.team_members enable row level security;

drop policy if exists "team_members_select_own" on public.team_members;
create policy "team_members_select_own"
  on public.team_members for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "team_members_insert_own" on public.team_members;
create policy "team_members_insert_own"
  on public.team_members for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "team_members_delete_own" on public.team_members;
create policy "team_members_delete_own"
  on public.team_members for delete
  to authenticated
  using (user_id = auth.uid());

-- 加入：插入成员 + 更新人数（事务内；已加入则报错）
create or replace function public.join_team (p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  team_row public.teams%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into team_row from public.teams where id = p_team_id for update;
  if not found then
    raise exception 'team_not_found';
  end if;
  if team_row.current_people >= team_row.target_people then
    raise exception 'team_full';
  end if;

  insert into public.team_members (team_id, user_id)
  values (p_team_id, auth.uid());

  update public.teams tm
  set
    current_people = tm.current_people + 1,
    status = case
      when tm.current_people + 1 >= tm.target_people then '已满员'
      else '招募中'
    end
  where tm.id = p_team_id;
exception
  when unique_violation then
    raise exception 'already_joined';
end;
$$;

revoke all on function public.join_team (uuid) from public;
grant execute on function public.join_team (uuid) to authenticated;

-- 退出：删成员 + 减人数；人数为 0 则删桌
create or replace function public.leave_team (p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
  new_count int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.team_members
  where team_id = p_team_id and user_id = auth.uid();
  get diagnostics deleted_count = row_count;
  if deleted_count = 0 then
    raise exception 'not_joined';
  end if;

  update public.teams tm
  set
    current_people = tm.current_people - 1,
    status = case
      when tm.current_people - 1 >= tm.target_people then '已满员'
      when tm.current_people - 1 <= 0 then '已解散'
      else '招募中'
    end
  where tm.id = p_team_id
  returning tm.current_people into new_count;

  if new_count is not null and new_count <= 0 then
    delete from public.teams where id = p_team_id;
  end if;
end;
$$;

revoke all on function public.leave_team (uuid) from public;
grant execute on function public.leave_team (uuid) to authenticated;
