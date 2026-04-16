'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  PhotoIcon,
  VideoCameraIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  UsersIcon,
  PencilIcon,
  XMarkIcon,
  CheckBadgeIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export default function CampaignResultPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState(null);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  
  const [editModal, setEditModal] = useState({
    isOpen: false,
    type: null,
    id: null,
    assetId: null,
    platform: null,
    feedback: '',
    loading: false
  });

  const campaignId = typeof window !== 'undefined' ? localStorage.getItem('campaignId') : null;

  const fetchCampaignData = async () => {
    if (!campaignId) {
      setError('معرف الحملة غير موجود');
      setLoading(false);
      return;
    }
    try {
      const response = await api(`/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('فشل في تحميل بيانات الحملة');
      const data = await response.json();
      setCampaignData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
    else fetchCampaignData();
  }, [authLoading, isAuthenticated]);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(() => alert('تعذر النسخ'));
  };

  const downloadFile = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('فشل التحميل:', err);
      alert('حدث خطأ أثناء تحميل الملف');
    }
  };

  const openPreview = (url, type) => {
    if (type === 'image') setPreviewImage(url);
    else setPreviewVideo(url);
  };

  const handleNewCampaign = () => {
    localStorage.clear();
    router.push('/create-product');
  };

  // دالة الموافقة على الفئة - بدون رسالة تنبيه
const handleApproveAsset = async (assetId) => {
  if (!assetId) return;
  try {
    const response = await api('/campaigns/approve', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_id: assetId })
    });
    if (!response.ok) throw new Error('فشل في الموافقة');
    await fetchCampaignData(); // تحديث الواجهة الحالية
    // تمت إزالة alert('تم اعتماد المحتوى لهذه الفئة بنجاح');
  } catch (err) {
    alert(err.message); // يبقى فقط في حالة الخطأ
  }
};

  const openEditModal = (type, id, assetId, platform = null) => {
    setEditModal({
      isOpen: true,
      type,
      id,
      assetId,
      platform,
      feedback: '',
      loading: false
    });
  };

  const submitEdit = async () => {
  const { type, id, assetId, platform, feedback } = editModal;
  if (!feedback.trim()) {
    alert('الرجاء إدخال ملاحظاتك للتعديل');
    return;
  }
  setEditModal(prev => ({ ...prev, loading: true }));
  try {
    let endpoint = '';
    let body = {};
    if (type === 'text') {
      endpoint = '/campaigns/edit/text';
      body = { asset_id: assetId, feedback };
    } else if (type === 'image') {
      endpoint = '/campaigns/edit/image';
      body = {
        image_id: id,
        asset_id: assetId,
        platform: platform,
        feedback
      };
    } else if (type === 'video') {
      endpoint = '/campaigns/edit/video';
      body = { video_id: id, feedback };
    }
    const response = await api(endpoint, {
      method: type === 'text' ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'فشل في إعادة التوليد');
    }
    setEditModal(prev => ({ ...prev, isOpen: false, loading: false }));
    await fetchCampaignData();
    // تمت إزالة رسالة التنبيه بعد إعادة التوليد بنجاح
  } catch (err) {
    alert(err.message);
    setEditModal(prev => ({ ...prev, loading: false }));
  }
};

  if (authLoading || loading) return <LoadingSpinner />;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">خطأ: {error}</div>;
  if (!campaignData) return null;

  const assets = campaignData.assets || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6 text-right" dir="rtl">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Progress Bar - داكن */}
        <div className="flex items-center justify-between bg-white p-5 rounded-3xl shadow-lg border border-white/10">
          {[
            { id: 1, name: 'رفع الصورة', status: 'done' },
            { id: 2, name: 'بيانات المنتج', status: 'done' },
            { id: 3, name: 'تحليل الجمهور', status: 'done' },
            { id: 4, name: 'تحديد الاستراتيجية', status: 'done' },
            { id: 5, name: 'توليد الإعلان', status: 'active' }
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

        {/* عنوان النجاح */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">تم إنشاء المحتوى بنجاح!</h2>
          <p className="text-gray-300 text-lg mt-1">يمكنك مراجعة المحتوى، الموافقة عليه، أو طلب تعديله</p>
        </div>

        {/* عرض الأصول - بطاقات بيضاء */}
        {assets.length === 0 ? (
          <p className="text-gray-400 text-center py-12">لا توجد أصول مولدة</p>
        ) : (
          <div className="space-y-8">
            {assets.map((asset, assetIndex) => {
              let mediaUrl = null, mediaType = null, mediaId = null, platform = null;
              if (asset.images && asset.images.length > 0) {
                mediaUrl = asset.images[0].url || asset.images[0].image_url;
                mediaType = 'image';
                mediaId = asset.images[0].id;
                platform = asset.images[0].platform || 'Instagram';
              } else if (asset.videos && asset.videos.length > 0) {
                mediaUrl = asset.videos[0].url || asset.videos[0].video_url;
                mediaType = 'video';
                mediaId = asset.videos[0].id;
                platform = null;
              }
              const audienceName = asset.target_audience || 'جمهور غير محدد';
              const copies = asset.ad_copy || [];
              const isApproved = asset.is_approved;

              return (
                <div key={asset.id || assetIndex} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <UsersIcon className="w-6 h-6 text-green-600" />
                      {audienceName}
                    </h3>
                    <div className="flex items-center gap-3">
                      {isApproved ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                          <CheckBadgeIcon className="w-4 h-4" /> معتمد
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApproveAsset(asset.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          اعتماد هذه الفئة
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* عمود الوسائط */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-gray-800 text-xl font-semibold flex items-center gap-2">
                          {mediaType === 'image' ? <PhotoIcon className="w-5 h-5 text-green-600" /> : <VideoCameraIcon className="w-5 h-5 text-green-600" />}
                          <span>{mediaType === 'image' ? 'الصورة الإعلانية' : 'الفيديو الإعلاني'}</span>
                        </h4>
                        <div className="flex gap-2">
                          {mediaUrl && (
                            <>
                              <button onClick={() => openPreview(mediaUrl, mediaType)} className="text-blue-600 hover:text-blue-800 p-1" title="معاينة">
                                <EyeIcon className="w-5 h-5" />
                              </button>
                              <button onClick={() => downloadFile(mediaUrl, `${audienceName}_${mediaType}.${mediaType === 'image' ? 'png' : 'mp4'}`)} className="text-green-600 hover:text-green-800 p-1" title="تحميل">
                                <ArrowDownTrayIcon className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {mediaId && (
                            <button
                              onClick={() => openEditModal(mediaType, mediaId, asset.id, platform)}
                              className="text-yellow-600 hover:text-yellow-800 p-1"
                              title="طلب تعديل"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {mediaUrl ? (
                        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                          {mediaType === 'image' ? (
                            <img src={mediaUrl} alt={audienceName} className="w-full h-auto object-contain max-h-[300px]" />
                          ) : (
                            <video src={mediaUrl} controls className="w-full h-auto max-h-[300px]" />
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">لا توجد وسائط مولدة لهذه الفئة</div>
                      )}
                    </div>

                    {/* عمود النصوص */}
                    <div>
                      <h4 className="text-gray-800 text-xl font-semibold mb-3 flex items-center gap-2">
                        <DocumentDuplicateIcon className="w-5 h-5 text-green-600" />
                        النصوص الإعلانية ({copies.length})
                      </h4>
                      {copies.length > 0 ? (
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                          {copies.map((copy, copyIndex) => {
                            let text = '', platform = '';
                            if (typeof copy === 'string') text = copy;
                            else {
                              text = copy.ad_copy || copy.text || copy.content || '';
                              platform = copy.platform || '';
                            }
                            const uniqueId = `${asset.id || assetIndex}-${copyIndex}`;
                            return (
                              <div key={uniqueId} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                <div className="flex justify-between items-start">
                                  <div className="flex gap-2">
                                    {platform && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{platform}</span>}
                                    <button
                                      onClick={() => openEditModal('text', null, asset.id)}
                                      className="text-yellow-600 hover:text-yellow-800 p-1"
                                      title="تعديل النص"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <button onClick={() => handleCopy(text, uniqueId)} className="text-gray-500 hover:text-gray-700 p-1" title="نسخ">
                                    {copiedIndex === uniqueId ? <CheckCircleIcon className="w-5 h-5 text-green-600" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
                                  </button>
                                </div>
                                <p className="text-gray-800 text-sm mt-2 leading-relaxed whitespace-pre-wrap">{text}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">لا توجد نصوص مولدة لهذه الفئة</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
          <button onClick={() => router.push('/select-platforms')} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl transition-all flex items-center gap-2">
            <ArrowRightIcon className="w-5 h-5" /> تعديل الاختيارات
          </button>
          <div className="flex gap-3">
            <button onClick={handleNewCampaign} className="bg-panel border border-border-color hover:bg-panel/80 text-white px-6 py-3 rounded-xl transition-all">حملة جديدة</button>
            <button onClick={() => router.push('/dashboard')} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">
              <SparklesIcon className="w-5 h-5" /> لوحة التحكم
            </button>
          </div>
        </div>
      </div>

      {/* مودال معاينة الصورة */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="معاينة" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button onClick={() => setPreviewImage(null)} className="absolute top-2 left-2 text-white bg-black/50 rounded-full p-2 text-xl">✕</button>
          </div>
        </div>
      )}
      {/* مودال معاينة الفيديو */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setPreviewVideo(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <video src={previewVideo} controls autoPlay className="max-w-full max-h-[90vh]" />
            <button onClick={() => setPreviewVideo(null)} className="absolute top-2 left-2 text-white bg-black/50 rounded-full p-2 text-xl">✕</button>
          </div>
        </div>
      )}

      {/* مودال التعديل */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-panel border border-border-color rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-border-color">
              <h3 className="text-white font-bold text-lg">
                {editModal.type === 'text' && 'طلب تعديل النص الإعلاني'}
                {editModal.type === 'image' && 'طلب إعادة توليد الصورة'}
                {editModal.type === 'video' && 'طلب إعادة توليد الفيديو'}
              </h3>
              <button onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <label className="text-white text-sm block mb-2">ملاحظاتك للتعديل:</label>
              <textarea
                value={editModal.feedback}
                onChange={(e) => setEditModal(prev => ({ ...prev, feedback: e.target.value }))}
                rows={4}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl p-3 focus:border-green-500 focus:outline-none"
                placeholder="مثال: غير الخلفية، اجعل النص أقصر، إلخ."
              />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">إلغاء</button>
                <button onClick={submitEdit} disabled={editModal.loading} className="bg-green-600 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  {editModal.loading ? <LoadingSpinner size="sm" /> : 'إرسال الطلب'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}