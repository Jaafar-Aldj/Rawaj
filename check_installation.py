try:
    import autogen
    print("✅ AutoGen is installed!")
except ImportError:
    print("❌ Error: AutoGen (pyautogen) is missing.")

try:
    from dotenv import load_dotenv
    print("✅ DotEnv is installed!")
except ImportError:
    print("❌ Error: DotEnv (python-dotenv) is missing.")

try:
    import google.generativeai
    print("✅ Google Generative AI is installed!")
except ImportError:
    print("❌ Error: Google GenAI is missing.")