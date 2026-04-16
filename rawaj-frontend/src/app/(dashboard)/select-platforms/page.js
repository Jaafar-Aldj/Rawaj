'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  PhotoIcon,
  VideoCameraIcon,
  ClipboardDocumentListIcon,
  RocketLaunchIcon,
  CursorArrowRaysIcon
} from '@heroicons/react/24/outline';
import { FaFacebook, FaInstagram, FaTwitter, FaSnapchatGhost, FaTiktok, FaLinkedin } from 'react-icons/fa';

const platformsList = [
  { id: 'facebook', name: 'فيسبوك', icon: FaFacebook },
  { id: 'instagram', name: 'انستغرام', icon: FaInstagram },
  { id: 'twitter', name: 'اكس', icon: FaTwitter },
  { id: 'snapchat', name: 'سناب شات', icon: FaSnapchatGhost },
  { id: 'tiktok', name: 'تيك توك', icon: FaTiktok },
  { id: 'linkedin', name: 'لينكد إن', icon: FaLinkedin },
];

const aspectRatios = [
  { id: '1:1', name: 'مربع 1:1' },
  { id: '16:9', name: 'أفقي 16:9' },
  { id: '9:16', name: 'عمودي 9:16' },
];

const videoAspectRatios = [
  { id: '16:9', name: 'أفقي 16:9' },
  { id: '9:16', name: 'عمودي 9:16' },
];

const videoDurations = [
  { id: 8, name: '8 ثواني' },
  { id: 16, name: '16 ثانية' },
  { id: 24, name: '24 ثانية' },
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
  const [videoDuration, setVideoDuration] = useState(16);
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

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

  const handleGenerate = async () => {
    if (selectedAudiences.length === 0) {
      setError('يرجى اختيار فئة مستهدفة');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError('يرجى اختيار منصة واحدة على الأقل');
      return;
    }
    if (!contentType) {
      setError('يرجى اختيار نوع المحتوى');
      return;
    }

    const campaignId = localStorage.getItem('campaignId');
    setGenerating(true);
    setError('');
    setGenerationProgress('جاري تحضير النصوص الإعلانية...');

    try {
      // 1. توليد النصوص الإعلانية
      const copiesResponse = await api('/campaigns/generate_copies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: parseInt(campaignId),
          selected_audiences: selectedAudiences,
          selected_platforms: selectedPlatforms
        })
      });

      if (!copiesResponse.ok) throw new Error('فشل في معالجة البيانات');

      // 2. جلب الحملة للحصول على الأصول
      const campaignResponse = await api(`/campaigns/${campaignId}`);
      const campaignData = await campaignResponse.json();
      const assets = campaignData.assets || [];

      if (assets.length === 0) throw new Error('لم يتم العثور على أصول للحملة');

      // 3. توليد المحتوى لكل أصل (بدون مودال ستريم)
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        setGenerationProgress(`جاري توليد ${contentType === 'image' ? 'الصورة' : 'الفيديو'} ${i + 1} من ${assets.length}...`);

        let generateEndpoint = '';
        let body = {};

        if (contentType === 'image') {
          generateEndpoint = '/campaigns/generate_image';
          body = {
            asset_id: asset.id,
            aspect_ratio: imageAspectRatio,
            platforms: selectedPlatforms[0]
          };
        } else {
          generateEndpoint = '/campaigns/generate_video';
          body = {
            asset_id: asset.id,
            video_duration: videoDuration,
            aspect_ratio: videoAspectRatio
          };
        }

        const generateResponse = await api(generateEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!generateResponse.ok) throw new Error(`خطأ في إنتاج الأصل رقم ${i + 1}`);
      }
      
      localStorage.setItem('contentType', contentType);
      router.push('/campaign-result');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
      setGenerationProgress('');
    }
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
    </div>
  );

  return (
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

        {/* اختيار الجمهور */}
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

        {/* اختيار نوع المحتوى + الأبعاد/المدة */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

          <div className="bg-panel/50 backdrop-blur-sm rounded-[2.5rem] p-10 border border-border-color">
            <h3 className="text-lg font-black text-white mb-8 flex items-center gap-2">
              <RocketLaunchIcon className="w-5 h-5 text-green-400" /> 3. منصات النشر
            </h3>
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

        {/* خيارات الأبعاد والمدة */}
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
                  {videoAspectRatios.map(ratio => (
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

        {/* أزرار الإجراءات + رسالة التقدم */}
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
          {generationProgress && (
            <div className="text-green-400 text-sm font-bold bg-green-500/10 px-4 py-2 rounded-full">
              {generationProgress}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-3xl text-sm font-black text-center">{error}</div>
        )}
      </div>
    </div>
  );
}