// src/app/(dashboard)/analyze-product/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  UsersIcon, 
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExclamationCircleIcon,
  BeakerIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  HeartIcon,
  BriefcaseIcon,
  RocketLaunchIcon,
  DevicePhoneMobileIcon,
  HomeModernIcon,
  CakeIcon
} from '@heroicons/react/24/outline';

// أيقونات للفئات المختلفة
const audienceIcons = {
  'Business Professionals': BriefcaseIcon,
  'University Students': AcademicCapIcon,
  'Entrepreneurs': RocketLaunchIcon,
  'Graphic Designers & Creatives': SparklesIcon,
  'Executives': BuildingOfficeIcon,
  'Families with young children': HomeModernIcon,
  'Teenagers and young adults': RocketLaunchIcon,
  'Working professionals': BriefcaseIcon,
  'People seeking simple and natural snacks': HeartIcon,
  'Consumers who appreciate classic flavors': SparklesIcon,
  'المسافرون': GlobeAltIcon,
  'الشباب': RocketLaunchIcon,
  'رجال الأعمال': BriefcaseIcon,
  'الطلاب': AcademicCapIcon,
  'الأمهات': HeartIcon,
  'الرياضيون': SparklesIcon,
  'التقنيون': DevicePhoneMobileIcon,
  'الجميع': UsersIcon
};

// ألوان للفئات
const audienceColors = {
  'Business Professionals': 'from-blue-500 to-indigo-500',
  'University Students': 'from-orange-500 to-amber-500',
  'Entrepreneurs': 'from-purple-500 to-pink-500',
  'Graphic Designers & Creatives': 'from-green-500 to-emerald-500',
  'Executives': 'from-gray-700 to-gray-900',
  'Families with young children': 'from-green-500 to-emerald-500',
  'Teenagers and young adults': 'from-purple-500 to-pink-500',
  'Working professionals': 'from-blue-500 to-indigo-500',
  'People seeking simple and natural snacks': 'from-orange-500 to-amber-500',
  'Consumers who appreciate classic flavors': 'from-red-500 to-rose-500',
  'المسافرون': 'from-blue-500 to-cyan-500',
  'الشباب': 'from-purple-500 to-pink-500',
  'رجال الأعمال': 'from-emerald-500 to-teal-500',
  'الطلاب': 'from-orange-500 to-amber-500',
  'الأمهات': 'from-rose-500 to-red-500',
  'الرياضيون': 'from-indigo-500 to-blue-500',
  'التقنيون': 'from-gray-700 to-gray-900',
  'الجميع': 'from-accent to-blue-500'
};

export default function AnalyzeProductPage() {
  const [audiences, setAudiences] = useState([]);
  const [selectedAudience, setSelectedAudience] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [productInfo, setProductInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    const productId = localStorage.getItem('currentProductId');
    if (!productId) {
      router.push('/create-product');
    }
  }, []);

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // دالة استخراج الاقتراحات من البيانات
  const extractSuggestions = (responseData) => {
    console.log('محاولة استخراج البيانات من:', responseData);
    
    let audiencesList = [];
    
    // المسار الصحيح من الـ Debug: data.suggested_audiences.suggestions
    if (responseData?.data?.suggested_audiences?.suggestions && Array.isArray(responseData.data.suggested_audiences.suggestions)) {
      console.log('✅ found suggestions in data.suggested_audiences.suggestions');
      audiencesList = responseData.data.suggested_audiences.suggestions;
      
      // 🔥🔥🔥 حفظ campaign_id الصحيح (20) 🔥🔥🔥
      if (responseData.data.id) {
        localStorage.setItem('currentCampaignId', responseData.data.id.toString());
        console.log('✅ تم حفظ campaign_id:', responseData.data.id);
      }
    }
    // البحث في data.suggestions
    else if (responseData?.data?.suggestions && Array.isArray(responseData.data.suggestions)) {
      console.log('✅ found suggestions in data.suggestions');
      audiencesList = responseData.data.suggestions;
      
      // 🔥🔥🔥 حفظ campaign_id الصحيح 🔥🔥🔥
      if (responseData.data.id) {
        localStorage.setItem('currentCampaignId', responseData.data.id.toString());
        console.log('✅ تم حفظ campaign_id:', responseData.data.id);
      }
    }
    // البحث في suggested_audiences.suggestions
    else if (responseData?.suggested_audiences?.suggestions && Array.isArray(responseData.suggested_audiences.suggestions)) {
      console.log('✅ found suggestions in suggested_audiences.suggestions');
      audiencesList = responseData.suggested_audiences.suggestions;
      
      // 🔥🔥🔥 حفظ campaign_id الصحيح 🔥🔥🔥
      if (responseData.id) {
        localStorage.setItem('currentCampaignId', responseData.id.toString());
        console.log('✅ تم حفظ campaign_id:', responseData.id);
      }
    }
    // البحث في responseData.suggestions
    else if (responseData?.suggestions && Array.isArray(responseData.suggestions)) {
      console.log('✅ found suggestions in responseData.suggestions');
      audiencesList = responseData.suggestions;
      
      // 🔥🔥🔥 حفظ campaign_id الصحيح 🔥🔥🔥
      if (responseData.id) {
        localStorage.setItem('currentCampaignId', responseData.id.toString());
        console.log('✅ تم حفظ campaign_id:', responseData.id);
      }
    }
    
    console.log('📋 القائمة المستخرجة:', audiencesList);
    
    if (audiencesList.length === 0) {
      console.log('⚠️ لم يتم العثور على اقتراحات');
      return;
    }
    
    // تحويل القائمة إلى الشكل المطلوب
    const formattedAudiences = audiencesList.map((item, index) => ({
      id: index + 1,
      name: item.audience || item.name || `الفئة ${index + 1}`,
      description: item.reason || item.description || '',
      reason: item.reason || item.description || ''
    }));
    
    console.log('✅ القائمة النهائية:', formattedAudiences);
    setAudiences(formattedAudiences);
    
    // تخزين معلومات المنتج إذا كانت موجودة
    if (responseData?.data?.product_id) {
      setProductInfo({ id: responseData.data.product_id });
    }
  };

  const handleAnalyze = async () => {
    const productId = localStorage.getItem('currentProductId');
    if (!productId) {
      setError('لم يتم العثور على معرف المنتج');
      return;
    }

    setAnalyzing(true);
    setError('');
    setDebugInfo(null);

    try {
      console.log('جاري تحليل المنتج:', productId);
      
      const response = await api('/campaigns/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: parseInt(productId) }),
      });

      console.log('حالة الاستجابة:', response.status);

      const responseData = await response.json();
      console.log('بيانات الاستجابة:', responseData);
      
      // حفظ معلومات التصحيح
      setDebugInfo({
        status: response.status,
        data: responseData,
        type: typeof responseData
      });

      if (!response.ok) {
        // إذا كان الخطأ "Campaign already exist"
        if (responseData.detail && responseData.detail.includes('already exist')) {
          console.log('⚠️ الحملة موجودة مسبقاً، جاري استخراج البيانات');
          extractSuggestions(responseData);
        } else {
          throw new Error(responseData.detail || responseData.message || 'فشل في تحليل الجمهور');
        }
      } else {
        // إذا نجح الطلب
        extractSuggestions(responseData);
      }

    } catch (err) {
      console.error('❌ خطأ في التحليل:', err);
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectAudience = (audience) => {
    console.log('تم اختيار:', audience);
    setSelectedAudience(audience);
  };

  const handleNext = () => {
    if (!selectedAudience) {
      setError('الرجاء اختيار الفئة المستهدفة');
      return;
    }

    console.log('حفظ الفئة المختارة:', selectedAudience);
    localStorage.setItem('selectedAudience', JSON.stringify(selectedAudience));
    router.push('/generate-ad');
  };

  // عرض شاشة التحميل
  if (authLoading) {
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
          <h1 className="text-3xl font-bold text-white mb-2">اختر الجمهور المستهدف</h1>
          <p className="text-text-muted">اختر الفئة المناسبة لحملتك الإعلانية من بين الاقتراحات التالية</p>
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
          <div className="w-12 h-0.5 bg-border-color"></div>
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-8 h-8 bg-panel border border-border-color rounded-full flex items-center justify-center text-text-muted text-sm">4</div>
            <span className="text-text-muted text-sm">توليد الإعلان</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Audience Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Analysis Card */}
            <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-l from-accent/20 to-transparent p-6 border-b border-border-color">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-accent/10 rounded-2xl">
                    <UsersIcon className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">الفئات المستهدفة</h2>
                    <p className="text-text-muted text-sm">
                      {audiences.length > 0 ? `${audiences.length} اقتراحات متاحة` : 'اختر الفئة المناسبة لمنتجك'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {audiences.length === 0 ? (
                  // Analyze Button Area
                  <div className="text-center py-12">
                    <div className="relative">
                      <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <SparklesIcon className="w-12 h-12 text-accent" />
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-3">تحليل الجمهور بالذكاء الاصطناعي</h3>
                    <p className="text-text-muted mb-8 max-w-md mx-auto">
                      سنقوم بتحليل منتجك وتحديد أفضل الفئات المستهدفة لحملتك الإعلانية
                    </p>
                    
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="bg-gradient-to-l from-accent to-blue-500 text-white px-10 py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto text-lg"
                    >
                      {analyzing ? (
                        <>
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          <span>جاري التحليل...</span>
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-5 h-5" />
                          <span>ابدأ التحليل</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  // Audience Grid - عرض الاقتراحات
                  <>
                    <h3 className="text-lg font-bold text-white mb-4">اختر الفئة المستهدفة:</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {audiences.map((audience, index) => {
                        const audienceName = audience.name || audience.audience || `الفئة ${index + 1}`;
                        const Icon = audienceIcons[audienceName] || UsersIcon;
                        const isSelected = selectedAudience?.id === audience.id;
                        const colorClass = audienceColors[audienceName] || 'from-accent to-blue-500';
                        
                        return (
                          <button
                            key={audience.id || index}
                            onClick={() => handleSelectAudience(audience)}
                            className={`relative group text-right p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] overflow-hidden ${
                              isSelected
                                ? 'border-accent shadow-xl shadow-accent/20'
                                : 'border-border-color hover:border-accent/50'
                            }`}
                          >
                            {/* Background Gradient */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                            
                            <div className="relative">
                              <div className="flex items-start justify-between mb-3">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} bg-opacity-10`}>
                                  <Icon className={`w-8 h-8 ${
                                    isSelected ? 'text-accent' : 'text-white'
                                  }`} />
                                </div>
                                {isSelected && (
                                  <CheckCircleIcon className="w-6 h-6 text-accent" />
                                )}
                              </div>
                              
                              <h3 className={`text-xl font-bold mb-2 ${
                                isSelected ? 'text-accent' : 'text-white'
                              }`}>
                                {audienceName}
                              </h3>
                              
                              <p className="text-text-muted text-sm mb-3 text-right">
                                {audience.reason || audience.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-6 bg-red-500/20 border-2 border-red-500 rounded-xl p-4 flex items-center gap-3">
                    <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <p className="text-red-500">{error}</p>
                  </div>
                )}

                {/* Debug Info - للتصحيح فقط، يمكن إزالته بعد التأكد من العمل */}
                {debugInfo && (
                  <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-500 mb-2">
                      <BeakerIcon className="w-5 h-5" />
                      <span className="font-bold">معلومات التصحيح:</span>
                    </div>
                    <pre className="text-xs text-blue-400 overflow-auto max-h-60 whitespace-pre-wrap">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Selected Audience Info */}
          <div className="space-y-6">
            {selectedAudience ? (
              <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border-2 border-accent/30 shadow-2xl overflow-hidden sticky top-6">
                <div className="bg-gradient-to-br from-accent/20 to-blue-500/20 p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-accent" />
                    الفئة المختارة
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-text-muted text-sm mb-1">الفئة:</p>
                      <p className="text-white font-bold text-xl">
                        {selectedAudience.name || selectedAudience.audience}
                      </p>
                    </div>
                    
                    {selectedAudience.reason && (
                      <div>
                        <p className="text-text-muted text-sm mb-1">السبب:</p>
                        <p className="text-white">{selectedAudience.reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-panel border-t border-border-color">
                  <p className="text-xs text-text-muted text-center">
                    سيتم توليد إعلانات مخصصة لهذه الفئة
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color p-6">
                <div className="text-center">
                  <UsersIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted">اختر فئة مستهدفة لرؤية التفاصيل</p>
                  {audiences.length > 0 && (
                    <p className="text-accent text-sm mt-2">
                      {audiences.length} اقتراحات متاحة
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* AI Suggestion Card */}
            <div className="bg-gradient-to-br from-accent/20 to-blue-500/20 rounded-3xl border border-accent/30 p-6">
              <div className="flex items-center gap-2 mb-4">
                <SparklesIcon className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-white">نصيحة</h3>
              </div>
              <p className="text-text-muted text-sm">
                اختر الفئة الأكثر توافقاً مع منتجك. يمكنك تجربة أكثر من فئة لاحقاً للحصول على نتائج مختلفة.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => router.push('/create-product')}
            className="flex items-center gap-2 px-8 py-3 bg-panel border-2 border-border-color text-text-muted rounded-xl hover:border-accent hover:text-accent transition-all font-medium"
          >
            <ArrowRightIcon className="w-5 h-5" />
            <span>السابق</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={!selectedAudience}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
              selectedAudience
                ? 'bg-gradient-to-l from-accent to-blue-500 text-white hover:shadow-xl hover:shadow-accent/30 transform hover:scale-105'
                : 'bg-panel border-2 border-border-color text-text-muted cursor-not-allowed'
            }`}
          >
            <span>متابعة</span>
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}