// 家长端登录态：全局 Context，挂载于前台路由根部
// 提供 parent / token / 登录 / 登出 / 刷新；登录后拉取 /me 保持刷新不丢态。
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getParentInfo, getParentToken, clearSession } from '../api/auth'
import { getProfile } from '../api/parent'

export interface ParentMe {
  id: number
  phone: string
  nickname: string
  avatar: string
  status: number
}
interface ParentCtx {
  parent: ParentMe | null
  token: string | null
  ready: boolean
  logout: () => void
  refresh: () => void
}
const Ctx = createContext<ParentCtx>({ parent: null, token: null, ready: false, logout: () => {}, refresh: () => {} })
export const useParent = () => useContext(Ctx)

export function ParentAuthProvider({ children }: { children: ReactNode }) {
  const [parent, setParent] = useState<ParentMe | null>(getParentInfo())
  const [token, setToken] = useState<string | null>(getParentToken())
  const [ready, setReady] = useState(false)

  // 已存在 token 时拉取最新资料（刷新页面保持登录态）
  useEffect(() => {
    let alive = true
    if (token && !parent) {
      getProfile()
        .then((me) => {
          if (!alive) return
          setParent(me)
        })
        .catch(() => {
          if (!alive) return
          clearSession()
          setParent(null)
          setToken(null)
        })
        .finally(() => alive && setReady(true))
    } else {
      setReady(true)
    }
    return () => {
      alive = false
    }
  }, [token])

  // 登录/登出事件同步（拦截器清 token 也会触发）
  useEffect(() => {
    const onChanged = () => {
      setToken(getParentToken())
      setParent(getParentInfo())
    }
    window.addEventListener('parent-auth-changed', onChanged)
    return () => window.removeEventListener('parent-auth-changed', onChanged)
  }, [])

  const logout = () => {
    clearSession()
    setParent(null)
    setToken(null)
  }

  return <Ctx.Provider value={{ parent, token, ready, logout, refresh: () => {} }}>{children}</Ctx.Provider>
}
