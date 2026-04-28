import json

from app.services.audio_gen import AVAILABLE_VOICES

def _get_dynamic_voices_list() -> str:
    """تبني قائمة الأصوات مع الشرح تلقائياً من القاموس لتغذية البرومبت"""
    voices_str = ""
    for name, data in AVAILABLE_VOICES.items():
        voices_str += f"    - \"{name}\": {data['description']}\n"
    return voices_str

# ==============================================================================
# 1. Strategy Prompts (مرحلة الاستراتيجية)
# ==============================================================================
def get_strategy_chat_context(product_name, product_desc, product_analysis, current_date, user_message, real_events, history_text=""):
    context = f"""
    [SYSTEM CONTEXT - DO NOT SHOW TO USER]
    Product: {product_name}
    Description: {product_desc}
    Visual Analysis: {product_analysis}
    Today is {current_date}. Target Region: MENA.
    """
    if real_events:
        context += f"""
        \n\n{real_events}
        
        🛑 CRITICAL INSTRUCTION FOR TRENDING EVENTS: 
        1. You MUST base your 'Trending Events' strategy ONLY on the exact real events listed above. 
        2. DO NOT invent, guess, or hallucinate any religious or national holidays (like Eid Al-Fitr or Eid Al-Adha) if they are NOT explicitly listed in the REAL UPCOMING EVENTS provided above. The Islamic calendar changes every year!
        3. If the list is empty or has no major holidays, rely ONLY on general seasonal themes (e.g., Spring, Summer, Weekend gatherings, Exams) and DO NOT mention any specific Eid.
        """
        
    context += "\n[END OF SYSTEM CONTEXT]"
    
    if history_text:
        return f"{context}\n\n{history_text}\n\nUser Message: {user_message}"
    
    return f"{context}\n\nUser Message: {user_message}"


def get_finalize_strategy_prompt(product_name, history_text):
    return f"""
    {history_text}
    
    [SYSTEM: FINALIZE_STRATEGY]
    Based on the agreed chat history above for the product '{product_name}', output the final JSON strategy exactly as requested in your system instructions. Do not add any text before or after the JSON.
    """

# ==============================================================================
# 2. Copywriting Prompts (مرحلة النصوص)
# ==============================================================================
def get_copy_generation_prompt(product_name, product_desc, audience, platforms_str):
    return f"""
    Product: {product_name}
    Description: {product_desc}
    Target Audience: {audience}
    {platforms_str}
    
    TASK:
    1. Director: Instruct Copywriter briefly.
    2. Copywriter: Write specific Arabic ads for the Target Audience on the requested Platforms. Output JSON.
    🛑 CRITICAL RULE: The Copywriter MUST generate EXACTLY ONE ad text per platform listed above. If only 1 platform is provided, the JSON list MUST contain only 1 item.
    🛑 IMPORTANT: Spell out all numbers and prices in Arabic words (Tafqeet). DO NOT use digits.
    """

# ==============================================================================
# 3. Media Generation Prompts (مرحلة الوسائط)
# ==============================================================================
def get_image_generation_prompt(product_name, audience, ad_copy_json, aspect_ratio, event_name=None, event_angle=None):
    event_context = ""
    if event_name:
        angle_text = f" focusing heavily on this specific marketing angle: '{event_angle}'" if event_angle else ""
        event_context = f"\n🎯 SPECIAL INSTRUCTION: Tie this image to the trending event '{event_name}'{angle_text}. Add subtle visual elements that strongly reflect this theme."
    return f"""
    We need ONE image prompt for a product ad.
    Product: {product_name}
    Audience: {audience}
    Copy Context: {json.dumps(ad_copy_json, ensure_ascii=False)}{event_context}
    Aspect Ratio: {aspect_ratio}
    
    CRITICAL RULE:
    - NO Alcohol, Women, Children, Faces, People.
    - Focus ONLY on the BACKGROUND SCENE where the product will be placed.
    
    TASK: Prompt_Engineer, write a detailed English image prompt. Include aspect ratio instructions if necessary.
    Output ONLY JSON: {{ "main_image_prompt": "..." }}
    """

def get_video_generation_prompt(product_name, audience, ad_copy_json, duration, num_scenes, aspect_ratio, event_name=None, event_angle=None, voice_preference="Auto"):
    event_context = ""
    if event_name:
        angle_text = f" focusing heavily on this specific marketing angle: '{event_angle}'" if event_angle else ""
        event_context = f"\n🎯 SPECIAL INSTRUCTION: Tie this video to the trending event '{event_name}'{angle_text}. Add subtle visual elements that strongly reflect this theme."
    voice_instruction = ""

    if voice_preference and voice_preference.lower() != "auto" and voice_preference.strip() != "" and voice_preference in AVAILABLE_VOICES:
        voice_instruction = f"""
        USER SELECTED VOICE: "{voice_preference}".
        You MUST set `"selected_voice_profile": "{voice_preference}"` in your JSON output. Do not change it.
        """
    else:
        voice_instruction = """
        USER SELECTED VOICE: AUTO (You Decide).
        You MUST SELECT the most appropriate `voice_profile` from the list below based on the target audience dialect and product type.
        """

    dynamic_voices_list = _get_dynamic_voices_list()
    
    return f"""
    Product: {product_name}
    Audience: {audience}
    Copy Context: {json.dumps(ad_copy_json, ensure_ascii=False)}{event_context}
    Requested Total Video Duration: {duration} seconds.
    Target Aspect Ratio: {aspect_ratio}
    
    AVAILABLE VOICE PROFILES (SELECT ONLY ONE EXACT NAME FROM THIS LIST):
    {dynamic_voices_list}

    {voice_instruction}

    TASK:
    1. Video_Director: Create a storyboard for EXACTLY {num_scenes} scenes (8s per scene). Consider the {aspect_ratio} format when planning the shots. REMEMBER: Keep the voiceover EXTREMELY short (max 10-12 words per scene) so it fits the 8-second timeframe.
    2. Prompt_Engineer: Output the JSON `video_storyboard`. Ensure the `voiceover_text` remains short.
    🛑 IMPORTANT: Ensure the 'voiceover_text' contains NO digits. All numbers and dates must be written in full Arabic words for correct pronunciation.

    ⛔ NEGATIVE CONSTRAINTS:
    - NO Text, Typography, Labels on screen.
    - NO speaking
    - No Lip-syncing
    - NO talking characters. Any people in the scene MUST be silent, performing actions or showing expressions without speaking.
    
    OUTPUT JSON FORMAT MUST BE EXACTLY LIKE THIS:
    {{
        "selected_voice_profile": "Farah",
        "video_storyboard": [
            {{ 
                "scene_number": 1,
                "image_prompt": "Cinematic visual setup...",
                "motion_prompt": "Camera movement...",
                "audio_prompt": "Cinematic music..."
            }}
        ],
        voiceover_text: "For the entire video, write a single cohesive Arabic voiceover script that matches the total duration. Keep it extremely concise (max 10-12 words per scene). Do not include this in the scene objects, but provide it as a separate field in the JSON output."
    }}
    """

def get_extend_video_generation_prompt(product_name, audience, ad_copy_json, total_duration, num_scenes, aspect_ratio, event_name=None, event_angle=None, voice_preference="Auto"):
    event_context = ""
    if event_name:
        angle_text = f" focusing heavily on this specific marketing angle: '{event_angle}'" if event_angle else ""
        event_context = f"\n🎯 SPECIAL INSTRUCTION: Tie this video to the trending event '{event_name}'{angle_text}. Add subtle visual elements that strongly reflect this theme."
    voice_instruction = ""

    if voice_preference and voice_preference.lower() != "auto" and voice_preference.strip() != "" and voice_preference in AVAILABLE_VOICES:
        voice_instruction = f"""
        USER SELECTED VOICE: "{voice_preference}".
        You MUST set `"selected_voice_profile": "{voice_preference}"` in your JSON output. Do not change it.
        """
    else:
        voice_instruction = """
        USER SELECTED VOICE: AUTO (You Decide).
        You MUST SELECT the most appropriate `voice_profile` from the list below based on the target audience dialect and product type.
        """
    dynamic_voices_list = _get_dynamic_voices_list()
    return f"""
    Product: {product_name}
    Audience: {audience}
    Copy Context: {json.dumps(ad_copy_json, ensure_ascii=False)}{event_context}
    Total Video Duration: {total_duration} seconds.
    Target Aspect Ratio: {aspect_ratio}
    
    
    AVAILABLE VOICE PROFILES (SELECT ONLY ONE EXACT NAME FROM THIS LIST):
    {dynamic_voices_list}
    

    {voice_instruction}

    TASK:
    1. Video_Director: Create a storyboard for EXACTLY ONE long continuous scene that lasts {total_duration} seconds.
       - Describe the continuous action. 
       - Write a single, cohesive `voiceover` script. The word count MUST match the {total_duration} seconds duration (assume 2 words per second. E.g., for 15 seconds, write about 30 Arabic words).
    2. Prompt_Engineer: Output the JSON `video_storyboard` containing ONLY ONE scene object.
    🛑 IMPORTANT: Ensure the 'voiceover_text' contains NO digits. All numbers and dates must be written in full Arabic words for correct pronunciation.
    For this EXTENDED one-shot video, you must provide a 'motion_sequence'.
    This is a list of prompts. Each prompt describes the NEXT ACTION in the sequence.
    - Prompt 1 (Base): Describes the start.
    - Prompt 2 (Extension 1): Describes the progression of movement.
    - Prompt 3 (Extension 2): Describes the climax/end of the shot.

    ⛔ NEGATIVE CONSTRAINTS:
    - NO Text, Typography, Labels on screen.
    - NO speaking
    - No Lip-syncing
    - NO talking characters. Any people in the scene MUST be silent, performing actions or showing expressions without speaking.
    
    OUTPUT JSON FORMAT MUST BE EXACTLY LIKE THIS:
    {{
        "selected_voice_profile": "Farah",
        "video_storyboard": [
            {{ 
                "scene_number": 1,
                "image_prompt": "Cinematic visual setup...",
                "motion_prompt": "Camera movement...",
                "audio_prompt": "Cinematic music..."
            }}
        ],
        voiceover_text: "For the entire video, write a single cohesive Arabic voiceover script that matches the total duration. Do not include this in the scene objects, but provide it as a separate field in the JSON output."
    }}
    """

# ==============================================================================
# 4. Refining & Feedback Prompts (مرحلة التعديلات)
# ==============================================================================
def get_refine_text_prompt(feedback, current_copy):
    return f"""
    User Feedback: {feedback}
    Current Copy: {json.dumps(current_copy, ensure_ascii=False)}
    
    TASK: Rewrite the ad copy based on feedback. Output strict JSON.
    """

def get_refine_image_prompt(feedback, current_prompt, aspect_ratio, art_director_advice, event_name=None, event_angle=None):
    event_context = ""
    if event_name:
        angle_text = f" focusing heavily on this specific marketing angle: '{event_angle}'" if event_angle else ""
        event_context = f"\n🎯 SPECIAL INSTRUCTION: Tie this image to the trending event '{event_name}'{angle_text}. Add subtle visual elements that strongly reflect this theme."
    return f"""
    User Feedback: {feedback}
    Current Prompt: {current_prompt}
    Aspect Ratio: {aspect_ratio}{event_context}
    ART DIRECTOR INSTRUCTIONS FOR PROMPT_ENGINEER: {art_director_advice}
    
    TASK: Update the image prompt. Output JSON: {{ "main_image_prompt": "..." }}
    """

def get_refine_video_prompt(feedback, current_storyboard, art_director_advice, event_name=None, event_angle=None):
    event_context = ""
    if event_name:
        angle_text = f" focusing heavily on this specific marketing angle: '{event_angle}'" if event_angle else ""
        event_context = f"\n🎯 SPECIAL INSTRUCTION: Tie this video to the trending event '{event_name}'{angle_text}. Add subtle visual elements that strongly reflect this theme."
    return f"""
    User Feedback: {feedback}
    Current Storyboard: {json.dumps(current_storyboard, ensure_ascii=False)}{event_context}
    ART DIRECTOR INSTRUCTIONS FOR PROMPT_ENGINEER:\n{art_director_advice}\n
    
    TASK: Update the scenes based on feedback. DO NOT change image_prompts. Output JSON `video_storyboard`.
    """