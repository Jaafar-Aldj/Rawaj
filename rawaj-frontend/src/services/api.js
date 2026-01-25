// src/services/api.js

// دالة أساسية لتكوين الـ Headers
const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem('authToken');
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};


// دالة fetch معترضة (Intercepted Fetch)
const api = async (url, options = {}) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      ...getAuthHeaders(isFormData),
      ...options.headers,
    },
  });

  // النقطة الأهم: التحقق من صلاحية التوكن
  // إذا كانت الاستجابة 401، فهذا يعني أن التوكن منتهي الصلاحية أو غير صالح
  if (response.status === 401) {
    // تسجيل خروج المستخدم تلقائياً
    localStorage.removeItem('authToken');
    // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
    window.location.href = '/login'; 
    // إيقاف التنفيذ لمنع الأخطاء الأخرى
    throw new Error('Session expired. Please log in again.');
  }

  return response;
};

export default api;