// src/app/(dashboard)/layout.js
'use client'; // Needed for state management (e.g., mobile sidebar toggle)
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute'; // 1. استيراد الحارس
import { useAuth } from '@/context/AuthContext';

// Sidebar component defined within the layout
const Sidebar = () => {
  const pathname = usePathname(); // Hook to get the current URL path
  const { logout } = useAuth(); // الحصول على دالة تسجيل الخروج

  const navLinks = [
    { name: '🏠 الرئيسية', href: '/dashboard' },
    { name: '📢 الحملات', href: '/dashboard/campaigns' },
    { name: '✍️ توليد المحتوى', href: '/dashboard/generate' },
    { name: '⚙️ الإعدادات', href: '/dashboard/settings' },
  ];

  return (
    <aside className="bg-gradient-to-b from-[#0f172a] to-[#020617] border-l border-blue-500/20 p-6 flex flex-col">
      <div className="text-3xl font-bold text-center mb-12">
        <Link href="/" className="bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
          Rawaj
        </Link>
      </div>
      <nav className="flex flex-col gap-2">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            // Apply 'active' class if the current path matches the link's href
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 font-semibold transition-all duration-300
              ${pathname === link.href
                ? 'bg-blue-500/10 text-white shadow-lg'
                : 'hover:bg-gray-700/50 hover:text-white hover:translate-x-1'
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

// The main layout for the dashboard area

export default function DashboardLayout({ children }) {
  return (
    // 2. تغليف كل محتوى لوحة التحكم بالحارس
    <ProtectedRoute>
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[280px_1fr]">
        <Sidebar />
        <main className="bg-[#020617] p-4 sm:p-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}