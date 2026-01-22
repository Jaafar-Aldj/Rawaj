// src/app/(dashboard)/camp/page.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

// ===================================================================
// 1. مكونات الخطوات الفرعية (سنملأها بالمنطق لاحقاً)
// ===================================================================

// الخطوة 1: إدخال معلومات المنتج
const Step1_ProductInput = ({ onComplete }) => {
  // ... (هذا المكون جاهز تقريباً من ردنا السابق)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // ... (منطق إرسال المنتج وتحليل الحملة)

  const handleNext = async () => {
    // ... (نفس الكود السابق الذي يرسل POST /products ثم POST /campaigns/analyze)
    const mockCampaign = { id: 123, suggested_audiences: [
      { audience: "شباب 18-25", reason: "لأن المنتج عصري" },
      { audience: "نساء 30-45", reason: "لأنه يحل مشكلة يومية" },
      { audience: "محترفين", reason: "لأنه يزيد الإنتاجية" },
    ]};
    onComplete(mockCampaign); // تمرير بيانات الحملة للأب
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">خطوة 1: معلومات المنتج</h2>
      <p className="text-gray-400 mb-6">أدخل تفاصيل المنتج أو الخدمة.</p>
      {/* فورم إدخال الاسم والوصف والصورة */}
      <div className="flex justify-end mt-8">
        <button onClick={handleNext} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-full">التالي ←</button>
      </div>
    </div>
  );
};

// الخطوة 2: اختيار الجمهور
const Step2_AudienceSelection = ({ campaign, onComplete }) => {
  const [selected, setSelected] = useState([]);

  const handleSelect = (audience) => {
    // منطق لاختيار 3 فئات كحد أقصى
    if (selected.includes(audience)) {
      setSelected(selected.filter(a => a !== audience));
    } else if (selected.length < 3) {
      setSelected([...selected, audience]);
    }
  };

  const handleNext = async () => {
    // هنا نرسل طلب POST /campaigns/generate_drafts مع الفئات المختارة
    // POST /campaigns/generate_drafts  body: { campaign_id: campaign.id, selected_audiences: [...] }
    const mockDrafts = [ { id: 1, audience: "شباب 18-25", ad_copy: "...", image_url: "..." } ];
    onComplete(mockDrafts); // تمرير المسودات للأب
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">خطوة 2: اختيار الجمهور (اختر حتى 3)</h2>
      <p className="text-gray-400 mb-6">النظام اقترح هذه الفئات بناءً على منتجك.</p>
      <div className="space-y-4">
        {campaign.suggested_audiences.map(sugg => (
          <div key={sugg.audience} onClick={() => handleSelect(sugg.audience)} 
               className={`p-4 border rounded-lg cursor-pointer ${selected.includes(sugg.audience) ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700'}`}>
            <h3 className="font-bold">{sugg.audience}</h3>
            <p className="text-sm text-gray-400">{sugg.reason}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-8">
        <button className="bg-gray-700 text-white font-bold py-2 px-6 rounded-full">→ السابق</button>
        <button onClick={handleNext} disabled={selected.length === 0} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50">توليد المسودات ←</button>
      </div>
    </div>
  );
};

// الخطوة 3: مراجعة المسودات
const Step3_DraftReview = ({ drafts, onComplete }) => {
  const handleNext = async () => {
    // هنا نرسل طلب POST /campaigns/finalize لكل مسودة موافق عليها
    // يمكن إرسال الطلبات بشكل متوازٍ
    // POST /campaigns/finalize  body: { asset_id: ... }
    const mockFinalAssets = [ { id: 1, audience: "شباب 18-25", ad_copy: "...", image_url: "...", video_url: "..." } ];
    onComplete(mockFinalAssets);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">خطوة 3: مراجعة المسودات</h2>
      <p className="text-gray-400 mb-6">راجع المحتوى الأولي لكل فئة. يمكنك طلب تعديلات.</p>
      {/* هنا سنعرض المسودات (صورة ونص) مع أزرار للتعديل */}
      <div className="flex justify-between mt-8">
        <button className="bg-gray-700 text-white font-bold py-2 px-6 rounded-full">→ السابق</button>
        <button onClick={handleNext} className="bg-green-600 text-white font-bold py-2 px-6 rounded-full">الموافقة والإنتاج النهائي ←</button>
      </div>
    </div>
  );
};

// الخطوة 4: الإنتاج
const Step4_Production = ({ onComplete }) => {
  // هنا سنعرض شاشة تحميل مع progress bar
  // بعد انتهاء الواجهة الخلفية، سننتقل للخطوة التالية
  // useEffect(() => { setTimeout(() => onComplete(), 5000) }, []); // محاكاة لعملية إنتاج
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">خطوة 4: جاري الإنتاج...</h2>
      <p className="text-gray-400 mb-6">يقوم وكلاء الذكاء الاصطناعي الآن بإنتاج الفيديوهات النهائية. قد يستغرق هذا بضع دقائق.</p>
      {/* Progress Bar هنا */}
    </div>
  );
};

// الخطوة 5: عرض النتائج النهائية
const Step5_Results = ({ finalAssets }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🎉 تم إنشاء حملتك بنجاح!</h2>
      <p className="text-gray-400 mb-6">هذا هو المحتوى النهائي الذي تم إنتاجه لكل فئة.</p>
      {/* هنا سنعرض النتائج النهائية (فيديو، صورة، نص) لكل فئة */}
       <div className="flex justify-center mt-8">
        <button className="bg-blue-600 text-white font-bold py-2 px-6 rounded-full">الذهاب إلى الحملات</button>
      </div>
    </div>
  );
};

// ===================================================================
// 2. المكون الرئيسي الذي يدير الحالة وينتقل بين الخطوات
// ===================================================================

export default function CampPage() {
  const [step, setStep] = useState(1);
  const [campaign, setCampaign] = useState(null); // لتخزين بيانات الحملة الأساسية
  const [drafts, setDrafts] = useState([]); // لتخزين المسودات
  const [finalAssets, setFinalAssets] = useState([]); // لتخزين النتائج النهائية
  
  // دالة للانتقال من خطوة 1 إلى 2
  const onStep1Complete = (newCampaign) => {
    setCampaign(newCampaign);
    setStep(2);
  };
  
  // دالة للانتقال من خطوة 2 إلى 3
  const onStep2Complete = (generatedDrafts) => {
    setDrafts(generatedDrafts);
    setStep(3);
  };

  // دالة للانتقال من خطوة 3 إلى 4 (و 5)
  const onStep3Complete = (generatedFinalAssets) => {
    setStep(4); // الانتقال إلى شاشة التحميل
    // هنا يمكننا محاكاة وقت التحميل ثم الانتقال للنتائج
    setTimeout(() => {
      setFinalAssets(generatedFinalAssets);
      setStep(5);
    }, 5000); // 5 ثواني محاكاة
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return <Step1_ProductInput onComplete={onStep1Complete} />;
      case 2:
        return <Step2_AudienceSelection campaign={campaign} onComplete={onStep2Complete} />;
      case 3:
        return <Step3_DraftReview drafts={drafts} onComplete={onStep3Complete} />;
      case 4:
        return <Step4_Production />;
      case 5:
        return <Step5_Results finalAssets={finalAssets} />;
      default:
        return <Step1_ProductInput onComplete={onStep1Complete} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#0f172a]/80 p-6 sm:p-8 rounded-2xl border border-blue-500/30 shadow-2xl">
      {/* يمكننا إضافة progress bar هنا لاحقاً */}
      <div className="bg-black/20 p-6 rounded-lg min-h-[400px]">
        {renderStepContent()}
      </div>
    </div>
  );
}