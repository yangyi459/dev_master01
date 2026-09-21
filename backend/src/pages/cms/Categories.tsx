// 分类管理（CMS）：Tab 切换「诊疗项目分类 / 文章分类」，对齐原型 viewCatConfig
// 接口：GET /api/admin/categories?type=service|article 返回纯数组；写接口同样带 ?type=
import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Switch, Space, Popconfirm, Tag, Tabs, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client'
const TABS = [
  { key: 'service', label: '诊疗项目分类' },
  { key: 'article', label: '文章分类' },
]

export default function Categories() {
  const [tab, setTab] = useState<'service' | 'article'>('service')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()
  const [msg, ctx] = message.useMessage()

  const load = (type: string) => {
    if (type !== tab) return
    setLoading(true)
    apiGet('/api/admin/categories', { type })
      .then((d: any) => setData(Array.isArray(d) ? d : (d?.items ?? [])))
      .catch((e: any) => msg.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load(tab) }, [tab])

  const openCreate = () => { setEditing(null); form.resetFields(); setOpen(true) }
  const openEdit = (r: any) => { setEditing(r); form.setFieldsValue({ ...r, item_type: tab }); setOpen(true) }

  const submit = async () => {
    const v = await form.validateFields()
    try {
      if (editing) await apiPut(`/api/admin/categories/${editing.id}`, v)
      else await apiPost('/api/admin/categories', { ...v, status: v.status ? 1 : 0 }, { params: { type: tab } })
      msg.success('已保存')
      setOpen(false); load(tab)
    } catch (e: any) { msg.error(e.message) }
  }
  const toggle = (r: any) => {
    apiPut(`/api/admin/categories/${r.id}`, { status: r.status === 1 ? 0 : 1 })
      .then(() => { msg.success('已更新'); load(tab) }).catch((e: any) => msg.error(e.message))
  }
  const remove = (r: any) => apiDelete(`/api/admin/categories/${r.id}`).then(() => { msg.success('已删除'); load(tab) }).catch((e: any) => msg.error(e.message))

  const columns: ColumnsType<any> = [
    { title: '分类名称', dataIndex: 'name' },
    { title: '排序', dataIndex: 'sort', width: 90 },
    { title: '状态', dataIndex: 'status', width: 90, render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>) },
    {
      title: '操作', key: 'op', width: 150,
      render: (_: any, r: any) => (
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
      {ctx}
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as any)}
        items={TABS.map((t) => ({
          key: t.key,
          label: t.label,
          children: (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">{t.label}</h2>
                <Button type="primary" onClick={openCreate}>新增分类</Button>
              </div>
              <Table
                rowKey="id"
                loading={loading}
                dataSource={data}
                columns={columns}
                pagination={false}
                size="middle"
              />
            </div>
          ),
        }))}
      />

      <Modal title={editing ? '编辑分类' : '新增分类'} open={open} onOk={submit} onCancel={() => setOpen(false)} destroyOnClose width={480}>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请填写分类名称' }]}>
            <Input placeholder={tab === 'article' ? '如 日常护理' : '如 龋齿防治'} />
          </Form.Item>
          <Form.Item name="sort" label="排序" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="数字，越小越靠前" />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
