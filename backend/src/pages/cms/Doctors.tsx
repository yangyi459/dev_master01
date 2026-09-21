// 医生管理（CMS）
import CmsCrud, { FieldDef } from '../../components/CmsCrud'
import { Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const media = (p?: string) => (p ? (p.startsWith('http') || p.startsWith('/media') ? p : '/media/' + p.replace(/^\/+/, '')) : '')

const columns: ColumnsType<any> = [
  { title: '头像', dataIndex: 'avatar', width: 70, render: (v) => (v ? <img src={media(v)} className="h-10 w-10 rounded-full object-cover" /> : <span className="text-sub">—</span>) },
  { title: '姓名', dataIndex: 'name' },
  { title: '职称', dataIndex: 'title', width: 110 },
  { title: '从医年限', dataIndex: 'years', width: 90, render: (v) => (v ? `${v} 年` : '—') },
  { title: '评分', dataIndex: 'rating', width: 80, render: (v) => (v ? `⭐${v}` : '—') },
  { title: '评价数', dataIndex: 'review_count', width: 80 },
  { title: '门店ID', dataIndex: 'store_id', width: 90 },
  { title: '状态', dataIndex: 'status', width: 80, render: (v) => (v === 1 ? <Tag color="green">在岗</Tag> : <Tag>休假</Tag>) },
]
export const fields: FieldDef[] = [
  { name: 'name', label: '姓名', required: true },
  { name: 'title', label: '职称', placeholder: '如 主治医师' },
  { name: 'store_id', label: '门店ID', type: 'number', required: true, placeholder: '对应 stores.id' },
  { name: 'years', label: '从医年限', type: 'number', placeholder: '年' },
  { name: 'graduated', label: '毕业院校' },
  { name: 'good_at', label: '擅长', type: 'textarea' },
  { name: 'honors', label: '荣誉资质', type: 'textarea' },
  { name: 'intro', label: '个人简介', type: 'textarea' },
  { name: 'bio', label: '资质背景', type: 'textarea' },
  { name: 'rating', label: '评分', type: 'number', placeholder: '1-5' },
  { name: 'review_count', label: '评价数', type: 'number' },
  { name: 'avatar', label: '头像', type: 'image' },
  { name: 'status', label: '在岗', type: 'switch' },
]

export default function Doctors() {
  return <CmsCrud title="医生管理" basePath="/api/admin/doctors" columns={columns} fields={fields} detailPath="/cms/doctors" />
}
