// src/context/AuthContext.js
'use client';
import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api'; // 1. استيراد خدمة API الجديدة

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // الآن سنخزن بيانات المستخدم بدلاً من التوكن فقط
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // دالة لجلب بيانات المستخدم الحالي باستخدام التوكن 
  const fetchUser = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // يجب أن يكون لديك endpoint في FastAPI لإرجاع بيانات المستخدم الحالي
      // عادةً ما يكون "GET /users/me"
      const response = await api('/users/me'); // استخدام الـ api interceptor
      
      if (!response.ok) throw new Error('Failed to fetch user');
      
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Authentication error:', error);
      setUser(null);
      localStorage.removeItem('authToken'); // حذف التوكن غير الصالح
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = (newToken) => {
    localStorage.setItem('authToken', newToken);
    // بعد تسجيل الدخول، قم بجلب بيانات المستخدم مباشرة
    fetchUser().then(() => {
        router.push('/dashboard');
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
    router.push('/login');
  };

  const value = {
    user, // الآن نمرر كائن المستخدم
    isAuthenticated: !!user, // قيمة boolean سهلة للتحقق
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};