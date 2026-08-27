// 页面布局 Layout：Nav + 路由出口 + Footer + 悬浮咨询 + Toast 容器
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Nav from './Nav'
import Footer from './Footer'
import OnlineConsult from './OnlineConsult'
import { ToastProvider } from './Toast'

// 路由切换后，若 URL 含 hash，则平滑滚动到对应锚点；为 sticky header 留出 80px 偏移
function ScrollToHash() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [pathname, hash])
  return null
}

// 功能说明：所有前台页面共用此布局。ToastProvider 包裹全站以支持全局提示。
export default function Layout() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">
          <ScrollToHash />
          <Outlet />
        </main>
        <Footer />
        <OnlineConsult />
      </div>
    </ToastProvider>
  )
}
