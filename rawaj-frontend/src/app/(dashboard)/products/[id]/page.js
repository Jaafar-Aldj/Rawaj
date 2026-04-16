// src/app/(dashboard)/products/[id]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  PencilIcon,
  CheckIcon,
  TrashIcon,
  CloudArrowUpIcon,
  PhotoIcon,
  SparklesIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id;
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProduct = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api(`/products/${productId}`, { method: 'GET' });
      if (!response.ok) throw new Error('فشل في تحميل بيانات المنتج');
      const data = await response.json();
      setProduct(data);
      setEditName(data.name);
      setEditDescription(data.description || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated && productId) {
      fetchProduct();
    }
  }, [authLoading, isAuthenticated, productId]);

  const handleUpdate = async () => {
    if (!editName.trim()) {
      setError('الاسم مطلوب');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      const response = await api(`/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          original_image_url: product.original_image_url,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'فشل التحديث');
      }
      const updated = await response.json();
      setProduct(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploadRes = await api('/products/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('فشل رفع الصورة');
      const uploadData = await uploadRes.json();
      const newImageUrl = uploadData.original_image_url || uploadData.image_url;
      if (!newImageUrl) throw new Error('لم يتم استلام رابط الصورة');

      const updateRes = await api(`/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          original_image_url: newImageUrl,
        }),
      });
      if (!updateRes.ok) throw new Error('فشل تحديث صورة المنتج');
      const updatedProduct = await updateRes.json();
      setProduct(updatedProduct);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) return;
    setDeleting(true);
    try {
      const response = await api(`/products/${productId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('فشل الحذف');
      router.push('/my-products');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const handleCreateCampaign = () => {
    localStorage.setItem('currentProductId', productId);
    router.push('/analyze-product');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-6 text-center max-w-md">
          <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-500">{error}</p>
          <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-accent rounded-lg text-white">
            عودة
          </button>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-full bg-panel border border-border-color text-text-muted hover:text-accent">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-white">تفاصيل المنتج</h1>
        </div>

        <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden">
          <div className="relative h-72 bg-background flex items-center justify-center border-b border-border-color">
            {product.original_image_url ? (
              <img src={product.original_image_url} alt={product.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <PhotoIcon className="w-24 h-24 text-text-muted" />
            )}
            <label className="absolute bottom-4 left-4 cursor-pointer bg-black/60 hover:bg-accent p-3 rounded-full transition">
              <CloudArrowUpIcon className="w-8 h-8 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0])} disabled={uploadingImage} />
            </label>
            {uploadingImage && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            )}
          </div>

          <div className="p-8">
            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-text-muted mb-2">اسم المنتج</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-background border-2 border-border-color rounded-xl p-3 text-white focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-2">الوصف</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows="5"
                    className="w-full bg-background border-2 border-border-color rounded-xl p-3 text-white focus:border-accent"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleUpdate} disabled={updating} className="flex items-center gap-2 px-6 py-2 bg-accent rounded-xl text-white">
                    {updating ? <LoadingSpinner size="sm" /> : <CheckIcon className="w-5 h-5" />}
                    حفظ
                  </button>
                  <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-panel border border-border-color rounded-xl text-text-muted">
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2"> اسم المنتج : {product.name} </h2>
                    <p className=" text-xl text-text-muted whitespace-pre-wrap">وصف المنتج : {product.description || 'لا يوجد وصف'}</p>
                  </div>
                  <button onClick={() => setIsEditing(true)} className="p-2 rounded-full bg-accent/10 text-accent hover:bg-accent/20">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                </div>
                {product.created_at && (
                  <p className="text-text-muted text-m">تاريخ الإضافة: {new Date(product.created_at).toLocaleDateString('ar-EG')}</p>
                )}
                {/* الأزرار: توسيط مع إزاحة يسارية خفيفة */}
                
                <div className="flex flex-wrap gap-4 pt-6 border-t border-border-color justify-center mr-12">
                  <button
                    onClick={handleCreateCampaign}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-accent to-blue-500 text-white rounded-xl font-bold hover:shadow-lg"
                  >
                    <SparklesIcon className="w-5 h-5" />
                    إنشاء حملة
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500/20 text-red-500 rounded-xl font-bold hover:bg-red-500/30"
                  >
                    {deleting ? <LoadingSpinner size="sm" /> : <TrashIcon className="w-5 h-5" />}
                    حذف المنتج
                  </button>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 flex items-center gap-2">
                    <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}