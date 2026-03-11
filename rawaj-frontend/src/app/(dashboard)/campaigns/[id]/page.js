// src/app/(dashboard)/campaigns/[id]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { 
  MegaphoneIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  CalendarIcon,
  UserGroupIcon,
  SparklesIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { PlayIcon as PlayIconSolid } from '@heroicons/react/24/solid';

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params.id;
  
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, images, videos, copies
  const videoRef = useState(null);
  
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && campaignId) {
      fetchCampaignDetails();
    }
  }, [isAuthenticated, campaignId]);

  const fetchCampaignDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log(`🔍 جاري جلب تفاصيل الحملة: ${campaignId}`);
      const response = await api(`/campaigns/${campaignId}`);
      
      if (!response.ok) {
        throw new Error('فشل في جلب تفاصيل الحملة');
      }
      
      const data = await response.json();
      console.log('📦 بيانات الحملة:', data);
      
      setCampaign(data);
      
      // اختيار أول أصل كالمحدد افتراضياً
      if (data.assets && data.assets.length > 0) {
        setSelectedAsset(data.assets[0]);
      }
    } catch (err) {
      console.error('❌ خطأ في جلب تفاصيل الحملة:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // الحصول على حالة الحملة
  const getCampaignStatus = () => {
    if (!campaign) return { text: '', color: '', bg: '', icon: null };
    
    switch (campaign.status) {
      case 'DRAFT':
        return { 
          text: 'مسودة', 
          color: 'text-gray-400', 
          bg: 'bg-gray-500/10', 
          icon: DocumentTextIcon,
          borderColor: 'border-gray-500/30'
        };
      case 'PENDING_APPROVAL':
        return { 
          text: 'قيد المراجعة', 
          color: 'text-yellow-500', 
          bg: 'bg-yellow-500/10', 
          icon: ClockIcon,
          borderColor: 'border-yellow-500/30'
        };
      case 'COMPLETED':
        return { 
          text: 'مكتملة', 
          color: 'text-green-500', 
          bg: 'bg-green-500/10', 
          icon: CheckCircleIcon,
          borderColor: 'border-green-500/30'
        };
      default:
        return { 
          text: campaign.status || 'غير معروف', 
          color: 'text-gray-500', 
          bg: 'bg-gray-500/10', 
          icon: DocumentTextIcon,
          borderColor: 'border-gray-500/30'
        };
    }
  };

  // تنسيق التاريخ
  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // تحميل الصورة
  const handleDownloadImage = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // عرض شاشة التحميل
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-text-muted mt-4">جاري تحميل تفاصيل الحملة...</p>
        </div>
      </div>
    );
  }

  // عرض خطأ
  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-muted hover:text-accent transition-all mb-6"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>رجوع</span>
          </button>
          
          <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color p-12 text-center">
            <ExclamationCircleIcon className="w-20 h-20 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">خطأ في تحميل الحملة</h2>
            <p className="text-text-muted mb-6">{error || 'الحملة غير موجودة'}</p>
            <Link
              href="/camp"
              className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-xl font-bold hover:bg-accent-dark transition-all"
            >
              <MegaphoneIcon className="w-5 h-5" />
              <span>العودة للحملات</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = getCampaignStatus();
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-muted hover:text-accent transition-all mb-6"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>رجوع إلى الحملات</span>
        </button>

        {/* Header */}
        <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden mb-6">
          <div className="bg-gradient-to-l from-accent/20 to-transparent p-6 border-b border-border-color">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-accent/10 rounded-2xl">
                  <MegaphoneIcon className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {campaign.target_audience || `حملة ${campaign.id}`}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className={`${status.bg} ${status.color} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 border ${status.borderColor}`}>
                      {StatusIcon && <StatusIcon className="w-4 h-4" />}
                      {status.text}
                    </span>
                    <span className="text-text-muted flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {formatDate(campaign.created_at)}
                    </span>
                    <span className="text-text-muted">ID: {campaign.id}</span>
                  </div>
                </div>
              </div>
              
              <Link
                href={`/generate-ad`}
                className="flex items-center gap-2 bg-gradient-to-r from-accent to-accent-dark text-white font-bold py-3 px-6 rounded-xl hover:shadow-xl hover:shadow-accent/30 transition-all transform hover:scale-105"
              >
                <SparklesIcon className="w-5 h-5" />
                <span>إنشاء إعلان جديد</span>
              </Link>
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background/50 rounded-xl p-4 border border-border-color">
              <div className="flex items-center gap-3 mb-2">
                <PhotoIcon className="w-5 h-5 text-accent" />
                <span className="text-text-muted text-sm">الصور</span>
              </div>
              <p className="text-2xl font-bold text-white">{campaign.assets?.length || 0}</p>
            </div>
            
            <div className="bg-background/50 rounded-xl p-4 border border-border-color">
              <div className="flex items-center gap-3 mb-2">
                <VideoCameraIcon className="w-5 h-5 text-accent" />
                <span className="text-text-muted text-sm">الفيديوهات</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {campaign.assets?.filter(a => a.video_url).length || 0}
              </p>
            </div>
            
            <div className="bg-background/50 rounded-xl p-4 border border-border-color">
              <div className="flex items-center gap-3 mb-2">
                <DocumentTextIcon className="w-5 h-5 text-accent" />
                <span className="text-text-muted text-sm">النصوص</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {campaign.assets?.reduce((acc, a) => acc + (a.ad_copy?.length || 0), 0)}
              </p>
            </div>
            
            <div className="bg-background/50 rounded-xl p-4 border border-border-color">
              <div className="flex items-center gap-3 mb-2">
                <UserGroupIcon className="w-5 h-5 text-accent" />
                <span className="text-text-muted text-sm">الفئات</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {campaign.suggested_audiences?.suggestions?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color shadow-2xl overflow-hidden mb-6">
          <div className="border-b border-border-color">
            <div className="flex gap-2 p-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'overview' 
                    ? 'bg-accent text-white' 
                    : 'text-text-muted hover:text-accent hover:bg-accent/10'
                }`}
              >
                نظرة عامة
              </button>
              <button
                onClick={() => setActiveTab('images')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'images' 
                    ? 'bg-accent text-white' 
                    : 'text-text-muted hover:text-accent hover:bg-accent/10'
                }`}
              >
                الصور
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'videos' 
                    ? 'bg-accent text-white' 
                    : 'text-text-muted hover:text-accent hover:bg-accent/10'
                }`}
              >
                الفيديوهات
              </button>
              <button
                onClick={() => setActiveTab('copies')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'copies' 
                    ? 'bg-accent text-white' 
                    : 'text-text-muted hover:text-accent hover:bg-accent/10'
                }`}
              >
                النصوص الإعلانية
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Target Audiences */}
                {campaign.suggested_audiences && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <UserGroupIcon className="w-5 h-5 text-accent" />
                      الفئات المستهدفة
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {campaign.suggested_audiences.suggestions?.map((suggestion, index) => (
                        <div key={index} className="bg-background/50 rounded-xl p-4 border border-border-color">
                          <h4 className="font-bold text-accent mb-2">{suggestion.audience}</h4>
                          <p className="text-text-muted text-sm">{suggestion.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assets Preview */}
                {campaign.assets && campaign.assets.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <PhotoIcon className="w-5 h-5 text-accent" />
                      أحدث الأصول
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {campaign.assets.slice(0, 4).map((asset, index) => (
                        <div
                          key={index}
                          className="bg-background/50 rounded-xl overflow-hidden border border-border-color cursor-pointer hover:border-accent transition-all"
                          onClick={() => {
                            setSelectedAsset(asset);
                            if (asset.image_url) {
                              setSelectedImage(asset.image_url);
                              setActiveTab('images');
                            } else if (asset.video_url) {
                              setActiveTab('videos');
                            } else {
                              setActiveTab('copies');
                            }
                          }}
                        >
                          {asset.image_url ? (
                            <img
                              src={asset.image_url}
                              alt={asset.target_audience}
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <div className="w-full h-32 bg-accent/10 flex items-center justify-center">
                              {asset.video_url ? (
                                <VideoCameraIcon className="w-8 h-8 text-accent" />
                              ) : (
                                <DocumentTextIcon className="w-8 h-8 text-accent" />
                              )}
                            </div>
                          )}
                          <div className="p-2 text-center">
                            <p className="text-xs text-text-muted truncate">
                              {asset.target_audience || `إصدار ${index + 1}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <PhotoIcon className="w-5 h-5 text-accent" />
                  جميع الصور
                </h3>
                
                {campaign.assets?.filter(a => a.image_url).length === 0 ? (
                  <div className="text-center py-12 bg-background/50 rounded-xl">
                    <PhotoIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
                    <p className="text-text-muted">لا توجد صور في هذه الحملة</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {campaign.assets?.map((asset, idx) => (
                      asset.image_url && (
                        <div
                          key={idx}
                          className="bg-background/50 rounded-xl overflow-hidden border-2 border-border-color cursor-pointer hover:border-accent transition-all group"
                          onClick={() => setSelectedImage(asset.image_url)}
                        >
                          <div className="relative aspect-square">
                            <img
                              src={asset.image_url}
                              alt={asset.target_audience}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(asset.image_url, '_blank');
                                }}
                                className="p-2 bg-accent rounded-full hover:scale-110 transition-transform"
                              >
                                <EyeIcon className="w-4 h-4 text-white" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadImage(asset.image_url, `image-${idx}.png`);
                                }}
                                className="p-2 bg-accent rounded-full hover:scale-110 transition-transform"
                              >
                                <ArrowDownTrayIcon className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          </div>
                          <div className="p-2 text-center">
                            <p className="text-xs text-text-muted truncate">
                              {asset.target_audience || `صورة ${idx + 1}`}
                            </p>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Videos Tab */}
            {activeTab === 'videos' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <VideoCameraIcon className="w-5 h-5 text-accent" />
                  جميع الفيديوهات
                </h3>
                
                {campaign.assets?.filter(a => a.video_url).length === 0 && !campaign.video_url ? (
                  <div className="text-center py-12 bg-background/50 rounded-xl">
                    <VideoCameraIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
                    <p className="text-text-muted">لا توجد فيديوهات في هذه الحملة</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Video from campaign */}
                    {campaign.video_url && (
                      <div className="bg-background/50 rounded-xl overflow-hidden border border-border-color">
                        <div className="relative aspect-video bg-black">
                          <video
                            src={campaign.video_url}
                            controls
                            className="w-full h-full"
                            poster={campaign.assets?.[0]?.image_url}
                          />
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-white mb-2">الفيديو الرئيسي</h4>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDownloadImage(campaign.video_url, 'video.mp4')}
                              className="flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-all"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                              <span className="text-sm">تحميل</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Videos from assets */}
                    {campaign.assets?.map((asset, idx) => (
                      asset.video_url && (
                        <div key={idx} className="bg-background/50 rounded-xl overflow-hidden border border-border-color">
                          <div className="relative aspect-video bg-black">
                            <video
                              src={asset.video_url}
                              controls
                              className="w-full h-full"
                              poster={asset.image_url}
                            />
                          </div>
                          <div className="p-4">
                            <h4 className="font-bold text-white mb-2">{asset.target_audience || `فيديو ${idx + 1}`}</h4>
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleDownloadImage(asset.video_url, `video-${idx}.mp4`)}
                                className="flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-all"
                              >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span className="text-sm">تحميل</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Copies Tab */}
            {activeTab === 'copies' && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-accent" />
                  النصوص الإعلانية
                </h3>
                
                {campaign.assets?.filter(a => a.ad_copy && a.ad_copy.length > 0).length === 0 ? (
                  <div className="text-center py-12 bg-background/50 rounded-xl">
                    <DocumentTextIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
                    <p className="text-text-muted">لا توجد نصوص إعلانية في هذه الحملة</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {campaign.assets?.map((asset, idx) => (
                      asset.ad_copy && asset.ad_copy.length > 0 && (
                        <div key={idx} className="bg-background/50 rounded-xl p-6 border border-border-color">
                          <h4 className="font-bold text-accent mb-4">
                            {asset.target_audience || `نصوص الإصدار ${idx + 1}`}
                          </h4>
                          <div className="space-y-4">
                            {asset.ad_copy.map((ad, adIdx) => (
                              <div key={adIdx} className="bg-panel rounded-lg p-4 border border-border-color">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                                    {ad.platform}
                                  </span>
                                </div>
                                <p className="text-text-muted whitespace-pre-line text-sm leading-relaxed">
                                  {ad.ad_copy}
                                </p>
                                <div className="flex justify-end mt-3 gap-2">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(ad.ad_copy);
                                      alert('تم نسخ النص');
                                    }}
                                    className="text-xs text-accent hover:text-accent-dark transition-all"
                                  >
                                    نسخ النص
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Image Preview Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl w-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 p-2 bg-panel rounded-full hover:bg-accent transition-all"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
              <img
                src={selectedImage}
                alt="Preview"
                className="w-full h-auto rounded-lg"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                <a
                  href={selectedImage}
                  download
                  className="p-3 bg-accent rounded-full hover:scale-110 transition-transform"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 text-white" />
                </a>
                <a
                  href={selectedImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-accent rounded-full hover:scale-110 transition-transform"
                >
                  <EyeIcon className="w-5 h-5 text-white" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}