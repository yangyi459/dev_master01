// 前台 API 客户端：封装 axios，统一信封解析与错误提示
import axios from 'axios'

// 功能说明：
// - 基础路径：优先读构建期环境变量 VITE_API_BASE_URL（上线后指向独立部署的 API 域名）；
//   未配置时回退为 '/'，由 vite 开发代理转发 /api 到 FastAPI:8000（本地开发不变）。
// - 后端统一返回信封 {code,message,data}；code=0 视为成功，其余抛错。
// - 家长 JWT（parent_token）注入 Authorization；40100 时清除登录态。
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
  timeout: 15000,
})

// 请求拦截：注入家长 token（登录态提交预约/我的账户等）
http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('parent_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// 响应拦截：拆信封；code!=0 视为业务失败
http.interceptors.response.use(
  (resp) => {
    const body = resp.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data // 直接返回 data 部分
      // 家长 token 失效：清理本地态，由页面引导重新登录
      if (body.code === 40100) {
        localStorage.removeItem('parent_token')
        localStorage.removeItem('parent_info')
        window.dispatchEvent(new Event('parent-auth-changed'))
      }
      const err = new Error(body.message || '请求失败') as any
      err.bizCode = body.code
      throw err
    }
    return body
  },
  (error) => {
    const msg = error?.response?.data?.message || error.message || '网络错误'
    return Promise.reject(new Error(msg))
  },
)

// 通用请求封装
export async function get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
  return http.get(url, { params }) as any
}
export async function post<T = any>(url: string, data?: any): Promise<T> {
  return http.post(url, data) as any
}
