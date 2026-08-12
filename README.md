# SkillForge AI

AI-powered personalized career roadmap platform. Upload your resume, get an evidence-linked skill gap analysis, and receive a week-by-week learning roadmap with quizzes, resources, and interview preparation.

## Architecture

```
skillforge-ai/
├── backend/          FastAPI + SQLAlchemy + Gemini AI
└── frontend/         React + Vite + TypeScript + Tailwind CSS
```

## Quick Start

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase project (free tier works)
- A Gemini API key (free at ai.google.dev)

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Copy and fill in your credentials
cp .env.example .env
# Edit .env with your Supabase URL, keys, and Gemini API key

# Run the migrations in your Supabase SQL editor:
# Copy contents of migrations/create_tables.sql and run it

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Copy and fill in your Supabase credentials
cp .env.example .env
# Edit .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm run dev
# Opens at http://localhost:5173
```

## Environment Variables

### Backend `.env`
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DATABASE_URL` | PostgreSQL connection string (asyncpg) |
| `AI_PROVIDER` | `gemini` or `openai` |
| `GEMINI_API_KEY` | Google Gemini API key |
| `MAX_RESUME_SIZE_MB` | Max upload size (default: 10) |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### Frontend `.env`
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Switching AI Providers

Change `AI_PROVIDER=openai` in backend `.env` and set `OPENAI_API_KEY`. No code changes needed — the AI abstraction layer handles the rest.

## User Flow

1. Register / Login (Supabase Auth)
2. Onboarding: target role + timeline + weekly hours
3. Upload PDF resume → background processing pipeline
4. Review extracted skill profile
5. Confirm → AI gap analysis + readiness score
6. Generate personalized week-by-week roadmap
7. Work through weeks: resources, tasks, mini-project, quiz
8. AI quiz scoring adapts roadmap priorities
9. Interview prep: role-specific + project-based questions with AI feedback
10. Dashboard tracks all progress with charts

## API Routes

```
POST /api/auth/register
POST /api/auth/login

GET  /api/profile
PUT  /api/career-preferences

POST /api/resumes/upload
GET  /api/resumes/{id}
GET  /api/resumes/{id}/analysis

GET  /api/skills
GET  /api/projects

POST /api/gap-analysis/generate
GET  /api/gap-analysis

POST /api/roadmaps/generate
GET  /api/roadmaps/current
GET  /api/roadmaps/{id}/weeks
GET  /api/roadmaps/weeks/{week_id}
PATCH /api/roadmaps/tasks/{task_id}

POST /api/weeks/{week_id}/quiz
POST /api/quizzes/{quiz_id}/submit

GET  /api/interview/questions
POST /api/interview/questions/{id}/answer

GET  /api/dashboard
GET  /health
```
=======
# SkillForge-AI
