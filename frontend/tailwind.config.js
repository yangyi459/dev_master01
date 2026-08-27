// Tailwind 配置：把 UI/UX §9 与方案 §22 的设计 Token 映射为语义色，
// 全站用 brand / ink / sub / line / soft / teal / mist 等，避免散落硬编码。
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#FF7A45', ink: '#9A3412' }, // 品牌橙 + 深棕
        cta: { text: '#4A1500' }, // CTA 橙底深棕字
        ink: '#1F2937', // 主文字
        sub: '#5B6472', // 次要文字
        line: '#E8EBEF', // 描边
        soft: '#FFF4EE', // 浅品牌底
        teal: '#16A6A6', // 辅助青
        mist: '#F6F7F9', // 浅灰底
        footer: '#1F2937', // 页脚深色
      },
      maxWidth: { content: '1160px' },
      // 方案 §22：前台断点 900 / 560。保留 Tailwind 默认 sm/md/lg 作为兼容，
      // 新增 tablet / mobile 语义断点供后续组件迁移使用（现有组件多用 sm/md，见验收报告偏差 #1）。
      screens: {
        mobile: '560px',
        tablet: '900px',
      },
      fontFamily: {
        sans: ['-apple-system', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
}
