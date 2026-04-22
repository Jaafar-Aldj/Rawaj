import os
import sys
import json
from dotenv import load_dotenv
import autogen

load_dotenv()
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.agents.roles import get_director, get_copywriter, get_video_director, get_prompter
from app.agents.manager import create_rag_proxy, extract_agent_json
from app.agents import prompt_templates

def test_dynamic_platforms():
    print("\n" + "="*50)
    print("🧪 1. TESTING DYNAMIC PLATFORM SELECTION (COPYWRITING)")
    print("="*50)
    
    product = "عطر ليالي الشرق"
    desc = "عطر رجالي فخم برائحة العود، مناسب للمناسبات الرسمية."
    audience = "الرجال (30-50 عاماً)"
    
    director = get_director()
    copywriter = get_copywriter()
    model_name = copywriter.llm_config['config_list'][0]['model']
    copy_rag = create_rag_proxy("Copy_Admin", "copywriting", "copy_db", model_name)

    groupchat = autogen.GroupChat(agents=[copy_rag, director, copywriter], messages=[], max_round=4, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=director.llm_config)

    # هنا لم نرسل أي منصة (تركنا الخيار للذكاء الاصطناعي)
    platform_instruction = "Target Platforms: USER DID NOT SPECIFY. You MUST choose the 2 or 3 most suitable social media platforms for this specific product and audience."
    message = prompt_templates.get_copy_generation_prompt(product, desc, audience, platform_instruction)

    chat_result = copy_rag.initiate_chat(manager, message=copy_rag.message_generator, problem=message, n_results=2)
    ad_copy = extract_agent_json(chat_result.chat_history, "Copywriter", "ad_copy")
    
    print("\n✅ AI DECISION FOR PLATFORMS:")
    print(json.dumps(ad_copy, indent=4, ensure_ascii=False))


def test_dynamic_voice_selection():
    print("\n" + "="*50)
    print("🧪 2. TESTING DYNAMIC VOICE SELECTION (VIDEO STORYBOARD)")
    print("="*50)
    
    # 💡 قم بتغيير المنتج لترى كيف سيغير الذكاء الاصطناعي رأيه في اختيار الصوت!
    product = "طوق ألماس"
    audience = "المليونيرات العربيات (40-60 عاماً)"
    fake_ad_copy = [{"platform": "TikTok", "ad_copy": "تألقي مع طوق الألماس الفاخر - رمز الأناقة والترف الذي يليق بكِ!"}]
    
    # 💡 جرب وضع "Auto" لترى من سيختار، أو ضع "Sara" لتجبره عليها.
    voice_preference = "Auto" 

    video_director = get_video_director()
    prompter = get_prompter()
    model_name = prompter.llm_config['config_list'][0]['model']
    prompts_rag = create_rag_proxy("Prompts_Admin", "prompts", "prompts_db", model_name)

    groupchat = autogen.GroupChat(agents=[prompts_rag, video_director, prompter], messages=[], max_round=4, speaker_selection_method="round_robin")
    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=video_director.llm_config)

    message = prompt_templates.get_video_generation_prompt(
        product_name=product, 
        audience=audience, 
        ad_copy_json=fake_ad_copy, 
        duration=8, 
        num_scenes=1, 
        aspect_ratio="9:16", 
        voice_preference=voice_preference
    )

    chat_result = prompts_rag.initiate_chat(manager, message=prompts_rag.message_generator, problem=message, n_results=2)
    data = extract_agent_json(chat_result.chat_history, "Prompt_Engineer")
    
    print("\n✅ AI DECISION FOR VOICE & STORYBOARD:")
    selected_voice = data.get("selected_voice_profile", "ERROR") if data else "ERROR"
    print(f"🎙️ SELECTED VOICE: {selected_voice}")
    print(json.dumps(data, indent=4, ensure_ascii=False))


if __name__ == "__main__":
    # test_dynamic_platforms()
    test_dynamic_voice_selection()