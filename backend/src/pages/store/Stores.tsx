// 门店管理（基础 CRUD）
import CmsCrud, { FieldDef } from '../../components/CmsCrud'
import type { ColumnsType } from 'antd/es/table'

const columns: ColumnsType<any> = [
  { title: '门店名称', dataIndex: 'name' },
  { title: '地址', dataIndex: 'address', ellipsis: true },
  { title: '电话', dataIndex: 'phone', width: 130 },
  { title: '营业时间', dataIndex: 'hours', width: 140 },
  { title: '状态', dataIndex: 'status', width: 90, render: (v) => (v === 1 ? <span className="text-green-600">营业中</span> : <span className="text-sub">筹建中</span>) },
]
const fields: FieldDef[] = [
  { name: 'name', label: '门店名称', required: true },
  { name: 'address', label: '地址', type: 'textarea', required: true },
  { name: 'phone', label: '电话', required: true },
  { name: 'hours', label: '营业时间', placeholder: '09:00-21:00' },
  { name: 'lng', label: '经度 lng', type: 'number', placeholder: '如 121.50' },
  { name: 'lat', label: '纬度 lat', type: 'number', placeholder: '如 31.23' },
  { name: 'intro', label: '简介', type: 'textarea' },
  { name: 'cover', label: '封面', type: 'image' },
  { name: 'status', label: '营业中', type: 'switch' },
]

export default function Stores() {
  return <CmsCrud title="门店" basePath="/api/admin/stores" columns={columns} fields={fields} />
}
