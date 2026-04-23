import os
import json
import re
import concurrent.futures
from datetime import datetime
import google.generativeai as genai
import PIL.Image

import autogen
from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent

from app.agents.agents_system_messages import get_prompter_updated_message
from app.agents.countries_utils import ARABIC_COUNTRIES
from app.agents.roles import get_director, get_copywriter, get_marketing_strategist, get_video_director, get_prompter
from app.services.image_gen import generate_image
from app.services.video_gen import  extend_veo_video, generate_veo_video
from app.services.video_processing import concatenate_veo_videos
from app.services.vision_qa import analyze_media 
from app.agents import prompt_templates
from app.services.events import get_upcoming_events_for_strategy
from app.services.audio_gen import generate_voiceover, merge_video_audio
from app.agents.config import api_key


# إعداد مكتبة جوجل مباشرة لتحليل الصور
if api_key:
    genai.configure(api_key=api_key)

# ==============================================================================
# Helpers (المساعدات)
# ==============================================================================
def create_rag_proxy(name: str, folder: str, collection: str, llm_model: str, overwrite: bool = False):
    docs_path = os.path.join(os.getcwd(), "knowledge", folder)
    os.makedirs(docs_path, exist_ok=True)
    
    return RetrieveUserProxyAgent(
        name=name,
        human_input_mode="NEVER",
        code_execution_config=False,
        max_consecutive_auto_reply=1, 
        retrieve_config={
            "task": "qa",
            "docs_path": [docs_path],
            "chunk_token_size": 1000, 
            "model": llm_model,
            "collection_name": collection, 
            "get_or_create": True,
            "overwrite": overwrite,
            "custom_text_types": ["md", "txt", "pdf"],
            "embedding_model": "models/text-embedding-004", 
        },
    )

def get_local_media_path(file_path: str):
    """دالة مساعدة لاستخراج المسار المحلي من الرابط أو المسار المطلق"""
    if not file_path: return None
    # if "http" in file_path and "upload" in file_path:
    #     filename = file_path.split("upload/")[-1]
    #     path = os.path.join("rawaj-frontend", "assets", "upload", filename) 
    #     if os.path.exists(path): return path
    # elif "http" in file_path and "images" in file_path:
    #     filename = file_path.split("images/")[-1]
    #     path = os.path.join("rawaj-frontend", "assets", "images", filename)
    #     if os.path.exists(path): return path
    # elif os.path.exists(file_path):
    #     return file_path
    # return None
    if "http" in file_path:
         if "assets/" in file_path:
            relative_path = file_path.split("assets/")[-1]
            local_path = os.path.join("rawaj-frontend", "assets", relative_path)
            local_path = os.path.normpath(local_path)
            if os.path.exists(local_path):
                return local_path
            else:
                print(f"⚠️ Warning: File not found locally at {local_path}")
                return None                
    elif os.path.exists(file_path):
        return file_path
        
    return None

def extract_agent_json(chat_history, target_agent_name, json_key=None):
    """دالة مساعدة للبحث العكسي في المحادثة واستخراج الـ JSON من وكيل محدد"""
    for msg in reversed(chat_history):
        if msg.get("name") == target_agent_name:
            data = json_match_extractor(msg.get("content", ""))
            if data:
                return data.get(json_key, data) if json_key else data
    return None

def json_match_extractor(content):
    try:
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if json_match: return json.loads(json_match.group())
        list_match = re.search(r"\[.*\]", content, re.DOTALL)
        if list_match: return json.loads(list_match.group())
    except Exception as e:
        print(f"❌ Failed to parse JSON: {e}")
    return None

def normalize_prompts_data(data):
    image_prompt = None
    video_storyboard = []
    if not data: return None, []

    if isinstance(data, dict):
        image_prompt = data.get("main_image_prompt") or data.get("image_prompt")
        storyboard = data.get("video_storyboard") or data.get("scenes")
        
        if isinstance(storyboard, list):
            video_storyboard = storyboard
        elif isinstance(storyboard, dict):
            video_storyboard = [storyboard]
        elif not storyboard:
            fallback = data.get("video_prompt")
            if fallback and isinstance(fallback, str):
                video_storyboard = [{"scene_number": 1, "image_prompt": image_prompt, "motion_prompt": fallback, "voiceover_text": ""}]

    if isinstance(image_prompt, list) and len(image_prompt) > 0: image_prompt = str(image_prompt[0])
    if isinstance(image_prompt, dict): image_prompt = str(image_prompt)

    return image_prompt, video_storyboard

def extract_country_code(text: str) -> str:
    """يبحث في نص المستخدم عن أي اسم دولة ويرجع الكود الخاص بها"""
    text_lower = text.lower()
    for country_name, code in ARABIC_COUNTRIES.items():
        if country_name in text_lower:
            return code
    return None

#===============================================================================
#  Vision QA
#===============================================================================
def analyze_image_content(image_path):
    local_path = get_local_media_path(image_path)
    if not local_path: return ""
    try:
        print(f"👁️ Analyzing image: {local_path}...")
        model = genai.GenerativeModel('gemini-2.5-flash')
        img = PIL.Image.open(local_path)
        prompt = "Describe this product image in high detail for a marketing team. Focus on colors, materials, style, and key features. Be objective."
        response = model.generate_content([prompt, img])
        return f"\n[AI Visual Analysis]: {response.text}"
    except Exception as e:
        print(f"⚠️ Image Analysis Failed: {e}")
        return ""

def generate_and_review_image(image_prompt, reference_image_path=None, aspect_ratio="16:9", max_retries=2, notify_callback=None, thought_signature=None):
    current_prompt = image_prompt
    attempt = 1
    last_generated_image = None
    last_signature = None

    while attempt <= max_retries:
        if notify_callback: notify_callback(f"🕵️‍♂️ جاري تدقيق الصورة آلياً (المحاولة {attempt}/{max_retries})...")
        print(f"\n🔄 [Image QA] Attempt {attempt}/{max_retries}...")
        image_path, signature = generate_image(current_prompt, reference_image_path, aspect_ratio, thought_signature)
        
        if not image_path or not os.path.exists(image_path):
            print(f"❌ Image generation failed at attempt {attempt}.")
            if notify_callback:
                notify_callback("⚠️ فشل توليد الصورة. محاولة جديدة...")
            return last_generated_image, last_signature
        last_generated_image = image_path
        last_signature = signature
        # استدعاء المخرج الفني لتقييم الصورة
        if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع جودة الصورة...")
        review_data = analyze_media(image_path, current_prompt, media_type="image", reference_image_path=reference_image_path)

        if review_data["status"] == "APPROVED":
            print("✅ Art Director APPROVED the image!")
            if notify_callback:
                notify_callback("✅ الصورة اجتازت التدقيق الفني.")
            return image_path, signature
        elif review_data["status"] == "REJECTED":
            reason = review_data["feedback"]
            
            if notify_callback: 
                notify_callback(f"⚠️ تم رفض الصورة، جاري تحسين الجودة (السبب: خطأ في التوليد). محاولة جديدة...")
            print(f"❌ Art Director REJECTED the image: {reason}")
            
            # حذف الصورة المعيبة
            if attempt < max_retries: # فقط نحذف إذا كنا سنحاول مرة أخرى
                try: os.remove(image_path)
                except: pass
            
            # تحديث البرومبت بتعليمات المخرج
            current_prompt = review_data.get("improved_prompt") or f"{image_prompt}. CRITICAL FIX: {reason}"
            attempt += 1
        else:
            if notify_callback: notify_callback("✅ تم اعتماد الصورة (تجاوز الفحص).")
            return image_path, signature # كاحتياط

    if notify_callback: notify_callback("⚠️ تم استنفاد محاولات التحسين. تم اعتماد أفضل نتيجة.")
    print("⚠️ Max retries reached. Returning last image.")
    return last_generated_image, last_signature

def generate_and_review_video(video_prompt, base_image_path=None, aspect_ratio="16:9", max_retries=2, notify_callback = None):
    current_prompt = video_prompt
    attempt = 1
    last_generated_video = None
    
    while attempt <= max_retries:
        if notify_callback:
            notify_callback(f"🎬 جاري التوليد (المحاولة {attempt}/{max_retries})...")
        print(f"\n🔄 [Video QA] Attempt {attempt}/{max_retries}...")
        video_path, _ = generate_veo_video(current_prompt, base_image_path, aspect_ratio)
        
        if not video_path: return last_generated_video
        last_generated_video = video_path

        if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع جودة الفيديو...")
        review_data = analyze_media(video_path, current_prompt, media_type="video", reference_image_path=base_image_path)
    
        if review_data["status"] == "APPROVED":
            print("✅ Art Director APPROVED the video!")
            if notify_callback: notify_callback("✅ الفيديو اجتاز التدقيق الفني بامتياز!")
            return video_path
        elif review_data["status"] == "REJECTED":
            reason = review_data["feedback"]
            print(f"❌ Art Director REJECTED the video: {reason}")
            if notify_callback: 
                notify_callback("⚠️ تم رصد خلل في جودة الفيديو. جاري التحسين وإعادة التوليد...")
            
            if attempt < max_retries: 
                try: os.remove(video_path)
                except: pass
            
            current_prompt = review_data.get("improved_prompt") or f"{video_prompt}. CRITICAL FIX: {reason}"
            attempt += 1
        else:
            if notify_callback: notify_callback("✅ تم اعتماد الفيديو (تجاوز الفحص).")
            return video_path 

    if notify_callback: notify_callback("⚠️ تم استنفاد محاولات التحسين. تم اعتماد أفضل نتيجة.")
    print("⚠️ Max retries reached. Returning last video.")
    return last_generated_video
    
# ==============================================================================
# المرحلة 1: الدردشة الاستراتيجية واعتمادها
# ==============================================================================
def chat_with_director(product_name, product_desc, product_analysis, user_message, chat_history=None):
    """
    تدير محادثة مفتوحة بين المستخدم والمدير الإبداعي.
    لا تولد JSON، بل ترجع رسالة نصية فقط.
    """
    strategist = get_marketing_strategist()
    model_name = strategist.llm_config['config_list'][0]['model']
    strategy_rag = create_rag_proxy("Strategy_Admin", "strategy", "strategy_db", model_name)

    current_date = datetime.now().strftime("%Y-%m-%d")

    country_code = extract_country_code(user_message)
    real_events_context = ""

    if country_code:
        print(f"🌍 User mentioned country: {country_code.upper()}. Fetching events...")
        # نجلب الأحداث وراء الكواليس
        real_events_context = get_upcoming_events_for_strategy(region=country_code, days_ahead=30)
    else:
        # إذا لم يذكر دولة، نعطيه تنبيهاً ليقوم بسؤال المستخدم (بدل الكراش)
        real_events_context = "⚠️ NOTE TO STRATEGIST: The user has not specified a country yet. If you need to suggest events, politely ask the user which country they are targeting first."

    history_text = ""
    if chat_history:
        history_text = "\n--- PREVIOUS CHAT HISTORY ---\n"
        history_text += "\n".join([f"{m['role'].capitalize()}: {m['content']}" for m in chat_history])
        history_text += "\n--- END OF HISTORY ---\n"

    full_prompt = prompt_templates.get_strategy_chat_context(
        product_name, 
        product_desc, 
        product_analysis, 
        current_date, 
        user_message, 
        history_text
    )

    print("🧠 Searching Knowledge Base and consulting Strategist...")
    
    chat_result = strategy_rag.initiate_chat(
        strategist, 
        message=strategy_rag.message_generator,
        problem = full_prompt, 
        n_results=2,
        max_turns=3,  
    )

    valid_replies = [msg['content'] for msg in chat_result.chat_history if msg.get('content') and msg.get('content').strip() != "" and msg.get('name') == 'Marketing_Strategist']
    
    replay = valid_replies[-1] if valid_replies else "عذراً، حدث خطأ في توليد الاستراتيجية."
    
    return replay.strip()

def finalize_strategy(product_name, chat_history):
    """
    تجبر المدير على تلخيص المحادثة السابقة وإخراجها كـ JSON صارم.
    """
    strategist = get_marketing_strategist()
    user_proxy = autogen.UserProxyAgent(name="User", human_input_mode="NEVER", code_execution_config=False)

    history_text = "\n".join([f"{m['role']}: {m['content']}" for m in chat_history])
    
    magic_prompt = prompt_templates.get_finalize_strategy_prompt(product_name, history_text)

    print("📄 Forcing Director to output JSON Strategy...")
    chat_result = user_proxy.initiate_chat(strategist, message=magic_prompt, max_turns=1)
    
    last_message = chat_result.chat_history[-1]['content']
    
    # استخراج الـ JSON
    data = json_match_extractor(last_message)
    if data and "suggested_audiences" in data: return data
        
    print("⚠️ Fallback strategy used due to JSON parsing error.")
    raise ValueError("Failed to extract JSON strategy from Director's response.")
# ==============================================================================
# المرحلة 2: توليد النصوص فقط (Generate Copy)
# ==============================================================================
def generate_copy_only(product_name, product_desc, audience, platforms):
    director = get_director()
    copywriter = get_copywriter()
    model_name = copywriter.llm_config['config_list'][0]['model']
    copy_rag = create_rag_proxy("Copy_Admin", "copywriting", "copy_db", model_name, overwrite=True)

    groupchat = autogen.GroupChat(agents=[copy_rag, director, copywriter], messages=[], max_round=4, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=director.llm_config)

    if platforms and len(platforms) > 0:
        platforms_str = ", ".join(platforms)
        platform_instruction = f"Target Platforms: {platforms_str}"
    else:
        platform_instruction = "Target Platforms: USER DID NOT SPECIFY. You MUST choose the 2 or 3 most suitable social media platforms for this specific product and audience."
    
    message = prompt_templates.get_copy_generation_prompt(product_name, product_desc, audience, platform_instruction)

    chat_result = copy_rag.initiate_chat(
        manager, 
        message=copy_rag.message_generator,
        problem = message,
        n_results=2
    )

    ad_copy = extract_agent_json(chat_result.chat_history, "Copywriter", "ad_copy")
    return {"ad_copy": ad_copy}
# ==============================================================================
# المرحلة 3A: توليد صورة حسب الطلب (Generate Image)
# ==============================================================================
def generate_image_on_demand(product_name, audience, ad_copy_json, aspect_ratio, original_image_path=None, notify_callback=None, event_name=None, event_angle=None, thought_signature = None):
    prompter = get_prompter()
    model_name = prompter.llm_config['config_list'][0]['model']
    prompts_rag = create_rag_proxy("Prompts_Admin", "prompts", "prompts_db", model_name)
    
    message = prompt_templates.get_image_generation_prompt(product_name, audience, ad_copy_json, aspect_ratio, event_name=event_name, event_angle=event_angle)

    chat_result = prompts_rag.initiate_chat(
        prompter, 
        message=prompts_rag.message_generator, 
        problem=message,
        n_results=2
    )
    img_prompt = extract_agent_json(chat_result.chat_history, "Prompt_Engineer", "main_image_prompt")

    print(f"🎨 Generating Image (AR: {aspect_ratio})...")
    
    local_ref_path = get_local_media_path(original_image_path)

    try:
        image_path, signature = generate_and_review_image(img_prompt, reference_image_path=local_ref_path, aspect_ratio=aspect_ratio, notify_callback=notify_callback, thought_signature=thought_signature)
    except Exception as e:
        print(f"❌ Image Gen Error: {e}")
        image_path = None
        signature = None

    return {"image_prompt": img_prompt, "image_url": image_path, "thought_signature": signature}
# ==============================================================================
# المرحلة 3B: توليد فيديو حسب الطلب (Generate Video)
# ==============================================================================
def generate_video_on_demand(product_name, audience, ad_copy_json, duration, aspect_ratio="16:9", base_image_path=None, notify_callback=None, event_name=None, event_angle=None, voice_preference="Auto"):
    video_director = get_video_director()
    prompter = get_prompter()

    prompter.update_system_message(get_prompter_updated_message(aspect_ratio))

    model_name = prompter.llm_config['config_list'][0]['model']
    prompts_rag = create_rag_proxy("Prompts_Admin", "prompts", "prompts_db", model_name)
    
    
    groupchat = autogen.GroupChat(agents=[prompts_rag, video_director, prompter], messages=[], max_round=4, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=video_director.llm_config)

    num_scenes = max(1, duration // 8)

    message = prompt_templates.get_video_generation_prompt(product_name, audience, ad_copy_json, duration, num_scenes, aspect_ratio, event_name=event_name, event_angle=event_angle, voice_preference=voice_preference)

    chat_result = prompts_rag.initiate_chat(
        manager, 
        message=prompts_rag.message_generator,
        problem=message,
        n_results=2
    )

    data = extract_agent_json(chat_result.chat_history, "Prompt_Engineer")
    _, vid_storyboard = normalize_prompts_data(data)
    selected_voice = data.get("selected_voice_profile", "Auto") if isinstance(data, dict) else "Auto"
    print(f"🎙️ AI selected voice profile: {selected_voice}")

    local_ref_path = get_local_media_path(base_image_path)    

    video_url = None
    if vid_storyboard:
        print(f"🎬 Sending Storyboard to Veo (Duration: {duration}s)...")
        if notify_callback:
            notify_callback(f"🎬 Sending Storyboard to Veo (Duration: {duration}s)...")
        # نستدعي الدالة الشاملة التي تدمج المشاهد (تأكد أنها موجودة في هذا الملف أو مستوردة)
        video_url = generate_final_video_asset(
            vid_storyboard, 
            base_image_path=local_ref_path,
            aspect_ratio=aspect_ratio, 
            notify_callback=notify_callback
        )
        
    return {"video_storyboard": vid_storyboard, "video_url": video_url}

def generate_extended_video(product_name, audience, ad_copy_json, duration, aspect_ratio="16:9", base_image_path=None, notify_callback=None, event_name=None, event_angle=None, voice_preference="Auto"):
    """
    توليد مشهد واحد ممتد (Extended One-Shot) بدلاً من مشاهد متعددة.
    """
    video_director = get_video_director()
    prompter = get_prompter()

    prompter.update_system_message(get_prompter_updated_message(aspect_ratio))

    model_name = prompter.llm_config['config_list'][0]['model']
    prompts_rag = create_rag_proxy("Prompts_Admin", "prompts", "prompts_db", model_name)

    # 1. إجبار المخرج على مشهد واحد فقط يحمل كل القصة
    message = prompt_templates.get_extend_video_generation_prompt(product_name, audience, ad_copy_json, duration, num_scenes=1, aspect_ratio=aspect_ratio, event_name=event_name, event_angle=event_angle, voice_preference=voice_preference)

    groupchat = autogen.GroupChat(agents=[prompts_rag, video_director, prompter], messages=[], max_round=4, speaker_selection_method="round_robin")
    
    manager = autogen.GroupChatManager(
        groupchat=groupchat, 
        llm_config=video_director.llm_config,
        is_termination_msg=lambda x: False
    )

    chat_result = prompts_rag.initiate_chat(
        manager, 
        message=prompts_rag.message_generator,
        problem=message,
        n_results=2
    )

    data = extract_agent_json(chat_result.chat_history, "Prompt_Engineer")
    _, vid_storyboard = normalize_prompts_data(data)
    selected_voice = data.get("selected_voice_profile", "Auto") if isinstance(data, dict) else "Farah"
    print(f"🎙️ AI selected voice profile: {selected_voice}")

    if not vid_storyboard or len(vid_storyboard) == 0:
        print("❌ AI failed to generate storyboard.")
        return {"video_storyboard": [], "video_url": None}

    scene = vid_storyboard[0]
    motion_p = scene.get("motion_prompt", "")
    voice_p = scene.get("voiceover_text", "")
    audio_p = scene.get("audio_prompt", "")
    scene_img_prompt = scene.get("image_prompt", "")

    local_ref_path = get_local_media_path(base_image_path)
    scene_image_path = local_ref_path 
    
    if scene_img_prompt:
        if notify_callback: notify_callback(f"🎨 جاري توليد وتصميم الصورة الافتتاحية للمشهد...")
        try:
            generated_img, _ = generate_image(
                scene_img_prompt, 
                reference_image_path=scene_image_path,
                aspect_ratio=aspect_ratio
            )
            if generated_img and os.path.exists(generated_img):
                scene_image_path = generated_img 
                if notify_callback: notify_callback(f"✅ تم تصميم الصورة الافتتاحية بنجاح!")
        except Exception as e:
            print(f"⚠️ Image Gen failed, using base image. Error: {e}")

    
    scene_prompt = f"{motion_p}"
    if audio_p and audio_p.lower() != "none" and audio_p.strip() != "":
        scene_prompt += f". Audio context: {audio_p}"
    scene_prompt += " CRITICAL: Characters must NOT speak. NO lip-syncing. Closed mouths only. Cinematic silent acting. No voiceover. "


    if notify_callback: notify_callback(f"🎬 جاري توليد المشهد الافتتاحي (8 ثوانٍ)...")
    
    # 2. توليد أول 8 ثواني (ملاحظة: يجب أن تتأكد أن generate_veo_video ترجع مسار الفيديو + اسم الملف على جوجل)
    # سنستخدم الدالة المعدلة التي ترجع القيمتين
    first_video_path, google_video_name = generate_veo_video(scene_prompt, scene_image_path, aspect_ratio)

    if not first_video_path or not google_video_name:
        return {"video_storyboard": vid_storyboard, "video_url": None}

    # 3. حساب عدد التمديدات المطلوبة (كل تمديد يضيف حوالي 7 ثواني)
    extensions_needed = max(0, (duration - 8) // 7)
    
    current_google_name = google_video_name
    final_video_path = first_video_path

    # 4. حلقة التمديد المتتالية
    for i in range(extensions_needed):
        if notify_callback: notify_callback(f"🔄 جاري تمديد الفيديو (الجزء {i+2})...")
        
        # نرسل نفس البرومبت، مع مرجع الفيديو السابق
        ext_path, new_google_name = extend_veo_video(scene_prompt, current_google_name, aspect_ratio)
        
        if ext_path:
            final_video_path = ext_path # الفيديو الجديد يحتوي المقطع الأول مدمجاً مع الثاني
            current_google_name = new_google_name
        else:
            print("⚠️ Extension failed, stopping early.")
            break 

    # 5. توليد الصوت ودمجه
    if voice_p and voice_p.lower() != "none" and voice_p.strip() != "":
        if notify_callback: notify_callback(f"🎙️ جاري تسجيل التعليق الصوتي...")
        voice_path = generate_voiceover(voice_p, voice_profile_name=selected_voice)
        final_video_with_audio = merge_video_audio(final_video_path, voice_path)
    else:
        final_video_with_audio = final_video_path # إذا لم يكن هناك تعليق صوتي

    if notify_callback: notify_callback(f"✅ تم الانتهاء من الفيديو الممتد!")
    return {"video_storyboard": vid_storyboard, "video_url": final_video_with_audio}

# ==============================================================================
# المرحلة 4: التعديلات (Refining)
# ==============================================================================
def refine_text(current_copy, feedback):
    copywriter = get_copywriter()
    model_name = copywriter.llm_config['config_list'][0]['model']
    copy_rag = create_rag_proxy("Copy_Admin", "copywriting", "copy_db", model_name)
    
    msg = prompt_templates.get_refine_text_prompt(feedback, current_copy)
    chat_result = copy_rag.initiate_chat(
        copywriter,
        message=copy_rag.message_generator,
        problem=msg, 
        n_results=2
    )

    
    return extract_agent_json(chat_result.chat_history, "Copywriter", "ad_copy")


def refine_image(current_prompt, feedback, aspect_ratio, original_image_path=None, current_image_path=None, notify_callback=None, event_name=None, event_angle=None, thought_signature=None):
    prompter = get_prompter()
    model_name = prompter.llm_config['config_list'][0]['model']
    prompt_rag = create_rag_proxy("Prompts_Admin", "prompts", "prompts_db", model_name) 
    
    local_current_image_path = get_local_media_path(current_image_path)
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع الصورة و طلب التعديل...")
    review_data = analyze_media(
        file_path=local_current_image_path,
        prompt=current_prompt,
        user_feedback=feedback,
        media_type="image"
    )
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني انتهى من المراجعة .")    
    msg = prompt_templates.get_refine_image_prompt(feedback, current_prompt, aspect_ratio, review_data.get("feedback", ""), event_name=event_name, event_angle=event_angle)
    chat_result = prompt_rag.initiate_chat(
        prompter, 
        message=prompt_rag.message_generator, 
        problem=msg, 
        n_results=2
    )
    
    new_prompt = extract_agent_json(chat_result.chat_history, "Prompt_Engineer", "main_image_prompt") 
     
    local_ref_path = get_local_media_path(original_image_path)
    
    image_url = None
    if new_prompt:
        try:
            image_url, signature = generate_and_review_image(
                new_prompt, 
                reference_image_path=local_ref_path, 
                aspect_ratio=aspect_ratio,
                notify_callback=notify_callback,
                thought_signature=thought_signature
            )
        except: pass
        
    return {"image_prompt": new_prompt, "image_url": image_url, "thought_signature": signature}

def refine_video(current_storyboard, feedback, base_image_path=None, aspect_ratio="16:9", current_video_path=None,  notify_callback=None, event_name=None, event_angle=None):
    video_director = get_video_director()
    prompter = get_prompter()
    
    model_name = prompter.llm_config['config_list'][0]['model']
    prompts_rag = create_rag_proxy("Prompts_Admin", "prompts", "prompts_db", model_name)
    

    groupchat = autogen.GroupChat(agents=[prompts_rag, video_director, prompter], messages=[], max_round=3, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=video_director.llm_config)

    local_video_path = get_local_media_path(current_video_path)
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع الصورة و طلب التعديل...")
    review_data = analyze_media(
        file_path=local_video_path,
        prompt=current_storyboard,
        user_feedback=feedback,
        media_type="video",
    )
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني انتهى من المراجعة .") 

    msg = prompt_templates.get_refine_video_prompt(feedback, current_storyboard, review_data.get("feedback", ""), event_name=event_name, event_angle=event_angle)
    chat_result = prompts_rag.initiate_chat(
        manager, 
        message=prompts_rag.message_generator,
        problem=msg,
        n_results=2
    )
    
    data = extract_agent_json(chat_result.chat_history, "Prompt_Engineer")
    _, vid_storyboard = normalize_prompts_data(data)
            
    # توليد الفيديو الجديد 
    local_ref_path = get_local_media_path(base_image_path)

    video_url = None
    if vid_storyboard:
         video_url = generate_final_video_asset(
            vid_storyboard, 
            base_image_path=local_ref_path, 
            aspect_ratio=aspect_ratio, 
            notify_callback=notify_callback
        )
    return {"video_storyboard": vid_storyboard, "video_url": video_url}


# ==============================================================================
# التنفيذ المتوازي لتوليد الفيديوهات من الستوري بورد (Parallel Video Generation)
# ==============================================================================
def process_single_scene(scene, valid_image_path, aspect_ratio="16:9", notify_callback=None):
    """
    دالة مساعدة لمعالجة مشهد واحد (توليد صورة ثم توليد فيديو).
    صُممت لتعمل داخل Thread.
    """
    scene_num = scene.get("scene_number", 1)
    print(f"⏳ [Thread] Started Processing Scene {scene_num}...")

    if notify_callback: notify_callback(f"⏳ جاري معالجة المشهد رقم {scene_num}...")
    motion_p = scene.get("motion_prompt", "")
    voice_p = scene.get("voiceover_text", "")
    audio_p = scene.get("audio_prompt", "")
    scene_img_prompt = scene.get("image_prompt", "")
    
    # 1. توليد الصورة الخاصة بالمشهد
    scene_image_path = valid_image_path 
    
    if scene_img_prompt:
        try:
            generated_img, _ = generate_image(
                scene_img_prompt, 
                reference_image_path=valid_image_path, 
                aspect_ratio=aspect_ratio
            )
            if generated_img and os.path.exists(generated_img):
                scene_image_path = generated_img
                if notify_callback: notify_callback(f"✅ تم تصميم إطار المشهد {scene_num} بنجاح!")
        except Exception as e:
            if notify_callback: notify_callback(f"⚠️ فشل تصميم إطار المشهد {scene_num}، سيتم استخدام الصورة الأساسية.")
            print(f"⚠️ [Scene {scene_num}] Image Gen failed, using base image. Error: {e}")

    # 2. تجهيز برومبت الفيديو (الصوت اختياري)
    veo_prompt = f"{motion_p}."
    veo_prompt = f"{motion_p}"
    if audio_p and audio_p.lower() != "none" and audio_p.strip() != "":
        veo_prompt += f". Audio context: {audio_p}"
    veo_prompt += " CRITICAL: Characters must NOT speak. NO lip-syncing. Closed mouths only. Cinematic silent acting. No voiceover."
        
    # 3. توليد الفيديو
    if notify_callback: notify_callback(f"🎬 جاري تحريك المشهد رقم {scene_num}...")
    try:
        scene_video_path = generate_and_review_video(veo_prompt, scene_image_path, aspect_ratio)
        if not scene_video_path or not os.path.exists(scene_video_path):
            print(f"❌ [Scene {scene_num}] Video Gen failed (API returned None or File missing).")
            if notify_callback: notify_callback(f"❌ فشل تحريك المشهد {scene_num} (مرفوض من جوجل).")
            return {"scene_number": scene_num, "path": None}
        print(f"✅ [Thread] Scene {scene_num} completed.")
        if notify_callback: notify_callback(f"✅ تم الانتهاء من تحريك المشهد {scene_num} بنجاح!")
    except Exception as e:
        print(f"❌ [Scene {scene_num}] Video Gen failed: {e}")
        if notify_callback: notify_callback(f"❌ فشل تحريك المشهد {scene_num}.")
        return {"scene_number": scene_num, "path": None}
    
     # 5. 🎙️ السحر الجديد: توليد ودمج الصوت (ElevenLabs + MoviePy)
    if scene_video_path and os.path.exists(scene_video_path):
        if notify_callback: notify_callback(f"🎙️ جاري تسجيل التعليق الصوتي والمؤثرات للمشهد {scene_num}...")
        
        # توليد صوت المعلق
        voice_path = generate_voiceover(voice_p)
        
        # دمج الفيديو الصامت مع الأصوات
        final_scene_path = merge_video_audio(scene_video_path, voice_path)
        
        # تحديث مسار الفيديو ليكون الفيديو الناطق الجديد
        scene_video_path = final_scene_path
        
        if notify_callback: notify_callback(f"✅ اكتمل الإخراج الصوتي للمشهد {scene_num}!")

    return {"scene_number": scene_num, "path": scene_video_path}

def generate_final_video_asset(storyboard_json, base_image_path=None, aspect_ratio="16:9", notify_callback=None):
    """
    تقرأ الستوري بورد، تولد كل مشهد بالتوازي (Parallel)، ثم تدمجها بالترتيب.
    """
    if not storyboard_json or not isinstance(storyboard_json, list):
        print("❌ Invalid storyboard format")
        return None

    if notify_callback:
        notify_callback(f"🚀 بدء عملية الإنتاج السينمائي ({len(storyboard_json)} مشاهد)...")

    print(f"🚀 Starting PARALLEL Multi-Scene Video Generation ({len(storyboard_json)} scenes)...")

    # معالجة مسار الصورة الأساسية
    valid_image_path = get_local_media_path(base_image_path)

    # --- التنفيذ المتوازي (Parallel Execution) ---
    results = []
    # نستخدم ThreadPoolExecutor لتشغيل المشاهد معاً
    # max_workers يحدد كم فيديو يولد في نفس اللحظة (حسب قوة حسابك في API)
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(storyboard_json)) as executor:
        # إرسال المهام
        future_to_scene = {
            executor.submit(process_single_scene, scene, valid_image_path, aspect_ratio, notify_callback): scene 
            for scene in storyboard_json
        }
        
        # استلام النتائج فور انتهائها
        for future in concurrent.futures.as_completed(future_to_scene):
            try:
                res = future.result()
                if res["path"]:
                    results.append(res)
            except Exception as exc:
                print(f"⚠️ A scene generated an exception: {exc}")

    # --- ترتيب المشاهد ودمجها ---
    if not results:
        print("⚠️ All Veo generations failed.")
        if notify_callback:
            notify_callback("⚠️ فشلت عملية توليد جميع المشاهد.")
        return None

    # ترتيب النتائج تصاعدياً حسب scene_number لضمان تسلسل الفيديو
    results.sort(key=lambda x: x["scene_number"])
    
    # استخراج المسارات المرتبة فقط
    ordered_video_paths = [res["path"] for res in results]

    # الدمج
    if len(ordered_video_paths) == 1:
        if notify_callback:
             notify_callback("🎉 اكتمل إنتاج الفيديو بنجاح!")
        return ordered_video_paths[0]
    else:
        if notify_callback:
            notify_callback("🎞️ جاري دمج المشاهد وإخراج الفيديو النهائي...")
        final_video = concatenate_veo_videos(ordered_video_paths)
        if notify_callback:
            notify_callback("🎉 اكتمل إنتاج الفيديو المدمج بنجاح!")
        return final_video     
