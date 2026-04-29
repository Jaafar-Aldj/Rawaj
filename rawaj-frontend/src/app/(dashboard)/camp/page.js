// src/app/(dashboard)/camp/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MegaphoneIcon, 
  CalendarIcon, 
  ChevronLeftIcon,
  ClockIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowPathIcon,
  TrophyIcon,
  TrashIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon   // <-- إضافة أيقونة البحث
} from '@heroicons/react/24/outline';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // --- حالة البحث ---
  const [searchTerm, setSearchTerm] = useState('');

  const router = useRouter();
  const { isAuthenticated, authLoading } = useAuth();

  const fetchCampaigns = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else {
      setLoading(true);
      setSkip(0);
      setSelectedIds(new Set());
      setSelectMode(false);
    }

    try {
      const currentSkip = isLoadMore ? skip + LIMIT : 0;
      const response = await api(`/campaigns/?limit=${LIMIT}&skip=${currentSkip}`);
      const data = await response.json();
      const newCamps = Array.isArray(data) ? data : [];
      
      if (isLoadMore) {
        setCampaigns(prev => [...prev, ...newCamps]);
        setSkip(currentSkip);
      } else {
        setCampaigns(newCamps);
      }
      setHasMore(newCamps.length === LIMIT);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) fetchCampaigns();
  }, [authLoading, isAuthenticated]);

  // --- تصفية الحملات حسب الاسم (محلياً) ---
  const filteredCampaigns = campaigns.filter(camp =>
    camp.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'STRATEGY_APPROVED': 
        return { label: 'جاهزة للتنفيذ', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: SparklesIcon };
      case 'COMPLETED': 
        return { label: 'مكتملة بنجاح', color: 'text-green-400', bg: 'bg-green-400/10', icon: TrophyIcon };
      case 'DRAFTS_READY':
        return { label: 'مسودات جاهزة', color: 'text-purple-400', bg: 'bg-purple-400/10', icon: DocumentTextIcon };
      default: 
        return { label: 'قيد التخطيط', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: ClockIcon };
    }
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) setSelectedIds(new Set());
  };

  const toggleSelectCampaign = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredCampaigns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCampaigns.map(c => c.id)));
    }
  };

  const confirmDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const deleteSelected = async () => {
    setDeleting(true);
    try {
      for (const id of selectedIds) {
        await api(`/campaigns/${id}`, { method: 'DELETE' });
      }
      await fetchCampaigns(false);
      setSelectMode(false);
      setSelectedIds(new Set());
      setSearchTerm(''); // إعادة تعيين البحث بعد الحذف
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // إعادة تعيين وضع التحديد عند تغيير البحث
  useEffect(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [searchTerm]);

  if (loading && skip === 0) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 text-right" dir="rtl">
      <div className="flex flex-wrap justify-between items-center mb-12 gap-4">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">الحملات الإعلانية</h1>
        </div>
        <button
          onClick={toggleSelectMode}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            selectMode 
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
              : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
          }`}
        >
          {selectMode ? 'إلغاء التحديد' : 'تحديد حملات'}
        </button>
      </div>

      {/* --- شريط البحث --- */}
      <div className="mb-8">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="ابحث عن حملة بالاسم..."
            className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pr-12 pl-12 py-4 text-white focus:border-green-500 outline-none transition-all font-bold placeholder:text-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {filteredCampaigns.length === 0 ? (
        <div className="bg-gray-800/30 border border-gray-700 rounded-[2.5rem] p-24 text-center">
          <MegaphoneIcon className="w-20 h-20 text-gray-600 mx-auto mb-6 opacity-30" />
          <p className="text-gray-400 font-black text-xl">
            {searchTerm ? 'لا توجد حملات تطابق بحثك' : 'لا توجد حملات نشطة حالياً'}
          </p>
          {!searchTerm && (
            <button onClick={() => router.push('/upload-image')} className="mt-6 text-green-400 hover:underline font-bold">
              ابدأ حملتك الأولى الآن
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {selectMode && (
            <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded-xl mb-2">
              <button onClick={selectAll} className="text-sm text-green-400 hover:underline flex items-center gap-2">
                {selectedIds.size === filteredCampaigns.length ? (
                  <>إلغاء تحديد الكل <XMarkIcon className="w-4 h-4" /></>
                ) : (
                  <>تحديد الكل <CheckCircleIcon className="w-4 h-4" /></>
                )}
              </button>
              <span className="text-gray-400 text-xs">تم تحديد {selectedIds.size}</span>
            </div>
          )}

          <AnimatePresence>
            {filteredCampaigns.map((camp) => {
              const status = getStatusBadge(camp.status);
              const isSelected = selectedIds.has(camp.id);
              return (
                <motion.div
                  key={camp.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: selectMode ? 0 : -10 }}
                  className={`bg-gray-800/30 border p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 transition-all shadow-lg ${
                    isSelected ? 'border-green-500 bg-green-500/10' : 'border-gray-700 hover:border-green-500/50'
                  }`}
                >
                  {selectMode && (
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => toggleSelectCampaign(camp.id)}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-green-500'
                        }`}
                      >
                        {isSelected && <CheckCircleIcon className="w-5 h-5 text-white" />}
                      </button>
                    </div>
                  )}

                  <div 
                    onClick={() => !selectMode && router.push(`/campaigns/${camp.id}`)}
                    className={`flex-1 flex flex-col md:flex-row items-center justify-between gap-6 w-full ${!selectMode ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-6 w-full md:w-auto">
                      <div className="w-24 h-24 bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 flex-shrink-0">
                        <img src={camp.product?.original_image_url} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white group-hover:text-green-400 transition-colors leading-tight">
                          {camp.name || "حملة استراتيجية جديدة"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          <span className={`flex items-center gap-2 text-xs font-black px-4 py-1.5 rounded-full ${status.bg} ${status.color} border border-white/5`}>
                            <status.icon className="w-4 h-4" /> {status.label}
                          </span>
                          <span className="flex items-center gap-2 text-gray-500 text-sm font-bold">
                            <CalendarIcon className="w-4 h-4" /> {new Date(camp.created_at).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-700/50 pt-5 md:pt-0">
                      <div className="hidden lg:block text-right">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-2">الهدف الإستراتيجي</p>
                        <p className="text-sm text-gray-300 max-w-[300px] line-clamp-2 font-medium italic">"{camp.objective || "جاري تحديد الهدف..."}"</p>
                      </div>
                      <div className={`p-4 rounded-full bg-gray-900 border border-gray-700 transition-all duration-300 ${!selectMode ? 'group-hover:bg-green-500 group-hover:text-white' : ''}`}>
                        <ChevronLeftIcon className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {hasMore && searchTerm === '' && ( // إخفاء "عرض المزيد" عند وجود بحث
        <div className="mt-12 flex justify-center pb-10">
          <button
            onClick={() => fetchCampaigns(true)}
            disabled={loadingMore}
            className="w-full md:w-[400px] py-5 bg-gray-800/30 border border-gray-700 text-gray-400 rounded-3xl font-black hover:text-white hover:border-gray-500 transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            {loadingMore ? <LoadingSpinner size="sm" color="white" /> : <>عرض المزيد من الحملات <ArrowPathIcon className="w-5 h-5" /></>}
          </button>
        </div>
      )}

      {selectMode && selectedIds.size > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-green-500/30 rounded-2xl shadow-2xl p-4 flex items-center gap-6 z-50 backdrop-blur-xl bg-opacity-90"
        >
          <span className="text-white font-bold">{selectedIds.size} حملة محددة</span>
          <button onClick={confirmDeleteSelected} className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold px-5 py-2 rounded-xl transition-all">
            <TrashIcon className="w-5 h-5" /> حذف المحدد
          </button>
          <button onClick={toggleSelectMode} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-5 py-2 rounded-xl transition-all">
            <XMarkIcon className="w-5 h-5" /> إلغاء
          </button>
        </motion.div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">تأكيد الحذف الجماعي</h3>
            <p className="text-gray-400 mb-6">هل أنت متأكد من حذف <span className="text-green-400 font-bold">{selectedIds.size}</span> حملة؟ هذا الإجراء لا يمكن التراجع عنه.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-bold hover:bg-gray-600">إلغاء</button>
              <button onClick={deleteSelected} disabled={deleting} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 flex items-center justify-center gap-2">
                {deleting ? <LoadingSpinner size="sm" color="white" /> : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}