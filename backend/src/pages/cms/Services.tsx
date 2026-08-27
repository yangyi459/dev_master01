// 诊疗项目管理（CMS）
import CmsCrud, { FieldDef } from '../../components/CmsCrud'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const media = (p?: string) => (p ? (p.startsWith('http') || p.startsWith('/media') ? p : '/media/' + p.replace(/^\/+/, '')) : '')

const columns: ColumnsType<any> = [
  { title: '封面', dataIndex: 'cover', width: 90, render: (v) => (v ? <img src={media(v)} className="h-[46px] w-[68px] rounded object-cover" /> : <span className="text-sub">—</span>) },
  { title: '名称', dataIndex: 'name' },
  { title: '分类ID', dataIndex: 'category_id', width: 90 },
  { title: '适用年龄', dataIndex: 'age_range', width: 110, render: (v) => v || '—' },
  { title: '价格区间', dataIndex: 'price_range', width: 120, render: (v) => v || '—' },
  { title: '状态', dataIndex: 'status', width: 80, render: (v) => (v === 1 ? <Tag color="green">上架</Tag> : <Tag>下架</Tag>) },
]
const fields: FieldDef[] = [
  { name: 'name', label: '名称', required: true },
  { name: 'category_id', label: '分类ID', type: 'number', required: true, placeholder: '对应 service_categories.id' },
  { name: 'age_range', label: '适用年龄', placeholder: '如 3-12岁' },
  { name: 'price_range', label: '价格区间', placeholder: '如 ¥800-1500' },
  { name: 'intro', label: '项目介绍', type: 'textarea' },
  { name: 'cover', label: '封面图', type: 'image' },
  { name: 'status', label: '上架', type: 'switch' },
]

export default function Services() {
  return <CmsCrud title="诊疗项目" basePath="/api/admin/services" columns={columns} fields={fields} />
}
