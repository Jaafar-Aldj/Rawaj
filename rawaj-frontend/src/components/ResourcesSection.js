// src/components/ResourcesSection.js

// سنحتاج إلى مكون Image من Next.js لعرض الصور بشكل محسن
import Image from 'next/image';

const ResourceCard = ({ imgSrc, title, description }) => {
  return (
    // 'group' تسمح لنا بتغيير شكل عناصر داخلية عند عمل hover على العنصر الأب
    <div className="group bg-[#0f172a] rounded-2xl overflow-hidden border border-blue-500/20 shadow-lg hover:border-blue-500 hover:-translate-y-2 transition-all duration-300">
      <div className="relative h-56 w-full">
        <Image
          src={imgSrc}
          alt={title}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-500 group-hover:scale-110" // تأثير تكبير الصورة عند الـ hover
        />
        {/* يمكنك إضافة overlay هنا إذا أردت */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
};


const ResourcesSection = () => {
  return (
    <section id="resources" className="py-20 lg:py-32">
      <div className="container mx-auto px-4">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
            استراتيجيات تسويقية مدعومة بالذكاء الاصطناعي
          </h2>
          <p className="text-lg text-gray-400">
            حلول مبتكرة لتحقيق أهدافك التسويقية
          </p>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ResourceCard
            imgSrc="/strategy-1.jpg" // سنضع هذه الصور في مجلد public
            title="إدارة المحتوى الذكية"
            description="جدولة وتوليد محتوى يومي مخصص تلقائياً"
          />
          <ResourceCard
            imgSrc="/strategy-2.jpg"
            title="هوية بصرية متسقة"
            description="ضمان اتساق المنتج عبر جميع الحملات"
          />
          <ResourceCard
            imgSrc="/strategy-3.jpg"
            title="تعاون مع المؤثرين"
            description="اقتراح مؤثرين مناسبين بناءً على تحليل البيانات"
          />
        </div>

      </div>
    </section>
  );
};

export default ResourcesSection;