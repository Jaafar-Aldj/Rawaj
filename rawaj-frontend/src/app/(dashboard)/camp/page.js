// src/app/(dashboard)/camp/page.js
'use client';
import { useState } from 'react';

// Reusable Step component for the progress bar
const Step = ({ number, label, currentStep }) => (
  <div className="flex flex-col items-center">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300
      ${currentStep > number ? 'bg-green-500 text-white' : ''}
      ${currentStep === number ? 'bg-blue-500 text-white scale-110 shadow-lg' : ''}
      ${currentStep < number ? 'bg-gray-700 text-gray-400' : ''}
    `}>
      {currentStep > number ? '✔' : number}
    </div>
    <span className={`mt-2 text-sm text-center ${currentStep >= number ? 'text-white' : 'text-gray-500'}`}>{label}</span>
  </div>
);

// Main Component for the Campaign Wizard
export default function CampPage() {
  const [step, setStep] = useState(1);
  
  return (
    <div className="max-w-4xl mx-auto bg-[#0f172a]/80 p-6 sm:p-8 rounded-2xl border border-blue-500/30 shadow-2xl">
      {/* Progress Bar */}
      <div className="grid grid-cols-5 gap-4 mb-10">
        <Step number={1} label="رفع المنتج" currentStep={step} />
        <Step number={2} label="الجمهور" currentStep={step} />
        <Step number={3} label="المسودات" currentStep={step} />
        <Step number={4} label="الإنتاج" currentStep={step} />
        <Step number={5} label="النتيجة" currentStep={step} />
      </div>

      {/* Step Content */}
      <div className="bg-black/20 p-6 rounded-lg min-h-[300px]">
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">خطوة 1: رفع صورة المنتج</h2>
            <p className="text-gray-400 mb-6">ارفع صورة واضحة للمنتج ليبدأ النظام في التحليل.</p>
            {/* Form elements will go here */}
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">خطوة 2: اختيار الجمهور المستهدف</h2>
            <p className="text-gray-400 mb-6">حدد الفئات التي تناسب منتجك.</p>
            {/* Audience selection will go here */}
          </div>
        )}
        {/* Add other steps similarly */}
        {step > 2 && (
             <div>
                <h2 className="text-2xl font-bold mb-4">خطوة {step}</h2>
                <p className="text-gray-400 mb-6">محتوى هذه الخطوة سيتم بناؤه لاحقاً.</p>
             </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button 
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="bg-gray-700 text-white font-semibold py-2 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          → السابق
        </button>
        <button 
          onClick={() => setStep(s => Math.min(5, s + 1))}
          disabled={step === 5}
          className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50"
        >
          التالي ←
        </button>
      </div>
    </div>
  );
}