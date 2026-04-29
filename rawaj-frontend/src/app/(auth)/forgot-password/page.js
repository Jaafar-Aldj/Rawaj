// src/app/(auth)/forgot-password/page.js
'use client';
import AuthLayout from "@/components/AuthLayout";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'فشل إرسال الكود');
      }

      // نجاح
      setMessage({
        type: 'success',
        text: 'تم إرسال كود التحقق إلى بريدك الإلكتروني'
      });

      // تحويل لصفحة reset
      setTimeout(() => {
        router.push(`/reset-password?email=${email}`);
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
      title="نسيت كلمة المرور"
      subtitle="أدخل بريدك الإلكتروني لإرسال كود التحقق"
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

        <div className="relative group">
          <EnvelopeIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-400 transition" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            required
            className="w-full bg-white/5 border border-gray-700 rounded-xl pr-10 pl-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              جاري الإرسال...
            </span>
          ) : 'إرسال كود التحقق'}
        </button>

      </form>
    </AuthLayout>
  );
}