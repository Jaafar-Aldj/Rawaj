import autogen
from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent
from app.agents.roles import get_director, get_copywriter, get_prompter
import os
import json
import re
from app.services.image_gen import generate_image_with_imagen

def run_campaign_meeting(product_name, product_desc):
    director = get_director()
    copywriter = get_copywriter()
    prompter = get_prompter()
    llm_config = director.llm_config

    rag_proxy = RetrieveUserProxyAgent(
        name="Knowledge_Base_Admin",
        is_termination_msg=lambda x: "TERMINATE" in x.get("content", "").upper(),
        human_input_mode="NEVER",
        code_execution_config=False,
        max_consecutive_auto_reply=3,
        retrieve_config={
            "task": "qa",
            "docs_path": [os.path.join(os.getcwd(), "knowledge")],
            "chunk_token_size": 1000, 
            "model": llm_config['config_list'][0]['model'],
            "collection_name": "rawaj_final_db", # اسم جديد
            "get_or_create": True,
            "overwrite": True, 
        },
    )

    # --- دالة الاختيار المخصص (الحل الجذري) ---
    def custom_speaker_selection(last_speaker, groupchat):
        messages = groupchat.messages
        if not messages:
            return director # البداية دائماً للمدير بعد الآدمن
        
        last_message = messages[-1]["content"]
        
        # 1. قاعدة الإنهاء الصارمة
        if "TERMINATE" in last_message:
            return rag_proxy # سلم للآدمن لينهي الحوار فوراً

        # 2. تسلسل العمل الطبيعي (Pipeline)
        if last_speaker is rag_proxy:
            return director
        elif last_speaker is director:
            return copywriter
        elif last_speaker is copywriter:
            return prompter
        elif last_speaker is prompter:
            return director # ارجع للمدير للمراجعة
            
        return "auto" 
    # -------------------------------------------

    groupchat = autogen.GroupChat(
        agents=[rag_proxy, director, copywriter, prompter],
        messages=[],
        max_round=10,
        speaker_selection_method=custom_speaker_selection, # نستخدم دالتنا الخاصة
    )

    manager = autogen.GroupChatManager(
        groupchat=groupchat,
        llm_config=llm_config
    )

    problem = f"""
    المنتج: {product_name}
    الوصف: {product_desc}
    
    المطلوب:
    1. ابحث في المعرفة عن استراتيجية.
    2. وجه Creative_Director.
    3. أنتجوا النصوص والصور.
    """

    chat_result = rag_proxy.initiate_chat(
        manager,
        message=rag_proxy.message_generator,
        problem=problem,
    )
    

    # ... (الجزء العلوي من الملف كما هو) ...

    # ---------------------------------------------------------
    # 8. مرحلة استخراج النتائج والتنفيذ (Updated Logic)
    # ---------------------------------------------------------
    
    final_output = {
        "ad_copy": {},
        "image_path": None,
        "video_prompt": None
    }

    print("\n🔍 Analyzing chat history for prompts...")

    # نبحث في تاريخ المحادثة
    for message in reversed(chat_result.chat_history):
        content = message.get("content", "")
        name = message.get("name", "")
        
        # استخراج الصور من مهندس الوصف
        if name == "Prompt_Engineer":
            image_prompt = None
            
            # محاولة 1: البحث عن JSON
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                    # قد يكون مصفوفة أو نصاً واحداً
                    prompts = data.get("image_prompts", [])
                    if isinstance(prompts, list) and len(prompts) > 0:
                        image_prompt = prompts[0]
                    elif isinstance(prompts, str):
                        image_prompt = prompts
                    
                    final_output["video_prompt"] = data.get("video_prompt")
                except:
                    pass

            # محاولة 2: البحث عن النص العادي (Fallback) - هذا سيحل مشكلتك الحالية
            if not image_prompt:
                # ريجيكس يبحث عن النص الذي يأتي بعد **Image Prompt:**
                text_match = re.search(r"\*\*Image Prompt:\*\*\s*(.*)", content, re.IGNORECASE)
                if text_match:
                    image_prompt = text_match.group(1).strip()
                    # تنظيف النص من أي زيادات في النهاية
                    if "**Video Prompt:**" in content:
                         # نأخذ النص الموجود بين Image Prompt و Video Prompt
                         split_content = content.split("**Video Prompt:**")
                         image_parts = split_content[0].split("**Image Prompt:**")
                         if len(image_parts) > 1:
                             image_prompt = image_parts[1].strip()

            # === التنفيذ إذا وجدنا الوصف ===
            if image_prompt:
                print(f"🎨 Found Prompt: {image_prompt}")
                print("🚀 Sending to Google Imagen...")
                
                try:
                    # استدعاء دالة التوليد
                    final_output["image_path"] = generate_image_with_imagen(image_prompt)
                except Exception as e:
                    print(f"❌ Image Generation Failed: {e}")
                
                break # وجدنا المطلوب، نتوقف عن البحث

    return final_output






    















 
    
    

    
    