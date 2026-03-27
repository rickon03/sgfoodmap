import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// GitHub Pages 项目地址为 https://用户名.github.io/仓库名/ 时需设置子路径
// 本地开发保持 "/"；在 GitHub Actions 里会注入 VITE_BASE
export default defineConfig({
    plugins: [react()],
    base: process.env.VITE_BASE ?? "/",
    server: {
        host: "127.0.0.1",
        port: 5173,
        strictPort: false,
    },
});
