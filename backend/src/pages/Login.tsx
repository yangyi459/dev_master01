// 登录页：账号密码登录 + 演示账号提示
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from '../auth/AuthContext'
import { useNavigate } from 'react-router-dom'

// 功能说明：登录后写入 token 并跳转仪表盘。展示三套演示账号（来自种子数据）。
const DEMO = [
  { username: 'admin', password: 'admin123', role: '超级管理员' },
  { username: 'editor', password: 'editor123', role: '内容运营' },
  { username: 'zhou.cs', password: 'cs123', role: '客服顾问' },
]

export default function Login() {
  const { login, loading } = useAuth()
  const nav = useNavigate()
  const [msg, ctx] = message.useMessage()

  const onFinish = async (v: any) => {
    try {
      await login(v.username, v.password)
      msg.success('登录成功')
      nav('/dashboard')
    } catch (e: any) {
      msg.error(e.message || '登录失败')
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-mist">
      {ctx}
      <Card className="w-[400px] shadow-lg" title={<div className="text-center text-lg font-bold">悦芽口腔 · 管理后台</div>}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input prefix={<UserOutlined />} placeholder="账号" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            登录
          </Button>
        </Form>
        <Typography.Paragraph type="secondary" className="mt-4 mb-0 text-xs">
          演示账号：
          {DEMO.map((d) => (
            <div key={d.username}>
              {d.role}：{d.username} / {d.password}
            </div>
          ))}
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
