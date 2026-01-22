// src/app/(dashboard)/products/new/page.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

export default function NewProductPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const productData = {
        name: name,
        description: description,
      };

      const response = await api('/products/', {
        method: 'POST',
        // الـ Body يجب أن يكون بصيغة JSON
        body: JSON.stringify(productData), 
        // خدمة api.js ستضيف هيدر Content-Type و Authorization تلقائياً
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'فشل في إنشاء المنتج.');
      }

      // نجاح!
      // بعد إنشاء المنتج بنجاح، أعد توجيه المستخدم إلى لوحة التحكم
      router.push('/dashboard');

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-300 to-white text-transparent bg-clip-text">
        إضافة منتج جديد
      </h1>

      <div className="max-w-2xl mx-auto bg-[#0f172a]/80 p-8 rounded-2xl border border-blue-500/30">
        <form onSubmit={handleSubmit} className="space-y-6 text-right">
          {error && (
            <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-300">اسم المنتج</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: كريم العناية بالبشرة"
              required
              className="w-full bg-[#020617] border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-300">وصف المنتج</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              placeholder="وصف مختصر للمنتج وميزاته الرئيسية..."
              required
              className="w-full bg-[#020617] border border-gray-600/50 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold py-3 px-8 rounded-full shadow-lg disabled:opacity-70"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء المنتج'}
          </button>
        </form>
      </div>
    </div>
  );
}