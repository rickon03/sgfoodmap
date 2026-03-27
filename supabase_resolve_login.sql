-- 已合并到 supabase_profiles_username_unique.sql（含昵称全站唯一、本函数最新版）。
-- 若你只需旧版「仅按 user_metadata 解析昵称」，可保留下方；新项目请执行 supabase_profiles_username_unique.sql。

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
  where lower(trim(coalesce(u.raw_user_meta_data->>'username', ''))) = lower(trimmed)
  limit 1;
  return v_email;
end;
$$;

comment on function public.resolve_login_email(text) is '登录/找回密码：邮箱或昵称 → 用于 Supabase Auth 的邮箱';

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
