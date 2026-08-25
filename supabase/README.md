# Supabase 数据库脚本

在 Supabase Dashboard 的 SQL Editor 中按编号依次执行：

1. [`01_init_db.sql`](01_init_db.sql)：餐厅、评价表与 16 条 Demo 数据；
2. [`02_profiles_username_unique.sql`](02_profiles_username_unique.sql)：用户资料、唯一昵称和昵称登录；
3. [`03_is_email_available.sql`](03_is_email_available.sql)：注册邮箱可用性检查；
4. [`04_signup_precheck.sql`](04_signup_precheck.sql)：合并邮箱与昵称预检查；
5. [`05_team_members.sql`](05_team_members.sql)：拼桌成员表和加入/退出 RPC；
6. [`06_hardening.sql`](06_hardening.sql)：评价与拼桌 RLS 策略。

`legacy/resolve_login.sql` 只用于兼容旧环境，新项目不要执行。

## 注意事项

- `01_init_db.sql` 的种子数据插入不是完全幂等的，同一项目不要重复执行；
- SQL 文件描述的是仓库中的预期配置，执行后仍需在 Dashboard 核对表、RLS、策略和函数权限；
- 当前初始化脚本没有声明可选的 `coupons` 字段，前端会在字段缺失时显示“暂无优惠券”；
- 不要把 `service_role` key 放进前端或任何 `VITE_*` 环境变量。
