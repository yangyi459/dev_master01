// 首页配置管理（CMS）：Banner 编辑器，对齐原型 viewBanner / openForm(cms-home)
// 列表：封面 / 标题 / 副标题 / 排序 / 状态 / 更新时间；编辑：图片 + 跳转链接 + 按钮文案 + 角标 + 排序 + 状态
import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Switch, Space, Popconfirm, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client'

const TYPE_LABEL: Record<string, string> = {
  banner: '轮播 Banner', value: '价值点', service: '诊疗项目', case: '案例', article: '科普', trust: '信任背书',
}
const STATUS_COLOR: Record<string, string> = { 1: 'green', 0: '' }

export default function HomeItems() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()
  const [msg, ctx] = message.useMessage()

  const load = () => {
    setLoading(true)
    apiGet('/api/admin/home-items')
      .then((d: any) => setData(Array.isArray(d) ? d : (d?.items ?? [])))
      .catch((e: any) => msg.error(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ item_type: 'banner', status: 1, sort: (data.length || 0) + 1 }); setOpen(true) }
  const openEdit = (r: any) => { setEditing(r); form.setFieldsValue(r); setOpen(true) }

  const submit = async () => {
    const v = await form.validateFields()
    const payload = { ...v, status: v.status ? 1 : 0, sort: Number(v.sort) || 0 }
    try {
      if (editing) await apiPut(`/api/admin/home-items/${editing.id}`, payload)
      else await apiPost('/api/admin/home-items', payload)
      msg.success('已保存')
      setOpen(false); load()
    } catch (e: any) { msg.error(e.message) }
  }
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
      title: '操作', key: 'op', width: 150,
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
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
        <Button type="primary" onClick={openCreate}>新增配置</Button>
      </div>
      <Table rowKey="id" loading={loading} dataSource={data} columns={columns} pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }} size="middle" />

      <Modal title={editing ? '编辑首页配置' : '新增首页配置'} open={open} onOk={submit} onCancel={() => setOpen(false)} destroyOnClose width={560}>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="item_type" label="类型" rules={[{ required: true }]}>
            <Input placeholder="banner / value / service / case / article / trust" />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="如 帮孩子快乐看牙" />
          </Form.Item>
          <Form.Item name="subtitle" label="副标题">
            <Input placeholder="如 悦芽口腔专注 0–14 岁儿童口腔健康" />
          </Form.Item>
          <Form.Item name="image" label="背景图（逻辑路径）">
            <Input placeholder="如 /media/assets/ai_banner_happy.png" />
          </Form.Item>
          <Form.Item name="link" label="跳转链接">
            <Input placeholder="前端路由，如 /booking、/services、/about" />
          </Form.Item>
          <Form.Item name="button_text" label="按钮文字">
            <Input placeholder="如 立即预约挂号" />
          </Form.Item>
          <Form.Item name="tag" label="角标文案">
            <Input placeholder="轮播左上角 badge，可空" />
          </Form.Item>
          <div className="flex gap-4">
            <Form.Item name="sort" label="排序" rules={[{ required: true }]}>
              <InputNumber style={{ width: 160 }} min={0} placeholder="数字，越小越靠前" />
            </Form.Item>
            <Form.Item name="status" label="状态" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="上架" unCheckedChildren="下架" />
            </Form.Item>
          </div>
          <p className="text-xs text-sub">图片建议在「素材库」上传后填入其逻辑路径；前端以 Banner 满铺展示，半透明遮罩保证文字清晰。</p>
        </Form>
      </Modal>
    </div>
  )
}
