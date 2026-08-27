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
}) => apiPost('/api/admin/schedules/batch', data)
export const patchSchedule = (id: number, available: number) =>
  apiPatch(`/api/admin/schedules/${id}`, { available })

// ========== 看板聚合 ==========
export const dashSummary = () => apiGet('/api/admin/dashboard/summary')
export const dashTodos = () => apiGet('/api/admin/dashboard/todos')
export const dashTrend = (days = 30) => apiGet('/api/admin/dashboard/trend', { days })
export const dashFunnel = () => apiGet('/api/admin/dashboard/funnel')
export const dashStores = () => apiGet('/api/admin/dashboard/stores')
export const dashContent = () => apiGet('/api/admin/dashboard/content')
export const dashChannels = () => apiGet('/api/admin/dashboard/channels')

// ========== 素材引用计数 + 恢复 ==========
export const recountAssets = () => apiPost('/api/admin/assets/recount')
export const restoreAsset = (id: number) => apiPost(`/api/admin/assets/${id}/restore`)

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
