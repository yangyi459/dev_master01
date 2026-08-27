// 顶部导航 Nav：严格对齐「前台顶部导航原型」
// - Logo：品牌橙圆 + 白色十字 + 「悦芽口腔」+ Slogan
// - 主导航：首页 · 诊疗项目（下拉4项） · 真实案例 · 口腔科普 · 预约挂号（CTA橙色） · 关于我们（下拉5项，含门店分布 tag）
// - 登录态：未登录「登录/注册」；登录后「我的」下拉
// - 移动端：≤900px 汉堡菜单 44×44，展开面板含全部菜单 + 子项缩进
import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useParent } from '../auth/parent'

const Logo = () => (
  <Link to="/" className="flex items-center gap-2.5">
    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </span>
    <div className="flex flex-col leading-tight">
      <span className="text-lg font-bold text-ink">悦芽口腔</span>
      <span className="text-[11px] font-medium tracking-wider text-sub">帮孩子快乐看牙</span>
    </div>
  </Link>
)

interface NavItem {
  label: string
  to: string
  children?: { label: string; to: string; tag?: string }[]
}

const NAV: NavItem[] = [
  { label: '首页', to: '/' },
  {
    label: '诊疗项目',
    to: '/services',
    children: [
      { label: '儿童口腔检查', to: '/services' },
      { label: '龋齿防治', to: '/services' },
      { label: '早期矫治', to: '/services' },
      { label: '舒适化治疗', to: '/services' },
    ],
  },
  { label: '真实案例', to: '/cases' },
  { label: '口腔科普', to: '/articles' },
  {
    label: '关于我们',
    to: '/about#brand-story',
    children: [
      { label: '品牌故事', to: '/about#brand-story' },
      { label: '医生团队', to: '/about#doctors' },
      { label: '门店信息', to: '/about#stores' },
      { label: '门店分布', to: '/about#stores', tag: '一键导航' },
      { label: '联系我们', to: '/about#contact' },
    ],
  },
]

const MEMBER_NAV = [
  { label: '我的账户', to: '/account' },
  { label: '我的预约', to: '/account/appointments' },
  { label: '我的孩子', to: '/account/children' },
  { label: '个人资料', to: '/account/profile' },
  { label: '专享服务', to: '/account/benefits', tag: '新' },
]

function useClickOutside(ref: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onClose])
}

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [memberOpen, setMemberOpen] = useState(false)
  const loc = useLocation()
  const { parent, ready } = useParent()
  const memberRef = useRef<HTMLDivElement>(null)

  useClickOutside(memberRef, () => setMemberOpen(false))

  const isActive = (to: string) => {
    const base = to.split('?')[0].split('#')[0]
    if (base === '/') return loc.pathname === '/'
    return loc.pathname.startsWith(base)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-content flex h-16 items-center justify-between">
        <Logo />

        {/* 桌面主导航 */}
        <nav className="hidden items-center gap-1 tablet:flex">
          {NAV.map((item, i) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => setDropIndex(i)}
              onMouseLeave={() => setDropIndex(null)}
            >
              <Link
                to={item.to}
                className={`flex items-center gap-1 rounded-full px-3 py-2 text-[15px] font-medium transition ${
                  isActive(item.to) ? 'text-brand-ink' : 'text-ink hover:text-brand-ink'
                }`}
              >
                {item.label}
                {item.children && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${dropIndex === i ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </Link>

              {item.children && dropIndex === i && (
                <div className="absolute left-0 top-full pt-2">
                  <div className="w-52 rounded-xl border border-line bg-white py-2 shadow-lg">
                    {item.children.map((c) => (
                      <Link
                        key={c.label + c.to}
                        to={c.to}
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-ink hover:bg-soft hover:text-brand-ink"
                      >
                        <span>{c.label}</span>
                        {c.tag && (
                          <span className="rounded bg-teal/10 px-2 py-0.5 text-xs text-teal">{c.tag}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* 右侧：登录态 + CTA + 汉堡 */}
        <div className="flex items-center gap-3">
          {ready && (
            <>
              {parent ? (
                <div className="relative hidden tablet:block" ref={memberRef}>
                  <button
                    onClick={() => setMemberOpen((v) => !v)}
                    className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-ink hover:bg-soft hover:text-brand-ink"
                  >
                    我的
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${memberOpen ? 'rotate-180' : ''}`}>
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {memberOpen && (
                    <div className="absolute right-0 top-full w-44 rounded-xl border border-line bg-white py-2 shadow-lg">
                      {MEMBER_NAV.map((c) => (
                        <Link
                          key={c.label}
                          to={c.to}
                          onClick={() => setMemberOpen(false)}
                          className="flex items-center justify-between px-4 py-2 text-sm text-ink hover:bg-soft hover:text-brand-ink"
                        >
                          <span>{c.label}</span>
                          {c.tag && (
                            <span className="rounded bg-brand/10 px-1.5 py-0.5 text-xs text-brand-ink">{c.tag}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="hidden text-sm font-medium text-ink hover:text-brand-ink tablet:inline-flex">
                  登录 / 注册
                </Link>
              )}
            </>
          )}

          <Link to="/booking" className="btn-brand hidden sm:inline-flex">
            预约挂号
          </Link>

          {/* 汉堡按钮 44×44 */}
          <button
            className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-full border border-line tablet:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="菜单"
          >
            <span className={`h-0.5 w-5 rounded-full bg-ink transition ${mobileOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
            <span className={`h-0.5 w-5 rounded-full bg-ink transition ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`h-0.5 w-5 rounded-full bg-ink transition ${mobileOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="border-t border-line bg-white px-4 py-4 tablet:hidden">
          {NAV.map((item) => (
            <div key={item.label}>
              <Link
                to={item.to}
                onClick={() => !item.children && setMobileOpen(false)}
                className="flex items-center justify-between border-b border-line py-3 text-base font-medium text-ink"
              >
                {item.label}
              </Link>
              {item.children && (
                <div className="pl-4">
                  {item.children.map((c) => (
                    <Link
                      key={c.label + c.to}
                      to={c.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between py-2.5 text-sm text-sub hover:text-brand-ink"
                    >
                      <span>{c.label}</span>
                      {c.tag && <span className="rounded bg-teal/10 px-2 py-0.5 text-xs text-teal">{c.tag}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="mt-3 space-y-2">
            {parent ? (
              <>
                {MEMBER_NAV.map((c) => (
                  <Link key={c.label} to={c.to} onClick={() => setMobileOpen(false)} className="flex items-center justify-between py-2 text-sm text-sub">
                    {c.label}
                    {c.tag && <span className="rounded bg-brand/10 px-1.5 py-0.5 text-xs text-brand-ink">{c.tag}</span>}
                  </Link>
                ))}
                <Link to="/account" onClick={() => setMobileOpen(false)} className="btn-brand w-full text-center">我的账户</Link>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-brand w-full text-center">登录 / 注册</Link>
            )}
            <Link to="/booking" onClick={() => setMobileOpen(false)} className="btn-brand w-full text-center">预约挂号</Link>
          </div>
        </div>
      )}
    </header>
  )
}
