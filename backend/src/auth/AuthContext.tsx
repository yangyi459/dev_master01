// 认证上下文：登录、登出、当前管理员、菜单树、权限点；持久化 token 到 localStorage
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { apiGet, apiPost } from '../api/client'

// 功能说明：登录后保存 token 与 /me 返回的管理员信息（含菜单树 + 权限点列表）。
// 权限渲染依赖 permissions 数组；菜单显隐依赖 menus 树。
interface AdminMe {
  id: number
  username: string
  nickname: string
  role_code: string
  role_name: string
  data_scope: string
  store_id?: number | null
  menus: any[]
  permissions: string[]
}
interface AuthCtx {
  admin: AdminMe | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasPerm: (code: string) => boolean
  loading: boolean
  booting: boolean
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminMe | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'))
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(!!localStorage.getItem('admin_token'))

  // 已存在 token 时拉取 /me，刷新页面也能保持登录态
  useEffect(() => {
    if (token && !admin) {
      setBooting(true)
      apiGet('/api/admin/auth/me')
        .then((me) => setAdmin(me))
        .catch(() => {
          localStorage.removeItem('admin_token')
          setToken(null)
        })
        .finally(() => setBooting(false))
    } else {
      setBooting(false)
    }
  }, [token])

  const login = async (username: string, password: string) => {
    setLoading(true)
    try {
      const out: any = await apiPost('/api/admin/auth/login', { username, password })
      localStorage.setItem('admin_token', out.token)
      setToken(out.token)
      const me = await apiGet('/api/admin/auth/me')
      setAdmin(me)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setToken(null)
    setAdmin(null)
    location.href = '/login'
  }

  const hasPerm = (code: string) => admin?.permissions?.includes(code) || false

  return <Ctx.Provider value={{ admin, token, login, logout, hasPerm, loading, booting }}>{children}</Ctx.Provider>
}
