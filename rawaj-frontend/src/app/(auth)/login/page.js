// src/app/(auth)/login/page.js
'use client';
import AuthLayout from "@/components/AuthLayout";
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; // 1. استيراد useAuth

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // 2. الحصول على دالة login من الـ Context

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'فشل تسجيل الدخول.');
      }

      const data = await response.json();
      
      // 3. استدعاء دالة login من الـ Context وتمرير التوكن لها
      // هي ستقوم بحفظ التوكن ونقل المستخدم إلى لوحة التحكم
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