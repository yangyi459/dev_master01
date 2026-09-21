// 运营看板（M3-高级版）：关键指标 + 趋势 + 待办 + 内容 + 渠道 全景
// 升级点：
// 1) KPI 卡片加 sparkline（近 14 天 mini trend）和环比箭头
// 2) 趋势图 = 平滑面积 + 渐变填充 + 峰值标注 + 「转化率」副轴
// 3) 漏斗图带转化率（每层之间显示 X%）
// 4) 门店对比 = 柱状 + 平均参考线 + 转化率副轴
// 5) 获客渠道分布已移除（当前渠道字段仅 web，无决策价值；数据就绪后可恢复）
// 6) 新增「今日到诊清单」「热门服务 TOP5」「最近留言」「运营简报」
import { useEffect, useMemo, useState } from 'react'
import { Card, Spin, message, List, Tag, Button, Empty, Progress } from 'antd'
import {
  CalendarOutlined, FileDoneOutlined, CheckCircleOutlined, RiseOutlined,
  ClockCircleOutlined, ThunderboltOutlined, MessageOutlined,
  ArrowUpOutlined, ArrowDownOutlined, AlertOutlined, TrophyOutlined,
} from '@ant-design/icons'
import EChart from '../components/EChart'
import { dashSummary, dashTrend, dashStores, dashTodos, dashDoctors } from '../api/m3'
import { useNavigate } from 'react-router-dom'

const BRAND = '#FF7A45'
const GREEN = '#52c41a'
const BLUE = '#1677ff'
const ORANGE = '#fa8c16'
const RED = '#f5222d'
const PURPLE = '#722ed1'

// 颜色工具：hex -> rgba
const rgba = (hex: string, a = 1) => {
  const m = hex.replace('#', '').padStart(6, '0')
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

export default function Dashboard() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [s, setS] = useState<any>(null)
  const [todos, setTodos] = useState<any>(null)
  const [trend, setTrend] = useState<any>(null)
  const [stores, setStores] = useState<any>(null)
  const [doctors, setDoctors] = useState<any>(null)
  const [msg, ctx] = message.useMessage()

  const load = async () => {
    setLoading(true)
    try {
      const [a, b, c, d, e] = await Promise.all([
        dashSummary(), dashTrend(30), dashStores(), dashTodos(), dashDoctors(),
      ])
      setS(a); setTrend(b); setStores(c); setTodos(d); setDoctors(e)
    } catch (err: any) {
      msg.error(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  // ---- 关键指标 ----
  const cards = [
    { title: '月度到诊（北极星）', value: s?.north_star_month_completed ?? 0, suffix: '单',
      icon: <CalendarOutlined />, color: BRAND, desc: s?.month ? `${s.month} 累计` : '',
      ringKey: 'total' },
    { title: '今日预约提交', value: s?.today_submitted ?? 0, suffix: '单',
      icon: <ThunderboltOutlined />, color: BLUE, desc: '今日新增', ringKey: 'today' },
    { title: '今日已到诊', value: s?.today_completed ?? 0, suffix: '单',
      icon: <CheckCircleOutlined />, color: GREEN, desc: '今日完成', ringKey: 'todayc' },
    { title: '预约确认率', value: Math.round((s?.confirm_rate ?? 0) * 100), suffix: '%',
      icon: <FileDoneOutlined />, color: ORANGE, desc: '提交→确认', ringKey: 'confirm' },
    { title: '到诊率', value: Math.round((s?.arrive_rate ?? 0) * 100), suffix: '%',
      icon: <RiseOutlined />, color: PURPLE, desc: '确认→到诊', ringKey: 'arrive' },
    { title: '待确认预约', value: s?.pending ?? 0, suffix: '单',
      icon: <ClockCircleOutlined />, color: RED, desc: '需尽快处理', ringKey: 'pending' },
  ]

  // ---- 近 14 天 sparkline：从 trend 末尾取 14 天 ----
  const series14 = useMemo(() => (trend?.series || []).slice(-14), [trend])
  const sparkline = (key: 'submitted' | 'confirmed' | 'completed', color: string) => ({
    grid: { left: 0, right: 0, top: 4, bottom: 0 },
    xAxis: { type: 'category', show: false, data: series14.map((x: any) => x.date.slice(5)) },
    yAxis: { show: false, type: 'value' },
    tooltip: { show: false },
    series: [{
      type: 'line', smooth: true, symbol: 'none',
      data: series14.map((x: any) => x[key]),
      lineStyle: { width: 2, color },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: rgba(color, 0.32) }, { offset: 1, color: rgba(color, 0) }] } },
    }],
  })

  // ---- 趋势图：双轴平滑面积 ----
  const submittedArr = (trend?.series || []).map((x: any) => x.submitted)
  const confirmedArr = (trend?.series || []).map((x: any) => x.confirmed)
  const completedArr = (trend?.series || []).map((x: any) => x.completed)
  const convRateArr = submittedArr.map((v: number, i: number) =>
    v ? Math.round((completedArr[i] / v) * 100) : 0)

  const trendOption = {
    tooltip: { trigger: 'axis', valueFormatter: (v: any) => Number.isFinite(v) ? v + (v <= 100 ? '%' : '') : v },
    legend: { data: ['提交', '确认', '到诊', '转化率'], top: 0 },
    grid: { left: 50, right: 60, top: 40, bottom: 30 },
    xAxis: { type: 'category', boundaryGap: false, data: (trend?.series || []).map((x: any) => x.date.slice(5)) },
    yAxis: [
      { type: 'value', name: '单数', position: 'left' },
      { type: 'value', name: '转化率%', position: 'right', max: 100, axisLabel: { formatter: '{value}%' } },
    ],
    series: [
      { name: '提交', type: 'line', smooth: true, stack: 't',
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: rgba(BRAND, 0.5) }, { offset: 1, color: rgba(BRAND, 0.05) }] } },
        lineStyle: { width: 2, color: BRAND }, itemStyle: { color: BRAND },
        data: submittedArr },
      { name: '确认', type: 'line', smooth: true, stack: 't',
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: rgba(GREEN, 0.5) }, { offset: 1, color: rgba(GREEN, 0.05) }] } },
        lineStyle: { width: 2, color: GREEN }, itemStyle: { color: GREEN },
        data: confirmedArr },
      { name: '到诊', type: 'line', smooth: true,
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: rgba(BLUE, 0.5) }, { offset: 1, color: rgba(BLUE, 0.05) }] } },
        lineStyle: { width: 2, color: BLUE }, itemStyle: { color: BLUE },
        data: completedArr, markPoint: { symbol: 'pin', data: [{ type: 'max', name: '峰值' }] } },
      { name: '转化率', type: 'line', yAxisIndex: 1, smooth: true,
        lineStyle: { width: 1.5, color: '#bfbfbf', type: 'dashed' },
        itemStyle: { color: '#bfbfbf' }, data: convRateArr },
    ],
  }

  // ---- 门店对比：平均参考线 + 转化率副轴 ----
  const storesArr = stores || []
  const avgTotal = storesArr.length ? storesArr.reduce((a: number, b: any) => a + (b.total || 0), 0) / storesArr.length : 0
  const avgRateArr = storesArr.map((s: any) => s.total ? Math.round((s.completed / s.total) * 100) : 0)
  const storesOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['预约总量', '到诊量', '到诊率'], top: 0 },
    grid: { left: 50, right: 60, top: 40, bottom: 50 },
    xAxis: { type: 'category', data: storesArr.map((x: any) => x.store_name), axisLabel: { interval: 0, rotate: 16 } },
    yAxis: [
      { type: 'value', name: '单数' },
      { type: 'value', name: '到诊率%', position: 'right', max: 100, axisLabel: { formatter: '{value}%' } },
    ],
    series: [
      { name: '预约总量', type: 'bar', barWidth: 18,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: BRAND }, { offset: 1, color: rgba(BRAND, 0.5) }] }, borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', formatter: (p: any) => p.value },
        data: storesArr.map((x: any) => x.total),
        markLine: { silent: true, data: [{ yAxis: Math.round(avgTotal), name: '门店均值',
          label: { formatter: '均值 {c}', color: '#999' }, lineStyle: { color: '#999', type: 'dashed' } }] } },
      { name: '到诊量', type: 'bar', barWidth: 18,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: GREEN }, { offset: 1, color: rgba(GREEN, 0.5) }] }, borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', formatter: (p: any) => p.value },
        data: storesArr.map((x: any) => x.completed) },
      { name: '到诊率', type: 'line', yAxisIndex: 1, smooth: true,
        lineStyle: { width: 2, color: PURPLE }, itemStyle: { color: PURPLE }, symbol: 'circle', symbolSize: 8,
        data: avgRateArr },
    ],
  }

  // ---- 服务 TOP 5（按预约量估算）----
  const topServices = useMemo(() => {
    const items = (todos?.pending_list || []).concat(todos?.today_arrive || [])
    const map: Record<string, number> = {}
    items.forEach((a: any) => {
      const k = a.service_name || '未指定'
      map[k] = (map[k] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [todos])
  const topMax = topServices[0]?.[1] || 1

  // ---- 运营简报 ----
  const wow = s?.week_over_week ?? 0
  const wowPositive = wow >= 0
  const confirmRate = Math.round((s?.confirm_rate ?? 0) * 100)
  const arriveRate = Math.round((s?.arrive_rate ?? 0) * 100)
  const brief = []
  if ((s?.pending ?? 0) >= 3) brief.push(`当前有 ${s.pending} 单待确认，请尽快分配跟进`)
  if (confirmRate < 60) brief.push(`确认率仅 ${confirmRate}%，建议客服在 24h 内电话回访`)
  if (arriveRate < 70) brief.push(`到诊率 ${arriveRate}%，可考虑发送就诊提醒短信`)
  if (wowPositive && wow > 0) brief.push(`本周预约较上周 +${wow}%，增长态势良好`)
  if (brief.length === 0) brief.push('运营数据正常，继续保持当前节奏')

  return (
    <div>
      {ctx}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">运营看板</h2>
          <p className="mt-0.5 text-xs text-sub">实时业务核心指标 · 按角色数据隔离</p>
        </div>
        <Button type="primary" ghost onClick={load} icon={<RiseOutlined />}>刷新数据</Button>
      </div>

      <Spin spinning={loading}>
        {/* 关键指标 6 卡：KPI + sparkline + 转化率 hint */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {cards.map((c, i) => (
            <Card key={c.title} hoverable className="!rounded-2xl shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sub text-xs">
                  <span style={{ color: c.color, fontSize: 14 }}>{c.icon}</span>
                  <span>{c.title}</span>
                </div>
                {i === 0 && <Tag color="processing" bordered={false}>北极星</Tag>}
              </div>
              <div className="mt-1 flex items-end justify-between">
                <div className="text-2xl font-bold" style={{ color: c.color }}>
                  {c.value}<span className="ml-1 text-sm font-medium text-sub">{c.suffix}</span>
                </div>
              </div>
              <div className="mt-2 h-9">
                <EChart option={sparkline(
                  c.ringKey === 'today' || c.ringKey === 'pending' || c.ringKey === 'todayc' ? 'completed'
                  : c.ringKey === 'confirm' || c.ringKey === 'arrive' ? 'submitted' : 'submitted',
                  c.color)} height={36} />
              </div>
              <div className="mt-1 text-xs text-sub">{c.desc}</div>
            </Card>
          ))}
        </div>

        {/* 简报 + 周报 + 待办 */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* 周报卡片：转化漏斗 */}
          <Card className="!rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sub text-xs">本周预约提交</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-ink">{s?.this_week_submitted ?? 0}</span>
                  <span className="text-sm text-sub">单</span>
                  <span className={`ml-2 rounded-md px-2 py-0.5 text-xs font-semibold ${wowPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {wowPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(wow)}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-sub">上周 {s?.last_week_submitted ?? 0} 单 · 环比 = (本周 − 上周) / 上周</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {[
                { name: '确认率', val: confirmRate, color: ORANGE },
                { name: '到诊率', val: arriveRate, color: GREEN },
              ].map((r) => (
                <div key={r.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-sub">{r.name}</span>
                    <span className="font-semibold" style={{ color: r.color }}>{r.val}%</span>
                  </div>
                  <Progress percent={r.val} strokeColor={r.color} showInfo={false} size="small" />
                </div>
              ))}
            </div>
          </Card>

          {/* 待确认预约 */}
          <Card className="!rounded-2xl" title={<span className="text-sm"><ClockCircleOutlined className="mr-1 text-red-500" />待确认预约</span>}
            extra={<a onClick={() => nav('/customer/appointments')} className="text-xs text-brand cursor-pointer">查看全部</a>}>
            {todos?.counts?.pending ? (
              <List size="small" dataSource={todos?.pending_list || []}
                renderItem={(a: any) => (
                  <List.Item className="cursor-pointer hover:bg-soft/50 !px-2 !py-1.5"
                    onClick={() => nav('/customer/appointments')}>
                    <div className="flex w-full items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">{a.contact_name || a.child_name || '匿名'}</div>
                        <div className="truncate text-xs text-sub">{a.service_name || '未指定项目'} · {a.store_name}</div>
                      </div>
                      <Tag color="warning" bordered={false}>待确认</Tag>
                    </div>
                  </List.Item>
                )} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待确认" />
            )}
          </Card>

          {/* 未处理留言 */}
          <Card className="!rounded-2xl" title={<span className="text-sm"><MessageOutlined className="mr-1 text-blue-500" />未处理留言</span>}
            extra={<a onClick={() => nav('/customer/guestbooks')} className="text-xs text-brand cursor-pointer">查看全部</a>}>
            {todos?.counts?.guestbook_unread ? (
              <List size="small" dataSource={todos?.guestbook_list || []}
                renderItem={(g: any) => (
                  <List.Item className="cursor-pointer hover:bg-soft/50 !px-2 !py-1.5"
                    onClick={() => nav('/customer/guestbooks')}>
                    <div className="w-full">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{g.name || '匿名'}</span>
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-500">未处理</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-sub">{g.content}</div>
                    </div>
                  </List.Item>
                )} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无新留言" />
            )}
          </Card>
        </div>

        {/* 主图表：预约趋势 */}
        <div className="mt-4">
          <Card className="!rounded-2xl" title={<span className="text-sm"><RiseOutlined className="mr-1 text-brand" />预约趋势（近 30 天）</span>}
            extra={<span className="text-xs text-sub">虚线 = 提交→到诊转化率</span>}>
            <EChart option={trendOption} height={320} />
          </Card>
        </div>

        {/* 各门店预约对比 */}
        <div className="mt-4">
          <Card className="!rounded-2xl" title={<span className="text-sm"><CalendarOutlined className="mr-1 text-blue-500" />各门店预约对比</span>}>
            <EChart option={storesOption} height={320} />
          </Card>
        </div>

        {/* 医生维度：号源利用率 / 已确认 / 爽约率 */}
        <Card className="mt-4 !rounded-2xl" title={<span className="text-sm"><TrophyOutlined className="mr-1 text-orange-500" />医生出诊与号源表现</span>}
          extra={<span className="text-xs text-sub">未来14天号源</span>}>
          {(doctors || []).length ? (
            <div className="overflow-x-auto pt-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-sub">
                    <th className="py-2 pr-3 font-normal">医生</th>
                    <th className="py-2 pr-3 font-normal">号源利用率</th>
                    <th className="py-2 pr-3 font-normal text-right">已确认/到诊</th>
                    <th className="py-2 pr-3 font-normal text-right">爽约率</th>
                  </tr>
                </thead>
                <tbody>
                  {(doctors || []).map((d: any) => (
                    <tr key={d.doctor_id} className="border-t border-line">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-ink">{d.name}</div>
                        <div className="text-xs text-sub">{d.title}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <Progress percent={Math.round((d.utilization || 0) * 100)} size="small" strokeColor={BRAND} />
                          <span className="text-xs text-sub whitespace-nowrap">{d.used}/{d.quota_total}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-ink">{d.confirmed}</td>
                      <td className="py-2.5 pr-3 text-right">
                        <span style={{ color: (d.no_show_rate || 0) > 0.1 ? RED : GREEN }}>{Math.round((d.no_show_rate || 0) * 100)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚无医生数据" />
          )}
        </Card>

        {/* 底部：服务 TOP5 + 简报 */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card className="!rounded-2xl" title={<span className="text-sm"><TrophyOutlined className="mr-1 text-orange-500" />热门服务 TOP 5</span>}
            extra={<span className="text-xs text-sub">基于待办 / 即将到诊数据</span>}>
            {topServices.length ? (
              <div className="space-y-2.5 pt-2">
                {topServices.map(([name, n], idx) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-bold text-white"
                      style={{ background: [BRAND, GREEN, BLUE, ORANGE, PURPLE][idx] || '#999' }}>{idx + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium text-ink">{name}</span>
                        <span className="ml-2 shrink-0 font-semibold" style={{ color: BRAND }}>{n}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded bg-mist">
                        <div className="h-full rounded" style={{ width: `${(n / topMax) * 100}%`,
                          background: `linear-gradient(90deg, ${BRAND}, ${ORANGE})` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚无服务数据" />
            )}
          </Card>

          <Card className="!rounded-2xl" title={<span className="text-sm"><AlertOutlined className="mr-1 text-red-500" />运营简报</span>}>
            <ul className="space-y-2 pt-2 text-sm">
              {brief.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: BRAND }} />
                  <span className="text-ink/85 leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Spin>
    </div>
  )
}
