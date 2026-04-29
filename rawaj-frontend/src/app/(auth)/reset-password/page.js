// src/app/(auth)/reset-password/page.js
'use client';
import AuthLayout from "@/components/AuthLayout";
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LockClosedIcon } from '@heroicons/react/24/outline';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get('email');

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          new_password: password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'فشل إعادة تعيين كلمة المرور');
      }

      setMessage({
        type: 'success',
        text: 'تم تغيير كلمة المرور بنجاح'
      });

      // رجوع لصفحة login
      setTimeout(() => {
        router.push('/login');
      }, 1500);

    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="إعادة تعيين كلمة المرور"
      subtitle={`أدخل كود التحقق المرسل إلى ${email}`}
      switchText="تذكرت كلمة المرور؟"
      switchLink="/login"
      switchLinkText="تسجيل الدخول"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {message.text && (
          <div className={`p-3 rounded-xl text-center text-sm ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-500 text-green-300'
              : 'bg-red-500/20 border border-red-500 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <div>
          <input
            type="text"
            placeholder="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="w-full bg-white/5 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative group">
          <LockClosedIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="password"
            placeholder="كلمة المرور الجديدة"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-white/5 border border-gray-700 rounded-xl pr-10 pl-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-xl"
        >
          {loading ? 'جاري التحديث...' : 'إعادة تعيين كلمة المرور'}
        </button>

      </form>
    </AuthLayout>
  );
}