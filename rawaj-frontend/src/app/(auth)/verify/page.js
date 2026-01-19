// src/app/(auth)/verify/page.js
'use client';
import AuthLayout from "@/components/AuthLayout";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyPage() {
  const [code, setCode] = useState('');
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook لقراءة الـ Query Parameters من الرابط

  // عند تحميل الصفحة، نقوم بقراءة user_id من الرابط
  useEffect(() => {
    const id = searchParams.get('user_id');
    if (id) {
      setUserId(id);
    } else {
      // إذا لم يكن هناك ID، ربما وصل المستخدم إلى هنا بالخطأ
      setError("معرّف المستخدم غير موجود. يرجى المحاولة مرة أخرى.");
    }
  }, [searchParams]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!userId || code.length !== 6) {
      setError("يرجى إدخال كود تفعيل صحيح مكون من 6 أرقام.");
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // بناء الرابط كما يتوقعه FastAPI
      const url = `http://127.0.0.1:8000/users/verify/${userId}?code=${code}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'كود التفعيل غير صحيح أو منتهي الصلاحية.');
      }

      setSuccess('تم تفعيل حسابك بنجاح! سيتم توجيهك لتسجيل الدخول.');

      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="تفعيل الحساب"
      subtitle="أدخل الكود المكون من 6 أرقام الذي تم إرساله إلى بريدك الإلكتروني."
      switchText="لم تستلم الكود؟"
      switchLink="/resend-code" // يمكن إنشاء صفحة لإعادة الإرسال لاحقاً
      switchLinkText="إعادة الإرسال"
    >
      <form onSubmit={handleVerify} className="space-y-4 text-right">
        {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-center">{error}</div>}
        {success && <div className="bg-green-500/20 text-green-300 p-3 rounded-lg text-center">{success}</div>}
        
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-300">كود التفعيل</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength="6"
            required
            className="w-full text-center tracking-[1em] bg-[#020617] border border-gray-600/50 rounded-lg px-4 py-2.5 text-white text-2xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !userId}
          className="w-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'جاري التحقق...' : 'تفعيل الحساب'}
        </button>
      </form>
    </AuthLayout>
  );
}