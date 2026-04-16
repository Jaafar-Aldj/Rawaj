// src/components/AnalyticsSection.js

const AnalyticsSection = () => {
  return (
    <section id="analytics"  className="py-20 lg:py-32 bg-[#0b1120] border-y border-gray-800 pt-32">
      
      <div className="container mx-auto px-4" dir="rtl">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className=" text-4xl font-bold mb-10 bg-gradient-to-r from-blue-400 to-green-500 bg-clip-text text-transparent drop-shadow-lg">
          ما الذي يجعل رواج مختلفاً؟
        </h2>

          <p className="text-2xl text-gray-400">
            ميزات تجعل من رواج منصة فريدة في عالم التسويق بالذكاء الاصطناعي
          </p>
        </div>

        {/* 4 Cards Grid - نفس تنسيق ServicesSection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Card 1 */}
          <div className="bg-[#0f172a] p-8 rounded-2xl border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">
            <div className="mb-4 text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">ليس مجرد أداة توليد</h3>
            <p className="text-gray-400">فريق تسويق آلي متكامل</p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#0f172a] p-8 rounded-2xl border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">
            <div className="mb-4 text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">لا حاجة لخبرة</h3>
            <p className="text-gray-400">فقط ارفع صورة المنتج وتحدث مع المدير الإبداعي</p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0f172a] p-8 rounded-2xl border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">
            <div className="mb-4 text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">لا مخرجات مشوهة</h3>
            <p className="text-gray-400">النظام يرفض التوليد الخاطئ تلقائياً</p>
          </div>

          {/* Card 4 */}
          <div className="bg-[#0f172a] p-8 rounded-2xl border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">
            <div className="mb-4 text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">جاهز للنشر فوراً</h3>
            <p className="text-gray-400">لا تحتاج إلى تعديل إضافي</p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AnalyticsSection;