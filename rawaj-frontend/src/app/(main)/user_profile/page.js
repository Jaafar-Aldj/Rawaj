// src/app/(dashboard)/dashboard/profile/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/services/api';
import { motion } from 'framer-motion';
import { 
  UserCircleIcon, 
  KeyIcon, 
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        new_password: '',
        confirm_password: ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // إذا كان يريد تغيير كلمة المرور، تأكد من التطابق
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      setMessage({ type: 'error', text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // بناء البيانات المتغيرة: نرسل الاسم دائماً
      const updateData = { name: formData.name };

      // فقط إذا أدخل كلمة مرور جديدة نضيف الحقل password
      if (formData.new_password) {
        updateData.password = formData.new_password;
      }

      console.log('Sending update data:', updateData); // للتتبع

      const response = await api('/users/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || `خطأ ${response.status}: فشل تحديث البيانات`);
      }

      const updatedUser = await response.json();
      if (refreshUser) await refreshUser();

      setMessage({ type: 'success', text: 'تم تحديث البيانات بنجاح' });
      setEditMode(false);

      // إعادة تعيين حقول كلمة المرور
      setFormData(prev => ({
        ...prev,
        new_password: '',
        confirm_password: ''
      }));

    } catch (err) {
      console.error('Update error:', err);
      setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء الاتصال بالخادم' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-right" dir="rtl">
      <div className="max-w-4xl mx-auto pt-20 md:pt-24">

        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
            <UserCircleIcon className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">الملف الشخصي</h1>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center">
                <UserCircleIcon className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-800">{user.name}</h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
            </div>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-green-50 text-green-700 rounded-xl border transition hover:bg-green-100"
              >
                تعديل
              </button>
            )}
          </div>

          <div className="p-6">
            {message.text && (
              <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {message.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                <span className="font-bold text-sm">{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!editMode}
                className="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-500"
              />

              <input
                name="email"
                value={formData.email}
                disabled
                className="w-full p-3 rounded-xl border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
              />

              {editMode && (
                <>
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    <h3 className="flex items-center gap-2 text-gray-700 font-bold mb-3">
                      <KeyIcon className="w-5 h-5 text-green-600" />
                      تغيير كلمة المرور (اختياري)
                    </h3>
                    <input
                      type="password"
                      name="new_password"
                      placeholder="كلمة المرور الجديدة (اختياري)"
                      value={formData.new_password}
                      onChange={handleChange}
                      className="w-full mb-3 p-3 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <input
                      type="password"
                      name="confirm_password"
                      placeholder="تأكيد كلمة المرور الجديدة"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      className="w-full mb-2 p-3 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => router.push('/forgot-password')}
                      className=" text-blue-600 hover:underline mt-1"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                </>
              )}

              {editMode && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                >
                  {loading ? <LoadingSpinner size="sm" color="white" /> : 'حفظ التغييرات'}
                </button>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}