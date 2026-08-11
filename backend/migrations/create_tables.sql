-- SkillForge AI — Database schema
-- Run this in your Supabase SQL editor or against your PostgreSQL instance

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS career_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  target_role TEXT NOT NULL,
  timeline_months INTEGER NOT NULL,
  weekly_hours INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT,
  extracted_text TEXT,
  markdown_content TEXT,
  processing_status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resume_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_id UUID NOT NULL,
  user_id UUID NOT NULL,
  summary TEXT,
  raw_ai_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  resume_analysis_id UUID,
  name TEXT NOT NULL,
  category TEXT,
  proficiency TEXT,
  confidence FLOAT,
  evidence TEXT,
  evidence_source TEXT,
  evidence_strength TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  resume_analysis_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  technologies JSONB,
  role TEXT,
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  resume_analysis_id UUID,
  company TEXT,
  role TEXT,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  technologies JSONB
);

CREATE TABLE IF NOT EXISTS education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  resume_analysis_id UUID,
  institution TEXT,
  degree TEXT,
  field TEXT,
  start_date TEXT,
  end_date TEXT
);

CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  resume_analysis_id UUID,
  name TEXT,
  issuer TEXT,
  date TEXT
);

CREATE TABLE IF NOT EXISTS gap_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  resume_id UUID,
  target_role TEXT NOT NULL,
  readiness_score FLOAT,
  strengths JSONB,
  gaps JSONB,
  missing_skills JSONB,
  weak_evidence_skills JSONB,
  recommendations JSONB,
  score_breakdown JSONB,
  raw_ai_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  target_role TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  weekly_hours INTEGER NOT NULL,
  gap_analysis_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roadmap_weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roadmap_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  phase TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  skills JSONB,
  estimated_hours INTEGER,
  status TEXT DEFAULT 'pending',
  completion_percentage FLOAT DEFAULT 0.0,
  checklist JSONB,
  completion_criteria JSONB
);

CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roadmap_week_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL,
  estimated_hours FLOAT,
  completed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS learning_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roadmap_week_id UUID NOT NULL,
  title TEXT NOT NULL,
  provider TEXT,
  url TEXT,
  resource_type TEXT,
  difficulty TEXT,
  estimated_hours FLOAT,
  reason TEXT,
  ai_recommended BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  roadmap_week_id UUID NOT NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  passing_score INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL,
  user_id UUID NOT NULL,
  answers JSONB,
  score FLOAT,
  passed BOOLEAN,
  feedback JSONB,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  target_role TEXT NOT NULL,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  difficulty TEXT,
  answer_guidance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  question_id UUID NOT NULL,
  answer TEXT,
  ai_feedback JSONB,
  score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_user ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_gap_user ON gap_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_weeks_roadmap ON roadmap_weeks(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_week ON roadmap_tasks(roadmap_week_id);
CREATE INDEX IF NOT EXISTS idx_quiz_user ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_user ON interview_questions(user_id);
