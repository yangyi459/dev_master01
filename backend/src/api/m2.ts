// 后台 M2 业务接口封装：预约/患者/角色/管理员/菜单/权限/留言
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from './client'

// ========== 留言管理 ==========
export const listGuestbooks = (params?: any) => apiGet('/api/admin/guestbooks', params)
export const patchGuestbookStatus = (id: number, status: number) => apiPatch(`/api/admin/guestbooks/${id}/status`, { status })
export const deleteGuestbook = (id: number) => apiDelete(`/api/admin/guestbooks/${id}`)

// ========== 预约 / 线索 ==========
export const listAppointments = (params?: any) => apiGet('/api/admin/appointments', params)
export const getAppointment = (id: number) => apiGet(`/api/admin/appointments/${id}`)
export const patchAppointmentStatus = (id: number, status: string) => apiPut(`/api/admin/appointments/${id}`, { status })
export const assignAppointment = (id: number, advisorId: number) => apiPost(`/api/admin/appointments/${id}/assign`, { advisor_id: advisorId })
export const confirmAppointment = (id: number, data: { store_id: number; doctor_id: number; date: string; slot: string }) =>
  apiPost(`/api/admin/appointments/${id}/confirm`, data)
export const arriveAppointment = (id: number) => apiPost(`/api/admin/appointments/${id}/arrive`, {})
export const cancelAppointment = (id: number) => apiPost(`/api/admin/appointments/${id}/cancel`, {})
export const deleteAppointment = (id: number) => apiDelete(`/api/admin/appointments/${id}`)
export const listFollowups = (id: number) => apiGet(`/api/admin/appointments/${id}/followups`)
export const addFollowup = (id: number, content: string) => apiPost(`/api/admin/appointments/${id}/followups`, { content })

// ========== 患者 ==========
export const listPatients = (params?: any) => apiGet('/api/admin/patients', params)
export const getPatient = (id: number) => apiGet(`/api/admin/patients/${id}`)
export const updatePatient = (id: number, data: { tags?: string; remark?: string }) => apiPut(`/api/admin/patients/${id}`, data)

// ========== 角色与权限 ==========
export const listRoles = () => apiGet('/api/admin/roles')
export const getRole = (id: number) => apiGet(`/api/admin/roles/${id}`)
export const createRole = (data: any) => apiPost('/api/admin/roles', data)
export const saveRole = (id: number, data: { menu_ids: number[]; permission_ids: number[] }) => apiPut(`/api/admin/roles/${id}`, data)
export const deleteRole = (id: number) => apiDelete(`/api/admin/roles/${id}`)
export const listMenus = () => apiGet('/api/admin/menus')
export const listPermissions = () => apiGet('/api/admin/permissions')

// ========== 操作日志 ==========
export const listLogs = (params?: any) => apiGet('/api/admin/logs', params)
export const getAbout = () => apiGet('/api/admin/about')
export const updateAbout = (block: string, data: { title?: string; content?: string }) => apiPut(`/api/admin/about/${block}`, data)

// ========== 管理员 ==========
export const listAdmins = () => apiGet('/api/admin/admins')
export const createAdmin = (data: any) => apiPost('/api/admin/admins', data)
export const updateAdmin = (id: number, data: any) => apiPut(`/api/admin/admins/${id}`, data)
export const toggleAdmin = (id: number, status: number) => apiPut(`/api/admin/admins/${id}`, { status })
export const deleteAdmin = (id: number) => apiDelete(`/api/admin/admins/${id}`)
