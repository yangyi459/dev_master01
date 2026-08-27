// 站点基础配置（CMS）：单条配置对象，对齐原型 viewSite（多门店展示开关 + 与门店管理联动的门店卡片）
import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Switch, message, Divider, Tag } from 'antd'
import { apiGet, apiPut } from '../../api/client'

export default function SiteConfig() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stores, setStores] = useState<any[]>([])
  const [msg, ctx] = message.useMessage()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      apiGet('/api/admin/site-config').then((d) => form.setFieldsValue(d)).catch((e) => msg.error(e.message)),
      apiGet('/api/admin/stores', { page: 1, page_size: 50 }).then((d: any) => setStores(d?.items ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    const v = await form.validateFields()
    setSaving(true)
    try { await apiPut('/api/admin/site-config', v); msg.success('保存成功') }
    catch (e: any) { msg.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Card title="站点基础配置" loading={loading}>
      {ctx}
      <Form form={form} layout="vertical" style={{ maxWidth: 560 }}>
        <Form.Item name="site_name" label="站点名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="icp_number" label="备案号">
          <Input />
        </Form.Item>
        <Form.Item name="contact_phone" label="咨询电话">
          <Input />
        </Form.Item>
        <Form.Item name="contact_email" label="电子邮箱">
          <Input />
        </Form.Item>
        <Form.Item name="contact_address" label="联系地址">
          <Input />
        </Form.Item>
        <Form.Item name="multi_store_on" label="多门店展示" valuePropName="checked" tooltip="开启后前台按门店分别展示各门店的电话与地址">
          <Switch />
        </Form.Item>
        <Button type="primary" onClick={save} loading={saving}>保存配置</Button>
      </Form>

      <Divider orientation="left">门店联系方式（来源「门店管理」，实时联动）</Divider>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {stores.map((s) => (
          <div key={s.id} className="rounded-xl border border-line bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-ink">{s.name}</span>
              <Tag color={s.status === 1 ? 'green' : ''}>{s.status === 1 ? '营业中' : '筹建中'}</Tag>
            </div>
            <div className="space-y-1 text-sm text-sub">
              <div><span className="inline-block w-12">电话</span><b className="text-ink">{s.phone || '—'}</b></div>
              <div><span className="inline-block w-12">地址</span><span className="text-ink">{s.address || '—'}</span></div>
              <div><span className="inline-block w-12">营业</span><span className="text-ink">{s.hours || '—'}</span></div>
            </div>
          </div>
        ))}
        {stores.length === 0 && <div className="col-span-full text-sub">暂无门店数据，请前往「门店管理」维护。</div>}
      </div>
      <p className="mt-3 text-xs text-sub">上述配置经 /api/public/site-config 提供给前台官网；多门店联系方式与「门店管理」联动展示。</p>
    </Card>
  )
}
