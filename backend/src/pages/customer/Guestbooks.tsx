// 留言管理：接收前台「联系我们」与「在线客服」统一入口提交的留言
import { useEffect, useState } from 'react'
import { Table, Tag, Button, Space, Input, Drawer, message, Popconfirm } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { listGuestbooks, patchGuestbookStatus, deleteGuestbook } from '../../api/m2'

interface Row {
  id: number
  name: string
  phone: string
  content: string
  status: number
  created_date: string
}

const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '未处理', color: 'gold' },
  1: { label: '已处理', color: 'green' },
}

export default function Guestbooks() {
  const [data, setData] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [detail, setDetail] = useState<Row | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = () => {
    setLoading(true)
    listGuestbooks({ q, status, page, page_size: 10 })
      .then((d: any) => {
        setData(d.items || [])
        setTotal(d.total || 0)
      })
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page, q, status])

  const toggleStatus = (row: Row, newStatus: number) => {
    patchGuestbookStatus(row.id, newStatus)
      .then(() => {
        message.success('状态已更新')
        load()
      })
      .catch((e: any) => message.error(e.message))
  }

  const remove = (id: number) => {
    deleteGuestbook(id)
      .then(() => {
        message.success('已删除')
        load()
      })
      .catch((e: any) => message.error(e.message))
  }

  const openDetail = (row: Row) => {
    setDetail(row)
    setDrawerOpen(true)
  }

  const columns: ColumnsType<Row> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '称呼', dataIndex: 'name', width: 100 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    {
      title: '留言内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string, r: Row) => (
        <Button type="link" className="p-0" onClick={() => openDetail(r)}>{v}</Button>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      filters: [
        { text: '未处理', value: 0 },
        { text: '已处理', value: 1 },
      ],
      onFilter: (value: any, r: Row) => r.status === value,
      render: (s: number) => <Tag color={STATUS[s]?.color}>{STATUS[s]?.label}</Tag>,
    },
    {
      title: '提交时间',
      dataIndex: 'created_date',
      width: 180,
      render: (t: string) => (t ? t.replace('T', ' ').slice(0, 19) : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, r: Row) => (
        <Space size="small">
          {r.status === 0 ? (
            <Button type="primary" size="small" onClick={() => toggleStatus(r, 1)}>
              标记已处理
            </Button>
          ) : (
            <Button size="small" onClick={() => toggleStatus(r, 0)}>
              标记未处理
            </Button>
          )}
          <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}>
            <Button danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">留言处理</h1>
        <Space>
          <Input.Search
            placeholder="搜索姓名 / 手机号 / 内容"
            allowClear
            onSearch={(v) => { setQ(v); setPage(1) }}
            style={{ width: 260 }}
          />
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: (p) => setPage(p),
        }}
      />

      <Drawer
        title="留言详情"
        width={420}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sub">称呼</span>
              <span className="font-medium">{detail.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sub">手机号</span>
              <a href={`tel:${detail.phone}`} className="font-medium text-brand">{detail.phone}</a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sub">状态</span>
              <Tag color={STATUS[detail.status]?.color}>{STATUS[detail.status]?.label}</Tag>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sub">提交时间</span>
              <span>{detail.created_date?.replace('T', ' ')?.slice(0, 19) || '-'}</span>
            </div>
            <div>
              <span className="text-sub">留言内容</span>
              <p className="mt-2 rounded-lg bg-mist p-3 text-sm leading-relaxed">{detail.content}</p>
            </div>
            <div className="flex gap-3 pt-2">
              {detail.status === 0 ? (
                <Button type="primary" onClick={() => { toggleStatus(detail, 1); setDrawerOpen(false) }}>
                  标记已处理
                </Button>
              ) : (
                <Button onClick={() => { toggleStatus(detail, 0); setDrawerOpen(false) }}>
                  标记未处理
                </Button>
              )}
              <Popconfirm title="确认删除？" onConfirm={() => { remove(detail.id); setDrawerOpen(false) }}>
                <Button danger>删除</Button>
              </Popconfirm>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
