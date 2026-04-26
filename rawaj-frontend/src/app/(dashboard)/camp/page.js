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
  CheckBadgeIcon,
  ClockIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowPathIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  const router = useRouter();
  const { isAuthenticated, authLoading } = useAuth();

  const fetchCampaigns = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else {
      setLoading(true);
      setSkip(0);
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

  if (loading && skip === 0) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 text-right" dir="rtl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">الحملات الإعلانية</h1>
        <p className="text-gray-400 font-medium">تتبع مسار حملاتك الذكية وقم بإدارة المحتوى المولد بواسطة الذكاء الاصطناعي</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-panel border border-gray-800 rounded-[2.5rem] p-24 text-center">
          <MegaphoneIcon className="w-20 h-20 text-gray-800 mx-auto mb-6 opacity-30" />
          <p className="text-gray-500 font-black text-xl">لا توجد حملات نشطة حالياً</p>
          <button onClick={() => router.push('/upload-image')} className="mt-6 text-accent hover:underline font-bold">ابدأ حملتك الأولى الآن</button>
        </div>
      ) : (
        <div className="space-y-5">
          <AnimatePresence>
            {campaigns.map((camp) => {
              const status = getStatusBadge(camp.status);
              return (
                <motion.div
                  key={camp.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: -10 }}
                  onClick={() => router.push(`/campaigns/${camp.id}`)}
                  className="bg-panel border border-gray-800 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:border-accent/50 transition-all group shadow-lg"
                >
                  {/* Left Side: Info */}
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="w-24 h-24 bg-background rounded-2xl overflow-hidden border border-gray-800 flex-shrink-0 relative group-hover:border-accent/30 transition-colors">
                      <img src={camp.product?.original_image_url} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all"></div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white group-hover:text-accent transition-colors leading-tight">
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

                  {/* Right Side: Strategy Summary */}
                  <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-800/50 pt-5 md:pt-0">
                    <div className="hidden lg:block text-right">
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-2">الهدف الإستراتيجي</p>
                      <p className="text-sm text-gray-300 max-w-[300px] line-clamp-2 font-medium italic">"{camp.objective || "جاري تحديد الهدف..."}"</p>
                    </div>
                    <div className="p-4 rounded-full bg-background border border-gray-800 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                      <ChevronLeftIcon className="w-6 h-6" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination Button */}
      {hasMore && (
        <div className="mt-12 flex justify-center pb-10">
          <button
            onClick={() => fetchCampaigns(true)}
            disabled={loadingMore}
            className="w-full md:w-[400px] py-5 bg-panel border border-gray-800 text-gray-400 rounded-3xl font-black hover:text-white hover:border-gray-600 transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            {loadingMore ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              <>
                عرض المزيد من الحملات
                <ArrowPathIcon className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}