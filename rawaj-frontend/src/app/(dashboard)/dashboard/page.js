// src/app/(dashboard)/upload-image/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  CloudArrowUpIcon, 
  PhotoIcon, 
  XMarkIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

export default function UploadImagePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [debug, setDebug] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // للـ Debug
  useEffect(() => {
    if (user) {
      console.log('المستخدم:', user);
    }
  }, [user]);

  const validateFile = (file) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت');
      return false;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('نوع الملف غير مدعوم. الرجاء اختيار صورة JPG, PNG, GIF أو WEBP');
      return false;
    }

    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setDebug(null);

    if (!validateFile(file)) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    setFileInfo({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      type: file.type.split('/')[1].toUpperCase(),
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('الرجاء اختيار صورة أولاً');
      return;
    }

    setUploading(true);
    setError('');
    setDebug(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    // للـ Debug
    const formDataEntries = [];
    for (let pair of formData.entries()) {
      formDataEntries.push({ 
        key: pair[0], 
        value: pair[1] instanceof File ? pair[1].name : pair[1] 
      });
    }

    try {
      console.log('جاري رفع الصورة...');
      
      // استخدام api service من الـ Context
      const response = await api('/products/upload-image', {
        method: 'POST',
        body: formData,
        // لا نضبط Content-Type لأن FormData يضبطه تلقائياً
      });

      console.log('حالة الاستجابة:', response.status);

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        const text = await response.text();
        responseData = { text };
      }

      setDebug({ 
        formData: formDataEntries, 
        response: responseData, 
        status: response.status 
      });

      if (!response.ok) {
        throw new Error(responseData.detail || responseData.message || 'فشل في رفع الصورة');
      }
      
      // استخراج رابط الصورة
      const imageUrl = responseData.original_image_url || responseData.image_url || responseData.url;
      
      if (!imageUrl) {
        throw new Error('الـ API ما رجع رابط الصورة');
      }

      localStorage.setItem('productImage', imageUrl);
      setUploadedImageUrl(imageUrl);

    } catch (err) {
      console.error('خطأ في الرفع:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadedImageUrl('');
    setFileInfo(null);
    setDebug(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleNext = () => {
    if (uploadedImageUrl) {
      router.push('/create-product');
    }
  };

  // عرض شاشة التحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-text-muted mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا المستخدم مش مسجل دخول (بعد ما خلص التحميل)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6 flex items-center justify-center">
        <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color p-12 text-center max-w-md">
          <ExclamationCircleIcon className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">غير مصرح</h2>
          <p className="text-text-muted mb-6">الرجاء تسجيل الدخول أولاً للوصول إلى هذه الصفحة</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent-dark transition-all"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header مع اسم المستخدم */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">رفع صورة المنتج</h1>
            <p className="text-text-muted">مرحباً {user?.name || user?.email || 'المستخدم'}</p>
          </div>
          <div className="bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/30">
            <span className="text-green-500 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              متصل
            </span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
            <span className="text-white text-sm">رفع الصورة</span>
          </div>
          <div className="w-12 h-0.5 bg-border-color"></div>
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-8 h-8 bg-panel border border-border-color rounded-full flex items-center justify-center text-text-muted text-sm">2</div>
            <span className="text-text-muted text-sm">بيانات المنتج</span>
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
                <PhotoIcon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">رفع الصورة ومعالجتها</h2>
                <p className="text-text-muted text-sm">الصيغ المدعومة: JPG, PNG, GIF, WEBP</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {!previewUrl ? (
              // Upload Area
              <div className="border-3 border-dashed border-border-color rounded-2xl p-12 text-center hover:border-accent transition-all group cursor-pointer">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <CloudArrowUpIcon className="w-12 h-12 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">اختر صورة المنتج</h3>
                  <p className="text-text-muted mb-2">اضغط لاختيار صورة أو اسحبها وأفلتها هنا</p>
                  <p className="text-text-muted text-sm">الحد الأقصى: 10 ميجابايت</p>
                </label>
              </div>
            ) : (
              // Preview Area
              <div className="space-y-6">
                {/* Image Preview */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="relative group">
                    <div className="relative h-64 rounded-xl overflow-hidden border-2 border-border-color bg-background">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button
                          onClick={handleRemoveImage}
                          className="p-3 bg-red-500/20 rounded-full hover:bg-red-500/40 transition-all"
                        >
                          <XMarkIcon className="w-6 h-6 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* File Info */}
                  {fileInfo && (
                    <div className="bg-background rounded-xl p-6 border border-border-color">
                      <h4 className="font-bold text-white mb-4">معلومات الملف:</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-text-muted">الاسم:</span>
                          <span className="text-white font-medium">{fileInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">الحجم:</span>
                          <span className="text-white font-medium">{fileInfo.size} MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">النوع:</span>
                          <span className="text-white font-medium">{fileInfo.type}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                {!uploadedImageUrl ? (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full bg-gradient-to-l from-accent to-blue-500 text-white py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                  >
                    {uploading ? (
                      <>
                        <LoadingSpinner size="sm" color="white" />
                        <span>جاري رفع الصورة ومعالجتها...</span>
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="w-6 h-6" />
                        <span>رفع الصورة ومعالجتها</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-white mb-2">تم رفع الصورة بنجاح! 🎉</h3>
                    <p className="text-text-muted">تمت إزالة الخلفية وتجهيز الصورة للحملة الإعلانية</p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
                    <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <p className="text-red-500">{error}</p>
                  </div>
                )}

                {/* Debug Info - شيله بعد ما يشتغل */}
                {debug && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-500 mb-2">
                      <BeakerIcon className="w-5 h-5" />
                      <span className="font-bold">معلومات التصحيح:</span>
                    </div>
                    <pre className="text-xs text-blue-400 overflow-auto max-h-40">
                      {JSON.stringify(debug, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-border-color">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 py-3 bg-panel border-2 border-border-color text-text-muted rounded-xl hover:border-accent hover:text-accent transition-all font-medium"
              >
                إلغاء
              </button>
              
              {uploadedImageUrl && (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-3 px-8 py-3 bg-gradient-to-l from-accent to-blue-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-accent/30 transition-all transform hover:scale-105"
                >
                  <span>متابعة إلى بيانات المنتج</span>
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="bg-panel/30 backdrop-blur-sm rounded-xl p-4 border border-border-color">
            <div className="flex items-center gap-2 text-accent mb-2">
              <PhotoIcon className="w-5 h-5" />
              <span className="font-bold">صورة واضحة</span>
            </div>
            <p className="text-text-muted text-sm">استخدم صورة بجودة عالية للمنتج لنتائج أفضل</p>
          </div>
          <div className="bg-panel/30 backdrop-blur-sm rounded-xl p-4 border border-border-color">
            <div className="flex items-center gap-2 text-accent mb-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-bold">خلفية بسيطة</span>
            </div>
            <p className="text-text-muted text-sm">صور ذات خلفية بسيطة تعطي نتائج أفضل في إزالة الخلفية</p>
          </div>
          <div className="bg-panel/30 backdrop-blur-sm rounded-xl p-4 border border-border-color">
            <div className="flex items-center gap-2 text-accent mb-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-bold">منتج واحد</span>
            </div>
            <p className="text-text-muted text-sm">يفضل أن تحتوي الصورة على منتج واحد فقط</p>
          </div>
        </div>
      </div>
    </div>
  );
}