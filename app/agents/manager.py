import autogen
from autogen.agentchat.contrib.retrieve_user_proxy_agent import RetrieveUserProxyAgent
from app.agents.roles import get_director, get_copywriter, get_prompter
from app.services.image_gen import generate_image_with_imagen
from app.services.video_gen import create_video_from_image_and_audio, generate_veo_video
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
    image_prompt = None
    video_prompt = None
    if not data: return None, None

    if isinstance(data, dict):
        image_prompt = data.get("image_prompt") or data.get("image_prompts")
        video_prompt = data.get("video_prompt") or data.get("video_prompts")
        
        if isinstance(image_prompt, list) and len(image_prompt) > 0:
            image_prompt = image_prompt[0]
            
        if not image_prompt and "visual_prompts" in data:
            items = data["visual_prompts"]
            if isinstance(items, list) and len(items) > 0:
                image_prompt = items[0].get("image_prompt")
                video_prompt = items[0].get("video_prompt")

    elif isinstance(data, list) and len(data) > 0:
        first_item = data[0]
        if isinstance(first_item, dict):
            image_prompt = first_item.get("image_prompt")
            video_prompt = first_item.get("video_prompt")

    if isinstance(image_prompt, dict): image_prompt = str(image_prompt)
    if isinstance(video_prompt, dict): video_prompt = str(video_prompt)

    return image_prompt, video_prompt




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


def generate_content_for_audience(product_name, product_desc, audience, product_analysis=None, image_ref = None):
    director = get_director()
    copywriter = get_copywriter()
    prompter = get_prompter()
    
    user = autogen.UserProxyAgent(name="User", human_input_mode="NEVER", code_execution_config=False)

    groupchat = autogen.GroupChat(
        agents=[user, director, copywriter, prompter],
        messages=[],
        max_round=4,
        speaker_selection_method="round_robin"
    )
    
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=director.llm_config)
    
    # 2. إعداد الرسالة (نصية فقط، لكنها تحتوي على تفاصيل الصورة)
    message = f"""
    Product: {product_name}
    Description: {product_desc}
    {product_analysis} 
    
    Target Audience: {audience}
    
    TASK:
    1. Director: Instruct team based on product details (text + visual analysis).
    2. Copywriter: Write Arabic ad copy for '{audience}'. Output JSON.
    3. Prompt_Engineer: Create ONE image prompt and ONE video prompt. Output JSON.
    """

    # إرسال كنص عادي (مضمون 100%)
    chat_result = user.initiate_chat(manager, message=message)

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

        if name == "Copywriter":
            data = json_match_extractor(content)
            if data:
                final_output["ad_copy"] = data.get("ad_copy", data)

        if name == "Prompt_Engineer":
            data = json_match_extractor(content)
            img_p, vid_p = normalize_prompts_data(data)
            
            final_output["image_prompt"] = img_p
            final_output["video_prompt"] = vid_p
            
            # في دالة generate_content_for_audience
            if img_p:
                print(f"🎨 Generating Image for {audience}...")
                
                # --- هذا هو التعديل الهام ---
                # تأكد أن original_image_path الذي تمرره هو مسار محلي حقيقي وليس رابط HTTP
                # إذا كان رابطاً (http://...), يجب تحويله لمسار محلي أولاً
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
                
                # طباعة للتأكد (Debug)
                print(f"DEBUG: Using reference image path: {local_path}")

                try:
                    # تمرير المسار المحلي الصحيح
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

def generate_final_video_asset(image_path, video_prompt):
    """
    دالة شاملة: تولد فيديو Veo + تولد صوت + تدمجهم
    """
    final_video_path = None
    
    # 1. توليد الفيديو بـ Veo
    if video_prompt:
        try:
            print("🚀 Starting Veo generation...")
            # نمرر الصورة لـ Veo ليحركها (Image-to-Video)
            veo_path = generate_veo_video(video_prompt, image_path)
            
            if veo_path:
                final_video_path = veo_path
        except Exception as e:
            print(f"❌ Veo Error: {e}")

    
    # # 3. الدمج (إذا فشل Veo، نستخدم صورة ثابتة + صوت)
    # if not final_video_path and image_path and audio_path:
    #     # Fallback: إنشاء فيديو بسيط من صورة وصوت
    #     return create_video_from_image_and_audio(image_path, audio_path)
        
    # # 4. الدمج (إذا نجح Veo + صوت) -> نحتاج دالة لدمج فيديو مع صوت (VideoFileClip)
    # # (يمكن إضافتها لاحقاً في video_gen.py)
    
    return final_video_path

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
    