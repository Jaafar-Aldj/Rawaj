// src/app/(main)/layout.js  (هيكل الصفحات الرئيسية)

import Header from '@/components/Header';
import Footer from '@/components/Footer';

// هذا الهيكل يضيف الهيدر والفوتر للصفحات الموجودة داخله فقط
export default function MainLayout({ children }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}