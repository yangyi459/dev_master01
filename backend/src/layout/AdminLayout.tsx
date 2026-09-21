// 后台整体布局：视口固定 = Sider 独立滚动 + Content 独立滚动 + Header sticky
// 关键修复：旧版「min-height: 100vh」会让侧栏随主内容一起滚出去，已改为 h-screen + overflow:hidden 分区滚动。
import { useState } from 'react'
import { Layout, Avatar, Dropdown, Button } from 'antd'
import { Outlet, useNavigate } from 'react-router-dom'
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons'
import SiderMenu from './SiderMenu'
import ErrorBoundary from '../components/ErrorBoundary'
import { useAuth } from '../auth/AuthContext'

// 功能说明：对齐方案 §22：Sider 232px 深蓝、Header 56px sticky。
//         Sider 与 Content 分区独立滚动，Header 始终顶部固定。
const { Sider, Header, Content } = Layout

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { admin, logout } = useAuth()
  const nav = useNavigate()

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {/* 侧栏：高度=视口，内部 overflow:auto 独立滚动 */}
      <Sider
        width={collapsed ? 80 : 232}
        collapsed={collapsed}
        collapsible
        trigger={null}
        style={{ background: '#001529', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex h-14 shrink-0 items-center justify-center gap-2 text-white">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-cta-text">芽</span>
          {!collapsed && <span className="font-bold tracking-wide">悦芽管理后台</span>}
        </div>
        {/* 菜单区域独立滚动，sticky 顶部 logo 始终可见 */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="sider-scroll">
          <SiderMenu />
        </div>
      </Sider>

      {/* 主区：Header sticky + Content 独立滚动 */}
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <Header
          style={{
            height: 56,
            flex: '0 0 56px',
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #E8EBEF',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            boxShadow: '0 1px 4px rgba(0,0,0,.04)',
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

        {/* Content 独立滚动：滚动条只在这一区出现，不会带动侧栏 */}
        <Content style={{ margin: 16, padding: 16, background: '#F6F7F9', overflowY: 'auto', overflowX: 'hidden' }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  )
}
