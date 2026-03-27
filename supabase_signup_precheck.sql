-- 注册前：邮箱 + 昵称一次 RPC 完成（减少请求次数，降低触发 Supabase 频率限制的概率）
-- 依赖：已执行 supabase_is_email_available.sql 与 supabase_profiles_username_unique.sql 中的两个函数
-- 在 Supabase → SQL Editor 执行

create or replace function public.precheck_signup_registration(p_email text, p_username text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'email_available', public.is_email_available_for_signup(p_email),
    'username_available', public.is_username_available(p_username)
  );
$$;

comment on function public.precheck_signup_registration(text, text) is '注册前合并查重：一次往返';

revoke all on function public.precheck_signup_registration(text, text) from public;
grant execute on function public.precheck_signup_registration(text, text) to anon, authenticated;
