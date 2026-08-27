// 运营看板（M3）：关键指标 + 今日待办 + 趋势分析；数据按角色隔离
import { useEffect, useState } from 'react'
import { Card, Statistic, Spin, message, Badge, List, Tag, Button, Empty } from 'antd'
import {
  CalendarOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  MessageOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import EChart from '../components/EChart'
import { dashSummary, dashTrend, dashFunnel, dashStores, dashChannels, dashTodos } from '../api/m3'
import { useNavigate } from 'react-router-dom'

const BRAND = '#FF7A45'
const GREEN = '#52c41a'
const BLUE = '#1677ff'
const ORANGE = '#fa8c16'
const RED = '#f5222d'

export default function Dashboard() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [s, setS] = useState<any>(null)
  const [todos, setTodos] = useState<any>(null)
  const [trend, setTrend] = useState<any>(null)
  const [funnel, setFunnel] = useState<any>(null)
  const [stores, setStores] = useState<any>(null)
  const [channels, setChannels] = useState<any>(null)
  const [msg, ctx] = message.useMessage()

  const load = async () => {
    setLoading(true)
    try {
      const [a, b, c, d, e, f] = await Promise.all([
        dashSummary(),
        dashTrend(30),
        dashFunnel(),
        dashStores(),
        dashChannels(),
        dashTodos(),
      ])
      setS(a)
      setTrend(b)
      setFunnel(c)
      setStores(d)
      setChannels(e)
      setTodos(f)
    } catch (err: any) {
      msg.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cards = [
    { title: '月度到诊（北极星）', value: s?.north_star_month_completed ?? 0, suffix: '单', icon: <CalendarOutlined />, color: BRAND, desc: s?.month ? `${s.month} 累计` : '' },
    { title: '今日预约提交', value: s?.today_submitted ?? 0, suffix: '单', icon: <ThunderboltOutlined />, color: BLUE, desc: '今日新增' },
    { title: '今日已到诊', value: s?.today_completed ?? 0, suffix: '单', icon: <CheckCircleOutlined />, color: GREEN, desc: '今日完成' },
    { title: '预约确认率', value: Math.round((s?.confirm_rate ?? 0) * 100), suffix: '%', icon: <FileDoneOutlined />, color: ORANGE, desc: '提交→确认' },
    { title: '到诊率', value: Math.round((s?.arrive_rate ?? 0) * 100), suffix: '%', icon: <RiseOutlined />, color: '#722ed1', desc: '确认→到诊' },
    { title: '待确认预约', value: s?.pending ?? 0, suffix: '单', icon: <ClockCircleOutlined />, color: RED, desc: '需尽快处理' },
  ]

  const wow = s?.week_over_week ?? 0
  const wowPositive = wow >= 0

  const trendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['提交', '确认', '到诊'] },
    grid: { left: 40, right: 16, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: (trend?.series || []).map((x: any) => x.date.slice(5)) },
    yAxis: { type: 'value' },
    series: [
      { name: '提交', type: 'line', smooth: true, data: (trend?.series || []).map((x: any) => x.submitted), itemStyle: { color: BRAND } },
      { name: '确认', type: 'line', smooth: true, data: (trend?.series || []).map((x: any) => x.confirmed), itemStyle: { color: GREEN } },
      { name: '到诊', type: 'line', smooth: true, data: (trend?.series || []).map((x: any) => x.completed), itemStyle: { color: BLUE } },
    ],
  }

  const funnelData = [
    { name: '待确认', value: funnel?.pending ?? 0 },
    { name: '已确认', value: funnel?.confirmed ?? 0 },
    { name: '已到诊', value: funnel?.completed ?? 0 },
    { name: '已取消', value: funnel?.cancelled ?? 0 },
  ].filter((d) => d.value > 0)

  const funnelOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'funnel',
        left: '10%',
        right: '10%',
        data: funnelData.length ? funnelData : [{ name: '暂无数据', value: 0 }],
        label: { formatter: '{b}: {c}' },
        color: [BRAND, GREEN, BLUE, '#bfbfbf'],
      },
    ],
  }

  const storesOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['预约总量', '到诊量'] },
    grid: { left: 40, right: 16, top: 40, bottom: 50 },
    xAxis: { type: 'category', data: (stores || []).map((x: any) => x.store_name), axisLabel: { interval: 0, rotate: 20 } },
    yAxis: { type: 'value' },
    series: [
      { name: '预约总量', type: 'bar', data: (stores || []).map((x: any) => x.total), itemStyle: { color: BRAND } },
      { name: '到诊量', type: 'bar', data: (stores || []).map((x: any) => x.completed), itemStyle: { color: GREEN } },
    ],
  }

  const channelMap: Record<string, string> = {
    wechat: '微信公众号',
    website: '官网',
    phone: '电话咨询',
    offline: '到院',
    friend: '亲友推荐',
    other: '其他',
    unknown: '未知',
  }

  const channelsOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: (channels || []).map((x: any) => ({ name: channelMap[x.channel] || x.channel, value: x.count })),
        label: { formatter: '{b}: {c}' },
      },
    ],
  }

  return (
    <div>
      {ctx}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">运营看板</h2>
        <Button type="primary" ghost onClick={load} icon={<RiseOutlined />}>
          刷新数据
        </Button>
      </div>

      <Spin spinning={loading}>
        {/* 关键指标：6 卡 */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {cards.map((c) => (
            <Card key={c.title} className="hover:shadow-md transition-shadow">
              <Statistic
                title={
                  <span className="flex items-center gap-1 text-sub">
                    <span style={{ color: c.color }}>{c.icon}</span>
                    {c.title}
                  </span>
                }
                value={c.value}
                suffix={c.suffix}
                valueStyle={{ color: c.color, fontWeight: 700 }}
              />
              <div className="mt-1 text-xs text-sub">{c.desc}</div>
            </Card>
          ))}
        </div>

        {/* 今日/本周概览 + 待办 */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sub text-sm">本周预约提交</div>
                <div className="mt-1 text-2xl font-bold text-ink">{s?.this_week_submitted ?? 0} 单</div>
                <div className="mt-1 text-xs text-sub">上周：{s?.last_week_submitted ?? 0} 单</div>
              </div>
              <div className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-semibold ${wowPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {wowPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {Math.abs(wow)}%
              </div>
            </div>
            <div className="mt-3 text-xs text-sub">环比 = （本周 − 上周）/ 上周 × 100%</div>
          </Card>

          <Card title={<span className="text-sm"><ClockCircleOutlined className="mr-1" />待确认预约</span>}>
            {todos?.counts?.pending ? (
              <List
                size="small"
                dataSource={todos?.pending_list || []}
                renderItem={(a: any) => (
                  <List.Item
                    className="cursor-pointer hover:bg-soft/50"
                    onClick={() => nav('/customer/appointments')}
                  >
                    <div className="flex w-full items-center justify-between text-sm">
                      <span className="truncate">{a.contact_name || a.child_name || '匿名'} · {a.service_name || '未指定项目'}</span>
                      <Tag color="warning">待确认</Tag>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待确认" />
            )}
          </Card>

          <Card title={<span className="text-sm"><MessageOutlined className="mr-1" />未处理留言</span>}>
            {todos?.counts?.guestbook_unread ? (
              <List
                size="small"
                dataSource={todos?.guestbook_list || []}
                renderItem={(g: any) => (
                  <List.Item
                    className="cursor-pointer hover:bg-soft/50"
                    onClick={() => nav('/customer/guestbooks')}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{g.name || '匿名'}</span>
                        <Badge status="error" text="未处理" />
                      </div>
                      <div className="truncate text-xs text-sub">{g.content}</div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无新留言" />
            )}
          </Card>
        </div>

        {/* 图表区 */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card title="预约趋势（近 30 天）">
            <EChart option={trendOption} height={320} />
          </Card>
          <Card title="预约状态漏斗">
            <EChart option={funnelOption} height={320} />
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card title="各门店预约对比">
            <EChart option={storesOption} height={320} />
          </Card>
          <Card title="获客渠道分布">
            <EChart option={channelsOption} height={320} />
          </Card>
        </div>
      </Spin>
    </div>
  )
}
