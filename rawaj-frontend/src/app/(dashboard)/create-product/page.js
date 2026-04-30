'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { motion } from 'framer-motion';
import { 
  ShoppingBagIcon, 
  DocumentTextIcon,
  PhotoIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  TagIcon  
} from '@heroicons/react/24/outline';

export default function CreateProductPage() {
  const [formData, setFormData] = useState({ name: '', description: '', image: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [productImage, setProductImage] = useState('');
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    const uploadedImage = localStorage.getItem('productImage');
    if (uploadedImage && uploadedImage.trim() !== '') {
      setProductImage(uploadedImage);
      setFormData(prev => ({ ...prev, image: uploadedImage }));
    } else {
      router.push('/upload-image');
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const validateField = (name, value) => {
    switch (name) {
      case 'name': return value.trim() ? '' : 'اسم المنتج مطلوب';
      case 'description': return value.trim().length >= 5 ? '' : 'الوصف يجب أن يكون 5 أحرف على الأقل';
      default: return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'image') {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({ name: true, description: true });
      return;
    }

    setLoading(true);
    try {
      const productData = { name: formData.name, description: formData.description, original_image_url: formData.image };
      const response = await api('/products/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error('فشل في إنشاء المنتج');
      const product = await response.json();
      localStorage.removeItem('campaignId');
      localStorage.removeItem('currentProductId');
      localStorage.setItem('currentProductId', product.id);
      router.push('/analyze-product');
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size="lg" color="#10b981" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 text-right" dir="rtl">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-black text-white mb-2">بيانات المنتج</h1>
          <p className="text-text-muted text-sm font-medium">أضف تفاصيل منتجك لنقوم بتحليله بدقة</p>
        </motion.div>

        {/* Progress Steps - مع تباعد مناسب */}
        <div className="flex items-center justify-between bg-white p-5 rounded-3xl shadow-lg border border-white/10">
          {[
            { id: 1, name: 'رفع الصورة', status: 'done' },
            { id: 2, name: 'بيانات المنتج', status: 'active' },
            { id: 3, name: 'تحليل الجمهور', status: 'pending' },
            { id: 4, name: 'تحديد الاستراتيجية', status: 'pending' },
            { id: 5, name: 'توليد الإعلان', status: 'pending' }
          ].map((step, idx, arr) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-500 ${
                  step.status === 'active' ? 'bg-green-600 text-white shadow-md shadow-gray-200' : 
                  step.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {step.status === 'done' ? <CheckCircleIcon className="w-5 h-5" /> : step.id}
                </div>
                <span className={`text-[10px] font-bold whitespace-nowrap ${step.status !== 'pending' ? 'text-gray-900' : 'text-gray-400'}`}>{step.name}</span>
              </div>
              {idx < arr.length - 1 && (
                <div className={`flex-1 h-[2px] mx-2 rounded-full ${
                  step.status === 'done' || (step.id === 2 && step.status === 'active') ? 'bg-green-100' : 'bg-gray-100'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 mt-6">
          <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-xl">
              <ShoppingBagIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">هوية المنتج</h2>
              <p className="text-gray-500 text-sm font-medium">المعلومات الدقيقة تصنع إعلاناً مقنعاً</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-10">
              
              {/* Sidebar Preview */}
              <div className="md:col-span-1">
                <div className="sticky top-6">
                  <div className="relative aspect-square rounded-2xl overflow-hidden border-4 border-gray-50 bg-gray-50 shadow-inner group">
                    {productImage ? (
                      <img src={productImage} alt="Product" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <PhotoIcon className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <p className="text-center text-black font-bold text-sm mt-3 uppercase tracking-widest">صورة المنتج الحالية</p>
                </div>
              </div>

              {/* Form Area */}
              <form onSubmit={handleSubmit} className="md:col-span-2 space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-gray-800 mb-2 text-lg font-black">
                    
                    اسم المنتج
                  </label>
                  <input
                    type="text"
                    name="name"
                    autoComplete="off"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="مثال: ساعة ذكية مقاومة للماء"
                    className={`w-full bg-gray-50 border-2 rounded-xl p-4 text-gray-900 text-base font-bold focus:outline-none focus:border-green-500 transition-all ${
                      touched.name && errors.name ? 'border-red-100 bg-red-50/30' : 'border-transparent'
                    }`}
                  />
                  {touched.name && errors.name && <p className="text-red-500 text-xs mt-1 font-bold">{errors.name}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-gray-800 mb-2 text-lg font-bold">
                    
                    وصف المنتج ومميزاته
                  </label>
                  <textarea
                    name="description"
                    autoComplete="off"
                    value={formData.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    rows="5"
                    placeholder="ما الذي يجعل منتجك فريداً؟"
                    className={`w-full bg-gray-50 border-2 rounded-xl p-4 text-gray-900 text-base font-bold focus:outline-none focus:border-green-500 transition-all resize-none ${
                      touched.description && errors.description ? 'border-red-100 bg-red-50/30' : 'border-transparent'
                    }`}
                  />
                  {touched.description && errors.description && <p className="text-red-500 text-xs mt-1 font-bold">{errors.description}</p>}
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => router.push('/upload-image')}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all font-black text-sm"
                  >
                    <ArrowRightIcon className="w-4 h-4" />
                    السابق
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 text-white rounded-xl font-black text-lg hover:bg-green-700 shadow-lg shadow-green-100 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" color="white" />
                    ) : (
                      <>
                        تحليل الجمهور المستهدف
                        <ArrowLeftIcon className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}