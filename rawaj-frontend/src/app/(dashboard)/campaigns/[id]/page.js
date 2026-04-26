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
  CheckCircleIcon, ClockIcon, ArrowLeftIcon, CalendarIcon,
  UserGroupIcon, SparklesIcon, ExclamationCircleIcon,
  ArrowDownTrayIcon, EyeIcon, XMarkIcon, ClipboardDocumentIcon,
  TrashIcon, ChevronLeftIcon, PauseCircleIcon, PlayCircleIcon,
  DocumentDuplicateIcon
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

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params.id;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // --- States ---
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  // Generation Modals
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentProgressText, setCurrentProgressText] = useState('');
  
  const [imageModal, setImageModal] = useState({ 
    isOpen: false, assetId: null, ratio: '1:1', eventName: null, eventAngle: null 
  });
  
  const [videoModal, setVideoModal] = useState({ 
    isOpen: false, assetId: null, duration: 8, ratio: '9:16', voice: 'Auto', 
    eventName: null, eventAngle: null, mode: 'standard' 
  });

  // Audio
  const [voices, setVoices] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null); 
  const [playingVoice, setPlayingVoice] = useState(null);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null, assetId: null, targetName: '', loading: false });

  // --- Effects ---
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
    if (isAuthenticated && campaignId) {
      fetchCampaignDetails();
      fetchVoices();
    }
    return () => stopAnyAudio();
  }, [authLoading, isAuthenticated, campaignId]);

  // --- Core Functions ---
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
      ratio: newMode === 'extended' ? '16:9' :videoModal.ratio,
    });
  };

  // --- Generation Handlers ---
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

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-background"><LoadingSpinner size="lg" /></div>;

  const assets = campaign?.assets || [];
  const allImages = assets.flatMap(a => (a.images || []).map(img => ({ ...img, audience: a.target_audience })));
  const allVideos = assets.flatMap(a => (a.videos || []).map(vid => ({ ...vid, audience: a.target_audience })));

  return (
    <>
      <GenerationProgressModal isOpen={showProgressModal} currentStatus={currentProgressText} />

      <div className="min-h-screen bg-background p-6 text-right" dir="rtl">
        <div className="max-w-7xl mx-auto">
          
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-8">
             <button onClick={() => router.push('/camp')} className="flex items-center gap-2 text-gray-500 hover:text-accent font-black transition-all">
               <ArrowLeftIcon className="w-5 h-5" /> قائمة الحملات
             </button>
             <button onClick={() => setDeleteModal({ isOpen: true, type: 'campaign', targetName: campaign.name })} className="text-red-500/50 hover:text-red-500 transition-all font-bold text-xs flex items-center gap-2">
                <TrashIcon className="w-4 h-4" /> حذف الحملة نهائياً
             </button>
          </div>

          {/* Campaign Header Card */}
          <div className="bg-panel border border-gray-800 rounded-[3rem] p-10 mb-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-accent to-emerald-500"></div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-accent/10 rounded-[2rem] border border-accent/20 shadow-inner">
                  <MegaphoneIcon className="w-12 h-12 text-accent" />
                </div>
                <div>
                  <h1 className="text-4xl font-black text-white mb-2 tracking-tight">{campaign.name || 'حملة ذكية'}</h1>
                  <div className="flex gap-3 items-center">
                    <span className="bg-green-500/10 text-green-400 px-4 py-1 rounded-full border border-green-500/20 font-black text-[10px] uppercase tracking-widest">
                      {campaign.status}
                    </span>
                    <span className="text-gray-500 text-xs font-bold flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" /> {new Date(campaign.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Quick Summary Stats */}
              <div className="flex gap-4">
                  <div className="bg-background/40 p-4 rounded-3xl border border-gray-800 text-center min-w-[100px]">
                      <p className="text-2xl font-black text-white">{assets.length}</p>
                      <p className="text-[10px] text-gray-500 font-bold">فئات</p>
                  </div>
                  <div className="bg-background/40 p-4 rounded-3xl border border-gray-800 text-center min-w-[100px]">
                      <p className="text-2xl font-black text-emerald-400">{allImages.length}</p>
                      <p className="text-[10px] text-gray-500 font-bold">صور</p>
                  </div>
                  <div className="bg-background/40 p-4 rounded-3xl border border-gray-800 text-center min-w-[100px]">
                      <p className="text-2xl font-black text-orange-400">{allVideos.length}</p>
                      <p className="text-[10px] text-gray-500 font-bold">فيديو</p>
                  </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-10 bg-panel p-2 rounded-2xl border border-gray-800 w-fit">
            {[
              { id: 'overview', label: 'الاستراتيجية والإنتاج', icon: SparklesIcon },
              { id: 'images', label: 'معرض الصور', icon: PhotoIcon },
              { id: 'videos', label: 'معرض الفيديو', icon: VideoCameraIcon },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === tab.id ? 'bg-accent text-white shadow-xl shadow-accent/20 scale-105' : 'text-gray-500 hover:text-gray-300'}`}>
                <tab.icon className="w-5 h-5" /> {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              
              {activeTab === 'overview' && (
                <div className="space-y-10">
                  {/* Strategic Goal */}
                  <div className="bg-gradient-to-l from-blue-600/10 to-transparent border-r-4 border-accent p-8 rounded-2xl">
                     <h3 className="text-accent font-black mb-3 flex items-center gap-2 text-xl"><EyeIcon className="w-6 h-6"/> الهدف الإستراتيجي المعتمد</h3>
                     <p className="text-white text-2xl font-medium leading-relaxed italic">"{campaign.objective || 'توليد محتوى إبداعي مخصص.'}"</p>
                  </div>

                  {/* Audience Cards */}
                  <div className="grid grid-cols-1 gap-10">
                    {assets.map((asset) => (
                      <div key={asset.id} className="bg-panel border border-gray-800 rounded-[3rem] p-10 shadow-2xl relative group">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 border-b border-gray-800/50 pb-8">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                               <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                               <h4 className="text-3xl font-black text-white">{asset.target_audience}</h4>
                            </div>
                            <div className="flex gap-4">
                               <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">الصور: {asset.images?.length || 0}</span>
                               <span className="text-xs font-bold text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full border border-orange-400/20">الفيديوهات: {asset.videos?.length || 0}</span>
                            </div>
                          </div>
                          
                          {/* Direct Production Buttons */}
                          <div className="flex gap-4">
                            <button 
                              onClick={() => setImageModal({ ...imageModal, isOpen: true, assetId: asset.id })}
                              className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black text-sm transition-all hover:bg-accent hover:text-white shadow-lg"
                            >
                              <PhotoIcon className="w-5 h-5 group-hover:rotate-12 transition-transform"/> توليد صورة 🎨
                            </button>
                            <button 
                              onClick={() => setVideoModal({ ...videoModal, isOpen: true, assetId: asset.id })}
                              className="group flex items-center gap-3 bg-accent text-white px-8 py-4 rounded-2xl font-black text-sm transition-all hover:bg-orange-500 shadow-lg shadow-accent/20"
                            >
                              <VideoCameraIcon className="w-5 h-5 group-hover:scale-110 transition-transform"/> إنتاج فيديو 🎬
                            </button>
                          </div>
                        </div>

                        {/* Ad Copies Display */}
                        <div className="space-y-6">
                           <div className="flex items-center justify-between">
                              <h5 className="text-gray-400 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5 text-accent"/> مقترحات كاتب المحتوى
                              </h5>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {asset.ad_copy?.map((copy, i) => (
                                <div key={i} className="bg-background/50 border border-gray-800 p-6 rounded-[2rem] relative hover:border-gray-600 transition-colors">
                                  <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-accent uppercase tracking-widest bg-accent/10 px-3 py-1 rounded-lg border border-accent/20">{copy.platform}</span>
                                    <button 
                                      onClick={() => handleCopy(copy.ad_copy || copy.text, `${asset.id}-${i}`)} 
                                      className={`p-2 rounded-xl transition-all ${copiedId === `${asset.id}-${i}` ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                                    >
                                      {copiedId === `${asset.id}-${i}` ? <CheckCircleIcon className="w-5 h-5"/> : <DocumentDuplicateIcon className="w-5 h-5"/>}
                                    </button>
                                  </div>
                                  <p className="text-gray-200 text-sm leading-loose font-medium">{copy.ad_copy || copy.text}</p>
                                </div>
                              ))}
                           </div>
                        </div>

                        <button onClick={() => openDeleteModal('asset', null, asset.id, asset.target_audience)} className="absolute bottom-6 left-10 text-gray-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                           <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Gallery Tab (Horizontal Scroll Style) */}
              {activeTab === 'images' && (
                allImages.length === 0 ? <div className="text-center py-32 bg-panel border-2 border-dashed border-gray-800 rounded-[3rem]"><PhotoIcon className="w-20 mx-auto mb-4 opacity-10" /><p className="text-gray-500 font-black">لا توجد صور في المعرض حالياً</p></div> : 
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {allImages.map((img, i) => (
                    <div key={img.id} className="group relative bg-panel rounded-[2rem] border border-gray-800 overflow-hidden aspect-square shadow-2xl">
                      <img src={img.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4">
                         <div className="flex gap-2">
                            <button onClick={() => setSelectedImage(img.image_url)} className="p-4 bg-white/10 hover:bg-accent rounded-full text-white backdrop-blur-md"><EyeIcon className="w-6 h-6"/></button>
                            <button onClick={() => window.open(img.image_url)} className="p-4 bg-white/10 hover:bg-green-600 rounded-full text-white backdrop-blur-md"><ArrowDownTrayIcon className="w-6 h-6"/></button>
                         </div>
                         <p className="text-[10px] text-white/50 font-bold uppercase">{img.audience}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Video Gallery Tab */}
              {activeTab === 'videos' && (
                allVideos.length === 0 ? <div className="text-center py-32 bg-panel border-2 border-dashed border-gray-800 rounded-[3rem]"><VideoCameraIcon className="w-20 mx-auto mb-4 opacity-10" /><p className="text-gray-500 font-black">المعرض السينمائي فارغ حالياً</p></div> :
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {allVideos.map((vid, i) => (
                    <div key={vid.id} className="group bg-panel rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl relative">
                      <div className="relative aspect-video bg-black">
                        <video src={vid.video_url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-6">
                           <button onClick={() => setSelectedVideo(vid.video_url)} className="p-5 bg-accent text-white rounded-full shadow-xl"><PlayCircleIcon className="w-10 h-10"/></button>
                           <button onClick={() => window.open(vid.video_url)} className="p-5 bg-green-600 text-white rounded-full shadow-xl"><ArrowDownTrayIcon className="w-10 h-10"/></button>
                        </div>
                      </div>
                      <div className="p-8 flex justify-between items-center bg-panel">
                        <div>
                           <p className="text-white text-xl font-black">{vid.audience}</p>
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">إصدار سينمائي فائق الدقة</p>
                        </div>
                        <button onClick={() => openDeleteModal('video', vid.id, null, 'هذا الفيديو')} className="p-3 text-gray-700 hover:text-red-500 transition-colors">
                           <TrashIcon className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {/* --- Intelligent Video Modal (Square/Wide Layout) --- */}
      {videoModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" dir="rtl">
          <div className="bg-[#0f172a] border border-gray-800 rounded-[3rem] p-0 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header الثابت */}
            <div className="p-6 border-b border-gray-800/50 flex items-center justify-between bg-[#1e293b]/30">
              <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <VideoCameraIcon className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-black text-white">إعدادات الإنتاج السينمائي</h3>
              </div>
              <div className="text-[10px] font-black text-gray-500 bg-background px-3 py-1 rounded-full border border-gray-800 uppercase tracking-widest">
                  AI Video Engine v3.0
              </div>
            </div>

            {/* المحتوى مقسم لعمودين */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-y-auto custom-scrollbar">
              
              {/* العمود الأول: الإعدادات التقنية */}
              <div className="p-8 border-l border-gray-800/50 space-y-8 bg-background/20">
                
                {/* 1. نمط الإخراج */}
                <div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-3 h-3"/> 1. نمط الإخراج
                  </p>
                  <div className="flex bg-background p-1.5 rounded-2xl border border-gray-800 shadow-inner">
                    <button 
                      onClick={() => toggleVideoMode('standard')}
                      className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${videoModal.mode === 'standard' ? 'bg-accent text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      مشاهد متنوعة
                    </button>
                    <button 
                      onClick={() => toggleVideoMode('extended')}
                      className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${videoModal.mode === 'extended' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      لقطة ممتدة
                    </button>
                  </div>
                </div>

                {/* 2. مدة الفيديو */}
                <motion.div layout>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">2. مدة الفيديو المختارة</p>
                  <div className="grid grid-cols-1 gap-2">
                    {durationsConfig[videoModal.mode].map(d => (
                      <button 
                        key={d.id} 
                        onClick={() => setVideoModal({...videoModal, duration: d.id})} 
                        className={`p-3.5 rounded-2xl border-2 text-right transition-all flex justify-between items-center ${
                          videoModal.duration === d.id 
                            ? (videoModal.mode === 'standard' ? 'border-accent bg-accent/10' : 'border-orange-500 bg-orange-500/10') 
                            : 'border-gray-800 bg-background/50 text-gray-500 hover:border-gray-700'
                        }`}
                      >
                        <span className={`font-bold text-sm ${videoModal.duration === d.id ? 'text-white' : ''}`}>{d.name}</span>
                        {videoModal.duration === d.id && <CheckCircleIcon className={`w-5 h-5 ${videoModal.mode === 'standard' ? 'text-accent' : 'text-orange-500'}`} />}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* 3. مقاس الفيديو (المنطق الجديد) */}
                <div className={`${videoModal.mode === 'extended' ? 'opacity-50 pointer-events-none' : ''} transition-all`}>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">3. مقاس وأبعاد الفيديو</p>
                  <div className="flex gap-3">
                    {aspectRatios.slice(1).map(r => (
                      <button 
                        key={r.id} 
                        disabled={videoModal.mode === 'extended' && r.id === '9:16'}
                        onClick={() => setVideoModal({...videoModal, ratio: r.id})} 
                        className={`flex-1 py-3 rounded-xl text-xs font-black border-2 transition-all ${
                          videoModal.ratio === r.id 
                            ? 'border-accent bg-accent text-white shadow-lg' 
                            : 'border-gray-800 bg-background text-gray-500'
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                  {videoModal.mode === 'extended' && (
                    <p className="text-[10px] text-orange-400 font-bold mt-2 mr-1">⚠️ اللقطة الممتدة تدعم المقاس الأفقي فقط حالياً.</p>
                  )}
                </div>
              </div>

              {/* العمود الثاني: الإخراج الفني والصوتي */}
              <div className="p-8 bg-background/40 space-y-8">
                
                {/* 4. المعلق الصوتي */}
                <div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">4. نبرة المعلق الصوتي</p>
                  <div className="max-h-[220px] overflow-y-auto bg-background/80 border border-gray-800 rounded-3xl p-3 space-y-2 custom-scrollbar shadow-inner">
                    <button onClick={() => setVideoModal({...videoModal, voice: 'Auto'})} className={`w-full flex justify-between items-center p-4 rounded-2xl text-xs font-bold transition-all ${videoModal.voice === 'Auto' ? 'bg-accent text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">🤖</div>
                        <span>اختيار ذكي (تلقائي)</span>
                      </div>
                      {videoModal.voice === 'Auto' && <CheckCircleIcon className="w-5 h-5" />}
                    </button>
                    {voices.map((v) => (
                      <div key={v.name} className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${videoModal.voice === v.name ? 'bg-[#1e293b] border border-gray-700 text-white' : 'text-gray-500 hover:bg-gray-800/50'}`}>
                        <div onClick={() => setVideoModal({...videoModal, voice: v.name})} className="cursor-pointer flex-1 text-sm font-bold flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-black">{v.name[0]}</div>
                          {v.name}
                        </div>
                        {v.preview_url && (
                          <button onClick={() => handleVoicePreview(v)} className={`p-2 rounded-xl transition-all ${playingVoice === v.name ? 'bg-red-500 text-white' : 'bg-gray-800 hover:bg-green-600 text-white'}`}>
                            {playingVoice === v.name ? <PauseCircleIcon className="w-5 h-5" /> : <PlayCircleIcon className="w-5 h-5" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. ربط المناسبة */}
                {campaign?.trending_events?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">5. ربط الإعلان بمناسبة</p>
                    <div className="max-h-[160px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
                        <button onClick={() => setVideoModal({...videoModal, eventName: null, eventAngle: null})} className={`w-full p-4 rounded-2xl border-2 text-right text-xs font-bold transition-all ${!videoModal.eventName ? 'border-accent bg-accent/10 text-white shadow-lg' : 'border-gray-800 text-gray-500'}`}>إعلان عام (تصميم دائم)</button>
                        {campaign.trending_events.map((ev, i) => (
                          <button key={i} onClick={() => setVideoModal({...videoModal, eventName: ev.event, eventAngle: ev.angle})} className={`w-full p-4 rounded-2xl border-2 text-right transition-all ${videoModal.eventName === ev.event ? 'border-green-500 bg-green-500/10 text-white shadow-lg' : 'border-gray-800 text-gray-500 hover:border-gray-700'}`}>
                            <p className="font-black text-sm">{ev.event}</p>
                            <p className="text-[10px] opacity-50 mt-1">{ev.angle}</p>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer الأزرار */}
            <div className="p-6 bg-[#1e293b]/30 border-t border-gray-800 flex gap-4">
              <button onClick={() => { stopAnyAudio(); setVideoModal({...videoModal, isOpen: false}); }} className="px-8 py-4 text-gray-400 font-bold hover:text-white transition-all">إلغاء</button>
              <button 
                onClick={handleGenerateVideo} 
                className={`flex-1 py-4 rounded-2xl font-black text-lg shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
                  videoModal.mode === 'standard' ? 'bg-accent text-white shadow-accent/20' : 'bg-orange-500 text-white shadow-orange-500/20'
                }`}
              >
                {videoModal.mode === 'standard' ? <SparklesIcon className="w-6 h-6"/> : <VideoCameraIcon className="w-6 h-6"/>}
                ابدأ الإنتاج السينمائي الذكي
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- Image Modal --- */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-panel border border-gray-800 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-8">تصميم الصورة الإعلانية</h3>
            
            <div className="space-y-8">
                <div>
                   <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">مقاس الصورة</p>
                   <div className="flex flex-wrap gap-3">
                    {aspectRatios.map(r => (
                        <button key={r.id} onClick={() => setImageModal({...imageModal, ratio: r.id})} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${imageModal.ratio === r.id ? 'bg-accent text-white shadow-lg shadow-accent/20 border-accent' : 'bg-background text-gray-500 border border-gray-800'}`}>{r.name}</button>
                    ))}
                   </div>
                </div>

                {campaign?.trending_events?.length > 0 && (
                <div className="space-y-4">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">اختيار المناسبة</p>
                    <div className="max-h-[150px] overflow-y-auto space-y-2 custom-scrollbar">
                    <button onClick={() => setImageModal({...imageModal, eventName: null, eventAngle: null})} className={`w-full p-4 rounded-2xl border-2 text-right text-xs font-bold transition-all ${!imageModal.eventName ? 'border-accent bg-accent/10 text-white shadow-lg' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}>إعلان عام (تصميم أساسي)</button>
                    {campaign.trending_events.map((ev, i) => (
                        <button key={i} onClick={() => setImageModal({...imageModal, eventName: ev.event, eventAngle: ev.angle})} className={`w-full p-4 rounded-2xl border-2 text-right transition-all ${imageModal.eventName === ev.event ? 'border-green-500 bg-green-500/10 text-white shadow-lg' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}>
                        <p className="font-black text-sm mb-1">{ev.event}</p>
                        <p className="text-[10px] opacity-50 font-medium leading-relaxed">{ev.angle}</p>
                        </button>
                    ))}
                    </div>
                </div>
                )}
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setImageModal({...imageModal, isOpen: false})} className="flex-1 py-4 text-gray-500 font-bold hover:text-white transition-all">إلغاء</button>
              <button onClick={handleGenerateImage} className="flex-1 py-4 bg-white text-black rounded-2xl font-black shadow-xl hover:bg-accent hover:text-white transition-all transform active:scale-95">توليد الآن 🎨</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for media preview & delete confirmation as in previous logic... */}
      {selectedImage && <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}><img src={selectedImage} className="max-w-full max-h-[90vh] rounded-[2rem] shadow-2xl border border-white/5" /><XMarkIcon className="absolute top-8 right-8 w-12 h-12 text-white/50 hover:text-white cursor-pointer transition-all" /></div>}
      {selectedVideo && <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}><video src={selectedVideo} controls autoPlay className="max-w-full max-h-[90vh] rounded-[2rem] shadow-2xl border border-white/5" /><XMarkIcon className="absolute top-8 right-8 w-12 h-12 text-white/50 hover:text-white cursor-pointer transition-all" /></div>}
      
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-panel border border-gray-800 rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><ExclamationCircleIcon className="w-14 h-14 text-red-500" /></div>
            <h3 className="text-3xl font-black text-white mb-3">تأكيد الحذف</h3>
            <p className="text-gray-400 mb-10 font-medium leading-relaxed text-lg">هل أنت متأكد من حذف <span className="text-white font-black underline decoration-red-500">"{deleteModal.targetName}"</span>؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-4">
                <button onClick={() => setDeleteModal({...deleteModal, isOpen: false})} className="flex-1 py-4 bg-background text-gray-500 rounded-2xl font-black hover:text-white transition-all">تراجع</button>
                <button onClick={executeDelete} disabled={deleteModal.loading} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-600/20 disabled:opacity-50">
                  {deleteModal.loading ? <LoadingSpinner size="sm" color="white" /> : 'نعم، احذف'}
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}