import streamlit as st
import sys
import os

# إعداد المسارات لربط الواجهة بالباك إند
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# استدعاء المايسترو
from app.agents.manager import run_campaign_meeting

# إعدادات الصفحة
st.set_page_config(page_title="Rawaj AI", page_icon="🚀", layout="wide")

# العنوان
st.title("🚀 Rawaj: منصة التسويق الذكي")
st.markdown("---")

# تقسيم الشاشة (يسار: مدخلات، يمين: نتائج)
col1, col2 = st.columns([1, 2])

with col1:
    st.header("بيانات المنتج")
    product_name = st.text_input("اسم المنتج", placeholder="مثال: مغسلة جوني")
    product_desc = st.text_area("وصف المنتج", placeholder="مثال: غسيل وكوي سريع 24 ساعة...")
    
    start_btn = st.button("ابدأ الحملة 🎬", type="primary")

with col2:
    st.header("غرفة عمليات الوكلاء")
    terminal_output = st.empty() # مكان لعرض الحوار

    if start_btn and product_name and product_desc:
        with st.spinner("جاري استدعاء فريق التسويق..."):
            # هنا سنحتاج لتعديل بسيط لاحقاً لعرض الكلام في الموقع بدلاً من التيرمينال
            # حالياً سيظهر في التيرمينال الخلفي
            try:
                run_campaign_meeting(product_name, product_desc)
                st.success("تمت المهمة بنجاح! راجع التيرمينال للنتائج (سننقلها هنا قريباً).")
            except Exception as e:
                st.error(f"حدث خطأ: {e}")