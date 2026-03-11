// src/app/(dashboard)/generate-ad/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  SparklesIcon, 
  PhotoIcon,
  VideoCameraIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  HomeIcon,
  ExclamationCircleIcon,
  ClockIcon,
  BeakerIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export default function GenerateAdPage() {
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('generate'); // generate, preview
  const [selectedAudience, setSelectedAudience] = useState(null);
  const [campaignId, setCampaignId] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // دالة لجلب campaignId من الـ API
  const fetchCampaignId = async (productId) => {
    try {
      console.log('🔍 جاري البحث عن campaignId للمنتج:', productId);
      const response = await api(`/campaigns/product/${productId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 استجابة جلب الحملة:', data);
        
        // محاولة استخراج ID من أماكن مختلفة
        const campId = data.id || data.data?.id || data.campaign_id;
        if (campId) {
          localStorage.setItem('currentCampaignId', campId.toString());
          setCampaignId(parseInt(campId));
          console.log('✅ تم استرجاع campaignId:', campId);
          return true;
        }
      }
      console.log('❌ لم يتم العثور على campaignId');
      return false;
    } catch (err) {
      console.error('❌ فشل في جلب campaignId:', err);
      return false;
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      
      // التحقق من وجود البيانات المطلوبة
      const productId = localStorage.getItem('currentProductId');
      const audience = localStorage.getItem('selectedAudience');
      const campId = localStorage.getItem('currentCampaignId');
      
      if (!productId) {
        console.log('⚠️ لا يوجد productId');
        router.push('/create-product');
        return;
      }
      
      if (!audience) {
        console.log('⚠️ لا يوجد audience');
        router.push('/analyze-product');
        return;
      }

      // تحليل بيانات الجمهور
      try {
        const parsedAudience = JSON.parse(audience);
        setSelectedAudience(parsedAudience);
        console.log('✅ الفئة المختارة:', parsedAudience);
      } catch (e) {
        console.error('خطأ في قراءة بيانات الجمهور:', e);
        setError('خطأ في قراءة بيانات الجمهور');
      }

      // التحقق من campaignId
      if (!campId) {
        console.log('⚠️ لا يوجد campaignId في localStorage، جاري البحث...');
        const found = await fetchCampaignId(productId);
        if (!found) {
          setError('لم يتم العثور على معرف الحملة. الرجاء العودة لصفحة التحليل');
        }
      } else {
        setCampaignId(parseInt(campId));
        console.log('✅ تم تحميل campaignId:', campId);
      }

      setLoading(false);
    };

    initializePage();
  }, []);

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // محاكاة التقدم عند التوليد
  useEffect(() => {
    let interval;
    if (generating) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 5;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [generating]);

  const handleGenerateDraft = async () => {
    const productId = localStorage.getItem('currentProductId');
    let currentCampaignId = campaignId || localStorage.getItem('currentCampaignId');
    
    // التحقق من وجود campaignId
    if (!currentCampaignId) {
      setError('جاري البحث عن معرف الحملة...');
      
      // محاولة جلب الحملة من المنتج
      const found = await fetchCampaignId(productId);
      if (!found) {
        setError('لم يتم العثور على معرف الحملة. الرجاء العودة لصفحة التحليل');
        return;
      }
      currentCampaignId = localStorage.getItem('currentCampaignId');
    }

    console.log('📦 campaign_id المستخدم:', currentCampaignId);

    if (!selectedAudience) {
      setError('لم يتم العثور على الفئة المختارة');
      return;
    }

    setGenerating(true);
    setError('');
    setProgress(0);
    setDebugInfo(null);

    try {
      // تحضير البيانات للإرسال حسب الصيغة المطلوبة
      const audienceName = selectedAudience.name || selectedAudience.audience;
      const requestData = {
        campaign_id: parseInt(currentCampaignId),
        selected_audiences: [audienceName]
      };

      console.log('📤 إرسال البيانات:', requestData);
      console.log('🔑 campaign_id:', currentCampaignId);
      console.log('👥 selected_audience:', audienceName);

      const response = await api('/campaigns/generate_drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 حالة الاستجابة:', response.status);

      const responseData = await response.json();
      console.log('📦 بيانات الاستجابة:', responseData);
      
      // معالجة المصفوفة - نأخذ أول عنصر
      let processedContent = responseData;
      
      // إذا كانت الاستجابة مصفوفة، نأخذ أول عنصر
      if (Array.isArray(responseData) && responseData.length > 0) {
        console.log('✅ الاستجابة هي مصفوفة، نأخذ أول عنصر');
        processedContent = responseData[0];
      }
      
      console.log('📦 المحتوى المعالج:', processedContent);
      console.log('✅ رابط الصورة:', processedContent.image_url);
      
      // 🔥🔥🔥 الأهم: تخزين asset_id من API (القيمة الحقيقية)
      if (processedContent && processedContent.id) {
        localStorage.setItem('currentAssetId', processedContent.id.toString());
        console.log('✅ تم تخزين asset_id من API:', processedContent.id);
      } else {
        console.log('⚠️ لم يتم العثور على asset_id في الاستجابة');
      }
      
      // حفظ معلومات التصحيح
      setDebugInfo({
        status: response.status,
        request: requestData,
        response: responseData,
        processedContent: processedContent,
        imageUrl: processedContent.image_url,
        targetAudience: processedContent.target_audience,
        id: processedContent.id,
        hasImage: !!processedContent.image_url
      });

      if (!response.ok) {
        throw new Error(responseData.detail || responseData.message || 'فشل في توليد الإعلان');
      }
      
      setGeneratedContent(processedContent);
      setProgress(100);
      
      // تأخير بسيط قبل الانتقال للخطوة التالية
      setTimeout(() => {
        setStep('preview');
      }, 500);

    } catch (err) {
      console.error('❌ خطأ في التوليد:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadImage = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNext = () => {
    router.push('/finalize-ad');
  };

  const handleBack = () => {
    router.push('/analyze-product');
  };

  const handleDone = () => {
    router.push('/dashboard');
  };

  // عرض شاشة التحميل
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-text-muted mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">توليد الإعلان</h1>
          <p className="text-text-muted">
            {selectedAudience ? `للفئة: ${selectedAudience.name || selectedAudience.audience}` : ''}
          </p>
          {campaignId && (
            <p className="text-accent text-sm mt-1">✅ معرف الحملة: {campaignId}</p>
          )}
          {!campaignId && (
            <p className="text-red-500 text-sm mt-1">⚠️ لا يوجد معرف حملة</p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
            <span className="text-white text-sm">رفع الصورة</span>
          </div>
          <div className="w-12 h-0.5 bg-accent"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
            <span className="text-white text-sm">بيانات المنتج</span>
          </div>
          <div className="w-12 h-0.5 bg-accent"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
            <span className="text-white text-sm">اختر الجمهور</span>
          </div>
          <div className="w-12 h-0.5 bg-accent"></div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
              step === 'preview' ? 'bg-accent' : 'bg-accent'
            }`}>
              4
            </div>
            <span className="text-white text-sm">توليد الإعلان</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Step 1: Generate Draft */}
          {step === 'generate' && (
            <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden">
              <div className="p-12 text-center">
                <div className="relative">
                  <div className="w-32 h-32 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    {generating ? (
                      <ArrowPathIcon className="w-16 h-16 text-accent animate-spin" />
                    ) : (
                      <SparklesIcon className="w-16 h-16 text-accent animate-pulse" />
                    )}
                  </div>
                  
                  {generating ? (
                    <>
                      <h3 className="text-2xl font-bold text-white mb-3">جاري توليد الصور...</h3>
                      <p className="text-text-muted mb-8">قد تستغرق العملية بضع ثوانٍ</p>
                      <div className="max-w-md mx-auto">
                        <div className="relative h-3 bg-background rounded-full overflow-hidden mb-4">
                          <div 
                            className="absolute right-0 top-0 h-full bg-gradient-to-l from-accent to-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-accent text-sm mb-4">{progress}%</p>
                        <LoadingSpinner size="md" />
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-white mb-3">توليد الصور الإعلانية</h3>
                      <p className="text-text-muted mb-8 max-w-md mx-auto">
                        سيتم إنشاء صور مخصصة لحملتك باستخدام الذكاء الاصطناعي للفئة: 
                        <span className="text-accent block mt-2 font-bold text-xl">
                          {selectedAudience?.name || selectedAudience?.audience}
                        </span>
                      </p>
                      
                      <button
                        onClick={handleGenerateDraft}
                        disabled={!campaignId || generating}
                        className={`bg-gradient-to-l from-accent to-blue-500 text-white px-10 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-accent/30 transition-all transform hover:scale-105 flex items-center justify-center gap-3 mx-auto text-lg ${
                          (!campaignId || generating) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <PhotoIcon className="w-5 h-5" />
                        <span>بدء توليد الصور</span>
                      </button>

                      {!campaignId && (
                        <p className="text-red-500 mt-4">⚠️ لا يوجد معرف حملة. الرجاء العودة لصفحة التحليل</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview Generated Images */}
          {step === 'preview' && generatedContent && (
            <>
              {/* Generated Image */}
              <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-l from-accent/20 to-transparent p-6 border-b border-border-color">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-accent/10 rounded-2xl">
                        <PhotoIcon className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">الصورة المولدة</h2>
                        <p className="text-text-muted text-sm">تم إنشاء الصورة بنجاح</p>
                      </div>
                    </div>
                    <div className="bg-green-500/20 px-4 py-2 rounded-xl border border-green-500/30">
                      <span className="text-green-500 font-semibold flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4" />
                        تم التوليد
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* عرض الصورة من الرابط الحقيقي */}
                  {generatedContent.image_url && (
                    <div className="max-w-2xl mx-auto">
                      <div className="relative group rounded-xl overflow-hidden border-2 border-border-color">
                        <div className="aspect-video bg-background flex items-center justify-center p-4">
                          <img
                            src={generatedContent.image_url}
                            alt={generatedContent.target_audience || "الصورة المولدة"}
                            className="max-w-full max-h-[400px] object-contain"
                            onError={(e) => {
                              console.error('❌ خطأ في تحميل الصورة:', e);
                              e.target.src = 'https://via.placeholder.com/400x300?text=Image+not+found';
                            }}
                            onLoad={() => console.log('✅ تم تحميل الصورة بنجاح:', generatedContent.image_url)}
                          />
                        </div>
                        
                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <a
                            href={generatedContent.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-accent rounded-full hover:scale-110 transition-transform"
                          >
                            <EyeIcon className="w-6 h-6 text-white" />
                          </a>
                          <button
                            onClick={() => handleDownloadImage(generatedContent.image_url)}
                            className="p-3 bg-accent rounded-full hover:scale-110 transition-transform"
                          >
                            <ArrowDownTrayIcon className="w-6 h-6 text-white" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Image info */}
                      <div className="mt-4 text-sm text-text-muted text-center space-y-2">
                        <p className="text-accent font-bold">✅ تم توليد الصورة بنجاح</p>
                        {generatedContent.target_audience && (
                          <p className="bg-accent/10 px-3 py-1 rounded-full inline-block">
                            🎯 {generatedContent.target_audience}
                          </p>
                        )}
                        <div className="flex justify-center gap-4">
                          {generatedContent.id && (
                            <p className="text-xs bg-panel px-2 py-1 rounded">🆔 asset_id: {generatedContent.id}</p>
                          )}
                          {generatedContent.campaign_id && (
                            <p className="text-xs bg-panel px-2 py-1 rounded">📢 حملة {generatedContent.campaign_id}</p>
                          )}
                        </div>
                        <p className="text-xs text-blue-400 break-all mt-2 p-2 bg-background/50 rounded">
                          🔗 {generatedContent.image_url}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ad Copy */}
              {generatedContent.ad_copy && generatedContent.ad_copy.length > 0 && (
                <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-l from-accent/20 to-transparent p-6 border-b border-border-color">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-accent/10 rounded-2xl">
                        <DocumentTextIcon className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">النصوص الإعلانية</h2>
                        <p className="text-text-muted text-sm">مقترحات لمنصات التواصل</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-4">
                      {generatedContent.ad_copy.map((ad, index) => (
                        <div key={index} className="bg-background/50 rounded-xl p-4 border border-border-color">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-accent text-sm font-semibold">📱 {ad.platform}</span>
                          </div>
                          <p className="text-text-muted leading-relaxed whitespace-pre-line">
                            {ad.ad_copy}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
              <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {/* Debug Info */}
          {debugInfo && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-500 mb-2">
                <BeakerIcon className="w-5 h-5" />
                <span className="font-bold">معلومات التصحيح:</span>
              </div>
              <pre className="text-xs text-blue-400 overflow-auto max-h-40 whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={step === 'generate' ? handleBack : () => setStep('generate')}
              className="flex items-center gap-2 px-8 py-3 bg-panel border-2 border-border-color text-text-muted rounded-xl hover:border-accent hover:text-accent transition-all font-medium"
            >
              <ArrowRightIcon className="w-5 h-5" />
              <span>{step === 'generate' ? 'السابق' : 'رجوع'}</span>
            </button>
            
            {step === 'preview' ? (
              <div className="flex gap-3">
                <button
                  onClick={handleDone}
                  className="flex items-center gap-2 px-8 py-3 bg-panel border-2 border-border-color text-text-muted rounded-xl hover:border-accent hover:text-accent transition-all font-medium"
                >
                  <HomeIcon className="w-5 h-5" />
                  <span>الرئيسية</span>
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-l from-accent to-blue-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-accent/30 transition-all transform hover:scale-105"
                >
                  <span>متابعة للفيديو</span>
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="w-32"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}