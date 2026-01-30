-- Resume Tailor Database Schema for Clerk Authentication
-- Run this in your Supabase SQL Editor
-- This version uses TEXT for user IDs to support Clerk's string-based IDs

-- Enable UUID extension (for other table IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES
-- Extended with full contact info for resume generation
-- NOTE: id is TEXT to support Clerk user IDs (e.g., user_38wuQh2KuDcLSXs0A0ixzH0ztuu)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  website_url TEXT,
  professional_summary TEXT,
  avatar_url TEXT,
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SAVED JOBS (must be created before user_resumes due to FK)
-- Jobs the user is interested in / has applied to
-- ============================================
CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT,
  description TEXT NOT NULL,
  url TEXT,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'interviewing', 'rejected', 'offered')),
  notes TEXT,
  requirements TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER PROJECTS
-- Portfolio projects that can be included in resumes
-- ============================================
CREATE TABLE IF NOT EXISTS user_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  bullets TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER RESUMES
-- Stores both source (uploaded) and tailored (generated) resumes
-- ============================================
CREATE TABLE IF NOT EXISTS user_resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  resume_type TEXT NOT NULL DEFAULT 'source' CHECK (resume_type IN ('source', 'tailored')),
  source_resume_id UUID REFERENCES user_resumes(id) ON DELETE SET NULL,
  target_job_id UUID REFERENCES saved_jobs(id) ON DELETE SET NULL,
  content JSONB NOT NULL,
  file_url TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  match_score INTEGER CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WORK EXPERIENCE
-- User's employment history (source of truth for resume generation)
-- ============================================
CREATE TABLE IF NOT EXISTS work_experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT,
  employment_type TEXT DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship', 'freelance')),
  description TEXT,
  achievements TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EDUCATION
-- User's educational background
-- ============================================
CREATE TABLE IF NOT EXISTS education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT,
  location TEXT,
  gpa TEXT,
  description TEXT,
  achievements TEXT[] DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AWARDS & CERTIFICATIONS
-- Achievements, certifications, publications, patents
-- ============================================
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  type TEXT DEFAULT 'award' CHECK (type IN ('award', 'certification', 'honor', 'publication', 'patent')),
  description TEXT,
  date_received DATE NOT NULL,
  expiry_date DATE,
  url TEXT,
  credential_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SKILLS
-- User's skills with categorization and proficiency
-- ============================================
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN ('technical', 'soft', 'language', 'tool', 'framework', 'other')),
  proficiency TEXT DEFAULT 'intermediate' CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_of_experience INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TAILORING HISTORY (Legacy - kept for backwards compatibility)
-- ============================================
CREATE TABLE IF NOT EXISTS tailoring_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  resume_id UUID REFERENCES user_resumes(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  company_name TEXT,
  job_description TEXT NOT NULL,
  original_resume JSONB NOT NULL,
  tailored_resume JSONB NOT NULL,
  match_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- User lookups
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resumes_user_id ON user_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_tailoring_history_user_id ON tailoring_history(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_work_experience_user_id ON work_experience(user_id);
CREATE INDEX IF NOT EXISTS idx_education_user_id ON education(user_id);
CREATE INDEX IF NOT EXISTS idx_awards_user_id ON awards(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);

-- Resume type filtering
CREATE INDEX IF NOT EXISTS idx_user_resumes_type ON user_resumes(user_id, resume_type);

-- Tailored resume lookups
CREATE INDEX IF NOT EXISTS idx_user_resumes_source ON user_resumes(source_resume_id) 
  WHERE source_resume_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_resumes_job ON user_resumes(target_job_id) 
  WHERE target_job_id IS NOT NULL;

-- Job status filtering
CREATE INDEX IF NOT EXISTS idx_saved_jobs_status ON saved_jobs(user_id, status);

-- Skills categorization
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(user_id, category);

-- Featured projects
CREATE INDEX IF NOT EXISTS idx_user_projects_featured ON user_projects(user_id, is_featured) 
  WHERE is_featured = TRUE;

-- ============================================
-- DISABLE ROW LEVEL SECURITY
-- Since Clerk handles authentication (not Supabase Auth),
-- RLS policies based on auth.uid() won't work.
-- Security is enforced at the application layer via Clerk.
-- ============================================

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_resumes DISABLE ROW LEVEL SECURITY;
ALTER TABLE tailoring_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_experience DISABLE ROW LEVEL SECURITY;
ALTER TABLE education DISABLE ROW LEVEL SECURITY;
ALTER TABLE awards DISABLE ROW LEVEL SECURITY;
ALTER TABLE skills DISABLE ROW LEVEL SECURITY;
