// 管理员账号管理（后台 M2）：username 非中文约束；角色/状态管理
import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { listAdmins, createAdmin, updateAdmin, toggleAdmin, deleteAdmin, listRoles } from '../api/m2'

interface Row {
  id: number
  username: string
  nickname: string
  role_id: number
  role_name: string
  store_id: number | null
  status: number
}

const isCJK = (s: string) => /[一-龥]/.test(s)

export default function Admins() {
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form] = Form.useForm()

  const load = () => {
    setLoading(true)
    listAdmins().then((d: any) => setData(Array.isArray(d) ? d : (d?.items ?? []))).catch((e: any) => message.error(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { load(); listRoles().then((d: any) => setRoles(Array.isArray(d) ? d : (d?.items ?? []))).catch(() => {}) }, [])

  const openEdit = (r: Row | null) => {
    setEditing(r)
    setOpen(true)
    if (r) form.setFieldsValue({ ...r, password: '' })
    else form.resetFields()
  }

  const submit = async () => {
    const v = await form.validateFields()
    if (isCJK(v.username)) { message.error('管理员账号（用户名）不能含中文'); return }
    try {
      if (editing) {
        const { password, ...rest } = v
        await updateAdmin(editing.id, password ? v : rest)
      } else {
        await createAdmin(v)
      }
      message.success('已保存')
      setOpen(false); load()
    } catch (e: any) { message.error(e.message) }
  }

  const toggle = (r: Row) => toggleAdmin(r.id, r.status === 1 ? 0 : 1).then(() => { message.success('已更新'); load() }).catch((e: any) => message.error(e.message))
  const remove = (r: Row) => deleteAdmin(r.id).then(() => { message.success('已删除'); load() }).catch((e: any) => message.error(e.message))

  const columns: ColumnsType<Row> = [
    { title: '用户名（非中文）', dataIndex: 'username', width: 150 },
    { title: '姓名', dataIndex: 'nickname' },
    { title: '角色', dataIndex: 'role_name', width: 120, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '状态', dataIndex: 'status', width: 90, render: (s: number) => (s === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>) },
    { title: '最后登录时间', dataIndex: 'last_login_at', width: 180, render: (v: string) => (v ? String(v).replace('T', ' ').slice(0, 19) : '—') },
    {
      title: '操作', key: 'op', width: 180,
      render: (_: any, r: Row) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          <Button type="link" size="small" onClick={() => toggle(r)}>{r.status === 1 ? '停用' : '启用'}</Button>
          <Popconfirm title="确认删除？" onConfirm={() => remove(r)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="primary" onClick={() => openEdit(null)}>新增管理员</Button>
      </div>
      <Table rowKey="id" loading={loading} dataSource={data} columns={columns} pagination={false} size="middle" />

      <Modal title={editing ? `编辑管理员：${editing.username}` : '新增管理员'} open={open} onOk={submit} onCancel={() => setOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="账号（非中文）" rules={[{ required: true, message: '请填写账号' }]}>
            <Input placeholder="如 advisor01" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="nickname" label="昵称">
            <Input placeholder="显示名" />
          </Form.Item>
          <Form.Item name="password" label={editing ? '密码（留空不修改）' : '密码'} rules={editing ? [] : [{ required: true, message: '请填写密码' }]}>
            <Input.Password placeholder={editing ? '留空则不修改' : '登录密码'} />
          </Form.Item>
          <Form.Item name="role_id" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select options={roles.map((r) => ({ value: r.id, label: r.name }))} />
          </Form.Item>
          <Form.Item name="store_id" label="门店（顾问可选）">
            <Input type="number" placeholder="留空为全门店" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select options={[{ value: 1, label: '启用' }, { value: 0, label: '停用' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
