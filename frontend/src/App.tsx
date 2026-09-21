// 前台路由：所有页面挂在 Layout 下（Nav/Footer/咨询悬浮/Toast 共用）
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ScrollToHash from './components/ScrollToHash'
import { ParentAuthProvider } from './auth/parent'
import Home from './pages/Home'
import Services from './pages/Services'
import ServiceDetail from './pages/ServiceDetail'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import Articles from './pages/Articles'
import ArticleDetail from './pages/ArticleDetail'
import About from './pages/About'
import Legal from './pages/Legal'
import Booking from './pages/Booking'
import Account from './pages/Account'
import AuthPage from './pages/AuthPage'
import DoctorDetail from './pages/DoctorDetail'

// 功能说明：路由对照方案 §7 前台页面清单。/privacy|terms|disclaimer 走 Legal 组件。
// M2 新增：预约挂号 / 我的账户 / 登录注册找回（家长中心）。
export default function App() {
  return (
    <ParentAuthProvider>
      <ScrollToHash />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:id" element={<ArticleDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/doctors/:id" element={<DoctorDetail />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/reset" element={<AuthPage mode="reset" />} />
          <Route path="/privacy" element={<Legal />} />
          <Route path="/terms" element={<Legal />} />
          <Route path="/disclaimer" element={<Legal />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </ParentAuthProvider>
  )
}
