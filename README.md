# 新加坡校园 · 南洋美食地图

Vite + React + Tailwind 校园美食单页应用。

## Supabase 配置（必须）

把 `.env.example` 复制成 `.env`，并填入你的 Supabase 项目参数：

```bash
VITE_SUPABASE_URL=你的_supabase_url
VITE_SUPABASE_ANON_KEY=你的_anon_key
```

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 部署

推送到 GitHub 后，在 [Vercel](https://vercel.com) Import 本仓库即可（Vite / `dist`）。
