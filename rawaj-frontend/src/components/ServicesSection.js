// src/components/ServicesSection.js

// سننشئ مكون صغير للبطاقة ليبقى الكود نظيفاً
const ServiceCard = ({ title, description, icon }) => {
  return (
    <div className="bg-[#0f172a] p-8 rounded-2xl border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">
      <div className="text-blue-400 mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
};

// أيقونات بسيطة كـ SVG components
const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);
const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const TextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const AudienceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);


const ServicesSection = () => {
  return (
    <section id="services" className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
            خدماتنا الذكية
          </h2>
          <p className="text-lg text-gray-400">
            حلول تسويقية متكاملة تعتمد على الذكاء الاصطناعي المتقدم
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <ServiceCard 
            title="فيديوهات تسويقية سينمائية"
            description="توليد فيديوهات احترافية عالية الجودة باستخدام أحدث نماذج الذكاء الاصطناعي (Runway Gen-3 / Luma)."
            icon={<VideoIcon />}
          />
          <ServiceCard 
            title="صور إعلانية مخصصة"
            description="إنشاء صور دعائية مبهرة مع الحفاظ على هوية المنتج باستخدام DALL·E 3 وتقنيات In-painting."
            icon={<ImageIcon />}
          />
          <ServiceCard 
            title="محتوى نصي ذكي"
            description="كتابة نصوص تسويقية مخصصة لكل منصة (فيسبوك، إنستغرام، لينكدإن) مع هاشتاجات استراتيجية."
            icon={<TextIcon />}
          />
          <ServiceCard 
            title="حملات مخصصة للجمهور"
            description="تخصيص كامل للجمهور (Audience Segmentation) مع تعديلات تفاعلية (Human-in-the-Loop)."
            icon={<AudienceIcon />}
          />
        </div>

      </div>
    </section>
  );
};

export default ServicesSection;