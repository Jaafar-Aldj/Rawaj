// src/app/(dashboard)/dashboard/page.js
'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

// مكون البطاقة مع الألوان الصحيحة
const Card = ({ title, description, buttonText, href }) => (
    <div className="bg-panel p-6 rounded-2xl border border-border-color shadow-lg hover:border-accent hover:-translate-y-2 transition-all duration-300 flex flex-col">
      <h3 className="text-xl font-bold text-text-main mb-3">{title}</h3>
      <p className="text-text-muted mb-6 flex-grow">{description}</p>
      <Link href={href || "#"} className="mt-auto text-center bg-transparent border border-text-muted text-text-main font-semibold py-2 px-6 rounded-full hover:bg-accent/20 hover:border-accent transition-all">
        {buttonText}
      </Link>
    </div>
  );

// مكون صف المنتج مع الألوان الصحيحة
const ProductRow = ({ product }) => (
    <div className="bg-panel p-4 rounded-lg border border-border-color flex justify-between items-center">
        <div>
            <h3 className="font-bold text-lg text-text-main">{product.name}</h3>
            <p className="text-text-muted text-sm">{product.description}</p>
        </div>
        {/* يمكنك إضافة أزرار هنا لاحقاً */}
    </div>
);


export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api('/products/');
        if (!response.ok) throw new Error('فشل في جلب المنتجات.');
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [user]);

  return (
    <div>
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">
          <span className="text-text-muted">مرحباً،</span>
          <span className="bg-gradient-to-r from-accent to-blue-300 text-transparent bg-clip-text"> {user?.name || '...'}</span>
        </h1>
        <Link href="/camp" className="bg-gradient-to-br from-accent to-accent-dark text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-accent/30 hover:scale-105 transition-transform">
          ➕ إنشاء حملة جديدة
        </Link>
      </header>
      
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card title="اقتراح فكرة إعلان" description="دع الذكاء الاصطناعي يقترح حملة كاملة مخصصة لمنتجك." buttonText="ابدأ الآن" href="/camp" />
        <Card title="تحسين وصقل النصوص" description="أعد صياغة منشوراتك لتكون أكثر جاذبية وتأثيرًا." buttonText="تحسين نص" />
        <Card title="تحويل المحتوى بسرعة" description="حوّل نصًا إلى إعلان جاهز أو فيديو قصير تلقائيًا." buttonText="ابدأ التحويل" />
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-accent text-transparent bg-clip-text">
            منتجاتك
          </h2>
          <Link href="/dashboard/products/new" className="bg-accent/20 text-accent font-semibold py-2 px-4 rounded-lg hover:bg-accent/40 transition-colors">
            + إضافة منتج
          </Link>
        </div>
        {loading && <p className="text-text-muted">جاري تحميل المنتجات...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && (
          <div className="space-y-4">
            {products.length > 0 ? (
              products.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))
            ) : (
              <div className="text-center py-10 bg-panel rounded-lg border border-border-color">
                <p className="text-text-muted">ليس لديك أي منتجات بعد. قم بإضافة منتج جديد لتبدأ.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}