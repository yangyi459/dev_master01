// vite 配置：后台管理前端（端口 5174），代理 /api 与 /media 到 FastAPI:8000
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8001', changeOrigin: true },
    },
  },
  build: {
    // echarts 体积大（~1MB），单独拆出便于浏览器缓存；其余交 Rollup 默认打包。
    // 图表/组件库先天超 500kB，将告警阈值提到 1500kB（属正常，非错误）。
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules') && (id.includes('echarts') || id.includes('zrender'))) {
            return 'echarts'
          }
        },
      },
    },
  },
})
