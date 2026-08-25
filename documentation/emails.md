# 认证邮件

项目没有自建邮件队列或模板系统。认证邮件由 Supabase Auth 负责发送。

| 场景 | 触发点 | 提供方 | 返回路径 |
| --- | --- | --- | --- |
| 注册验证 | `supabase.auth.signUp` | Supabase Auth 配置的邮件提供方 | 由 Supabase 项目设置决定 |
| 找回密码 | `resetPasswordForEmail` | Supabase Auth 配置的邮件提供方 | 当前站点的 origin + pathname |

## 运行说明

- 模板、发件域名、发送额度、重试和投递日志不在仓库中，由 Supabase Dashboard 管理；
- 前端只显示成功或错误提示，不保存邮件内容；
- recovery 链接返回后，`PasswordResetModal` 调用 `updateUser` 更新密码；
- 正式域名和本地地址必须加入 Supabase Auth 允许的重定向列表。

## 风险

- 未配置正式 SMTP 时可能受 Supabase 默认邮件额度限制；
- 错误的重定向白名单会使恢复链接无法回到应用；
- 昵称解析和邮箱可用性 RPC 可能帮助攻击者确认账号是否存在；
- 仓库无法证明线上邮件模板、发件域名和重试配置。

