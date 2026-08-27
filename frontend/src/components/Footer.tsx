// 页脚 Footer：对齐「前台顶部导航原型」§7.8.1
// 四列：品牌区 / 快速导航 / 联系方式 / 营业时间
// 底部：法律链接 + 版权行
import { Link } from 'react-router-dom'
import { getSiteConfig } from '../api/public'
import { useEffect, useState } from 'react'

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </span>
    <div className="leading-tight">
      <div className="font-bold text-white">悦芽口腔</div>
      <div className="text-xs text-white/60">帮孩子快乐看牙</div>
    </div>
  </div>
)

export default function Footer() {
  const [cfg, setCfg] = useState<any>(null)
  useEffect(() => {
    getSiteConfig().then(setCfg).catch(() => {})
  }, [])

  const navLinks = [
    { label: '关于我们', to: '/about#brand-story' },
    { label: '诊疗项目', to: '/services' },
    { label: '真实案例', to: '/cases' },
    { label: '口腔科普', to: '/articles' },
    { label: '预约挂号', to: '/booking' },
    { label: '联系我们', to: '/about#contact' },
  ]

  const legalLinks = [
    { label: '隐私政策', to: '/privacy' },
    { label: '服务条款', to: '/terms' },
    { label: '医疗免责声明', to: '/disclaimer' },
  ]

  const phone = cfg?.contact_phone || '400-000-0000'
  const email = cfg?.contact_email || 'hello@yueya.com'
  const address = cfg?.contact_address || '上海市浦东新区示例路 1 号'
  const icp = cfg?.icp_number || '沪ICP备00000000号'

  return (
    <footer className="bg-footer text-white/80">
      <div className="container-content grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* 品牌区 */}
        <div>
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            专注 0-12 岁儿童口腔健康，用专业与温度守护每一颗小牙齿。
          </p>
        </div>

        {/* 快速导航 */}
        <div>
          <h4 className="mb-3 font-semibold text-white">快速导航</h4>
          <ul className="space-y-2 text-sm">
            {navLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-white/70 transition hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 联系方式 */}
        <div>
          <h4 className="mb-3 font-semibold text-white">联系方式</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li>
              咨询电话：
              <a href={`tel:${phone}`} className="text-white hover:text-brand">
                {phone}
              </a>
            </li>
            <li>
              电子邮箱：
              <a href={`mailto:${email}`} className="text-white hover:text-brand">
                {email}
              </a>
            </li>
            <li>总部地址：{address}</li>
          </ul>
        </div>

        {/* 法律与版权 */}
        <div>
          <h4 className="mb-3 font-semibold text-white">法律与版权</h4>
          <ul className="space-y-2 text-sm">
            {legalLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-white/70 transition hover:text-brand">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-content py-4 text-center text-xs text-white/40 sm:text-left">
          © {new Date().getFullYear()} 悦芽口腔 · {icp}
        </div>
      </div>
    </footer>
  )
}
