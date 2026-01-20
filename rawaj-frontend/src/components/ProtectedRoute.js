// src/components/ProtectedRoute.js
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ننتظر حتى ينتهي التحقق الأولي من التوكن
    if (loading) {
      return;
    }

    // إذا انتهى التحقق ولم يكن هناك توكن، أعد توجيه المستخدم
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]); // هذا الـ effect سيعمل كلما تغيرت هذه القيم

  // إذا كان التحقق جارياً أو لا يوجد توكن، لا تعرض شيئاً (أو اعرض شاشة تحميل)
  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">جاري التحميل...</p>
      </div>
    );
  }

  // إذا كان هناك توكن، اعرض المحتوى المحمي (الصفحة المطلوبة)
  return children;
};

export default ProtectedRoute;