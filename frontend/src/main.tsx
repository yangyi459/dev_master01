// 应用入口：挂载 React 根组件，引入全局样式与路由
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// 功能说明：BrowserRouter 提供前端路由；App 内定义全部页面路由。
// 全局样式 index.css 已加载设计 Token。
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
