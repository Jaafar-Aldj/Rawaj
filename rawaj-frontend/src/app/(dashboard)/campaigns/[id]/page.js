// app/campaigns/[id]/page.tsx (النسخة النهائية)
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import GenerationProgressModal from '@/components/GenerationProgressModal';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MegaphoneIcon, PhotoIcon, VideoCameraIcon, DocumentTextIcon,
  CheckCircleIcon, ArrowRightIcon, CalendarIcon,
  SparklesIcon, ExclamationCircleIcon,
  ArrowDownTrayIcon, EyeIcon, XMarkIcon,
  TrashIcon, PauseCircleIcon, PlayCircleIcon,
  DocumentDuplicateIcon, PencilSquareIcon
} from '@heroicons/react/24/outline';

const durationsConfig = {
  standard: [
    { id: 8, name: '8 ثواني (مشهد 1)' },
    { id: 16, name: '16 ثانية (مشهدين)' },
    { id: 24, name: '24 ثانية (3 مشاهد)' }
  ],
  extended: [
    { id: 15, name: '15 ثانية (تمديد 1)' },
    { id: 22, name: '22 ثانية (تمديد 2)' },
    { id: 29, name: '29 ثانية (تمديد 3)' }
  ]
};

const aspectRatios = [
  { id: '1:1', name: 'مربع 1:1' },
  { id: '16:9', name: 'أفقي 16:9' },
  { id: '9:16', name: 'عمودي 9:16' },
  { id: '4:5', name: 'عمودي 4:5' },
];

const videoRatios = [
  { id: '16:9', name: 'أفقي 16:9' },
  { id: '9:16', name: 'عمودي 9:16' },
];

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params.id;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false); // حالة جديدة للتوجيه التلقائي
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentProgressText, setCurrentProgressText] = useState('');
  
  const [imageModal, setImageModal] = useState({ 
    isOpen: false, assetId: null, ratio: '1:1', eventName: null, eventAngle: null 
  });
  
  const [videoModal, setVideoModal] = useState({ 
    isOpen: false, assetId: null, duration: 8, ratio: '9:16', voice: 'Auto', 
    eventName: null, eventAngle: null, mode: 'standard' 
  });

  const [voices, setVoices] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null); 
  const [playingVoice, setPlayingVoice] = useState(null);

  const [deleteModal, setDeleteModal] = useState({ 
    isOpen: false, type: null, id: null, assetId: null, targetName: '', loading: false 
  });

  const [editModal, setEditModal] = useState({ 
    isOpen: false, type: null, id: null, assetId: null, feedback: '' 
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
    if (isAuthenticated && campaignId) {
      fetchCampaignDetails();
      fetchVoices();
    }
    return () => stopAnyAudio();
  }, [authLoading, isAuthenticated, campaignId]);

  // 🚀 التوجيه التلقائي (الشرطي)
  useEffect(() => {
    if (campaign) {
      if (!campaign.is_strategy_approved) {
        setIsRedirecting(true);
        localStorage.setItem('currentProductId', campaign.product_id);
        localStorage.setItem('campaignId', campaign.id);
        router.push('/analyze-product');
      } else if (!campaign.assets || campaign.assets.length === 0) {
        setIsRedirecting(true);
        localStorage.setItem('campaignId', campaign.id);
        router.push('/select-platforms');
      }
    }
  }, [campaign, router]);

  const fetchCampaignDetails = async () => {
    setLoading(true);
    try {
      const response = await api(`/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('فشل جلب البيانات');
      setCampaign(await response.json());
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const fetchVoices = async () => {
    try {
      const res = await api('/campaigns/options/voices');
      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices || []);
      }
    } catch (err) {}
  };

  const stopAnyAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setPlayingVoice(null);
    }
  };

  const handleVoicePreview = (v) => {
    if (playingVoice === v.name) { stopAnyAudio(); return; }
    stopAnyAudio();
    let audioPath = v.preview_url.replace(/\\/g, '/'); 
    const audioUrl = audioPath.startsWith('http') ? audioPath : `${baseUrl}/${audioPath}`;
    const audio = new Audio(audioUrl);
    audio.onplay = () => { setPlayingVoice(v.name); setCurrentAudio(audio); };
    audio.onended = () => { setPlayingVoice(null); setCurrentAudio(null); };
    audio.play().catch(err => console.error(err));
  };

  const toggleVideoMode = (newMode) => {
    setVideoModal({
      ...videoModal,
      mode: newMode,
      duration: newMode === 'standard' ? 8 : 15,
      ratio: newMode === 'extended' ? '16:9' : videoModal.ratio,
    });
  };

  const handleCopy = (text, id) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }).catch((err) => console.error(err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed"; 
      textArea.style.left = "-9999px"; 
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {}
      document.body.removeChild(textArea);
    }
  };

  const handleGenerateImage = async () => {
    setImageModal({ ...imageModal, isOpen: false });
    setShowProgressModal(true);
    setCurrentProgressText('جاري تحضير الاستوديو...');
    const processId = `image_${imageModal.assetId}`;
    const eventSource = new EventSource(`${baseUrl}/campaigns/stream/${processId}`);
    eventSource.onmessage = (e) => { if (e.data !== '[DONE]') setCurrentProgressText(e.data); };
    try {
      await api('/campaigns/generate_image', {
        method: 'POST',
        body: JSON.stringify({ 
            asset_id: imageModal.assetId, ratio: imageModal.ratio, 
            event_name: imageModal.eventName, event_angle: imageModal.eventAngle 
        })
      });
      eventSource.close();
      setCurrentProgressText('تمت إضافة الصورة بنجاح!');
      await fetchCampaignDetails();
    } catch (err) { eventSource.close(); } 
    finally { setTimeout(() => setShowProgressModal(false), 1500); }
  };

  const handleGenerateVideo = async () => {
    setVideoModal({ ...videoModal, isOpen: false });
    stopAnyAudio();
    setShowProgressModal(true);
    setCurrentProgressText('جاري بناء المشاهد...');
    const processId = `video_${videoModal.assetId}`;
    const eventSource = new EventSource(`${baseUrl}/campaigns/stream/${processId}`);
    eventSource.onmessage = (e) => { if (e.data !== '[DONE]') setCurrentProgressText(e.data); };
    try {
      const endpoint = videoModal.mode === 'extended' ? '/campaigns/generate_extended_video' : '/campaigns/generate_video';
      await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({ 
            asset_id: videoModal.assetId, video_duration: videoModal.duration, 
            aspect_ratio: videoModal.ratio, voice_preference: videoModal.voice,
            event_name: videoModal.eventName, event_angle: videoModal.eventAngle 
        })
      });
      eventSource.close();
      setCurrentProgressText('تم إخراج الفيديو بنجاح!');
      await fetchCampaignDetails();
    } catch (err) { eventSource.close(); } 
    finally { setTimeout(() => setShowProgressModal(false), 1500); }
  };

  const openDeleteModal = (type, id, assetId, targetName) => {
    setDeleteModal({ isOpen: true, type, id, assetId, targetName, loading: false });
  };

  const executeDelete = async () => {
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      const { type, id, assetId } = deleteModal;
      if (type === 'campaign') {
        await api(`/campaigns/${campaignId}`, { method: 'DELETE' });
        router.push('/camp');
      } else if (type === 'asset') {
        await api(`/campaigns/${campaignId}/assets/${assetId}`, { method: 'DELETE' });
        await fetchCampaignDetails();
      } else if (type === 'image') {
        await api(`/campaigns/images/${id}`, { method: 'DELETE' });
        await fetchCampaignDetails();
      } else if (type === 'video') {
        await api(`/campaigns/videos/${id}`, { method: 'DELETE' });
        await fetchCampaignDetails();
      }
      setDeleteModal(prev => ({ ...prev, isOpen: false, loading: false }));
    } catch (err) {
      console.error(err);
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const submitEdit = async () => {
    const { type, id, assetId, feedback } = editModal;
    setEditModal({ ...editModal, isOpen: false });
    setShowProgressModal(true);
    setCurrentProgressText('جاري مراجعة طلب التعديل...');
    let endpoint = type === 'image' ? '/campaigns/edit/image' : '/campaigns/edit/video';
    let body = type === 'image' ? { image_id: id, asset_id: assetId, feedback } : { video_id: id, feedback };
    const processId = `edit_${type}_${id}`;
    const eventSource = new EventSource(`${baseUrl}/campaigns/stream/${processId}`);
    eventSource.onmessage = (e) => { if (e.data !== '[DONE]') setCurrentProgressText(e.data); };
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
      eventSource.close();
      setCurrentProgressText('تم تطبيق التعديلات بنجاح!');
      await fetchCampaignDetails();
    } catch (err) { eventSource.close(); } 
    finally { setTimeout(() => setShowProgressModal(false), 1500); }
  };

  // إظهار اللودينغ أثناء التحميل أو أثناء التوجيه التلقائي
  if (authLoading || loading || isRedirecting) return <LoadingSpinner />;

  const assets = campaign?.assets || [];
  const allImages = assets.flatMap(a => (a.images || []).map(img => ({ ...img, audience: a.target_audience, assetId: a.id })));
  const allVideos = assets.flatMap(a => (a.videos || []).map(vid => ({ ...vid, audience: a.target_audience, assetId: a.id })));

  return (
    <>
      <GenerationProgressModal isOpen={showProgressModal} currentStatus={currentProgressText} />

      <div className="min-h-screen bg-gray-900 p-6 text-right" dir="rtl">
        <div className="max-w-7xl mx-auto">
          
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => router.push('/camp')} 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-4 py-2 rounded-xl border border-white/20 transition-all"
            >
              <ArrowRightIcon className="w-4 h-4" /> قائمة الحملات
            </button>
            <button 
              onClick={() => openDeleteModal('campaign', null, null, campaign?.name)} 
              className="flex items-center gap-2 text-red-400 hover:text-red-500 transition-all font-bold text-sm px-4 py-2 rounded-xl border border-red-500/30 hover:bg-red-500/10"
            >
              <TrashIcon className="w-4 h-4" /> حذف الحملة
            </button>
          </div>

          {/* Campaign Header Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-green-500 to-emerald-500"></div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-2xl border border-green-100">
                  <MegaphoneIcon className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-1 tracking-tight">{campaign?.name || 'حملة ذكية'}</h1>
                  <div className="flex gap-2 items-center">
                    <span className="bg-green-100 text-green-700 px-3 py-0.5 rounded-full border border-green-200 font-black text-[9px] uppercase tracking-widest">
                      {campaign?.status}
                    </span>
                    <span className="text-gray-400 text-m font-bold flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" /> {campaign?.created_at ? new Date(campaign.created_at).toLocaleDateString('ar-EG') : ''}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex gap-3">
                  <div className="bg-gray-50 p-2 px-4 rounded-2xl border border-gray-100 text-center min-w-[80px]">
                      <p className="text-xl font-black text-gray-800">{assets.length}</p>
                      <p className="text-[9px] text-gray-500 font-bold">فئات</p>
                  </div>
                  <div className="bg-gray-50 p-2 px-4 rounded-2xl border border-gray-100 text-center min-w-[80px]">
                      <p className="text-xl font-black text-emerald-600">{allImages.length}</p>
                      <p className="text-[9px] text-gray-500 font-bold">صور</p>
                  </div>
                  <div className="bg-gray-50 p-2 px-4 rounded-2xl border border-gray-100 text-center min-w-[80px]">
                      <p className="text-xl font-black text-blue-600">{allVideos.length}</p>
                      <p className="text-[9px] text-gray-500 font-bold">فيديو</p>
                  </div>
              </div>
            </div>
          </div>

          {/* Strategic Goal */}
          <div className="bg-white border border-gray-100 border-r-4 border-r-green-500 p-4 rounded-xl shadow-sm mb-8">
             <h3 className="text-green-700 font-black mb-1 flex items-center gap-1 text-lg"><EyeIcon className="w-4 h-4"/> الهدف الإستراتيجي</h3>
             <p className="text-gray-700 text-m font-medium leading-relaxed">"{campaign?.objective || 'توليد محتوى إبداعي مخصص.'}"</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="flex gap-9 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-m w-fit">
              {[
                { id: 'overview', label: 'الاستراتيجية والإنتاج', icon: SparklesIcon },
                { id: 'images', label: 'معرض الصور', icon: PhotoIcon },
                { id: 'videos', label: 'معرض الفيديو', icon: VideoCameraIcon },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs transition-all ${activeTab === tab.id ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-8">
                    {assets.map((asset) => (
                      <div key={asset.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-md relative group transition-all hover:shadow-lg">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 gap-4 border-b border-gray-100 pb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                               <h4 className="text-xl font-black text-gray-800">{asset.target_audience}</h4>
                            </div>
                            <div className="flex gap-3">
                               <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">الصور: {asset.images?.length || 0}</span>
                               <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">الفيديوهات: {asset.videos?.length || 0}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <button 
                              onClick={() => setImageModal({ ...imageModal, isOpen: true, assetId: asset.id })}
                              className="group flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-black text-xs transition-all hover:bg-green-600 shadow-md"
                            >
                              <PhotoIcon className="w-4 h-4 group-hover:rotate-12 transition-transform"/> توليد صورة
                            </button>
                            <button 
                              onClick={() => setVideoModal({ ...videoModal, isOpen: true, assetId: asset.id })}
                              className="group flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-black text-xs transition-all hover:bg-green-700 shadow-md"
                            >
                              <VideoCameraIcon className="w-4 h-4 group-hover:scale-110 transition-transform"/> إنتاج فيديو
                            </button>
                          </div>
                        </div>

                        {/* Media previews */}
                        {(asset.images?.length > 0 || asset.videos?.length > 0) && (
                          <div className="mb-6 mt-1">
                            <h5 className="text-gray-600 font-black text-lg uppercase tracking-wider mb-3 flex items-center gap-2">
                              <PhotoIcon className="w-4 h-4 text-green-500"/> محتوى الحملة
                            </h5>
                            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                              {asset.images.slice(0, 4).map((img) => (
                                <div key={img.id} className="flex-none w-36 h-36 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer hover:scale-105 transition-transform shadow-md relative group/image">
                                  <img src={img.image_url} className="w-full h-full object-cover" alt="" />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-all flex items-center justify-center gap-2">
                                    <button onClick={() => setSelectedImage(img.image_url)} className="p-1.5 bg-green-600 hover:bg-green-700 rounded-full text-white"><EyeIcon className="w-4 h-4"/></button>
                                    <button onClick={() => window.open(img.image_url)} className="p-1.5 bg-green-600 hover:bg-green-700 rounded-full text-white"><ArrowDownTrayIcon className="w-4 h-4"/></button>
                                    <button onClick={() => setEditModal({ isOpen: true, type: 'image', id: img.id, assetId: asset.id, feedback: '' })} className="p-1.5 bg-green-600 hover:bg-green-700 rounded-full text-white"><PencilSquareIcon className="w-4 h-4"/></button>
                                  </div>
                                </div>
                              ))}
                              {asset.videos.map((vid) => (
                                <div key={vid.id} className="flex-none w-36 h-36 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer relative group/video shadow-md">
                                  <video src={vid.video_url} className="w-full h-full object-cover" muted />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/video:opacity-100 transition-all flex items-center justify-center gap-2">
                                    <button onClick={() => setSelectedVideo(vid.video_url)} className="p-1.5 bg-green-600 hover:bg-green-700 rounded-full text-white"><PlayCircleIcon className="w-4 h-4"/></button>
                                    <button onClick={() => window.open(vid.video_url)} className="p-1.5 bg-green-600 hover:bg-green-700 rounded-full text-white"><ArrowDownTrayIcon className="w-4 h-4"/></button>
                                    <button onClick={() => setEditModal({ isOpen: true, type: 'video', id: vid.id, assetId: asset.id, feedback: '' })} className="p-1.5 bg-green-600 hover:bg-green-700 rounded-full text-white"><PencilSquareIcon className="w-4 h-4"/></button>
                                  </div>
                                </div>
                              ))}
                              {(asset.images.length > 4 || asset.videos.length > 1) && (
                                <div className="flex-none w-36 h-36 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold cursor-pointer hover:bg-gray-200 transition-colors shadow-md" onClick={() => setActiveTab(asset.images.length > 0 ? 'images' : 'videos')}>
                                  +{Math.max(asset.images.length - 4, 0) + Math.max(asset.videos.length - 1, 0)} أخرى
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Ad Copies */}
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <h5 className="text-gray-600 font-black text-lg uppercase tracking-wider flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4 text-green-500"/> النصوص الاعلانية للحملة
                              </h5>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {asset.ad_copy?.map((copy, i) => {
                                const text = copy.ad_copy || copy.text || '';
                                const platform = copy.platform || 'عام';
                                const uid = `${asset.id}-${i}`;
                                return (
                                  <div key={i} className="bg-gray-50 border border-gray-100 p-4 rounded-xl relative hover:border-gray-200 transition-colors shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-[11px] font-black text-green-700 uppercase tracking-widest bg-green-100 px-2 py-1 rounded-lg border border-green-200">{platform}</span>
                                      <button 
                                        onClick={() => handleCopy(text, uid)} 
                                        className={`p-1.5 rounded-lg transition-all ${copiedId === uid ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:text-gray-900'}`}
                                      >
                                        {copiedId === uid ? <CheckCircleIcon className="w-4 h-4"/> : <DocumentDuplicateIcon className="w-4 h-4"/>}
                                      </button>
                                    </div>
                                    <p className="text-gray-700 text-xs leading-relaxed font-medium">{text}</p>
                                  </div>
                                );
                              })}
                           </div>
                        </div>

                        <button onClick={() => openDeleteModal('asset', null, asset.id, asset.target_audience)} className="absolute bottom-4 left-4 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                           <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Gallery */}
              {activeTab === 'images' && (
                allImages.length === 0 ? 
                <div className="text-center py-20 bg-white border-2 border-dashed border-gray-200 rounded-2xl shadow-sm">
                  <PhotoIcon className="w-16 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-black text-sm mb-4">لا توجد صور في المعرض حالياً</p>
                </div> : 
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {allImages.map((img) => (
                    <div key={img.id} className="group relative bg-white rounded-xl border border-gray-100 overflow-hidden aspect-square shadow-md hover:shadow-xl transition-all">
                      <img src={img.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                         <div className="flex gap-3">
                            <button onClick={() => setSelectedImage(img.image_url)} className="p-2 bg-green-600 hover:bg-green-700 rounded-full text-white transition-all"><EyeIcon className="w-6 h-6"/></button>
                            <button onClick={() => window.open(img.image_url)} className="p-2 bg-green-600 hover:bg-green-700 rounded-full text-white transition-all"><ArrowDownTrayIcon className="w-6 h-6"/></button>
                            <button onClick={() => setEditModal({ isOpen: true, type: 'image', id: img.id, assetId: img.assetId, feedback: '' })} className="p-2 bg-green-600 hover:bg-green-700 rounded-full text-white transition-all shadow-lg"><PencilSquareIcon className="w-6 h-6"/></button>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Video Gallery */}
              {activeTab === 'videos' && (
                allVideos.length === 0 ? 
                <div className="text-center py-20 bg-white border-2 border-dashed border-gray-200 rounded-2xl shadow-sm">
                  <VideoCameraIcon className="w-16 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-black text-sm mb-4">المعرض السينمائي فارغ حالياً</p>
                </div> :
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allVideos.map((vid) => (
                    <div key={vid.id} className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-md hover:shadow-lg transition-all">
                      <div className="relative aspect-video bg-gray-900">
                        <video src={vid.url} className="w-full h-full object-cover" muted loop />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                           <button onClick={() => setSelectedVideo(vid.url)} className="p-2 bg-green-600 hover:bg-green-700 rounded-full text-white shadow-md transition-all"><PlayCircleIcon className="w-7 h-7"/></button>
                           <button onClick={() => window.open(vid.url)} className="p-2 bg-green-600 hover:bg-green-700 rounded-full text-white shadow-md transition-all"><ArrowDownTrayIcon className="w-7 h-7"/></button>
                           <button onClick={() => setEditModal({ isOpen: true, type: 'video', id: vid.id, assetId: vid.assetId, feedback: '' })} className="p-2 bg-green-600 hover:bg-green-700 rounded-full text-white shadow-lg"><PencilSquareIcon className="w-7 h-7"/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Image Modal */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 p-2 rounded-xl">
                    <PhotoIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-800">AI IMAGE STUDIO</h3>
                </div>
                <button onClick={() => setImageModal({ ...imageModal, isOpen: false })} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-8">
              <div>
                <p className="text-gray-500 text-[17px] font-black uppercase tracking-wider mb-3">1. مقاس الصورة</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {aspectRatios.map((r) => (
                    <button key={r.id} onClick={() => setImageModal({ ...imageModal, ratio: r.id })} className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all text-center ${imageModal.ratio === r.id ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
              {campaign?.trending_events?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-[17px] font-black uppercase tracking-wider mb-3">2. ربط المناسبة</p>
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                    <button onClick={() => setImageModal({ ...imageModal, eventName: null, eventAngle: null })} className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${!imageModal.eventName ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                      <p className="font-black text-md text-gray-800">إعلان عام (تصميم أساسي)</p>
                      <p className="text-[11px] text-gray-500 mt-1">بدون ربط بمناسبة محددة</p>
                    </button>
                    {campaign.trending_events.map((ev, i) => (
                      <button key={i} onClick={() => setImageModal({ ...imageModal, eventName: ev.event, eventAngle: ev.angle })} className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${imageModal.eventName === ev.event ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                        <p className="font-black text-md text-gray-800 mb-1">{ev.event}</p>
                        <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">{ev.angle}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button onClick={() => setImageModal({ ...imageModal, isOpen: false })} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">إلغاء</button>
                <button onClick={handleGenerateImage} className="flex-1 py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-md flex items-center justify-center gap-2">
                  <SparklesIcon className="w-5 h-5" /> توليد الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {videoModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-green-50 p-2 rounded-xl">
                    <VideoCameraIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-800">AI VIDEO STUDIO</h3>
                </div>
                <button onClick={() => { stopAnyAudio(); setVideoModal({ ...videoModal, isOpen: false }); }} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-8">
              <div>
                <p className="text-gray-500 text-[17px] font-black uppercase tracking-wider mb-3">1. نمط الإخراج</p>
                <div className="flex gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                  <button onClick={() => toggleVideoMode('standard')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${videoModal.mode === 'standard' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>مشاهد متنوعة</button>
                  <button onClick={() => toggleVideoMode('extended')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${videoModal.mode === 'extended' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>لقطة ممتدة</button>
                </div>
              </div>
              <motion.div layout>
                <p className="text-gray-500 text-[17px] font-black uppercase tracking-wider mb-3">2. مدة الفيديو</p>
                <div className="grid grid-cols-1 gap-2">
                  {durationsConfig[videoModal.mode].map(d => (
                    <button key={d.id} onClick={() => setVideoModal({...videoModal, duration: d.id})} className={`w-full text-right p-4 rounded-2xl border-2 transition-all flex justify-between items-center ${videoModal.duration === d.id ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>
                      <span className="font-bold text-sm">{d.name}</span>
                      {videoModal.duration === d.id && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                    </button>
                  ))}
                </div>
              </motion.div>
              {videoModal.mode === 'standard' && (
                <div>
                  <p className="text-gray-500 text-[17px] font-black uppercase tracking-wider mb-3">3. مقاس الفيديو</p>
                  <div className="flex gap-3">
                    {videoRatios.map(r => (
                      <button key={r.id} onClick={() => setVideoModal({...videoModal, ratio: r.id})} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all text-center ${videoModal.ratio === r.id ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {videoModal.mode === 'extended' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-xs font-bold">
                  ⚠️ اللقطة الممتدة تدعم المقاس الأفقي (16:9) فقط.
                </div>
              )}
              <div>
                <p className="text-gray-500 text-[17px] font-black uppercase tracking-wider mb-3">4. نبرة المعلق الصوتي</p>
                <div className="max-h-[240px] overflow-y-auto border border-gray-200 rounded-2xl p-2 custom-scrollbar">
                  <button onClick={() => setVideoModal({...videoModal, voice: 'Auto'})} className={`w-full text-right p-3 rounded-xl text-sm font-bold transition-all mb-1 ${videoModal.voice === 'Auto' ? 'bg-green-50 text-green-700 border border-green-200' : 'text-gray-600 hover:bg-gray-50'}`}>🤖 اختيار ذكي (تلقائي)</button>
                  {voices.map((v) => (
                    <div key={v.name} className={`flex items-center justify-between p-2 rounded-xl transition-all ${videoModal.voice === v.name ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                      <div onClick={() => setVideoModal({...videoModal, voice: v.name})} className="cursor-pointer flex-1 text-sm font-bold text-gray-700">{v.name}</div>
                      {v.preview_url && (
                        <button onClick={() => handleVoicePreview(v)} className={`p-1.5 rounded-lg transition-all ${playingVoice === v.name ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {playingVoice === v.name ? <PauseCircleIcon className="w-5 h-5" /> : <PlayCircleIcon className="w-5 h-5" />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {campaign?.trending_events?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-[17px] font-black uppercase tracking-wider mb-3">5. ربط المناسبة</p>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                    <button onClick={() => setVideoModal({...videoModal, eventName: null, eventAngle: null})} className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${!videoModal.eventName ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>
                      <p className="font-black text-md">إعلان عام (تصميم دائم)</p>
                      <p className="text-[11px] text-gray-500 mt-1">بدون ربط بمناسبة محددة</p>
                    </button>
                    {campaign.trending_events.map((ev, i) => (
                      <button key={i} onClick={() => setVideoModal({...videoModal, eventName: ev.event, eventAngle: ev.angle})} className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${videoModal.eventName === ev.event ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                        <p className="font-black text-md text-gray-800 mb-1">{ev.event}</p>
                        <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">{ev.angle}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button onClick={() => { stopAnyAudio(); setVideoModal({ ...videoModal, isOpen: false }); }} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">إلغاء</button>
                <button onClick={handleGenerateVideo} className="flex-1 py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-md flex items-center justify-center gap-2">
                  <SparklesIcon className="w-5 h-5" /> بدء الإنتاج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              {editModal.type === 'image' ? <PhotoIcon className="w-8 h-8 text-green-500" /> : <VideoCameraIcon className="w-8 h-8 text-green-500" />}
              <h3 className="text-2xl font-black text-white">تعديل {editModal.type === 'image' ? 'الصورة' : 'الفيديو'}</h3>
            </div>
            <p className="text-gray-400 text-sm mb-8">أخبر المخرج الفني بما تريد تعديله.</p>
            <textarea 
              value={editModal.feedback} 
              onChange={(e) => setEditModal({ ...editModal, feedback: e.target.value })} 
              placeholder="اكتب ملاحظاتك بدقة..." 
              rows="4" 
              className="w-full bg-black border border-gray-700 text-white rounded-2xl p-5 outline-none mb-8 focus:border-green-500 transition-all" 
            />
            <div className="flex flex-row gap-4">
              <button onClick={() => setEditModal({ ...editModal, isOpen: false })} className="flex-1 py-4 bg-gray-800 text-gray-500 rounded-2xl font-bold hover:text-white transition-all">إلغاء</button>
              <button onClick={submitEdit} className="flex-1 py-4 bg-green-600 rounded-2xl font-black text-white shadow-lg hover:bg-green-700">إرسال الملاحظات</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modals */}
      {selectedImage && <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}><img src={selectedImage} className="max-w-full max-h-[90vh] rounded-xl" /><XMarkIcon className="absolute top-4 left-4 w-8 h-8 text-white/50 hover:text-white cursor-pointer" /></div>}
      {selectedVideo && <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}><video src={selectedVideo} controls autoPlay className="max-w-full max-h-[90vh] rounded-xl" /><XMarkIcon className="absolute top-4 left-4 w-8 h-8 text-white/50 hover:text-white cursor-pointer" /></div>}
      
      {/* Delete confirmation modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><ExclamationCircleIcon className="w-7 h-7 text-red-600" /></div>
            <h3 className="text-xl font-black text-gray-800 mb-1">تأكيد الحذف</h3>
            <p className="text-gray-500 text-sm mb-5">هل أنت متأكد من حذف "{deleteModal.targetName}"؟</p>
            <div className="flex gap-3"><button onClick={() => setDeleteModal({...deleteModal, isOpen: false})} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-black text-sm">تراجع</button><button onClick={executeDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-black text-sm">نعم، احذف</button></div>
          </div>
        </div>
      )}
    </>
  );
}