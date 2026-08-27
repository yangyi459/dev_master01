// 后台 API 客户端：axios 封装，统一信封解析；注入 admin JWT
import axios from 'axios'

// 功能说明：
// - 请求拦截：从 localStorage 读取 admin_token 注入 Authorization。
// - 响应拦截：拆 {code,message,data} 信封；code!=0 抛错；40100 跳登录。
export const http = axios.create({ baseURL: '/', timeout: 15000 })

http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('admin_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

http.interceptors.response.use(
  (resp) => {
    const body = resp.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data
      const err = new Error(body.message || '请求失败') as any
      err.bizCode = body.code
      throw err
    }
    return body
  },
  (error) => {
    const code = error?.response?.status
    if (code === 401) {
      localStorage.removeItem('admin_token')
      // 仅在非登录页时跳转，避免登录页死循环
      if (!location.pathname.startsWith('/login')) location.href = '/login'
    }
    const msg = error?.response?.data?.message || error.message || '网络错误'
    return Promise.reject(new Error(msg))
  },
)

export async function apiGet<T = any>(url: string, params?: any): Promise<T> {
  return http.get(url, { params }) as any
}
export async function apiPost<T = any>(url: string, data?: any, config?: any): Promise<T> {
  return http.post(url, data, config) as any
}
export async function apiPut<T = any>(url: string, data?: any, config?: any): Promise<T> {
  return http.put(url, data, config) as any
}
export async function apiPatch<T = any>(url: string, data?: any): Promise<T> {
  return http.patch(url, data) as any
}
export async function apiDelete<T = any>(url: string): Promise<T> {
  return http.delete(url) as any
}
