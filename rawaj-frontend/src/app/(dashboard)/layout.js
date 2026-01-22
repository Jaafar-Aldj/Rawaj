// src/app/(dashboard)/layout.js
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

const Sidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navLinks = [
    { name: '🏠 الرئيسية', href: '/dashboard' },
    { name: '📢 الحملات', href: '/dashboard/campaigns' },
    { name: '✍️ توليد المحتوى', href: '/dashboard/generate' },
    { name: '⚙️ الإعدادات', href: '/dashboard/settings' },
  ];

  return (
    // استخدام الألوان الجديدة للخلفية والحدود
    <aside className="bg-gradient-to-b from-panel to-background border-l border-border-color p-6 flex flex-col">
      <div className="text-3xl font-bold text-center mb-12">
        <Link href="/" className="bg-gradient-to-r from-accent to-green-500 text-transparent bg-clip-text">
          Rawaj
        </Link>
      </div>
      <nav className="flex flex-col gap-2 flex-grow">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            // استخدام الألوان الجديدة للحالة النشطة وحالة الـ hover
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-text-muted font-semibold transition-all duration-300
              ${pathname === link.href
                ? 'bg-accent/10 text-white shadow-lg' // خلفية شفافة من اللون الرئيسي
                : 'hover:bg-panel hover:text-white hover:translate-x-1'
              }`
            }
          >
            {link.name}
          </Link>
        ))}
      </nav>
      {/* زر تسجيل الخروج */}
      <button 
        onClick={logout}
        className="w-full mt-auto flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-red-400 font-semibold transition-all hover:bg-red-500/20"
      >
        تسجيل الخروج
      </button>
    </aside>
  );
};

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[280px_1fr]">
        <Sidebar />
        {/* استخدام لون الخلفية الرئيسي للمحتوى */}
        <main className="bg-background p-4 sm:p-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}