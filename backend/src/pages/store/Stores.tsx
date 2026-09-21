// 门店管理（基础 CRUD）
// 设计：列表 + 跳转到独立全屏编辑页（/store/stores/new 或 /store/stores/edit/:id）。
// 编辑/新增不再走弹窗或 inline 表单，全屏编辑页 StoreDetail 接管。
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Card,
  Tag,
  Empty,
  Skeleton,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { apiGet, apiDelete } from '../../api/client'
import { mediaUrl } from '../../api/m3'
import TablePagination from '../../components/TablePagination'

export default function Stores() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [msg, ctx] = message.useMessage()
  const navigate = useNavigate()

  const load = async (p: number = page) => {
    setLoading(true)
    setError(null)
    try {
      // 后端 /api/admin/stores 接受 page/page_size，返回 {list,total}
      const res: any = await apiGet('/api/admin/stores', { page: p, page_size: 10 })
      const list: any[] = Array.isArray(res) ? res : (res?.items ?? res?.list ?? [])
      setData(list)
      setTotal(Array.isArray(res) ? list.length : (res?.total ?? list.length))
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  const remove = async (id: number) => {
    try {
      await apiDelete(`/api/admin/stores/${id}`)
      msg.success('已删除')
      load(page)
    } catch (e: any) {
      msg.error(e.message || '删除失败')
    }
  }

  const onPageChange = (p: number) => {
    setPage(p)
    load(p)
  }

  // onClick 包装（load 带可选参数不能直接作 MouseEventHandler）
  const reload = () => load(page)

  const columns: ColumnsType<any> = useMemo(() => [
    {
      title: '封面',
      dataIndex: 'cover',
      width: 96,
      render: (v: string) => v ? (
        <img
          src={mediaUrl(v)}
          alt="封面"
          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2' }}
        />
      ) : (
        <div style={{
          width: 64, height: 64, borderRadius: 6,
          background: '#fafafa', border: '1px dashed #ddd',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#bbb', fontSize: 11,
        }}>暂无</div>
      ),
    },
    {
      title: '门店名称',
      dataIndex: 'name',
      width: 200,
      render: (v: string, r: any) => (
        <Space size={4} direction="vertical" style={{ lineHeight: 1.3 }}>
          <span style={{ fontWeight: 500 }}>{v}</span>
          {r.hours ? (
            <span style={{ color: '#999', fontSize: 12 }}>
              <ClockCircleOutlined /> {r.hours}
            </span>
          ) : null}
        </Space>
      ),
    },
    {
      title: '联系信息',
      dataIndex: 'phone',
      width: 180,
      render: (v: string, r: any) => (
        <Space size={4} direction="vertical" style={{ lineHeight: 1.3 }}>
          <span>{v || '-'}</span>
          <span style={{ color: '#999', fontSize: 12 }}>
            {r.lng != null && r.lat != null
              ? `📍 ${r.lng.toFixed(4)}, ${r.lat.toFixed(4)}`
              : '未设置坐标'}
          </span>
        </Space>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      ellipsis: true,
      render: (v: string) => (
        <Space size={4}>
          <EnvironmentOutlined style={{ color: '#FF7A45' }} />
          <span>{v || '-'}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: number) =>
        v === 1 ? <Tag color="success">营业中</Tag> : <Tag color="default">筹建中</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/store/stores/edit/${r.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该门店？"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(r.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [data])

  return (
    <div>
      {ctx}

      {/* 顶部工具条 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">门店管理</h2>
          <div className="text-sub text-xs mt-1">
            共 {total} 家门店 · <span style={{ color: '#FF7A45' }}>橙色</span> = 营业中
          </div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={reload}>刷新</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/store/stores/new')}
          >
            新增门店
          </Button>
        </Space>
      </div>

      {error ? (
        <Card>
          <Empty
            description={
              <Space direction="vertical" size={4}>
                <span style={{ color: '#ff4d4f' }}>加载失败：{error}</span>
                <Button type="primary" onClick={reload}>重试</Button>
              </Space>
            }
          />
        </Card>
      ) : loading && data.length === 0 ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={false}
          size="middle"
          scroll={{ x: 800 }}
        />
        <div className="mt-3">
          <TablePagination total={total} pageSize={10} current={page} onChange={onPageChange} />
        </div>
        </>
      )}
    </div>
  )
}
