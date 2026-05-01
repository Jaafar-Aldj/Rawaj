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
from app.config import settings

from app.logger import get_logger
logger = get_logger(__name__)

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
    if "http" in file_path:
         if "assets/" in file_path:
            relative_path = file_path.split("assets/")[-1]
            local_path = os.path.join("rawaj-frontend", "assets", relative_path)
            local_path = os.path.normpath(local_path)
            if os.path.exists(local_path):
                return local_path
            else:
                logger.warning(f"⚠️ Warning: File not found locally at {local_path}")
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
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode failed. Error: {e}. Content snippet: {content[:200]!r}")
    except Exception as e:
        logger.exception(f"Unexpected error in json_match_extractor: {e}")
    return None

def normalize_prompts_data(data):
    image_prompt = None
    video_storyboard = []
    voiceover_text = None
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
                video_storyboard = [{"scene_number": 1, "image_prompt": image_prompt, "motion_prompt": fallback}]
        voiceover_text = data.get("voiceover_text") or data.get("voiceover") or ""

    if isinstance(image_prompt, list) and len(image_prompt) > 0: image_prompt = str(image_prompt[0])
    if isinstance(image_prompt, dict): image_prompt = str(image_prompt)

    return image_prompt, video_storyboard, voiceover_text

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
    if getattr(settings, "use_mock_api", False):
        logger.debug("MOCK MODE: Skipping real image analysis.")
        return "\n[AI Visual Analysis]: This is a mock analysis of the image content. The image features a modern product with sleek design, vibrant colors, and appears to be made of high-quality materials. Key features include a minimalist style, user-friendly interface, and innovative functionality that stands out in the market."
    local_path = get_local_media_path(image_path)
    if not local_path: 
        logger.warning(f"analyze_image_content: Could not resolve local path for '{image_path}'")
        return ""
    try:
        logger.info(f"👁️ Analyzing image: {local_path}...")
        model = genai.GenerativeModel('gemini-2.5-flash')
        img = PIL.Image.open(local_path)
        prompt = "Describe this product image in high detail for a marketing team. Focus on colors, materials, style, and key features. Be objective."
        response = model.generate_content([prompt, img])
        return f"\n[AI Visual Analysis]: {response.text}"
    except FileNotFoundError:
        logger.error(f"Image file not found: {local_path}")
        return ""
    except Exception as e:
        logger.exception(f"Unexpected error during image analysis for '{local_path}': {e}")
        return ""

def generate_and_review_image(image_prompt, reference_image_path=None, aspect_ratio="16:9", max_retries=2, notify_callback=None, thought_signature=None):
    current_prompt = image_prompt
    attempt = 1
    last_generated_image = None
    last_signature = None

    while attempt <= max_retries:
        if notify_callback: notify_callback(f"🕵️‍♂️ جاري تدقيق الصورة آلياً (المحاولة {attempt}/{max_retries})...")
        logger.info(f"[Image QA] Attempt {attempt}/{max_retries} | AR: {aspect_ratio}")
        image_path, signature = generate_image(current_prompt, reference_image_path, aspect_ratio, thought_signature)
        
        if not image_path or not os.path.exists(image_path):
            logger.warning(f"❌ Image generation failed at attempt {attempt}.")
            if notify_callback:
                notify_callback("⚠️ فشل توليد الصورة. محاولة جديدة...")
            return last_generated_image, last_signature
        last_generated_image = image_path
        last_signature = signature
        # استدعاء المخرج الفني لتقييم الصورة
        if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع جودة الصورة...")
        review_data = analyze_media(image_path, current_prompt, media_type="image", reference_image_path=reference_image_path)

        if review_data["status"] == "APPROVED":
            logger.info(f"[Image QA] APPROVED at attempt {attempt}: {image_path}")
            if notify_callback:
                notify_callback("✅ الصورة اجتازت التدقيق الفني.")
            return image_path, signature
        elif review_data["status"] == "REJECTED":
            logger.warning(f"[Image QA] REJECTED at attempt {attempt}. Reason: {reason}")
            reason = review_data["feedback"]
            
            if notify_callback: 
                notify_callback(f"⚠️ تم رفض الصورة، جاري تحسين الجودة (السبب: خطأ في التوليد). محاولة جديدة...")
            
            # حذف الصورة المعيبة
            if attempt < max_retries: # فقط نحذف إذا كنا سنحاول مرة أخرى
                try: 
                    os.remove(image_path)
                    logger.debug(f"Deleted rejected image: {image_path}")
                except OSError as e:
                    logger.warning(f"Could not delete rejected image '{image_path}': {e}")
            
            # تحديث البرومبت بتعليمات المخرج
            current_prompt = review_data.get("improved_prompt") or f"{image_prompt}. CRITICAL FIX: {reason}"
            attempt += 1
        else:
            logger.info(f"[Image QA] Unknown status '{review_data['status']}', auto-approving.")
            if notify_callback: notify_callback("✅ تم اعتماد الصورة (تجاوز الفحص).")
            return image_path, signature # كاحتياط

    if notify_callback: notify_callback("⚠️ تم استنفاد محاولات التحسين. تم اعتماد أفضل نتيجة.")
    logger.warning(f"[Image QA] Max retries ({max_retries}) reached. Returning best available image.")
    return last_generated_image, last_signature

def generate_and_review_video(video_prompt, base_image_path=None, aspect_ratio="16:9", max_retries=1, notify_callback = None):
    current_prompt = video_prompt
    attempt = 1
    last_generated_video = None
    
    while attempt <= max_retries:
        if notify_callback:
            notify_callback(f"🎬 جاري التوليد (المحاولة {attempt}/{max_retries})...")
        logger.info(f"[Video QA] Attempt {attempt}/{max_retries} | AR: {aspect_ratio}")
        video_path, _ = generate_veo_video(current_prompt, base_image_path, aspect_ratio)
        
        if not video_path: 
            logger.warning(f"[Video QA] Generation returned None at attempt {attempt}.")
            return last_generated_video
        last_generated_video = video_path

        if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع جودة الفيديو...")
        review_data = analyze_media(video_path, current_prompt, media_type="video", reference_image_path=base_image_path)
    
        if review_data["status"] == "APPROVED":
            logger.info(f"[Video QA] APPROVED at attempt {attempt}: {video_path}")
            if notify_callback: notify_callback("✅ الفيديو اجتاز التدقيق الفني بامتياز!")
            return video_path
        elif review_data["status"] == "REJECTED":
            reason = review_data["feedback"]
            logger.warning(f"[Video QA] REJECTED at attempt {attempt}. Reason: {reason}")
            if notify_callback: 
                notify_callback("⚠️ تم رصد خلل في جودة الفيديو. جاري التحسين وإعادة التوليد...")
            
            if attempt < max_retries: 
                try: 
                    os.remove(video_path)
                    logger.debug(f"Deleted rejected video: {video_path}")
                except OSError as e:
                    logger.warning(f"Could not delete rejected video '{video_path}': {e}")
            
            current_prompt = review_data.get("improved_prompt") or f"{video_prompt}. CRITICAL FIX: {reason}"
            attempt += 1
        else:
            logger.info(f"[Video QA] Unknown status, auto-approving.")
            if notify_callback: notify_callback("✅ تم اعتماد الفيديو (تجاوز الفحص).")
            return video_path 

    if notify_callback: notify_callback("⚠️ تم استنفاد محاولات التحسين. تم اعتماد أفضل نتيجة.")
    logger.warning(f"[Video QA] Max retries ({max_retries}) reached. Returning best available video.")
    return last_generated_video
    
# ==============================================================================
# المرحلة 1: الدردشة الاستراتيجية واعتمادها
# ==============================================================================
def chat_with_director(product_name, product_desc, product_analysis, user_message, chat_history=None):
    """
    تدير محادثة مفتوحة بين المستخدم والمدير الإبداعي.
    لا تولد JSON، بل ترجع رسالة نصية فقط.
    """
    if getattr(settings, "use_mock_api", False):
        logger.debug("MOCK MODE: Returning mock strategist response.")  
        
        if "اعتماد" in user_message or "موافق" in user_message:
            return "تم اعتماد الخطة النهائية بنجاح! الاستراتيجية جاهزة للانطلاق إلى فريق العمل."
        return f"هذه استراتيجية تسويقية تجريبية لمنتج ({product_name}) تم توليدها بواسطة وضع المحاكاة. اقترح استهداف فئة الشباب. هل توافق على اعتماد الخطة؟"

    strategist = get_marketing_strategist()
    model_name = strategist.llm_config['config_list'][0]['model']
    strategy_rag = create_rag_proxy("Strategy_Admin", "strategy", "strategy_db", model_name, overwrite=True)

    current_date = datetime.now().strftime("%Y-%m-%d")

    country_code = extract_country_code(user_message)
    real_events_context = ""

    if country_code:
        try:
            logger.info(f"Country detected in message: {country_code.upper()}. Fetching events...")
            real_events_context = get_upcoming_events_for_strategy(region=country_code, days_ahead=30)
        except Exception as e:
            real_events_context = f"⚠️ NOTE: Could not fetch real events for {country_code.upper()}. Please rely on general seasonal themes."
            logger.warning(f"⚠️ Error fetching events: {e}")
    else:
        logger.debug("No country detected in user message. Prompting strategist to ask.")
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
        real_events_context,
        history_text
    )

    logger.info("Consulting Marketing Strategist via RAG...")
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # 👈 السحر هنا: نُعرّف الـ RAG Proxy داخل الـ Loop بأسماء مختلفة لتجنب تعليق الداتا بيز
            strategy_rag = create_rag_proxy(f"Strategy_Admin_T{int(time.time())}", "strategy", "strategy_db", model_name)
            
            chat_result = strategy_rag.initiate_chat(
                strategist, 
                message=strategy_rag.message_generator,
                problem=full_prompt, 
                n_results=2,
                max_turns=1
            )

            valid_replies = [msg['content'] for msg in chat_result.chat_history if msg.get('content') and msg.get('content').strip() != "" and msg.get('name') == 'Marketing_Strategist']
            
            if valid_replies:
                return valid_replies[-1].strip()
                
        except Exception as e:
            error_msg = str(e)
            print(f"⚠️ AI Chat Error (Attempt {attempt + 1}/{max_retries}): {error_msg}")
            
            # إذا فشل RAG أو كان هناك ضغط، ننتظر ونحاول مجدداً
            if attempt < max_retries - 1:
                print("🔄 Waiting 3 seconds before retrying...")
                import time
                time.sleep(3)
                continue
            else:
                return "عذراً، خوادم الذكاء الاصطناعي تواجه ضغطاً هائلاً حالياً. يرجى المحاولة بعد قليل."

    return "عذراً، حدث خطأ في توليد الاستراتيجية."

def finalize_strategy(product_name, chat_history):
    """
    تجبر المدير على تلخيص المحادثة السابقة وإخراجها كـ JSON صارم.
    """
    if getattr(settings, "use_mock_api", False):
        logger.debug("MOCK MODE: Returning mock finalized strategy.")
        return {
            "suggested_audiences": {
                "suggestions": [
                    {
                    "reason": "يبحثون عن معدات موثوقة بتكلفة معقولة لتوسيع قدراتهم الإنتاجية.",
                    "audience": "أصحاب الورش الصغيرة والمتوسطة"
                    },
                    {
                    "reason": "يحتاجون إلى آلات متخصصة أو احتياطية للمهام الدقيقة أو الإصلاحات العاجلة.",
                    "audience": "مديرو الإنتاج والصيانة في المصانع"
                    },
                    {
                    "reason": "ينفذون مشاريع خاصة ويحتاجون إلى دقة عالية لا تتوفر في الآلات التجارية العادية.",
                    "audience": "المقاولون والمحترفون المستقلون"
                    }
                ]
            },
            "trending_events": [
                {
                    "angle": "تسويق البيتزا كـ 'وجبة المباراة الرسمية' التي تجمع الأصدقاء وتُرضي كل مشجع.",
                    "event": "المباريات الرياضية الكبرى"
                },
                {
                    "angle": "تقديمها كحل سريع للأمهات خلال الإجازات لتجنب عناء الطبخ وإرضاء جميع أفراد الأسرة.",
                    "event": "الإجازات المدرسية والأعياد"
                }
            ]
        }
            
    strategist = get_marketing_strategist()
    user_proxy = autogen.UserProxyAgent(name="User", human_input_mode="NEVER", code_execution_config=False)

    history_text = "\n".join([f"{m['role']}: {m['content']}" for m in chat_history])
    
    magic_prompt = prompt_templates.get_finalize_strategy_prompt(product_name, history_text)

    logger.info("Forcing strategist to output JSON strategy...")
    chat_result = user_proxy.initiate_chat(strategist, message=magic_prompt, max_turns=1)
    
    last_message = chat_result.chat_history[-1]['content']
    
    # استخراج الـ JSON
    data = json_match_extractor(last_message)
    if data and "suggested_audiences" in data: return data
        
    logger.error("Failed to extract JSON strategy from strategist response.")
    raise ValueError("Failed to extract JSON strategy from Director's response.")
# ==============================================================================
# المرحلة 2: توليد النصوص فقط (Generate Copy)
# ==============================================================================
def generate_copy_only(product_name, product_desc, audience, platforms):
    if getattr(settings, "use_mock_api", False):
        import time
        logger.debug("MOCK MODE: Returning mock ad copy.")
        time.sleep(2) # محاكاة وقت الكتابة
        platforms_list = platforms if platforms and len(platforms) > 0 else["Instagram", "TikTok"]
        # توليد نصوص وهمية تتوافق مع الـ JSON المطلوب
        ad_copy =[
            {"platform": p, "ad_copy": f"إعلان تجريبي لمنصة {p}: اكتشف روعة {product_name} الآن! #تسويق #محاكاة"} 
            for p in platforms_list
        ]
        return {"ad_copy": ad_copy}
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
    logger.info(f"Generating ad copy for: '{product_name}' | Audience: '{audience}'")

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
    if getattr(settings, "use_mock_api", False):
        import time, glob
        logger.debug("MOCK MODE: Returning mock image.")
        time.sleep(2) # محاكاة وقت التحميل
        existing_images = glob.glob(os.path.join(os.getcwd(), "rawaj-frontend", "assets", "image", "gen_*.png"))
        mock_path = existing_images[0] if existing_images else None
        if mock_path:
            return {"image_prompt": "Mocked image prompt for UI testing.", "image_url": mock_path, "thought_signature": "mock_sig_123"}
        return {"image_prompt": "Mocked prompt", "image_url": "rawaj-frontend/assets/image/gen_de864cf5.png"}

    
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

    logger.info(f"Generating image | AR: {aspect_ratio} | Event: {event_name}")
    
    local_ref_path = get_local_media_path(original_image_path)

    try:
        image_path, signature = generate_and_review_image(img_prompt, reference_image_path=local_ref_path, aspect_ratio=aspect_ratio, notify_callback=notify_callback, thought_signature=thought_signature)
    except Exception as e:
        logger.exception(f"Image generation pipeline failed for product '{product_name}': {e}")
        image_path = None
        signature = None

    return {"image_prompt": img_prompt, "image_url": image_path, "thought_signature": signature}
# ==============================================================================
# المرحلة 3B: توليد فيديو حسب الطلب (Generate Video)
# ==============================================================================
def generate_video_on_demand(product_name, audience, ad_copy_json, duration, aspect_ratio="16:9", base_image_path=None, notify_callback=None, event_name=None, event_angle=None, voice_preference="Auto"):
    if getattr(settings, "use_mock_api", False):
        import time, glob
        logger.debug("MOCK MODE: Returning mock video.")
        time.sleep(3) # محاكاة وقت التحميل والتوليد
        existing_videos = glob.glob(os.path.join(os.getcwd(), "rawaj-frontend", "assets", "video", "gen_*.mp4"))
        mock_video_path = existing_videos[0] if existing_videos else None
        if mock_video_path:
            return {"video_storyboard": [{"scene_number": 1, "image_prompt": "Mocked image prompt for video storyboard.", "motion_prompt": "Mocked motion prompt for video storyboard.", "voiceover_text": "Mocked voiceover text for video storyboard."}], "video_url": mock_video_path}
        return {"video_storyboard": [{"scene_number": 1, "image_prompt": "Mocked image prompt for video storyboard.", "motion_prompt": "Mocked motion prompt for video storyboard.", "voiceover_text": "Mocked voiceover text for video storyboard."}], "video_url": "rawaj-frontend/assets/video/veo_41fc31aa_audio_7530.mp4"}
    video_director = get_video_director()
    prompter = get_prompter()

    prompter.update_system_message(get_prompter_updated_message(aspect_ratio))

    model_name = prompter.llm_config['config_list'][0]['model']
    prompts_rag = create_rag_proxy("Prompts_Admin", "prompts", "prompts_db", model_name)
    
    
    groupchat = autogen.GroupChat(agents=[prompts_rag, video_director, prompter], messages=[], max_round=4, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=video_director.llm_config)

    num_scenes = max(1, duration // 8)

    message = prompt_templates.get_video_generation_prompt(product_name, audience, ad_copy_json, duration, num_scenes, aspect_ratio, event_name=event_name, event_angle=event_angle, voice_preference=voice_preference)

    logger.info(f"Generating video | Duration: {duration}s | Scenes: {num_scenes} | AR: {aspect_ratio}")
    chat_result = prompts_rag.initiate_chat(
        manager, 
        message=prompts_rag.message_generator,
        problem=message,
        n_results=2
    )

    data = extract_agent_json(chat_result.chat_history, "Prompt_Engineer")
    _, vid_storyboard, voiceover_text = normalize_prompts_data(data)
    selected_voice = data.get("selected_voice_profile", "Farah") if isinstance(data, dict) else "Farah"
    logger.info(f"AI selected voice: {selected_voice}")

    local_ref_path = get_local_media_path(base_image_path)    

    video_url = None
    if vid_storyboard:
        logger.info(f"Sending storyboard ({len(vid_storyboard)} scenes) to Veo...")
        if notify_callback:
            notify_callback(f"🎬 Sending Storyboard to Veo (Duration: {duration}s)...")

        video_url = generate_final_video_asset(
            vid_storyboard, 
            base_image_path=local_ref_path,
            aspect_ratio=aspect_ratio, 
            voice_profile_name=selected_voice,
            voiceover_text=voiceover_text,
            notify_callback=notify_callback
        )
        
    return {"video_storyboard": vid_storyboard, "video_url": video_url}

def generate_extended_video(product_name, audience, ad_copy_json, duration, aspect_ratio="16:9", base_image_path=None, notify_callback=None, event_name=None, event_angle=None, voice_preference="Auto"):
    """
    توليد مشهد واحد ممتد (Extended One-Shot) بدلاً من مشاهد متعددة.
    """
    if getattr(settings, "use_mock_api", False):
        import time, glob
        logger.debug("MOCK MODE: Returning mock extended video.")
        time.sleep(3) # محاكاة وقت التحميل والتوليد
        existing_videos = glob.glob(os.path.join(os.getcwd(), "rawaj-frontend", "assets", "video", "gen_*.mp4"))
        mock_video_path = existing_videos[0] if existing_videos else None
        if mock_video_path:
            return {"video_storyboard": [{"scene_number": 1, "image_prompt": "Mocked image prompt for video storyboard.", "motion_prompt": "Mocked motion prompt for video storyboard.", "voiceover_text": "Mocked voiceover text for video storyboard."}], "video_url": mock_video_path}
        return {"video_storyboard": [{"scene_number": 1, "image_prompt": "Mocked image prompt for video storyboard.", "motion_prompt": "Mocked motion prompt for video storyboard.", "voiceover_text": "Mocked voiceover text for video storyboard."}], "video_url": "rawaj-frontend/assets/video/veo_41fc31aa_audio_7530.mp4"}
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

    logger.info(f"Generating extended video | Duration: {duration}s | Scenes: 1 | AR: {aspect_ratio}")
    chat_result = prompts_rag.initiate_chat(
        manager, 
        message=prompts_rag.message_generator,
        problem=message,
        n_results=2
    )

    data = extract_agent_json(chat_result.chat_history, "Prompt_Engineer")
    _, vid_storyboard, voiceover_text = normalize_prompts_data(data)
    selected_voice = data.get("selected_voice_profile", "Auto") if isinstance(data, dict) else "Farah"
    logger.info(f"AI selected voice: {selected_voice}")

    if not vid_storyboard or len(vid_storyboard) == 0:
        logger.error("AI failed to generate storyboard.")
        return {"video_storyboard": [], "video_url": None}

    scene = vid_storyboard[0]
    raw_sequence = scene.get("motion_sequence") or scene.get("motion_prompt") or []
    audio_p = scene.get("audio_prompt", "")
    scene_img_prompt = scene.get("image_prompt", "")

    local_ref_path = get_local_media_path(base_image_path)
    scene_image_path = local_ref_path 
    
    if scene_img_prompt:
        logger.info(f"Generating image for scene | Prompt: {scene_img_prompt} | AR: {aspect_ratio}")
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
            logger.exception(f"Image generation failed for scene: {scene_img_prompt}. Error: {e}")


    def flatten(items):
        flat_list = []
        if isinstance(items, list):
            for item in items:
                flat_list.extend(flatten(item))
        else:
            flat_list.append(str(items))
        return [i for i in flat_list if i.strip()]

    motion_sequence = flatten(raw_sequence)


    extensions_needed = max(0, (duration - 8) // 7)
    total_segments = 1 + extensions_needed
    
    if not motion_sequence:
        logger.info(f"Using fallback prompt for video | Duration: {duration}s | AR: {aspect_ratio}")
        fallback_p = scene.get("motion_prompt") or scene.get("action_description") or ""
        if isinstance(fallback_p, list): fallback_p = flatten(fallback_p)[0]
        motion_sequence = [str(fallback_p)] * total_segments
    while len(motion_sequence) < total_segments:
        motion_sequence.append(motion_sequence[-1])
    logger.info(f"🧩 Motion sequence for video: {motion_sequence} (Total segments: {total_segments})")

    first_prompt = str(motion_sequence[0])
    if audio_p and audio_p.lower() != "none" and audio_p.strip() != "":
        first_prompt = f"{first_prompt}. Audio context: {audio_p}"
    first_prompt = f"{first_prompt}. CRITICAL: Characters must NOT speak. NO lip-syncing. Closed mouths only. Cinematic silent acting. No voiceover. "

    logger.info(f"Generating first 8 seconds of video | Prompt: {first_prompt} | AR: {aspect_ratio}")
    if notify_callback: notify_callback(f"🎬 جاري توليد المشهد الافتتاحي (8 ثوانٍ)...")
    logger.info(f"Sending first prompt to Veo | Prompt: {first_prompt} | AR: {aspect_ratio}")
    first_video_path, google_video_name = generate_veo_video(first_prompt, scene_image_path, aspect_ratio)

    if not first_video_path or not google_video_name:
        return {"video_storyboard": vid_storyboard, "video_url": None}

    # 3. حساب عدد التمديدات المطلوبة (كل تمديد يضيف حوالي 7 ثواني)
    
    
    current_google_name = google_video_name
    final_video_path = first_video_path

    # 4. حلقة التمديد المتتالية
    for i in range(extensions_needed):
        logger.info(f"Generating extended video | Duration: {duration}s | Scenes: 1 | AR: {aspect_ratio}")
        if notify_callback: notify_callback(f"🔄 جاري تمديد الفيديو (الجزء {i+2})...")
        
        next_prompt_index = min(i + 1, len(motion_sequence) - 1)
        next_prompt = str(motion_sequence[next_prompt_index])
        next_prompt = f"{next_prompt} . CRITICAL: Characters must NOT speak. NO lip-syncing. Silent acting."
        ext_path, new_google_name = extend_veo_video(next_prompt, current_google_name, aspect_ratio)
        
        if ext_path:
            logger.info(f"Extended video generated successfully | Path: {ext_path} ")
            final_video_path = ext_path 
            current_google_name = new_google_name
            
        else:
            logger.warning("⚠️ Extension failed, stopping early.")
            break 

    # 5. توليد الصوت ودمجه
    if voiceover_text and voiceover_text.lower() != "none" and voiceover_text.strip() != "":
        logger.info("🎙️ Generating voiceover...")
        if notify_callback: notify_callback(f"🎙️ جاري تسجيل التعليق الصوتي...")
        voice_path = generate_voiceover(voiceover_text, voice_profile_name=selected_voice, target_video_duration=duration)
        final_video_with_audio = merge_video_audio(final_video_path, voice_path)
    else:
        logger.info("🔇 No voiceover requested.")
        final_video_with_audio = final_video_path # إذا لم يكن هناك تعليق صوتي

    if notify_callback: notify_callback(f"✅ تم الانتهاء من الفيديو الممتد!")
    return {"video_storyboard": vid_storyboard, "video_url": final_video_with_audio}

# ==============================================================================
# المرحلة 4: التعديلات (Refining)
# ==============================================================================
def refine_text(current_copy, feedback):
    if getattr(settings, "use_mock_api", False):
        logger.debug("MOCK MODE: Returning mock refined copy.")
        return {"ad_copy": [{"platform": "Instagram", "ad_copy": f"نسخة محسنة بناءً على الملاحظات: {feedback}"}]}
    copywriter = get_copywriter()
    model_name = copywriter.llm_config['config_list'][0]['model']
    copy_rag = create_rag_proxy("Copy_Admin", "copywriting", "copy_db", model_name)
    
    msg = prompt_templates.get_refine_text_prompt(feedback, current_copy)
    logger.info(f"Refining text based on feedback: '{feedback[:80]}...'")
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
    logger.info("🕵️‍♂️ Analyzing image for refinement...")
    review_data = analyze_media(
        file_path=local_current_image_path,
        prompt=current_prompt,
        user_feedback=feedback,
        media_type="image"
    )
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني انتهى من المراجعة .")  
    logger.info(f"🕵️‍♂️ Image analysis complete. With feedback: {review_data.get('feedback', 'None')}")
    feedback = f"{feedback}. IMPORTANT: Ensure the product and its branding remain identical and in the same position as the original image."
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
            logger.info(f"Image refinement succeeded. New image: {image_url}")
        except Exception as e:
            # ✅ كان except: pass — الحين نعرف بالضبط شو صار
            logger.exception(f"Image refinement pipeline failed: {e}")
        
    return {"image_prompt": new_prompt, "image_url": image_url, "thought_signature": signature}

def refine_video(current_storyboard, feedback, duration, base_image_path=None, aspect_ratio="16:9", current_video_path=None,  notify_callback=None, event_name=None, event_angle=None):
    video_director = get_video_director()
    prompter = get_prompter()
    
    model_name = prompter.llm_config['config_list'][0]['model']
    prompts_rag = create_rag_proxy("Prompts_Admin", "prompts", "prompts_db", model_name)
    
    groupchat = autogen.GroupChat(agents=[prompts_rag, video_director, prompter], messages=[], max_round=3, speaker_selection_method="round_robin")
    
    manager = autogen.GroupChatManager(
        groupchat=groupchat, 
        llm_config=video_director.llm_config,
        is_termination_msg=lambda x: False
    )

    local_video_path = get_local_media_path(current_video_path)
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع الفيديو و طلب التعديل...")
    logger.info("🕵️‍♂️ Analyzing video for refinement...")
    
    review_data = analyze_media(
        file_path=local_video_path,
        prompt=current_storyboard,
        user_feedback=feedback,
        media_type="video",
    )
    
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني انتهى من المراجعة.") 
    logger.info(f"🕵️‍♂️ Video analysis complete. With feedback: {review_data.get('feedback', 'None')}")

    msg = prompt_templates.get_refine_video_prompt(feedback, current_storyboard, review_data.get("feedback", ""), event_name=event_name, event_angle=event_angle)
    chat_result = prompts_rag.initiate_chat(
        manager, 
        message=prompts_rag.message_generator,
        problem=msg,
        n_results=2
    )
    
    data = extract_agent_json(chat_result.chat_history, "Prompt_Engineer")
    _, vid_storyboard, voiceover_text  = normalize_prompts_data(data)
    selected_voice = data.get("selected_voice_profile", "Farah") if isinstance(data, dict) else "Farah"

    local_ref_path = get_local_media_path(base_image_path)
    video_url = None

    if not vid_storyboard:
        logger.warning("refine_video: No storyboard extracted from agent response.")
        return {"video_storyboard": vid_storyboard, "video_url": None}

    # ==============================================================================
    # 🧠 THE SMART ROUTER: هل هو ممتد أم متعدد؟
    # ==============================================================================
    is_extended = (duration % 8 != 0)

    if not is_extended:
        # 🎬 المسار الأول: فيديو لقطات متعددة (8, 16, 24...)
        logger.info(f"🎬 Refining Multi-Scene Video (Duration: {duration}s)")
        video_url = generate_final_video_asset(
            vid_storyboard, 
            base_image_path=local_ref_path, 
            aspect_ratio=aspect_ratio, 
            voiceover_text=voiceover_text, # 👈 تمرير التعليق الصوتي إن وجد
            voice_profile_name=selected_voice, # 👈 تمرير الصوت
            notify_callback=notify_callback,
        )

    else:
        # 🎬 المسار الثاني: فيديو ممتد لقطة واحدة (15, 22, 29...)
        logger.info(f"🎬 Refining Extended One-Shot Video (Duration: {duration}s)")
        
        scene = vid_storyboard[0]
        motion_p = scene.get("motion_prompt", "")
        # في حال الـ Extended نأخذ التعليق الصوتي من الـ JSON الأساسي أو من المشهد
        voice_p = voiceover_text or scene.get("voiceover_text", "")
        audio_p = scene.get("audio_prompt", "")
        scene_img_prompt = scene.get("image_prompt", "")
        scene_image_path = local_ref_path 
        
        # 1. تحديث الصورة الافتتاحية إن لزم الأمر
        if scene_img_prompt:
            if notify_callback: notify_callback(f"🎨 جاري توليد وتصميم الصورة الافتتاحية للمشهد المعدل...")
            try:
                generated_img, _ = generate_image(scene_img_prompt, reference_image_path=scene_image_path, aspect_ratio=aspect_ratio)
                if generated_img and os.path.exists(generated_img):
                    scene_image_path = generated_img 
            except Exception as e:
                logger.warning(f"⚠️ Image Gen failed, using base image. Error: {e}")

        # 2. بناء البرومبت السينمائي الصامت
        scene_prompt = f"{motion_p}"
        if audio_p and audio_p.lower() != "none" and audio_p.strip() != "":
            scene_prompt += f". Audio context: {audio_p}"
        scene_prompt += " CRITICAL: Characters must NOT speak. NO lip-syncing. Closed mouths only. Cinematic silent acting. No voiceover."

        if notify_callback: notify_callback(f"🎬 جاري توليد المشهد الافتتاحي المعدل (8 ثوانٍ)...")
        
        # 3. التوليد الأول
        first_video_path, google_video_name = generate_veo_video(scene_prompt, scene_image_path, aspect_ratio)

        if first_video_path and google_video_name:
            extensions_needed = max(0, (duration - 8) // 7)
            current_google_name = google_video_name
            final_video_path = first_video_path

            # 4. التمديد
            for i in range(extensions_needed):
                if notify_callback: notify_callback(f"🔄 جاري تمديد الفيديو (الجزء {i+2})...")
                ext_path, new_google_name = extend_veo_video(scene_prompt, current_google_name, aspect_ratio)
                
                if ext_path:
                    final_video_path = ext_path 
                    current_google_name = new_google_name
                else:
                    logger.warning("⚠️ Extension failed, stopping early.")
                    break 

            # 5. توليد الصوت ودمجه
            if voice_p and voice_p.lower() != "none" and voice_p.strip() != "":
                if notify_callback: notify_callback(f"🎙️ جاري تسجيل التعليق الصوتي الممتد...")
                # لا تنسى تمرير الـ target_video_duration لتجنب أخطاء القص
                voice_path = generate_voiceover(voice_p, voice_profile_name=selected_voice, target_video_duration=float(duration))
                video_url = merge_video_audio(final_video_path, voice_path)
            else:
                video_url = final_video_path 

    return {"video_storyboard": vid_storyboard, "video_url": video_url}

# ==============================================================================
# التنفيذ المتوازي لتوليد الفيديوهات من الستوري بورد (Parallel Video Generation)
# ==============================================================================
def process_single_scene(scene, valid_image_path, aspect_ratio="16:9",  notify_callback=None):
    """
    دالة مساعدة لمعالجة مشهد واحد (توليد صورة ثم توليد فيديو).
    صُممت لتعمل داخل Thread.
    """
    scene_num = scene.get("scene_number", 1)
    logger.info(f"[Thread] Started processing scene {scene_num}...")

    if notify_callback: notify_callback(f"⏳ جاري معالجة المشهد رقم {scene_num}...")
    motion_p = scene.get("motion_prompt", "")
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
                logger.info(f"[Scene {scene_num}] Custom frame generated: {generated_img}")
                if notify_callback: notify_callback(f"✅ تم تصميم إطار المشهد {scene_num} بنجاح!")
        except Exception as e:
            logger.warning(f"[Scene {scene_num}] Frame generation failed, using base image. Error: {e}")
            if notify_callback:
                notify_callback(f"⚠️ فشل تصميم إطار المشهد {scene_num}، سيتم استخدام الصورة الأساسية.")

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
            logger.error(f"[Scene {scene_num}] Video file missing after generation.")
            if notify_callback: notify_callback(f"❌ فشل تحريك المشهد {scene_num} (مرفوض من جوجل).")
            return {"scene_number": scene_num, "path": None}
        logger.info(f"[Thread] Scene {scene_num} completed: {scene_video_path}")
        if notify_callback: notify_callback(f"✅ تم الانتهاء من تحريك المشهد {scene_num} بنجاح!")
    except Exception as e:
        logger.exception(f"[Scene {scene_num}] Unhandled exception during video generation: {e}")
        if notify_callback: notify_callback(f"❌ فشل تحريك المشهد {scene_num}.")
        return {"scene_number": scene_num, "path": None}
    
    

    return {"scene_number": scene_num, "path": scene_video_path}

def generate_final_video_asset(storyboard_json, base_image_path=None, aspect_ratio="16:9", voiceover_text=None, voice_profile_name="Farah", notify_callback=None):
    """
    تقرأ الستوري بورد، تولد كل مشهد بالتوازي (Parallel)، ثم تدمجها بالترتيب.
    """
    if not storyboard_json or not isinstance(storyboard_json, list):
        logger.error("generate_final_video_asset: Invalid or empty storyboard.")
        return None

    if notify_callback:
        notify_callback(f"🚀 بدء عملية الإنتاج السينمائي ({len(storyboard_json)} مشاهد)...")

    logger.info(f"Starting parallel video generation | Scenes: {len(storyboard_json)} | AR: {aspect_ratio}")

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
                logger.exception(f"Scene future raised an unhandled exception: {exc}")

    # --- ترتيب المشاهد ودمجها ---
    if not results:
        logger.error("All scene generations failed. No video to return.")
        if notify_callback:
            notify_callback("⚠️ فشلت عملية توليد جميع المشاهد.")
        return None

    # ترتيب النتائج تصاعدياً حسب scene_number لضمان تسلسل الفيديو
    results.sort(key=lambda x: x["scene_number"])
    
    # استخراج المسارات المرتبة فقط
    ordered_video_paths = [res["path"] for res in results]
    logger.info(f"Scenes completed: {len(ordered_video_paths)}/{len(storyboard_json)}")
    # الدمج
    if len(ordered_video_paths) == 1:
        if notify_callback:
             notify_callback("🎉 اكتمل إنتاج الفيديو بنجاح!")
        return ordered_video_paths[0]
    else:
        if notify_callback:
            notify_callback("🎞️ جاري دمج المشاهد وإخراج الفيديو النهائي...")
        merged_silent_video = concatenate_veo_videos(ordered_video_paths)
        logger.info(f"Videos merged into: {merged_silent_video}")
        if notify_callback:
            notify_callback("🎉 اكتمل إنتاج الفيديو المدمج بنجاح!")

    
    total_video_duration = len(storyboard_json) * 8  
    
    full_voice_path = None
    if voiceover_text and voiceover_text.strip() != "" and voiceover_text.lower() != "none":
        if notify_callback: notify_callback("🎙️ جاري تسجيل التعليق الصوتي الكامل للحملة...")
        
        # 👈 نرسل النص مباشرة كما هو. دالة generate_voiceover في audio_gen 
        # هي من ستقوم بالقياس، وإذا كان طويلاً ستستدعي AI لتقصيره تلقائياً!
        full_voice_path = generate_voiceover(
            text=voiceover_text, 
            voice_profile_name=voice_profile_name, 
            target_video_duration=total_video_duration
        )

    if full_voice_path and merged_silent_video:
        if notify_callback: notify_callback("🎵 تركيب الهندسة الصوتية النهائية...")
        final_video = merge_video_audio(merged_silent_video, full_voice_path)
        logger.info(f"Final video with audio: {final_video}")
        if notify_callback: notify_callback("🎉 اكتمل إنتاج الفيديو المدمج بنجاح!")
        return final_video
    
    if notify_callback: notify_callback("🎉 اكتمل إنتاج الفيديو بنجاح!")
    return merged_silent_video
    
    
