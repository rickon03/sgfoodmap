# 关键流程

本文只记录会触及账号、权限、数据写入或外部副作用的流程。

## 注册

- 参与者：匿名用户。
- 前置条件：Supabase Auth 和注册相关 RPC 已配置。
- 成功结果：创建 Auth 用户；触发器在 `profiles` 创建唯一昵称；按项目设置决定是否发送验证邮件。

步骤：

1. 前端校验邮箱、昵称和密码基本格式；
2. 调用 `precheck_signup_registration`，不可用时回退为分别检查邮箱与昵称；
3. 调用 Supabase Auth `signUp`；
4. `auth.users` 插入后，触发器写入 `profiles`；
5. 昵称冲突会使注册回滚。

拒绝情况：重复邮箱、重复昵称、弱密码、Auth 频率限制或所需 RPC 未部署。

证据：`src/components/LoginModal.tsx`、`supabase/02_profiles_username_unique.sql`、`supabase/04_signup_precheck.sql`。

## 登录与会话恢复

- 参与者：已有账号用户。
- 成功结果：浏览器获得 Supabase 会话，页面显示登录状态。

步骤：

1. 邮箱输入直接使用；昵称输入先调用 `resolve_login_email`；
2. 前端调用 `signInWithPassword`；
3. 页面启动时调用 `getSession`，并订阅 `onAuthStateChange`；
4. 退出时调用 `signOut` 并清理前端用户状态。

拒绝情况：昵称不存在、解析 RPC 不可用、密码错误或邮箱尚未验证。

证据：`src/components/LoginModal.tsx`、`src/lib/resolveLoginEmail.ts`、`src/App.tsx`。

## 找回与重置密码

1. 用户输入邮箱或昵称；
2. 昵称通过 RPC 解析为邮箱；
3. `resetPasswordForEmail` 请求 Supabase 发送恢复邮件；
4. 用户通过 recovery 链接返回本站；
5. `PasswordResetModal` 调用 `updateUser` 更新密码。

外部副作用：Supabase Auth 发送邮件。拒绝情况包括账号不存在、重定向地址未加入允许列表、链接失效或密码不符合要求。

## 发布评价

- 所有访客可读取评价；未登录用户在界面中被引导登录。
- 登录用户向 `reviews` 写入餐厅、用户 ID、昵称、星级和内容。
- RLS 预期拒绝匿名插入以及其他用户的非空 `user_id`。

已知缺口：策略允许登录用户提交空 `user_id`，昵称也由浏览器直接提交。

证据：`src/components/DetailModal.tsx`、`supabase/06_hardening.sql`。

## 创建、加入与退出拼桌

### 创建

1. 前端要求用户已登录；
2. 插入一条 `teams`；
3. 将创建者插入自己的 `team_members`；
4. 第二步失败时，前端尝试删除刚创建的队伍。

### 加入

`join_team` RPC 在事务中检查登录、队伍存在、未满员和未重复加入，然后插入成员并增加人数。

### 退出

`leave_team` RPC 只删除当前用户自己的成员关系，并减少人数；无人时删除队伍。

拒绝情况：未登录、队伍不存在、已加入、未加入或已经满员。

证据：`src/components/GroupDiningFeature.tsx`、`src/components/ProfileDrawer.tsx`、`supabase/05_team_members.sql`。

## 领取优惠券

1. 未登录用户在前端被引导登录；
2. 登录后领取记录写入当前浏览器的 `localStorage`；
3. 没有 Supabase 写入，也没有服务端授权检查。

这只是 Demo 状态，不应当作真实优惠券核销或账号资产系统。

证据：`src/components/DetailModal.tsx`、`src/App.tsx`。
