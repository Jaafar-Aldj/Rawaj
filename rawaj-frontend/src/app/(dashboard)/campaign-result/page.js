'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import GenerationProgressModal from '@/components/GenerationProgressModal';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentDuplicateIcon,
  PhotoIcon,
  VideoCameraIcon,
  ArrowDownTrayIcon,
  UsersIcon,
  EyeIcon,
  SparklesIcon,
  XMarkIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  CalendarIcon,
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

// استخدام نفس خيارات الملف الأول (مربع، أفقي، عمودي) لتطابق الصورة
const aspectRatios = [
  { id: '1:1', name: 'مربع 1:1' },
  { id: '16:9', name: 'أفقي 16:9' },
  { id: '9:16', name: 'عمودي 9:16' },
];

const videoRatios = [
  { id: '16:9', name: 'أفقي 16:9' },
  { id: '9:16', name: 'عمودي 9:16' },
];

export default function CampaignResultPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState(null);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null); 
  const [playingVoice, setPlayingVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentProgressText, setCurrentProgressText] = useState('');

  const [imageModal, setImageModal] = useState({ isOpen: false, assetId: null, ratio: '1:1', eventName: null, eventAngle: null });
  const [videoModal, setVideoModal] = useState({ 
    isOpen: false, assetId: null, duration: 8, ratio: '9:16', voice: 'Auto', 
    eventName: null, eventAngle: null, mode: 'standard' 
  });
  
  const [editModal, setEditModal] = useState({ isOpen: false, type: null, id: null, assetId: null, platform: null, feedback: '' });

  const campaignId = typeof window !== 'undefined' ? localStorage.getItem('campaignId') : null;

  const fetchCampaignData = async () => {
    if (!campaignId) { setError('معرف الحملة غير موجود'); setLoading(false); return; }
    try {
      const response = await api(`/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('فشل في تحميل بيانات الحملة');
      setCampaignData(await response.json());
    } catch (err) { setError(err.message); } 
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
    else if (isAuthenticated) { fetchCampaignData(); fetchVoices(); }
    return () => stopAnyAudio();
  }, [authLoading, isAuthenticated]);

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
      ratio: newMode === 'extended' ? '16:9' : videoModal.ratio
    });
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
        body: JSON.stringify({ asset_id: imageModal.assetId, aspect_ratio: imageModal.ratio, event_name: imageModal.eventName, event_angle: imageModal.eventAngle })
      });
      eventSource.close();
      setCurrentProgressText('تمت إضافة الصورة بنجاح!');
      await fetchCampaignData();
    } catch (err) { eventSource.close(); } 
    finally { setTimeout(() => setShowProgressModal(false), 1500); }
  };

  const handleGenerateVideo = async () => {
    setVideoModal({ ...videoModal, isOpen: false });
    stopAnyAudio();
    setShowProgressModal(true);
    setCurrentProgressText('جاري تجهيز المشاهد...');
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
      await fetchCampaignData();
    } catch (err) { eventSource.close(); } 
    finally { setTimeout(() => setShowProgressModal(false), 1500); }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
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
    } catch (err) {}
  };

  const submitEdit = async () => {
    const { type, id, assetId, platform, feedback } = editModal;
    setEditModal({ ...editModal, isOpen: false });
    setShowProgressModal(true);
    setCurrentProgressText('جاري مراجعة طلب التعديل...');
    let endpoint = type === 'text' ? '/campaigns/edit/text' : type === 'image' ? '/campaigns/edit/image' : '/campaigns/edit/video';
    let body = type === 'text' ? { asset_id: assetId, feedback } : type === 'image' ? { image_id: id, asset_id: assetId, platform: platform || 'Instagram', feedback } : { video_id: id, feedback };
    const processId = `edit_${type}_${assetId}`;
    const eventSource = new EventSource(`${baseUrl}/campaigns/stream/${processId}`);
    eventSource.onmessage = (e) => { if (e.data !== '[DONE]') setCurrentProgressText(e.data); };
    try {
      await api(endpoint, { method: type === 'text' ? 'PUT' : 'POST', body: JSON.stringify(body) });
      eventSource.close();
      setCurrentProgressText('تم تطبيق التعديلات بنجاح!');
      await fetchCampaignData();
    } catch (err) { eventSource.close(); } 
    finally { setTimeout(() => setShowProgressModal(false), 1500); }
  };

  const getEditModalConfig = () => {
    switch (editModal.type) {
      case 'text': return { icon: DocumentTextIcon, title: 'تعديل النصوص', desc: 'أخبر كاتب المحتوى بما تريد تغييره.', color: 'text-green-600', bg: 'bg-green-600', hoverBg: 'hover:bg-green-700' };
      case 'image': return { icon: PhotoIcon, title: 'تعديل الصورة', desc: 'أخبر المخرج الفني بما تريد تعديله.', color: 'text-green-600', bg: 'bg-green-600', hoverBg: 'hover:bg-green-700' };
      case 'video': return { icon: VideoCameraIcon, title: 'تعديل الفيديو', desc: 'أخبر مخرج الفيديو بما تريد تغييره.', color: 'text-green-600', bg: 'bg-green-600', hoverBg: 'hover:bg-green-700' };
      default: return { icon: PencilSquareIcon, title: 'تعديل', desc: '', color: 'text-white', bg: 'bg-gray-600', hoverBg: '' };
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;
  if (!campaignData) return null;

  const assets = campaignData.assets || [];
  const editConfig = getEditModalConfig();

  return (
    <>
      <GenerationProgressModal isOpen={showProgressModal} currentStatus={currentProgressText} />

      <div className="min-h-screen bg-gray-900 p-6 text-right" dir="rtl">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          
          {/* شريط الخطوات - أبيض */}
          <div className="flex items-center justify-between bg-white p-5 rounded-3xl shadow-lg border border-gray-100">
            {[
              { id: 1, name: 'رفع الصورة', status: 'done' },
              { id: 2, name: 'بيانات المنتج', status: 'done' },
              { id: 3, name: 'تحليل الجمهور', status: 'done' },
              { id: 4, name: 'تحديد الاستراتيجية', status: 'done' },
              { id: 5, name: 'توليد الوسائط', status: 'active' }
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
                    step.id < 5 ? 'bg-green-100' : 'bg-gray-100'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* بطاقة الترحيب */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-lg">
            <h2 className="text-2xl font-black text-gray-800 flex items-center justify-center gap-3">
             اختر الفئة المستهدفة وابدأ بتوليد الصور والفيديوهات والنصوص الإبداعية
            </h2>
          </div>

          {assets.map((asset) => {
            const images = asset.images || [];
            const videos = asset.videos || [];
            const copies = asset.ad_copy || [];

            return (
              <div key={asset.id} className="bg-white rounded-[2.5rem] border border-gray-200 p-8 shadow-2xl space-y-10">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 pb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 rounded-2xl border border-gray-200"><UsersIcon className="w-7 h-7 text-gray-700" /></div>
                    <h3 className="text-2xl font-black text-gray-800">{asset.target_audience}</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setImageModal({ ...imageModal, isOpen: true, assetId: asset.id })} className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-black transition-all shadow-md active:scale-95">
                      <PhotoIcon className="w-5 h-5" /> توليد صورة
                    </button>
                    <button onClick={() => setVideoModal({ ...videoModal, isOpen: true, assetId: asset.id })} className="bg-green-600 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-green-700 transition-all shadow-md active:scale-95">
                      <VideoCameraIcon className="w-5 h-5" /> إنتاج فيديو
                    </button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
                  
                  <div className="flex-1 space-y-6">
                    {images.length === 0 && videos.length === 0 ? (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-16 text-center flex flex-col items-center justify-center h-[320px]">
                        <PhotoIcon className="w-16 h-16 text-gray-400 mb-4 opacity-50" />
                        <p className="text-gray-500 text-sm font-bold">لم يتم إنتاج وسائط لهذه الفئة بعد.</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {images.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                              {images.map((img, i) => (
                                <div key={img.id} className="flex-none w-[220px] sm:w-[280px] h-[220px] sm:h-[280px] snap-start group relative bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden shadow-md">
                                  <img src={img.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt=""/>
                                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                    <button onClick={() => setPreviewImage(img.image_url)} className="p-2 sm:p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all">
                                      <EyeIcon className="w-6 h-6 sm:w-7 sm:h-7"/>
                                    </button>
                                    <button onClick={() => downloadFile(img.image_url, `image-${i}.png`)} className="p-2 sm:p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all">
                                      <ArrowDownTrayIcon className="w-6 h-6 sm:w-7 sm:h-7"/>
                                    </button>
                                    <button 
                                      onClick={() => setEditModal({ isOpen: true, type: 'image', id: img.id, assetId: asset.id, platform: img.platform, feedback: '' })} 
                                      className="p-2 sm:p-3 bg-green-600 hover:bg-green-700 rounded-full text-white transition-all shadow-lg"
                                    >
                                      <PencilSquareIcon className="w-6 h-6 sm:w-7 sm:h-7"/>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {videos.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                              {videos.map((vid, i) => (
                                <div key={vid.id} className="flex-none w-[220px] sm:w-[280px] h-[220px] sm:h-[280px] snap-start group relative bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden shadow-md">
                                  <video 
                                    src={vid.video_url} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                    muted 
                                    loop 
                                    controls
                                  />
                                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                    <button onClick={() => setPreviewVideo(vid.video_url)} className="p-2 sm:p-3 bg-white/20 hover:bg-green-600 rounded-full text-white transition-all">
                                      <PlayCircleIcon className="w-6 h-6 sm:w-7 sm:h-7"/>
                                    </button>
                                    <button onClick={() => downloadFile(vid.video_url, `video-${i}.mp4`)} className="p-2 sm:p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all">
                                      <ArrowDownTrayIcon className="w-6 h-6 sm:w-7 sm:h-7"/>
                                    </button>
                                    <button 
                                      onClick={() => setEditModal({ isOpen: true, type: 'video', id: vid.id, assetId: asset.id, platform: null, feedback: '' })} 
                                      className="p-2 sm:p-3 bg-green-600 hover:bg-green-700 rounded-full text-white transition-all shadow-lg"
                                    >
                                      <PencilSquareIcon className="w-6 h-6 sm:w-7 sm:h-7"/>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-center">
                      <button 
                        onClick={() => setEditModal({ isOpen: true, type: 'text', id: null, assetId: asset.id, platform: null, feedback: '' })} 
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        تحسين النصوص
                      </button>
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-3 custom-scrollbar">
                      {copies.map((copy, copyIndex) => {
                        const text = typeof copy === 'string' ? copy : (copy.ad_copy || copy.text || '');
                        const platform = copy.platform || 'عام';
                        const uid = `${asset.id}-${copyIndex}`;
                        return (
                          <div key={uid} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 hover:border-gray-300 transition-colors shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                              <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-lg border border-green-200 uppercase tracking-widest">{platform}</span>
                              <button onClick={() => handleCopy(text, uid)} className={`p-2 rounded-xl transition-all ${copiedIndex === uid ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:text-gray-900'}`}>
                                {copiedIndex === uid ? <CheckCircleIcon className="w-5 h-5" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
                              </button>
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed font-medium">{text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- مودال الصورة - بنفس تنسيق الملف الأول (أبيض) ---------- */}
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
                <div className="grid grid-cols-3 gap-3">
                  {aspectRatios.map((r) => (
                    <button key={r.id} onClick={() => setImageModal({ ...imageModal, ratio: r.id })} className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all text-center ${imageModal.ratio === r.id ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
              {campaignData?.trending_events?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-[17px] font-black uppercase tracking-wider mb-3">2. ربط المناسبة</p>
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                    <button onClick={() => setImageModal({ ...imageModal, eventName: null, eventAngle: null })} className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${!imageModal.eventName ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                      <p className="font-black text-md text-gray-800">إعلان عام (تصميم أساسي)</p>
                      <p className="text-[15px] text-gray-500 mt-1">بدون ربط بمناسبة محددة</p>
                    </button>
                    {campaignData.trending_events.map((ev, i) => (
                      <button key={i} onClick={() => setImageModal({ ...imageModal, eventName: ev.event, eventAngle: ev.angle })} className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${imageModal.eventName === ev.event ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                        <p className="font-black text-md text-gray-800 mb-1">{ev.event}</p>
                        <p className="text-[15px] text-gray-600 leading-relaxed line-clamp-2">{ev.angle}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button onClick={() => setImageModal({ ...imageModal, isOpen: false })} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">إلغاء</button>
                <button onClick={handleGenerateImage} className="flex-1 py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-md flex items-center justify-center gap-2">
                 توليد الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- مودال الفيديو - بنفس تنسيق الملف الأول (أبيض) ---------- */}
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
              {/* 1. نمط الإخراج */}
              <div>
                <p className="text-gray-500 text-[17px] font-black uppercase tracking-wider mb-3">1. نمط الإخراج</p>
                <div className="flex gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                  <button onClick={() => toggleVideoMode('standard')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${videoModal.mode === 'standard' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>مشاهد متنوعة</button>
                  <button onClick={() => toggleVideoMode('extended')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${videoModal.mode === 'extended' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>لقطة ممتدة</button>
                </div>
              </div>
              {/* 2. المدة */}
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
              {/* 3. نسبة الأبعاد */}
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
              {/* 4. الصوت */}
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
              {/* 5. ربط المناسبة */}
              {campaignData?.trending_events?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-[17px] font-black uppercase tracking-wider mb-3">5. ربط المناسبة</p>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                    <button onClick={() => setVideoModal({...videoModal, eventName: null, eventAngle: null})} className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${!videoModal.eventName ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>
                      <p className="font-black text-md text-gray-800 mb-1">إعلان عام (تصميم دائم)</p>
                      <p className="text-[15px] text-gray-500 mt-1">بدون ربط بمناسبة محددة</p>
                    </button>
                    {campaignData.trending_events.map((ev, i) => (
                      <button key={i} onClick={() => setVideoModal({...videoModal, eventName: ev.event, eventAngle: ev.angle})} className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${videoModal.eventName === ev.event ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                        <p className="font-black text-md text-gray-800 mb-1">{ev.event}</p>
                        <p className="text-[15px] text-gray-600 leading-relaxed line-clamp-2">{ev.angle}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button onClick={() => { stopAnyAudio(); setVideoModal({ ...videoModal, isOpen: false }); }} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">إلغاء</button>
                <button onClick={handleGenerateVideo} className="flex-1 py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-700 shadow-md flex items-center justify-center gap-2">
                   بدء الإنتاج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-w-full max-h-[90vh] rounded-[2rem] shadow-2xl" /><XMarkIcon className="absolute top-8 right-8 w-12 h-12 text-white/50 cursor-pointer" /></div>}
      {previewVideo && <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewVideo(null)}><video src={previewVideo} controls autoPlay className="max-w-full max-h-[90vh] rounded-[2rem] shadow-2xl" /><XMarkIcon className="absolute top-8 right-8 w-12 h-12 text-white/50 cursor-pointer" /></div>}

      {/* مودال التعديل - أيضاً تم تنسيقه بنفس الطريقة البيضاء */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <editConfig.icon className={`w-8 h-8 ${editConfig.color}`} />
              <h3 className="text-2xl font-black text-gray-800">{editConfig.title}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6">{editConfig.desc}</p>
            <textarea 
              value={editModal.feedback} 
              onChange={(e) => setEditModal({ ...editModal, feedback: e.target.value })} 
              placeholder="اكتب ملاحظاتك بدقة..." 
              rows="4" 
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl p-5 outline-none mb-8 focus:border-green-500 transition-all" 
            />
            <div className="flex flex-row gap-4">
              <button onClick={() => setEditModal({ ...editModal, isOpen: false })} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:text-gray-800 transition-all">إلغاء</button>
              <button onClick={submitEdit} className={`flex-1 py-4 rounded-2xl font-black text-white shadow-lg ${editConfig.bg} ${editConfig.hoverBg}`}>إرسال الملاحظات</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}