// 后台 M3 业务接口封装：排班矩阵 / 看板聚合 / 素材引用计数+恢复 / 组织架构
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from './client'

// ========== 排班 ==========
export const getSchedules = (params: { store_id?: number; week_start?: string }) =>
  apiGet('/api/admin/schedules', params)
export const createSchedule = (data: any) => apiPost('/api/admin/schedules', data)
export const batchSchedules = (data: {
  week_start: string
  store_id: number
  doctor_ids?: number[]
  slots: string[]
  available?: number
  quota?: number
}) => apiPost('/api/admin/schedules/batch', data)
export const patchSchedule = (id: number, payload: { available?: number; quota?: number }) =>
  apiPatch(`/api/admin/schedules/${id}`, payload)

// ========== 看板聚合 ==========
export const dashSummary = () => apiGet('/api/admin/dashboard/summary')
export const dashTodos = () => apiGet('/api/admin/dashboard/todos')
export const dashTrend = (days = 30) => apiGet('/api/admin/dashboard/trend', { days })
export const dashFunnel = () => apiGet('/api/admin/dashboard/funnel')
export const dashStores = () => apiGet('/api/admin/dashboard/stores')
export const dashContent = () => apiGet('/api/admin/dashboard/content')
export const dashChannels = () => apiGet('/api/admin/dashboard/channels')
export const dashDoctors = () => apiGet('/api/admin/dashboard/doctors')

// ========== 素材引用计数 + 恢复 ==========
export const recountAssets = () => apiPost('/api/admin/assets/recount')
export const restoreAsset = (id: number) => apiPost(`/api/admin/assets/${id}/restore`)

// ========== 素材上传（复用已有 POST /api/admin/assets；返回 AssetOut）==========
// 用法：表单里拿到 File 后直接 await uploadAsset(file, '门店') 即可，
// 响应中 path 是裸逻辑路径（uploads/2026/08/<uuid>.<ext>），前端展示需拼 /media/{path}。
export interface AssetUploadResult {
  id: number
  path: string
  original_name: string
  category: string
  mime: string
  size: number
  ref_count: number
}
export const uploadAsset = (file: File, category = '通用'): Promise<AssetUploadResult> => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('category', category)
  return apiPost('/api/admin/assets', fd) as Promise<AssetUploadResult>
}

// ========== 媒体路径工具 ==========
// 把后端返回的逻辑路径（uploads/2026/08/x.jpg）或已带 /media 前缀的路径，
// 统一归一为可直接喂给 <img src> 的 /media/uploads/...。
// - 后端 store.cover / service.cover / article.cover 等 seed 时已含 /media 前缀；
// - 素材库（asset.path）是无前缀的逻辑路径；
// 两类风格并存，统一靠前端拼前缀兼容，避免在多处重复判断。
export const mediaUrl = (path?: string | null): string => {
  if (!path) return ''
  if (path.startsWith('/media/') || path.startsWith('http://') || path.startsWith('https://')) return path
  return `/media/${path.replace(/^\/+/, '')}`
}

// ========== 组织架构 ==========
export const orgTypes = () => apiGet('/api/admin/org/types')
export const orgTree = () => apiGet('/api/admin/org/tree')
export const orgList = () => apiGet('/api/admin/org')
export const createOrg = (data: any) => apiPost('/api/admin/org', data)
export const updateOrg = (id: number, data: any) => apiPut(`/api/admin/org/${id}`, data)
export const deleteOrg = (id: number) => apiDelete(`/api/admin/org/${id}`)

// ========== 公开（展示用）=========
export const getDoctorsPublic = () => apiGet('/api/public/doctors')
export const getStoresPublic = () => apiGet('/api/public/stores')
