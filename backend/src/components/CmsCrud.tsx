// 通用 CMS 增删改查组件：列表 + 新增/编辑弹窗 + 删除，驱动于字段配置
// v2：支持 detailPath 模式 —— 传入路由前缀后，"新增/编辑"改为跳转独立全屏详情页（/new、/edit/:id）；
//     不传则维持弹窗（权益配置等简单模块向后兼容）。type:'image' 字段渲染图片上传控件（CoverUploader）。
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Modal, Form, Input, InputNumber, Switch, Space, Popconfirm, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client'
import CoverUploader from './CoverUploader'
import TablePagination from './TablePagination'

// 功能说明：M1 后台以「只读列表 + 基础编辑」为主。该组件用 basePath + columns + fields 配置，
// 统一实现列表查询、新增、编辑、删除，避免每个模块重复样板代码。
// 列表接口约定返回 {list,total}；单条写接口约定 POST(新增)/PUT {id}(编辑)/DELETE {id}(删除)。
export interface FieldDef {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'switch' | 'image' | 'list'
  required?: boolean
  placeholder?: string
  width?: number
  // type==='list' 专用：数组型字段（JSON 串收发）
  // itemShape: 'text' -> 字符串数组（如 适合人群/风险点）
  // itemShape: 'pair' -> 对象数组（如 就诊流程[{title,desc}]/亮点[{label,value}]），subFields 描述每个子字段
  itemShape?: 'text' | 'pair'
  subFields?: { key: string; label: string }[]
}
interface Props {
  title: string
  basePath: string
  columns: ColumnsType<any>
  fields: FieldDef[]
  rowKey?: string
  createPerm?: string
  editPerm?: string
  deletePerm?: string
  // 部分接口按 slug/业务键更新（如 pages 按 slug），而非按 id 路径更新
  updateByBody?: boolean
  // 列表/写入时附加到查询串（如 categories 按 ?type=service|article 区分）
  extraQuery?: Record<string, any>
  // 独立详情页模式：传入列表路由前缀（如 /cms/doctors）后，新增/编辑跳转全屏详情页而非弹窗
  detailPath?: string
}

export default function CmsCrud({
  title,
  basePath,
  columns,
  fields,
  rowKey = 'id',
  createPerm,
  editPerm,
  deletePerm,
  updateByBody = false,
  extraQuery,
  detailPath,
}: Props) {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [form] = Form.useForm()
  const [msg, ctx] = message.useMessage()
  const navigate = useNavigate()

  const load = async (p: number = page) => {
    setLoading(true)
    try {
      // 兼容两种返回：{items,total} 分页信封 或 纯数组（categories/pages/home-items/benefits 等）
      // 默认带 page/page_size，后端若有分页会截取；纯数组接口会忽略。
      const res: any = await apiGet(basePath, { ...(extraQuery || {}), page: p, page_size: 10 })
      const list: any[] = Array.isArray(res) ? res : (res?.items ?? res?.list ?? [])
      setData(list)
      setTotal(Array.isArray(res) ? list.length : (res?.total ?? list.length))
    } catch (e: any) {
      msg.error(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPageChange = (p: number) => {
    setPage(p)
    load(p)
  }

  const openCreate = () => {
    if (detailPath) {
      navigate(`${detailPath}/new`)
      return
    }
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }
  const openEdit = (row: any) => {
    if (detailPath) {
      navigate(`${detailPath}/edit/${row[rowKey]}`, { state: { row } })
      return
    }
    setEditing(row)
    form.setFieldsValue(row)
    setOpen(true)
  }
  const submit = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        // updateByBody：按业务键（如 slug）在请求体更新，而非 id 路径
        if (updateByBody) await apiPut(basePath, { ...values, [rowKey]: editing[rowKey] })
        else await apiPut(`${basePath}/${editing[rowKey]}`, values)
      } else await apiPost(basePath, values)
      msg.success('保存成功')
      setOpen(false)
      load(page)
    } catch (e: any) {
      msg.error(e.message)
    }
  }
  const remove = async (id: number) => {
    try {
      await apiDelete(`${basePath}/${id}`)
      msg.success('已删除')
      load(page)
    } catch (e: any) {
      msg.error(e.message)
    }
  }

  const actionColumn: ColumnsType<any>[number] = {
    title: '操作',
    key: 'action',
    width: 150,
    render: (_: any, row: any) => (
      <Space>
        {(editPerm === undefined || true) && (
          <Button type="link" size="small" onClick={() => openEdit(row)}>
            编辑
          </Button>
        )}
        <Popconfirm title="确认删除？" onConfirm={() => remove(row[rowKey])}>
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
  }

  return (
    <div>
      {ctx}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <Button type="primary" onClick={openCreate}>
          新增
        </Button>
      </div>
      <Table
        rowKey={rowKey}
        loading={loading}
        dataSource={data}
        columns={[...columns, actionColumn]}
        pagination={false}
        size="middle"
      />
      <div className="mt-3">
        <TablePagination total={total} pageSize={10} current={page} onChange={onPageChange} />
      </div>

      <Modal
        title={editing ? `编辑${title}` : `新增${title}`}
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          {fields.map((f) => (
            <Form.Item
              key={f.name}
              name={f.name}
              label={f.label}
              valuePropName={f.type === 'switch' ? 'checked' : 'value'}
              rules={f.required ? [{ required: true, message: `请填写${f.label}` }] : []}
            >
              {f.type === 'textarea' ? (
                <Input.TextArea rows={4} placeholder={f.placeholder} />
              ) : f.type === 'number' ? (
                <InputNumber style={{ width: '100%' }} placeholder={f.placeholder} />
              ) : f.type === 'switch' ? (
                <Switch />
              ) : f.type === 'image' ? (
                <CoverUploader label="上传图片" />
              ) : (
                <Input placeholder={f.placeholder} />
              )}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  )
}
