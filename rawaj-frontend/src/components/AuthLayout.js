// src/components/AuthLayout.js
import Link from 'next/link';

const AuthLayout = ({ title, subtitle, children, switchText, switchLink, switchLinkText }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-[#020617] to-gray-900">
      <div className="w-full max-w-md bg-[#0f172a]/80 p-8 rounded-2xl border border-blue-500/30 shadow-2xl text-center backdrop-blur-lg">
        
        <Link href="/" className="inline-block mb-6 text-3xl font-bold bg-gradient-to-r from-blue-400 to-green-500 text-transparent bg-clip-text">
          Rawaj
        </Link>
        
        <h2 className="text-2xl font-bold text-blue-300 mb-2">{title}</h2>
        <p className="text-gray-400 mb-6">{subtitle}</p>

        {children}

        <p className="mt-6 text-sm text-gray-400">
          {switchText}{' '}
          <Link href={switchLink} className="font-semibold text-blue-400 hover:underline">
            {switchLinkText}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;