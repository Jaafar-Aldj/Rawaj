// src/app/(auth)/verify/page.js
'use client';
import AuthLayout from "@/components/AuthLayout";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // مراجع للحقول
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  useEffect(() => {
    const id = searchParams.get('user_id');
    if (id) setUserId(id);
    else setError('معرّف المستخدم غير موجود. يرجى المحاولة مرة أخرى.');
    
    // التركيز على أول حقل عند تحميل الصفحة
    if (inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, [searchParams]);

  const handleChange = (index, value) => {
    // السماح فقط برقم واحد
    if (value.length > 1) return;
    // السماح فقط بالأرقام
    if (value && !/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // الانتقال إلى الحقل التالي إذا تم إدخال رقم
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // عند الضغط على Backspace والحقل فارغ، انتقل إلى الحقل السابق
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setCode(digits);
      // التركيز على آخر حقل بعد اللصق
      inputRefs[5].current?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (!userId || fullCode.length !== 6) {
      setError('يرجى إدخال كود تفعيل صحيح مكون من 6 أرقام.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${baseUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(userId), code: fullCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'كود التفعيل غير صحيح أو منتهي الصلاحية.');
      }

      setSuccess('تم تفعيل حسابك بنجاح! سيتم توجيهك لتسجيل الدخول.');
      setTimeout(() => router.push('/login'), 2000);
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
      switchLink="/resend-code"
      switchLinkText="إعادة الإرسال"
    >
      <form onSubmit={handleVerify} className="space-y-6" dir="ltr">
        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-xl text-center text-sm">{error}</div>}
        {success && <div className="bg-green-500/20 border border-green-500 text-green-300 p-3 rounded-xl text-center text-sm">{success}</div>}

        <div className="flex justify-center gap-3">
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className="w-14 h-14 text-center text-2xl font-bold bg-white/5 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              autoComplete="off"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !userId}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-70"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              جاري التحقق...
            </span>
          ) : 'تفعيل الحساب'}
        </button>
      </form>
    </AuthLayout>
  );
}