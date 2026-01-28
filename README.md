# 🎓 ExamNexus - AI-Powered SaaS Examination Platform

**ExamNexus** is a comprehensive, multi-tenant examination platform designed to modernize educational assessments. Built with a robust **Angular** frontend and **Node.js** backend, it features **Role-Based Access Control (RBAC)**, **AI-driven content generation**, and a **Secure Proctoring Suite**.

---

## 🚀 Key Features

### 👑 Super Admin (Platform Owner)
- **Tenant Management:** Onboard new schools with unique subdomains (e.g., `school.examnexus.com`).
- **Data Isolation:** Strict separation of data between different school tenants.

### 🏛️ School Admin (Principal)
- **Dashboard:** Real-time stats on teachers, students, and exams.
- **User Management:** Bulk import students/teachers via CSV or add manually.
- **Reporting Studio:** Generate and download PDF reports of teacher performance and student leaderboards.
- **School Settings:** Manage branding (Logos) and school details.

### 👨‍🏫 Teacher Portal
- **AI Exam Generator:** Upload PDFs/Images or paste text to generate quizzes instantly using OpenAI.
- **🏦 Question Bank:** A central repository to store, tag, and reuse questions. Bulk import via AI.
- **Question Editor:** Review and modify AI-generated or manual questions.
- **Smart Scheduling:** **Auto-Publish** feature pushes exams live automatically at a set time.
- **Exam Management:** Assign exams to specific students or the entire class.

### 🎓 Student Portal
- **Secure Proctoring Suite:**
  - 📸 **Hardware Lock:** Mandatory Camera & Mic access.
  - 🖥️ **Fullscreen Lock:** Exam content hides if fullscreen is exited.
  - 🚫 **Anti-Cheat:** Detects tab switching. **3-Strike Rule** auto-submits the exam on violations.
- **Deterministic Randomization:** Every student sees questions in a unique random order that persists even after refreshing (prevents "peeking").
- **Real-time Timer:** Auto-submits when time runs out.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | Angular 16+, Tailwind CSS, Chart.js, jsPDF |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL (Relational Data & JSONB) |
| **AI Engine** | OpenAI API (GPT-4o/3.5) |
| **Automation** | Node-Cron (Scheduled Tasks) |
| **Authentication** | JWT (JSON Web Tokens) & Bcrypt |

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running
- Angular CLI (`npm install -g @angular/cli`)

### 2. Clone Repository
```bash
git clone [https://github.com/sikunaniket1234/exam-nexus.git](https://github.com/sikunaniket1234/exam-nexus.git)
cd exam-nexus
