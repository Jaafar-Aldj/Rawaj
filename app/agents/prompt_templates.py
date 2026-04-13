import json

# ==============================================================================
# 1. Strategy Prompts (مرحلة الاستراتيجية)
# ==============================================================================
def get_strategy_chat_context(product_name, product_desc, product_analysis, current_date, user_message, history_text=""):
    context = f"""
    [SYSTEM CONTEXT - DO NOT SHOW TO USER]
    Product: {product_name}
    Description: {product_desc}
    Visual Analysis: {product_analysis}
    Today is {current_date}. Target Region: MENA.
    [END OF SYSTEM CONTEXT]
    """
    
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
    Platforms: {platforms_str}
    
    TASK:
    1. Director: Instruct Copywriter briefly.
    2. Copywriter: Write specific Arabic ads for the Target Audience on the requested Platforms. Output JSON.
    🛑 CRITICAL RULE: The Copywriter MUST generate EXACTLY ONE ad text per platform listed above. If only 1 platform is provided, the JSON list MUST contain only 1 item.
    """

# ==============================================================================
# 3. Media Generation Prompts (مرحلة الوسائط)
# ==============================================================================
def get_image_generation_prompt(product_name, audience, ad_copy_json, aspect_ratio):
    return f"""
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

def get_video_generation_prompt(product_name, audience, ad_copy_json, duration, num_scenes, aspect_ratio):
    return f"""
    Product: {product_name}
    Audience: {audience}
    Copy Context: {json.dumps(ad_copy_json, ensure_ascii=False)}
    Requested Total Video Duration: {duration} seconds.
    Target Aspect Ratio: {aspect_ratio}
    
    TASK:
    1. Video_Director: Create a storyboard for EXACTLY {num_scenes} scenes (8s per scene). Consider the {aspect_ratio} format when planning the shots.
    2. Prompt_Engineer: Output the JSON `video_storyboard`.
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

def get_refine_image_prompt(feedback, current_prompt, aspect_ratio, art_director_advice):
    return f"""
    User Feedback: {feedback}
    Current Prompt: {current_prompt}
    Aspect Ratio: {aspect_ratio}
    ART DIRECTOR INSTRUCTIONS FOR PROMPT_ENGINEER: {art_director_advice}
    
    TASK: Update the image prompt. Output JSON: {{ "main_image_prompt": "..." }}
    """

def get_refine_video_prompt(feedback, current_storyboard, art_director_advice):
    return f"""
    User Feedback: {feedback}
    Current Storyboard: {json.dumps(current_storyboard, ensure_ascii=False)}
    ART DIRECTOR INSTRUCTIONS FOR PROMPT_ENGINEER:\n{art_director_advice}\n
    
    TASK: Update the scenes based on feedback. DO NOT change image_prompts. Output JSON `video_storyboard`.
    """