# 环境变量

| 名称 | 用途 | 范围 | 来源与更新 | 风险 |
| --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase 项目地址 | 浏览器、构建期 | 本地 `.env.local` / Vercel | 不是秘密；切换项目后需重新构建 |
| `VITE_SUPABASE_ANON_KEY` | 浏览器访问 Supabase | 浏览器、构建期 | 本地 `.env.local` / Vercel | 公开客户端 key；安全完全依赖 RLS |
| `VITE_BASE` | 非根路径部署时的资源前缀 | 构建期，可选 | 构建环境 | 不是秘密；默认 `/` |

## 安全规则

- `VITE_*` 会被打包进浏览器，因此不能保存 `service_role`、数据库密码或任何服务端秘密；
- `.env`、`.env.*` 和 `*.local` 已被 Git 忽略，只提交空值的 `.env.example`；
- Supabase anon/publishable key 可以出现在客户端，但必须配合正确的 RLS 和 RPC 权限；
- 更换 key 或项目 URL 后，需要同步更新本地与 Vercel，并重新部署。

## 上线前检查

- [ ] Vercel Production 和 Preview 均配置两项必需变量；
- [ ] 本地使用 `.env.local`，没有把真实值写进 README 或源码；
- [ ] 没有任何 `VITE_*` 指向 `service_role` key；
- [ ] Supabase Auth 允许的重定向地址包含正式域名和本地测试地址；
- [ ] 线上 RLS、RPC grants 与 `permissions.md` 一致；
- [ ] 轮换 key 后已重新部署，并验证旧 key 的处理状态。

