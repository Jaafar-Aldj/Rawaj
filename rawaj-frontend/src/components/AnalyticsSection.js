// src/components/AnalyticsSection.js

const AnalyticsSection = () => {
  return (
    // section-alt has a different background color
    <section id="analytics" className="py-20 lg:py-32 bg-[#0b1120] border-y border-gray-800">
      <div className="container mx-auto px-4">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
            تحليلات متقدمة لتحسين الأداء
          </h2>
          <p className="text-lg text-gray-400">
            رؤى دقيقة تساعدك على اتخاذ قرارات تسويقية مستنيرة
          </p>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Tile 1: Platforms */}
          <div className="bg-[#0f172a] p-8 rounded-2xl border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-gray-700 text-xs font-semibold px-3 py-1 rounded-full">Instagram</span>
              <span className="bg-gray-700 text-xs font-semibold px-3 py-1 rounded-full">Snapchat</span>
              <span className="bg-gray-700 text-xs font-semibold px-3 py-1 rounded-full">TikTok</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">تكامل مع جميع المنصات</h3>
            <p className="text-gray-400">تحليل شامل للأداء عبر القنوات</p>
          </div>

          {/* Tile 2: Customer Journey */}
          <div className="bg-[#0f172a] p-8 rounded-2xl border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">
             {/* Placeholder for an icon or visual element */}
            <div className="mb-4 text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">رحلة العميل الكاملة</h3>
            <p className="text-gray-400">فهم سلوك الجمهور بدقة</p>
          </div>

          {/* Tile 3: Measurable Results */}
          <div className="bg-[#0f172a] p-8 rounded-2xl border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">تحويلات</span>
                <strong className="text-green-400 font-bold text-lg">↑ +47%</strong>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">تكلفة الإعلان</span>
                <strong className="text-green-400 font-bold text-lg">↓ -32%</strong>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">نتائج قابلة للقياس</h3>
            <p className="text-gray-400">زيادة العائد من الاستثمار</p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AnalyticsSection;