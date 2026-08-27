// 在线咨询：右下角固定悬浮按钮 + 客服卡片
// 功能：展示客服电话（一键拨打）、快捷预约入口、留言表单；无人工客服时通过 guestbook 留言
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSiteConfig, postGuestbook } from '../api/public'
import { useToast } from './Toast'

function useClickOutside(ref: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onClose])
}

export default function OnlineConsult() {
  const [open, setOpen] = useState(false)
  const [cfg, setCfg] = useState<any>(null)
  const [form, setForm] = useState({ name: '', phone: '', content: '' })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { show } = useToast()
  useClickOutside(ref, () => setOpen(false))

  useEffect(() => {
    getSiteConfig().then(setCfg).catch(() => {})
  }, [])

  const phone = cfg?.contact_phone || '400-000-0000'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.content) {
      show('请填写称呼、手机号和留言', 'error')
      return
    }
    setSubmitting(true)
    try {
      await postGuestbook(form)
      setSent(true)
      setForm({ name: '', phone: '', content: '' })
      show('留言已提交，顾问将尽快联系您', 'success')
    } catch (err: any) {
      show(err.message || '提交失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-[60]">
      {open && (
        <div className="mb-3 w-[300px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_40px_rgba(0,0,0,.16)]">
          <div className="bg-brand px-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-[15px] font-semibold text-cta-text">在线客服</h4>
                <p className="mt-0.5 text-xs text-cta-text/80">工作日 9:00-18:00 在线</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-lg leading-none text-cta-text/80 hover:text-cta-text"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
          </div>

          <div className="space-y-3 p-4 text-sm">
            {/* 电话 */}
            <div className="rounded-xl bg-mist p-3">
              <div className="text-sub">客服电话</div>
              <a href={`tel:${phone}`} className="mt-1 inline-flex items-center text-lg font-bold text-brand hover:underline">
                {phone}
              </a>
              <p className="mt-1 text-xs text-sub">点击号码可直接拨打</p>
            </div>

            {/* 快捷入口 */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/booking"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-soft py-2 text-center font-medium text-brand-ink transition hover:bg-brand/10"
              >
                立即预约
              </Link>
              <Link
                to="/about#contact"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-soft py-2 text-center font-medium text-brand-ink transition hover:bg-brand/10"
              >
                留言咨询
              </Link>
            </div>

            {/* 留言表单 */}
            {sent ? (
              <div className="rounded-xl bg-[#E9F8EF] p-3 text-center text-sm text-[#1B7F4B]">
                已收到您的留言，顾问将尽快联系您。
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="称呼"
                  className="input"
                />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="手机号"
                  className="input"
                />
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="想咨询的问题…"
                  rows={2}
                  className="input resize-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-brand w-full py-2 text-sm disabled:opacity-50"
                >
                  {submitting ? '提交中…' : '提交留言'}
                </button>
              </form>
            )}

            <p className="text-xs text-sub">
              非工作时间请留言，我们会尽快回复。急事请直接拨打客服电话。
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-14 w-14 place-items-center rounded-full bg-brand text-sm font-semibold text-white shadow-[0_8px_22px_rgba(255,122,69,.45)] transition hover:bg-[#ff8c5e]"
        aria-label="在线咨询"
      >
        客服
      </button>
    </div>
  )
}
