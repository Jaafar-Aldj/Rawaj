'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudArrowUpIcon, 
  PhotoIcon, 
  XMarkIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function UploadImagePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  const validateFile = (file) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت');
      return false;
    }
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'jfif', 'bmp', 'tiff'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      setError('نوع الملف غير مدعوم. الرجاء اختيار صورة بصيغة مدعومة');
      return false;
    }
    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    if (!validateFile(file)) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFileInfo({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      extension: file.name.split('.').pop().toUpperCase(),
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('الرجاء اختيار صورة أولاً');
      return;
    }
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile, selectedFile.name);

    try {
      const response = await api('/products/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('فشل في رفع الصورة');
      const responseData = await response.json();
      const imageUrl = responseData.original_image_url || responseData.image_url || responseData.url;
      localStorage.setItem('productImage', imageUrl);
      setUploadedImageUrl(imageUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size="lg" color="#10b981" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 text-right" dir="rtl">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center md:text-right"
        >
          <h1 className="text-2xl font-black text-white mb-2">الخطوة الأولى: قم برفع صورة منتجك</h1>
        </motion.div>

        {/* Progress Steps - 5 خطوات مع تباعد مناسب */}
        <div className="flex items-center justify-between bg-white p-5 rounded-3xl shadow-lg border border-white/10">
          {[
            { id: 1, name: 'رفع الصورة', status: 'active' },
            { id: 2, name: 'بيانات المنتج', status: 'pending' },
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
                  {step.id}
                </div>
                <span className={`text-[10px] font-bold whitespace-nowrap ${step.status !== 'pending' ? 'text-gray-900' : 'text-gray-400'}`}>{step.name}</span>
              </div>
              {idx < arr.length - 1 && (
                <div className={`flex-1 h-[2px] mx-2 rounded-full ${
                  step.status === 'active' || step.status === 'done' ? 'bg-green-100' : 'bg-gray-100'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Main Upload Card */}
        <motion.div layout className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 mt-6">
          <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-xl">
              <SparklesIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">المعالج الذكي</h2>
              <p className="text-black text-m font-medium">ارفع صورة واضحة للمنتج لنتمكن من معالجتها وتصميمها</p>
            </div>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {!previewUrl ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="border-2 border-dashed border-gray-100 rounded-2xl p-10 text-center hover:border-green-400 hover:bg-green-50/20 transition-all group cursor-pointer"
                >
                  <input type="file" id="image-upload" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  <label htmlFor="image-upload" className="cursor-pointer block">
                    <div className="w-16 h-16 bg-green-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-100 group-hover:scale-105 transition-transform">
                      <CloudArrowUpIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-1">اضغط لرفع الصورة</h3>
                  </label>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="relative aspect-square max-h-[280px] rounded-2xl overflow-hidden border-4 border-gray-50 bg-gray-50 mx-auto w-full">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                      {!uploadedImageUrl && (
                        <button 
                          onClick={() => {setPreviewUrl(''); setSelectedFile(null); setUploadedImageUrl('');}}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-all"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 self-center">
                      <h4 className="font-black text-gray-900 text-md mb-4 flex items-center gap-2">
                         <PhotoIcon className="w-5 h-5 text-green-600" /> تفاصيل الصورة
                      </h4>
                      <div className="space-y-3 text-sm font-bold">
                        <div className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-400 font-medium">الاسم:</span><span className="text-gray-900 truncate max-w-[120px]">{fileInfo?.name}</span></div>
                        <div className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-400 font-medium">الحجم:</span><span className="text-gray-900">{fileInfo?.size} MB</span></div>
                        <div className="flex justify-between"><span className="text-gray-400 font-medium">الصيغة:</span><span className="text-green-600">{fileInfo?.extension}</span></div>
                      </div>
                    </div>
                  </div>

                  {!uploadedImageUrl ? (
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full bg-green-600 text-white py-4 rounded-xl font-black text-lg hover:bg-green-700 shadow-lg shadow-green-100 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {uploading ? (
                        <>
                          <LoadingSpinner size="sm" color="white" />
                          <span>جاري رفع الصورة...</span>
                        </>
                      ) : (
                        "رفع الصورة ومعالجتها"
                      )}
                    </button>
                  ) : (
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
                      <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-4">
                        <CheckCircleIcon className="w-8 h-8 text-green-600" />
                        <p className="text-green-800 font-black text-lg">تم رفع الصورة بنجاح!</p>
                      </div>
                      <button
                        onClick={() => router.push('/create-product')}
                        className="w-full bg-gray-900 text-white py-4 rounded-xl font-black text-lg hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg"
                      >
                        الخطوة التالية (بيانات المنتج)
                        <ArrowLeftIcon className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="mt-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-600 font-bold text-sm">
                <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}