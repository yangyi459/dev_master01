// 独立页面管理（CMS）：按 slug 更新（updateByBody）
import CmsCrud, { FieldDef } from '../../components/CmsCrud'
import type { ColumnsType } from 'antd/es/table'

const columns: ColumnsType<any> = [
  { title: '路由', dataIndex: 'slug', width: 120, render: (v: string) => (v ? `/${v}` : '—') },
  { title: '页面名称', dataIndex: 'title' },
  { title: '状态', dataIndex: 'status', width: 90, render: (v: number) => (v === 1 ? <span className="text-green-600">已发布</span> : <span className="text-sub">草稿</span>) },
  { title: '更新时间', dataIndex: 'updated_date', width: 180, render: (v: string) => (v ? String(v).replace('T', ' ').slice(0, 19) : '—') },
]
const fields: FieldDef[] = [
  { name: 'slug', label: '路由 Slug', required: true, placeholder: '如 privacy / terms / disclaimer' },
  { name: 'title', label: '页面名称', required: true },
  { name: 'content', label: '正文', type: 'textarea' },
  { name: 'status', label: '状态', type: 'switch' },
]

export default function Pages() {
  // 后端 PUT /api/admin/pages 按请求体 slug 更新，故 updateByBody=true
  return (
    <CmsCrud
      title="独立页面"
      basePath="/api/admin/pages"
      columns={columns}
      fields={fields}
      rowKey="slug"
      updateByBody
    />
  )
}
