// src/components/ResourcesSection.js
import Image from 'next/image';

const ResourceCard = ({ imgSrc, title, description, step }) => {
  return (
    <div className="group bg-[#0f172a] rounded-2xl overflow-hidden border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">
      <div className="relative h-40 w-full">   {/* تم التخفيض من h-56 إلى h-40 */}
        <Image
          src={imgSrc}
          alt={title}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
        {/* رقم الخطوة - تم تصغيره */}
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-md shadow-lg">
          {step}
        </div>
      </div>
      <div className="p-4">   {/* تم التخفيض من p-6 إلى p-4 */}
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>   {/* من text-xl إلى text-lg */}
        <p className="text-gray-400 text-sm">{description}</p>   {/* إضافة text-sm */}
      </div>
    </div>
  );
};

const ResourcesSection = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-[#0b1120] border-y border-gray-800">
      <div className="container mx-auto px-4" dir="rtl">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">  
          <h2  className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
            كيف يعمل فريق الوكلاء المتعددين؟
          </h2>
          <p className="text-2xl text-gray-400">  
            أربع خطوات ذكية لتحويل منتجك إلى حملة تسويقية متكاملة
          </p>
        </div>

        {/* Cards Grid - نفس الشبكة لكن البطاقات أصبحت أصغر */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">   
          <ResourceCard
            step="1"
            imgSrc="/step-chat.svg"
            title="محادثة استراتيجية"
            description="تحدث مع المدير الإبداعي الآلي لتحليل منتجك وبناء الخطة التسويقية"
          />
          <ResourceCard
            step="2"
            imgSrc="/step-copy.svg"
            title="نصوص إعلانية ذكية"
            description="كاتب المحتوى ينتج نصوصاً مخصصة لكل منصة (فيسبوك، إنستغرام، تيك توك)"
          />
          <ResourceCard
            step="3"
            imgSrc="/step-storyboard.svg"
            title="لوحة قصة سينمائية"
            description="المخرج الفني يحول النص إلى مشاهد متسلسلة مع تعليمات بصرية دقيقة"
          />
          <ResourceCard
            step="4"
            imgSrc="/step-video.svg"
            title="فيديو جاهز للنشر"
            description="محرك Google Veo يولد فيديو عالي الدقة"
          />
        </div>

      </div>
    </section>
  );
};

export default ResourcesSection;