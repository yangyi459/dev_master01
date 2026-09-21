// 门店详情（全屏编辑页）
// 设计定位：仿 Notion / 富文本编辑器的全屏编辑布局——
//   1) 顶部 sticky 工具条（返回 + 面包屑 + 元信息 + 保存）
//   2) 主体按章节分块（基本 / 坐标 / 封面 / 简介），每章顶部有图标 + 小标题
//   3) 标题采用大字号衬线字体（Playfair Display），下挂细分割线
//   4) 字段围绕标题自然展开，字号宽松不压抑
// 与 Stores 列表相互独立：Stores 用 useNavigate() 跳转至此页；保存/取消后 navigate(-1) 回列表。
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  PhoneOutlined,
  FieldTimeOutlined,
  EnvironmentOutlined,
  PictureOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { apiGet, apiPost, apiPut } from '../../api/client'
import CoverUploader from '../../components/CoverUploader'

export default function StoreDetail() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string>('')
  const [status, setStatus] = useState<number>(1)
  const [dirty, setDirty] = useState(false)
  const [msg, ctx] = message.useMessage()

  // 载入（编辑模式）
  useEffect(() => {
    let canceled = false
    const run = async () => {
      if (!isEdit) {
        form.setFieldsValue({ status: 1 })
        return
      }
      setLoading(true)
      setLoadError(null)
      try {
        const res: any = await apiGet(`/api/admin/stores/${id}`)
        const row = res?.data ?? res
        if (!canceled) {
          form.setFieldsValue(row || {})
          setStoreName(row?.name || '')
          setStatus(row?.status ?? 1)
          setDirty(false)
        }
      } catch (e: any) {
        if (!canceled) setLoadError(e.message || '加载失败')
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    run()
    return () => { canceled = true }
  }, [id, isEdit, form])

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
      setSubmitting(true)
      if (isEdit) {
        await apiPut(`/api/admin/stores/${id}`, values)
        msg.success('保存成功')
      } else {
        await apiPost('/api/admin/stores', values)
        msg.success('已新增门店')
      }
      setDirty(false)
      navigate('/store/stores')
    } catch (e: any) {
      if (e?.errorFields) return // 表单校验失败
      msg.error(e?.message || '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const cancel = () => {
    if (!dirty) {
      navigate('/store/stores')
      return
    }
    Modal.confirm({
      title: '离开当前页面？',
      content: '当前还有未保存的修改，确定放弃并返回列表吗？',
      okText: '放弃修改',
      cancelText: '留在页面',
      okButtonProps: { danger: true },
      onOk: () => navigate('/store/stores'),
    })
  }

  const onValuesChange = (_: any, all: any) => {
    setDirty(true)
    setStoreName(all?.name ?? storeName)
    setStatus(typeof all?.status === 'boolean' ? (all.status ? 1 : 0) : (all?.status ?? status))
  }

  return (
    <div className="store-detail">
      {ctx}

      {/* ===== 顶部 sticky 工具条 ===== */}
      <div className="store-detail-toolbar">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={cancel}>
            返回门店列表
          </Button>
          <span className="store-detail-crumb">
            门店运营 <span style={{ margin: '0 6px' }}>/</span>
            <span>门店管理</span>
            <span style={{ margin: '0 6px' }}>/</span>
            <strong>{isEdit ? `编辑：${storeName || id}` : '新增门店'}</strong>
          </span>
        </Space>
        <Space>
          {dirty && <Tag color="warning">未保存</Tag>}
          {status === 1
            ? <Tag color="success" icon={<CheckCircleOutlined />}>营业中</Tag>
            : <Tag color="default" icon={<StopOutlined />}>筹建中</Tag>}
          <Button onClick={cancel}>取消</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={submitting}
            onClick={submit}
          >
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
                <Button type="primary" onClick={() => navigate('/store/stores')}>
                  返回列表
                </Button>
              </Space>
            }
          />
        </Card>
      ) : (
        <Form
          form={form}
          layout="vertical"
          colon={false}
          onValuesChange={onValuesChange}
          style={{ marginTop: 12 }}
        >
          {/* —— 标题区：门店名称（大字号衬线，紧扣"富文本全屏"风格） —— */}
          <div className="store-detail-hero">
            <div className="store-detail-hero-label">门店名称 *</div>
            <Form.Item
              name="name"
              noStyle
              rules={[{ required: true, message: '请填写门店名称' }]}
            >
              <Input
                placeholder="给门店起一个对外展示的名字，如：悦芽口腔（浦东中心店）"
                variant="borderless"
                className="store-detail-hero-input"
                maxLength={50}
              />
            </Form.Item>
            <div className="store-detail-hero-meta">
              <span>
                <FieldTimeOutlined /> 营业时间：
                <Form.Item name="hours" noStyle>
                  <Input
                    size="small"
                    placeholder="如 09:00 - 18:00"
                    style={{ width: 160, marginLeft: 6 }}
                  />
                </Form.Item>
              </span>
              <span>
                状态：
                <Form.Item name="status" noStyle valuePropName="checked">
                  <Switch
                    size="small"
                    checkedChildren="营业中"
                    unCheckedChildren="筹建中"
                    style={{ marginLeft: 6 }}
                  />
                </Form.Item>
              </span>
            </div>
          </div>

          {/* —— 章节一：基本信息 —— */}
          <Section icon={<PhoneOutlined />} title="基本信息" hint="对外公开的联系信息">
            <FieldGrid>
              <Field span={12} label="门店电话" required name="phone"
                     placeholder="如 021-50101234 或 400-100-XXXX" />
              <Field span={12} label="营业时间" name="hours"
                     placeholder="如 09:00 - 18:00（休息日可写成 周一至周五 09:00-18:00）" />
            </FieldGrid>
          </Section>

          {/* —— 章节二：地址坐标 —— */}
          <Section icon={<EnvironmentOutlined />} title="地址坐标" hint="前台地图与导航依赖此坐标">
            <FieldGrid>
              <Field span={12} label="经度 lng" name="lng"
                     type="number" placeholder="如 121.5045" />
              <Field span={12} label="纬度 lat" name="lat"
                     type="number" placeholder="如 31.2389" />
              <Field span={24} label="详细地址" name="address" required
                     placeholder="如 上海市浦东新区世纪大道 1000 号 2 楼" />
            </FieldGrid>
          </Section>

          {/* —— 章节三：视觉门面 —— */}
          <Section icon={<PictureOutlined />} title="视觉门面" hint="前台首页、门店列表、地图卡片均会用到此封面">
            <Form.Item name="cover" help="建议 16:9 横向、不超过 5MB；上传后自动保存到 API 静态目录" style={{ marginBottom: 8 }}>
              <CoverUploader category="门店" label="上传封面" />
            </Form.Item>
          </Section>

          {/* —— 章节四：门店简介 —— */}
          <Section icon={<FileTextOutlined />} title="门店简介" hint="展示在门店详情页，可写亮点、设施、医师力量等">
            <Form.Item
              name="intro"
              rules={[{ max: 500, message: '最多 500 字' }]}
              style={{ marginBottom: 0 }}
            >
              <Input.TextArea
                placeholder="如：悦芽口腔浦东中心店坐落于世纪大道，毗邻多家三甲医院，交通便利。
门店拥有 800㎡ 候诊与诊疗空间，配备儿童游乐区与独立诊室 12 间，驻店医师 8 名均来自三甲口腔医院。"
                autoSize={{ minRows: 6, maxRows: 14 }}
                showCount
                maxLength={500}
                style={{ fontSize: 14, lineHeight: 1.7 }}
              />
            </Form.Item>
          </Section>

          {/* —— 底部操作 —— */}
          <div className="store-detail-footer">
            <Button onClick={cancel}>取消</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={submitting}
              onClick={submit}
            >
              {isEdit ? '保存修改' : '创建门店'}
            </Button>
          </div>
        </Form>
      )}

      {/* ===== 样式（全屏编辑页风格：宽松、章节分明、可保存指示） ===== */}
      <style>{`
        .store-detail { max-width: 920px; margin: 0 auto; }
        .store-detail-toolbar {
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
        .store-detail-crumb {
          color: #6b7280;
          font-size: 13px;
        }
        .store-detail-crumb strong {
          color: #111827;
          font-weight: 600;
        }
        .store-detail-hero {
          background: #fff;
          border-radius: 14px;
          padding: 32px 36px 28px;
          margin-top: 16px;
          border: 1px solid #E8EBEF;
          position: relative;
          overflow: hidden;
        }
        .store-detail-hero::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, #FF7A45, #FFB36B);
        }
        .store-detail-hero-label {
          font-size: 12px;
          color: #FF7A45;
          letter-spacing: 1px;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .store-detail-hero-input {
          font-size: 32px !important;
          font-family: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
          font-weight: 600;
          padding: 0 !important;
          background: transparent !important;
        }
        .store-detail-hero-input::placeholder {
          font-weight: 400;
          color: #c5c8ce;
          font-style: italic;
        }
        .store-detail-hero-meta {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px dashed #e5e7eb;
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          color: #6b7280;
          font-size: 13px;
          align-items: center;
        }
        .store-detail-section {
          background: #fff;
          border-radius: 14px;
          padding: 24px 36px;
          margin-top: 16px;
          border: 1px solid #E8EBEF;
        }
        .store-detail-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .store-detail-section-header .icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #FFF4EE;
          color: #FF7A45;
          display: grid;
          place-items: center;
          font-size: 15px;
        }
        .store-detail-section-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #111827;
        }
        .store-detail-section-header small {
          color: #9ca3af;
          font-size: 12px;
          margin-left: 4px;
        }
        .store-detail-grid {
          display: grid;
          grid-template-columns: repeat(24, 1fr);
          gap: 0 18px;
        }
        @media (max-width: 768px) {
          .store-detail-grid > .store-detail-col { grid-column: span 24 / span 24 !important; }
          .store-detail-hero { padding: 20px 16px; }
          .store-detail-section { padding: 16px; }
          .store-detail-hero-input { font-size: 22px !important; }
        }
        .store-detail-footer {
          margin: 24px 0 8px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
      `}</style>
    </div>
  )
}

// ===== 视觉分组子组件 =====
function Section({
  icon, title, hint, children,
}: {
  icon: React.ReactNode
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="store-detail-section">
      <div className="store-detail-section-header">
        <span className="icon">{icon}</span>
        <h3>{title}</h3>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </section>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="store-detail-grid">{children}</div>
}

function Field({
  span, label, required, name, placeholder, type = 'text', rules,
}: {
  span: 12 | 24
  label: string
  required?: boolean
  name: string
  placeholder?: string
  type?: 'text' | 'number'
  rules?: any[]
}) {
  const gridColumn = span === 12 ? 'span 12 / span 12' : 'span 24 / span 24'
  const finalRules = required
    ? [{ required: true, message: `请填写${label}` }, ...(rules || [])]
    : rules || []
  return (
    <div className="store-detail-col" style={{ gridColumn }}>
      <Form.Item
        name={name}
        label={label}
        required={required}
        rules={finalRules}
        style={{ marginBottom: 16 }}
      >
        {type === 'number' ? (
          <InputNumber style={{ width: '100%' }} placeholder={placeholder} step={0.0001} />
        ) : (
          <Input placeholder={placeholder} allowClear />
        )}
      </Form.Item>
    </div>
  )
}
