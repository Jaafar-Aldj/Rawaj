'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MegaphoneIcon, PhotoIcon, DocumentTextIcon,
  CheckCircleIcon, ClockIcon, TrashIcon, EyeIcon, ArrowPathIcon,
  CalendarIcon, SparklesIcon, XMarkIcon,
  ChevronLeftIcon, ExclamationCircleIcon,
  ChatBubbleLeftRightIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ show: false, campaignId: null, campaignName: '' });
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) fetchCampaigns();
  }, [isAuthenticated]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await api('/campaigns/');
      const data = await response.json();
      setCampaigns(Array.isArray(data) ? data : (data.data || data.campaigns || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const name = (c.name || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) && (filter === 'all' || c.status === filter);
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
        <p className="text-text-muted mt-4 text-sm font-bold animate-pulse">جاري تحميل حملاتك...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 text-right" dir="rtl">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between items-center gap-5">
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <h1 className="text-3xl font-black text-white mb-1">حملاتي الإعلانية</h1>
           
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/upload-image"  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-accent to-blue-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-accent/30 transition-all">
              <SparklesIcon className="w-5 h-5" /> إنشاء حملة جديدة
            </Link>
          </motion.div>
        </div>
      

        {/* Search & Filter - بطاقة بيضاء */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl border border-white/10 p-3 mb-8 shadow-xl"
        >
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
              <input 
                type="text" 
                placeholder="ابحث عن اسم الحملة..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pr-10 pl-3 py-2.5 text-gray-900 text-sm focus:border-green-500 focus:bg-white outline-none transition-all font-medium"
              />
            </div>
            
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {['all','DRAFT','COMPLETED'].map(f => (
                <button 
                  key={f} onClick={() => setFilter(f)} 
                  className={`px-5 py-1.5 rounded-lg font-bold text-xs transition-all ${filter === f ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {f === 'all' ? 'الكل' : f === 'DRAFT' ? 'مسودة' : 'مكتملة'}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Campaigns Grid */}
        <AnimatePresence mode="popLayout">
          {filteredCampaigns.length === 0 ? (
            <div className="py-16 text-center bg-panel/20 rounded-2xl border border-dashed border-border-color">
              <MegaphoneIcon className="w-14 h-14 text-text-muted opacity-20 mx-auto mb-3" />
              <p className="text-text-muted text-sm font-bold">لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCampaigns.map(campaign => {
                const isExpanded = expandedCampaign === campaign.id;
                
                return (
                  <motion.div 
                    key={campaign.id} layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isExpanded ? 'border-green-500 shadow-xl scale-[1.01]' : 'border-transparent hover:border-green-200 shadow-md'}`}
                  >
                    {/* Header Card */}
                    <div className="p-4 cursor-pointer flex items-center gap-4" onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)}>
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 flex-shrink-0 relative">
                        {campaign.product?.original_image_url ? (
                          <img src={campaign.product.original_image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><PhotoIcon className="w-6 h-6 text-gray-300" /></div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-0.5">
                          <h3 className="text-xl font-black text-gray-900 tracking-tight">{campaign.name || 'حملة جديدة'}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusStyle(campaign.status)}`}>
                            {campaign.status === 'COMPLETED' ? 'مكتملة' : 'مسودة'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500 text-xs font-bold">
                          <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5 text-base text-green-600" /> {new Date(campaign.created_at).toLocaleDateString('ar-EG')}</span>
                          
                        </div>
                      </div>

                      <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} className="text-gray-300">
                        <ChevronLeftIcon className="w-5 h-5" />
                      </motion.div>
                    </div>

                    {/* Expandable Section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-gray-50 px-6 pb-6 pt-3">
                          <div className="space-y-5">
                            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                               <p className="text-green-600 text-[20px] font-black uppercase mb-1.5 tracking-widest">هدف الحملة الاستراتيجي</p>
                               <p className="text-gray-800 text-base font-medium leading-relaxed italic">" {campaign.objective || 'توليد محتوى إبداعي لجذب العملاء'} "</p>
                            </div>
                            
                            {/* Buttons Centered */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                              <Link 
                                href={`/campaigns/${campaign.id}`} 
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white font-bold px-8 py-2.5 rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-200 text-sm"
                              >
                                <EyeIcon className="w-5 h-5" /> عرض التفاصيل الكاملة
                              </Link>
                              <button 
                                onClick={() => setDeleteModal({ show: true, campaignId: campaign.id, campaignName: campaign.name })}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-red-500 font-bold px-8 py-2.5 rounded-xl hover:bg-red-50 transition-all border border-red-100 text-sm"
                              >
                                <TrashIcon className="w-5 h-5" /> حذف الحملة
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        {/* Delete Modal */}
        <AnimatePresence>
          {deleteModal.show && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border-none">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-1.5">حذف الحملة؟</h3>
                <p className="text-gray-500 text-sm mb-6 font-medium leading-relaxed">أنت على وشك حذف "{deleteModal.campaignName}"، لا يمكن استرجاع البيانات بعد الحذف.</p>
                <div className="flex flex-col gap-2.5">
                  <button onClick={async () => {
                    await api(`/campaigns/${deleteModal.campaignId}`, { method: 'DELETE' });
                    setCampaigns(prev => prev.filter(c => c.id !== deleteModal.campaignId));
                    setDeleteModal({ show: false });
                  }} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold text-base hover:bg-red-600 transition-all">نعم، متأكد</button>
                  <button onClick={() => setDeleteModal({ show: false })} className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl font-medium text-sm hover:bg-gray-200 transition-all">تراجع</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}