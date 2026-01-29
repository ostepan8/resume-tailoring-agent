-- Resume Tailor Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES
-- Extended with full contact info for resume generation
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- MIGRATION: Add new columns to existing tables
-- These run safely even on fresh installs (no-op if column exists)
-- Must run BEFORE indexes that reference these columns
-- ============================================

-- user_profiles migrations
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS professional_summary TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;

-- user_projects migrations
ALTER TABLE user_projects ADD COLUMN IF NOT EXISTS bullets TEXT[] DEFAULT '{}';
ALTER TABLE user_projects ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- user_resumes migrations
ALTER TABLE user_resumes ADD COLUMN IF NOT EXISTS resume_type TEXT DEFAULT 'source';
ALTER TABLE user_resumes ADD COLUMN IF NOT EXISTS source_resume_id UUID REFERENCES user_resumes(id) ON DELETE SET NULL;
ALTER TABLE user_resumes ADD COLUMN IF NOT EXISTS target_job_id UUID REFERENCES saved_jobs(id) ON DELETE SET NULL;
ALTER TABLE user_resumes ADD COLUMN IF NOT EXISTS match_score INTEGER;

-- saved_jobs migrations
ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS requirements TEXT[] DEFAULT '{}';
ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- ============================================
-- INDEXES (run after migrations to ensure columns exist)
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailoring_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- Using DROP POLICY IF EXISTS + CREATE to handle re-runs
-- ============================================

-- User Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- User Projects
DROP POLICY IF EXISTS "Users can view own projects" ON user_projects;
CREATE POLICY "Users can view own projects" ON user_projects
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own projects" ON user_projects;
CREATE POLICY "Users can insert own projects" ON user_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own projects" ON user_projects;
CREATE POLICY "Users can update own projects" ON user_projects
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own projects" ON user_projects;
CREATE POLICY "Users can delete own projects" ON user_projects
  FOR DELETE USING (auth.uid() = user_id);

-- User Resumes
DROP POLICY IF EXISTS "Users can view own resumes" ON user_resumes;
CREATE POLICY "Users can view own resumes" ON user_resumes
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own resumes" ON user_resumes;
CREATE POLICY "Users can insert own resumes" ON user_resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own resumes" ON user_resumes;
CREATE POLICY "Users can update own resumes" ON user_resumes
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own resumes" ON user_resumes;
CREATE POLICY "Users can delete own resumes" ON user_resumes
  FOR DELETE USING (auth.uid() = user_id);

-- Tailoring History
DROP POLICY IF EXISTS "Users can view own history" ON tailoring_history;
CREATE POLICY "Users can view own history" ON tailoring_history
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own history" ON tailoring_history;
CREATE POLICY "Users can insert own history" ON tailoring_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saved Jobs
DROP POLICY IF EXISTS "Users can view own saved jobs" ON saved_jobs;
CREATE POLICY "Users can view own saved jobs" ON saved_jobs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own saved jobs" ON saved_jobs;
CREATE POLICY "Users can insert own saved jobs" ON saved_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own saved jobs" ON saved_jobs;
CREATE POLICY "Users can update own saved jobs" ON saved_jobs
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own saved jobs" ON saved_jobs;
CREATE POLICY "Users can delete own saved jobs" ON saved_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Work Experience
DROP POLICY IF EXISTS "Users can view own work experience" ON work_experience;
CREATE POLICY "Users can view own work experience" ON work_experience
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own work experience" ON work_experience;
CREATE POLICY "Users can insert own work experience" ON work_experience
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own work experience" ON work_experience;
CREATE POLICY "Users can update own work experience" ON work_experience
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own work experience" ON work_experience;
CREATE POLICY "Users can delete own work experience" ON work_experience
  FOR DELETE USING (auth.uid() = user_id);

-- Education
DROP POLICY IF EXISTS "Users can view own education" ON education;
CREATE POLICY "Users can view own education" ON education
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own education" ON education;
CREATE POLICY "Users can insert own education" ON education
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own education" ON education;
CREATE POLICY "Users can update own education" ON education
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own education" ON education;
CREATE POLICY "Users can delete own education" ON education
  FOR DELETE USING (auth.uid() = user_id);

-- Awards
DROP POLICY IF EXISTS "Users can view own awards" ON awards;
CREATE POLICY "Users can view own awards" ON awards
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own awards" ON awards;
CREATE POLICY "Users can insert own awards" ON awards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own awards" ON awards;
CREATE POLICY "Users can update own awards" ON awards
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own awards" ON awards;
CREATE POLICY "Users can delete own awards" ON awards
  FOR DELETE USING (auth.uid() = user_id);

-- Skills
DROP POLICY IF EXISTS "Users can view own skills" ON skills;
CREATE POLICY "Users can view own skills" ON skills
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own skills" ON skills;
CREATE POLICY "Users can insert own skills" ON skills
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own skills" ON skills;
CREATE POLICY "Users can update own skills" ON skills
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own skills" ON skills;
CREATE POLICY "Users can delete own skills" ON skills
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE BUCKET: resumes
-- Stores uploaded resume PDF files
-- ============================================
-- NOTE: You must first create the bucket in Supabase Dashboard:
-- 1. Go to Storage > New Bucket
-- 2. Name: "resumes"
-- 3. Public: OFF (private bucket)
-- 4. File size limit: 10MB
-- ============================================

-- Allow users to upload their own resumes
-- Path format: {userId}/{filename}.pdf
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own resumes
DROP POLICY IF EXISTS "Users can read own resumes" ON storage.objects;
CREATE POLICY "Users can read own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own resumes (for overwrites)
DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;
CREATE POLICY "Users can update own resumes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own resumes
DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
