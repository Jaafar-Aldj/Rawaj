'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MegaphoneIcon, PhotoIcon, VideoCameraIcon, DocumentTextIcon,
  CheckCircleIcon, ClockIcon, ArrowLeftIcon, CalendarIcon,
  UserGroupIcon, SparklesIcon, ExclamationCircleIcon,
  ArrowDownTrayIcon, EyeIcon, XMarkIcon, ClipboardDocumentIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params.id;
  
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedId, setCopiedId] = useState(null);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null,
    id: null,
    assetId: null,
    targetName: '',
    loading: false
  });

  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const goToSelectPlatforms = () => {
    if (campaignId) {
      localStorage.setItem('campaignId', campaignId.toString());
      router.push('/select-platforms');
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && campaignId) fetchCampaignDetails();
  }, [isAuthenticated, campaignId]);

  const fetchCampaignDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api(`/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('فشل في جلب تفاصيل الحملة');
      const data = await response.json();
      setCampaign(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // دوال الحذف
  const handleDeleteCampaign = async () => {
    const response = await api(`/campaigns/${campaignId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('فشل في حذف الحملة');
    router.push('/camp');
  };

  const handleDeleteAsset = async (assetId) => {
    const response = await api(`/campaigns/asset/${assetId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('فشل في حذف الفئة');
    await fetchCampaignDetails();
  };

  const handleDeleteImage = async (imageId) => {
    const response = await api(`/campaigns/asset/image/${imageId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('فشل في حذف الصورة');
    await fetchCampaignDetails();
  };

  const handleDeleteVideo = async (videoId) => {
    const response = await api(`/campaigns/asset/video/${videoId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('فشل في حذف الفيديو');
    await fetchCampaignDetails();
  };

  const openDeleteModal = (type, id, assetId, targetName) => {
    setDeleteModal({
      isOpen: true,
      type,
      id,
      assetId,
      targetName,
      loading: false
    });
  };

  const executeDelete = async () => {
    const { type, id, assetId } = deleteModal;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      if (type === 'campaign') await handleDeleteCampaign();
      else if (type === 'asset') await handleDeleteAsset(assetId);
      else if (type === 'image') await handleDeleteImage(id);
      else if (type === 'video') await handleDeleteVideo(id);
      setDeleteModal({ isOpen: false, type: null, id: null, assetId: null, targetName: '', loading: false });
    } catch (err) {
      alert(err.message);
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const getCampaignStatus = () => {
    if (!campaign) return { text: '', color: '', bg: '', icon: null };
    const status = campaign.status || 'DRAFT';
    switch (status) {
      case 'DRAFT': return { text: 'مسودة', color: 'text-gray-800', bg: 'bg-gray-100', icon: DocumentTextIcon, borderColor: 'border-gray-300' };
      case 'PENDING_APPROVAL': return { text: 'قيد المراجعة', color: 'text-yellow-800', bg: 'bg-yellow-100', icon: ClockIcon, borderColor: 'border-yellow-300' };
      case 'COMPLETED': return { text: 'مكتملة', color: 'text-green-800', bg: 'bg-green-100', icon: CheckCircleIcon, borderColor: 'border-green-300' };
      default: return { text: status, color: 'text-gray-800', bg: 'bg-gray-100', icon: DocumentTextIcon, borderColor: 'border-gray-300' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <LoadingSpinner size="lg" />
        </motion.div>
        <p className="mt-4 text-base animate-pulse">جاري تحميل تفاصيل الحملة...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color p-8 text-center">
          <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">عذراً، حدث خطأ</h2>
          <p className="text-text-muted mb-6 text-sm">{error || 'الحملة غير موجودة'}</p>
          <button onClick={() => router.back()} className="bg-accent text-white px-6 py-2 rounded-xl font-bold transition-transform hover:scale-105 text-sm">العودة للخلف</button>
        </div>
      </div>
    );
  }

  const status = getCampaignStatus();
  const StatusIcon = status.icon;
  const assets = campaign.assets || [];

  const allImages = assets.flatMap(asset => 
    (asset.images || []).map(img => ({ 
      id: img.id,
      url: img.image_url || img.url, 
      audience: asset.target_audience,
      assetId: asset.id
    }))
  );

  const allVideos = assets.flatMap(asset =>
    (asset.videos || []).map(vid => ({ 
      id: vid.id,
      url: vid.video_url || vid.url, 
      audience: asset.target_audience,
      assetId: asset.id
    }))
  );

  const allCopies = assets.flatMap(asset =>
    (asset.ad_copy || []).map((copy, idx) => ({
      text: typeof copy === 'string' ? copy : (copy.ad_copy || copy.text),
      platform: copy.platform || '',
      audience: asset.target_audience || 'عام',
      assetId: asset.id,
      copyIndex: idx
    }))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6 text-right" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* زر الرجوع */}
        <motion.button 
          whileHover={{ x: -5 }} 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-text-muted hover:text-accent transition-all mb-6 text-base"
        >
          <ArrowLeftIcon className="w-5 h-5" /> رجوع إلى الحملات
        </motion.button>

        {/* الكارت العلوي - معلومات الحملة مع أزرار الإجراءات */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden mb-8"
        >
          <div className="bg-gradient-to-l from-accent/20 to-transparent p-6 border-b border-border-color">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-accent/10 rounded-2xl ring-1 ring-accent/30">
                  <MegaphoneIcon className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{campaign.name}</h1>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className={`${status.bg} ${status.color} px-3 py-0.5 rounded-full text-sm font-medium flex items-center gap-1 border ${status.borderColor}`}>
                      {StatusIcon && <StatusIcon className="w-4 h-4" />} {status.text}
                    </span>
                    <span className="text-text-muted flex items-center gap-1 text-sm">
                      <CalendarIcon className="w-4 h-4" /> {formatDate(campaign.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/upload-image" className="flex items-center gap-2 bg-gradient-to-r from-accent to-accent-dark text-white font-bold py-2 px-6 rounded-2xl shadow-xl shadow-accent/20 text-sm">
                    <SparklesIcon className="w-5 h-5" /> حملة جديدة
                  </Link>
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openDeleteModal('campaign', null, null, campaign.name)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-2xl shadow-lg text-sm transition-all"
                >
                  <TrashIcon className="w-5 h-5" /> حذف الحملة
                </motion.button>
              </div>
            </div>
          </div>

          {/* أرقام سريعة */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'الصور', count: allImages.length, icon: PhotoIcon, color: 'text-blue-500' },
              { label: 'الفيديوهات', count: allVideos.length, icon: VideoCameraIcon, color: 'text-red-500' },
              { label: 'النصوص', count: allCopies.length, icon: DocumentTextIcon, color: 'text-green-600' },
              { label: 'الفئات', count: assets.length, icon: UserGroupIcon, color: 'text-purple-500' },
            ].map((stat, i) => (
              <motion.div key={i} whileHover={{ y: -5 }} className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <span className="text-gray-600 text-base font-medium">{stat.label}</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{stat.count}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* شريط التبويب (Tabs) */}
        <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden mb-10">
          <div className="border-b border-border-color flex gap-4 p-4 overflow-x-auto scrollbar-hide">
            {['overview', 'images', 'videos', 'copies'].map(tab => (
              <button 
                key={tab} onClick={() => setActiveTab(tab)} 
                className={`relative px-6 py-2 rounded-xl font-bold transition-all text-base whitespace-nowrap ${activeTab === tab ? 'text-white' : 'text-text-muted hover:text-accent hover:bg-accent/10'}`}
              >
                {activeTab === tab && <motion.div layoutId="activeTab" className="absolute inset-0 bg-accent rounded-xl -z-10" />}
                {tab === 'overview' ? 'نظرة عامة' : tab === 'images' ? 'الصور' : tab === 'videos' ? 'الفيديوهات' : 'النصوص'}
              </button>
            ))}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
              >
                
                {/* تبويب النظرة العامة */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {campaign.objective && (
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                        <h3 className="text-lg font-bold text-accent mb-3 flex items-center gap-2"> الهدف الإستراتيجي</h3>
                        <p className="text-white text-base leading-relaxed">{campaign.objective}</p>
                      </div>
                    )}

                    {/* الفئات المستهدفة */}
                    {campaign.suggested_audiences?.suggestions?.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <UserGroupIcon className="w-5 h-5 text-accent" />
                          الفئات المستهدفة
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {campaign.suggested_audiences.suggestions.map((suggestion, idx) => (
                            <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                              <h4 className="font-bold text-accent mb-2">{suggestion.audience}</h4>
                              <p className="text-text-muted text-sm">{suggestion.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {campaign.posting_strategy && (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                          <h4 className="text-green-700 font-bold text-lg mb-3 flex items-center gap-2"><ClockIcon className="w-5 h-5"/> المواعيد المقترحة</h4>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {campaign.posting_strategy.best_days?.map((d, i) => <span key={i} className="bg-green-100 text-green-800 px-3 py-0.5 rounded-lg text-sm font-bold">{d}</span>)}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {campaign.posting_strategy.best_times?.map((t, i) => <span key={i} className="bg-blue-100 text-blue-800 px-3 py-0.5 rounded-lg text-sm font-bold">{t}</span>)}
                          </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                          <h4 className="text-green-700 font-bold text-lg mb-3 flex items-center gap-2"> <ClockIcon className="w-5 h-5"/>لماذا هذه المواعيد؟</h4>
                          <p className="text-gray-800 text-base leading-relaxed">{campaign.posting_strategy.reason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* تبويب الصور */}
                {activeTab === 'images' && (
                  allImages.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl">
                      <PhotoIcon className="w-20 h-20 text-text-muted mx-auto mb-4 opacity-50" />
                      <p className="text-text-muted text-lg mb-4">لا توجد صور في هذه الحملة</p>
                      <button
                        onClick={goToSelectPlatforms}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition"
                      >
                        توليد صورة الآن
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {allImages.map((img, idx) => (
                        <motion.div 
                          key={idx} whileHover={{ y: -5 }} 
                          className="group relative bg-white rounded-xl overflow-hidden border-2 border-gray-100 shadow-md cursor-pointer"
                          onClick={() => setSelectedImage(img.url)}
                        >
                          <div className="aspect-square overflow-hidden bg-gray-100">
                            <img src={img.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-accent transition-colors"><EyeIcon className="w-5 h-5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDownload(img.url, `img-${idx}.png`); }} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-green-600 transition-colors"><ArrowDownTrayIcon className="w-5 h-5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); openDeleteModal('image', img.id, null, `صورة ${img.audience}`); }} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-600 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                          </div>
                          <div className="p-2 bg-white text-center border-t flex justify-between items-center">
                            <p className="text-gray-900 font-bold text-sm truncate">{img.audience}</p>
                            <button onClick={() => openDeleteModal('image', img.id, null, `صورة ${img.audience}`)} className="text-red-500 hover:text-red-700 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                )}

                {/* تبويب الفيديوهات */}
                {activeTab === 'videos' && (
                  allVideos.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl">
                      <VideoCameraIcon className="w-20 h-20 text-text-muted mx-auto mb-4 opacity-50" />
                      <p className="text-text-muted text-lg mb-4">لا توجد فيديوهات في هذه الحملة</p>
                      <button
                        onClick={goToSelectPlatforms}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold transition"
                      >
                        توليد فيديو الآن
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {allVideos.map((vid, idx) => (
                        <motion.div 
                          key={idx} whileHover={{ y: -5 }} 
                          className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-md cursor-pointer"
                          onClick={() => setSelectedVideo(vid.url)}
                        >
                          <div className="relative aspect-video bg-black">
                            <video 
                              src={vid.url} 
                              className="w-full h-full object-cover"
                              poster={vid.thumbnail || ''}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedVideo(vid.url); }} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-accent transition-colors"><EyeIcon className="w-5 h-5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDownload(vid.url, `video-${idx}.mp4`); }} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-green-600 transition-colors"><ArrowDownTrayIcon className="w-5 h-5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); openDeleteModal('video', vid.id, null, `فيديو ${vid.audience}`); }} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-600 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                          </div>
                          <div className="p-3 flex justify-between items-center">
                            <p className="text-gray-900 font-bold text-sm truncate">{vid.audience}</p>
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); handleDownload(vid.url, `video-${idx}.mp4`); }} className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-green-100 hover:text-green-600 transition-colors"><ArrowDownTrayIcon className="w-4 h-4" /></button>
                              <button onClick={() => openDeleteModal('video', vid.id, null, `فيديو ${vid.audience}`)} className="p-2 bg-gray-100 rounded-lg text-red-500 hover:bg-red-100 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                )}

                {/* تبويب النصوص */}
                {activeTab === 'copies' && (
                  allCopies.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl">
                      <DocumentTextIcon className="w-20 h-20 text-text-muted mx-auto mb-4 opacity-50" />
                      <p className="text-text-muted text-lg mb-4">لا توجد نصوص إعلانية في هذه الحملة</p>
                      <button
                        onClick={goToSelectPlatforms}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold transition"
                      >
                        توليد نصوص الآن
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(
                        allCopies.reduce((acc, copy) => {
                          const group = copy.audience;
                          if (!acc[group]) acc[group] = [];
                          acc[group].push(copy);
                          return acc;
                        }, {})
                      ).map(([audienceName, texts]) => (
                        <div key={audienceName} className="space-y-4">
                          <div className="flex items-center justify-between border-r-4 border-accent pr-3">
                            <div className="flex items-center gap-2">
                              <UserGroupIcon className="w-6 h-6 text-accent" />
                              <h3 className="text-xl font-black text-white">{audienceName}</h3>
                            </div>
                            <button
                              onClick={() => openDeleteModal('asset', null, texts[0].assetId, `فئة ${audienceName}`)}
                              className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 bg-red-500/10 px-3 py-1 rounded-full transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" /> حذف الفئة
                            </button>
                          </div>
                          <div className="grid gap-5">
                            {texts.map((copy, idx) => {
                              const uniqueId = `copy-${audienceName}-${idx}`;
                              return (
                                <motion.div key={idx} whileHover={{ x: -8 }} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative transition-all">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="bg-accent/10 text-black px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-widest">
                                      {copy.platform || 'منصة عامة'}
                                    </span>
                                    <button 
                                      onClick={() => handleCopy(copy.text, uniqueId)}
                                      className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                        copiedId === uniqueId ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-accent hover:text-white'
                                      }`}
                                    >
                                      {copiedId === uniqueId ? <><CheckCircleIcon className="w-4 h-4" /> تم النسخ</> : <><ClipboardDocumentIcon className="w-4 h-4" /> نسخ النص</>}
                                    </button>
                                  </div>
                                  <p className="text-gray-900 text-lg leading-relaxed whitespace-pre-line font-medium">{copy.text}</p>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* مودال معاينة الصورة */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[100] p-4"
              onClick={() => setSelectedImage(null)}
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                className="relative max-w-5xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}
              >
                <button onClick={() => setSelectedImage(null)} className="absolute -top-16 right-0 p-2 text-white hover:bg-accent rounded-full transition-colors"><XMarkIcon className="w-8 h-8" /></button>
                <img src={selectedImage} className="w-full h-auto max-h-[75vh] object-contain rounded-2xl shadow-2xl" alt="Preview" />
                <button onClick={() => handleDownload(selectedImage, 'campaign-image.png')} className="mt-6 flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-xl font-bold text-base shadow-xl hover:bg-green-700 transition-all active:scale-95">
                  <ArrowDownTrayIcon className="w-5 h-5" /> تحميل الصورة الآن
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* مودال معاينة الفيديو */}
        <AnimatePresence>
          {selectedVideo && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[100] p-4"
              onClick={() => setSelectedVideo(null)}
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                className="relative max-w-5xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}
              >
                <button onClick={() => setSelectedVideo(null)} className="absolute -top-16 right-0 p-2 text-white hover:bg-accent rounded-full transition-colors"><XMarkIcon className="w-8 h-8" /></button>
                <video src={selectedVideo} controls autoPlay className="w-full h-auto max-h-[75vh] rounded-2xl shadow-2xl" />
                <button onClick={() => handleDownload(selectedVideo, 'campaign-video.mp4')} className="mt-6 flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-xl font-bold text-base shadow-xl hover:bg-green-700 transition-all active:scale-95">
                  <ArrowDownTrayIcon className="w-5 h-5" /> تحميل الفيديو الآن
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* مودال تأكيد الحذف الموحد */}
        <AnimatePresence>
          {deleteModal.isOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrashIcon className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">تأكيد الحذف</h3>
                <p className="text-gray-600 mb-6">
                  هل أنت متأكد من حذف {deleteModal.targetName}؟
                  {deleteModal.type === 'campaign' && (
                    <><br /><span className="text-red-500 font-bold">سيتم حذف جميع المحتويات (الفئات، الصور، الفيديوهات، النصوص) المرتبطة بهذه الحملة.</span></>
                  )}
                  {deleteModal.type === 'asset' && (
                    <><br /><span className="text-red-500 font-bold">سيتم حذف جميع النصوص والصور والفيديوهات التابعة لهذه الفئة.</span></>
                  )}
                  <br />
                  هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ isOpen: false, type: null, id: null, assetId: null, targetName: '', loading: false })}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={executeDelete}
                    disabled={deleteModal.loading}
                    className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteModal.loading ? <LoadingSpinner size="sm" /> : 'حذف'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}