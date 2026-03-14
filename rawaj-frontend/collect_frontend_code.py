import os

# المجلد الحالي (يجب أن تضع هذا السكربت داخل مجلد الفرونت إند مباشرة)
FRONTEND_DIR = "." 

# 🚫 مجلدات يجب تجاهلها (مهم جداً لتجنب الملفات الضخمة ومخرجات البناء)
IGNORE_DIRS = {
    'node_modules', '.next', '.git', 'public', 'assets', 
    '.vscode', '.idea', 'dist', 'build', 'out'
}

# 🚫 ملفات محددة يجب تجاهلها (ملفات القفل والصور)
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 
    '.DS_Store', 'collect_frontend_code.py', 'favicon.ico'
}

# ✅ صيغ الملفات المسموح بنسخها (أكواد الفرونت إند والإعدادات)
ALLOWED_EXTENSIONS = {
    # أكواد React و TypeScript
    '.ts', '.tsx', '.js', '.jsx', 
    # التنسيقات
    '.css', '.scss', 
    # الإعدادات
    '.json', '.mjs', '.cjs', 
    # المتغيرات
    '.env.example', '.env.local'
}

def collect_frontend_code(output_file="full_frontend_project.txt"):
    print(f"🔍 Scanning frontend directory: {os.path.abspath(FRONTEND_DIR)}")
    
    with open(output_file, "w", encoding="utf-8") as outfile:
        for root, dirs, files in os.walk(FRONTEND_DIR):
            # تعديل قائمة المجلدات لتخطي المجلدات غير المرغوبة
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES:
                    continue
                
                _, ext = os.path.splitext(file)
                
                # السماح بالملفات التي تطابق الصيغ، أو الملفات الهامة التي لا تملك امتداداً واضحاً (مثل package.json)
                if ext in ALLOWED_EXTENSIONS or file == 'package.json':
                    file_path = os.path.join(root, file)
                    
                    outfile.write(f"\n{'='*70}\n")
                    outfile.write(f"FILE: {file_path}\n")
                    outfile.write(f"{'='*70}\n")
                    
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            outfile.write(f.read())
                            outfile.write("\n")
                    except Exception as e:
                        outfile.write(f"⚠️ Error reading file: {e}\n")

    print(f"✅ Done! All frontend code collected in '{output_file}'")

if __name__ == "__main__":
    collect_frontend_code()