-- 注册前：邮箱是否尚未被占用（一个邮箱只能注册一个账号）
-- 在 Supabase → SQL Editor 执行（可与其它 SQL 分开执行）

create or replace function public.is_email_available_for_signup(candidate text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    trim(coalesce(candidate, '')) <> ''
    and position('@' in trim(coalesce(candidate, ''))) > 0
    and not exists (
      select 1
      from auth.users u
      where lower(trim(u.email)) = lower(trim(coalesce(candidate, '')))
    );
$$;

comment on function public.is_email_available_for_signup(text) is '注册：邮箱未被 auth.users 使用时为 true';

revoke all on function public.is_email_available_for_signup(text) from public;
grant execute on function public.is_email_available_for_signup(text) to anon, authenticated;
