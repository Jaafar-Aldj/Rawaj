/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // تحديد مسار كل الملفات التي قد تحتوي على كلاسات Tailwind
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // هنا يبدأ التخصيص
      colors: {
        background: '#020617',     // --bg (اللون الرئيسي الداكن)
        'background-alt': '#050816', // لون الخلفية البديل للصفحة الرئيسية
        panel: '#0f172a',           // لون الصناديق والبطاقات
        accent: {
          DEFAULT: '#3b82f6',     // اللون الأزرق الرئيسي
          dark: '#2563eb',       // نسخة أغمق من الأزرق
        },
        'text-main': '#e5e7eb',      // لون النص الأساسي (شبه أبيض)
        'text-muted': '#9ca3af',     // لون النص الثانوي (رمادي فاتح)
        'border-color': '#1f2937',   // لون الحدود الفاصلة
      },
      borderRadius: {
        'lg-custom': '18px',
        'md-custom': '12px',
      }
    },
  },
  plugins: [],
}