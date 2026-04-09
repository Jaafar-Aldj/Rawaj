import autogen
from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent
from app.agents.roles import get_director, get_copywriter, get_marketing_strategist, get_video_director, get_prompter
from app.services.image_gen import generate_image_with_imagen
from app.services.video_gen import  generate_veo_video
from app.services.video_processing import concatenate_veo_videos
from app.services.vision_qa import analyze_media 
from app.notifications import send_notification
# from app.services.audio_gen import generate_audio_elevenlabs
import os
import json
import re
import concurrent.futures
from datetime import datetime
from app.agents.config import api_key
import google.generativeai as genai
import PIL.Image


# إعداد مكتبة جوجل مباشرة لتحليل الصور
if api_key:
    genai.configure(api_key=api_key)

# ==============================================================================
# Helpers (المساعدات)
# ==============================================================================
def analyze_image_content(image_path):
    if not image_path or not os.path.exists(image_path): return ""
    try:
        print(f"👁️ Analyzing image: {image_path}...")
        model = genai.GenerativeModel('gemini-2.5-flash')
        img = PIL.Image.open(image_path)
        prompt = "Describe this product image in high detail for a marketing team. Focus on colors, materials, style, and key features. Be objective."
        response = model.generate_content([prompt, img])
        print("✅ Image Analysis Complete.")
        return f"\n[AI Visual Analysis]: {response.text}"
    except Exception as e:
        print(f"⚠️ Image Analysis Failed: {e}")
        return ""

def get_rag_proxy(llm_config):
    return RetrieveUserProxyAgent(
        name="Knowledge_Base_Admin",
        human_input_mode="NEVER",
        code_execution_config=False,
        max_consecutive_auto_reply=1,
        retrieve_config={
            "task": "qa",
            "docs_path": [os.path.join(os.getcwd(), "knowledge")],
            "chunk_token_size": 1000, 
            "model": llm_config['config_list'][0]['model'],
            "collection_name": "rawaj_final_db", 
            "get_or_create": True,
            "overwrite": False,
        },
    )

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



def evaluate_image_quality(image_path, original_prompt):
    """
    يقوم هذا الفاحص الذكي (Art Director) بتحليل الصورة المولدة مباشرة 
    عبر Gemini Vision API للتأكد من خلوها من الأخطاء (نصوص غريبة، تشوهات).
    """
    try:
        print(f"🕵️‍♂️ Art Director is analyzing the image: {image_path}...")
        
        # 1. فتح الصورة
        img = PIL.Image.open(image_path)
        
        # 2. تجهيز الموديل السريع
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # 3. توجيه سؤال صارم للمخرج الفني
        prompt = f"""
        You are the Chief Art Director. Review this generated ad image based on the original prompt: '{original_prompt}'.
        
        CRITICAL CHECKS:
        1. Are there ANY weird text, random letters, typos, or watermarks on the image? (Images MUST be text-free unless it's a clear product logo).
        2. Are there any deformed people, extra fingers, or distorted faces?
        3. Does it violate rules (e.g., contains alcohol when it shouldn't)?
        
        If the image passes all checks and looks professional, output exactly: APPROVED
        If the image fails ANY check, output exactly: REJECTED | [Reason for rejection]
        """
        
        # 4. طلب التقييم
        response = model.generate_content([prompt, img])
        result_text = response.text.strip()
        
        if result_text.startswith("APPROVED"):
            print("✅ Art Director APPROVED the image!")
            return True, ""
        elif result_text.startswith("REJECTED"):
            reason = result_text.split("|")[-1].strip() if "|" in result_text else "Quality issues detected."
            print(f"❌ Art Director REJECTED the image. Reason: {reason}")
            return False, reason
        else:
            # إذا أرجع رداً غير متوقع، نقبله كاحتياط
            print(f"⚠️ Unclear Art Director response: {result_text}. Approving by default.")
            return True, ""
            
    except Exception as e:
        print(f"⚠️ Art Director Analysis Failed: {e}. Approving by default to prevent blocking.")
        return True, ""


def generate_and_review_image(image_prompt, reference_image_path=None, aspect_ratio="16:9", max_retries=2, notify_callback=None):
    current_prompt = image_prompt
    attempt = 1
    last_generated_image = None

    while attempt <= max_retries:
        if notify_callback:
            notify_callback(f"🕵️‍♂️ جاري تدقيق الصورة آلياً (المحاولة {attempt}/{max_retries})...")
        print(f"\n🔄 [Image QA] Attempt {attempt}/{max_retries}...")
        image_path = generate_image_with_imagen(current_prompt, reference_image_path, aspect_ratio)
        
        if not image_path or not os.path.exists(image_path):
            print(f"❌ Image generation failed at attempt {attempt}.")
            return last_generated_image
        last_generated_image = image_path
        # استدعاء المخرج الفني لتقييم الصورة
        if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع جودة الصورة...")
        review = analyze_media(image_path, current_prompt, media_type="image")

        if review.startswith("APPROVED"):
            print("✅ Art Director APPROVED the image!")
            if notify_callback:
                notify_callback("✅ الصورة اجتازت التدقيق الفني.")
            return image_path
        elif review.startswith("REJECTED"):
            reason = review.split("|")[-1].strip()
            if notify_callback: 
                notify_callback(f"⚠️ تم رفض الصورة، جاري تحسين الجودة (السبب: خطأ في التوليد). محاولة جديدة...")
            print(f"❌ Art Director REJECTED the image: {reason}")
            
            # حذف الصورة المعيبة
            if attempt < max_retries: # فقط نحذف إذا كنا سنحاول مرة أخرى
                try: os.remove(image_path)
                except: pass
            
            # تحديث البرومبت بتعليمات المخرج
            current_prompt = f"{image_prompt}. CRITICAL FIX: {reason}"
            attempt += 1
        else:
            if notify_callback: notify_callback("✅ تم اعتماد الصورة (تجاوز الفحص).")
            return image_path # كاحتياط

    if notify_callback: notify_callback("⚠️ تم استنفاد محاولات التحسين. تم اعتماد أفضل نتيجة.")
    print("⚠️ Max retries reached. Returning last image.")
    return last_generated_image

def generate_and_review_video(video_prompt, base_image_path=None, aspect_ratio="16:9", max_retries=2, notify_callback = None):
    current_prompt = video_prompt
    attempt = 1
    last_generated_video = None

    
    while attempt <= max_retries:
        if notify_callback:
            notify_callback(f"🎬 جاري التوليد (المحاولة {attempt}/{max_retries})...")
        print(f"\n🔄 [Video QA] Attempt {attempt}/{max_retries}...")
        video_path = generate_veo_video(current_prompt, base_image_path, aspect_ratio)
        
        if not video_path: return last_generated_video
        last_generated_video = video_path
        # استدعاء المخرج الفني لتقييم الفيديو
        if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع جودة الفيديو...")
        review = analyze_media(video_path, current_prompt, media_type="video")

        if review.startswith("APPROVED"):
            print("✅ Art Director APPROVED the video!")
            if notify_callback: notify_callback("✅ الفيديو اجتاز التدقيق الفني بامتياز!")
            return video_path
        elif review.startswith("REJECTED"):
            reason = review.split("|")[-1].strip()
            print(f"❌ Art Director REJECTED the video: {reason}")
            if notify_callback: 
                notify_callback("⚠️ تم رصد خلل في جودة الفيديو. جاري التحسين وإعادة التوليد...")
            
            # حذف الفيديو المعيب
            if attempt < max_retries: # فقط نحذف إذا كنا سنحاول مرة أخرى   
                try: os.remove(video_path)
                except: pass
            
            # تحديث البرومبت بتعليمات المخرج
            current_prompt = f"{video_prompt}. CRITICAL FIX: {reason}"
            attempt += 1
        else:
            if notify_callback: notify_callback("✅ تم اعتماد الفيديو (تجاوز الفحص).")
            return video_path # كاحتياط

    if notify_callback: notify_callback("⚠️ تم استنفاد محاولات التحسين. تم اعتماد أفضل نتيجة.")
    print("⚠️ Max retries reached. Returning last video.")
    return last_generated_video
    

# ==============================================================================
# المرحلة 1A: المحادثة التفاعلية (Interactive Chat)
# ==============================================================================
def chat_with_director(product_name, product_desc, product_analysis, user_message, chat_history=None):
    """
    تدير محادثة مفتوحة بين المستخدم والمدير الإبداعي.
    لا تولد JSON، بل ترجع رسالة نصية فقط.
    """
    strategist = get_marketing_strategist()
    
    rag_proxy = RetrieveUserProxyAgent(
        name="Knowledge_Base_Admin",
        human_input_mode="NEVER",
        code_execution_config=False,
        max_consecutive_auto_reply=1,
        retrieve_config={
            "task": "qa",
            "docs_path": [os.path.join(os.getcwd(), "knowledge")], # مجلد ملفات التسويق
            "chunk_token_size": 1000, 
            "model": strategist.llm_config['config_list'][0]['model'],
            "collection_name": "rawaj_marketing_db", # اسم قاعدة البيانات المحلية (ChromaDB)
            "get_or_create": True,
            "overwrite": False,
            "custom_text_type" : ["md","txt"] ,
        },
    )

    current_date = datetime.now().strftime("%Y-%m-%d")

    # إذا كانت هذه أول رسالة (لا يوجد تاريخ)
    if not chat_history or len(chat_history) == 0:
        system_context = f"""
        [SYSTEM CONTEXT - DO NOT SHOW TO USER]
        Product: {product_name}
        Description: {product_desc}
        Visual Analysis: {product_analysis}
        Today is {current_date}. Target Region: MENA.
        [END OF SYSTEM CONTEXT]
        
        User Message: {user_message}
        """
    else:
        # إذا كان هناك تاريخ محادثة، نرسل الرسالة الجديدة فقط
        # (يفضل حقن التاريخ السريع للتذكير)
        system_context = f"[SYSTEM: Today is {current_date}] User Message: {user_message}"

    # تمرير تاريخ المحادثة لـ AutoGen (للاسف AutoGen لا يدعم تمرير History بسهولة كقائمة،
    # الحل الهندسي: ندمج التاريخ السابق في رسالة واحدة كـ "نص" للذكاء الاصطناعي ليقرأه)
    
    full_prompt = system_context
    if chat_history:
        history_text = "\n--- PREVIOUS CHAT HISTORY ---\n"
        for msg in chat_history:
            history_text += f"{msg['role'].capitalize()}: {msg['content']}\n"
        history_text += "--- END OF HISTORY ---\n\n"
        full_prompt = history_text + system_context

    print("🧠 Searching Knowledge Base and consulting Strategist...")
    
    # بدء المحادثة (ذهاب وعودة واحدة فقط)
    chat_result = rag_proxy.initiate_chat(
        strategist,
        message=rag_proxy.message_generator,
        max_turns=1,
        problem = full_prompt
    )

    # استخراج رد المدير (آخر رسالة في المحادثة)
    strategist_reply = chat_result.chat_history[-1]['content']
    
    return strategist_reply

# ==============================================================================
# المرحلة 1B: اعتماد الخطة وتوليد الـ JSON (Finalize Strategy)
# ==============================================================================
def finalize_strategy(product_name, chat_history):
    """
    تجبر المدير على تلخيص المحادثة السابقة وإخراجها كـ JSON صارم.
    """
    director = get_director()
    user = autogen.UserProxyAgent(name="System", human_input_mode="NEVER", code_execution_config=False)
    
    history_text = "\n".join([f"{m['role']}: {m['content']}" for m in chat_history])
    
    # الكلمة السرية التي تكلمنا عنها في roles.py
    magic_prompt = f"""
    {history_text}
    
    [SYSTEM: FINALIZE_STRATEGY]
    Based on the agreed chat history above for the product '{product_name}', output the final JSON strategy exactly as requested in your system instructions. Do not add any text before or after the JSON.
    """

    print("📄 Forcing Director to output JSON Strategy...")
    chat_result = user.initiate_chat(director, message=magic_prompt, max_turns=1)
    
    last_message = chat_result.chat_history[-1]['content']
    
    # استخراج الـ JSON
    data = json_match_extractor(last_message)
    if data and "suggested_audiences" in data:
        return data
        
    print("⚠️ Fallback strategy used due to JSON parsing error.")
    return {
        "name": f"حملة {product_name}",
        "objective": "تم الاتفاق في المحادثة",
        "suggested_audiences": {"suggestions": [{"audience": "الجمهور المستهدف", "reason": "حسب النقاش"}]},
        "posting_strategy": {"best_days": ["الخميس"], "best_times": ["19:00"], "reason": "اوقات الذروة"},
        "trending_events": []
    }


# ==============================================================================
# المرحلة 2: توليد النصوص فقط (Generate Copy)
# ==============================================================================
def generate_copy_only(product_name, product_desc, audience, platforms):
    director = get_director()
    copywriter = get_copywriter()
    user = autogen.UserProxyAgent(name="User", human_input_mode="NEVER", code_execution_config=False)

    groupchat = autogen.GroupChat(agents=[user, director, copywriter], messages=[], max_round=3, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=director.llm_config)

    platforms_str = ", ".join(platforms) if platforms else "Instagram, Facebook, Twitter"
    
    message = f"""
    Product: {product_name}
    Description: {product_desc}
    Target Audience: {audience}
    Platforms: {platforms_str}
    
    TASK:
    1. Director: Instruct Copywriter briefly.
    2. Copywriter: Write specific Arabic ads for the Target Audience on the requested Platforms. Output JSON.
    """

    chat_result = user.initiate_chat(manager, message=message)

    ad_copy = {}
    for msg in reversed(chat_result.chat_history):
        if msg.get("name") == "Copywriter":
            data = json_match_extractor(msg.get("content", ""))
            if data:
                ad_copy = data.get("ad_copy", data)
                break
    return {"ad_copy": ad_copy}

# ==============================================================================
# المرحلة 3A: توليد صورة حسب الطلب (Generate Image)
# ==============================================================================
def generate_image_on_demand(product_name, audience, ad_copy_json, aspect_ratio, original_image_path=None, notify_callback=None):
    prompter = get_prompter()
    user = autogen.UserProxyAgent(name="User", human_input_mode="NEVER", code_execution_config=False)

    message = f"""
    We need ONE image prompt for a product ad.
    Product: {product_name}
    Audience: {audience}
    Copy Context: {json.dumps(ad_copy_json, ensure_ascii=False)}
    Aspect Ratio: {aspect_ratio}
    
    CRITICAL RULE:
    - NO Alcohol, Women, Children, Faces, People.
    - Focus ONLY on the BACKGROUND SCENE where the product will be placed.
    
    TASK: Prompt_Engineer, write a detailed English image prompt. Include aspect ratio instructions if necessary.
    Output ONLY JSON: {{ "main_image_prompt": "..." }}
    """

    chat_result = user.initiate_chat(prompter, message=message, max_turns=1)
    last_msg = chat_result.chat_history[-1]['content']
    data = json_match_extractor(last_msg)
    
    img_prompt = data.get("main_image_prompt") if data else f"High quality product photography for {product_name}, {audience}, {aspect_ratio}"
    
    print(f"🎨 Generating Image (AR: {aspect_ratio})...")
    
    local_ref_path = None
    if original_image_path:
        if "http" in original_image_path and "upload" in original_image_path:
            filename = original_image_path.split("upload/")[-1]
            path1 = os.path.join("rawaj-frontend", "assets", "upload", filename) 
            if os.path.exists(path1): local_ref_path = path1
        elif os.path.exists(original_image_path):
            local_ref_path = original_image_path

    try:
        # تأكد أن الدالة في image_gen.py تستقبل aspect_ratio (سنعدلها لاحقاً إذا أردت)
        image_path = generate_and_review_image(img_prompt, reference_image_path=local_ref_path, aspect_ratio=aspect_ratio, notify_callback=notify_callback)
    except Exception as e:
        print(f"❌ Image Gen Error: {e}")
        image_path = None

    return {"image_prompt": img_prompt, "image_url": image_path}

# ==============================================================================
# المرحلة 3B: توليد فيديو حسب الطلب (Generate Video)
# ==============================================================================
def generate_video_on_demand(product_name, audience, ad_copy_json, duration, aspect_ratio="16:9", base_image_path=None, notify_callback=None):
    video_director = get_video_director()
    prompter = get_prompter()
    prompter.update_system_message(f"""
        You are an expert Generative AI Technical Director (Runway/Veo Expert).
        
        YOUR TRIGGER: As soon as the 'Video_Director' provides the storyboard, you MUST generate visual prompts.
        
        CRITICAL RULES:
        1. Output JSON ONLY.
        2. Create a `video_storyboard` array.
        3. DO NOT output a `main_image_prompt`.
        4. **CRITICAL:** The video aspect ratio is '{aspect_ratio}'. Ensure the visual descriptions (`image_prompt`) describe a composition suitable for this ratio (e.g., vertical for 9:16, horizontal for 16:9).
        
        ⛔ NEGATIVE CONSTRAINTS:
        - NO Text, Typography, Labels on screen.
        - NO Alcohol, Women, Children.
        
        OUTPUT FORMAT (Strict JSON):
        {{
            "video_storyboard": [
                {{
                    "scene_number": 1,
                    "image_prompt": "Cinematic visual setup...",
                    "motion_prompt": "Camera movement...",
                    "voiceover_text": "Arabic text",
                    "audio_prompt": "Cinematic music..."
                }}
            ]
        }}
    """)

    user = autogen.UserProxyAgent(name="User", human_input_mode="NEVER", code_execution_config=False)

    groupchat = autogen.GroupChat(agents=[user, video_director, prompter], messages=[], max_round=4, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=video_director.llm_config)

    num_scenes = max(1, duration // 8)

    message = f"""
    Product: {product_name}
    Audience: {audience}
    Copy Context: {json.dumps(ad_copy_json, ensure_ascii=False)}
    Requested Total Video Duration: {duration} seconds.
    Target Aspect Ratio: {aspect_ratio}
    
    TASK:
    1. Video_Director: Create a storyboard for EXACTLY {num_scenes} scenes (8s per scene). Consider the {aspect_ratio} format when planning the shots.
    2. Prompt_Engineer: Output the JSON `video_storyboard`.
    """

    chat_result = user.initiate_chat(manager, message=message)

    vid_storyboard = []
    for msg in reversed(chat_result.chat_history):
        if msg.get("name") == "Prompt_Engineer":
            data = json_match_extractor(msg.get("content", ""))
            _, vid_storyboard = normalize_prompts_data(data)
            if vid_storyboard: break

    # التحضير لمسار الصورة المرجعية
    local_ref_path = None
    if base_image_path:
        if "http" in base_image_path and "upload" in base_image_path:
            filename = base_image_path.split("upload/")[-1]
            path1 = os.path.join("rawaj-frontend", "assets", "upload", filename) 
            if os.path.exists(path1): local_ref_path = path1
        elif os.path.exists(base_image_path):
            local_ref_path = base_image_path

    # توليد الفيديو الفعلي
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

# ==============================================================================
# المرحلة 4: التعديلات (Refining)
# ==============================================================================
def refine_text(current_copy, feedback):
    copywriter = get_copywriter()
    user = autogen.UserProxyAgent(name="User", human_input_mode="NEVER", code_execution_config=False)
    
    msg = f"""
    User Feedback: {feedback}
    Current Copy: {json.dumps(current_copy, ensure_ascii=False)}
    TASK: Rewrite the ad copy based on feedback. Output strict JSON.
    """
    chat_result = user.initiate_chat(copywriter, message=msg, max_turns=1)
    
    last_msg = chat_result.chat_history[-1]['content']
    data = json_match_extractor(last_msg)
    return data.get("ad_copy", data) if data else None


def refine_image(current_prompt, feedback, aspect_ratio, original_image_path=None, notify_callback=None):
    prompter = get_prompter()
    user = autogen.UserProxyAgent(name="User", human_input_mode="NEVER", code_execution_config=False)
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع الصورة و طلب التعديل...")
    art_director_advice = analyze_media(
        file_path=original_image_path,
        prompt=current_prompt,
        user_feedback=feedback,
        media_type="image"
    )
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني انتهى من المراجعة .")    
    msg = f"""
    User Feedback: {feedback}
    Current Prompt: {current_prompt}
    Aspect Ratio: {aspect_ratio}
    ART DIRECTOR INSTRUCTIONS FOR PROMPT_ENGINEER: {art_director_advice}
    TASK: Update the image prompt. Output JSON: {{ "main_image_prompt": "..." }}
    """
    chat_result = user.initiate_chat(prompter, message=msg, max_turns=1)
    
    last_msg = chat_result.chat_history[-1]['content']
    data = json_match_extractor(last_msg)
    new_prompt = data.get("main_image_prompt") if data else current_prompt
     
    local_ref_path = None
    if original_image_path:
        if "http" in original_image_path and "upload" in original_image_path:
            filename = original_image_path.split("upload/")[-1]
            path1 = os.path.join("rawaj-frontend", "assets", "upload", filename) 
            if os.path.exists(path1): local_ref_path = path1
        elif os.path.exists(original_image_path):
            local_ref_path = original_image_path

    
    image_url = None
    if new_prompt:
        try:
            image_url = generate_and_review_image(
                new_prompt, 
                reference_image_path=local_ref_path, 
                aspect_ratio=aspect_ratio,
                notify_callback=notify_callback
            )
        except: pass
        
    return {"image_prompt": new_prompt, "image_url": image_url}


def process_single_scene(scene, valid_image_path, aspect_ratio="16:9", notify_callback=None):
    """
    دالة مساعدة لمعالجة مشهد واحد (توليد صورة ثم توليد فيديو).
    صُممت لتعمل داخل Thread.
    """
    scene_num = scene.get("scene_number", 1)
    print(f"⏳ [Thread] Started Processing Scene {scene_num}...")
    


    if notify_callback:
        notify_callback(f"⏳ جاري معالجة المشهد رقم {scene_num}...")
    motion_p = scene.get("motion_prompt", "")
    voice_p = scene.get("voiceover_text", "")
    audio_p = scene.get("audio_prompt", "")
    scene_img_prompt = scene.get("image_prompt", "")
    
    # 1. توليد الصورة الخاصة بالمشهد
    scene_image_path = valid_image_path 
    
    if scene_img_prompt:
        try:
            generated_img = generate_and_review_image(
                scene_img_prompt, 
                reference_image_path=valid_image_path, 
                aspect_ratio=aspect_ratio,
                notify_callback=notify_callback
            )
            if generated_img and os.path.exists(generated_img):
                scene_image_path = generated_img
                if notify_callback:
                    notify_callback(f"✅ تم تصميم إطار المشهد {scene_num} بنجاح!")
        except Exception as e:
            if notify_callback:
                notify_callback(f"⚠️ فشل تصميم إطار المشهد {scene_num}، سيتم استخدام الصورة الأساسية.")
            print(f"⚠️ [Scene {scene_num}] Image Gen failed, using base image. Error: {e}")

    # 2. تجهيز برومبت الفيديو (الصوت اختياري)
    veo_prompt = f"{motion_p}."
    if audio_p and str(audio_p).strip() != "":
            veo_prompt += f" [Audio generation: {audio_p}]."
    if voice_p and str(voice_p).strip() != "" and str(voice_p).lower() != "none":
        veo_prompt += f". [AUDIO GENERATION ONLY - DO NOT RENDER TEXT ON SCREEN]: Voiceover says: '{voice_p}'"
        
    # 3. توليد الفيديو
    if notify_callback:
        notify_callback(f"🎬 جاري تحريك المشهد رقم {scene_num}...")
    try:
        scene_video_path = generate_and_review_video(veo_prompt, scene_image_path, aspect_ratio)
        print(f"✅ [Thread] Scene {scene_num} completed.")
        # نرجع رقم المشهد مع المسار لضمان الترتيب لاحقاً
        if notify_callback:
            notify_callback(f"✅ تم الانتهاء من تحريك المشهد {scene_num} بنجاح!")
        return {"scene_number": scene_num, "path": scene_video_path}
    except Exception as e:
        print(f"❌ [Scene {scene_num}] Video Gen failed: {e}")
        if notify_callback:
            notify_callback(f"❌ فشل تحريك المشهد {scene_num}.")
        return {"scene_number": scene_num, "path": None}


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
    valid_image_path = None
    if base_image_path:
        if "http" in base_image_path and "upload" in base_image_path:
             filename = base_image_path.split("upload/")[-1]
             temp_path = os.path.join("rawaj-frontend", "assets", "upload", filename)
             if os.path.exists(temp_path): valid_image_path = temp_path
        elif os.path.exists(base_image_path):
             valid_image_path = base_image_path

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


def refine_video(current_storyboard, feedback, base_image_path=None, aspect_ratio="16:9", current_video_path=None,  notify_callback=None):
    video_director = get_video_director()
    prompter = get_prompter()
    user = autogen.UserProxyAgent(name="User", human_input_mode="NEVER", code_execution_config=False)
    

    groupchat = autogen.GroupChat(agents=[user, video_director, prompter], messages=[], max_round=3, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=video_director.llm_config)
    art_director_advice = ""
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني يراجع الصورة و طلب التعديل...")
    art_director_advice = analyze_media(
        file_path=current_video_path,
        prompt=current_storyboard,
        user_feedback=feedback,
        media_type="video",
    )
    if notify_callback: notify_callback("🕵️‍♂️ المخرج الفني انتهى من المراجعة .") 

    msg = f"""
    User Feedback: {feedback}
    Current Storyboard: {json.dumps(current_storyboard, ensure_ascii=False)}
    ART DIRECTOR INSTRUCTIONS FOR PROMPT_ENGINEER:\n{art_director_advice}\n
    TASK: Update the scenes based on feedback. DO NOT change image_prompts. Output JSON `video_storyboard`.
    """
    chat_result = user.initiate_chat(manager, message=msg)
    
    vid_storyboard = []
    for m in reversed(chat_result.chat_history):
        if m.get("name") == "Prompt_Engineer":
            data = json_match_extractor(m.get("content", ""))
            _, vid_storyboard = normalize_prompts_data(data)
            if vid_storyboard: break
            
    # توليد الفيديو الجديد 
    local_ref_path = None
    if base_image_path:
        if "http" in base_image_path and "upload" in base_image_path:
            filename = base_image_path.split("upload/")[-1]
            path1 = os.path.join("rawaj-frontend", "assets", "upload", filename) 
            if os.path.exists(path1): local_ref_path = path1
        elif os.path.exists(base_image_path):
            local_ref_path = base_image_path

    video_url = None
    if vid_storyboard:
         video_url = generate_final_video_asset(
            vid_storyboard, 
            base_image_path=local_ref_path, 
            aspect_ratio=aspect_ratio, 
            notify_callback=notify_callback
        )
    return {"video_storyboard": vid_storyboard, "video_url": video_url}

