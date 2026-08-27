// 角色与权限（后台 M2）：菜单树勾选 + 权限点勾选 + 保存
import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, Tree, Checkbox, Space, message, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { listRoles, getRole, createRole, saveRole, deleteRole, listMenus, listPermissions } from '../api/m2'

interface Row {
  id: number
  name: string
  code: string
  data_scope: string
  remark: string
  is_builtin: number
}

interface PermGroup { group: string; items: { id: number; code: string; name: string }[] }

export default function Roles() {
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form] = Form.useForm()

  const [menuTree, setMenuTree] = useState<any[]>([])
  const [permGroups, setPermGroups] = useState<PermGroup[]>([])
  const [checkedMenus, setCheckedMenus] = useState<number[]>([])
  const [checkedPerms, setCheckedPerms] = useState<number[]>([])

  const load = () => {
    setLoading(true)
    listRoles().then((d: any) => setData(Array.isArray(d) ? d : (d?.items ?? []))).catch((e: any) => message.error(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const buildTreeData = (nodes: any[]): any[] =>
    nodes.map((n) => ({ key: n.id, title: `${n.name}（${n.path}）`, children: n.children?.length ? buildTreeData(n.children) : undefined }))

  const openEdit = async (r: Row | null) => {
    setEditing(r)
    setOpen(true)
    const [menus, perms] = await Promise.all([listMenus().catch(() => []), listPermissions().catch(() => [])])
    setMenuTree(buildTreeData(menus || []))
    setPermGroups(perms || [])
    if (r) {
      const detail: any = await getRole(r.id).catch(() => ({ menu_ids: [], permission_ids: [] }))
      form.setFieldsValue({ name: r.name, code: r.code, data_scope: r.data_scope, remark: r.remark })
      setCheckedMenus(detail.menu_ids || [])
      setCheckedPerms(detail.permission_ids || [])
    } else {
      form.resetFields()
      setCheckedMenus([]); setCheckedPerms([])
    }
  }

  const submit = async () => {
    const v = await form.validateFields()
    try {
      let rid = editing?.id
      if (!editing) {
        const created: any = await createRole({ ...v, menu_ids: [], permission_ids: [] })
        rid = created.id
      }
      await saveRole(rid!, { menu_ids: checkedMenus, permission_ids: checkedPerms })
      message.success('角色权限已保存')
      setOpen(false); load()
    } catch (e: any) { message.error(e.message) }
  }

  const remove = (r: Row) => {
    if (r.is_builtin) { message.warning('内置角色不可删除'); return }
    deleteRole(r.id).then(() => { message.success('已删除'); load() }).catch((e: any) => message.error(e.message))
  }

  const columns: ColumnsType<Row> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '角色', dataIndex: 'name' },
    { title: '角色编码', dataIndex: 'code', width: 140 },
    { title: '数据范围', dataIndex: 'data_scope', width: 100, render: (s: string) => <Tag color={s === 'all' ? 'blue' : 'default'}>{s === 'all' ? '全部数据' : '本门店'}</Tag> },
    { title: '类型', dataIndex: 'is_builtin', width: 90, render: (b: number) => (b ? <Tag color="gold">内置</Tag> : <Tag>自定义</Tag>) },
    {
      title: '操作', key: 'op', width: 150,
      render: (_: any, r: Row) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button>
          {!r.is_builtin && <Button type="link" size="small" danger onClick={() => remove(r)}>删除</Button>}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="primary" onClick={() => openEdit(null)}>新增角色</Button>
      </div>
      <Table rowKey="id" loading={loading} dataSource={data} columns={columns} pagination={false} size="middle" />

      <Modal title={editing ? `编辑角色：${editing.name}` : '新增角色'} open={open} onOk={submit} onCancel={() => setOpen(false)} width={640} destroyOnClose>
        <Form form={form} layout="vertical">
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="name" label="角色名" rules={[{ required: true, message: '请填写角色名' }]}>
              <Input style={{ width: 200 }} placeholder="如 预约顾问" />
            </Form.Item>
            <Form.Item name="code" label="编码" rules={[{ required: true, message: '请填写编码' }]}>
              <Input style={{ width: 200 }} placeholder="如 advisor" disabled={!!editing?.is_builtin} />
            </Form.Item>
            <Form.Item name="data_scope" label="数据范围" initialValue="all">
              <Select style={{ width: 120 }} options={[{ value: 'all', label: '全部' }, { value: 'store', label: '本门店' }]} />
            </Form.Item>
          </Space>
          <Form.Item label="菜单权限">
            <Tree
              checkable
              treeData={menuTree}
              checkedKeys={checkedMenus}
              onCheck={(keys) => setCheckedMenus(keys as number[])}
              defaultExpandAll
            />
          </Form.Item>
          <Form.Item label="功能权限点">
            <div className="max-h-60 space-y-3 overflow-auto rounded border border-line p-3">
              {permGroups.map((g) => (
                <div key={g.group}>
                  <div className="mb-1 text-xs font-semibold text-sub">{g.group}</div>
                  <Checkbox.Group
                    value={checkedPerms}
                    onChange={(v) => setCheckedPerms(v as number[])}
                    options={g.items.map((p) => ({ value: p.id, label: `${p.name}（${p.code}）` }))}
                  />
                </div>
              ))}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
