import autogen
from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent
from app.agents.roles import get_director, get_copywriter, get_video_director, get_prompter
from app.services.image_gen import generate_image_with_imagen
from app.services.video_gen import  generate_veo_video
from app.services.video_processing import concatenate_veo_videos
# from app.services.audio_gen import generate_audio_elevenlabs
import os
import json
import re



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
        if json_match:
            return json.loads(json_match.group())
        list_match = re.search(r"\[.*\]", content, re.DOTALL)
        if list_match:
            return json.loads(list_match.group())
    except Exception as e:
        print(f"❌ Failed to parse JSON: {e}")
    return None

def normalize_prompts_data(data):
    """
    تستخرج:
    1. main_image_prompt (نص)
    2. video_storyboard (قائمة من القواميس للمشاهد)
    """
    image_prompt = None
    video_storyboard = []
    
    if not data: return None, []

    if isinstance(data, dict):
        # البحث عن صورة البوستر الأساسية
        image_prompt = data.get("main_image_prompt") or data.get("image_prompt") or data.get("image_prompts")
        if isinstance(image_prompt, list) and len(image_prompt) > 0:
            image_prompt = image_prompt[0]
            
        # البحث عن مصفوفة الفيديو
        storyboard = data.get("video_storyboard") or data.get("scenes") or data.get("video_prompts")
        if isinstance(storyboard, list):
            video_storyboard = storyboard
        elif isinstance(storyboard, dict): # إذا أرجع مشهداً واحداً كقاموس
            video_storyboard = [storyboard]

    if isinstance(image_prompt, list) and len(image_prompt) > 0:
        image_prompt = str(image_prompt[0])
    elif isinstance(image_prompt, dict): 
        image_prompt = str(image_prompt)

    return image_prompt, video_storyboard



def suggest_audiences(product_name, product_desc, product_analysis=None):
    director = get_director()
    rag_proxy = get_rag_proxy(director.llm_config)

    # 2. دمج الوصف النصي مع وصف الصورة
    message = f"""
    Product: {product_name}
    Description: {product_desc}
    {product_analysis}
    
    TASK: Based on the knowledge base strategies, suggest up to 5 distinct Target Audiences.
    IMPORTANT: Output ONLY a valid JSON structure: {{ "suggestions": [ {{ "audience": "Name", "reason": "Why" }} ] }}
    """

    chat_result = rag_proxy.initiate_chat(
        director,
        message=message,
        max_turns=2
    )

    last_message = chat_result.chat_history[-1]['content']
    data = json_match_extractor(last_message)
    
    if data and "suggestions" in data:
        return data
        
    raise Exception("NO data returned from agents!!")


def generate_content_for_audience(product_name, product_desc, audience, product_analysis=None, image_ref = None, requested_duration=8):
    director = get_director()
    copywriter = get_copywriter()
    video_director = get_video_director()
    prompter = get_prompter()
    
    user = autogen.UserProxyAgent(
        name="User", 
        human_input_mode="NEVER", 
        code_execution_config=False, 
        is_termination_msg=lambda msg: "TERMINATE" in msg.get("content", "").upper()
    )

    def custom_speaker_selection(last_speaker, groupchat):
        messages = groupchat.messages
        if not messages: return director
        
        last_message = messages[-1]["content"]
        
        if "TERMINATE" in last_message: return user # إنهاء فوري
        
        if last_speaker is user: return director
        elif last_speaker is director: return copywriter
        elif last_speaker is copywriter: return video_director # <--- الوكيل الجديد
        elif last_speaker is video_director: return prompter
        elif last_speaker is prompter: return director # لكي يراجع وينهي
            
        return "auto"

    groupchat = autogen.GroupChat(
        agents=[user, director, copywriter, video_director, prompter],
        messages=[],
        max_round=10,
        speaker_selection_method=custom_speaker_selection,
    
    )
    
    manager = autogen.GroupChatManager(
        groupchat=groupchat, 
        llm_config=director.llm_config, 
        
    )
    
    num_scenes = max(1, requested_duration // 8)
    # 2. إعداد الرسالة (نصية فقط، لكنها تحتوي على تفاصيل الصورة)
    message = f"""
    Product: {product_name}
    Description: {product_desc}
    {product_analysis} 
    
    Target Audience: {audience}
    Requested Total Video Duration: {requested_duration} seconds.
    
    TASK:
    1. Director: Instruct team based on product details (text + visual analysis).
    2. Copywriter: Write Arabic ad copy for '{audience}'. Output JSON.
    3. Video_Director: Create a storyboard for EXACTLY {num_scenes} scenes (No more, no less). Each scene represents 8 seconds of video.
    4. Prompt_Engineer: Create the final prompts JSON.
    """

    # إرسال كنص عادي (مضمون 100%)
    chat_result = user.initiate_chat(manager, message=message)

    # ... (داخل دالة generate_content_for_audience)

    final_output = {
        "ad_copy": {},
        "image_prompt": None,
        "image_url": None,
        "video_storyboard": [], 
        "video_url": None,
    }

    for msg in reversed(chat_result.chat_history): 
        name = msg.get("name", "")
        content = msg.get("content", "")

        if name == "Copywriter" and not final_output["ad_copy"]:
            data = json_match_extractor(content)
            if data:
                final_output["ad_copy"] = data.get("ad_copy", data)

        if name == "Prompt_Engineer" and not final_output["image_prompt"]:
            data = json_match_extractor(content)
            img_p, vid_storyboard = normalize_prompts_data(data)
            
            final_output["image_prompt"] = img_p
            final_output["video_storyboard"] = vid_storyboard # مصفوفة المشاهد
            
            # في دالة generate_content_for_audience
            if img_p:
                print(f"🎨 Generating Image for {audience}...")
                
                local_path = None
                if image_ref:
                    # تحويل رابط الصورة المرفوعة لمسار محلي للدمج
                    if "http" in image_ref and "upload" in image_ref:
                        filename = image_ref.split("upload/")[-1]
                        path1 = os.path.join("rawaj-frontend", "assets", "upload", filename) 
                        if os.path.exists(path1):
                            local_path = path1
                    elif os.path.exists(image_ref):
                        local_path = image_ref
                
                print(f"DEBUG: Using reference image path: {local_path}")

                try:
                    # توليد البوستر الأساسي
                    final_output["image_url"] = generate_image_with_imagen(img_p, reference_image_path=local_path)
                except Exception as e:
                    print(f"❌ Image Gen Error: {e}")

    return final_output
    


def refine_draft(current_data, feedback, edit_type="both"):
    """
    يقوم بتعديل المحتوى بناءً على ملاحظات المستخدم.
    current_data: { "ad_copy": ..., "image_prompt": ... }
    edit_type: "text", "image", or "both"
    """ 
    director = get_director()
    copywriter = get_copywriter()
    prompter = get_prompter()
    
    user = autogen.UserProxyAgent(name="User_Feedback", human_input_mode="NEVER", code_execution_config=False)
    
    participants = [user]
    if "text" in edit_type or "both" in edit_type: participants.append(copywriter)
    if "image" in edit_type or "both" in edit_type: participants.append(prompter)
        
    groupchat = autogen.GroupChat(agents=participants, messages=[], max_round=3, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=director.llm_config)

    task_msg = f"User Feedback: {feedback}\n"
    if "text" in edit_type or "both" in edit_type:
        task_msg += f"Current Copy: {current_data.get('ad_copy')}\nTask: Rewrite copy. Output JSON."
    if "image" in edit_type or "both" in edit_type:
        task_msg += f"Current Prompt: {current_data.get('image_prompt')}\nTask: Update image prompt. Output JSON."

    chat_result = user.initiate_chat(manager, message=task_msg)

    refined_output = {}
    
    for msg in chat_result.chat_history:
        name = msg.get("name", "")
        content = msg.get("content", "")

        if name == "Copywriter":
            data = json_match_extractor(content)
            if data: refined_output["ad_copy"] = data.get("ad_copy", data)

        if name == "Prompt_Engineer":
            data = json_match_extractor(content)
            img_p, vid_p = normalize_prompts_data(data)
            
            refined_output["image_prompt"] = img_p
            if vid_p: refined_output["video_prompt"] = vid_p
            
            if img_p:
                try:
                    image_ref = current_data.get("image_url")
                    local_path = None
                    if image_ref:
                        if "http" in image_ref and "upload" in image_ref:
                            filename = image_ref.split("upload/")[-1]
                            # تأكد من المسار الصحيح لمجلد الرفع (upload أو غيره)
                            # جرب البحث في المجلدين المحتملين
                            path1 = os.path.join("rawaj-frontend", "assets", "upload", filename) 
                            if os.path.exists(path1):
                                local_path = path1
                        elif os.path.exists(image_ref):
                            local_path = image_ref
                    print(f"🎨 Regenerating Image...")
                    refined_output["image_url"] = generate_image_with_imagen(img_p, reference_image_path=local_path)
                except Exception as e:
                    print(f"❌ Image Gen Error: {e}")

    return refined_output

import concurrent.futures
# (تأكد من وجود استيراد generate_image_with_imagen و generate_veo_video)

def process_single_scene(scene, valid_image_path):
    """
    دالة مساعدة لمعالجة مشهد واحد (توليد صورة ثم توليد فيديو).
    صُممت لتعمل داخل Thread.
    """
    scene_num = scene.get("scene_number", 1)
    print(f"⏳ [Thread] Started Processing Scene {scene_num}...")
    
    motion_p = scene.get("motion_prompt", "")
    voice_p = scene.get("voiceover_text", "")
    scene_img_prompt = scene.get("image_prompt", "")
    
    # 1. توليد الصورة الخاصة بالمشهد
    scene_image_path = valid_image_path 
    
    if scene_img_prompt:
        try:
            generated_img = generate_image_with_imagen(scene_img_prompt, reference_image_path=valid_image_path)
            if generated_img and os.path.exists(generated_img):
                scene_image_path = generated_img
        except Exception as e:
            print(f"⚠️ [Scene {scene_num}] Image Gen failed, using base image. Error: {e}")

    # 2. تجهيز برومبت الفيديو (الصوت اختياري)
    veo_prompt = motion_p
    if voice_p and str(voice_p).strip() != "" and str(voice_p).lower() != "none":
        veo_prompt += f". [AUDIO GENERATION ONLY - DO NOT RENDER TEXT ON SCREEN]: Voiceover says: '{voice_p}'"
        
    # 3. توليد الفيديو
    try:
        scene_video_path = generate_veo_video(prompt_text=veo_prompt, image_path=scene_image_path)
        print(f"✅ [Thread] Scene {scene_num} completed.")
        # نرجع رقم المشهد مع المسار لضمان الترتيب لاحقاً
        return {"scene_number": scene_num, "path": scene_video_path}
    except Exception as e:
        print(f"❌ [Scene {scene_num}] Video Gen failed: {e}")
        return {"scene_number": scene_num, "path": None}


def generate_final_video_asset(storyboard_json, base_image_path=None):
    """
    تقرأ الستوري بورد، تولد كل مشهد بالتوازي (Parallel)، ثم تدمجها بالترتيب.
    """
    if not storyboard_json or not isinstance(storyboard_json, list):
        print("❌ Invalid storyboard format")
        return None

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
            executor.submit(process_single_scene, scene, valid_image_path): scene 
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
        return None

    # ترتيب النتائج تصاعدياً حسب scene_number لضمان تسلسل الفيديو
    results.sort(key=lambda x: x["scene_number"])
    
    # استخراج المسارات المرتبة فقط
    ordered_video_paths = [res["path"] for res in results]

    # الدمج
    if len(ordered_video_paths) == 1:
        return ordered_video_paths[0]
    else:
        final_video = concatenate_veo_videos(ordered_video_paths)
        return final_video
    
    

def refine_video_with_feedback(current_data, feedback):
    """
    دالة لتعديل الفيديو بناءً على ملاحظات المستخدم.
    feedback: نص الملاحظات التي قد تحتوي على تفاصيل حول ما يجب تعديله في الفيديو.
    """
    director = get_director()
    prompter = get_prompter()

    user = autogen.UserProxyAgent(name="User_Feedback", human_input_mode="NEVER", code_execution_config=False)
    groupchat = autogen.GroupChat(agents=[director, prompter, user], messages=[], max_round=3, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=director.llm_config)

    task_msg = f"User Feedback: {feedback}\n Current Prompt: {current_data.get('video_prompt')}\nTask: Update video prompt. Output JSON."

    chat_result = user.initiate_chat(manager, message=task_msg)

    refined_output = {}
    
    for msg in chat_result.chat_history:
        name = msg.get("name", "")
        content = msg.get("content", "")

        if name == "Prompt_Engineer":
            data = json_match_extractor(content)
            vid_p = normalize_prompts_data(data)
            
            refined_output["video_prompt"] = vid_p
            try:
                image_path = current_data.get("image_url")
                
                print(f"🎨 Regenerating Video...")
                video_path = generate_veo_video(vid_p, image_path)
                if video_path:
                    refined_output["video_url"] = video_path
            except Exception as e:
                print(f"❌ Video Gen Error: {e}")

    return refined_output


if __name__ =="__main__":
    # image_path = r"D:\UOK_Final_Proj\Rawaj\rawaj-frontend\assets\smart_fitness_tracker.jpeg"
    image_path = r"http://127.0.0.1:8000/assets/81e5f1de-2f4f-4f2f-9edd-d3c572ef0e2b.jpeg"
    