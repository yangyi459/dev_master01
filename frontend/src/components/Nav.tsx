// 顶部导航 Nav：严格对齐「前台顶部导航原型」
// - Logo：品牌橙圆 + 白色十字 + 「悦芽口腔」+ Slogan
// - 主导航：首页 · 诊疗项目 · 真实案例 · 口腔科普 · 预约挂号（CTA橙色） · 关于我们（下拉5项，含门店分布 tag）
// - 实时定位：
//   - hash 感知 — `/about#stores` 时「关于我们」应高亮（不仅按 pathname）
//   - 滚动联动 — 在 /about 页面用 IntersectionObserver 监听各 section，
//     自动高亮当前可视的子菜单项；点击子项走平滑滚动而非整页跳转
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
  { label: '诊疗项目', to: '/services' },
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

  // 当前路由的 hash（去掉 #）。当在 /about 页面时，用它判断对应 section 是否被选中。
  const routeHash = loc.hash.slice(1)
  // 滚动监听推出的活跃 section（独立于 loc.hash，因为滚动时需要即时高亮而不必等待 URL 变化）
  const [activeHash, setActiveHash] = useState<string>(routeHash)

  // 进入 /about 时挂 IntersectionObserver，离开时清理
  useEffect(() => {
    if (!loc.pathname.startsWith('/about')) {
      // 离开 about 时清空 activeHash，否则切回首页还停在 stores 会很奇怪
      setActiveHash('')
      return
    }
    // 收集所有挂在 NAV children 的 hash id
    const ids = NAV.flatMap((item) => (item.children || []).map((c) => c.to.split('#')[1])).filter(Boolean) as string[]
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (els.length === 0) return

    // 初始化：URL 里带 hash 就用它，否则用 IntersectionObserver
    const initial = routeHash && ids.includes(routeHash) ? routeHash : ''
    if (initial) setActiveHash(initial)

    const obs = new IntersectionObserver(
      (entries) => {
        // 取当前进入视口且离顶部最近的 section
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        const top = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        )
        setActiveHash(top.target.id)
      },
      {
        // 顶部 20% 之下到底部 60% 之上视为「激活带」—— 留出底部 40% 容差，
        // 让 stores / contact 处于页面下半区时也能命中
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname])

  // 路由 hash 变化时（如直接粘贴 #stores、点菜单项）同步 activeHash
  useEffect(() => {
    if (loc.pathname.startsWith('/about') && routeHash) setActiveHash(routeHash)
  }, [routeHash, loc.pathname])

  const onPage = loc.pathname.startsWith('/about')

  // 一级菜单 isActive：路径命中 +（如果有 hash）需 activeHash 匹配
  const isActive = (to: string): boolean => {
    const [base, anchor] = to.split('#')
    if (base === '/') return loc.pathname === '/'
    if (!loc.pathname.startsWith(base)) return false
    if (anchor) return activeHash === anchor
    return true
  }

  // 子菜单仅在 about 页面内高亮（用 activeHash 优先）
  const isChildActive = (child: { to: string }): boolean => {
    const [, anchor] = child.to.split('#')
    if (!anchor) return false
    if (onPage) return activeHash === anchor
    // 非 about 页面（如从首页跳过来）：不算激活
    return false
  }

  // 一级菜单自身在不在当前 pathname 上（用于决定"关于我们"父级是否高亮）
  // 若 pathname 是 /about 且任一子项 active，也视为父级 active
  const onTopSection = (item: NavItem): boolean => {
    if (!item.children) return isActive(item.to)
    if (!onPage) return false
    // 进入 /about 后只要当前活跃 hash 是该父菜单的子项就高亮
    return item.children.some((c) => isChildActive(c))
  }

  // 子菜单点击：在 about 页面时阻止硬跳走平滑滚动
  const handleChildClick = (e: React.MouseEvent, child: { to: string }) => {
    const [, anchor] = child.to.split('#')
    if (onPage && anchor && document.getElementById(anchor)) {
      e.preventDefault()
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveHash(anchor)
      // 同步 URL hash，方便复制/刷新保持位置
      window.history.replaceState(null, '', `#${anchor}`)
      setDropIndex(null)
    }
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
                onClick={(e) => {
                  // 一级菜单如果本身有 anchor（如 /about#brand-story），在 about 页面时也走平滑滚动
                  const [, anchor] = item.to.split('#')
                  if (anchor && onPage && document.getElementById(anchor)) {
                    e.preventDefault()
                    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    setActiveHash(anchor)
                    window.history.replaceState(null, '', `#${anchor}`)
                  }
                  setDropIndex(null)
                }}
                className={`flex items-center gap-1 rounded-full px-3 py-2 text-[15px] font-medium transition ${
                  onTopSection(item) ? 'text-brand-ink' : 'text-ink hover:text-brand-ink'
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
                        onClick={(e) => handleChildClick(e, c)}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm transition ${
                          isChildActive(c)
                            ? 'bg-soft text-brand-ink'
                            : 'text-ink hover:bg-soft hover:text-brand-ink'
                        }`}
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
                onClick={(e) => {
                  if (item.children) return
                  const [, anchor] = item.to.split('#')
                  if (anchor && onPage && document.getElementById(anchor)) {
                    e.preventDefault()
                    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    setActiveHash(anchor)
                    window.history.replaceState(null, '', `#${anchor}`)
                  }
                  setMobileOpen(false)
                }}
                className={`flex items-center justify-between border-b border-line py-3 text-base font-medium ${
                  onTopSection(item) ? 'text-brand-ink' : 'text-ink'
                }`}
              >
                {item.label}
              </Link>
              {item.children && (
                <div className="pl-4">
                  {item.children.map((c) => (
                    <Link
                      key={c.label + c.to}
                      to={c.to}
                      onClick={(e) => {
                        handleChildClick(e, c)
                        setMobileOpen(false)
                      }}
                      className={`flex items-center justify-between py-2.5 text-sm ${
                        isChildActive(c) ? 'text-brand-ink font-medium' : 'text-sub hover:text-brand-ink'
                      }`}
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
