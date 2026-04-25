'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import GenerationProgressModal from '@/components/GenerationProgressModal';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
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
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const aspectRatios = [
  { id: '1:1', name: 'مربع 1:1' },
  { id: '16:9', name: 'أفقي 16:9' },
  { id: '9:16', name: 'عمودي 9:16' },
];

const videoDurations = [
  { id: 8, name: '8 ثواني' },
  { id: 15, name: '15 ثانية (ممتد)' },
  { id: 22, name: '22 ثانية (ممتد)' },
];

export default function CampaignResultPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  const [imageModal, setImageModal] = useState({ isOpen: false, assetId: null, ratio: '1:1' });
  const [videoModal, setVideoModal] = useState({ isOpen: false, assetId: null, duration: 8, ratio: '9:16', voice: 'Auto' });
  
  const [editModal, setEditModal] = useState({ isOpen: false, type: null, id: null, assetId: null, platform: null, feedback: '' });

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

  const fetchVoices = async () => {
    try {
      const response = await api('/campaigns/options/voices');
      if (response.ok) {
        const data = await response.json();
        setVoices(data.voices || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchCampaignData();
      fetchVoices();
    }
    return () => stopAnyAudio();
  }, [authLoading, isAuthenticated]);

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

  const stopAnyAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setPlayingVoice(null);
    }
  };

  const handleVoicePreview = (v) => {
    if (playingVoice === v.name) {
      stopAnyAudio();
      return;
    }
    stopAnyAudio();
    let audioPath = v.preview_url.replace(/\\/g, '/'); 
    const audioUrl = audioPath.startsWith('http') ? audioPath : `${baseUrl}/${audioPath}`;
    const audio = new Audio(audioUrl);
    audio.onplay = () => { setPlayingVoice(v.name); setCurrentAudio(audio); };
    audio.onended = () => { setPlayingVoice(null); setCurrentAudio(null); };
    audio.onerror = () => { alert("عذراً، تعذر تحميل الصوت."); setPlayingVoice(null); };
    audio.play().catch(err => console.error(err));
  };

  const handleGenerateImage = async () => {
    setImageModal({ ...imageModal, isOpen: false });
    setShowProgressModal(true);
    setCurrentProgressText('جاري تحضير الاستوديو...');
    const processId = `image_${imageModal.assetId}`;
    const eventSource = new EventSource(`${baseUrl}/campaigns/stream/${processId}`);
    eventSource.onmessage = (e) => { if (e.data !== '[DONE]') setCurrentProgressText(e.data); };
    try {
      const response = await api('/campaigns/generate_image', {
        method: 'POST',
        body: JSON.stringify({ asset_id: imageModal.assetId, aspect_ratio: imageModal.ratio, platform: 'Instagram' })
      });
      if (!response.ok) throw new Error('فشل في توليد الصورة');
      eventSource.close();
      setCurrentProgressText('تمت إضافة الصورة بنجاح!');
      await fetchCampaignData();
    } catch (err) { eventSource.close(); alert(err.message); } 
    finally { setTimeout(() => setShowProgressModal(false), 1500); }
  };

  const handleGenerateVideo = async () => {
    setVideoModal({ ...videoModal, isOpen: false });
    stopAnyAudio();
    setShowProgressModal(true);
    setCurrentProgressText('جاري تجهيز المشاهد السينمائية...');
    const processId = `video_${videoModal.assetId}`;
    const eventSource = new EventSource(`${baseUrl}/campaigns/stream/${processId}`);
    eventSource.onmessage = (e) => { if (e.data !== '[DONE]') setCurrentProgressText(e.data); };
    try {
      const isExtended = videoModal.duration > 8;
      const endpoint = isExtended ? '/campaigns/generate_extended_video' : '/campaigns/generate_video';
      const response = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({ asset_id: videoModal.assetId, video_duration: videoModal.duration, aspect_ratio: videoModal.ratio, voice_preference: videoModal.voice })
      });
      if (!response.ok) throw new Error('فشل في توليد الفيديو');
      eventSource.close();
      setCurrentProgressText('تم إخراج الفيديو بنجاح!');
      await fetchCampaignData();
    } catch (err) { eventSource.close(); alert(err.message); } 
    finally { setTimeout(() => setShowProgressModal(false), 1500); }
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
      const response = await api(endpoint, { method: type === 'text' ? 'PUT' : 'POST', body: JSON.stringify(body) });
      if (!response.ok) throw new Error('فشل في معالجة التعديل');
      eventSource.close();
      setCurrentProgressText('تم تطبيق التعديلات بنجاح!');
      await fetchCampaignData();
    } catch (err) { eventSource.close(); alert(err.message); } 
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
          
          {/* Progress Steps */}
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

          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
            <h2 className="text-2xl font-black text-white">تم تجهيز نصوص الحملة بنجاح! 🚀</h2>
            <p className="text-gray-400 text-md mt-2">يمكنك الآن توليد صور وفيديوهات إبداعية لكل فئة.</p>
          </div>

          {assets.map((asset) => {
            const audienceName = asset.target_audience || 'جمهور غير محدد';
            const copies = asset.ad_copy || [];
            const images = asset.images || [];
            const videos = asset.videos || [];

            return (
              <div key={asset.id} className="bg-panel rounded-[2rem] border border-border-color p-8 shadow-xl">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-800 pb-4">
                  <h3 className="text-xl font-black text-white flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-xl"><UsersIcon className="w-6 h-6 text-green-400" /></div>
                    {audienceName}
                  </h3>
                  
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setImageModal({ isOpen: true, assetId: asset.id, ratio: '1:1' })} className="bg-panel border border-gray-700 hover:border-green-500 hover:text-green-400 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                      <PhotoIcon className="w-5 h-5" /> توليد صورة
                    </button>
                    <button onClick={() => setVideoModal({ isOpen: true, assetId: asset.id, duration: 8, ratio: '9:16', voice: 'Auto' })} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-500/20">
                      <VideoCameraIcon className="w-5 h-5" /> إنتاج فيديو
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-gray-300 text-lg font-bold flex items-center gap-2 mb-4">
                      <SparklesIcon className="w-5 h-5 text-accent" /> المعرض الإبداعي
                    </h4>
                    
                    {images.length === 0 && videos.length === 0 ? (
                      <div className="bg-background border border-dashed border-gray-700 rounded-2xl p-10 text-center flex flex-col items-center justify-center h-[250px]">
                        <PhotoIcon className="w-12 h-12 text-gray-600 mb-3" />
                        <p className="text-gray-500 font-medium text-sm">ابدأ بتوليد المحتوى البصري لهذه الفئة.</p>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        {images.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mr-2">الصور المولدة</p>
                            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                              {images.map((img, i) => (
                                <div key={`img-${img.id}`} className="flex-none w-[220px] snap-start group relative bg-background rounded-2xl border border-gray-800 overflow-hidden shadow-lg transition-all hover:border-accent/50">
                                  <div className="aspect-square relative">
                                    <img src={img.image_url} alt="Generated" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                                      <div className="flex gap-2">
                                        <button onClick={() => setPreviewImage(img.image_url)} className="p-2 bg-white/10 hover:bg-accent rounded-full text-white transition-colors"><EyeIcon className="w-5 h-5" /></button>
                                        <button onClick={() => downloadFile(img.image_url, `image_${i}.png`)} className="p-2 bg-white/10 hover:bg-green-500 rounded-full text-white transition-colors"><ArrowDownTrayIcon className="w-5 h-5" /></button>
                                      </div>
                                      <button onClick={() => setEditModal({ isOpen: true, type: 'image', id: img.id, assetId: asset.id, platform: img.platform, feedback: '' })} className="flex items-center gap-1 px-4 py-2 bg-white text-black text-[10px] font-black rounded-full hover:bg-accent hover:text-white transition-all">
                                        <PencilSquareIcon className="w-3 h-3" /> طلب تعديل
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {videos.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mr-2">الفيديوهات السينمائية</p>
                            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                              {videos.map((vid, i) => (
                                <div key={`vid-${vid.id}`} className="flex-none w-[280px] snap-start group relative bg-background rounded-2xl border border-gray-800 overflow-hidden shadow-lg transition-all hover:border-orange-500/50">
                                  <div className="aspect-video relative bg-black">
                                    <video src={vid.video_url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                                      <div className="flex gap-2">
                                        <button onClick={() => setPreviewVideo(vid.video_url)} className="p-2 bg-white/10 hover:bg-accent rounded-full text-white transition-colors"><PlayCircleIcon className="w-6 h-6" /></button>
                                        <button onClick={() => downloadFile(vid.video_url, `video_${i}.mp4`)} className="p-2 bg-white/10 hover:bg-green-500 rounded-full text-white transition-colors"><ArrowDownTrayIcon className="w-5 h-5" /></button>
                                      </div>
                                      <button onClick={() => setEditModal({ isOpen: true, type: 'video', id: vid.id, assetId: asset.id, platform: null, feedback: '' })} className="flex items-center gap-1 px-4 py-2 bg-white text-black text-[10px] font-black rounded-full hover:bg-orange-500 hover:text-white transition-all">
                                        <PencilSquareIcon className="w-3 h-3" /> تعديل السيناريو
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-gray-300 text-lg font-bold flex items-center gap-2">
                        <DocumentDuplicateIcon className="w-5 h-5 text-accent" /> النصوص الإعلانية ({copies.length})
                      </h4>
                      <button onClick={() => setEditModal({ isOpen: true, type: 'text', id: null, assetId: asset.id, platform: null, feedback: '' })} className="bg-blue-600/10 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                        <PencilSquareIcon className="w-4 h-4" /> تعديل النصوص
                      </button>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {copies.map((copy, copyIndex) => {
                        const text = typeof copy === 'string' ? copy : (copy.ad_copy || copy.text || '');
                        const platform = copy.platform || '';
                        return (
                          <div key={`${asset.id}-${copyIndex}`} className="bg-background rounded-2xl p-5 border border-gray-800">
                            <div className="flex justify-between items-start mb-3">
                              {platform && <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">{platform}</span>}
                              <button onClick={() => handleCopy(text, `${asset.id}-${copyIndex}`)} className={`p-1.5 rounded-lg ${copiedIndex === `${asset.id}-${copyIndex}` ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                                {copiedIndex === `${asset.id}-${copyIndex}` ? <CheckCircleIcon className="w-5 h-5" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
                              </button>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
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

      {/* Modals */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-panel border border-border-color rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3"><editConfig.icon className={`w-8 h-8 ${editConfig.color}`}/><h3 className="text-2xl font-black text-white">{editConfig.title}</h3></div>
            <p className="text-gray-400 text-sm mb-6">{editConfig.desc}</p>
            <textarea value={editModal.feedback} onChange={(e) => setEditModal({...editModal, feedback: e.target.value})} placeholder="اكتب ملاحظاتك..." rows="4" className="w-full bg-background border border-gray-700 text-white rounded-xl p-4 outline-none mb-6"></textarea>
            <div className="flex gap-3">
              <button onClick={() => setEditModal({...editModal, isOpen: false})} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl font-bold">إلغاء</button>
              <button onClick={submitEdit} className={`flex-1 text-white py-3 rounded-xl font-black ${editConfig.bg} ${editConfig.hoverBg}`}>إرسال</button>
            </div>
          </div>
        </div>
      )}

      {imageModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-panel border border-border-color rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black text-white mb-6">إعدادات الصورة</h3>
            <div className="flex flex-wrap gap-3 mb-8">
              {aspectRatios.map(r => (
                <button key={r.id} onClick={() => setImageModal({...imageModal, ratio: r.id})} className={`px-4 py-2 rounded-xl text-sm font-bold ${imageModal.ratio === r.id ? 'bg-green-600 text-white' : 'bg-background text-gray-400 border border-gray-700'}`}>{r.name}</button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setImageModal({...imageModal, isOpen: false})} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl font-bold">إلغاء</button>
              <button onClick={handleGenerateImage} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black">توليد الآن</button>
            </div>
          </div>
        </div>
      )}

      {videoModal.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-[#111827] border border-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2"><VideoCameraIcon className="w-6 h-6 text-green-400"/> إعدادات الفيديو</h3>
            <div className="space-y-6">
              <div>
                <p className="text-gray-400 text-sm mb-3">مدة الفيديو</p>
                <div className="flex flex-wrap gap-2">
                  {videoDurations.map(d => (
                    <button key={d.id} onClick={() => setVideoModal({...videoModal, duration: d.id})} className={`px-4 py-2 rounded-xl text-xs font-bold ${videoModal.duration === d.id ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{d.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-3">المعلق الصوتي</p>
                <div className="max-h-[200px] overflow-y-auto bg-gray-900/50 rounded-xl p-2 space-y-1">
                  <button onClick={() => setVideoModal({...videoModal, voice: 'Auto'})} className={`w-full flex justify-between p-3 rounded-lg ${videoModal.voice === 'Auto' ? 'bg-green-600/20 text-white' : 'text-gray-400'}`}><span>تلقائي</span>{videoModal.voice === 'Auto' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}</button>
                  {voices.map((v) => (
                    <div key={v.name} className={`flex items-center justify-between p-2 rounded-lg ${videoModal.voice === v.name ? 'bg-green-600/20 text-white' : 'text-gray-400'}`}>
                      <div onClick={() => setVideoModal({...videoModal, voice: v.name})} className="cursor-pointer flex-1 text-sm font-bold">{v.name}</div>
                      {v.preview_url && <button onClick={() => handleVoicePreview(v)} className={`p-1.5 rounded-full ${playingVoice === v.name ? 'bg-red-500 text-white' : 'bg-gray-800'}`}>{playingVoice === v.name ? <PauseCircleIcon className="w-4 h-4" /> : <PlayCircleIcon className="w-4 h-4" />}</button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => { stopAnyAudio(); setVideoModal({...videoModal, isOpen: false}); }} className="flex-1 bg-gray-800 text-gray-400 py-3 rounded-xl font-bold">إلغاء</button>
              <button onClick={handleGenerateVideo} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black">إنتاج</button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-[90vh] object-contain rounded-xl" alt="Preview" />
          <XMarkIcon className="absolute top-6 right-6 w-8 h-8 text-white cursor-pointer" />
        </div>
      )}

      {previewVideo && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewVideo(null)}>
          <video src={previewVideo} controls autoPlay className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
          <XMarkIcon className="absolute top-6 right-6 w-8 h-8 text-white cursor-pointer" />
        </div>
      )}
    </>
  );
}