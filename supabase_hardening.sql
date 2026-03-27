-- Supabase 安全加固（可选，但推荐）
-- 执行前请确认你已完成基础建表与初始化数据

-- ========== reviews ==========
alter table public.reviews enable row level security;

drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all"
on public.reviews
for select
to anon, authenticated
using (true);

drop policy if exists "reviews_insert_auth" on public.reviews;
create policy "reviews_insert_auth"
on public.reviews
for insert
to authenticated
with check (
  user_id is null or user_id = auth.uid()
);

-- ========== teams ==========
alter table public.teams enable row level security;

drop policy if exists "teams_select_all" on public.teams;
create policy "teams_select_all"
on public.teams
for select
to anon, authenticated
using (true);

drop policy if exists "teams_insert_auth" on public.teams;
create policy "teams_insert_auth"
on public.teams
for insert
to authenticated
with check (true);

drop policy if exists "teams_update_auth" on public.teams;
create policy "teams_update_auth"
on public.teams
for update
to authenticated
using (true)
with check (
  current_people >= 1 and current_people <= target_people
);

