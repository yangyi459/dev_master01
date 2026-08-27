// 前台公开接口封装：对照方案 §6 / 技术文档 §5 的 /api/public/* 端点
import { get, post } from './client'

// 后端列表接口统一返回 Paginated(items,total) 或裸数组；
// 此处归一化为 {list, total}，避免各页面散落判断 items/list/数组。
function norm(d: any): { list: any[]; total: number } {
  if (!d) return { list: [], total: 0 }
  if (Array.isArray(d)) return { list: d, total: d.length }
  const list = d.items ?? d.list ?? []
  return { list, total: d.total ?? list.length }
}

// 站点配置（ICP、电话、邮箱、地址等）
export const getSiteConfig = () => get('/api/public/site-config')
// 首页聚合（首页配置项数组）
export const getHome = () => get('/api/public/home')
// 关于我们内容（品牌故事/发展历程，后台可编辑）
export const getAbout = () => get('/api/public/about')
// 诊疗项目：列表带分类筛选（返回 {list,total}）
export const getServices = (params?: { category_id?: number; page?: number; size?: number }) =>
  get('/api/public/services', params).then(norm)
export const getService = (id: number) => get(`/api/public/services/${id}`)
// 真实案例：年龄分桶 + 分页（返回 {list,total}）
export const getCases = (params?: { age_bucket?: string; service_id?: number; page?: number; size?: number }) =>
  get('/api/public/cases', params).then(norm)
export const getCase = (id: number) => get(`/api/public/cases/${id}`)
// 口腔科普：分类筛选（返回 {list,total}）
export const getArticles = (params?: { category_id?: number; page?: number; size?: number }) =>
  get('/api/public/articles', params).then(norm)
export const getArticle = (id: number) => get(`/api/public/articles/${id}`)
// 医生团队（返回 {list,total}）
export const getDoctors = () => get('/api/public/doctors').then(norm)
export const getDoctor = (id: number) => get(`/api/public/doctors/${id}`)
// 公开分类（type=service|article），前台筛选下拉用
export const getCategories = (type: 'service' | 'article') => get('/api/public/categories', { type }).then((d: any) => (Array.isArray(d) ? d : []))
// 门店（裸数组，归一为 {list,total}）
export const getStores = () => get('/api/public/stores').then(norm)
export const getStore = (id: number) => get(`/api/public/stores/${id}`)
// 独立页面（隐私/条款/免责）
export const getPage = (slug: string) => get(`/api/public/pages/${slug}`)
// 留言提交
export const postGuestbook = (data: { name: string; phone: string; content: string }) =>
  post('/api/public/guestbook', data)
// 可约时段（医生→时段联动，前台预约页用）
export const getSchedules = (params?: { doctor_id?: number; store_id?: number; date?: string }) =>
  get('/api/public/schedules', params).then((d: any) => (Array.isArray(d) ? d : []))
// 预约提交（匿名可提交，登录态自动关联 parent_id）
// 注意：后端路由为 /api/public/appointment（单数，对照方案 §6 Public）
export const postAppointment = (data: any) => post('/api/public/appointment', data)
