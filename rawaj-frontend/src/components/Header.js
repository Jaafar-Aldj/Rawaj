// src/components/Header.js
import Link from 'next/link'; // نستخدم Link من Next.js بدلاً من <a> للتنقل السريع

const Header = () => {
  return (
    // قمنا بتحويل كلاسات CSS إلى كلاسات Tailwind CSS
    <header className="fixed top-0 left-0 right-0 z-50 bg-opacity-90 backdrop-blur-md border-b border-blue-500/20 bg-[#050816]">
      <div className="container mx-auto flex justify-between items-center h-20 px-4">
        
        {/* Logo */}
        <div className="text-2xl font-bold">
          <Link href="/" className="bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
            Marketing AI
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-10">
          <Link href="#home" className="text-gray-400 hover:text-white transition-colors">الرئيسية</Link>
          <Link href="#services" className="text-gray-400 hover:text-white transition-colors">الخدمات</Link>
          <Link href="#analytics" className="text-gray-400 hover:text-white transition-colors">التحليلات</Link>
          <Link href="#about" className="text-gray-400 hover:text-white transition-colors">عنّا</Link>
          <Link href="#contact" className="text-gray-400 hover:text-white transition-colors">تواصل</Link>
        </nav>

        {/* Action Button */}
        <Link href="/login" className="hidden sm:inline-block bg-gradient-to-br from-blue-600 to-blue-500 text-white font-semibold py-2 px-6 rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform">
          ابدأ الآن
        </Link>
        
      </div>
    </header>
  );
};

export default Header;