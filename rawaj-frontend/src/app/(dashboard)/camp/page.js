// src/app/(dashboard)/camp/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserGroupIcon,
  SparklesIcon,
  ExclamationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState({ show: false, campaignId: null, campaignName: '' });
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCampaigns();
    }
  }, [isAuthenticated]);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 جاري جلب الحملات...');
      const response = await api('/campaigns/');
      
      if (!response.ok) {
        throw new Error('فشل في جلب الحملات');
      }
      
      const data = await response.json();
      console.log('📦 بيانات الحملات من قاعدة البيانات:', data);
      
      // معالجة البيانات - قد تكون مصفوفة مباشرة أو في data.data
      let campaignsList = [];
      if (Array.isArray(data)) {
        campaignsList = data;
      } else if (data.data && Array.isArray(data.data)) {
        campaignsList = data.data;
      } else if (data.campaigns && Array.isArray(data.campaigns)) {
        campaignsList = data.campaigns;
      }
      
      setCampaigns(campaignsList);
    } catch (err) {
      console.error('❌ خطأ في جلب الحملات:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // دالة حذف الحملة
  const handleDeleteCampaign = async () => {
    if (!deleteModal.campaignId) return;
    
    setDeleting(true);
    setError('');
    
    try {
      console.log(`🗑️ جاري حذف الحملة: ${deleteModal.campaignId}`);
      const response = await api(`/campaigns/${deleteModal.campaignId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'فشل في حذف الحملة');
      }
      
      console.log('✅ تم حذف الحملة بنجاح');
      
      // إزالة الحملة من القائمة
      setCampaigns(prev => prev.filter(c => c.id !== deleteModal.campaignId));
      
      // إغلاق المودال
      setDeleteModal({ show: false, campaignId: null, campaignName: '' });
      
    } catch (err) {
      console.error('❌ خطأ في حذف الحملة:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // تصفية الحملات حسب الحالة
  const filteredCampaigns = campaigns.filter(campaign => {
    // تصفية حسب البحث
    const matchesSearch = searchTerm === '' || 
      (campaign.target_audience && campaign.target_audience.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (campaign.id && campaign.id.toString().includes(searchTerm)) ||
      (campaign.status && campaign.status.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // تصفية حسب الحالة
    let matchesFilter = true;
    if (filter !== 'all') {
      matchesFilter = campaign.status === filter;
    }
    
    return matchesSearch && matchesFilter;
  });

  // الحصول على حالة الحملة
  const getCampaignStatus = (campaign) => {
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
      month: 'short', 
      day: 'numeric' 
    });
  };

  // الحصول على إحصائيات الحملة من قاعدة البيانات
  const getCampaignStats = (campaign) => {
    // عدد الصور من image_versions في assets
    const imagesCount = campaign.assets?.reduce((acc, asset) => 
      acc + (asset.image_versions?.length || (asset.image_url ? 1 : 0)), 0) || 0;
    
    // عدد الفيديوهات من video_versions
    const videosCount = campaign.assets?.reduce((acc, asset) => 
      acc + (asset.video_versions?.length || (asset.video_url ? 1 : 0)), 0) || 
      campaign.video_versions?.length || 0;
    
    // عدد النصوص الإعلانية
    const adCopiesCount = campaign.assets?.reduce((acc, asset) => 
      acc + (asset.ad_copy?.length || 0), 0) || 0;
    
    return { imagesCount, videosCount, adCopiesCount };
  };

  // عرض شاشة التحميل
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-text-muted mt-4">جاري تحميل الحملات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">الحملات الإعلانية</h1>
            <p className="text-text-muted">
              جميع الحملات التي قمت بإنشائها
            </p>
          </div>
          
          <Link
            href="/upload-image"
            className="flex items-center gap-2 bg-gradient-to-r from-accent to-accent-dark text-white font-bold py-3 px-6 rounded-xl hover:shadow-xl hover:shadow-accent/30 transition-all transform hover:scale-105"
          >
            <MegaphoneIcon className="w-5 h-5" />
            <span>حملة جديدة</span>
          </Link>
        </div>

        {/* Stats Cards - من قاعدة البيانات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-panel/50 backdrop-blur-sm rounded-2xl border border-border-color p-6">
            <div className="flex items-center gap-4">
              <div className="bg-accent/10 p-3 rounded-xl">
                <MegaphoneIcon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-text-muted text-sm">إجمالي الحملات</p>
                <p className="text-2xl font-bold text-white">{campaigns.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-panel/50 backdrop-blur-sm rounded-2xl border border-border-color p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-500/10 p-3 rounded-xl">
                <CheckCircleIcon className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-text-muted text-sm">مكتملة</p>
                <p className="text-2xl font-bold text-white">
                  {campaigns.filter(c => c.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-panel/50 backdrop-blur-sm rounded-2xl border border-border-color p-6">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500/10 p-3 rounded-xl">
                <ClockIcon className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-text-muted text-sm">قيد المراجعة</p>
                <p className="text-2xl font-bold text-white">
                  {campaigns.filter(c => c.status === 'PENDING_APPROVAL').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-panel/50 backdrop-blur-sm rounded-2xl border border-border-color p-6">
            <div className="flex items-center gap-4">
              <div className="bg-gray-500/10 p-3 rounded-xl">
                <DocumentTextIcon className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-text-muted text-sm">مسودات</p>
                <p className="text-2xl font-bold text-white">
                  {campaigns.filter(c => c.status === 'DRAFT').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-panel/50 backdrop-blur-sm rounded-2xl border border-border-color p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === 'all' 
                    ? 'bg-accent text-white' 
                    : 'bg-panel border border-border-color text-text-muted hover:border-accent'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilter('DRAFT')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === 'DRAFT' 
                    ? 'bg-gray-500 text-white' 
                    : 'bg-panel border border-border-color text-text-muted hover:border-accent'
                }`}
              >
                مسودة
              </button>
              <button
                onClick={() => setFilter('PENDING_APPROVAL')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === 'PENDING_APPROVAL' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-panel border border-border-color text-text-muted hover:border-accent'
                }`}
              >
                قيد المراجعة
              </button>
              <button
                onClick={() => setFilter('COMPLETED')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === 'COMPLETED' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-panel border border-border-color text-text-muted hover:border-accent'
                }`}
              >
                مكتملة
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="بحث عن حملة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background border border-border-color rounded-xl px-4 py-2 pr-10 text-white placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        {filteredCampaigns.length === 0 ? (
          <div className="bg-panel/50 backdrop-blur-sm rounded-3xl border border-border-color p-12 text-center">
            <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MegaphoneIcon className="w-12 h-12 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">لا توجد حملات</h3>
            <p className="text-text-muted mb-6">
              {searchTerm || filter !== 'all' 
                ? 'لا توجد حملات تطابق معايير البحث' 
                : 'لم تقم بإنشاء أي حملة بعد'}
            </p>
            <Link
              href="/upload-image"
              className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-xl font-bold hover:bg-accent-dark transition-all"
            >
              <MegaphoneIcon className="w-5 h-5" />
              <span>إنشاء أول حملة</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => {
              const status = getCampaignStatus(campaign);
              const StatusIcon = status.icon;
              const stats = getCampaignStats(campaign);
              
              return (
                <div
                  key={campaign.id}
                  className={`bg-panel/50 backdrop-blur-sm rounded-2xl border-2 ${status.borderColor} hover:border-accent transition-all overflow-hidden group`}
                >
                  <div className="p-6">
                    <div className="flex flex-wrap gap-4">
                      {/* Campaign Image */}
                      <div className="w-24 h-24 bg-background rounded-xl overflow-hidden border border-border-color flex-shrink-0">
                        {campaign.assets && campaign.assets[0]?.image_url ? (
                          <img
                            src={campaign.assets[0].image_url}
                            alt={campaign.target_audience || 'حملة'}
                            className="w-full h-full object-cover"
                          />
                        ) : campaign.image_url ? (
                          <img
                            src={campaign.image_url}
                            alt={campaign.target_audience || 'حملة'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-accent/10 flex items-center justify-center">
                            <PhotoIcon className="w-8 h-8 text-text-muted" />
                          </div>
                        )}
                      </div>

                      {/* Campaign Info */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1">
                              {campaign.target_audience || `حملة ${campaign.id}`}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-text-muted">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{formatDate(campaign.created_at)}</span>
                              <span className="mx-2">•</span>
                              <span>ID: {campaign.id}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`${status.bg} ${status.color} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 border ${status.borderColor}`}>
                              <StatusIcon className="w-4 h-4" />
                              {status.text}
                            </span>
                          </div>
                        </div>

                        {/* Target Audience */}
                        {campaign.suggested_audiences && (
                          <div className="mt-2 flex items-center gap-2">
                            <UserGroupIcon className="w-4 h-4 text-accent" />
                            <span className="text-sm text-text-muted">
                              {campaign.suggested_audiences.suggestions?.length || 0} فئات مستهدفة
                            </span>
                          </div>
                        )}

                        {/* Campaign Stats - من قاعدة البيانات */}
                        <div className="mt-4 flex flex-wrap gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <PhotoIcon className="w-4 h-4 text-accent" />
                            <span className="text-text-muted">
                              {stats.imagesCount} صور
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <VideoCameraIcon className="w-4 h-4 text-accent" />
                            <span className="text-text-muted">
                              {stats.videosCount} فيديو
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DocumentTextIcon className="w-4 h-4 text-accent" />
                            <span className="text-text-muted">
                              {stats.adCopiesCount} نصوص
                            </span>
                          </div>
                        </div>

                        {/* Assets Preview */}
                        {campaign.assets && campaign.assets.length > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-text-muted">المرفقات:</span>
                            <div className="flex gap-1">
                              {campaign.assets.slice(0, 3).map((asset, idx) => (
                                <div
                                  key={idx}
                                  className="w-8 h-8 bg-background rounded border border-border-color overflow-hidden"
                                  title={asset.target_audience || `أصل ${idx + 1}`}
                                >
                                  {asset.image_url ? (
                                    <img
                                      src={asset.image_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-accent/5 flex items-center justify-center">
                                      <DocumentTextIcon className="w-4 h-4 text-text-muted" />
                                    </div>
                                  )}
                                </div>
                              ))}
                              {campaign.assets.length > 3 && (
                                <span className="text-xs text-text-muted flex items-center">
                                  +{campaign.assets.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 justify-center min-w-[100px]">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-xl hover:bg-accent/20 transition-all"
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span>عرض</span>
                        </Link>
                        
                        {campaign.status === 'DRAFT' && (
                          <Link
                            href={`/generate-ad`}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-panel border border-border-color text-text-muted rounded-xl hover:border-accent hover:text-accent transition-all"
                          >
                            <SparklesIcon className="w-4 h-4" />
                            <span>توليد</span>
                          </Link>
                        )}
                        
                        {campaign.status === 'PENDING_APPROVAL' && (
                          <Link
                            href={`/finalize-ad`}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 rounded-xl hover:bg-yellow-500/20 transition-all"
                          >
                            <VideoCameraIcon className="w-4 h-4" />
                            <span>فيديو</span>
                          </Link>
                        )}
                        
                        {campaign.status === 'COMPLETED' && (
                          <button
                            onClick={() => {/* تصدير الحملة */}}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500/20 transition-all"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                            <span>تصدير</span>
                          </button>
                        )}

                        {/* زر الحذف - يظهر لجميع الحالات */}
                        <button
                          onClick={() => setDeleteModal({
                            show: true,
                            campaignId: campaign.id,
                            campaignName: campaign.target_audience || `حملة ${campaign.id}`
                          })}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.show && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-panel rounded-3xl border border-border-color max-w-md w-full shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">تأكيد الحذف</h3>
                  <button
                    onClick={() => setDeleteModal({ show: false, campaignId: null, campaignName: '' })}
                    className="p-2 hover:bg-background rounded-lg transition-all"
                  >
                    <XMarkIcon className="w-5 h-5 text-text-muted" />
                  </button>
                </div>
                
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrashIcon className="w-10 h-10 text-red-500" />
                  </div>
                  <p className="text-white mb-2">
                    هل أنت متأكد من حذف الحملة؟
                  </p>
                  <p className="text-accent font-bold mb-4">
                    {deleteModal.campaignName}
                  </p>
                  <p className="text-text-muted text-sm">
                    لا يمكن التراجع عن هذا الإجراء
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                    <p className="text-red-500 text-sm text-center">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ show: false, campaignId: null, campaignName: '' })}
                    className="flex-1 px-4 py-3 bg-panel border border-border-color text-text-muted rounded-xl hover:border-accent hover:text-accent transition-all font-medium"
                    disabled={deleting}
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleDeleteCampaign}
                    disabled={deleting}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        <span>جاري الحذف...</span>
                      </>
                    ) : (
                      <>
                        <TrashIcon className="w-4 h-4" />
                        <span>حذف</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}