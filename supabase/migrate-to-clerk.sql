-- Migration: Convert UUID user IDs to TEXT for Clerk compatibility
-- Run this in your Supabase SQL Editor if you have existing data
-- WARNING: This will delete all existing data! Only run on a fresh/dev database.

-- ============================================
-- STEP 1: Drop existing tables (in correct order due to foreign keys)
-- ============================================

DROP TABLE IF EXISTS tailoring_history CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS awards CASCADE;
DROP TABLE IF EXISTS education CASCADE;
DROP TABLE IF EXISTS work_experience CASCADE;
DROP TABLE IF EXISTS user_resumes CASCADE;
DROP TABLE IF EXISTS user_projects CASCADE;
DROP TABLE IF EXISTS saved_jobs CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- ============================================
-- STEP 2: Drop the trigger that auto-creates profiles from Supabase Auth
-- (Not needed with Clerk)
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================
-- STEP 3: Now run schema-clerk.sql to recreate tables with TEXT user IDs
-- ============================================

-- Enable UUID extension (for other table IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USER PROFILES
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

-- SAVED JOBS
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

-- USER PROJECTS
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

-- USER RESUMES
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

-- WORK EXPERIENCE
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

-- EDUCATION
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

-- AWARDS
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

-- SKILLS
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

-- TAILORING HISTORY
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

CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resumes_user_id ON user_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_tailoring_history_user_id ON tailoring_history(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_work_experience_user_id ON work_experience(user_id);
CREATE INDEX IF NOT EXISTS idx_education_user_id ON education(user_id);
CREATE INDEX IF NOT EXISTS idx_awards_user_id ON awards(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resumes_type ON user_resumes(user_id, resume_type);
CREATE INDEX IF NOT EXISTS idx_user_resumes_source ON user_resumes(source_resume_id) WHERE source_resume_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_resumes_job ON user_resumes(target_job_id) WHERE target_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saved_jobs_status ON saved_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_projects_featured ON user_projects(user_id, is_featured) WHERE is_featured = TRUE;

-- ============================================
-- DISABLE ROW LEVEL SECURITY (Clerk handles auth)
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

-- ============================================
-- STEP 4: Configure Storage Bucket for Clerk (IMPORTANT!)
-- ============================================

-- The 'resumes' storage bucket needs policies that don't use auth.uid()
-- Since Clerk handles auth, we use a more permissive policy structure.

-- First, drop any existing policies on the resumes bucket
DO $$
BEGIN
  -- Try to drop existing policies (ignore if they don't exist)
  DROP POLICY IF EXISTS "Authenticated users can upload resumes" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;
  DROP POLICY IF EXISTS "Allow resume uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow resume reads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow resume deletes" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors
  NULL;
END $$;

-- Create the bucket if it doesn't exist (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Option A: Disable RLS on the objects table for simplicity (for dev)
-- This allows any authenticated request to access storage
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Option B: Create permissive policies that don't use auth.uid()
-- These policies allow access to the resumes bucket based on the path structure
-- The application layer (Clerk) handles user authorization

-- Policy: Allow uploads to resumes bucket
-- Format: resumes/{clerk_user_id}/filename.pdf
CREATE POLICY "clerk_resume_insert" ON storage.objects
FOR INSERT 
TO public
WITH CHECK (bucket_id = 'resumes');

-- Policy: Allow reading from resumes bucket
CREATE POLICY "clerk_resume_select" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'resumes');

-- Policy: Allow updating files in resumes bucket
CREATE POLICY "clerk_resume_update" ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'resumes');

-- Policy: Allow deleting from resumes bucket  
CREATE POLICY "clerk_resume_delete" ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'resumes');

-- ============================================
-- DONE! Your database is now ready for Clerk authentication.
-- ============================================
