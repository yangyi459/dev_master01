// 操作日志（后台系统）：分页列表 + 动作/对象类型筛选（只读）
import { useEffect, useState } from 'react'
import { Table, Select, Input, Space, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { listLogs } from '../../api/m2'

const ACTION_LABEL: Record<string, string> = {
  create: '新增', update: '修改', delete: '删除',
  confirm: '确认', arrive: '到诊', cancel: '取消',
}
const ACTION_TARGET: Record<string, string> = {
  service: '诊疗项目', case: '真实案例', article: '口腔科普', doctor: '医生',
  store: '门店', page: '独立页面', category: '分类', admin: '管理员',
  appointment: '预约', benefit: '权益', home_item: '首页配置', asset: '素材', org: '组织架构',
}

interface Row {
  id: number
  admin_id: number
  creator: string
  action: string
  target_type: string
  target_id: number
  detail: string
  created_date: string
}

export default function Logs() {
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<string | undefined>()
  const [targetType, setTargetType] = useState<string | undefined>()

  const fetchData = (p: number, act?: string, tt?: string) => {
    setLoading(true)
    listLogs({ action: act, target_type: tt, page: p, page_size: 20 })
      .then((d: any) => setData(d?.items ?? []))
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData(1) }, [])

  const columns: ColumnsType<Row> = [
    { title: '操作人', dataIndex: 'creator', width: 120 },
    { title: '操作类型', dataIndex: 'action', width: 100, render: (a: string) => <Tag color="blue">{ACTION_LABEL[a] || a}</Tag> },
    { title: '操作对象', width: 170, render: (r: any) => `${ACTION_TARGET[r.target_type] || r.target_type} #${r.target_id}` },
    {
      title: '操作时间', dataIndex: 'created_date', width: 180,
      render: (t: string) => (t ? t.replace('T', ' ').slice(0, 19) : ''),
    },
    { title: '操作内容', dataIndex: 'detail', ellipsis: true },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          placeholder="动作"
          allowClear
          style={{ width: 140 }}
          value={action}
          onChange={(v) => { setAction(v); fetchData(1, v, targetType) }}
          options={Object.entries(ACTION_LABEL).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Input.Search
          placeholder="按对象类型筛选（如 service）"
          allowClear
          style={{ width: 220 }}
          onSearch={(v) => { setTargetType(v || undefined); fetchData(1, action, v || undefined) }}
        />
        <a onClick={() => fetchData(1, action, targetType)}>刷新</a>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 20 }}
        size="middle"
      />
    </div>
  )
}
