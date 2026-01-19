// src/app/layout.js
import './globals.css';
import { Tajawal } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext'; // 1. استيراد الـ Provider

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
      <body className={`${tajawal.variable} font-sans bg-[#050816] text-gray-200`}>
        {/* 2. تغليف التطبيق بالكامل */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}