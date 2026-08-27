// 家长端业务接口封装：对照方案 §6 Parent / §7 我的账户
import { get, post, http } from './client'

// 资料
export const getProfile = () => get<{ id: number; phone: string; nickname: string; avatar: string; status: number }>('/api/parent/profile')
export const updateProfile = (data: { nickname?: string; avatar?: string }) => post('/api/parent/profile', data)

// 孩子档案
export interface ChildItem {
  id: number
  parent_id: number
  name: string
  gender: number // 1=男 2=女
  birth_date: string
  remark: string
  first_visit: number
}
export const listChildren = () => get<ChildItem[]>('/api/parent/children')
export const createChild = (data: { name: string; gender: number; birth_date: string; remark?: string; first_visit?: number }) =>
  post<ChildItem>('/api/parent/children', data)
export const updateChild = (id: number, data: { name: string; gender: number; birth_date: string; remark?: string; first_visit?: number }) =>
  post<ChildItem>(`/api/parent/children/${id}`, data)
export const deleteChild = (id: number) => post(`/api/parent/children/${id}`, {})

// 我的预约
export interface ParentAppointment {
  id: number
  appointment_no: string
  store_name: string
  service_name: string
  child_name: string
  want_date: string
  want_slot: string
  status: string
  cancel_reason: string | null
  created_date: string
}
export const listAppointments = (params?: { status?: string; page?: number; page_size?: number }) =>
  get<{ items: ParentAppointment[]; total: number; page: number; page_size: number }>('/api/parent/appointments', params)
export const getAppointment = (id: number) => get<any>(`/api/parent/appointments/${id}`)
export const cancelAppointment = (id: number) => post(`/api/parent/appointments/${id}/cancel`, {})

// 兼容旧封装：部分页面直接引用 http
export { http }
