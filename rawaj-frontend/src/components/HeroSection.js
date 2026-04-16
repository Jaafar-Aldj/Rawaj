// src/components/HeroSection.js
import Link from 'next/link';

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center text-center px-4 overflow-hidden">
      
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url('/img.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-transparent to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
          حملات تسويقية <span className="bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">ذكية</span> 
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto mb-10 leading-relaxed">
          منصة متكاملة تعتمد على أنظمة الوكلاء المتعددين لتوليد محتوى تسويقي متعدد الوسائط 
          (فيديو، صور، نصوص) مخصص لجمهورك بجودة احترافية وسرعة فائقة.
        </p>

        {/* زر جرب المنصة الآن - تم إضافته هنا */}
        <div className="flex justify-center">
          <Link
            href="/upload-image"
            className="bg-gradient-to-r from-blue-500 to-green-500 text-white font-bold py-4 px-10 rounded-full shadow-lg hover:scale-105 transition-transform inline-block"
          >
            جرب المنصة الآن
          </Link>
        </div>
      </div>

    </section>
  );
};

export default HeroSection;