// src/app/(dashboard)/layout.js
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { 
  HomeIcon, 
  MegaphoneIcon, 
  SparklesIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { name: 'الرئيسية', href: '/', icon: HomeIcon },
    { name: 'توليد المحتوى', href: '/upload-image/', icon: SparklesIcon },
    { name: 'الحملات', href: '/camp', icon: MegaphoneIcon },
    { name: 'الإعدادات', href: '/dashboard/settings', icon: Cog6ToothIcon },
  ];

  if (!mounted) return null;

  return (
    <aside className="bg-gradient-to-b from-[#1a1f2e] to-[#0d1117] border-l border-[#2a2f3f] p-6 flex flex-col h-screen sticky top-0">
      {/* Logo Section - محسنة */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-l from-[#00c3ff] to-[#00ff87] text-transparent bg-clip-text">
              Rawaj
            </span>
          </h1>
          <p className="text-xs text-[#8b8f9c] mt-1">منصة التسويق بالذكاء الاصطناعي</p>
        </Link>
      </div>

      {/* User Info - معلومات المستخدم */}
      {user && (
        <div className="mb-8 p-4 bg-[#1e2335] rounded-2xl border border-[#2a2f3f]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00c3ff] to-[#00ff87] flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                <span className="text-white font-bold text-xl">
                  {user.name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold truncate">{user.name || 'مستخدم'}</h3>
              <p className="text-xs text-[#8b8f9c] truncate">{user.email || 'user@example.com'}</p>
            </div>
          </div>
        </div>
      )}
      
      <nav className="flex flex-col gap-2 flex-grow">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[#8b8f9c] font-medium transition-all duration-300 group relative
                ${pathname === link.href
                  ? 'bg-[#00c3ff]/10 text-white border border-[#00c3ff]/20'
                  : 'hover:bg-[#1e2335] hover:text-white hover:translate-x-1'
                }`
              }
            >
              <Icon className={`w-5 h-5 ${pathname === link.href ? 'text-[#00c3ff]' : 'group-hover:text-[#00c3ff]'}`} />
              <span>{link.name}</span>
              {pathname === link.href && (
                <div className="absolute right-0 w-1 h-8 bg-gradient-to-b from-[#00c3ff] to-[#00ff87] rounded-full"></div>
              )}
            </Link>
          );
        })}
      </nav>
      
      <button 
        onClick={logout}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-red-400 font-medium transition-all hover:bg-red-500/10 group mt-4"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5 group-hover:rotate-180 transition-transform" />
        <span>تسجيل الخروج</span>
      </button>
    </aside>
  );
};

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[300px_1fr]">
        <Sidebar />
        <main className="bg-[#0d1117] p-4 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}