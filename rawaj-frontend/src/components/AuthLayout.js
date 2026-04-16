// src/components/AuthLayout.js
'use client';

export default function AuthLayout({ children, title, subtitle, switchText, switchLink, switchLinkText }) {
  return (
    <div 
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2a] to-[#020617]"
    >
      {/* خلفية متحركة - كرات ضبابية (كما كانت) */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl animate-pulse animation-delay-1000"></div>
      </div>

      {/* محتوى البطاقة */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* أضفنا border-top بلون راواج المتدرج */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 transition-all duration-500 hover:shadow-blue-500/20 relative overflow-hidden">
            {/* شريط علوي متدرج (أزرق إلى أخضر) */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-green-500"></div>
            
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-500 bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="text-gray-300 mt-2">{subtitle}</p>
            </div>

            {children}

            <div className="mt-8 text-center text-gray-400 text-sm">
              {switchText}{' '}
              <a href={switchLink} className="text-blue-400 hover:text-blue-300 font-semibold transition">
                {switchLinkText}
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
}