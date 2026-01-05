import autogen
from app.agents.config import llm_config
import app.agents.agents_system_messages as sys_msg


# 1. Creative Director (The Orchestrator)
def get_director():
    return autogen.AssistantAgent(
        name="Creative_Director",
        llm_config=llm_config,
        system_message= sys_msg.director,
    )

# 2. Copywriter (Writes the Ad Text)
def get_copywriter()-> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Copywriter",
        llm_config=llm_config,
        system_message= sys_msg.copywriter,
    )

# 3. Prompt Engineer (Generates Visual Descriptions)
def get_prompter()-> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Prompt_Engineer",
        llm_config=llm_config,
        system_message=sys_msg.prompter,
    )