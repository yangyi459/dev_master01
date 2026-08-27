// vite 配置：开发代理把 /api 与 /media 转发到本地 FastAPI（端口 8000）
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 功能说明：前端 5173 启动，所有 /api/* 与 /media/* 请求代理到 http://127.0.0.1:8000，
// 避免开发期跨域，也无需在浏览器里配 CORS（CORS 已在后端按白名单开启）。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8001', changeOrigin: true },
    },
  },
})
