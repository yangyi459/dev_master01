// 患者管理（后台 M2）：标签行内编辑 + 档案查看；门店隔离由后端按 data_scope 控制
import { useEffect, useState } from 'react'
import { Table, Tag, Button, Space, Modal, Form, Input, Drawer, message, Descriptions } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { listPatients, getPatient, updatePatient } from '../api/m2'
import TablePagination from '../components/TablePagination'

interface Row {
  id: number
  phone: string
  nickname: string
  child_count: number
  appointment_count: number
  tags: string
  remark: string
}

export default function Patients() {
  const [data, setData] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')

  const [editRow, setEditRow] = useState<Row | null>(null)
  const [form] = Form.useForm()
  const [detail, setDetail] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = () => {
    setLoading(true)
    listPatients({ q, page, page_size: 10 })
      .then((d: any) => { setData(d.items || []); setTotal(d.total || 0) })
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [page, q])

  const openEdit = (r: Row) => { setEditRow(r); form.setFieldsValue({ tags: r.tags, remark: r.remark }); }
  const submitEdit = async () => {
    const v = await form.validateFields()
    try {
      await updatePatient(editRow!.id, v)
      message.success('已更新标签/备注')
      setEditRow(null); load()
    } catch (e: any) { message.error(e.message) }
  }
  const openDetail = (id: number) => {
    getPatient(id).then((d: any) => { setDetail(d); setDetailOpen(true) }).catch((e: any) => message.error(e.message))
  }

  const columns: ColumnsType<Row> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '昵称', dataIndex: 'nickname', width: 120 },
    { title: '孩子数', dataIndex: 'child_count', width: 80 },
    { title: '预约数', dataIndex: 'appointment_count', width: 80 },
    {
      title: '标签', dataIndex: 'tags', width: 200,
      render: (t: string) => (t ? t.split(',').filter(Boolean).map((x) => <Tag key={x} color="orange">{x}</Tag>) : <span className="text-sub">—</span>),
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true, render: (r: string) => r || <span className="text-sub">—</span> },
    {
      title: '操作', key: 'op', width: 160, fixed: 'right',
      render: (_: any, r: Row) => (
        <Space>
          <Button type="link" size="small" onClick={() => openDetail(r.id)}>档案</Button>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑标签</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Input.Search placeholder="手机号 / 昵称" allowClear style={{ width: 240, marginBottom: 12 }} onSearch={(v) => setQ(v)} />

      <Table
        rowKey="id" loading={loading} dataSource={data} columns={columns}
        scroll={{ x: 1000 }}
        pagination={false}
        size="middle"
      />
      <div className="mt-3">
        <TablePagination total={total} pageSize={10} current={page} onChange={setPage} />
      </div>

      <Modal title="编辑患者标签 / 备注" open={editRow != null} onOk={submitEdit} onCancel={() => setEditRow(null)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="tags" label="标签（逗号分隔）">
            <Input placeholder="如：高复诊意愿,正畸意向" />
          </Form.Item>
          <Form.Item name="remark" label="备注（仅后台可见）">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="患者档案" width={520} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {detail && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="手机号">{detail.phone}</Descriptions.Item>
              <Descriptions.Item label="昵称">{detail.nickname}</Descriptions.Item>
              <Descriptions.Item label="标签">{(detail.tags || '').split(',').filter(Boolean).map((x: string) => <Tag key={x} color="orange">{x}</Tag>)}</Descriptions.Item>
              <Descriptions.Item label="备注">{detail.remark || '—'}</Descriptions.Item>
            </Descriptions>
            <h4 className="mt-6 mb-2 text-sm font-semibold">孩子档案</h4>
            {detail.children?.length ? detail.children.map((c: any) => (
              <div key={c.id} className="rounded border border-line p-2 text-sm mb-2">
                {c.name}（{c.gender === 1 ? '男' : '女'}）· 出生 {c.birth_date}{c.first_visit === 1 ? ' · 首诊' : ''}
                {c.remark && <div className="text-sub">备注：{c.remark}</div>}
              </div>
            )) : <div className="text-sub text-sm">无</div>}
            <h4 className="mt-6 mb-2 text-sm font-semibold">最近预约</h4>
            {detail.recent_appointments?.length ? detail.recent_appointments.map((a: any) => (
              <div key={a.id} className="rounded border border-line p-2 text-sm mb-2">
                {a.appointment_no} · {a.store_name} · {a.service_name} · <Tag>{a.status}</Tag>
              </div>
            )) : <div className="text-sub text-sm">无</div>}
          </>
        )}
      </Drawer>
    </div>
  )
}
