// 侧栏菜单：把 /me 返回的菜单树渲染为 AntD Menu
import { Menu, Spin } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  DashboardOutlined,
  FileTextOutlined,
  ShopOutlined,
  TeamOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

// 功能说明：菜单树 → AntD Menu items；选中态按当前路由高亮；点击跳转对应 path。
export default function SiderMenu() {
  const { admin, loading, booting } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()
  const menus = admin?.menus || []

  const toItems = (list: any[]): any[] =>
    list
      .map((m) => ({
        key: m.path,
        icon: m.icon ? <span className="anticon">{ICONS[m.icon]}</span> : undefined,
        label: m.name,
        children: m.children?.length ? toItems(m.children) : undefined,
      }))

  const selected = [loc.pathname]
  const openKeys = menus
    .filter((m: any) => m.children?.some((c: any) => loc.pathname.startsWith(c.path)))
    .map((m: any) => m.path)

  if (loading || booting) {
    return (
      <div className="flex h-40 items-center justify-center text-white/60">
        <Spin size="small" />
        <span className="ml-2 text-xs">菜单加载中…</span>
      </div>
    )
  }

  if (!menus.length) {
    return (
      <div className="px-6 py-8 text-center text-xs text-white/50">
        未获取到菜单权限
        <br />
        请尝试刷新页面或重新登录
      </div>
    )
  }

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={selected}
      defaultOpenKeys={openKeys}
      items={toItems(menus)}
      onClick={({ key }) => nav(key)}
      style={{ borderRight: 0 }}
    />
  )
}

// Ant Design 官方图标映射（替代 emoji，符合 UI/UX 禁用 emoji 规范）
const ICONS: Record<string, ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  ShopOutlined: <ShopOutlined />,
  TeamOutlined: <TeamOutlined />,
  SettingOutlined: <SettingOutlined />,
}
