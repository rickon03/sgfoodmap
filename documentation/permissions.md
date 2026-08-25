# 权限矩阵

## 角色

- 匿名用户：没有 Supabase Auth 会话，使用 `anon` 角色。
- 登录用户：持有 Supabase Auth JWT，使用 `authenticated` 角色和 `auth.uid()`。
- 管理角色：前端不存在管理员或 `service_role` 能力。

## 资源权限

| 资源 / 操作 | 匿名用户 | 登录用户 | 仓库中的预期约束 |
| --- | --- | --- | --- |
| `restaurants` 读取 | 前端需要允许 | 允许 | 仓库没有对应 RLS 定义，线上状态需复核 |
| `reviews` 读取 | 允许 | 允许 | `reviews_select_all` |
| `reviews` 新增 | 拒绝 | 允许自己的或空 `user_id` | `reviews_insert_auth` |
| `reviews` 更新/删除 | 无策略 | 无策略 | 默认拒绝（以线上 RLS 为准） |
| `teams` 读取 | 允许 | 允许 | `teams_select_all` |
| `teams` 新增 | 拒绝 | 允许 | `teams_insert_auth`，没有所有者字段 |
| `teams` 更新 | 拒绝 | 可更新任意队伍 | 只检查人数范围，权限偏宽 |
| `team_members` 读/增/删 | 拒绝 | 仅自己的成员关系 | `user_id = auth.uid()` |
| `profiles` 直接读取 | 拒绝 | 仅自己 | `id = auth.uid()` |
| `profiles` 新增 | 由触发器处理 | 由触发器处理 | 昵称唯一索引和注册触发器 |
| `join_team` / `leave_team` | 禁止调用 | 允许调用 | RPC 内再次检查 `auth.uid()` |
| 注册查重 RPC | 允许 | 允许 | 仅返回是否可用，存在枚举风险 |
| 昵称解析 RPC | 允许 | 允许 | 返回对应邮箱，存在隐私枚举风险 |
| 优惠券 | 前端阻止 | 写浏览器本地 | 不是真正的服务端权限边界 |
| 模拟订单 | 数据已打包到前端 | 登录后界面展示 | 不是真实私有数据 |

## 权限来源

- 身份来自 Supabase Auth JWT；
- 行级范围来自 RLS 中的 `auth.uid()`；
- `security definer` RPC 必须自己检查身份并限制执行角色；
- React 中的“是否登录”判断只负责用户体验，不能替代数据库权限。

## 审核要求

本仓库中的 SQL 只代表预期配置。发布前必须在 Supabase Dashboard 核对：

1. 所有相关表已启用 RLS；
2. 实际策略与本文一致；
3. RPC 的 `grant execute` 没有超出预期角色；
4. 前端环境中不存在 `service_role` 或其他服务端密钥。

