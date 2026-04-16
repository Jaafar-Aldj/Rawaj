// src/app/(dashboard)/my-products/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  ShoppingBagIcon,
  TrashIcon,
  SparklesIcon,
  EyeIcon,
  PlusCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';

export default function MyProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // جلب المنتجات من API
  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api('/products/', {
        method: 'GET',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'فشل في تحميل المنتجات');
      }
      const data = await response.json();
      // نتوقع أن البيانات مصفوفة من المنتجات
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('خطأ في جلب المنتجات:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchProducts();
    }
  }, [authLoading, isAuthenticated, router]);

  // حذف منتج
  const handleDelete = async (productId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    setDeletingId(productId);
    try {
      const response = await api(`/products/${productId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'فشل في حذف المنتج');
      }
      // تحديث القائمة بعد الحذف
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.error('خطأ في الحذف:', err);
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // عرض تحليل المنتج (يمكن التوجه لصفحة التحليل مع حفظ ID)
  const handleAnalyze = (product) => {
    localStorage.setItem('currentProductId', product.id);
    router.push('/analyze-product');
  };

  // عرض تفاصيل المنتج (يمكن إنشاء صفحة تفاصيل لاحقاً)
  const handleViewDetails = (product) => {
    // مؤقتاً نوجه للتحليل، أو يمكن عمل صفحة منفصلة
    router.push(`/products/${product.id}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">منتجاتي</h1>
            <p className="text-text-muted">جميع المنتجات التي قمت برفعها وتحليلها</p>
          </div>
          <button
            onClick={() => router.push('/upload-image')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-accent to-blue-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-accent/30 transition-all"
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span>إضافة منتج جديد</span>
          </button>
        </div>

        {/* زر إعادة تحميل (اختياري) */}
        <div className="flex justify-end mb-4">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-panel border border-border-color rounded-lg text-text-muted hover:text-accent transition-all"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>

        {/* حالة التحميل */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* حالة الخطأ */}
        {!loading && error && (
          <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-6 text-center">
            <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={fetchProducts}
              className="mt-4 px-6 py-2 bg-red-500/30 rounded-lg text-white hover:bg-red-500/50"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* عدم وجود منتجات */}
        {!loading && !error && products.length === 0 && (
          <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color p-12 text-center">
            <NoSymbolIcon className="w-20 h-20 text-text-muted mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">لا توجد منتجات</h3>
            <p className="text-text-muted mb-6">لم تقم بإضافة أي منتج بعد. ابدأ برفع أول منتج لك!</p>
            <button
              onClick={() => router.push('/upload-image')}
              className="px-6 py-3 bg-accent text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              رفع منتج جديد
            </button>
          </div>
        )}

        {/* شبكة المنتجات */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-panel/50 backdrop-blur-sm rounded-2xl border border-border-color overflow-hidden hover:border-accent/50 transition-all hover:shadow-xl group"
              >
                {/* صورة المنتج */}
                <div className="relative h-48 bg-background overflow-hidden">
                  {product.original_image_url ? (
                    <img
                      src={product.original_image_url}
                      alt={product.name}
                      className="w-full h-full object-contain transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <ShoppingBagIcon className="w-16 h-16" />
                    </div>
                  )}
                </div>

                {/* محتوى البطاقة */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-text-muted text-sm line-clamp-2 mb-4">
                    {product.description || 'لا يوجد وصف'}
                  </p>

                  {/* معلومات إضافية (تاريخ الإنشاء مثلاً) */}
                  {product.created_at && (
                    <p className=" text-text-muted text-l mb-4">
                      تاريخ الإضافة: {new Date(product.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  )}

                    
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border-color">
                    <button
                        onClick={() => router.push(`/products/${product.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/10 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all"
                    >
                        <EyeIcon className="w-4 h-4" />
                        <span>تفاصيل</span>
                    </button>
                    <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500/20 transition-all"
                    >
                        {deletingId === product.id ? <LoadingSpinner size="sm" /> : <TrashIcon className="w-4 h-4" />}
                        <span>حذف</span>
                    </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}