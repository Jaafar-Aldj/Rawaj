// src/lib/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

class ApiService {
  // دالة أساسية للطلبات
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // إذا كان فيه token في localStorage
    const token = localStorage.getItem('token');
    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'حدث خطأ في الاتصال');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // رفع صورة المنتج
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file); // أو image حسب الـ API

    const response = await fetch(`${API_BASE_URL}/products/upload-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('فشل في رفع الصورة');
    }

    return await response.json();
  }

  // إنشاء منتج جديد
  async createProduct(productData) {
    return this.request('/products/', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  // تحليل المنتج
  async analyzeProduct(productId) {
    return this.request('/campaigns/analyze', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
  }

  // توليد مسودة الإعلان
  async generateDraft(productId, targetAudience) {
    return this.request('/campaigns/generate_drafts', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        target_audience: targetAudience,
      }),
    });
  }

  // توليد الفيديو النهائي
  async finalizeCampaign(assetId) {
    return this.request('/campaigns/finalize', {
      method: 'PUT',
      body: JSON.stringify({ asset_id: assetId }),
    });
  }

  // جلب حملة محددة
  async getCampaign(campaignId) {
    return this.request(`/campaigns/${campaignId}`);
  }

  // جلب كل الحملات
  async getCampaigns() {
    return this.request('/campaigns/');
  }
}

export default new ApiService();