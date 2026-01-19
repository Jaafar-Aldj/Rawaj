// src/components/ContactSection.js
'use client'; // This directive is needed because we're using a form with state/handlers

const ContactSection = () => {
  // We can add form handling logic here later
  const handleSubmit = (event) => {
    event.preventDefault();
    alert('شكراً لتواصلك! سيتم الرد عليك قريباً.');
    event.target.reset();
  };

  return (
    <section id="contact" className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
            تواصل معنا
          </h2>
          <p className="text-lg text-gray-400">
            هل تريد تجربة المنصة أو لديك استفسار؟ نحن هنا لمساعدتك.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          
          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">الاسم</label>
              <input 
                type="text" 
                id="name" 
                placeholder="اسمك الكامل" 
                required 
                className="w-full bg-[#0a0f1a] border border-blue-500/30 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">البريد الإلكتروني</label>
              <input 
                type="email" 
                id="email" 
                placeholder="example@domain.com" 
                required 
                className="w-full bg-[#0a0f1a] border border-blue-500/30 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">رسالتك</label>
              <textarea 
                id="message" 
                rows="5" 
                placeholder="كيف يمكننا مساعدتك؟" 
                required
                className="w-full bg-[#0a0f1a] border border-blue-500/30 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              ></textarea>
            </div>
            <button 
              type="submit" 
              className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"
            >
              إرسال الرسالة
            </button>
          </form>

          {/* Contact Info */}
          <div className="flex items-center justify-center">
            <div className="bg-[#0f172a] p-8 rounded-2xl border border-blue-500/20 w-full">
              <h3 className="text-2xl font-bold text-white mb-6">معلومات التواصل</h3>
              <div className="space-y-4 text-lg">
                <p className="flex items-center gap-4"><strong className="text-blue-400">البريد:</strong> support@marketing-ai.sa</p>
                <p className="flex items-center gap-4"><strong className="text-blue-400">الهاتف:</strong> +966 55 123 4567</p>
                <p className="flex items-center gap-4"><strong className="text-blue-400">الموقع:</strong> الرياض، المملكة العربية السعودية</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ContactSection;