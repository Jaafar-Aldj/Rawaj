import autogen
from app.agents.config import llm_config, directory_config
import app.agents.agents_system_messages as sys_msg

# 1. Marketing Strategist (The Planner)
def get_marketing_strategist() -> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Marketing_Strategist",
        llm_config=directory_config,
        system_message=sys_msg.strategist,
    )

# 2. Creative Director (The Orchestrator)
def get_director() -> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Creative_Director",
        llm_config=directory_config,
        system_message= sys_msg.director,
    )

# 3. Copywriter (Writes the Ad Text)
def get_copywriter()-> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Copywriter",
        llm_config=llm_config,
        system_message= sys_msg.copywriter,
    )

# 4. Video Director (Visual Storytelling - The Most Important)
def get_video_director() -> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Video_Director",
        llm_config=llm_config,
        system_message=sys_msg.video_director,
    )

# 5. Prompt Engineer (Generates Visual Descriptions)
def get_prompter()-> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Prompt_Engineer",
        llm_config=llm_config,
        system_message=sys_msg.prompter,
    )

# 6. Art Director (QA)
def get_art_director() -> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Art_Director",
        llm_config=directory_config, 
        system_message=sys_msg.art_director,
    ) 