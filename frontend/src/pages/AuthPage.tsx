// 登录 / 注册 / 找回密码（三合一，按 mode 切换）
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { sendCode, login, register, resetPassword, saveSession } from '../api/auth'

type Mode = 'login' | 'register' | 'reset'

export default function AuthPage({ mode: initial = 'login' }: { mode?: Mode }) {
  const toast = useToast()
  const loc = useLocation()
  const nav = useNavigate()
  const [mode, setMode] = useState<Mode>(initial)

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const from = (loc.state as any)?.from || '/account'

  const send = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { toast.show('请输入正确的手机号', 'error'); return }
    setLoading(true)
    try {
      const r: any = await sendCode(phone)
      const dev = r?.dev_code
      if (dev) toast.show(`验证码已发送（dev 联调码：${dev}）`, 'info')
      else toast.show('验证码已发送', 'success')
      let n = 60
      setCountdown(n)
      const t = setInterval(() => { n -= 1; setCountdown(n); if (n <= 0) clearInterval(t) }, 1000)
    } catch (e: any) { toast.show(e.message || '发送失败', 'error') }
    finally { setLoading(false) }
  }

  const submit = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { toast.show('请输入正确的手机号', 'error'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        const out: any = await login({ phone, password })
        saveSession(out)
        toast.show('登录成功', 'success')
        nav(from, { replace: true })
      } else if (mode === 'register') {
        if (!code || !password) { toast.show('请填写验证码与新密码', 'error'); setLoading(false); return }
        const out: any = await register({ phone, code, password, nickname })
        saveSession(out)
        toast.show('注册成功', 'success')
        nav('/account', { replace: true })
      } else {
        if (!code || !password) { toast.show('请填写验证码与新密码', 'error'); setLoading(false); return }
        await resetPassword({ phone, code, password })
        toast.show('密码已重置，请登录', 'success')
        setMode('login')
      }
    } catch (e: any) { toast.show(e.message || '操作失败', 'error') }
    finally { setLoading(false) }
  }

  const tabBtn = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        mode === m ? 'border-brand text-brand' : 'border-transparent text-sub hover:text-ink'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="container-content py-16">
      <div className="card mx-auto max-w-md p-8">
        <h1 className="section-title text-center">悦芽口腔 · 家长中心</h1>
        <div className="mt-5 flex justify-center gap-2 border-b border-line">
          {tabBtn('login', '登录')}
          {tabBtn('register', '注册')}
          {tabBtn('reset', '找回密码')}
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-sub">手机号</span>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11 位手机号" />
          </label>

          {mode !== 'login' && (
            <label className="block">
              <span className="mb-1 block text-sm text-sub">验证码</span>
              <div className="flex gap-2">
                <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 位验证码" />
                <button className="btn-ghost shrink-0 !px-4" onClick={send} disabled={countdown > 0 || loading}>
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </label>
          )}

          {mode === 'register' && (
            <label className="block">
              <span className="mb-1 block text-sm text-sub">昵称（可选）</span>
              <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="宝宝昵称 / 家长称呼" />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm text-sub">{mode === 'login' ? '密码' : '新密码'}</span>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="登录密码" />
          </label>

          <button className="btn-brand w-full !py-3" disabled={loading} onClick={submit}>
            {loading ? '处理中…' : mode === 'login' ? '登录' : mode === 'register' ? '注册并登录' : '重置密码'}
          </button>

          {/* 个保法提示：方案 §15/§16 要求登录/注册入口即告知个人信息收集目的与范围 */}
          <p className="text-center text-xs leading-relaxed text-sub">
            注册/登录即表示您同意我们依据《个人信息保护法》收集您的手机号，仅用于账户安全与预约诊疗服务；
            您可随时在「我的账户」中管理或删除。详见<Link to="/legal/privacy" className="text-brand hover:underline">隐私政策</Link>。
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-sub">
          {mode === 'login' ? (
            <>还没有账号？<Link to="/register" className="text-brand hover:underline">立即注册</Link></>
          ) : (
            <>已有账号？<Link to="/login" className="text-brand hover:underline">返回登录</Link></>
          )}
        </p>
      </div>
    </div>
  )
}
