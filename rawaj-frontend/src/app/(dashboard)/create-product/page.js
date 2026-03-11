// src/app/(dashboard)/create-product/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  ShoppingBagIcon, 
  DocumentTextIcon,
  PhotoIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  SparklesIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function CreateProductPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [productImage, setProductImage] = useState('');
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    // جلب الصورة المرفوعة من localStorage
    const uploadedImage = localStorage.getItem('productImage');
    if (uploadedImage) {
      setProductImage(uploadedImage);
      setFormData(prev => ({ ...prev, image: uploadedImage }));
    } else {
      // إذا مافي صورة، نرجعه لصفحة الرفع
      router.push('/upload-image');
    }
  }, []);

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return value.trim() ? '' : 'اسم المنتج مطلوب';
      case 'description':
        return value.trim().length >= 5 ? '' : 'الوصف يجب أن يكون 5 أحرف على الأقل';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Validate on change
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
    
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'image') {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({
        name: true,
        description: true
      });
      return;
    }

    setLoading(true);

    try {
      // تحضير البيانات للإرسال - بدون كمية وسعر
      const productData = {
        name: formData.name,
        description: formData.description,
        original_image_url: formData.image
      };

      const response = await api('/products/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'فشل في إنشاء المنتج');
      }
      
      const product = await response.json();
      
      // حفظ ID المنتج للمرحلة القادمة
      localStorage.setItem('currentProductId', product.id);
      
      // التوجه لصفحة التحليل
      router.push('/analyze-product');

    } catch (err) {
      console.error('خطأ في إنشاء المنتج:', err);
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  // عرض شاشة التحميل
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-text-muted mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">بيانات المنتج</h1>
          <p className="text-text-muted">أدخل اسم ووصف المنتج</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
            <span className="text-white text-sm">رفع الصورة</span>
          </div>
          <div className="w-12 h-0.5 bg-accent"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
            <span className="text-white text-sm">بيانات المنتج</span>
          </div>
          <div className="w-12 h-0.5 bg-border-color"></div>
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-8 h-8 bg-panel border border-border-color rounded-full flex items-center justify-center text-text-muted text-sm">3</div>
            <span className="text-text-muted text-sm">تحليل الجمهور</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden">
          {/* Header Card */}
          <div className="bg-gradient-to-l from-accent/20 to-transparent p-6 border-b border-border-color">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent/10 rounded-2xl">
                <ShoppingBagIcon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">معلومات المنتج</h2>
                <p className="text-text-muted text-sm">أدخل اسم ووصف المنتج</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Image Preview */}
            {productImage && (
              <div className="mb-8 p-6 bg-background/50 rounded-2xl border border-border-color">
                <div className="flex items-center gap-2 mb-4">
                  <PhotoIcon className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-white">صورة المنتج:</h3>
                </div>
                <div className="relative h-48 rounded-xl overflow-hidden border-2 border-border-color">
                  <img
                    src={productImage}
                    alt="Product"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="flex items-center gap-2 text-text-muted mb-2">
                  <ShoppingBagIcon className="w-4 h-4" />
                  <span className="font-medium">اسم المنتج <span className="text-accent">*</span></span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full bg-background border-2 rounded-xl p-4 text-white focus:outline-none focus:border-accent transition-all ${
                    touched.name && errors.name ? 'border-red-500' : 'border-border-color'
                  }`}
                  placeholder="أدخل اسم المنتج"
                  dir="rtl"
                />
                {touched.name && errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center gap-2 text-text-muted mb-2">
                  <DocumentTextIcon className="w-4 h-4" />
                  <span className="font-medium">وصف المنتج <span className="text-accent">*</span></span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  rows="4"
                  className={`w-full bg-background border-2 rounded-xl p-4 text-white focus:outline-none focus:border-accent transition-all ${
                    touched.description && errors.description ? 'border-red-500' : 'border-border-color'
                  }`}
                  placeholder="أدخل وصف المنتج (مميزاته، فوائده)"
                  dir="rtl"
                />
                {touched.description && errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              {/* AI Suggestions */}
              <div className="bg-gradient-to-br from-accent/10 to-blue-500/10 rounded-xl p-6 border border-accent/30">
                <div className="flex items-center gap-2 mb-3">
                  <SparklesIcon className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-white">اقتراحات للوصف:</h3>
                </div>
                <ul className="text-text-muted text-sm space-y-2 mr-7 list-disc">
                  <li>اذكر المميزات الفريدة للمنتج</li>
                  <li>وضح كيف يحل مشكلة العميل</li>
                  <li>أضف كلمات مفتاحية تسويقية</li>
                </ul>
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
                  <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <p className="text-red-500">{errors.submit}</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between gap-4 pt-6 border-t border-border-color">
                <button
                  type="button"
                  onClick={() => router.push('/upload-image')}
                  className="flex items-center gap-2 px-8 py-3 bg-panel border-2 border-border-color text-text-muted rounded-xl hover:border-accent hover:text-accent transition-all font-medium"
                >
                  <ArrowRightIcon className="w-5 h-5" />
                  <span>السابق</span>
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-l from-accent to-blue-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <span>متابعة</span>
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
  );
}