'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBagIcon,
  TrashIcon,
  SparklesIcon,
  EyeIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function MyProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 9; // عدد المنتجات في كل دفعة

  const router = useRouter();
  const { isAuthenticated, authLoading } = useAuth();

  const fetchProducts = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else {
      setLoading(true);
      setSkip(0);
    }

    try {
      const currentSkip = isLoadMore ? skip + LIMIT : 0;
      const response = await api(`/products/?limit=${LIMIT}&skip=${currentSkip}`);
      const data = await response.json();
      
      const newProducts = Array.isArray(data) ? data : [];
      
      if (isLoadMore) {
        setProducts(prev => [...prev, ...newProducts]);
        setSkip(currentSkip);
      } else {
        setProducts(newProducts);
      }

      // إذا رجع عدد أقل من الليميت، يعني مضل في داتا
      setHasMore(newProducts.length === LIMIT);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) fetchProducts();
  }, [authLoading, isAuthenticated]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && skip === 0) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 text-right" dir="rtl">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">مستودع المنتجات</h1>
          <p className="text-gray-400 font-medium">أدر منتجاتك وقم بتحليلها لبدء حملات تسويقية ناجحة</p>
        </div>
        <button
          onClick={() => router.push('/upload-image')}
          className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-accent/20 transition-all transform hover:scale-105 active:scale-95"
        >
          <PlusCircleIcon className="w-6 h-6" /> إضافة منتج جديد
        </button>
      </div>

      {/* Toolbar: Search & Refresh */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="ابحث عن منتج بالاسم..."
            className="w-full bg-panel border border-gray-800 rounded-2xl pr-12 pl-4 py-4 text-white focus:border-accent outline-none transition-all font-bold placeholder:text-gray-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => fetchProducts(false)}
          className="p-4 bg-panel border border-gray-800 rounded-2xl text-gray-400 hover:text-white transition-all shadow-sm"
        >
          <ArrowPathIcon className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-panel/50 border-2 border-dashed border-gray-800 rounded-[2.5rem] py-32 text-center">
          <ShoppingBagIcon className="w-20 h-20 text-gray-800 mx-auto mb-6 opacity-50" />
          <h3 className="text-2xl font-bold text-gray-500">لم نجد أي منتجات تطابق بحثك</h3>
          <p className="text-gray-600 mt-2">ابدأ برفع أول منتج الآن ليظهر هنا</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group bg-panel border border-gray-800 rounded-[2rem] overflow-hidden hover:border-accent/50 transition-all shadow-2xl relative"
                >
                  <div className="aspect-square bg-background relative overflow-hidden flex items-center justify-center p-8">
                    <img 
                      src={product.original_image_url} 
                      className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-110" 
                      alt={product.name} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-panel/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                  
                  <div className="p-7">
                    <h3 className="text-xl font-black text-white mb-2 truncate">{product.name}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-6 leading-relaxed h-10">{product.description || "لا يوجد وصف متاح لهذا المنتج."}</p>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          localStorage.removeItem('campaignId');
                          localStorage.removeItem('currentProductId');
                          localStorage.setItem('currentProductId', product.id);
                          router.push('/analyze-product');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3.5 rounded-xl font-black text-sm hover:bg-accent hover:text-black transition-all shadow-sm"
                      >
                        <SparklesIcon className="w-5 h-5" /> تحليل الجمهور
                      </button>
                      <button
                        onClick={() => router.push(`/products/${product.id}`)}
                        className="w-14 h-14 flex items-center justify-center bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-all border border-gray-700"
                      >
                        <EyeIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-16 flex justify-center pb-10">
              <button
                onClick={() => fetchProducts(true)}
                disabled={loadingMore}
                className="group px-12 py-4 bg-panel border border-gray-800 text-white rounded-2xl font-black hover:border-accent transition-all flex items-center gap-3 shadow-xl disabled:opacity-50"
              >
                {loadingMore ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    جلب المزيد من المنتجات
                    <ArrowPathIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}