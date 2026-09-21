// 诊疗项目详情：内容优先、章节完整，对标 CaseDetail / ArticleDetail 的深度
// - Hero + 项目介绍 + 治疗原理 + 适用人群 + 就诊流程 + 复诊周期 + 术前术后 + 常见问题 + 风险提示
// - 后台未录入详细内容时使用 FALLBACK 兜底，保证任意项目都有可阅读的章节
// - 底部相关项目（按分类）推荐
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getService, getServices, getDoctors } from '../api/public'

const IconCheck = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconClock = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const IconAge = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IconShield = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconInfo = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

interface FallbackPayload {
  intro: string
  principle: string
  suitable: string[]
  unsuitable: string[]
  prepare: string[]
  aftercare: string[]
  review_cycle: string
  risks: string[]
  highlights: { label: string; value: string }[]
}

// 按项目名/分类自动匹配的兜底内容；后台未录入详细字段时仍能呈现完整章节
const KEYWORD_RULES: { keys: string[]; data: FallbackPayload }[] = [
  {
    keys: ['涂氟', '防龋', '龋齿', '蛀牙'],
    data: {
      intro:
        '涂氟是通过在牙齿表面涂布高浓度氟化物，在牙釉质表层形成保护膜，提升牙齿对酸性物质的耐受力，从而降低龋齿发生率的一项常规儿童口腔预防项目。整个过程无创、无痛，孩子通常在 5-10 分钟内即可完成，是世界卫生组织（WHO）推荐的儿童口腔基础保健措施之一。',
      principle:
        '氟离子能够与牙釉质中的羟基磷灰石反应，生成更稳定的氟磷灰石晶体，提升釉质的抗酸能力；同时抑制口腔致龋菌的代谢活性，减缓牙菌斑产酸。涂氟后形成的保护层会在日常咀嚼、刷牙中逐渐消耗，因此需要每 3-6 个月复查补涂。',
      suitable: ['3-12 岁儿童作为常规防龋手段', '牙齿萌出不久、釉质尚未完全矿化', '已有早期脱矿白斑、可疑龋', '正畸治疗期间口腔卫生维护', '高龋风险（家族史 / 夜奶 / 含奶瓶入睡史）'],
      unsuitable: ['口腔溃疡或急性口腔炎症期间', '对氟化物成分过敏', '哮喘急性发作期', '孩子无法配合张口 1 分钟以上'],
      prepare: ['提前 1 小时完成正餐，避免治疗中呕吐', '就诊前 30 分钟不刷牙（保留少量菌斑定位）', '家长提前与孩子沟通「牙齿涂一层保护衣」的故事', '携带孩子常用的安抚物 / 绘本'],
      aftercare: ['涂氟后 30 分钟内不漱口、不喝水、不进食', '当天不刷牙，次日恢复正常清洁', '24 小时内避免高糖饮料与黏性食物', '3-6 个月复查一次，由医生评估补涂'],
      review_cycle: '建议每 3-6 个月复诊一次，高龋风险儿童每 3 个月一次。',
      risks: ['极个别孩子涂氟后短暂出现味觉异常，一般 30 分钟内恢复', '误吞大量氟化物可能引起胃肠不适，由专业医生操作可避免'],
      highlights: [
        { label: '操作时长', value: '5-10 分钟' },
        { label: '保护时长', value: '3-6 个月' },
        { label: '最佳起始', value: '3 岁起' },
        { label: '保护率', value: '降低龋齿 24%-46%' },
      ],
    },
  },
  {
    keys: ['窝沟封闭', '封闭'],
    data: {
      intro:
        '窝沟封闭是在磨牙（特别是六龄齿）咬合面的深窝沟处涂布流动性的封闭材料，固化后形成一层光滑的保护屏障，阻止食物残渣与致龋菌进入沟底，是世界卫生组织推荐的低成本、高效益防龋措施。',
      principle:
        '乳磨牙和年轻恒磨牙的咬合面有大量细而深的窝沟，牙刷毛难以进入清洁。封闭材料流入窝沟后固化成光滑表面，让食物残渣与细菌无法滞留，从而显著降低窝沟龋的发生率。',
      suitable: ['6-9 岁儿童（第一恒磨牙「六龄齿」萌出后）', '11-13 岁（第二恒磨牙萌出）', '乳磨牙深窝沟、易嵌塞食物', '釉质发育不全的牙齿'],
      unsuitable: ['已有明显龋坏的牙齿（需先治疗）', '牙齿尚未完全萌出、隔湿困难', '对树脂材料过敏'],
      prepare: ['提前清洁口腔（家长协助孩子饭后漱口）', '牙齿必须完全萌出、邻面无食物嵌塞', '孩子能配合张口 5-10 分钟'],
      aftercare: ['封闭后 2 小时内避免啃咬硬物（如苹果、玉米）', '可正常刷牙、使用牙线', '每 6 个月复查一次封闭剂是否脱落'],
      review_cycle: '建议每 6 个月复查一次，医生会检查封闭剂是否完整。',
      risks: ['封闭剂脱落率约 5-10%/年，可补封', '操作中误吞少量材料无毒，但需由医生操作'],
      highlights: [
        { label: '最佳时段', value: '6-9 岁' },
        { label: '操作时长', value: '10-15 分钟' },
        { label: '保护率', value: '降低窝沟龋 80%+' },
        { label: '复查', value: '每 6 个月' },
      ],
    },
  },
  {
    keys: ['矫治', '矫正', '正畸', '牙齿不齐', '地包天', '龅牙', '牙列'],
    data: {
      intro:
        '儿童早期矫治（Early Orthodontic Treatment）是针对 3-12 岁替牙期孩子的颌骨发育、牙弓形态与口腔功能进行早期干预的一类治疗，目标是引导颌骨正常发育、纠正不良习惯、为恒牙萌出留出足够空间，降低未来复杂矫治的概率。',
      principle:
        '儿童在 6-12 岁替牙期是颅面骨骼生长的高峰期，此时干预能借助生长潜力事半功倍。常用矫治器包括活动矫治器、功能矫治器（如 MRC、ETA）、简单固定矫治器等。治疗往往分两期：早期干预（替牙期）+ 恒牙期精细调整。',
      suitable: ['地包天（反颌）', '下颌后缩 / 小下巴', '牙弓狭窄、牙齿排列严重拥挤', '口呼吸 / 异常吞咽 / 吐舌习惯', '开颌、深覆颌、深覆盖', '恒牙萌出位置明显异常'],
      unsuitable: ['口腔卫生极差、活跃龋齿未控制', '骨骼发育已完成（一般 14 岁后效果有限）', '孩子无法配合佩戴矫治器'],
      prepare: ['提前完成全口洁牙与龋齿治疗', '拍摄口腔 X 光片（全景片 + 侧位片）', '取牙模或口扫建立数字化模型', '家长与孩子充分沟通矫治器佩戴时间与注意事项'],
      aftercare: ['活动矫治器每天佩戴 12-14 小时（含睡眠时间）', '每餐后清洁矫治器，避免热水变形', '每 4-6 周复诊一次', '避免啃咬硬物、口香糖', '配合唇肌训练 / 吞咽训练等家庭练习'],
      review_cycle: '替牙期干预通常 6-18 个月，恒牙期精细调整 12-24 个月，全程 1.5-3 年。',
      risks: ['初期佩戴矫治器可能有轻微异物感，1-2 周适应', '口腔卫生不到位可能引起牙龈炎', '极少数出现牙齿轻度松动（生理范围内）', '需家长高度配合才能达到理想效果'],
      highlights: [
        { label: '起始年龄', value: '3-12 岁' },
        { label: '干预周期', value: '6-18 个月' },
        { label: '复诊频率', value: '每 4-6 周' },
        { label: '治疗理念', value: '借助生长潜力' },
      ],
    },
  },
  {
    keys: ['拔牙', '拔乳牙', '多生牙'],
    data: {
      intro:
        '儿童拔牙是口腔科最常见的治疗之一，多见于乳牙滞留、多生牙、严重龋坏无法保留、正畸减数等情况。儿童拔牙与成人不同，医生会综合考虑恒牙胚位置、孩子配合度、术后愈合能力等因素。',
      principle:
        '乳牙拔除的时机需结合恒牙萌出情况：恒牙已萌出但乳牙未脱落（双排牙）、乳牙严重龋坏无法保留、乳牙根尖病变累及恒牙胚等情况都需要拔除。拔牙时医生会使用儿童专用器械，动作轻柔，最大化减少孩子紧张。',
      suitable: ['乳牙滞留、双排牙', '严重龋坏、无法保留的乳牙', '多生牙、影响正常牙列', '正畸治疗需要的减数牙', '外伤后无法保留的牙齿'],
      unsuitable: ['急性炎症期（需先抗炎）', '血液系统疾病、出血倾向', '孩子极度恐惧、无法配合（需提前行为引导或镇静）'],
      prepare: ['完成血常规 / 凝血功能检查（如有需要）', '孩子若有慢性病、过敏史需提前告知', '避免空腹拔牙，防止低血糖', '心理准备：用故事化语言解释「牙齿要换班」'],
      aftercare: ['咬棉球 30 分钟后吐掉', '2 小时内不进食、不漱口', '24 小时内不刷牙、不吸吮伤口', '3 天内进软食、温凉食物', '避免剧烈运动、游泳、吹奏乐器', '术后 1 周复查'],
      review_cycle: '术后 1 周复查伤口愈合；后续每 3-6 个月口腔常规检查。',
      risks: ['术后短暂渗血属正常', '极少数出现干槽症（多见于成人）', '邻牙轻微酸胀一般 1-3 天缓解', '孩子哭闹不配合可能延长操作时间'],
      highlights: [
        { label: '操作时长', value: '5-15 分钟' },
        { label: '恢复周期', value: '1-2 周' },
        { label: '常用麻药', value: 'STA 表面麻醉' },
        { label: '术后复查', value: '1 周' },
      ],
    },
  },
]

const DEFAULT_FALLBACK: FallbackPayload = {
  intro:
    '本项目由悦芽口腔经验丰富的儿童齿科医生团队实施，针对 0-12 岁儿童口腔特点设计诊疗方案。我们坚持「不痛、不怕、不强迫」的舒适化治疗原则，让孩子在温和的氛围中完成治疗。',
  principle:
    '悦芽口腔的诊疗理念遵循国际儿童齿科指南（AAPD），强调早期发现、舒适化治疗与全周期管理。所有器械均为儿童专用尺寸，所有操作由具备儿童行为引导经验的医生完成。',
  suitable: ['希望给孩子做常规口腔检查的家庭', '对牙科治疗有焦虑的孩子', '需要在友好环境中完成治疗的孩子', '希望获得长期口腔健康管理的家庭'],
  unsuitable: ['急性口腔炎症需先控制症状', '孩子无法配合（需提前行为引导）'],
  prepare: ['提前 1 小时完成正餐', '家长提前与孩子沟通就诊流程', '携带孩子常用的安抚物', '穿宽松舒适的衣服'],
  aftercare: ['治疗当天避免剧烈运动', '根据医生建议调整饮食', '按时复诊', '保持良好口腔卫生习惯'],
  review_cycle: '一般每 3-6 个月复查一次，具体遵医嘱。',
  risks: ['治疗中可能产生短暂不适，由医生及时处理', '极少数孩子出现术后反应，复诊即可缓解'],
  highlights: [
    { label: '目标人群', value: '0-12 岁' },
    { label: '治疗时长', value: '视项目而定' },
    { label: '麻醉方式', value: 'STA 表面麻醉' },
    { label: '复查周期', value: '3-6 个月' },
  ],
}

function pickFallback(name: string, categoryName: string = ''): FallbackPayload {
  const text = `${name} ${categoryName}`
  for (const rule of KEYWORD_RULES) {
    if (rule.keys.some((k) => text.includes(k))) return rule.data
  }
  return DEFAULT_FALLBACK
}

export default function ServiceDetail() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [doctors, setDoctors] = useState<any[]>([])
  const [related, setRelated] = useState<any[]>([])
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    if (!id) return
    getService(Number(id))
      .then((d: any) => setData(d))
      .catch(() => setData(null))
    getDoctors().then((d: any) => setDoctors(d?.list || [])).catch(() => setDoctors([]))
    getServices({ page: 1, size: 12 }).then((res: any) => {
      const list = (res?.list || []).filter((s: any) => String(s.id) !== String(id)).slice(0, 3)
      setRelated(list)
    }).catch(() => setRelated([]))
  }, [id])

  if (!data) return <div className="container-content py-16 text-sub">加载中…</div>

  const flow: any[] = Array.isArray(data.flow) ? data.flow : []
  const faq: any[] = Array.isArray(data.faq) ? data.faq : []
  const categoryName = data.category_name || data.category || ''
  const fb = pickFallback(data.name || '', categoryName)

  // 后台录入优先，缺失则用 FALLBACK
  const intro = data.intro?.trim() || fb.intro
  const principle = data.principle?.trim() || fb.principle
  const suitable: string[] = data.suitable?.length ? data.suitable : fb.suitable
  const unsuitable: string[] = data.unsuitable?.length ? data.unsuitable : fb.unsuitable
  const prepare: string[] = data.prepare?.length ? data.prepare : fb.prepare
  const aftercare: string[] = data.aftercare?.length ? data.aftercare : fb.aftercare
  const reviewCycle = data.review_cycle?.trim() || fb.review_cycle
  const risks: string[] = data.risks?.length ? data.risks : fb.risks
  const highlights: { label: string; value: string }[] = data.highlights?.length ? data.highlights : fb.highlights

  return (
    <div>
      {/* Hero：全宽封面 + 标题信息 */}
      <section className="relative h-[260px] sm:h-[320px]">
        <img
          src={data.cover}
          alt={data.name}
          className="h-full w-full object-cover"
          onError={(e) => { e.currentTarget.style.opacity = '0' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="container-content pb-8 text-white">
            <Link to="/services" className="inline-flex items-center gap-1 text-sm text-white/90 hover:text-white hover:underline">
              ‹ 返回诊疗项目
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold sm:text-4xl">{data.name}</h1>
              {data.age_range && (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-ink">
                  适用年龄 {data.age_range}
                </span>
              )}
              {categoryName && (
                <span className="rounded-full bg-brand/90 px-3 py-1 text-xs font-semibold text-white">
                  {categoryName}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-content py-10">
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          {/* 左侧主内容 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 关键信息 4 件套 */}
            {highlights.length > 0 && (
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {highlights.map((h, i) => (
                  <div key={i} className="card p-4 text-center">
                    <div className="text-xs text-sub">{h.label}</div>
                    <div className="mt-1 text-base font-bold text-brand-ink">{h.value}</div>
                  </div>
                ))}
              </section>
            )}

            {/* 项目介绍 */}
            <section id="intro" className="card p-6 sm:p-8">
              <h2 className="text-xl font-bold text-ink">项目介绍</h2>
              <div className="about-html mt-4 leading-relaxed text-sub" dangerouslySetInnerHTML={{ __html: intro || '<p>暂无介绍</p>' }} />
            </section>

            {/* 治疗原理 */}
            <section id="principle" className="card p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-brand"><IconShield /></span>
                治疗原理
              </h2>
              <p className="mt-4 leading-relaxed text-sub">{principle}</p>
            </section>

            {/* 适用 / 不适用 */}
            <section id="suitable" className="grid gap-5 sm:grid-cols-2">
              <div className="card p-6 sm:p-7">
                <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-600"><IconCheck /></span>
                  适合这种情况
                </h3>
                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-sub">
                  {suitable.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-6 sm:p-7">
                <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-100 text-rose-600">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                  暂不适合 / 需先评估
                </h3>
                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-sub">
                  {unsuitable.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 就诊流程 */}
            <section id="flow" className="card p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-brand"><IconClock /></span>
                就诊流程
              </h2>
              <div className="mt-6">
                {flow.length > 0 ? (
                  <ol className="relative space-y-0 sm:flex sm:justify-between">
                    {flow.map((f: any, i: number) => (
                      <li key={i} className="relative flex flex-1 gap-4 pb-8 sm:block sm:pb-0">
                        {i < flow.length - 1 && (
                          <div className="absolute left-[15px] top-8 bottom-0 w-px bg-line sm:hidden" />
                        )}
                        <div className="flex-shrink-0">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-cta-text">
                            {i + 1}
                          </span>
                        </div>
                        <div className="flex-1 pt-0.5 sm:mt-4 sm:pr-4">
                          <div className="font-semibold text-ink">{f.title}</div>
                          {f.desc && <p className="mt-1 text-sm text-sub">{f.desc}</p>}
                        </div>
                        {i < flow.length - 1 && (
                          <div className="absolute right-0 top-4 hidden h-px w-full bg-line sm:block" style={{ transform: 'translateX(50%)' }} />
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ol className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                    {['在线预约', '到店初诊', '方案制定', '专业诊疗', '复查跟进'].map((f, i) => (
                      <li key={f} className="rounded-xl bg-soft p-4 text-center text-sm font-medium text-ink">
                        <span className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-bold text-cta-text mx-auto">
                          {i + 1}
                        </span>
                        {f}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            {/* 术前 / 术后 */}
            <section id="care" className="grid gap-5 sm:grid-cols-2">
              <div className="card p-6 sm:p-7">
                <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-blue-600">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                    </svg>
                  </span>
                  术前准备
                </h3>
                <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-sub">
                  {prepare.map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">{i + 1}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="card p-6 sm:p-7">
                <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-amber-600">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </span>
                  术后注意
                </h3>
                <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-sub">
                  {aftercare.map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-600">{i + 1}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 rounded-lg bg-amber-50/60 p-3 text-xs text-amber-900">
                  <div className="font-semibold">复诊周期</div>
                  <div className="mt-0.5 leading-relaxed">{reviewCycle}</div>
                </div>
              </div>
            </section>

            {/* 风险提示 */}
            {risks.length > 0 && (
              <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 sm:p-7">
                <h3 className="flex items-center gap-2 text-base font-bold text-rose-900">
                  <span className="text-rose-600"><IconInfo /></span>
                  风险与告知
                </h3>
                <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-rose-900/80">
                  {risks.map((r, i) => (
                    <li key={i}>· {r}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* 常见问题 */}
            <section id="faq" className="card p-6 sm:p-8">
              <h2 className="text-xl font-bold text-ink">常见问题</h2>
              {faq.length > 0 ? (
                <div className="mt-4 divide-y divide-line rounded-xl border border-line">
                  {faq.map((item: any, i: number) => (
                    <div key={i}>
                      <button
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-ink"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      >
                        <span>{item.q}</span>
                        <svg className={`h-4 w-4 flex-shrink-0 text-sub transition ${openFaq === i ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {openFaq === i && item.a && (
                        <div className="px-5 pb-4 text-sm leading-relaxed text-sub">{item.a}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {[
                    { q: '孩子几岁可以做涂氟？', a: '一般建议 3 岁起，孩子能配合张口 1 分钟即可。具体由医生评估决定。' },
                    { q: '早期矫治最佳年龄？', a: '替牙期（6-12 岁）是颅面骨骼生长黄金期，是早期干预的窗口期。地包天建议 3-5 岁就开始。' },
                    { q: '孩子看牙哭闹怎么办？', a: '我们采用「Tell-Show-Do」行为引导法：先讲、再演示、后操作；必要时可分次完成治疗，避免一次给孩子留下心理阴影。' },
                    { q: '复诊能不能换医生？', a: '可以，但建议尽量保持同一位医生，便于医生熟悉孩子情况、做出连贯治疗计划。' },
                    { q: '需要空腹就诊吗？', a: '除全麻手术外，普通治疗无需空腹；相反，建议餐后 1 小时就诊，避免孩子因饥饿而不配合。' },
                  ].map((item, i) => (
                    <div key={i} className="rounded-xl border border-line">
                      <button
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-ink"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      >
                        <span>Q：{item.q}</span>
                        <svg className={`h-4 w-4 flex-shrink-0 text-sub transition ${openFaq === i ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {openFaq === i && (
                        <div className="px-5 pb-4 text-sm leading-relaxed text-sub">A：{item.a}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 相关项目 */}
            {related.length > 0 && (
              <section className="pt-2">
                <h2 className="text-xl font-bold text-ink">您可能也关注</h2>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {related.map((s: any) => (
                    <Link key={s.id} to={`/services/${s.id}`} className="card overflow-hidden transition hover:shadow-lg">
                      <div className="aspect-[4/3] overflow-hidden bg-mist">
                        <img src={s.cover} alt={s.name} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
                      </div>
                      <div className="p-3">
                        <div className="line-clamp-1 font-semibold text-ink">{s.name}</div>
                        {s.price_range && <div className="mt-1 text-xs text-brand">{s.price_range}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* 右侧侧栏 */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <div className="text-sm text-sub">参考价格</div>
              <div className="mt-1 text-3xl font-bold text-brand">{data.price_range || '面议'}</div>
              <p className="mt-2 text-xs text-sub">具体费用以到店评估后医生方案为准。</p>
              <Link to={`/booking?service=${data.id}`} className="btn-brand mt-5 block w-full text-center">
                预约该项目
              </Link>
              <Link to="/services" className="btn-ghost mt-3 block w-full text-center">
                查看其他项目
              </Link>
            </div>

            {doctors.length > 0 && (
              <div className="card p-6">
                <div className="text-sm font-bold text-ink">推荐医生</div>
                <div className="mt-4 space-y-3">
                  {doctors.slice(0, 3).map((d: any) => (
                    <Link key={d.id} to={`/doctors/${d.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-mist">
                      <img src={d.avatar} alt={d.name} className="h-11 w-11 rounded-full object-cover" onError={(e) => { e.currentTarget.style.opacity = '0' }} />
                      <div className="min-w-0">
                        <div className="font-medium text-ink">{d.name}</div>
                        <div className="truncate text-xs text-sub">{d.title} · {d.good_at}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#FFF4EE] p-5 text-sm">
              <div className="font-semibold text-brand-ink">预约须知</div>
              <ul className="mt-2 space-y-1 text-sub">
                <li>· 工作日 9:00-18:00 可约</li>
                <li>· 首次到诊建议提前 15 分钟</li>
                <li>· 儿童就诊建议家长陪同</li>
                <li>· 携带孩子既往就诊资料</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
