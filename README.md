# 🚀 Rawaj AI Marketing Platform

An intelligent platform for generating and managing marketing campaigns (text, images, video) using Multi-Agent Systems and Generative AI.

**Tech Stack:**
*   **Backend:** Python (FastAPI, AutoGen, SQLAlchemy).
*   **Frontend:** Next.js (React).
*   **Database:** PostgreSQL.
*   **AI:** Google Gemini & Imagen.

---

## 📥 1. Prerequisites

Before starting, ensure you have the following installed on your machine:

### 1. Python (3.10 or later)
*   **Description:** Required for the backend logic.
*   **Download:** [https://www.python.org/downloads/](https://www.python.org/downloads/)
*   ⚠️ **Important:** During installation, check the box **"Add Python to PATH"**.

### 2. Node.js (For Frontend)
*   **Description:** Required to run the Next.js application.
*   **Download:** [https://nodejs.org/en](https://nodejs.org/en)
*   *(LTS version is recommended).*

### 3. PostgreSQL (Database)
*   **Description:** Required to store users and campaign data.
*   **Download:** [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
*   ⚠️ **Important:** Remember the password you set for the `postgres` user during installation. You will need it later.

### 4. Git (Version Control)
*   **Description:** Required to clone the repository.
*   **Download:** [https://git-scm.com/downloads](https://git-scm.com/downloads)

### 5. Microsoft C++ Build Tools (Windows Users Only)
*   **Description:** Essential for installing AI libraries like `chromadb` and `ag2`. Without this, `pip install` will fail.
*   **Download:** [https://visualstudio.microsoft.com/visual-cpp-build-tools/](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
*   **Installation Steps:**
    1.  Download and run the installer.
    2.  Select **"Desktop development with C++"**.
    3.  Click **Install** (approx. 2GB).

---

## 🛠️ 2. Backend Setup

**Directory:** Root folder `/`

### A. Create Virtual Environment
Open your terminal (CMD/PowerShell) in the project root folder and run:

**Windows:**
```bash
python -m venv venv
.\venv\Scripts\activate
```

**Mac/Linux:**
```Bash
python3 -m venv venv
source venv/bin/activate
```
(You should see (venv) appear next to your command line).

### B. Install Dependencies
```Bash
pip install -r requirements.txt
```

### C. Configure Environment Variables (.env)
Create a new file named .env in the root directory (next to requirements.txt). Copy and paste the following content (update with your real credentials):

```
# --- Database Configuration ---
DATABASE_PASSWORD=
DATABASE_USERNAME=postgres # its default
DATABASE_HOST=localhost 
DATABASE_PORT=5432 # its default
DATABASE_NAME=Rawaj

# --- AI Configuration (Google Gemini) ---
# Get API Key from: https://aistudio.google.com/
GOOGLE_API_KEY="AIzaSy_YOUR_GOOGLE_KEY_HERE"

# --- Email Configuration (Gmail SMTP) ---
# Enable 2-Step Verification in Google Account -> Create App Password
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=
MAIL_FROM_NAME="Rawaj Support"
MAIL_PORT=587 # default
MAIL_SERVER=smtp.gmail.com



# --- Security & JWT ---
SECRET_KEY=
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### D. Run the Backend Server
Ensure PostgreSQL is running. Then run:

```
alembic upgrade head 
```

this will create the database,Then run:

```
uvicorn app.main:app --reload
```

#### API URL: http://localhost:8000
#### Swagger Documentation: http://localhost:8000/docs

## 3. Frontend Setup
Directory: /rawaj-frontend

### A. Install Packages
Open a new terminal (keep the backend terminal running) and navigate to the frontend folder:
```
cd rawaj-frontend
npm install
```

### B. Run the Interface
```
npm run dev
```
#### Web App URL: http://localhost:3000


## Troubleshooting

### Error: ModuleNotFoundError
Cause: Virtual environment is not activated.
Fix: Run .\venv\Scripts\activate again.

### Error installing chromadb or ag2
Cause: Missing C++ compilers on Windows.
Fix: Install Microsoft C++ Build Tools (Link in Prerequisites section).
### Database Error: Connection refused
Cause: PostgreSQL service is stopped or password in .env is incorrect.
Fix: Open pgAdmin, verify the server is running, and check your credentials.

### Images not showing in Frontend
Cause: Static file serving path issue.
Fix: Ensure frontend/assets folder exists in the backend root and the image URL starts with http://localhost:8000/assets/....