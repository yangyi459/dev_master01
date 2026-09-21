// 真实案例管理（CMS）
import CmsCrud, { FieldDef } from '../../components/CmsCrud'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const media = (p?: string) => (p ? (p.startsWith('http') || p.startsWith('/media') ? p : '/media/' + p.replace(/^\/+/, '')) : '')

const columns: ColumnsType<any> = [
  { title: '封面', dataIndex: 'cover', width: 90, render: (v) => (v ? <img src={media(v)} className="h-[46px] w-[68px] rounded object-cover" /> : <span className="text-sub">—</span>) },
  { title: '标题', dataIndex: 'title' },
  { title: '项目ID', dataIndex: 'service_id', width: 90 },
  { title: '年龄区间', dataIndex: 'age_bucket', width: 100, render: (v) => (v ? `${v} 岁` : '—') },
  { title: '状态', dataIndex: 'status', width: 80, render: (v) => (v === 1 ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>) },
]
export const fields: FieldDef[] = [
  { name: 'title', label: '标题', required: true },
  { name: 'service_id', label: '项目ID', type: 'number', required: true, placeholder: '对应 services.id' },
  { name: 'doctor_id', label: '主诊医生ID', type: 'number', placeholder: '对应 doctors.id，可空' },
  { name: 'age_bucket', label: '年龄区间', placeholder: '3-6 / 6-9 / 9-12' },
  { name: 'summary', label: '摘要', type: 'textarea' },
  { name: 'anonymous_desc', label: '匿名化说明', type: 'textarea' },
  { name: 'timeline', label: '治疗经过', type: 'list', itemShape: 'pair', subFields: [{ key: 'time', label: '时间' }, { key: 'title', label: '步骤名' }, { key: 'desc', label: '说明' }] },
  { name: 'advice', label: '医生建议', type: 'list', itemShape: 'pair', subFields: [{ key: 'title', label: '要点' }, { key: 'body', label: '说明' }] },
  { name: 'followup', label: '家长回访', type: 'list', itemShape: 'pair', subFields: [{ key: 'tag', label: '时间点' }, { key: 'text', label: '内容' }] },
  { name: 'notes', label: '重要提醒', type: 'list', itemShape: 'text', placeholder: '每行一条重要提醒' },
  { name: 'cover', label: '封面图', type: 'image' },
  { name: 'status', label: '发布', type: 'switch' },
]

export default function Cases() {
  return <CmsCrud title="真实案例" basePath="/api/admin/cases" columns={columns} fields={fields} detailPath="/cms/cases" />
}
