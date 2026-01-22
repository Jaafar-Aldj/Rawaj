// src/app/(auth)/layout.js  (هيكل صفحات المصادقة)

export default function AuthLayout({ children }) {
  return (
     <div className="min-h-screen flex items-center justify-center p-4 bg-background-alt">
      <div className="w-full max-w-md bg-panel/90 p-8 rounded-2xl border border-accent/30 shadow-2xl text-center backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}