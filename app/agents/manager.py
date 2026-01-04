import autogen
from app.agents.roles import get_director, get_copywriter, get_prompter

def run_campaign_meeting(product_name, product_desc):    
    # 1. استدعاء الوكلاء
    director = get_director()
    copywriter = get_copywriter()
    prompter = get_prompter()

    # 2. إنشاء المستخدم (الذي يمثل العميل)
    user_proxy = autogen.UserProxyAgent(
        name="Client",
        human_input_mode="NEVER", # لن نتدخل، دعهم يعملون
        max_consecutive_auto_reply=10,
        is_termination_msg=lambda x: "TERMINATE" in x.get("content", ""),
        code_execution_config=False
    )

    # 3. تجهيز مجموعة الدردشة (Group Chat)
    groupchat = autogen.GroupChat(
        agents=[user_proxy, director, copywriter, prompter],
        messages=[],
        max_round=6,  # عدد جولات الحديث المسموح بها (عشان ما يصرفوا رصيد كتير)
        speaker_selection_method="round_robin",
    )

    # 4. مدير المجموعة (يدير الميكروفون)
    manager = autogen.GroupChatManager(
        groupchat=groupchat,
        llm_config=director.llm_config # يستخدم نفس إعدادات المدير
    )

    # 5. رسالة البدء
    message = f"""
    product_name: {product_name}
    product_desc: {product_desc}
    Please plan a complete marketing campaign for the above product.
    """

    # 6. بدء الدردشة
    user_proxy.initiate_chat(
        manager,
        message=message
    )
    
    # (لاحقاً سنضيف كود لاستخراج النتائج، الآن يكفي أن نراهم يتحدثون)