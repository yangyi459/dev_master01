// 排班管理（M3）：医生 × 日期 × 时段矩阵，点格切换 available
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Button, Space, Tag, Modal, Form, InputNumber, Select, DatePicker, message, Spin, Badge, Tooltip } from 'antd'
import { LeftOutlined, RightOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { getSchedules, patchSchedule, batchSchedules, getDoctorsPublic, getStoresPublic } from '../../api/m3'

dayjs.extend(isoWeek)

const WEEK_SLOTS = ['09:00-10:00', '14:00-15:00', '16:00-17:00']

export default function Schedules() {
  const [weekStart, setWeekStart] = useState<dayjs.Dayjs>(dayjs().startOf('isoWeek'))
  const [storeId, setStoreId] = useState<number | undefined>(undefined)
  const [doctors, setDoctors] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [resp, setResp] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [form] = Form.useForm()
  const [msg, ctx] = message.useMessage()

  const load = async () => {
    setLoading(true)
    try {
      const [s, d, st] = await Promise.all([
        getSchedules({ store_id: storeId, week_start: weekStart.format('YYYY-MM-DD') }),
        getDoctorsPublic(),
        getStoresPublic(),
      ])
      setResp(s)
      setDoctors(d?.list || d || [])
      setStores(st?.list || st || [])
    } catch (e: any) {
      msg.error(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, storeId])

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
  const rows = storeId ? doctors.filter((d: any) => d.store_id === storeId) : doctors
  const todayStr = dayjs().format('YYYY-MM-DD')

  const toggle = async (docId: number, date: string, slot: string) => {
    const cell = cellMap[`${docId}|${date}|${slot}`]
    if (!cell) {
      msg.warning('该格暂无排班，请先用「批量生成」初始化')
      return
    }
    try {
      await patchSchedule(cell.id, cell.available === 1 ? 0 : 1)
      load()
    } catch (e: any) {
      msg.error(e.message)
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
      })
      msg.success(`批量生成完成，新增 ${r?.created ?? 0} 条`)
      setBatchOpen(false)
      load()
    } catch (e: any) {
      msg.error(e.message)
    }
  }

  const weekLabel = `${weekStart.format('YYYY-MM-DD')} ~ ${weekStart.add(6, 'day').format('YYYY-MM-DD')}`

  return (
    <div>
      {ctx}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">排班管理</h2>
          <p className="text-xs text-sub">点击时段方块可快速切换「可约 / 不可约」</p>
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
          />
          <Button icon={<RightOutlined />} onClick={() => setWeekStart(weekStart.add(7, 'day'))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setBatchOpen(true)}>
            批量生成
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load} />
        </Space>
      </div>

      <div className="mb-3 flex items-center gap-3 text-xs text-sub">
        <Badge color="#FF7A45" text="可约" />
        <Badge color="#f5222d" text="不可约" />
        <Badge color="#d9d9d9" text="未排班" />
        <span className="ml-auto">{weekLabel}</span>
      </div>

      <Spin spinning={loading}>
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-soft text-sub">
                <th className="sticky left-0 z-10 min-w-[140px] bg-soft p-3 text-left font-medium">医生</th>
                {dates.map((d) => {
                  const isToday = d.format('YYYY-MM-DD') === todayStr
                  return (
                    <th key={d.format('YYYY-MM-DD')} className={`min-w-[130px] p-3 text-center font-medium ${isToday ? 'bg-brand/5' : ''}`}>
                      <div className={isToday ? 'font-bold text-brand' : ''}>{d.format('MM-DD')}</div>
                      <div className="text-xs">周{'日一二三四五六'[d.day()]}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((doc: any) => (
                <tr key={doc.id} className="border-t border-line">
                  <td className="sticky left-0 z-10 bg-white p-3 font-medium text-ink">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                        {doc.name?.slice(0, 1) || '医'}
                      </div>
                      <div>
                        <div>{doc.name}</div>
                        <div className="text-xs text-sub">{doc.title || '医生'}</div>
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
                            const cell = cellMap[`${doc.id}|${dateStr}|${slot}`]
                            const on = cell?.available === 1
                            return (
                              <Tooltip title={cell ? `点击切换为「${on ? '不可约' : '可约'}」` : '未排班，请先批量生成'} key={slot}>
                                <button
                                  onClick={() => toggle(doc.id, dateStr, slot)}
                                  className={`rounded px-2 py-1 text-xs transition ${
                                    !cell
                                      ? 'bg-mist text-sub hover:bg-gray-200'
                                      : on
                                      ? 'bg-brand/10 text-brand hover:bg-brand/20'
                                      : 'bg-red-50 text-red-500 hover:bg-red-100'
                                  }`}
                                >
                                  {slot}
                                </button>
                              </Tooltip>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-sub">
                    暂无医生数据，请先在「医生管理」中添加医生。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Spin>

      <Modal title="批量生成周排班" open={batchOpen} onCancel={() => setBatchOpen(false)} onOk={doBatch} okText="生成">
        <Form form={form} layout="vertical" initialValues={{ week_start: dayjs(weekStart), slots: WEEK_SLOTS }}>
          <Form.Item name="week_start" label="周起始（周一）" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="store_id" label="门店" rules={[{ required: true }]}>
            <Select options={stores.map((s: any) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="slots" label="时段" rules={[{ required: true }]}>
            <Select mode="tags" placeholder="输入时段，如 09:00-10:00" />
          </Form.Item>
          <p className="text-xs text-sub">已存在的排班将自动跳过，不会重复创建。</p>
        </Form>
      </Modal>
    </div>
  )
}
