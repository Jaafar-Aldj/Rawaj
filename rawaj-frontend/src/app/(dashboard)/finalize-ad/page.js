// src/app/(dashboard)/finalize-ad/page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  VideoCameraIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  HomeIcon,
  ExclamationCircleIcon,
  BeakerIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PhotoIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function FinalizeAdPage() {
  const [finalizing, setFinalizing] = useState(false);
  const [finalizedContent, setFinalizedContent] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('finalize'); // finalize, complete
  const [campaignId, setCampaignId] = useState(null);
  const [assetId, setAssetId] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [searchingForVideo, setSearchingForVideo] = useState(false);
  const videoRef = useRef(null);
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      
      // التحقق من وجود campaignId و assetId في localStorage
      const campId = localStorage.getItem('currentCampaignId');
      const storedAssetId = localStorage.getItem('currentAssetId');
      const productImage = localStorage.getItem('productImage');
      
      console.log('📦 localStorage values in finalize:', {
        campaignId: campId,
        assetId: storedAssetId,
        productImage: productImage
      });
      
      if (!campId) {
        console.log('⚠️ لا يوجد campaignId');
        setError('لم يتم العثور على معرف الحملة. الرجاء العودة لصفحة التحليل');
        setLoading(false);
        return;
      }

      if (!storedAssetId) {
        console.log('⚠️ لا يوجد assetId');
        setError('لم يتم العثور على asset_id. الرجاء العودة لصفحة توليد الصور');
        setLoading(false);
        return;
      }

      setCampaignId(parseInt(campId));
      setAssetId(parseInt(storedAssetId));
      
      if (productImage) {
        setGeneratedImageUrl(productImage);
        console.log('📸 صورة المنتج:', productImage);
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
    if (finalizing) {
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
  }, [finalizing]);

  // دالة لجلب تفاصيل الحملة كاملة
  const fetchCampaignDetails = async (retryCount = 0) => {
    try {
      console.log(`🔍 محاولة ${retryCount + 1} لجلب تفاصيل الحملة:`, campaignId);
      
      // انتظر ثانية لكل محاولة (عدا الأولى)
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
      
      const response = await api(`/campaigns/${campaignId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 بيانات الحملة:', data);
        return data;
      }
    } catch (err) {
      console.error(`❌ فشل في جلب تفاصيل الحملة (محاولة ${retryCount + 1}):`, err);
    }
    return null;
  };

  // دالة للبحث عن الفيديو في أماكن متعددة
  const findVideoUrl = (data) => {
    // قائمة بكل الحقول الممكنة للفيديو
    const possibleFields = [
      'video_url',
      'url',
      'video',
      'videoUrl',
      'video_link',
      'videoLink',
      'asset_url',
      'assetUrl'
    ];
    
    // 1. البحث المباشر في الكائن
    for (const field of possibleFields) {
      if (data[field]) {
        console.log(`✅ found video in field: ${field}`);
        return data[field];
      }
    }
    
    // 2. البحث في data.data
    if (data.data) {
      for (const field of possibleFields) {
        if (data.data[field]) {
          console.log(`✅ found video in data.${field}`);
          return data.data[field];
        }
      }
    }
    
    // 3. البحث في video_versions
    if (data.video_versions && data.video_versions.length > 0) {
      console.log('✅ found video in video_versions');
      return data.video_versions[0].video_url || data.video_versions[0].url;
    }
    
    // 4. البحث في assets
    if (data.assets && data.assets.length > 0) {
      const videoAsset = data.assets.find(a => 
        a.type === 'video' || 
        a.video_url || 
        a.url?.includes('.mp4') ||
        a.video
      );
      if (videoAsset) {
        console.log('✅ found video in assets');
        return videoAsset.video_url || videoAsset.url || videoAsset.video;
      }
    }
    
    return null;
  };

  const handleFinalize = async () => {
    if (!campaignId) {
      setError('لم يتم العثور على معرف الحملة');
      return;
    }

    if (!assetId) {
      setError('لم يتم العثور على asset_id. الرجاء العودة لصفحة توليد الصور');
      return;
    }

    console.log('📦 استخدام asset_id من API:', assetId);

    setFinalizing(true);
    setError('');
    setProgress(0);
    setDebugInfo(null);

    try {
      const requestData = {
        asset_id: assetId // استخدام asset_id من API (القيمة الحقيقية)
      };

      console.log('📤 إرسال طلب Finalize:', requestData);

      const response = await api('/campaigns/finalize', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 حالة الاستجابة:', response.status);

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { text: await response.text() };
      }
      
      console.log('📦 بيانات الاستجابة:', responseData);
      
      // حفظ معلومات التصحيح
      setDebugInfo({
        status: response.status,
        statusText: response.statusText,
        request: requestData,
        response: responseData,
        assetIdUsed: assetId,
        campaignId: campaignId
      });

      // معالجة حالة "Asset already approved"
      if (response.status === 400 && responseData.detail === "Asset already approved") {
        console.log('✅ Asset already approved - نعتبره نجاح');
        
        setSearchingForVideo(true);
        
        // نحاول جلب الفيديو من الحملة
        let videoUrl = null;
        let campaignData = null;
        
        // عدة محاولات لجلب الفيديو
        for (let i = 0; i < 3; i++) {
          campaignData = await fetchCampaignDetails(i);
          if (campaignData) {
            videoUrl = findVideoUrl(campaignData);
            if (videoUrl) break;
          }
        }
        
        setSearchingForVideo(false);
        
        setFinalizedContent({
          video_url: videoUrl,
          image_url: generatedImageUrl,
          message: videoUrl ? 'تم العثور على الفيديو' : 'تمت الموافقة على الـ asset مسبقاً ولكن لم يتم العثور على الفيديو',
          detail: responseData.detail,
          asset_id_used: assetId,
          campaign_id: campaignId,
          campaign_data: campaignData
        });
        
        setProgress(100);
        setTimeout(() => {
          setStep('complete');
        }, 500);
        return;
      }

      // معالجة الاستجابة الناجحة (200 OK)
      if (response.ok || response.status === 200) {
        console.log('✅ تم إنشاء الفيديو بنجاح');
        
        // البحث المباشر في responseData
        let videoUrl = findVideoUrl(responseData);
        
        // إذا ما لقينا، نجيب تفاصيل الحملة
        if (!videoUrl) {
          setSearchingForVideo(true);
          console.log('🔍 لم يتم العثور على رابط الفيديو، نحاول جلب تفاصيل الحملة');
          
          // عدة محاولات لجلب الفيديو
          for (let i = 0; i < 3; i++) {
            const campaignData = await fetchCampaignDetails(i);
            if (campaignData) {
              videoUrl = findVideoUrl(campaignData);
              if (videoUrl) break;
            }
          }
          
          setSearchingForVideo(false);
        }
        
        // تخزين الرابط إذا وجد
        if (videoUrl) {
          localStorage.setItem('generatedVideoUrl', videoUrl);
          console.log('✅ تم تخزين رابط الفيديو:', videoUrl);
        } else {
          console.log('⚠️ لم يتم العثور على رابط الفيديو');
        }
        
        setFinalizedContent({
          video_url: videoUrl,
          image_url: generatedImageUrl,
          asset_id_used: assetId,
          campaign_id: campaignId,
          ...responseData
        });
        
        setProgress(100);
        setTimeout(() => {
          setStep('complete');
        }, 500);
        return;
      }

      // إذا كان هناك خطأ آخر
      throw new Error(responseData.detail || responseData.message || `فشل في إنهاء الحملة (${response.status})`);

    } catch (err) {
      console.error('❌ خطأ:', err);
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadVideo = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `advertisement-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRetry = () => {
    setStep('finalize');
    setFinalizedContent(null);
    setError('');
  };

  const handleBack = () => {
    router.push('/generate-ad');
  };

  const handleDone = () => {
    // مسح البيانات المؤقتة
    localStorage.removeItem('currentProductId');
    localStorage.removeItem('selectedAudience');
    localStorage.removeItem('currentCampaignId');
    localStorage.removeItem('currentAssetId');
    
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
          <h1 className="text-3xl font-bold text-white mb-2">توليد الفيديو الإعلاني</h1>
          <p className="text-text-muted">
            {campaignId ? `معرف الحملة: ${campaignId}` : ''}
          </p>
          {assetId && (
            <p className="text-accent text-sm mt-1">✅ asset_id من API: {assetId}</p>
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
              step === 'complete' ? 'bg-accent' : 'bg-accent'
            }`}>
              4
            </div>
            <span className="text-white text-sm">توليد الفيديو</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Step 1: Finalize */}
          {step === 'finalize' && (
            <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden">
              <div className="p-12 text-center">
                <div className="relative">
                  <div className="w-32 h-32 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    {finalizing ? (
                      <ArrowPathIcon className="w-16 h-16 text-accent animate-spin" />
                    ) : (
                      <VideoCameraIcon className="w-16 h-16 text-accent animate-pulse" />
                    )}
                  </div>
                  
                  {finalizing ? (
                    <>
                      <h3 className="text-2xl font-bold text-white mb-3">جاري توليد الفيديو...</h3>
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
                      <h3 className="text-2xl font-bold text-white mb-3">توليد الفيديو الإعلاني</h3>
                      <p className="text-text-muted mb-8 max-w-md mx-auto">
                        سيتم إنشاء فيديو إعلاني مخصص لحملتك باستخدام asset_id: {assetId}
                      </p>
                      
                      {/* معلومات التصحيح */}
                      <div className="bg-background/50 rounded-xl p-4 mb-8 max-w-md mx-auto text-right border border-border-color">
                        <p className="text-accent text-sm mb-2">🔧 معلومات التصحيح:</p>
                        <p className="text-xs text-text-muted">campaign_id: {campaignId}</p>
                        <p className="text-xs text-text-muted">asset_id من API: {assetId}</p>
                        {generatedImageUrl && (
                          <p className="text-xs text-blue-400 break-all mt-2">صورة المنتج: {generatedImageUrl}</p>
                        )}
                      </div>
                      
                      <button
                        onClick={handleFinalize}
                        disabled={finalizing}
                        className="bg-gradient-to-l from-accent to-blue-500 text-white px-10 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-accent/30 transition-all transform hover:scale-105 flex items-center justify-center gap-3 mx-auto text-lg"
                      >
                        <VideoCameraIcon className="w-5 h-5" />
                        <span>بدء توليد الفيديو</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Complete */}
          {step === 'complete' && finalizedContent && (
            <>
              {/* Success/Info Message */}
              <div className={`${finalizedContent.video_url ? 'bg-green-500/20 border-green-500' : 'bg-yellow-500/20 border-yellow-500'} border-2 rounded-2xl p-6 text-center`}>
                {finalizedContent.video_url ? (
                  <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                ) : (
                  <ExclamationCircleIcon className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                )}
                <h2 className="text-2xl font-bold text-white mb-2">
                  {finalizedContent.video_url ? '🎉 تم إنشاء الفيديو!' : '⚠️ لم يتم العثور على الفيديو'}
                </h2>
                <p className="text-text-muted">{finalizedContent.message || 'الحملة مكتملة'}</p>
                <p className="text-xs text-accent mt-2">asset_id المستخدم: {finalizedContent.asset_id_used}</p>
              </div>

              {/* Searching indicator */}
              {searchingForVideo && (
                <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 animate-pulse" />
                    <p className="text-blue-500">جاري البحث عن الفيديو...</p>
                  </div>
                </div>
              )}

              {/* Video Player */}
              {finalizedContent.video_url && (
                <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border-2 border-accent/30 shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-l from-accent/20 to-transparent p-6 border-b border-border-color">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-accent/10 rounded-2xl">
                          <VideoCameraIcon className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">الفيديو الإعلاني</h2>
                          <p className="text-text-muted text-sm">تم الإنشاء بنجاح</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadVideo(finalizedContent.video_url)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-xl hover:bg-accent/40 transition-all"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5 text-accent" />
                        <span className="text-accent">تحميل</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                      <video
                        ref={videoRef}
                        src={finalizedContent.video_url}
                        className="w-full h-full"
                        poster={finalizedContent.image_url}
                        controls
                        autoPlay={false}
                      />
                    </div>
                    
                    {/* Video info */}
                    <div className="mt-4 text-sm text-text-muted text-center p-4 bg-background/50 rounded-xl">
                      <p className="text-xs text-blue-400 break-all">
                        🔗 {finalizedContent.video_url}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* If no video, show image and retry button */}
              {!finalizedContent.video_url && finalizedContent.image_url && (
                <>
                  <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-l from-accent/20 to-transparent p-6 border-b border-border-color">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-accent/10 rounded-2xl">
                          <PhotoIcon className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">الصورة المولدة</h2>
                          <p className="text-text-muted text-sm">بانتظار الفيديو</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="max-w-2xl mx-auto">
                        <div className="rounded-xl overflow-hidden border-2 border-border-color">
                          <div className="aspect-video bg-background flex items-center justify-center p-4">
                            <img
                              src={finalizedContent.image_url}
                              alt="الصورة المولدة"
                              className="max-w-full max-h-[400px] object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-4">
                    <button
                      onClick={handleRetry}
                      className="bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent-dark transition-all inline-flex items-center gap-2"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                      محاولة مرة أخرى
                    </button>
                  </div>
                </>
              )}

              {/* Response Details */}
              <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-l from-accent/20 to-transparent p-6 border-b border-border-color">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-accent/10 rounded-2xl">
                      <DocumentTextIcon className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">تفاصيل استجابة الـ API</h2>
                      <p className="text-text-muted text-sm">معلومات التصحيح</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <pre className="text-xs text-text-muted bg-background/50 p-4 rounded-xl overflow-auto max-h-60">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
              <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={step === 'finalize' ? handleBack : () => setStep('finalize')}
              className="flex items-center gap-2 px-8 py-3 bg-panel border-2 border-border-color text-text-muted rounded-xl hover:border-accent hover:text-accent transition-all font-medium"
            >
              <ArrowRightIcon className="w-5 h-5" />
              <span>{step === 'finalize' ? 'السابق' : 'رجوع'}</span>
            </button>
            
            {step === 'complete' ? (
              <button
                onClick={handleDone}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-l from-accent to-blue-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-accent/30 transition-all transform hover:scale-105"
              >
                <HomeIcon className="w-5 h-5" />
                <span>الرئيسية</span>
              </button>
            ) : (
              <div className="w-32"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}