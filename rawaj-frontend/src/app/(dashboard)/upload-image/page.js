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
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function UploadImagePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // التحقق من صحة الملف
  const validateFile = (file) => {
    // التحقق من الحجم (10MB كحد أقصى)
    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت');
      return false;
    }

    // قائمة بكل الصيغ المسموح بها
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/jfif',
      'image/pipeg',
      'image/bmp',
      'image/tiff'
    ];
    
    // استخراج الصيغة من اسم الملف
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();
    
    // قائمة الامتدادات المسموح بها
    const allowedExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 
      'jfif', 'bmp', 'tiff', 'tif'
    ];
    
    // التحقق من النوع أو الامتداد
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setError('نوع الملف غير مدعوم. الرجاء اختيار صورة بصيغة مدعومة');
      return false;
    }

    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setUploadSuccess(false);

    if (!validateFile(file)) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    // استخراج الصيغة الأصلية
    const originalExtension = file.name.split('.').pop();
    
    setFileInfo({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      extension: originalExtension.toUpperCase(),
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('الرجاء اختيار صورة أولاً');
      return;
    }

    setUploading(true);
    setError('');
    setUploadSuccess(false);

    const formData = new FormData();
    // نرسل الملف بنفس الصيغة الأصلية
    formData.append('file', selectedFile, selectedFile.name);

    try {
      const response = await api('/products/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'فشل في رفع الصورة');
      }
      
      const responseData = await response.json();
      
      // استخراج رابط الصورة
      const imageUrl = responseData.original_image_url || responseData.image_url || responseData.url;
      
      if (!imageUrl) {
        throw new Error('الـ API ما رجع رابط الصورة');
      }

      // حفظ رابط الصورة
      localStorage.setItem('productImage', imageUrl);
      
      setUploadedImageUrl(imageUrl);
      setUploadSuccess(true);

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
    setUploadSuccess(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
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
          <div className="w-12 h-0.5 bg-border-color"></div>
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-8 h-8 bg-panel border border-border-color rounded-full flex items-center justify-center text-text-muted text-sm">4</div>
            <span className="text-text-muted text-sm">توليد المحوى الإعلاني</span>
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
                <p className="text-text-muted text-sm">نحتفظ بنفس الصيغة الأصلية للصورة</p>
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
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <CloudArrowUpIcon className="w-12 h-12 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">اختر صورة المنتج</h3>
                  <p className="text-text-muted mb-2">اضغط لاختيار صورة أو اسحبها وأفلتها هنا</p>
                  <p className="text-text-muted text-sm">جميع الصيغ مدعومة</p>
                  <p className="text-text-muted text-xs mt-2">الحد الأقصى: 10 ميجابايت</p>
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
                          <span className="text-text-muted">اسم الملف:</span>
                          <span className="text-white font-medium">{fileInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">الحجم:</span>
                          <span className="text-white font-medium">{fileInfo.size} MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">الصيغة:</span>
                          <span className="text-white font-medium">{fileInfo.extension}</span>
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
                        <span>جاري رفع الصورة...</span>
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="w-6 h-6" />
                        <span>رفع الصورة</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-6 text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-white mb-2">تم رفع الصورة بنجاح! 🎉</h3>
                    <p className="text-text-muted">تم رفع الصورة بنفس الصيغة: {fileInfo?.extension}</p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
                    <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <p className="text-red-500">{error}</p>
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
                  <span>متابعة</span>
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="bg-panel/30 backdrop-blur-sm rounded-xl p-4 border border-border-color">
            <PhotoIcon className="w-5 h-5 text-accent mb-2" />
            <p className="text-text-muted text-sm">صورة واضحة تعطي نتائج أفضل</p>
          </div>
          <div className="bg-panel/30 backdrop-blur-sm rounded-xl p-4 border border-border-color">
            <CheckCircleIcon className="w-5 h-5 text-accent mb-2" />
            <p className="text-text-muted text-sm">خلفية بسيطة تساعد في المعالجة</p>
          </div>
          <div className="bg-panel/30 backdrop-blur-sm rounded-xl p-4 border border-border-color">
            <CheckCircleIcon className="w-5 h-5 text-accent mb-2" />
            <p className="text-text-muted text-sm">منتج واحد في الصورة</p>
          </div>
        </div>
      </div>
    </div>
  );
}