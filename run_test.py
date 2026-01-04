import os
import sys
from dotenv import load_dotenv
import autogen

# 1. إعداد المسارات لاستيراد الإعدادات من مجلد app
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
try:
    from agents.config import llm_config
except ImportError as e:
    print("Error: Could not import config. Make sure 'app/agents/config.py' exists.")
    print(e)
    exit()

# 2. تحميل المتغيرات البيئية (للتأكد فقط)
load_dotenv()

print("🤖 Initializing Gemini Agent...")

# 3. إنشاء وكيل الذكاء الاصطناعي (Assistant)
# سنستخدم Gemini 2.5 Flash لأنه الأسرع للتجربة
assistant = autogen.AssistantAgent(
    name="Marketing_Assistant",
    llm_config=llm_config,
    system_message="أنت مساعد تسويق ذكي ومبدع. ردودك قصيرة ومباشرة."
)

# 4. إنشاء وكيل المستخدم (User Proxy)
# هذا الوكيل يمثلك أنت، وهو الذي سيبدأ الحوار
user_proxy = autogen.UserProxyAgent(
    name="User_Admin",
    code_execution_config=False, # لا نحتاج تنفيذ كود في هذا الاختبار
    human_input_mode="NEVER",    # لا تطلب مني إدخالاً، أكمل الحوار تلقائياً
    max_consecutive_auto_reply=1 # رد مرة واحدة فقط ثم توقف
)

# 5. بدء المحادثة
message = "مرحباً! عرف عن نفسك واقترح شعاراً (Slogan) إبداعياً لشركة قهوة جديدة."
print(f"👨‍💻 User: {message}")
print("-" * 50)

user_proxy.initiate_chat(
    assistant,
    message=message
)