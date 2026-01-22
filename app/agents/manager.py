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

def json_match_extractor(content):
    '''Take a chat from LLM and extract JSON part'''
    try:
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return data
    except:
        print("❌ Failed to parse JSON")
        raise json.JSONDecodeError
    return None


def suggest_audiences(product_name, product_desc):
    '''Take product details and suggest some target audiences with reasons (up to 5)'''
    director = get_director()
    rag_proxy = get_rag_proxy(director.llm_config)

    # الرسالة المعدلة: طلبنا Reason مع كل Audience
    message = f"""
    Product: {product_name}
    Description: {product_desc}
    
    TASK: Based on the knowledge base strategies, suggest up to 5 (or less) distinct Target Audiences for this product.
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
    data = json_match_extractor(last_message)
    if data:
        return data 
    return {
        "suggested_audiences": [
            {"audience": "General Audience", "reason": "Broad appeal product."},
            {"audience": "Early Adopters", "reason": "Interested in new tech."},
            {"audience": "Budget Conscious", "reason": "Affordable pricing."}
        ]
    }



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
    product Description: {product_desc}
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
        "video_prompt": None,
        "video_url": None,
    }

    for msg in chat_result.chat_history:
        name = msg.get("name", "")
        content = msg.get("content", "")

        # 1. استخراج النصوص من الكاتب
        if name == "Copywriter":
            final_output["ad_copy"] = json_match_extractor(content)

        # 2. استخراج الصور من المهندس وتوليدها
        if name == "Prompt_Engineer":
            data = json_match_extractor(content)
           
            image_prompt = data.get("image_prompt")
            video_prompt = data.get("video_prompt")

            final_output["image_prompt"] = image_prompt
            final_output["video_prompt"] = video_prompt
                    
            if image_prompt:
                print(f"🎨 Generating Image for {audience}...")
                final_output["image_url"] = generate_image_with_imagen(image_prompt)

    return final_output


# ==============================================================================
# الوظيفة 3: تعديل المسودة (Feedback Loop)
# ==============================================================================
def refine_draft(current_data, feedback, edit_type="both"):
    """
    يقوم بتعديل المحتوى بناءً على ملاحظات المستخدم.
    current_data: { "ad_copy": ..., "image_prompt": ... }
    edit_type: "text", "image", or "both"
    """
    director = get_director()
    copywriter = get_copywriter()
    prompter = get_prompter()
    
    # وكيل يمثل المستخدم وتعديلاته
    user = autogen.UserProxyAgent(
        name="User_Feedback",
        human_input_mode="NEVER",
        code_execution_config=False
    )
    
    # تحديد من سيشارك في الاجتماع بناءً على نوع التعديل
    participants = [user]
    if edit_type in ["text", "both"]:
        participants.append(copywriter)
    if edit_type in ["image", "both"]:
        participants.append(prompter)
        
    groupchat = autogen.GroupChat(
        agents=participants,
        messages=[],
        max_round=3,
        speaker_selection_method="round_robin"
    )
    
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=director.llm_config)

    # صياغة الرسالة بدقة
    task_msg = f"User Feedback: {feedback}\n"
    
    if edit_type in ["text", "both"]:
        task_msg += f"Current Copy (JSON): {json.dumps(current_data.get('ad_copy', {}), ensure_ascii=False)}\nTask: Copywriter, Rewrite the ad copy based on feedback. Output JSON.\n"
        
    if edit_type in ["image", "both"]:
        task_msg += f"Current Image Prompt: {current_data.get('image_prompt', '')}\nTask: Prompt_Engineer, Update the image prompt based on feedback. Output JSON.\n"

    # تشغيل الاجتماع المصغر
    chat_result = user.initiate_chat(manager, message=task_msg)

    # استخراج النتائج الجديدة
    refined_output = {}
    
    for msg in chat_result.chat_history:
        name = msg.get("name", "")
        content = msg.get("content", "")

        # استخراج النص الجديد
        if name == "Copywriter" and edit_type in ["text", "both"]:
            try:
                json_match = re.search(r"\{.*\}", content, re.DOTALL)
                if json_match:
                    refined_output["ad_copy"] = json.loads(json_match.group())
            except: pass

        # استخراج الوصف الجديد وتوليد الصورة
        if name == "Prompt_Engineer" and edit_type in ["image", "both"]:
            try:
                json_match = re.search(r"\{.*\}", content, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
                    
                    image_prompt = data.get("image_prompts", [])[0]
                    refined_output["image_prompt"] = image_prompt
                    refined_output["video_prompt"] = data.get("video_prompt") # تحديث فيديو برومبت أيضاً
                    
                    if image_prompt:
                        print(f"🎨 Regenerating Image based on feedback...")
                        # توليد صورة جديدة
                        refined_output["image_url"] = generate_image_with_imagen(image_prompt)
            except: pass

    return refined_output