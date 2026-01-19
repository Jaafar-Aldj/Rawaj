// src/app/(dashboard)/dashboard/page.js
import Link from 'next/link';

const Card = ({ title, description, buttonText, href }) => (
  <div className="bg-[#0f172a]/80 p-6 rounded-2xl border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300 flex flex-col">
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-gray-400 mb-6 flex-grow">{description}</p>
    <Link href={href || "#"} className="mt-auto text-center bg-transparent border border-gray-600 text-white font-semibold py-2 px-6 rounded-full hover:bg-blue-500/20 hover:border-blue-500 transition-all">
      {buttonText}
    </Link>
  </div>
);

const CampaignRow = ({ title, status }) => {
    const statusStyles = {
        active: 'bg-green-500/20 text-green-400',
        draft: 'bg-yellow-500/20 text-yellow-400'
    };
    return (
        <div className="bg-[#0f172a]/80 p-4 rounded-lg border border-blue-500/20 flex justify-between items-center">
            <h4 className="font-semibold">{title}</h4>
            <span className={`px-3 py-1 text-sm font-bold rounded-full ${status === 'active' ? statusStyles.active : statusStyles.draft}`}>
                {status === 'active' ? 'نشطة' : 'مسودة'}
            </span>
        </div>
    )
};

export default function DashboardPage() {
  return (
    <div>
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-white text-transparent bg-clip-text">
          جاهز لإبداع جديد؟
        </h1>
        <Link href="/camp" className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform">
          ➕ إنشاء حملة جديدة
        </Link>
      </header>
      
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card title="🤖 اقتراح فكرة إعلان" description="دع الذكاء الاصطناعي يقترح حملة كاملة مخصصة لمنتجك." buttonText="ابدأ الآن" href="/camp" />
        <Card title="✍️ تحسين وصقل النصوص" description="أعد صياغة منشوراتك لتكون أكثر جاذبية وتأثيرًا." buttonText="تحسين نص" />
        <Card title="🔄 تحويل المحتوى بسرعة" description="حوّل نصًا إلى إعلان جاهز أو فيديو قصير تلقائيًا." buttonText="ابدأ التحويل" />
      </section>
      
      <section>
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
          حملاتك الحالية
        </h2>
        <div className="space-y-4">
            <CampaignRow title="حملة الصيف 2026" status="active" />
            <CampaignRow title="إطلاق المنتج الجديد" status="draft" />
            <CampaignRow title="عروض رمضان" status="active" />
        </div>
      </section>
    </div>
  );
}