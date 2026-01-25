// src/app/(auth)/login/page.js
'use client';
import AuthLayout from "@/components/AuthLayout";
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; // 1. استيراد useAuth
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // 2. الحصول على دالة login من الـ Context
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      // لا نتحقق من response.ok هنا بعد الآن
      // لأننا نريد قراءة الـ body حتى في حالة الخطأ
      const data = await response.json();

      // ===== المنطق الجديد لمعالجة الأخطاء =====
      if (!response.ok) {
        // التحقق مما إذا كان الخطأ هو "عدم تفعيل الحساب"
        // (data.detail سيكون كائناً وليس نصاً في هذه الحالة)
        if (response.status === 403 && typeof data.detail === 'object' && data.detail.user_id) {
          // إذا كان كذلك، انقل المستخدم إلى صفحة التفعيل
          router.push(`/verify?user_id=${data.detail.user_id}`);
          // لا تعتبر هذا خطأ، بل هو مجرد توجيه
          return; 
        }
        
        // إذا كان أي خطأ آخر، اعرضه
        // (data.detail سيكون نصاً في حالة "Invalid email or password")
        throw new Error(data.detail || 'فشل تسجيل الدخول.');
      }
      
      // إذا نجح الطلب (response.ok كان true)
      login(data.access_token);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... باقي كود الفورم يبقى كما هو ...
  return (
    <AuthLayout
      title="تسجيل الدخول"
      subtitle="مرحباً بعودتك إلى منصة رواج"
      switchText="ليس لديك حساب؟"
      switchLink="/signup"
      switchLinkText="إنشاء حساب"   
    >
      <form onSubmit={handleLogin} className="space-y-4 text-right">
         {/* ... باقي الفورم ... */}
         <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">البريد الإلكتروني</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-[#020617] border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">كلمة المرور</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-[#020617] border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-lg disabled:opacity-70">
          {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
        </button>
         {error && <p className="text-red-400 mt-4">{error}</p>}
      </form>
    </AuthLayout>
  );
}