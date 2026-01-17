import autogen
from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent
from app.agents.roles import get_director, get_copywriter, get_prompter
from app.services.image_gen import generate_image_with_imagen
import os
import json
import re

# إعدادات عامة
def get_rag_proxy(llm_config):
    return RetrieveUserProxyAgent(
        name="Knowledge_Base_Admin",
        human_input_mode="NEVER",
        code_execution_config=False,
        max_consecutive_auto_reply=1, # رد واحد يكفي
        retrieve_config={
            "task": "qa",
            "docs_path": [os.path.join(os.getcwd(), "knowledge")],
            "chunk_token_size": 1000, 
            "model": llm_config['config_list'][0]['model'],
            "collection_name": "rawaj_final_db", 
            "get_or_create": True,
        },
    )


# ==============================================================================
# الوظيفة 1: اقتراح الفئات المستهدفة (مع الشرح)
# ==============================================================================
def suggest_audiences(product_name, product_desc):
    director = get_director()
    rag_proxy = get_rag_proxy(director.llm_config)

    # الرسالة المعدلة: طلبنا Reason مع كل Audience
    message = f"""
    Product: {product_name}
    Description: {product_desc}
    
    TASK: Based on the knowledge base strategies, suggest 3 distinct Target Audiences for this product.
    For each audience, provide a very brief reason (one sentence) explaining WHY they are a good fit.
    
    IMPORTANT: Output ONLY a valid JSON structure like this:
    {{
        "suggestions": [
            {{ "audience": "Name of Audience 1", "reason": "Why this fits..." }},
            {{ "audience": "Name of Audience 2", "reason": "Why this fits..." }},
            {{ "audience": "Name of Audience 3", "reason": "Why this fits..." }}
        ]
    }}
    """

    chat_result = rag_proxy.initiate_chat(
        director,
        message=rag_proxy.message_generator,
        problem=message,
        max_turns=2
    )

    last_message = chat_result.chat_history[-1]['content']
    try:
        json_match = re.search(r"\{.*\}", last_message, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return data # سيرجع { "suggestions": [...] }
    except:
        print("❌ Failed to parse audiences JSON")
    
    # قيمة افتراضية محسنة
    return {
        "suggestions": [
            {"audience": "General Audience", "reason": "Broad appeal product."},
            {"audience": "Early Adopters", "reason": "Interested in new tech."},
            {"audience": "Budget Conscious", "reason": "Affordable pricing."}
        ]
    }
# ==============================================================================
# الوظيفة 2: توليد المحتوى لفئة محددة (للمرحلة الثانية)
# ==============================================================================
def generate_content_for_audience(product_name, product_desc, audience):
    director = get_director()
    copywriter = get_copywriter()
    prompter = get_prompter()
    
    # نستخدم UserProxy عادي هنا (لسنا بحاجة لـ RAG في كل مرة لتوفير الوقت)
    user = autogen.UserProxyAgent(name="User", human_input_mode="NEVER", code_execution_config=False)

    # تسلسل العمل: المدير -> الكاتب -> المهندس
    groupchat = autogen.GroupChat(
        agents=[user, director, copywriter, prompter],
        messages=[],
        max_round=5,
        speaker_selection_method="round_robin" # إجبار الترتيب
    )
    
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=director.llm_config)

    message = f"""
    Product: {product_name}
    Target Audience: {audience}
    
    TASK:
    1. Director: Briefly instruct the team.
    2. Copywriter: Write Arabic ad copy specifically for '{audience}'. Output JSON.
    3. Prompt_Engineer: Create visual prompts for '{audience}'. Output JSON.
    """

    chat_result = user.initiate_chat(manager, message=message)

    # --- استخراج النتائج ---
    final_output = {
        "ad_copy": {},
        "image_prompt": None,
        "image_url": None,
        "video_prompt": None
    }

    for msg in chat_result.chat_history:
        name = msg.get("name", "")
        content = msg.get("content", "")

        # 1. استخراج النصوص من الكاتب
        if name == "Copywriter":
            try:
                json_match = re.search(r"\{.*\}", content, re.DOTALL)
                if json_match:
                    final_output["ad_copy"] = json.loads(json_match.group())
            except: pass

        # 2. استخراج الصور من المهندس وتوليدها
        if name == "Prompt_Engineer":
            try:
                json_match = re.search(r"\{.*\}", content, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
                    
                    # حفظ الوصف
                    image_prompt = data.get("image_prompts", [])[0]
                    final_output["image_prompt"] = image_prompt
                    final_output["video_prompt"] = data.get("video_prompt")
                    
                    # توليد الصورة
                    if image_prompt:
                        print(f"🎨 Generating Image for {audience}...")
                        final_output["image_url"] = generate_image_with_imagen(image_prompt)
            except: pass

    return final_output