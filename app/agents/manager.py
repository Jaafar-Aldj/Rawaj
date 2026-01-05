import autogen
from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent
from app.agents.roles import get_prompter,get_copywriter,get_director  
import os

def run_campaign_meeting(product_name, product_desc):
    # 1. استدعاء الوكلاء (بدون تعديل System Message)
    director = get_director()
    copywriter = get_copywriter()
    prompter = get_prompter()

    # 2. إعدادات المدير (ليستخدمها الوكلاء)
    # ملاحظة: سنستخدم إعدادات Gemini هنا
    llm_config = director.llm_config

    # 3. إعداد وكيل RAG (هذا هو التغيير الجوهري)
    # هذا الوكيل سيقرأ ملفات .md ويجيب منها
    rag_proxy = RetrieveUserProxyAgent(
        name="Knowledge_Base_Admin",
        is_termination_msg=lambda x: "TERMINATE" in x.get("content", ""),
        human_input_mode="NEVER",
        code_execution_config=False,
        max_consecutive_auto_reply=3,
        
        # إعدادات الاسترجاع (Retrieval Config)
       # إعدادات الاسترجاع (Retrieval Config)
        retrieve_config={
            "task": "qa",
            "docs_path": [os.path.join(os.getcwd(), "knowledge")],
            
            # إعدادات التقسيم
            "chunk_token_size": 1000,
            "model": llm_config['config_list'][0]['model'],
            
            "collection_name": "rawaj_knowledge_db", # غيرنا الاسم لنجبره على إنشاء جديد
            "get_or_create": True,
            "overwrite": True, # إجبار إعادة الفهرسة من الصفر (مهم جداً للتجربة)
        },
    )
    

    # 4. خريطة الانتقال (تحديث بسيط لإشراك وكيل المعرفة)
    # في البداية، وكيل المعرفة سيعطي المعلومات للمدير
    allowed_transitions = {
        rag_proxy: [director],
        director: [copywriter, rag_proxy],
        copywriter: [prompter],
        prompter: [director],
    }

    # 5. إعداد المجموعة
    groupchat = autogen.GroupChat(
        agents=[rag_proxy, director, copywriter, prompter],
        messages=[],
        max_round=8,
        allowed_or_disallowed_speaker_transitions=allowed_transitions,
        speaker_selection_method="auto",
        speaker_transitions_type="allowed",
    )

    manager = autogen.GroupChatManager(
        groupchat=groupchat,
        llm_config=llm_config
    )

    # 6. صياغة السؤال لـ RAG
    # نطلب منه البحث في الملفات عن استراتيجيات تناسب المنتج
    problem = f"""
    المنتج: {product_name}
    الوصف: {product_desc}
    
    المطلوب:
    1. ابحث في ملفات المعرفة (knowledge base) عن أفضل استراتيجية تسويقية تناسب هذا المنتج.
    2. زود "Creative_Director" بهذه الاستراتيجية ليبدأ التخطيط.
    3. أكملوا العمل لإنتاج نصوص ووصف للصور.
    """

    # 7. بدء الدردشة
    # ملاحظة: نستخدم retrieve_docs لتفعيل البحث أولاً
    rag_proxy.initiate_chat(
        manager,
        message=rag_proxy.message_generator, # هذا يجعل الوكيل يبحث في الملفات أولاً ويولد رسالة
        problem=problem,
    )