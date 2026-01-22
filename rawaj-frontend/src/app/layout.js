// src/app/layout.js
import './globals.css';
import { Tajawal } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-tajawal',
});

export const metadata = {
  title: 'Rawaj - منصة توليد المحتوى التسويقي الذكية',
  description: 'منصة متكاملة لتوليد محتوى تسويقي مخصص لجمهورك.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      {/* 
        تطبيق لون الخلفية الرئيسي ولون النص الرئيسي هنا
        سيضمن أن كل الصفحات ترث هذه الأنماط بشكل افتراضي.
      */}
      <body 
        className={`${tajawal.variable} font-sans bg-background text-text-main`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}