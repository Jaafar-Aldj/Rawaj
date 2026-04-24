// src/app/(dashboard)/select-platforms/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import GenerationProgressModal from '@/components/GenerationProgressModal';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  PhotoIcon,
  VideoCameraIcon,
  ClipboardDocumentListIcon,
  RocketLaunchIcon,
  CursorArrowRaysIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { FaFacebook, FaInstagram, FaTwitter, FaSnapchatGhost, FaTiktok, FaLinkedin } from 'react-icons/fa';

const platformsList = [
  { id: 'Facebook', name: 'فيسبوك', icon: FaFacebook },
  { id: 'Instagram', name: 'انستغرام', icon: FaInstagram },
  { id: 'Twitter', name: 'اكس', icon: FaTwitter },
  { id: 'Snapchat', name: 'سناب شات', icon: FaSnapchatGhost },
  { id: 'TikTok', name: 'تيك توك', icon: FaTiktok },
  { id: 'LinkedIn', name: 'لينكد إن', icon: FaLinkedin },
];

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

export default function SelectPlatformsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  
  const [selectedAudiences, setSelectedAudiences] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [contentType, setContentType] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState('16:9');
  const [videoDuration, setVideoDuration] = useState(8);
  const [videoAspectRatio, setVideoAspectRatio] = useState('9:16');
  
  const [generating, setGenerating] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentProgressText, setCurrentProgressText] = useState('');

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    const fetchCampaign = async () => {
      const campaignId = localStorage.getItem('campaignId');
      if (!campaignId) {
        setError('لا يوجد معرف حملة. الرجاء العودة للخطوة السابقة.');
        setLoading(false);
        return;
      }

      try {
        const response = await api(`/campaigns/${campaignId}`);
        if (!response.ok) throw new Error('فشل في تحميل بيانات الحملة');
        const data = await response.json();
        setCampaign(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAuthenticated) {
      fetchCampaign();
    }
  }, [authLoading, isAuthenticated]);

  const getAudiences = () => {
    if (!campaign) return [];
    let audiencesList = [];
    if (campaign.suggested_audiences) {
      if (Array.isArray(campaign.suggested_audiences.suggestions)) {
        audiencesList = campaign.suggested_audiences.suggestions;
      } else if (Array.isArray(campaign.suggested_audiences)) {
        audiencesList = campaign.suggested_audiences;
      }
    } else if (Array.isArray(campaign.suggestions)) {
      audiencesList = campaign.suggestions;
    }
    return audiencesList.map(item => ({
      name: item.audience || item.name || '',
      reason: item.reason || ''
    }));
  };

  const toggleAudience = (audienceName) => {
    setSelectedAudiences(prev =>
      prev.includes(audienceName)
        ? prev.filter(a => a !== audienceName)
        : [...prev, audienceName]
    );
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const listenToSSE = (processId) => {
    return new Promise((resolve) => {
      const eventSource = new EventSource(`${baseUrl}/campaigns/stream/${processId}`);
      
      eventSource.onmessage = (e) => {
        if (e.data === '[DONE]') {
          eventSource.close();
          resolve(); 
        } else {
          setCurrentProgressText(e.data); 
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        resolve();
      };
    });
  };

  const handleGenerate = async () => {
    if (selectedAudiences.length === 0) {
      setError('يرجى اختيار فئة مستهدفة');
      return;
    }
    // 👇 أزلنا شرط "يرجى اختيار منصة واحدة" لنسمح للذكاء بالاختيار
    if (!contentType) {
      setError('يرجى اختيار نوع المحتوى');
      return;
    }

    const campaignId = localStorage.getItem('campaignId');
    setError('');
    
    setGenerating(true);
    setShowProgressModal(true);
    setCurrentProgressText('جاري تهيئة بيئة العمل...');

    try {
      const copiesProcessId = `copies_${campaignId}`;
      const copiesSSEPromise = listenToSSE(copiesProcessId);
      
      // نرسل المنصات (وإذا كانت فارغة سيرسل مصفوفة فارغة فيفهمها الباك إند كـ Auto)
      const copiesResponse = await api('/campaigns/generate_copies', {
        method: 'POST',
        body: JSON.stringify({
          campaign_id: parseInt(campaignId),
          selected_audiences: selectedAudiences,
          selected_platforms: selectedPlatforms.length > 0 ? selectedPlatforms : null 
        })
      });

      if (!copiesResponse.ok) throw new Error('فشل في توليد النصوص الإعلانية');
      await copiesSSEPromise;

      setCurrentProgressText('جاري تجهيز استوديوهات الإنتاج الفني...');
      const campaignResponse = await api(`/campaigns/${campaignId}`);
      const campaignData = await campaignResponse.json();
      const assets = campaignData.assets || [];

      if (assets.length === 0) throw new Error('حدث خطأ ولم يتم العثور على أصول للحملة');

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        
        let generateEndpoint = '';
        let body = {};
        let mediaProcessId = '';

        if (contentType === 'image') {
          mediaProcessId = `image_${asset.id}`;
          generateEndpoint = '/campaigns/generate_image';
          
          // 👇 إذا لم يختر المستخدم منصة، نأخذ المنصة الأولى التي اختارها الذكاء الاصطناعي من النصوص
          const aiChosenPlatform = asset.ad_copy && asset.ad_copy.length > 0 ? asset.ad_copy[0].platform : "Instagram";
          const targetPlatform = selectedPlatforms.length > 0 ? selectedPlatforms[0] : aiChosenPlatform;

          body = {
            asset_id: asset.id,
            aspect_ratio: imageAspectRatio,
            platform: targetPlatform // تصحيح اسم المتغير ليتوافق مع schemas.py
          };
        } else {
          mediaProcessId = `video_${asset.id}`;
          if (videoDuration > 8) {
            generateEndpoint = '/campaigns/generate_extended_video';
          } else {
            generateEndpoint = '/campaigns/generate_video';
          }
          
          body = {
            asset_id: asset.id,
            video_duration: videoDuration,
            aspect_ratio: videoAspectRatio,
            voice_preference: "Auto"
          };
        }

        setCurrentProgressText(`[${asset.target_audience}] جاري تحضير الإنتاج...`);
        const mediaSSEPromise = listenToSSE(mediaProcessId);

        const generateResponse = await api(generateEndpoint, {
          method: 'POST',
          body: JSON.stringify(body)
        });

        if (!generateResponse.ok) throw new Error(`خطأ في إنتاج الأصل للفئة: ${asset.target_audience}`);
        
        await mediaSSEPromise;
      }
      
      setCurrentProgressText('اكتمل الإنتاج بنجاح! جاري التوجيه...');
      localStorage.setItem('contentType', contentType);
      
      setTimeout(() => {
        setShowProgressModal(false);
        router.push('/campaign-result');
      }, 1500);

    } catch (err) {
      setError(err.message);
      setShowProgressModal(false);
      setGenerating(false);
    }
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
    </div>
  );

  return (
    <>
      <GenerationProgressModal isOpen={showProgressModal} currentStatus={currentProgressText} />

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6 text-right" dir="rtl">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          
          {/* Progress Bar */}
          <div className="flex items-center justify-between bg-white p-5 rounded-3xl shadow-lg border border-white/10">
            {[
              { id: 1, name: 'رفع الصورة', status: 'done' },
              { id: 2, name: 'بيانات المنتج', status: 'done' },
              { id: 3, name: 'تحليل الجمهور', status: 'done' },
              { id: 4, name: 'تحديد الاستراتيجية', status: 'active' },
              { id: 5, name: 'توليد الإعلان', status: 'pending' }
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

          {/* ملخص الاستراتيجية */}
          {campaign && (
            <div className="bg-panel/50 backdrop-blur-sm rounded-[2.5rem] p-10 border border-border-color">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                  <ClipboardDocumentListIcon className="w-7 h-7 text-green-400" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">استراتيجية الحملة المعتمدة</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <span className="text-xl font-black text-green-400/80 uppercase tracking-[0.1em]">عنوان الحملة</span>
                  <p className="text-lg font-bold text-white leading-tight">{campaign.name}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-xl font-black text-green-400/80 uppercase tracking-[0.1em]">الهدف التسويقي</span>
                  <p className="text-lg font-bold text-white leading-tight">{campaign.objective}</p>
                </div>
              </div>
            </div>
          )}

          {/* 1. اختيار الجمهور */}
          <div className="bg-panel/50 backdrop-blur-sm rounded-[2.5rem] p-10 border border-border-color">
            <div className="flex items-center gap-3 mb-8">
              <CursorArrowRaysIcon className="w-6 h-6 text-green-400" />
              <h3 className="text-xl font-black text-white">1. حدد الجمهور المستهدف للإطلاق</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {getAudiences().map((audience, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleAudience(audience.name)}
                  className={`group p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedAudiences.includes(audience.name) 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-border-color bg-panel/30 hover:border-green-500/50'
                  }`}
                >
                  <div className="flex flex-col gap-4">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                      selectedAudiences.includes(audience.name) ? 'border-green-500' : 'border-border-color'
                    }`}>
                      {selectedAudiences.includes(audience.name) && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                    </div>
                    <div>
                      <h4 className={`font-black text-md mb-2 ${selectedAudiences.includes(audience.name) ? 'text-green-400' : 'text-white'}`}>
                        {audience.name}
                      </h4>
                      <p className={`text-xs font-medium leading-relaxed ${selectedAudiences.includes(audience.name) ? 'text-white/60' : 'text-text-muted'}`}>
                        {audience.reason}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 2. شكل المحتوى */}
            <div className="bg-panel/50 backdrop-blur-sm rounded-[2.5rem] p-10 border border-border-color">
              <h3 className="text-lg font-black text-white mb-8 flex items-center gap-2">
                <PhotoIcon className="w-5 h-5 text-green-400" /> 2. شكل المحتوى
              </h3>
              <div className="grid grid-cols-2 gap-5">
                {[
                  { id: 'image', name: 'صور احترافية', icon: PhotoIcon },
                  { id: 'video', name: 'فيديو إبداعي', icon: VideoCameraIcon }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setContentType(type.id)}
                    className={`p-8 rounded-3xl border-2 flex flex-col items-center gap-4 transition-all ${
                      contentType === type.id ? 'border-green-500 bg-green-500/10' : 'border-border-color bg-panel/30 hover:border-green-500/50'
                    }`}
                  >
                    <type.icon className={`w-10 h-10 ${contentType === type.id ? 'text-green-400' : 'text-text-muted'}`} />
                    <span className={`font-black text-sm ${contentType === type.id ? 'text-white' : 'text-text-muted'}`}>{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. منصات النشر */}
            <div className="bg-panel/50 backdrop-blur-sm rounded-[2.5rem] p-10 border border-border-color">
              {/* التحديث هنا: زر دع الذكاء الاصطناعي يختار */}
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <RocketLaunchIcon className="w-5 h-5 text-green-400" /> 3. منصات النشر
                </h3>
                <button
                  onClick={() => setSelectedPlatforms([])}
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-all flex items-center gap-2 ${
                    selectedPlatforms.length === 0 
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' 
                      : 'bg-white/5 text-gray-400 hover:text-white border border-gray-700'
                  }`}
                >
                  <SparklesIcon className="w-4 h-4" />
                  دع الذكاء يختار المنصة
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {platformsList.map(p => {
                  const Icon = p.icon;
                  const isSelected = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                        isSelected ? 'border-green-500 bg-green-500/10' : 'border-border-color bg-panel/30 hover:border-green-500/50'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-green-400' : 'text-text-muted'}`} />
                      <span className={`text-[11px] font-black ${isSelected ? 'text-white' : 'text-text-muted'}`}>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* خيارات الأبعاد والمدة للصور والفيديو */}
          {contentType === 'image' && (
            <div className="bg-panel/50 backdrop-blur-sm rounded-[2.5rem] p-10 border border-border-color">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                <PhotoIcon className="w-5 h-5 text-green-400" /> أبعاد الصورة
              </h3>
              <div className="flex flex-wrap gap-4">
                {aspectRatios.map(ratio => (
                  <button
                    key={ratio.id}
                    onClick={() => setImageAspectRatio(ratio.id)}
                    className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                      imageAspectRatio === ratio.id
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-panel/30 border border-border-color text-text-muted hover:border-green-500/50'
                    }`}
                  >
                    {ratio.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {contentType === 'video' && (
            <div className="bg-panel/50 backdrop-blur-sm rounded-[2.5rem] p-10 border border-border-color">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                <VideoCameraIcon className="w-5 h-5 text-green-400" /> إعدادات الفيديو
              </h3>
              <div className="space-y-6">
                <div>
                  <p className="text-white/70 font-bold text-sm mb-3">المدة</p>
                  <div className="flex flex-wrap gap-4">
                    {videoDurations.map(dur => (
                      <button
                        key={dur.id}
                        onClick={() => setVideoDuration(dur.id)}
                        className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                          videoDuration === dur.id
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'bg-panel/30 border border-border-color text-text-muted hover:border-green-500/50'
                        }`}
                      >
                        {dur.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-white/70 font-bold text-sm mb-3">نسبة الأبعاد</p>
                  <div className="flex flex-wrap gap-4">
                    {aspectRatios.slice(1).map(ratio => (
                      <button
                        key={ratio.id}
                        onClick={() => setVideoAspectRatio(ratio.id)}
                        className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                          videoAspectRatio === ratio.id
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'bg-panel/30 border border-border-color text-text-muted hover:border-green-500/50'
                        }`}
                      >
                        {ratio.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* أزرار الإجراءات */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-row justify-center items-center gap-6">
              <button onClick={() => router.push('/analyze-product')} className="text-text-muted hover:text-green-400 font-black text-sm flex items-center gap-2 transition-all">
                <ArrowLeftIcon className="w-4 h-4 rotate-180" /> رجوع للخطوة السابقة
              </button>
              
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="group relative bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg hover:from-green-700 hover:to-emerald-700 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {generating ? <LoadingSpinner size="sm" /> : (
                  <>توليد وإطلاق الحملة <RocketLaunchIcon className="w-5 h-5 group-hover:translate-x-[-4px] group-hover:translate-y-[-4px] transition-transform" /></>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-3xl text-sm font-black text-center">{error}</div>
          )}
        </div>
      </div>
    </>
  );
}