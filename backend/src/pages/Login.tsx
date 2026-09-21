// 登录页：账号密码登录 + 演示账号一键登录（避免手动输入密码出错）
import { useState } from 'react'
import { Button, Card, Form, Input, Typography, message, Space, Tag } from 'antd'
import { LockOutlined, UserOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useAuth } from '../auth/AuthContext'
import { useNavigate } from 'react-router-dom'

// 功能说明：登录后写入 token 并跳转仪表盘。点击 demo 行可直接填表+提交，彻底杜绝手输错误。
const DEMO = [
  { username: 'admin',   password: 'admin123', role: '超级管理员', color: '#FF7A45' },
  { username: 'editor',  password: 'editor123', role: '内容运营',   color: '#1677ff' },
  { username: 'zhou.cs', password: 'cs123',    role: '客服顾问',   color: '#52c41a' },
]

export default function Login() {
  const { login, loading } = useAuth()
  const nav = useNavigate()
  const [msg, ctx] = message.useMessage()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const doLogin = async (username: string, password: string) => {
    try {
      setSubmitting(true)
      await login(username, password)
      msg.success('登录成功')
      nav('/dashboard')
    } catch (e: any) {
      msg.error(e.message || '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  const onFinish = (v: any) => doLogin(v.username, v.password)

  // 一键填入 + 登录：避免手动输入造成的密码/空格错误
  const quickLogin = (d: typeof DEMO[number]) => {
    form.setFieldsValue({ username: d.username, password: d.password })
    doLogin(d.username, d.password)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-mist" style={{
      background: 'linear-gradient(135deg, #f6f7f9 0%, #f0f5ff 100%)',
    }}>
      {ctx}
      <Card className="w-[440px] shadow-xl" style={{ borderRadius: 16 }}
        title={<div className="text-center text-lg font-bold tracking-wide">悦芽口腔 · 管理后台</div>}>
        <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input prefix={<UserOutlined />} placeholder="账号" size="large" autoComplete="off" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading || submitting}>
            登 录
          </Button>
        </Form>

        <div className="mt-5">
          <div className="mb-2 text-xs text-sub font-medium">演示账号（点击即登录）：</div>
          <Space direction="vertical" size={6} className="w-full">
            {DEMO.map((d) => (
              <button
                key={d.username}
                type="button"
                onClick={() => quickLogin(d)}
                className="group flex w-full items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-left transition hover:border-brand hover:bg-brand/5"
              >
                <div className="flex items-center gap-2">
                  <Tag color={d.color} bordered={false} className="m-0">{d.role}</Tag>
                  <span className="text-xs text-sub">{d.username} / {d.password}</span>
                </div>
                <ThunderboltOutlined className="text-brand opacity-60 transition group-hover:opacity-100" />
              </button>
            ))}
          </Space>
        </div>

        <Typography.Paragraph type="secondary" className="mt-4 mb-0 text-xs">
          提示：浏览器可能缓存旧密码，建议使用上方一键登录。
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
