// 通用全屏详情编辑页（配置驱动）
// 定位：与门店详情（StoreDetail）同款的"仿 Notion / 富文本编辑器"全屏编辑布局——
//   1) 顶部 sticky 工具条（返回 + 面包屑 + 状态 + 保存）
//   2) 大字号 hero 标题（取 heroField 或第一个短文本字段）
//   3) 字段按类型自动分章节：短字段（text/number/switch）→ 基本信息（24 栅格两列）；
//      textarea → 详细内容（整行）；image → 视觉内容（CoverUploader 上传控件）
// 供 医生/案例/文章/诊疗项目/首页配置 等模块复用；列表页经 CmsCrud(detailPath) 跳转至此。
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Space,
  Skeleton,
  Empty,
  Card,
  Modal,
  message,
  Tag,
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  PictureOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { apiGet, apiPost, apiPut } from '../api/client'
import CoverUploader from './CoverUploader'
import type { FieldDef } from './CmsCrud'

interface Props {
  title: string
  basePath: string
  fields: FieldDef[]
  backPath: string
  imageCategory?: string
  // 大标题字段名（默认取第一个短文本字段）
  heroField?: string
  // 提交前对 values 做转换（如首页配置需要 status: boolean -> 1/0）
  transform?: (values: any) => any
}

export default function CrudDetail({
  title,
  basePath,
  fields,
  backPath,
  imageCategory,
  heroField,
  transform,
}: Props) {
  const { id } = useParams<{ id?: string }>()
  const location = useLocation()
  const isEdit = !!id
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hero, setHero] = useState<string>('')
  const [dirty, setDirty] = useState(false)
  const [msg, ctx] = message.useMessage()

  // 列表跳转时把行数据放在 location.state 里，优先直接用（避免依赖 GET 单条接口）；否则回退拉详情
  const stateRow = (location.state as any)?.row

  // 自动分组：hero / 短字段 / 长文本 / 图片
  const heroName =
    heroField ?? fields.find((f) => f.type === undefined || f.type === 'text')?.name ?? ''
  const shortFields = fields.filter(
    (f) =>
      f.name !== heroName &&
      (f.type === undefined || f.type === 'text' || f.type === 'number' || f.type === 'switch'),
  )
  const longFields = fields.filter((f) => f.type === 'textarea')
  const imageFields = fields.filter((f) => f.type === 'image')
  const listFields = fields.filter((f) => f.type === 'list')
  const heroLabel = fields.find((f) => f.name === heroName)?.label ?? '标题'

  // 载入时把 DB 里的 JSON 字符串字段解析成数组，供 Form.List 渲染
  const parseListRow = (row: any): any => {
    if (!row) return row
    const out = { ...row }
    for (const f of listFields) {
      const v = out[f.name]
      if (typeof v === 'string') {
        try {
          out[f.name] = JSON.parse(v)
        } catch {
          out[f.name] = []
        }
      }
      if (!Array.isArray(out[f.name])) out[f.name] = []
    }
    return out
  }

  // 载入（编辑模式）
  useEffect(() => {
    let canceled = false
    const run = async () => {
      if (!isEdit) {
        form.setFieldsValue({ status: 1 })
        return
      }
      if (stateRow) {
        form.setFieldsValue(parseListRow(stateRow))
        setHero(stateRow?.[heroName] ?? '')
        setDirty(false)
        return
      }
      setLoading(true)
      setLoadError(null)
      try {
        let row: any = null
        try {
          // 优先走单条详情接口
          const res: any = await apiGet(`${basePath}/${id}`)
          row = res?.data ?? res
        } catch {
          // 部分模块（如 home-items）未提供单条 GET 接口：回退拉列表按 id 找
          const listRes: any = await apiGet(basePath)
          const items: any[] = Array.isArray(listRes)
            ? listRes
            : (listRes?.items ?? listRes?.list ?? [])
          row = items.find((x: any) => String(x?.['id'] ?? x?.id) === String(id)) ?? null
        }
        if (!canceled) {
          form.setFieldsValue(parseListRow(row || {}))
          setHero(row?.[heroName] ?? '')
          setDirty(false)
        }
      } catch (e: any) {
        if (!canceled) setLoadError(e?.message || '加载失败')
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    run()
    return () => {
      canceled = true
    }
  }, [id, isEdit, form, basePath, heroName, stateRow])

  // 离开未保存提示
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const submit = async () => {
    try {
      const values = await form.validateFields()
      const payload = transform ? transform(values) : { ...values }
      // 数组型字段序列化为 JSON 字符串再提交
      for (const f of listFields) {
        const arr = values[f.name]
        payload[f.name] = JSON.stringify(Array.isArray(arr) ? arr : [])
      }
      setSubmitting(true)
      if (isEdit) {
        await apiPut(`${basePath}/${id}`, payload)
        msg.success('保存成功')
      } else {
        await apiPost(basePath, payload)
        msg.success(`已新增${title}`)
      }
      setDirty(false)
      navigate(backPath)
    } catch (e: any) {
      if (e?.errorFields) return // 表单校验失败
      msg.error(e?.message || '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const cancel = () => {
    if (!dirty) {
      navigate(backPath)
      return
    }
    Modal.confirm({
      title: '离开当前页面？',
      content: '当前还有未保存的修改，确定放弃并返回列表吗？',
      okText: '放弃修改',
      cancelText: '留在页面',
      okButtonProps: { danger: true },
      onOk: () => navigate(backPath),
    })
  }

  const onValuesChange = (_: any, all: any) => {
    setDirty(true)
    if (heroName) setHero(all?.[heroName] ?? hero)
  }

  const renderControl = (f: FieldDef) => {
    if (f.type === 'textarea')
      return (
        <Input.TextArea
          rows={4}
          placeholder={f.placeholder}
          autoSize={{ minRows: 4, maxRows: 16 }}
          style={{ fontSize: 14, lineHeight: 1.7 }}
        />
      )
    if (f.type === 'number') return <InputNumber style={{ width: '100%' }} placeholder={f.placeholder} />
    if (f.type === 'switch') return <Switch />
    return <Input placeholder={f.placeholder} allowClear />
  }

  const fieldItem = (f: FieldDef, extra?: { noLabel?: boolean }) => (
    <Form.Item
      key={f.name}
      name={f.name}
      label={extra?.noLabel ? undefined : f.label}
      valuePropName={f.type === 'switch' ? 'checked' : 'value'}
      rules={f.required ? [{ required: true, message: `请填写${f.label}` }] : []}
      style={{ marginBottom: 16 }}
    >
      {renderControl(f)}
    </Form.Item>
  )

  return (
    <div className="crud-detail">
      {ctx}

      {/* ===== 顶部 sticky 工具条 ===== */}
      <div className="crud-detail-toolbar">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={cancel}>
            返回列表
          </Button>
          <span className="crud-detail-crumb">
            CMS <span style={{ margin: '0 6px' }}>/</span>
            <span>{title}</span>
            <span style={{ margin: '0 6px' }}>/</span>
            <strong>{isEdit ? `编辑：${hero || id}` : `新增${title}`}</strong>
          </span>
        </Space>
        <Space>
          {dirty && <Tag color="warning">未保存</Tag>}
          <Tag color="success" icon={<CheckCircleOutlined />}>
            {isEdit ? '编辑模式' : '新增模式'}
          </Tag>
          <Button onClick={cancel}>取消</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={submitting} onClick={submit}>
            保存
          </Button>
        </Space>
      </div>

      {/* ===== 主体 ===== */}
      {loading ? (
        <Card style={{ borderRadius: 14, marginTop: 12 }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : loadError ? (
        <Card style={{ borderRadius: 14, marginTop: 12 }}>
          <Empty
            description={
              <Space direction="vertical">
                <span style={{ color: '#ff4d4f' }}>加载失败：{loadError}</span>
                <Button type="primary" onClick={() => navigate(backPath)}>
                  返回列表
                </Button>
              </Space>
            }
          />
        </Card>
      ) : (
        <Form form={form} layout="vertical" colon={false} onValuesChange={onValuesChange} style={{ marginTop: 12 }}>
          {/* —— hero 标题区 —— */}
          {heroName && (
            <div className="crud-detail-hero">
              <div className="crud-detail-hero-label">{heroLabel} *</div>
              <Form.Item
                name={heroName}
                noStyle
                rules={[{ required: true, message: `请填写${heroLabel}` }]}
              >
                <Input
                  placeholder={`给${title}起一个展示用的${heroLabel}`}
                  variant="borderless"
                  className="crud-detail-hero-input"
                  maxLength={100}
                />
              </Form.Item>
              <div className="crud-detail-hero-meta">
                <span>
                  <InfoCircleOutlined /> 保存后即可在前台对应位置展示，如需调整随时回来编辑
                </span>
              </div>
            </div>
          )}

          {/* —— 章节：基本信息（短字段两列） —— */}
          {shortFields.length > 0 && (
            <Section icon={<InfoCircleOutlined />} title="基本信息" hint="对外展示的核心信息">
              <div className="crud-detail-grid">
                {shortFields.map((f) => (
                  <div key={f.name} className="crud-detail-col" style={{ gridColumn: 'span 12 / span 12' }}>
                    {fieldItem(f)}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* —— 章节：详细内容（长文本整行） —— */}
          {longFields.length > 0 && (
            <Section icon={<FileTextOutlined />} title="详细内容" hint="完整介绍文字，前台详情页展示">
              {longFields.map((f) => fieldItem(f))}
            </Section>
          )}

          {/* —— 章节：视觉内容（图片上传） —— */}
          {imageFields.length > 0 && (
            <Section icon={<PictureOutlined />} title="视觉内容" hint="上传后自动保存到 API 静态目录，前后台均可访问，并同步到素材库">
              {imageFields.map((f) => (
                <Form.Item
                  key={f.name}
                  name={f.name}
                  label={f.label}
                  help={f.placeholder}
                  style={{ marginBottom: 8 }}
                >
                  <CoverUploader category={imageCategory || title} label={`上传${f.label}`} />
                </Form.Item>
              ))}
            </Section>
          )}

          {/* —— 章节：结构化内容（数组型，逐条增删） —— */}
          {listFields.length > 0 && (
            <Section icon={<FileTextOutlined />} title="结构化内容" hint="分章节的列表型内容，可逐条新增 / 删除">
              {listFields.map((f) => (
                <div key={f.name} style={{ marginBottom: 18 }}>
                  <div className="crud-detail-list-label">{f.label}</div>
                  <ListField field={f} />
                </div>
              ))}
            </Section>
          )}

          {/* —— 底部操作 —— */}
          <div className="crud-detail-footer">
            <Button onClick={cancel}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={submitting} onClick={submit}>
              {isEdit ? '保存修改' : `创建${title}`}
            </Button>
          </div>
        </Form>
      )}

      {/* ===== 样式（复用门店详情同款全屏编辑风格） ===== */}
      <style>{`
        .crud-detail { max-width: 920px; margin: 0 auto; }
        .crud-detail-toolbar {
          position: sticky;
          top: 0;
          z-index: 5;
          background: #FFFFFF;
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 2px 12px rgba(15, 23, 42, .04);
          border: 1px solid #E8EBEF;
        }
        .crud-detail-crumb { color: #6b7280; font-size: 13px; }
        .crud-detail-crumb strong { color: #111827; font-weight: 600; }
        .crud-detail-hero {
          background: #fff;
          border-radius: 14px;
          padding: 32px 36px 28px;
          margin-top: 16px;
          border: 1px solid #E8EBEF;
          position: relative;
          overflow: hidden;
        }
        .crud-detail-hero::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, #FF7A45, #FFB36B);
        }
        .crud-detail-hero-label {
          font-size: 12px;
          color: #FF7A45;
          letter-spacing: 1px;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .crud-detail-hero-input {
          font-size: 32px !important;
          font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
          font-weight: 600;
          padding: 0 !important;
          background: transparent !important;
        }
        .crud-detail-hero-input::placeholder { font-weight: 400; color: #c5c8ce; font-style: italic; }
        .crud-detail-hero-meta {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px dashed #e5e7eb;
          color: #6b7280;
          font-size: 13px;
        }
        .crud-detail-section {
          background: #fff;
          border-radius: 14px;
          padding: 24px 36px;
          margin-top: 16px;
          border: 1px solid #E8EBEF;
        }
        .crud-detail-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .crud-detail-section-header .icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #FFF4EE;
          color: #FF7A45;
          display: grid;
          place-items: center;
          font-size: 15px;
        }
        .crud-detail-section-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: #111827; }
        .crud-detail-section-header small { color: #9ca3af; font-size: 12px; margin-left: 4px; }
        .crud-detail-grid { display: grid; grid-template-columns: repeat(24, 1fr); gap: 0 18px; }
        @media (max-width: 768px) {
          .crud-detail-grid > .crud-detail-col { grid-column: span 24 / span 24 !important; }
          .crud-detail-hero { padding: 20px 16px; }
          .crud-detail-section { padding: 16px; }
          .crud-detail-hero-input { font-size: 22px !important; }
        }
        .crud-detail-footer { margin: 24px 0 8px; display: flex; justify-content: flex-end; gap: 12px; }
        .crud-detail-list-label { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .crud-detail-list-item { border: 1px solid #e8ebef; border-radius: 10px; padding: 12px; margin-bottom: 12px; background: #fff; }
        .crud-detail-list-pair { display: grid; gap: 8px; }
        .crud-detail-list-empty { color: #9ca3af; font-size: 13px; padding: 4px 0 10px; }
      `}</style>
    </div>
  )
}

// ===== 数组型字段编辑器（Form.List 逐条增删）=====
function ListField({ field }: { field: FieldDef }) {
  const isPair = field.itemShape === 'pair'
  const subFields = field.subFields || []
  return (
    <Form.List name={field.name}>
      {(items, { add, remove }) => (
        <div>
          {items.length === 0 && (
            <div className="crud-detail-list-empty">（暂无内容，点击下方按钮添加）</div>
          )}
          {items.map((item) => (
            <div key={item.key} className="crud-detail-list-item">
              {isPair ? (
                <div className="crud-detail-list-pair">
                  {subFields.map((sf) => (
                    <Form.Item key={sf.key} name={[item.name, sf.key]} noStyle>
                      <Input placeholder={sf.label} style={{ fontSize: 14 }} />
                    </Form.Item>
                  ))}
                </div>
              ) : (
                <Form.Item name={item.name} noStyle>
                  <Input.TextArea
                    rows={2}
                    placeholder={field.placeholder}
                    autoSize={{ minRows: 2, maxRows: 8 }}
                    style={{ fontSize: 14, lineHeight: 1.7 }}
                  />
                </Form.Item>
              )}
              <Button danger type="link" size="small" onClick={() => remove(item.name)} style={{ marginTop: 2 }}>
                删除
              </Button>
            </div>
          ))}
          <Button
            type="dashed"
            block
            onClick={() => add(isPair ? Object.fromEntries(subFields.map((s) => [s.key, ''])) : '')}
            style={{ marginTop: 4 }}
          >
            + 新增一项
          </Button>
        </div>
      )}
    </Form.List>
  )
}

// ===== 章节子组件 =====
function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="crud-detail-section">
      <div className="crud-detail-section-header">
        <span className="icon">{icon}</span>
        <h3>{title}</h3>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </section>
  )
}
