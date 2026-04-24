// src/components/GenerationProgressModal.js
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function GenerationProgressModal({ isOpen, currentStatus }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-panel border border-border-color rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
        >
          {/* تأثيرات إضاءة خلفية */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-green-500/20 blur-[50px] rounded-full"></div>

          {/* أيقونة متحركة */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <SparklesIcon className="w-8 h-8 text-green-400 animate-pulse" />
            </div>
          </div>

          <h3 className="text-xl font-black text-white mb-2">
            فريق الذكاء الاصطناعي يعمل...
          </h3>
          
          {/* صندوق عرض النص اللحظي */}
          <div className="bg-background border border-gray-800 rounded-xl p-4 mt-6 min-h-[80px] flex items-center justify-center">
            <motion.p
              key={currentStatus} // يجعل النص يظهر بتأثير حركي عند تغيره
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-400 font-bold text-sm leading-relaxed"
            >
              {currentStatus || 'جاري الاتصال بالخوادم...'}
            </motion.p>
          </div>

          <p className="text-gray-500 text-xs mt-4 font-medium">
            يرجى عدم إغلاق هذه الصفحة، قد تستغرق العملية بضع دقائق حسب نوع المحتوى.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}