// src/app/(auth)/signup/page.js
'use client';
import AuthLayout from "@/components/AuthLayout";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // State لإظهار رسالة النجاح
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = {
        name: name,
        email: email,
        password: password,
      };

      const response = await fetch('http://127.0.0.1:8000/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'فشل في إنشاء الحساب.');
      }

      const createdUser = await response.json();
      console.log('Signup successful, user ID:', createdUser.id);
      
      // ===== التعديل المهم هنا =====
      // نقل المستخدم إلى صفحة التفعيل وتمرير ID المستخدم الجديد
      router.push(`/verify?user_id=${createdUser.id}`);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="إنشاء حساب"
      subtitle="ابدأ رحلتك في عالم التسويق بالذكاء الاصطناعي"
      switchText="لديك حساب بالفعل؟"
      switchLink="/login"
      switchLinkText="تسجيل الدخول"
    >
      <form onSubmit={handleSignup} className="space-y-4 text-right">
        {/* إظهار رسائل الخطأ أو النجاح */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-300 p-3 rounded-lg text-center">
            {success}
          </div>
        )}
        
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">الاسم الكامل</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك الكامل"
            required
            className="w-full bg-[#020617] border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            className="w-full bg-[#020617] border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full bg-[#020617] border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
        </button>
      </form>
    </AuthLayout>
  );
}