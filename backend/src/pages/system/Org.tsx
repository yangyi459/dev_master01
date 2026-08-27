// 组织架构（M3）：树形展示 + 类型联动（公司/区域/门店） + 增改删
import { useEffect, useMemo, useState } from 'react'
import { Button, Space, Tag, Modal, Form, Input, Select, Tree, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { orgTypes, orgTree, orgList, createOrg, updateOrg, deleteOrg, getStoresPublic } from '../../api/m3'

const TYPE_COLOR: Record<string, string> = { company: 'gold', region: 'blue', store: 'green' }

export default function Org() {
  const [tree, setTree] = useState<any[]>([])
  const [flat, setFlat] = useState<any[]>([])
  const [types, setTypes] = useState<any>({ types: [], linkage: {}, root_allowed: [] })
  const [stores, setStores] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [parentId, setParentId] = useState<number>(0)
  const [form] = Form.useForm()
  const [msg, ctx] = message.useMessage()

  const load = async () => {
    try {
      const [tp, tr, flatRes, st] = await Promise.all([orgTypes(), orgTree(), orgList(), getStoresPublic()])
      setTypes(tp)
      setTree(tr || [])
      // 必须用扁平列表，否则 parent_id/type 查找会错
      setFlat(Array.isArray(flatRes) ? flatRes : tr || [])
      setStores(st?.list || st || [])
    } catch (e: any) {
      msg.error(e.message)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const typeLabel = (v: string) => types.types.find((x: any) => x.value === v)?.label || v
  // 父级允许的子类型
  const allowedTypes = (pid: number) => {
    if (pid === 0) return types.root_allowed || []
    const p = flat.find((n: any) => n.id === pid)
    return p ? types.linkage?.[p.type] || [] : []
  }

  const treeData = useMemo(() => {
    const map = (nodes: any[]): any[] =>
      nodes.map((n) => ({
        key: n.id,
        title: (
          <div className="group flex w-full items-center justify-between py-1 pr-2">
            <Space size={6}>
              <span className="font-medium text-ink">{n.name}</span>
              <Tag color={TYPE_COLOR[n.type]}>{typeLabel(n.type)}</Tag>
            </Space>
            <Space size={2} className="opacity-0 transition-opacity group-hover:opacity-100">
              <Button type="text" size="small" onClick={(e) => { e.stopPropagation(); openCreate(n.id) }}>
                加子级
              </Button>
              <Button type="text" size="small" onClick={(e) => { e.stopPropagation(); openEdit(n) }}>
                编辑
              </Button>
              <Button type="text" size="small" danger onClick={(e) => { e.stopPropagation(); onDelete(n) }}>
                删除
              </Button>
            </Space>
          </div>
        ),
        children: map(n.children || []),
      }))
    return map(tree)
  }, [tree, types, flat])

  const openCreate = (pid = 0) => {
    setEditing(null)
    setParentId(pid)
    form.resetFields()
    form.setFieldsValue({ parent_id: pid, type: (allowedTypes(pid)[0] || 'region'), store_id: undefined })
    setOpen(true)
  }
  const openEdit = (n: any) => {
    setEditing(n)
    setParentId(n.parent_id)
    form.setFieldsValue({ name: n.name, parent_id: n.parent_id, type: n.type, store_id: n.store_id })
    setOpen(true)
  }
  const onDelete = async (n: any) => {
    if (!confirm(`确认删除「${n.name}」？含子节点将拒绝。`)) return
    try {
      await deleteOrg(n.id)
      msg.success('已删除')
      load()
    } catch (e: any) {
      msg.error(e.message)
    }
  }

  const submit = async () => {
    const v = await form.validateFields()
    try {
      if (editing) {
        await updateOrg(editing.id, v)
        msg.success('已更新')
      } else {
        await createOrg(v)
        msg.success('已新增')
      }
      setOpen(false)
      load()
    } catch (e: any) {
      msg.error(e.message)
    }
  }

  const curType = Form.useWatch('type', form)
  const curParentId = Form.useWatch('parent_id', form)
  const showStore = curType === 'store'

  return (
    <div>
      {ctx}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">组织架构</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(0)}>
          新增根节点
        </Button>
      </div>
      <div className="rounded-2xl border border-line bg-white p-4">
        {tree.length === 0 ? (
          <div className="py-8 text-center text-sub">暂无组织数据，点击右上角新增根节点</div>
        ) : (
          <Tree treeData={treeData} defaultExpandAll blockNode />
        )}
      </div>

      <Modal
        title={editing ? '编辑组织节点' : '新增组织节点'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="如 悦芽口腔（总部）" />
          </Form.Item>
          <Form.Item name="parent_id" label="上级" rules={[{ required: true }]}>
            <Select
              options={[{ value: 0, label: '（根）' }, ...flat.map((n: any) => ({ value: n.id, label: n.name }))]}
              disabled={!!editing}
            />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]} tooltip="类型联动：公司可建区域/门店；区域可建门店；门店不可再有子级">
            <Select
              options={allowedTypes(curParentId ?? parentId).map((v: string) => ({
                value: v,
                label: typeLabel(v),
              }))}
              onDropdownVisibleChange={() => {
                // 如果当前类型不在新上级允许范围内，自动重置为第一个允许类型
                const allowed = allowedTypes(curParentId ?? parentId)
                if (allowed.length && curType && !allowed.includes(curType)) {
                  form.setFieldsValue({ type: allowed[0] })
                }
              }}
            />
          </Form.Item>
          {showStore && (
            <Form.Item name="store_id" label="关联门店" rules={[{ required: true }]}>
              <Select options={stores.map((s: any) => ({ value: s.id, label: s.name }))} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
