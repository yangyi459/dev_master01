// 后台整体布局：Sider 232px（可折叠 80px）+ Header 56px sticky + 路由出口
import { useState } from 'react'
import { Layout, Avatar, Dropdown, Button } from 'antd'
import { Outlet, useNavigate } from 'react-router-dom'
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons'
import SiderMenu from './SiderMenu'
import { useAuth } from '../auth/AuthContext'

// 功能说明：对齐方案 §22：Sider 232px 深蓝、Header 56px。顶部展示当前管理员与下拉登出。
const { Sider, Header, Content } = Layout

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { admin, logout } = useAuth()
  const nav = useNavigate()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={232}
        collapsible
        collapsed={collapsed}
        trigger={null}
        style={{ background: '#001529' }}
      >
        <div className="flex h-14 items-center justify-center gap-2 text-white">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-cta-text">芽</span>
          {!collapsed && <span className="font-bold">悦芽管理后台</span>}
        </div>
        <SiderMenu />
      </Sider>

      <Layout>
        <Header
          style={{
            height: 56,
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #E8EBEF',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((v) => !v)}
          />
          <Dropdown
            menu={{
              items: [
                { key: 'role', label: `${admin?.nickname}（${admin?.role_name}）`, disabled: true },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout },
              ],
            }}
          >
            <span className="flex cursor-pointer items-center gap-2">
              <Avatar size="small" icon={<UserOutlined />} />
              <span className="text-sm text-ink">{admin?.nickname}</span>
            </span>
          </Dropdown>
        </Header>

        <Content style={{ margin: 16, padding: 16, background: '#F6F7F9', minHeight: 280, borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
