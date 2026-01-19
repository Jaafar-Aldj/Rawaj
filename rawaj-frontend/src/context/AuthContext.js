// src/context/AuthContext.js
'use client';
import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 1. إنشاء الـ Context
const AuthContext = createContext(null);

// 2. إنشاء الـ Provider (المكون الذي سيزود التطبيق بالبيانات)
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // حالة تحميل للتحقق الأولي
  const router = useRouter();

  // عند تحميل التطبيق لأول مرة، تحقق مما إذا كان هناك توكن محفوظ في localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
    }
    setLoading(false); // انتهاء التحقق الأولي
  }, []);

  // دالة لتسجيل الدخول
  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem('authToken', newToken); // حفظ التوكن في المتصفح
    router.push('/dashboard'); // نقل المستخدم إلى لوحة التحكم
  };

  // دالة لتسجيل الخروج
  const logout = () => {
    setToken(null);
    localStorage.removeItem('authToken'); // حذف التوكن من المتصفح
    router.push('/login'); // نقل المستخدم إلى صفحة تسجيل الدخول
  };

  // القيمة التي سيتم توفيرها لجميع المكونات
  const value = {
    token,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. إنشاء Hook مخصص لتسهيل استخدام الـ Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};