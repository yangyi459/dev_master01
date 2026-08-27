// 家长端鉴权接口封装：对照方案 §6 Auth / §9 双 JWT
import { post } from './client'

export interface ParentMe {
  id: number
  phone: string
  nickname: string
  avatar: string
  status: number
}
export interface ParentAuthOut {
  token: string
  parent: ParentMe
}

// 发送验证码（dev 环境回显 dev_code，便于联调）
export const sendCode = (phone: string) => post<{ dev_code: string | null; expire_seconds: number }>('/api/auth/send-code', { phone })
// 注册：校验验证码 → 建号 → 返 token
export const register = (data: { phone: string; code: string; password: string; nickname?: string }) =>
  post<ParentAuthOut>('/api/auth/register', data)
// 登录：手机号 + 密码 → 返 token
export const login = (data: { phone: string; password: string }) => post<ParentAuthOut>('/api/auth/login', data)
// 找回密码：校验验证码 → 重置
export const resetPassword = (data: { phone: string; code: string; password: string }) =>
  post('/api/auth/reset-password', data)
// 刷新 token（凭原 token 换发）
export const refreshToken = (token: string) => post<ParentAuthOut>('/api/auth/refresh', { token })

// 本地会话管理：token + 资料 持久化到 localStorage，供拦截器与页面读取
const TOKEN_KEY = 'parent_token'
const INFO_KEY = 'parent_info'

export function saveSession(out: ParentAuthOut) {
  localStorage.setItem(TOKEN_KEY, out.token)
  localStorage.setItem(INFO_KEY, JSON.stringify(out.parent))
  window.dispatchEvent(new Event('parent-auth-changed'))
}
export function getParentToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function getParentInfo(): ParentMe | null {
  try {
    const s = localStorage.getItem(INFO_KEY)
    return s ? (JSON.parse(s) as ParentMe) : null
  } catch {
    return null
  }
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(INFO_KEY)
  window.dispatchEvent(new Event('parent-auth-changed'))
}
