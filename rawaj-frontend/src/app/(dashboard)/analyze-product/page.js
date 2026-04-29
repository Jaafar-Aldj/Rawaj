'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  ArrowLeftIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

export default function AnalyzeProductPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campaignId, setCampaignId] = useState(null);
  const [productId, setProductId] = useState(null);
  const [finalSummaryReady, setFinalSummaryReady] = useState(false);
  const [approving, setApproving] = useState(false);
  const [awaitingManualApproval, setAwaitingManualApproval] = useState(false);

  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const chatContainerRef = useRef(null);

  // التمرير التلقائي
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const storedProductId = localStorage.getItem('currentProductId');
    if (!authLoading) {
      if (!storedProductId) {
        router.push('/create-product');
      } else {
        setProductId(storedProductId);
      }
      if (!isAuthenticated) {
        router.push('/login');
      }
    }
  }, [authLoading, isAuthenticated, router]);

  // دالة تنظيف النص من أوامر النظام مثل [SYSTEM: ...]
  const cleanSystemText = (text) => {
    return text.replace(/\[SYSTEM:[^\]]*\]/gi, '').trim();
  };

  // دالة محسنة للتعرف على العبارات النهائية بعد التنظيف
  const isFinalConfirmation = (text) => {
    const cleanedText = cleanSystemText(text);
    const confirmPhrases = [
      'تم اعتماد الخطة النهائية',
      'تم اعتماد الاستراتيجية',
      'جاهزة للانطلاق',
      'الخطة النهائية',
      'استراتيجية نهائية',
      'تم اعتماد الخطة',
      'تمت الموافقة على الخطة',
      'الخطة معتمدة',
      'موافقة نهائية',
      'نعم، تم اعتماد الخطة',
      'تم اعتماد الاستراتيجية بنجاح',
      'اعتماد الخطة',
      'الخطة النهائية معتمدة'
    ];
    return confirmPhrases.some(phrase => cleanedText.includes(phrase));
  };

  // دالة للتعرف على أن المساعد يطلب الموافقة (لإظهار الزر اليدوي)
  const isAskingForApproval = (text) => {
    const cleanedText = cleanSystemText(text);
    const approvalPhrases = [
      'جاهز لاعتمادها',
      'هل أنت راضٍ',
      'هل توافق',
      'هل تعتمد',
      'اعتماد الخطة',
      'لنبدأ التنفيذ',
      'هل أنت مستعد',
      'أؤكد اعتمادك'
    ];
    return approvalPhrases.some(phrase => cleanedText.includes(phrase));
  };

  const processApiResponse = (responseData) => {
  if (responseData.id) {
    setCampaignId(responseData.id);
    localStorage.setItem('campaignId', responseData.id.toString());
  }
  
  // حفظ الخطة إذا كانت موجودة في الرد (JSON)
  if (responseData.name && responseData.objective) {
    localStorage.setItem('finalStrategy', JSON.stringify(responseData));
  }
  
  const chatHistory = responseData.chat_history || [];
  const lastAssistantMsg = [...chatHistory].reverse().find(m => m.role === 'assistant');
  if (!lastAssistantMsg) return null;

  const rawText = lastAssistantMsg.content;
  const cleanedText = cleanSystemText(rawText);

  setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', text: cleanedText }]);

  // 1. التحقق من التأكيد النهائي عبر النصوص (بعد موافقة المستخدم)
  if (isFinalConfirmation(cleanedText)) {
    setFinalSummaryReady(true);
    setAwaitingManualApproval(false);
    return;
  }
  
  // 2. إذا كان الرد عبارة عن خطة JSON (يحتوي على name و objective) ولم تتم الموافقة بعد
  //    ولم يكن المساعد يطلب الموافقة بالفعل، نظهر زر الاعتماد للمستخدم
  const isJsonPlan = (rawText.trim().startsWith('{') || rawText.includes('"name"')) && 
                     (rawText.includes('"objective"') || rawText.includes('"audience"'));
  
  if (isJsonPlan && !finalSummaryReady && !awaitingManualApproval) {
    // نعرض الخطة ولكن نطلب من المستخدم الموافقة، لا نعتبرها موافقة تلقائية
    setAwaitingManualApproval(true);
    return;
  }
  
  // 3. إذا كان المساعد يطلب الموافقة بعبارات صريحة (مثل "هل أنت راضٍ؟")
  if (isAskingForApproval(cleanedText) && !finalSummaryReady) {
    setAwaitingManualApproval(true);
  } else {
    // في الحالات العادية لا نظهر زر الاعتماد
    // لكن إذا لم تكن هناك خطة بعد ولا تأكيد، نضمن إخفاء الزر
    if (!finalSummaryReady && !isJsonPlan) {
      setAwaitingManualApproval(false);
    }
  }
};

  const startAnalysis = async () => {
    if (!productId) return;
    localStorage.removeItem('campaignId');
    setMessages([]);
    setCampaignId(null);
    setFinalSummaryReady(false);
    setAwaitingManualApproval(false);
    setError('');
    setLoading(true);

    try {
      const response = await api('/campaigns/analyze/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(productId),
          message: `ابدأ بتحليل المنتج واقترح استراتيجية تسويقية. في نهاية الحوار عند موافقتي، قل بالضبط: "تم اعتماد الخطة النهائية".`
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'فشل بدء التحليل');
      processApiResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !campaignId || loading) return;
    const userMsg = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userMsg }]);
    setLoading(true);
    setAwaitingManualApproval(false);

    try {
      const response = await api('/campaigns/analyze/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(productId),
          message: userMsg,
          campaign_id: parseInt(campaignId)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'فشل في معالجة طلبك');
      processApiResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // الاعتماد اليدوي: يرسل رسالة "تم اعتماد الخطة النهائية" تلقائياً
  const handleManualApproval = async () => {
    if (!campaignId || loading) return;
    setInputMessage('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: 'تم اعتماد الخطة النهائية' }]);
    setLoading(true);
    setAwaitingManualApproval(false);

    try {
      const response = await api('/campaigns/analyze/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(productId),
          message: 'تم اعتماد الخطة النهائية',
          campaign_id: parseInt(campaignId)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'فشل في اعتماد الخطة');
      processApiResponse(data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!campaignId) return;
    setApproving(true);
    try {
      const response = await api('/campaigns/analyze/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: parseInt(campaignId) })
      });
      if (!response.ok) throw new Error('فشل في اعتماد الحملة');
      router.push('/select-platforms');
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoadingSpinner size="lg" color="#111827" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 text-right" dir="rtl">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-white mb-2">تحليل الجمهور</h1>
          <p className="text-text-muted text-sm font-medium">الخطوة الثالثة: صياغة الاستراتيجية التسويقية</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between bg-white p-5 rounded-3xl shadow-lg border border-white/10">
          {[
            { id: 1, name: 'رفع الصورة', status: 'done' },
            { id: 2, name: 'بيانات المنتج', status: 'done' },
            { id: 3, name: 'تحليل الجمهور', status: 'active' },
            { id: 4, name: 'تحديد الاستراتيجية', status: 'pending' },
            { id: 5, name: 'توليد الإعلان', status: 'pending' }
          ].map((step) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-500 ${
                  step.status === 'active' ? 'bg-green-600 text-white shadow-md shadow-gray-200' : 
                  step.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {step.status === 'done' ? <CheckCircleIcon className="w-5 h-5" /> : step.id}
                </div>
                <span className={`text-[10px] font-bold ${step.status !== 'pending' ? 'text-gray-900' : 'text-gray-400'}`}>{step.name}</span>
              </div>
              {step.id < 5 && (
                <div className={`flex-1 h-[2px] mx-3 mb-5 rounded-full ${
                  step.id < 3 ? 'bg-green-100' : 
                  step.id === 3 && step.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Chat Section */}
        <div className="flex flex-col h-[100vh] bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
          {/* Top Bar */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center relative">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-900" />
              </div>
              <div>
                <h2 className="font-black text-gray-900 text-md">مساعد رواج الذكي</h2>
              </div>
            </div>
            <button
              onClick={startAnalysis}
              disabled={loading}
              className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 shadow-sm"
            >
              <PlusCircleIcon className="w-4 h-4" />
              {messages.length === 0 ? 'ابدأ التحليل' : 'إعادة التحليل'}
            </button>
          </div>

          {/* Chat Content */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-white scroll-smooth custom-scrollbar">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                <SparklesIcon className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500 font-bold text-sm">اضغط "ابدأ التحليل" لرسم خطة التسويق</p>
              </div>
            )}
            
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} gap-3`}
                >
                  {msg.role === 'user' && <UserCircleIcon className="w-8 h-8 text-gray-900 shrink-0" />}
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user' 
                      ? 'bg-gray-900 text-white rounded-tr-none shadow-lg' 
                      : 'bg-gray-100 text-gray-800 border border-gray-100 rounded-tl-none'
                  }`}>
                    <div className={`prose prose-sm max-w-none font-medium leading-relaxed ${msg.role === 'user' ? 'prose-invert text-white' : 'text-gray-800'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center shrink-0 shadow-sm relative">
                      <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {loading && (
              <div className="flex justify-end gap-3 animate-pulse">
                <div className="bg-gray-50 px-6 py-4 rounded-2xl rounded-tl-none border border-gray-100 text-xs text-gray-500 font-bold">
                  جاري معالجة الاستراتيجية...
                </div>
              </div>
            )}
          </div>

          {/* Input & Action Area */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-4">
            <form onSubmit={sendMessage} className="relative">
              <input 
                type="text" 
                value={inputMessage} 
                onChange={(e) => setInputMessage(e.target.value)} 
                autoComplete="off"
                placeholder='اسأل المساعد أو عدل على الخطة...' 
                className="w-full bg-white border-2 border-transparent rounded-2xl py-4 pr-5 pl-14 text-gray-900 text-sm font-bold shadow-sm focus:border-gray-900 focus:outline-none transition-all" 
                disabled={!campaignId && messages.length > 0}
              />
              <button 
                type="submit" 
                disabled={loading || !inputMessage.trim()}
                className="absolute left-2 top-2 bottom-2 px-4 bg-gray-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-30"
              >
                <PaperAirplaneIcon className="w-5 h-5 rotate-180" />
              </button>
            </form>

            {/* زر الاعتماد اليدوي (يظهر عندما يطلب المساعد الموافقة) */}
            <AnimatePresence>
              {awaitingManualApproval && !finalSummaryReady && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                  <button
                    onClick={handleManualApproval}
                    disabled={loading}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <CheckBadgeIcon className="w-5 h-5" />
                    اعتماد الخطة النهائية
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* زر المتابعة الأصلي */}
            <AnimatePresence>
              {finalSummaryReady && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <button
                    onClick={handleNext}
                    disabled={approving}
                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-md shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
                  >
                    {approving ? <LoadingSpinner size="sm" color="white" /> : (
                      <>
                        المتابعة لاختيار المنصات 
                        <ArrowLeftIcon className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}