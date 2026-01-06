import autogen
from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent
from app.agents.roles import get_director, get_copywriter, get_prompter
import os

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

    return chat_result.chat_history