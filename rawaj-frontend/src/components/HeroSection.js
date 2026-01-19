// src/components/HeroSection.js
import Link from 'next/link';

const HeroSection = () => {
  return (
    // 'relative' لجعل العناصر الداخلية تستخدمه كنقطة مرجعية
    // 'min-h-screen' ليأخذ القسم ارتفاع الشاشة بالكامل على الأقل
    // 'flex items-center justify-center' لتوسيط المحتوى
    <section id="home" className="relative min-h-screen flex items-center justify-center text-center px-4 overflow-hidden">
      
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        {/* Background Image */}
        {/* ملاحظة: سنقوم بتغيير 'img.png' لاحقاً بطريقة Next.js الصحيحة */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url('/img.png')" }}
        ></div>
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-transparent to-transparent"></div>

      </div>

      {/* Content */}
      {/* 'relative z-10' لوضع المحتوى فوق الخلفية */}
      <div className="relative z-10 max-w-4xl">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4">
          حملات تسويقية <span className="bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">ذكية</span> بالذكاء الاصطناعي
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
          منصة متكاملة تعتمد على أنظمة الوكلاء المتعددين لتوليد محتوى تسويقي متعدد الوسائط (فيديو، صور، نصوص) مخصص لجمهورك بجودة احترافية وسرعة فائقة.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link 
            href="/dashboard" 
            className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-semibold py-3 px-8 rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"
          >
            جرب المنصة الآن
          </Link>
          <Link 
            href="#services" 
            className="bg-gray-700/20 border border-gray-600 text-white font-semibold py-3 px-8 rounded-full hover:bg-gray-700/50 hover:border-gray-500 transition-all"
          >
            استكشف الخدمات
          </Link>
        </div>
      </div>

    </section>
  );
};

export default HeroSection;