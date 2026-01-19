// src/components/AboutSection.js

const StatCard = ({ value, label }) => {
  return (
    <div className="bg-blue-500/10 border border-blue-500/30 text-center p-6 rounded-2xl">
      <strong className="block text-4xl font-bold text-blue-400 mb-2">{value}</strong>
      <span className="text-gray-400">{label}</span>
    </div>
  );
};

const AboutSection = () => {
  return (
    <section id="about" className="py-20 lg:py-32 bg-[#0b1120] border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* About Text Content */}
          <div className="max-w-xl">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
              من نحن
            </h2>
            <div className="space-y-4 text-lg text-gray-300">
              <p>
                منصة Marketing AI هي نتاج مشروع تخرج جامعي في كلية الهندسة - قسم هندسة نظم المعلومات.
              </p>
              <p>
                صممناها لتكون أداة شاملة تساعد الشركات الصغيرة والمتوسطة على إنتاج محتوى تسويقي احترافي بتكلفة منخفضة وبسرعة فائقة.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard value="+150" label="حملة مولدة" />
            <StatCard value="+40" label="عميل" />
            <StatCard value="+4x" label="متوسط العائد" />
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutSection;