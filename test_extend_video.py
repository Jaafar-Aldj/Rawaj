import os
import sys
import json
from dotenv import load_dotenv
import autogen

# تحميل المتغيرات البيئية ومسار التطبيق
load_dotenv()
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.agents.roles import get_video_director, get_prompter
from app.agents.manager import create_rag_proxy, extract_agent_json, normalize_prompts_data
from app.agents import prompt_templates
from app.services.audio_gen import generate_voiceover, merge_video_audio

# =================================================================================
# 🛑 MOCKING FUNCTIONS (لخداع السيرفر وتوفير المال!)
# =================================================================================
def mock_generate_veo_video(prompt, image_path, aspect_ratio):
    print(f"💰 [SAVED $] MOCKING VEO GENERATION: {prompt[:50]}...")
    # 👈 ضع هنا مسار أي فيديو حقيقي موجود لديك في مجلد assets/video
    mock_path = r"rawaj-frontend\assets\video\veo_d734605f.mp4" 
    
    if not os.path.exists(mock_path):
        print("❌ المرجو وضع مسار فيديو صالح في دالة الـ Mock!")
        return None, None
        
    return mock_path, "mock_google_video_object"

def mock_extend_veo_video(prompt, prev_obj, aspect_ratio):
    print(f"💰 [SAVED $] MOCKING VEO EXTENSION: {prompt[:50]}...")
    # 👈 ضع هنا مسار فيديو آخر (أو نفس الفيديو) ليمثل نتيجة التمديد
    mock_path = r"rawaj-frontend\assets\video\veo_ff46ab61.mp4" 
    return mock_path, "mock_google_video_object_extended"


# =================================================================================
# 🚀 THE TEST PIPELINE
# =================================================================================
def test_extended_video_logic():
    print("🚀 Starting MOCKED Extended Video Test...\n")
    
    # 1. إعداد المعطيات
    product = "قهوة الإشراق"
    audience = "عشاق القهوة في الصباح"
    ad_copy = [{"platform": "Instagram", "ad_copy": "استيقظ على رائحة البن الكولومبي الأصيل. قهوة الإشراق، يومك يبدأ من هنا!"}]
    duration = 15 # نطلب 15 ثانية (يعني سيقوم בתمديد واحد!)
    aspect_ratio = "9:16"
    voice_preference = "Adam"

    # 2. تشغيل عقل الذكاء الاصطناعي (AI Planning)
    video_director = get_video_director()
    prompter = get_prompter()
    model_name = prompter.llm_config['config_list'][0]['model']
    prompts_rag = create_rag_proxy("Prompts_Admin", "prompts", "prompts_db", model_name)

    message = prompt_templates.get_video_generation_prompt(
        product, audience, ad_copy, duration, 1, aspect_ratio, voice_preference=voice_preference
    )

    groupchat = autogen.GroupChat(agents=[prompts_rag, video_director, prompter], messages=[], max_round=4, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=video_director.llm_config, is_termination_msg=lambda x: False)

    print("🧠 AI is creating the Extended Storyboard...")
    chat_result = prompts_rag.initiate_chat(manager, message=prompts_rag.message_generator, problem=message, n_results=2)
    
    data = extract_agent_json(chat_result.chat_history, "Prompt_Engineer")
    _, vid_storyboard = normalize_prompts_data(data)
    
    if not vid_storyboard:
        print("❌ AI failed to generate storyboard.")
        return

    scene = vid_storyboard[0]
    print(f"\n📋 Generated Scene Prompt: {scene.get('motion_prompt')}")
    print(f"🗣️ Generated Voiceover: {scene.get('voiceover_text')}\n")

    # 3. اختبار مسار التوليد (Mocked Generation & Extension)
    extensions_needed = max(0, (duration - 8) // 7)
    print(f"🎬 Planning 1 Base Generation + {extensions_needed} Extensions.")
    
    # التوليد الأول (Mocked)
    final_video_path, current_google_obj = mock_generate_veo_video("scene_prompt", "base_image", aspect_ratio)
    
    # التمديد (Mocked)
    for i in range(extensions_needed):
        ext_path, new_google_obj = mock_extend_veo_video("scene_prompt", current_google_obj, aspect_ratio)
        if ext_path:
            final_video_path = ext_path
            current_google_obj = new_google_obj

    # 4. اختبار الصوت الحقيقي (Real Audio Generation)
    # ملاحظة: سنستهلك بعض حروف ElevenLabs هنا، لكن تكلفتها شبه صفرية
    voice_p = scene.get("voiceover_text")
    if voice_p and voice_p.lower() != "none":
        print("\n🎙️ Generating REAL Voiceover...")
        voice_path = generate_voiceover(voice_p, voice_profile_name=voice_preference)
        
        print("🎬 Merging Audio and Video...")
        final_video_with_audio = merge_video_audio(final_video_path, voice_path)
        
        print(f"\n🎉 TEST COMPLETE! Final Video saved at: {final_video_with_audio}")

if __name__ == "__main__":
    test_extended_video_logic()