// 权益配置管理（M3 占位，M1 可做基础增删改）
import { Alert } from 'antd'
import CmsCrud, { FieldDef } from '../../components/CmsCrud'
import type { ColumnsType } from 'antd/es/table'

const columns: ColumnsType<any> = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '名称', dataIndex: 'name' },
  { title: '有效天数', dataIndex: 'valid_days', width: 100 },
  { title: '状态', dataIndex: 'status', width: 80, render: (v) => (v === 1 ? '启用' : '停用') },
]
const fields: FieldDef[] = [
  { name: 'name', label: '名称', required: true },
  { name: 'desc', label: '说明', type: 'textarea' },
  { name: 'valid_days', label: '有效天数', type: 'number' },
  { name: 'status', label: '启用', type: 'switch' },
]

export default function Benefits() {
  return (
    <div>
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="权益配置（M3 占位）"
        description="本期仅支持权益名称/说明/有效天数/启用状态的配置维护；实际发放与核销（核销码、领取记录）不在本期范围内，后续版本接入。"
      />
      <CmsCrud title="权益配置" basePath="/api/admin/benefits" columns={columns} fields={fields} />
    </div>
  )
}
