import os

# المجلدات والملفات التي سنتجاهلها
IGNORE_DIRS = {'.git', '__pycache__', 'venv', 'node_modules', '.idea', '.vscode', 'frontend', 'rawaj-frontend'}
IGNORE_FILES = {'collect_code.py', 'package-lock.json', '.DS_Store', 'email.txt', '.env', 'docker-compose-dev.yml', 'Dockerfile', 'docker-compose-prod.yml'}
ALLOWED_EXTENSIONS = {'.py', '.env.example'} # نركز على ملفات البايثون فقط

def collect_project_code(output_file="full_project.txt"):
    with open(output_file, "w", encoding="utf-8") as outfile:
        # المرور على كل الملفات
        for root, dirs, files in os.walk("."):
            # تصفية المجلدات غير المرغوبة
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES:
                    continue
                
                # أخذ الملفات بالصيغ المسموحة فقط
                _, ext = os.path.splitext(file)
                if ext in ALLOWED_EXTENSIONS:
                    file_path = os.path.join(root, file)
                    
                    # كتابة اسم الملف كفاصل
                    outfile.write(f"\n{'='*50}\n")
                    outfile.write(f"FILE: {file_path}\n")
                    outfile.write(f"{'='*50}\n")
                    
                    # كتابة محتوى الملف
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            outfile.write(f.read())
                            outfile.write("\n")
                    except Exception as e:
                        outfile.write(f"Error reading file: {e}\n")

    print(f"✅ Done! All code collected in '{output_file}'")

if __name__ == "__main__":
    collect_project_code()