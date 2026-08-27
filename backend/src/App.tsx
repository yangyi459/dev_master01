// 后台路由：登录页独立；其余挂在 AdminLayout 下并受 RequireAuth 保护
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth, RequireMenu } from './auth/guards'
import AdminLayout from './layout/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Services from './pages/cms/Services'
import Cases from './pages/cms/Cases'
import Articles from './pages/cms/Articles'
import Doctors from './pages/cms/Doctors'
import Categories from './pages/cms/Categories'
import Benefits from './pages/cms/Benefits'
import HomeItems from './pages/cms/HomeItems'
import Pages from './pages/cms/Pages'
import SiteConfig from './pages/cms/SiteConfig'
import AboutContent from './pages/cms/AboutContent'
import Assets from './pages/cms/Assets'
import Stores from './pages/store/Stores'
import Schedules from './pages/store/Schedules'
import Appointments from './pages/Appointments'
import Patients from './pages/Patients'
import Roles from './pages/Roles'
import Admins from './pages/Admins'
import Org from './pages/system/Org'
import Logs from './pages/system/Logs'
import Guestbooks from './pages/customer/Guestbooks'

// 功能说明：路由 path 与菜单 path 对齐（见种子菜单 MENU_TREE）。受保护路由用 RequireMenu 校验菜单可见性。
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          {/* CMS */}
          <Route path="cms/services" element={<RequireMenu path="/cms/services"><Services /></RequireMenu>} />
          <Route path="cms/cases" element={<RequireMenu path="/cms/cases"><Cases /></RequireMenu>} />
          <Route path="cms/articles" element={<RequireMenu path="/cms/articles"><Articles /></RequireMenu>} />
          <Route path="cms/doctors" element={<RequireMenu path="/cms/doctors"><Doctors /></RequireMenu>} />
          <Route path="cms/categories" element={<RequireMenu path="/cms/categories"><Categories /></RequireMenu>} />
          <Route path="cms/benefits" element={<RequireMenu path="/cms/benefits"><Benefits /></RequireMenu>} />
          <Route path="cms/home" element={<RequireMenu path="/cms/home"><HomeItems /></RequireMenu>} />
          <Route path="cms/pages" element={<RequireMenu path="/cms/pages"><Pages /></RequireMenu>} />
          <Route path="cms/site" element={<RequireMenu path="/cms/site"><SiteConfig /></RequireMenu>} />
          <Route path="cms/about" element={<RequireMenu path="/cms/about"><AboutContent /></RequireMenu>} />
          <Route path="cms/assets" element={<RequireMenu path="/cms/assets"><Assets /></RequireMenu>} />
          {/* 门店运营 */}
          <Route path="store/stores" element={<RequireMenu path="/store/stores"><Stores /></RequireMenu>} />
          <Route path="store/schedules" element={<RequireMenu path="/store/schedules"><Schedules /></RequireMenu>} />
          {/* M2 客户与系统 */}
          <Route path="customer/appointments" element={<RequireMenu path="/customer/appointments"><Appointments /></RequireMenu>} />
          <Route path="customer/patients" element={<RequireMenu path="/customer/patients"><Patients /></RequireMenu>} />
          <Route path="customer/guestbooks" element={<RequireMenu path="/customer/guestbooks"><Guestbooks /></RequireMenu>} />
          <Route path="system/org" element={<RequireMenu path="/system/org"><Org /></RequireMenu>} />
          <Route path="system/roles" element={<RequireMenu path="/system/roles"><Roles /></RequireMenu>} />
          <Route path="system/admins" element={<RequireMenu path="/system/admins"><Admins /></RequireMenu>} />
          <Route path="system/logs" element={<RequireMenu path="/system/logs"><Logs /></RequireMenu>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
