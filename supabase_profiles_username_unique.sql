-- 校园昵称全站唯一：profiles 表 + 注册触发器 + 查重 RPC + 更新 resolve_login_email
-- 在 Supabase：Dashboard → SQL → 执行（若已执行过旧版 supabase_resolve_login.sql，可整段重新执行，函数为 create or replace）

-- ========== 1) 资料表：一人一行，昵称唯一（不区分大小写、首尾空格） ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(trim(username)));

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- ========== 2) 新用户写入 profiles；昵称冲突则整条注册回滚 ==========
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := trim(coalesce(new.raw_user_meta_data->>'username', ''));
  if uname = '' then
    raise exception 'username_required';
  end if;
  insert into public.profiles (id, username)
  values (new.id, uname);
  return new;
exception
  when unique_violation then
    raise exception 'username_taken';
end;
$$;

drop trigger if exists on_auth_user_created_profiles on auth.users;
create trigger on_auth_user_created_profiles
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- ========== 3) 注册前查重（anon 可调用，仅返回是否可用） ==========
create or replace function public.is_username_available(candidate text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles p
    where lower(trim(p.username)) = lower(trim(coalesce(candidate, '')))
  )
  and trim(coalesce(candidate, '')) <> '';
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- ========== 4) 登录框：昵称 → 邮箱（优先走 profiles） ==========
create or replace function public.resolve_login_email(identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  trimmed text;
begin
  trimmed := trim(coalesce(identifier, ''));
  if trimmed = '' then
    return null;
  end if;
  if position('@' in trimmed) > 0 then
    return lower(trimmed);
  end if;
  select u.email into v_email
  from auth.users u
  inner join public.profiles p on p.id = u.id
  where lower(trim(p.username)) = lower(trimmed)
  limit 1;
  return v_email;
end;
$$;

comment on function public.resolve_login_email(text) is '登录/找回密码：邮箱或昵称 → 用于 Supabase Auth 的邮箱';

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- ========== 5) 历史用户回填（同一昵称多人时保留最早创建的一条，其余需手动改 metadata 或删号） ==========
insert into public.profiles (id, username)
select id, uname
from (
  select
    u.id,
    trim(coalesce(u.raw_user_meta_data->>'username', '')) as uname,
    row_number() over (
      partition by lower(trim(coalesce(u.raw_user_meta_data->>'username', '')))
      order by u.created_at asc nulls last, u.id asc
    ) as rn
  from auth.users u
  where coalesce(trim(u.raw_user_meta_data->>'username'), '') <> ''
) t
where rn = 1
on conflict (id) do nothing;
