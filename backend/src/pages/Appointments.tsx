// 预约 / 线索管理（后台 M2）
import { useEffect, useMemo, useState } from 'react'
import { Table, Tag, Button, Space, Modal, Form, Select, Input, Drawer, message, Popconfirm, Descriptions } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  listAppointments,
  getAppointment,
  confirmAppointment,
  arriveAppointment,
  cancelAppointment,
  deleteAppointment,
  listFollowups,
  addFollowup,
  assignAppointment,
  listAdmins,
} from '../api/m2'
import { apiGet } from '../api/client'

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'gold' },
  confirmed: { label: '已确认', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
}
const SLOTS = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '14:00-15:00', '15:00-16:00', '16:00-17:00']

interface Row {
  id: number
  appointment_no: string
  parent_phone: string
  parent_nickname: string
  store_name: string
  service_name: string
  child_name: string
  want_date: string
  want_slot: string
  status: string
  advisor_name: string
  created_date: string
}

export default function Appointments() {
  const [data, setData] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ store_id: undefined as number | undefined, status: undefined as string | undefined, q: '' })
  const [stores, setStores] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [admins, setAdmins] = useState<any[]>([])

  const [detail, setDetail] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [followups, setFollowups] = useState<any[]>([])
  const [followText, setFollowText] = useState('')

  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [confirmForm] = Form.useForm()
  const [confirmStore, setConfirmStore] = useState<number | undefined>()
  const [assignId, setAssignId] = useState<number | null>(null)
  const [assignForm] = Form.useForm()

  const load = () => {
    setLoading(true)
    listAppointments({ ...filters, page, page_size: 10 })
      .then((d: any) => { setData(d.items || []); setTotal(d.total || 0) })
      .catch((e: any) => message.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [page, filters])
  useEffect(() => {
    apiGet('/api/admin/stores').then((d: any) => setStores(d?.items ?? d?.list ?? [])).catch(() => {})
    apiGet('/api/admin/doctors').then((d: any) => setDoctors(d?.items ?? d?.list ?? [])).catch(() => {})
    listAdmins().then((d: any) => setAdmins(Array.isArray(d) ? d : (d?.items ?? d?.list ?? []))).catch(() => {})
  }, [])

  const doctorsByStore = useMemo(() => (confirmStore ? doctors.filter((d) => d.store_id === confirmStore) : doctors), [doctors, confirmStore])

  const openDetail = (id: number) => {
    getAppointment(id).then((d: any) => { setDetail(d); setDetailOpen(true); return listFollowups(id) }).then((f: any) => setFollowups(f || [])).catch((e: any) => message.error(e.message))
  }
  const submitFollow = () => {
    if (!detail || !followText.trim()) return
    addFollowup(detail.id, followText).then(() => listFollowups(detail.id)).then((f: any) => { setFollowups(f || []); setFollowText('') }).catch((e: any) => message.error(e.message))
  }

  const doConfirm = async () => {
    const v = await confirmForm.validateFields()
    try {
      await confirmAppointment(confirmId!, v)
      message.success('已确认排期')
      setConfirmId(null); confirmForm.resetFields(); setConfirmStore(undefined)
      load()
    } catch (e: any) { message.error(e.message) }
  }
  const doArrive = (id: number) => arriveAppointment(id).then(() => { message.success('已到诊'); load() }).catch((e: any) => message.error(e.message))
  const doCancel = (id: number) => cancelAppointment(id).then(() => { message.success('已取消'); load() }).catch((e: any) => message.error(e.message))
  const doDelete = (id: number) => deleteAppointment(id).then(() => { message.success('已删除'); load() }).catch((e: any) => message.error(e.message))
  const doAssign = async () => {
    const v = await assignForm.validateFields()
    try { await assignAppointment(assignId!, v.advisor_id); message.success('已分配顾问'); setAssignId(null); load() } catch (e: any) { message.error(e.message) }
  }

  const columns: ColumnsType<Row> = [
    { title: '单号', dataIndex: 'appointment_no', width: 150 },
    { title: '家长', width: 130, render: (_: any, r: Row) => `${r.parent_nickname || '匿名'}\n${r.parent_phone}` },
    { title: '门店', dataIndex: 'store_name', width: 110 },
    { title: '项目', dataIndex: 'service_name', width: 120 },
    { title: '孩子', dataIndex: 'child_name', width: 90 },
    { title: '意向时段', width: 150, render: (_: any, r: Row) => `${r.want_date} ${r.want_slot}` },
    { title: '状态', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={STATUS[s]?.color}>{STATUS[s]?.label || s}</Tag> },
    { title: '跟进顾问', dataIndex: 'advisor_name', width: 100 },
    { title: '提交时间', dataIndex: 'created_date', width: 160 },
    {
      title: '操作', key: 'op', width: 220, fixed: 'right',
      render: (_: any, r: Row) => (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => openDetail(r.id)}>详情</Button>
          {r.status === 'pending' && <Button type="link" size="small" onClick={() => { setConfirmId(r.id); setConfirmStore(undefined); confirmForm.resetFields() }}>确认排期</Button>}
          {r.status === 'confirmed' && <Button type="link" size="small" onClick={() => doArrive(r.id)}>到诊</Button>}
          {(r.status === 'pending' || r.status === 'confirmed') && <Button type="link" size="small" danger onClick={() => doCancel(r.id)}>取消</Button>}
          <Popconfirm title="确认删除？" onConfirm={() => doDelete(r.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select placeholder="门店" allowClear style={{ width: 140 }} value={filters.store_id} onChange={(v) => setFilters({ ...filters, store_id: v })} options={stores.map((s) => ({ value: s.id, label: s.name }))} />
        <Select placeholder="状态" allowClear style={{ width: 120 }} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={Object.entries(STATUS).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Input.Search placeholder="单号/姓名/手机号" allowClear style={{ width: 220 }} onSearch={(v) => setFilters({ ...filters, q: v })} />
      </div>

      <Table
        rowKey="id" loading={loading} dataSource={data} columns={columns}
        scroll={{ x: 1100 }}
        pagination={{ total, current: page, pageSize: 10, showTotal: (t) => `共 ${t} 条`, onChange: (p) => setPage(p) }}
        size="middle"
      />

      {/* 详情抽屉 */}
      <Drawer title="预约详情" width={520} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {detail && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="单号">{detail.appointment_no}</Descriptions.Item>
              <Descriptions.Item label="家长">{detail.parent_nickname}（{detail.parent_phone}）</Descriptions.Item>
              <Descriptions.Item label="门店">{detail.store_name}</Descriptions.Item>
              <Descriptions.Item label="项目">{detail.service_name}</Descriptions.Item>
              <Descriptions.Item label="孩子">{detail.child_name}</Descriptions.Item>
              <Descriptions.Item label="意向时段">{detail.want_date} {detail.want_slot}</Descriptions.Item>
              <Descriptions.Item label="确认排期">{detail.confirmed_date} {detail.confirmed_slot}（{detail.confirmed_doctor_name}）</Descriptions.Item>
              <Descriptions.Item label="联系人">{detail.contact_name} {detail.contact_phone}</Descriptions.Item>
              <Descriptions.Item label="备注">{detail.note}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={STATUS[detail.status]?.color}>{STATUS[detail.status]?.label}</Tag></Descriptions.Item>
            </Descriptions>
            <div className="mt-4 flex gap-2">
              <Button size="small" onClick={() => setAssignId(detail.id)}>分配顾问</Button>
            </div>
            <h4 className="mt-6 mb-2 text-sm font-semibold">跟进记录</h4>
            <div className="space-y-2">
              {followups.map((f) => (
                <div key={f.id} className="rounded border border-line p-2 text-sm">
                  <div className="text-sub">{f.admin_name} · {f.created_date}</div>
                  <div>{f.content}</div>
                </div>
              ))}
              {followups.length === 0 && <div className="text-sub text-sm">暂无跟进</div>}
            </div>
            <Input.TextArea rows={2} className="mt-2" value={followText} onChange={(e) => setFollowText(e.target.value)} placeholder="添加跟进内容" />
            <Button className="mt-2" type="primary" size="small" onClick={submitFollow}>提交跟进</Button>
          </>
        )}
      </Drawer>

      {/* 确认排期弹窗 */}
      <Modal title="确认排期" open={confirmId != null} onOk={doConfirm} onCancel={() => { setConfirmId(null); confirmForm.resetFields() }} destroyOnClose>
        <Form form={confirmForm} layout="vertical">
          <Form.Item name="store_id" label="门店" rules={[{ required: true, message: '请选择门店' }]}>
            <Select options={stores.map((s) => ({ value: s.id, label: s.name }))} onChange={(v) => { setConfirmStore(v); confirmForm.setFieldValue('doctor_id', undefined) }} />
          </Form.Item>
          <Form.Item name="doctor_id" label="医生" rules={[{ required: true, message: '请选择医生' }]}>
            <Select options={doctorsByStore.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="date" label="确认日期" rules={[{ required: true, message: '请选择日期' }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="slot" label="确认时段" rules={[{ required: true, message: '请选择时段' }]}>
            <Select options={SLOTS.map((s) => ({ value: s, label: s }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配顾问弹窗 */}
      <Modal title="分配顾问" open={assignId != null} onOk={doAssign} onCancel={() => setAssignId(null)} destroyOnClose>
        <Form form={assignForm} layout="vertical">
          <Form.Item name="advisor_id" label="顾问" rules={[{ required: true, message: '请选择顾问' }]}>
            <Select options={admins.map((a) => ({ value: a.id, label: a.nickname || a.username }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
