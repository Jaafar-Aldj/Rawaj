// src/app/(dashboard)/dashboard/profile/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/services/api';
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  KeyIcon, 
  CheckCircleIcon,
  PencilIcon,
  XMarkIcon
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
    current_password: '',
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
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      setMessage({ type: 'error', text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
      };
      if (formData.current_password && formData.new_password) {
        updateData.current_password = formData.current_password;
        updateData.new_password = formData.new_password;
      }

      const response = await api('/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'فشل في تحديث البيانات');
      }

      // تحديث بيانات المستخدم في السياق
      if (refreshUser) await refreshUser();
      
      setMessage({ type: 'success', text: 'تم تحديث الملف الشخصي بنجاح' });
      setEditMode(false);
      // إعادة تعيين حقول كلمة المرور
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6 text-right" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">الملف الشخصي</h1>
          <p className="text-text-muted">عرض وتعديل بيانات حسابك</p>
        </div>

        {/* Profile Card */}
        <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-l from-accent/20 to-transparent p-6 border-b border-border-color flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <UserCircleIcon className="w-10 h-10 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{user.name}</h2>
                <p className="text-text-muted text-sm">{user.email}</p>
              </div>
            </div>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent px-4 py-2 rounded-xl transition-colors"
              >
                <PencilIcon className="w-5 h-5" />
                تعديل
              </button>
            )}
          </div>

          {/* Form Body */}
          <div className="p-6">
            {message.text && (
              <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-white text-sm font-bold mb-2">الاسم الكامل</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!editMode}
                  className={`w-full bg-background border border-border-color rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors ${!editMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label className="block text-white text-sm font-bold mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!editMode}
                  className={`w-full bg-background border border-border-color rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors ${!editMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>

              {editMode && (
                <>
                  <div className="border-t border-border-color pt-4 mt-2">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <KeyIcon className="w-5 h-5 text-accent" />
                      تغيير كلمة المرور
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">كلمة المرور الحالية</label>
                        <input
                          type="password"
                          name="current_password"
                          value={formData.current_password}
                          onChange={handleChange}
                          className="w-full bg-background border border-border-color rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors"
                          placeholder="أدخل كلمة المرور الحالية لتغييرها"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">كلمة المرور الجديدة</label>
                        <input
                          type="password"
                          name="new_password"
                          value={formData.new_password}
                          onChange={handleChange}
                          className="w-full bg-background border border-border-color rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors"
                          placeholder="اتركها فارغة إذا لم ترغب في التغيير"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">تأكيد كلمة المرور الجديدة</label>
                        <input
                          type="password"
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleChange}
                          className="w-full bg-background border border-border-color rounded-xl p-3 text-white focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {editMode && (
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-accent text-white font-bold py-3 rounded-xl hover:bg-accent-dark transition-all disabled:opacity-50"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'حفظ التغييرات'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setFormData(prev => ({
                        ...prev,
                        name: user.name || '',
                        email: user.email || '',
                        current_password: '',
                        new_password: '',
                        confirm_password: ''
                      }));
                      setMessage({ type: '', text: '' });
                    }}
                    className="flex-1 bg-gray-700 text-white font-bold py-3 rounded-xl hover:bg-gray-600 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}