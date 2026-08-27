// 后台 Tailwind 配置：复用前台设计 Token（方案 §22 / UI-UX §9）。
// 关键：preflight 关闭，避免 Tailwind 的 base reset 覆盖 Ant Design 5 的样式。
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    // 与 AntD 共存时必须关 preflight，否则按钮/表单等基础样式被重置
    preflight: false,
  },
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
      },
      maxWidth: { content: '1160px' },
      fontFamily: {
        sans: ['-apple-system', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
}
