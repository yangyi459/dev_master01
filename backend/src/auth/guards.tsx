// 路由守卫：RequireAuth（未登录跳登录）、RequireMenu（无菜单权限显403占位）
import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Result, Button } from 'antd'
import { useNavigate } from 'react-router-dom'

// 功能说明：RequireAuth 包裹受保护路由；RequireMenu 按菜单 path 校验可见性。
export function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const loc = useLocation()
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />
  return <>{children}</>
}

export function RequireMenu({ path, children }: { path: string; children: ReactNode }) {
  const { admin } = useAuth()
  const nav = useNavigate()
  // 超级管理员可见全部；其余按菜单树 path 命中判断
  const has = admin?.role_code === 'super_admin' || flatten(admin?.menus || []).some((m) => m.path === path)
  if (!has) {
    return (
      <Result
        status="403"
        title="无访问权限"
        subTitle="当前角色无权查看该菜单，请联系超级管理员授权。"
        extra={
          <Button type="primary" onClick={() => nav('/dashboard')}>
            返回仪表盘
          </Button>
        }
      />
    )
  }
  return <>{children}</>
}

// 把树形菜单拍平，便于路径匹配
function flatten(menus: any[]): any[] {
  const out: any[] = []
  const walk = (list: any[]) => {
    for (const m of list) {
      out.push(m)
      if (m.children) walk(m.children)
    }
  }
  walk(menus)
  return out
}
