// 首页配置管理（CMS）：列表视图，新增/编辑跳转独立全屏详情页（/cms/home/new、/edit/:id）
// 列表：封面 / 标题 / 副标题 / 类型 / 排序 / 状态 / 更新时间；行内保留快捷上架/下架
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Space, Popconfirm, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiGet, apiPut, apiDelete } from '../../api/client'


const TYPE_LABEL: Record<string, string> = {
  banner: '轮播 Banner', value: '价值点', service: '诊疗项目', case: '案例', article: '科普', trust: '信任背书',
}

export default function HomeItems() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, ctx] = message.useMessage()
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    apiGet('/api/admin/home-items')
      .then((d: any) => setData(Array.isArray(d) ? d : (d?.items ?? [])))
      .catch((e: any) => msg.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const toggle = (r: any) => {
    apiPut(`/api/admin/home-items/${r.id}`, { status: r.status === 1 ? 0 : 1 })
      .then(() => { msg.success('已更新'); load() }).catch((e: any) => msg.error(e.message))
  }
  const remove = (r: any) => apiDelete(`/api/admin/home-items/${r.id}`).then(() => { msg.success('已删除'); load() }).catch((e: any) => msg.error(e.message))

  const columns: ColumnsType<any> = [
    {
      title: '封面', dataIndex: 'image', width: 110,
      render: (v: string) => v ? <img src={v} alt="" className="h-12 w-20 rounded object-cover" /> : <span className="text-sub">—</span>,
    },
    { title: '标题', dataIndex: 'title' },
    { title: '副标题', dataIndex: 'subtitle', ellipsis: true },
    { title: '类型', dataIndex: 'item_type', width: 100, render: (v: string) => <Tag>{TYPE_LABEL[v] || v}</Tag> },
    { title: '排序', dataIndex: 'sort', width: 70 },
    { title: '状态', dataIndex: 'status', width: 80, render: (v: number) => (v === 1 ? <Tag color="green">上架</Tag> : <Tag>下架</Tag>) },
    { title: '更新时间', dataIndex: 'updated_date', width: 170, render: (v: string) => (v ? String(v).replace('T', ' ').slice(0, 19) : '—') },
    {
      title: '操作', key: 'op', width: 170,
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/cms/home/edit/${r.id}`, { state: { row: r } })}>编辑</Button>
          <Button type="link" size="small" onClick={() => toggle(r)}>{r.status === 1 ? '下架' : '上架'}</Button>
          <Popconfirm title="确认删除？" onConfirm={() => remove(r)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {ctx}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">首页配置（Banner / 区块）</h2>
        <Button type="primary" onClick={() => navigate('/cms/home/new')}>新增配置</Button>
      </div>
      <Table rowKey="id" loading={loading} dataSource={data} columns={columns} pagination={false} size="middle" />
    </div>
  )
}
