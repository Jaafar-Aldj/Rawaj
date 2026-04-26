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
  ChevronLeftIcon
} from '@heroicons/react/24/outline';

// إعدادات مدد الفيديو لكل نمط
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
      case 'text': return { icon: DocumentTextIcon, title: 'تعديل النصوص', desc: 'أخبر كاتب المحتوى بما تريد تغييره.', color: 'text-blue-400', bg: 'bg-blue-600', hoverBg: 'hover:bg-blue-500' };
      case 'image': return { icon: PhotoIcon, title: 'تعديل الصورة', desc: 'أخبر المخرج الفني بما تريد تعديله.', color: 'text-purple-400', bg: 'bg-purple-600', hoverBg: 'hover:bg-purple-500' };
      case 'video': return { icon: VideoCameraIcon, title: 'تعديل الفيديو', desc: 'أخبر مخرج الفيديو بما تريد تغييره.', color: 'text-orange-400', bg: 'bg-orange-600', hoverBg: 'hover:bg-orange-500' };
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

      <div className="min-h-screen bg-background p-6 text-right" dir="rtl">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          
          <div className="flex items-center justify-between bg-panel p-5 rounded-3xl shadow-lg border border-border-color">
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
                    step.status === 'active' ? 'bg-green-600 text-white shadow-md shadow-green-500/20' : 
                    step.status === 'done' ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {step.status === 'done' ? <CheckCircleIcon className="w-5 h-5" /> : step.id}
                  </div>
                  <span className={`text-[10px] font-bold whitespace-nowrap ${step.status !== 'pending' ? 'text-gray-200' : 'text-gray-500'}`}>{step.name}</span>
                </div>
                {idx < arr.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-2 rounded-full ${step.status === 'done' ? 'bg-green-500/30' : 'bg-gray-800'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center shadow-xl">
            <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3"><SparklesIcon className="w-8 h-8 text-green-400"/> استوديو الإنتاج الذكي جاهز!</h2>
            <p className="text-gray-400 text-md mt-2 font-medium">ابدأ الآن بتوليد الصور والفيديوهات لكل فئة مستهدفة.</p>
          </div>

          {assets.map((asset) => {
            const images = asset.images || [];
            const videos = asset.videos || [];
            const copies = asset.ad_copy || [];

            return (
              <div key={asset.id} className="bg-panel rounded-[2.5rem] border border-gray-800 p-8 shadow-2xl space-y-10">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-800 pb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-2xl border border-accent/20"><UsersIcon className="w-7 h-7 text-accent" /></div>
                    <h3 className="text-2xl font-black text-white">{asset.target_audience}</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setImageModal({ ...imageModal, isOpen: true, assetId: asset.id })} className="bg-white text-black px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-accent hover:text-white transition-all shadow-lg shadow-white/5 active:scale-95">
                      <PhotoIcon className="w-5 h-5" /> توليد صورة
                    </button>
                    <button onClick={() => setVideoModal({ ...videoModal, isOpen: true, assetId: asset.id })} className="bg-accent text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-orange-500 transition-all shadow-lg shadow-accent/20 active:scale-95">
                      <VideoCameraIcon className="w-5 h-5" /> إنتاج فيديو
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* قسم المعرض الإبداعي - Horizontal Scroll */}
                  <div className="space-y-6">
                    <h4 className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                       <SparklesIcon className="w-4 h-4 text-accent" /> المعرض البصري (إصدارات الفئة)
                    </h4>
                    
                    {images.length === 0 && videos.length === 0 ? (
                      <div className="bg-background border border-dashed border-gray-800 rounded-3xl p-16 text-center flex flex-col items-center justify-center h-[280px]">
                        <PhotoIcon className="w-12 h-12 text-gray-700 mb-4 opacity-20" />
                        <p className="text-gray-600 text-sm font-bold">لم يتم إنتاج وسائط لهذه الفئة بعد.</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {images.length > 0 && (
                          <div className="space-y-3">
                             <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mr-1">الصور المصممة</p>
                             <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                                {images.map((img, i) => (
                                  <div key={img.id} className="flex-none w-[200px] snap-start group relative bg-background rounded-2xl border border-gray-800 overflow-hidden shadow-xl aspect-square">
                                    <img src={img.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt=""/>
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                                       <div className="flex gap-2">
                                          <button onClick={() => setPreviewImage(img.image_url)} className="p-2 bg-white/10 hover:bg-accent rounded-full text-white backdrop-blur-md"><EyeIcon className="w-5 h-5"/></button>
                                          <button onClick={() => downloadFile(img.image_url, `img-${i}.png`)} className="p-2 bg-white/10 hover:bg-green-600 rounded-full text-white backdrop-blur-md"><ArrowDownTrayIcon className="w-5 h-5"/></button>
                                       </div>
                                       <button onClick={() => setEditModal({ isOpen: true, type: 'image', id: img.id, assetId: asset.id, platform: img.platform, feedback: '' })} className="text-[10px] text-accent font-black hover:underline uppercase tracking-tighter">طلب تعديل</button>
                                    </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                        )}
                        {videos.length > 0 && (
                          <div className="space-y-3">
                             <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mr-1">الفيديوهات السينمائية</p>
                             <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                                {videos.map((vid, i) => (
                                  <div key={vid.id} className="flex-none w-[280px] snap-start group relative bg-background rounded-2xl border border-gray-800 overflow-hidden shadow-xl aspect-video">
                                    <video src={vid.video_url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                                       <div className="flex gap-2">
                                          <button onClick={() => setPreviewVideo(vid.video_url)} className="p-3 bg-accent text-white rounded-full"><PlayCircleIcon className="w-6 h-6"/></button>
                                          <button onClick={() => downloadFile(vid.video_url, `vid-${i}.mp4`)} className="p-3 bg-green-600 text-white rounded-full"><ArrowDownTrayIcon className="w-6 h-6"/></button>
                                       </div>
                                       <button onClick={() => setEditModal({ isOpen: true, type: 'video', id: vid.id, assetId: asset.id, platform: null, feedback: '' })} className="text-[10px] text-orange-400 font-black hover:underline uppercase tracking-tighter">تعديل السيناريو</button>
                                    </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* قسم النصوص الإعلانية */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4 text-accent" /> مقترحات كاتب المحتوى ({copies.length})
                      </h4>
                      <button onClick={() => setEditModal({ isOpen: true, type: 'text', id: null, assetId: asset.id, platform: null, feedback: '' })} className="text-blue-400 hover:underline text-[10px] font-black">تحسين النصوص</button>
                    </div>
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-3 custom-scrollbar">
                      {copies.map((copy, copyIndex) => {
                        const text = typeof copy === 'string' ? copy : (copy.ad_copy || copy.text || '');
                        const platform = copy.platform || 'عام';
                        const uid = `${asset.id}-${copyIndex}`;
                        return (
                          <div key={uid} className="bg-background/50 rounded-3xl p-6 border border-gray-800 hover:border-gray-600 transition-colors relative group">
                            <div className="flex justify-between items-start mb-4">
                              <span className="bg-accent/10 text-accent text-[10px] font-black px-3 py-1 rounded-lg border border-accent/20 uppercase tracking-widest">{platform}</span>
                              <button onClick={() => handleCopy(text, uid)} className={`p-2 rounded-xl transition-all ${copiedIndex === uid ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-800 text-gray-500 hover:text-white'}`}>
                                {copiedIndex === uid ? <CheckCircleIcon className="w-5 h-5" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
                              </button>
                            </div>
                            <p className="text-gray-200 text-sm leading-loose font-medium">{text}</p>
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

      {/* --- Intelligent Wide Video Modal --- */}
      {videoModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" dir="rtl">
          <div className="bg-[#0f172a] border border-gray-800 rounded-[3rem] p-0 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-800/50 flex items-center justify-between bg-[#1e293b]/30">
               <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
                     <VideoCameraIcon className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-black text-white">إعدادات الإنتاج السينمائي</h3>
               </div>
               <div className="text-[10px] font-black text-gray-500 bg-background px-3 py-1 rounded-full border border-gray-800 uppercase tracking-widest">
                  AI Video Engine v3.1
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-y-auto custom-scrollbar">
              <div className="p-8 border-l border-gray-800/50 space-y-8 bg-background/20">
                <div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">1. نمط الإخراج</p>
                  <div className="flex bg-background p-1.5 rounded-2xl border border-gray-800">
                    <button onClick={() => toggleVideoMode('standard')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${videoModal.mode === 'standard' ? 'bg-accent text-white shadow-lg' : 'text-gray-500'}`}>مشاهد متنوعة</button>
                    <button onClick={() => toggleVideoMode('extended')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${videoModal.mode === 'extended' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500'}`}>لقطة ممتدة</button>
                  </div>
                </div>

                <motion.div layout>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">2. مدة الفيديو المختارة</p>
                  <div className="grid grid-cols-1 gap-2">
                    {durationsConfig[videoModal.mode].map(d => (
                      <button key={d.id} onClick={() => setVideoModal({...videoModal, duration: d.id})} className={`p-4 rounded-2xl border-2 text-right transition-all flex justify-between items-center ${videoModal.duration === d.id ? (videoModal.mode === 'standard' ? 'border-accent bg-accent/10' : 'border-orange-500 bg-orange-500/10') : 'border-gray-800 bg-background/50 text-gray-500'}`}>
                        <span className={`font-bold text-sm ${videoModal.duration === d.id ? 'text-white' : ''}`}>{d.name}</span>
                        {videoModal.duration === d.id && <CheckCircleIcon className={`w-5 h-5 ${videoModal.mode === 'standard' ? 'text-accent' : 'text-orange-500'}`} />}
                      </button>
                    ))}
                  </div>
                </motion.div>

                <div className={`${videoModal.mode === 'extended' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">3. مقاس وأبعاد الفيديو</p>
                  <div className="flex gap-3">
                    {aspectRatios.slice(1).map(r => (
                      <button key={r.id} onClick={() => setVideoModal({...videoModal, ratio: r.id})} className={`flex-1 py-3 rounded-xl text-xs font-black border-2 transition-all ${videoModal.ratio === r.id ? 'border-accent bg-accent text-white' : 'border-gray-800 bg-background text-gray-500'}`}>{r.name}</button>
                    ))}
                  </div>
                  {videoModal.mode === 'extended' && <p className="text-[10px] text-orange-400 font-bold mt-2">⚠️ اللقطة الممتدة تدعم المقاس الأفقي فقط حالياً.</p>}
                </div>
              </div>

              <div className="p-8 bg-background/40 space-y-8">
                <div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">4. نبرة المعلق الصوتي</p>
                  <div className="max-h-[220px] overflow-y-auto bg-background/80 border border-gray-800 rounded-3xl p-3 space-y-2 custom-scrollbar">
                    <button onClick={() => setVideoModal({...videoModal, voice: 'Auto'})} className={`w-full flex justify-between p-4 rounded-2xl text-xs font-bold transition-all ${videoModal.voice === 'Auto' ? 'bg-accent text-white shadow-lg' : 'text-gray-500'}`}>🤖 اختيار ذكي (تلقائي)</button>
                    {voices.map((v) => (
                      <div key={v.name} className={`flex items-center justify-between p-3 rounded-2xl ${videoModal.voice === v.name ? 'bg-[#1e293b] border border-gray-700 text-white' : 'text-gray-500 hover:bg-gray-800/50'}`}>
                        <div onClick={() => setVideoModal({...videoModal, voice: v.name})} className="cursor-pointer flex-1 text-sm font-bold">{v.name}</div>
                        {v.preview_url && <button onClick={() => handleVoicePreview(v)} className={`p-2 rounded-xl ${playingVoice === v.name ? 'bg-red-500 text-white' : 'bg-gray-800'}`}>{playingVoice === v.name ? <PauseCircleIcon className="w-5 h-5" /> : <PlayCircleIcon className="w-5 h-5" />}</button>}
                      </div>
                    ))}
                  </div>
                </div>
                {campaignData?.trending_events?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">5. ربط المناسبة</p>
                    <div className="max-h-[160px] overflow-y-auto space-y-2 custom-scrollbar">
                       <button onClick={() => setVideoModal({...videoModal, eventName: null, eventAngle: null})} className={`w-full p-4 rounded-2xl border-2 text-right text-xs font-bold transition-all ${!videoModal.eventName ? 'border-accent bg-accent/10 text-white shadow-lg' : 'border-gray-800 text-gray-500'}`}>إعلان عام (تصميم دائم)</button>
                       {campaignData.trending_events.map((ev, i) => (
                         <button key={i} onClick={() => setVideoModal({...videoModal, eventName: ev.event, eventAngle: ev.angle})} className={`w-full p-4 rounded-2xl border-2 text-right transition-all ${videoModal.eventName === ev.event ? 'border-green-500 bg-green-500/10 text-white' : 'border-gray-800 text-gray-500'}`}>
                           <p className="font-black text-sm">{ev.event}</p>
                           <p className="text-[10px] opacity-50 mt-1">{ev.angle}</p>
                         </button>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-[#1e293b]/30 border-t border-gray-800 flex gap-4">
              <button onClick={() => { stopAnyAudio(); setVideoModal({...videoModal, isOpen: false}); }} className="px-8 py-4 text-gray-400 font-bold hover:text-white transition-all">إلغاء</button>
              <button onClick={handleGenerateVideo} className={`flex-1 py-4 rounded-2xl font-black text-lg shadow-2xl transition-all transform active:scale-95 ${videoModal.mode === 'standard' ? 'bg-accent text-white' : 'bg-orange-500 text-white'}`}>بدء الإنتاج السينمائي</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Image Generation Modal --- */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-panel border border-gray-800 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3"><PhotoIcon className="w-8 h-8 text-blue-400"/> تصميم الصورة</h3>
            <div className="space-y-8">
              <div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">مقاس الصورة</p>
                <div className="flex gap-3">
                  {aspectRatios.map(r => (
                    <button key={r.id} onClick={() => setImageModal({...imageModal, ratio: r.id})} className={`flex-1 py-3 rounded-xl text-xs font-black border-2 transition-all ${imageModal.ratio === r.id ? 'bg-accent text-white shadow-lg border-accent' : 'bg-background text-gray-500 border-gray-800'}`}>{r.name}</button>
                  ))}
                </div>
              </div>
              {campaignData?.trending_events?.length > 0 && (
                <div className="space-y-4">
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">ربط المناسبة</p>
                  <div className="max-h-[150px] overflow-y-auto space-y-2 custom-scrollbar">
                    <button onClick={() => setImageModal({...imageModal, eventName: null, eventAngle: null})} className={`w-full p-4 rounded-2xl border-2 text-right text-xs font-bold transition-all ${!imageModal.eventName ? 'border-accent bg-accent/10 text-white' : 'border-gray-800 text-gray-500'}`}>إعلان عام (تصميم أساسي)</button>
                    {campaignData.trending_events.map((ev, i) => (
                      <button key={i} onClick={() => setImageModal({...imageModal, eventName: ev.event, eventAngle: ev.angle})} className={`w-full p-4 rounded-2xl border-2 text-right transition-all ${imageModal.eventName === ev.event ? 'border-green-500 bg-green-500/10 text-white' : 'border-gray-800 text-gray-500'}`}>
                        <p className="font-black text-sm mb-1">{ev.event}</p>
                        <p className="text-[10px] opacity-50">{ev.angle}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setImageModal({...imageModal, isOpen: false})} className="flex-1 py-4 text-gray-500 font-bold hover:text-white">إلغاء</button>
              <button onClick={handleGenerateImage} className="flex-1 py-4 bg-white text-black rounded-2xl font-black shadow-xl hover:bg-accent hover:text-white transform active:scale-95 transition-all">توليد الآن 🎨</button>
            </div>
          </div>
        </div>
      )}

      {/* Previews */}
      {previewImage && <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-w-full max-h-[90vh] rounded-[2rem] shadow-2xl" /><XMarkIcon className="absolute top-8 right-8 w-12 h-12 text-white/50 cursor-pointer" /></div>}
      {previewVideo && <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewVideo(null)}><video src={previewVideo} controls autoPlay className="max-w-full max-h-[90vh] rounded-[2rem] shadow-2xl" /><XMarkIcon className="absolute top-8 right-8 w-12 h-12 text-white/50 cursor-pointer" /></div>}

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-panel border border-border-color rounded-3xl p-10 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4"><editConfig.icon className={`w-8 h-8 ${editConfig.color}`}/><h3 className="text-2xl font-black text-white">{editConfig.title}</h3></div>
            <p className="text-gray-400 text-sm mb-8">{editConfig.desc}</p>
            <textarea value={editModal.feedback} onChange={(e) => setEditModal({...editModal, feedback: e.target.value})} placeholder="اكتب ملاحظاتك بدقة..." rows="4" className="w-full bg-background border border-gray-700 text-white rounded-2xl p-5 outline-none mb-8 focus:border-accent transition-all"></textarea>
            <div className="flex gap-4">
              <button onClick={() => setEditModal({...editModal, isOpen: false})} className="flex-1 py-4 bg-background text-gray-500 rounded-2xl font-bold">إلغاء</button>
              <button onClick={submitEdit} className={`flex-1 py-4 rounded-2xl font-black text-white shadow-lg ${editConfig.bg} ${editConfig.hoverBg}`}>إرسال الملاحظات</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}