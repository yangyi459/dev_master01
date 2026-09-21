// 排班管理（M3 升级版）：医生 × 日期 × 时段矩阵，点格切换 available
// 设计要点：
//  1) 多源兼容：接口可能返 Array / {items} / {list}，统一 normalize
//  2) 三态：骨架加载 / 数据就绪 / 接口失败（页面级友好错误）
//  3) 表头 sticky、hover 高亮、本周统计 chip、可一键批量生成
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Button, Space, Modal, Form, Select, DatePicker, InputNumber, Skeleton, Empty, Tooltip, Badge, message, Spin, Alert, Tag } from 'antd'
import { LeftOutlined, RightOutlined, PlusOutlined, ReloadOutlined, ExclamationCircleOutlined, CalendarOutlined } from '@ant-design/icons'
import { getSchedules, patchSchedule, batchSchedules, getDoctorsPublic, getStoresPublic } from '../../api/m3'

dayjs.extend(isoWeek)

const WEEK_SLOTS = ['09:00-10:00', '14:00-15:00', '16:00-17:00']
const BRAND = '#FF7A45'

// 任何「对象/数组/对象套数组」都尽量解析出数组
const asArray = (x: any): any[] => {
  if (Array.isArray(x)) return x
  if (!x || typeof x !== 'object') return []
  if (Array.isArray(x.items)) return x.items
  if (Array.isArray(x.list)) return x.list
  if (Array.isArray(x.data)) return x.data
  if (Array.isArray(x.records)) return x.records
  return []
}

export default function Schedules() {
  const [weekStart, setWeekStart] = useState<dayjs.Dayjs>(dayjs().startOf('isoWeek'))
  const [storeId, setStoreId] = useState<number | undefined>(undefined)
  const [doctors, setDoctors] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [resp, setResp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [batchOpen, setBatchOpen] = useState(false)
  const [quotaEdit, setQuotaEdit] = useState<{ id: number; quota: number } | null>(null)
  const [quotaForm] = Form.useForm()
  const [form] = Form.useForm()
  const [msg, ctx] = message.useMessage()

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = { week_start: weekStart.format('YYYY-MM-DD') }
      if (storeId) params.store_id = storeId

      const [s, d, st] = await Promise.all([
        getSchedules(params).catch((e) => {
          // 单接口失败不阻塞其它数据
          // eslint-disable-next-line no-console
          console.warn('[schedules] load schedule fail:', e?.message)
          return { items: [], slots: WEEK_SLOTS }
        }),
        getDoctorsPublic().catch((e) => {
          // eslint-disable-next-line no-console
          console.warn('[schedules] load doctors fail:', e?.message)
          return []
        }),
        getStoresPublic().catch((e) => {
          // eslint-disable-next-line no-console
          console.warn('[schedules] load stores fail:', e?.message)
          return []
        }),
      ])

      setResp(s || { items: [], slots: WEEK_SLOTS })
      setDoctors(asArray(d))
      setStores(asArray(st))
    } catch (e: any) {
      setError(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [weekStart, storeId])

  const cellMap = useMemo(() => {
    const m: Record<string, any> = {}
    ;(resp?.items || []).forEach((it: any) => {
      m[`${it.doctor_id}|${it.work_date}|${it.slot}`] = it
    })
    return m
  }, [resp])

  const dates = useMemo(() => {
    const arr: dayjs.Dayjs[] = []
    for (let i = 0; i < 7; i++) arr.push(weekStart.add(i, 'day'))
    return arr
  }, [weekStart])

  const slots: string[] = resp?.slots?.length ? resp.slots : WEEK_SLOTS
  const rows: any[] = storeId ? doctors.filter((d: any) => d?.store_id === storeId) : doctors
  const todayStr = dayjs().format('YYYY-MM-DD')

  // 统计
  const stats = useMemo(() => {
    let sched = 0, avail = 0, noav = 0, usedTotal = 0, fullCnt = 0
    Object.values(cellMap).forEach((c: any) => {
      sched++
      usedTotal += c.used || 0
      if (c.available === 1) {
        avail++
        if ((c.quota || 0) - (c.used || 0) <= 0) fullCnt++
      } else noav++
    })
    return { sched, avail, noav, usedTotal, fullCnt }
  }, [cellMap])

  const toggle = async (docId: number, date: string, slot: string) => {
    const cell = cellMap[`${docId}|${date}|${slot}`]
    if (!cell) {
      msg.warning('该格暂无排班，请先用「批量生成」初始化')
      return
    }
    try {
      await patchSchedule(cell.id, { available: cell.available === 1 ? 0 : 1 })
      load()
    } catch (e: any) {
      msg.error(e?.message || '更新失败')
    }
  }

  const openQuota = (cell: any) => {
    quotaForm.setFieldsValue({ quota: cell.quota })
    setQuotaEdit({ id: cell.id, quota: cell.quota })
  }
  const doSetQuota = async () => {
    if (!quotaEdit) return
    const v = await quotaForm.validateFields()
    try {
      await patchSchedule(quotaEdit.id, { quota: v.quota })
      msg.success('号源上限已更新')
      setQuotaEdit(null)
      load()
    } catch (e: any) {
      msg.error(e?.message || '更新失败')
    }
  }

  const doBatch = async () => {
    const v = await form.validateFields()
    try {
      const r: any = await batchSchedules({
        week_start: dayjs(v.week_start).format('YYYY-MM-DD'),
        store_id: v.store_id,
        slots: v.slots,
        available: 1,
        quota: v.quota ?? 3,
      })
      msg.success(`批量生成完成，新增 ${r?.created ?? 0} 条`)
      setBatchOpen(false)
      load()
    } catch (e: any) {
      msg.error(e?.message || '批量生成失败')
    }
  }

  const weekLabel = `${weekStart.format('YYYY-MM-DD')} ~ ${weekStart.add(6, 'day').format('YYYY-MM-DD')}`

  return (
    <div className="space-y-3">
      {ctx}
      {/* 顶部 */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
              <CalendarOutlined className="text-brand" /> 排班管理
            </h2>
            <p className="mt-0.5 text-xs text-sub">点击时段方块可快速切换「可约 / 不可约」；点击「批量生成」可一键排满本周</p>
          </div>
          <Space wrap>
            <Select
              allowClear
              placeholder="全部门店"
              style={{ width: 180 }}
              value={storeId}
              onChange={(v) => setStoreId(v)}
              options={stores.map((s: any) => ({ value: s.id, label: s.name }))}
            />
            <Button icon={<LeftOutlined />} onClick={() => setWeekStart(weekStart.add(-7, 'day'))} />
            <DatePicker
              value={weekStart}
              onChange={(d) => d && setWeekStart(d.startOf('isoWeek'))}
              placeholder="选择周"
              format="YYYY-MM-DD"
              style={{ width: 140 }}
              allowClear={false}
            />
            <Button icon={<RightOutlined />} onClick={() => setWeekStart(weekStart.add(7, 'day'))} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setBatchOpen(true)}>
              批量生成
            </Button>
            <Button icon={<ReloadOutlined />} onClick={load} />
          </Space>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-sub">
          <Badge color={BRAND} text="可约" />
          <Badge color="#f5222d" text="不可约" />
          <Badge color="#d9d9d9" text="未排班" />
          <span className="ml-auto flex items-center gap-2">
            <Tag color="blue">本周 {weekLabel}</Tag>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-600">已排 {stats.sched}</span>
            <span className="rounded bg-green-50 px-2 py-0.5 text-green-600">可约 {stats.avail}</span>
            <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-600">已约 {stats.usedTotal} 号</span>
            {stats.fullCnt > 0 && (
              <span className="rounded bg-orange-50 px-2 py-0.5 text-orange-500">满号 {stats.fullCnt}</span>
            )}
            {stats.noav > 0 && (
              <span className="rounded bg-red-50 px-2 py-0.5 text-red-500">不可约 {stats.noav}</span>
            )}
          </span>
        </div>
      </div>

      {/* 接口失败兜底（不再白屏） */}
      {error && !loading && (
        <Alert
          type="error"
          showIcon
          message="排班数据加载失败"
          description={error}
          action={<Button danger onClick={load}>重新加载</Button>}
        />
      )}

      {/* 主表 */}
      <Spin spinning={loading}>
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-soft text-sub">
                <th className="sticky left-0 top-0 z-20 min-w-[160px] bg-soft p-3 text-left font-medium">医生</th>
                {dates.map((d) => {
                  const ds = d.format('YYYY-MM-DD')
                  const isToday = ds === todayStr
                  return (
                    <th key={ds} className={`sticky top-0 z-10 min-w-[130px] bg-soft p-3 text-center font-medium ${isToday ? '!bg-brand/5' : ''}`}>
                      <div className={isToday ? 'font-bold text-brand' : ''}>{d.format('MM-DD')}</div>
                      <div className="text-xs">周{'日一二三四五六'[d.day()]}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="bg-white p-3">
                      <Skeleton.Avatar active size="small" shape="circle" />
                    </td>
                    {dates.map((d) => (
                      <td key={d.format('YYYY-MM-DD')} className="p-3">
                        <Skeleton.Input active size="small" block />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <div>
                          <div className="text-sub">暂无医生数据</div>
                          <div className="mt-1 text-xs text-sub">
                            {doctors.length === 0
                              ? '请先在「医生管理」中添加医生'
                              : '当前选择门店下没有医生，可切换或清空门店筛选'}
                          </div>
                        </div>
                      }
                    >
                      <Button type="primary" onClick={() => setBatchOpen(true)}>前往批量生成排班</Button>
                    </Empty>
                  </td>
                </tr>
              ) : (
                rows.map((doc: any) => (
                  <tr key={doc.id} className="border-t border-line hover:bg-soft/30">
                    <td className="sticky left-0 z-10 bg-white p-3 font-medium text-ink">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                          {doc?.name?.slice(0, 1) || '医'}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate">{doc?.name || `医生#${doc?.id}`}</div>
                          <div className="truncate text-xs text-sub">{doc?.title || '医生'}</div>
                        </div>
                      </div>
                    </td>
                    {dates.map((d) => {
                      const dateStr = d.format('YYYY-MM-DD')
                      const isToday = dateStr === todayStr
                      return (
                        <td key={dateStr} className={`p-2 align-top ${isToday ? 'bg-brand/[0.02]' : ''}`}>
                          <div className="flex flex-col gap-1.5">
                            {slots.map((slot) => {
                              const cell = cellMap[`${doc?.id}|${dateStr}|${slot}`]
                              const on = cell?.available === 1
                              const remaining = cell ? cell.quota - cell.used : 0
                              const full = !!cell && on && remaining <= 0
                              const badge = !cell
                                ? { t: '未排班', c: 'bg-mist text-sub' }
                                : !on
                                ? { t: '不可约', c: 'bg-red-50 text-red-500' }
                                : full
                                ? { t: `满 ${cell.used}/${cell.quota}`, c: 'bg-orange-50 text-orange-500' }
                                : { t: `余 ${remaining}/${cell.quota}`, c: 'bg-brand/10 text-brand' }
                              return (
                                <Tooltip
                                  title={cell ? (on ? `点击停诊；当前余 ${remaining}/${cell.quota}` : '点击开诊') : '未排班，请先批量生成'}
                                  key={slot}
                                >
                                  <div className="relative">
                                    <button
                                      onClick={() => toggle(doc?.id, dateStr, slot)}
                                      className={`w-full rounded px-2 py-1 text-xs transition ${badge.c}`}
                                    >
                                      <div>{slot}</div>
                                      <div className="mt-0.5 font-medium">{badge.t}</div>
                                    </button>
                                    {cell && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); openQuota(cell) }}
                                        className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded bg-white/70 text-[10px] leading-none text-sub hover:text-brand"
                                        title="设置号源上限"
                                      >⚙</button>
                                    )}
                                  </div>
                                </Tooltip>
                              )
                            })}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Spin>

      <Modal title="批量生成周排班" open={batchOpen} onCancel={() => setBatchOpen(false)} onOk={doBatch} okText="生成">
        <Form form={form} layout="vertical" initialValues={{ week_start: dayjs(weekStart), slots: WEEK_SLOTS, quota: 3 }}>
          <Form.Item name="week_start" label="周起始（周一）" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="store_id" label="门店" rules={[{ required: true }]}>
            <Select options={stores.map((s: any) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="slots" label="时段" rules={[{ required: true }]}>
            <Select mode="tags" placeholder="输入时段，如 09:00-10:00" />
          </Form.Item>
          <Form.Item name="quota" label="号源上限（每时段可约人数）" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
          <p className="text-xs text-sub">已存在的排班将自动跳过，不会重复创建；新生成排班默认按此号源上限。</p>
        </Form>
      </Modal>

      <Modal title="设置号源上限" open={!!quotaEdit} onCancel={() => setQuotaEdit(null)} onOk={doSetQuota} okText="保存">
        <p className="mb-3 text-xs text-sub">设置该医生此日期时段的每时段可约人数（号源上限）。已约号数不受影响。</p>
        <Form form={quotaForm} layout="vertical">
          <Form.Item name="quota" label="号源上限" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
