/**
 * Database Layer
 * 
 * Uses Supabase for all data storage. No localStorage fallback.
 */

import { isSupabaseConfigured } from './supabase'
import * as supabaseDb from './supabase'

// Re-export types
export type {
  UserProject,
  UserResume,
  TailoringHistory,
  SavedJob,
  WorkExperience,
  Education,
  Award,
  Skill,
} from './supabase'

// Helper to check configuration before any database operation
function ensureConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Database not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
    )
  }
}

// ============================================
// PROJECTS
// ============================================
export const projectsDb = {
  getAll: async (userId: string) => {
    ensureConfigured()
    return supabaseDb.projectsDb.getAll(userId)
  },
  create: async (project: Parameters<typeof supabaseDb.projectsDb.create>[0]) => {
    ensureConfigured()
    return supabaseDb.projectsDb.create(project)
  },
  update: async (id: string, updates: Parameters<typeof supabaseDb.projectsDb.update>[1]) => {
    ensureConfigured()
    return supabaseDb.projectsDb.update(id, updates)
  },
  delete: async (id: string) => {
    ensureConfigured()
    return supabaseDb.projectsDb.delete(id)
  },
}

// ============================================
// RESUMES
// ============================================
export const resumesDb = {
  getAll: async (userId: string) => {
    ensureConfigured()
    return supabaseDb.resumesDb.getAll(userId)
  },
  getByType: async (userId: string, resumeType: 'source' | 'tailored') => {
    ensureConfigured()
    return supabaseDb.resumesDb.getByType(userId, resumeType)
  },
  getAllWithJobs: async (userId: string) => {
    ensureConfigured()
    return supabaseDb.resumesDb.getAllWithJobs(userId)
  },
  create: async (resume: Parameters<typeof supabaseDb.resumesDb.create>[0]) => {
    ensureConfigured()
    return supabaseDb.resumesDb.create(resume)
  },
  delete: async (id: string) => {
    ensureConfigured()
    return supabaseDb.resumesDb.delete(id)
  },
}

// ============================================
// TAILORING HISTORY
// ============================================
export const historyDb = {
  getAll: async (userId: string) => {
    ensureConfigured()
    return supabaseDb.historyDb.getAll(userId)
  },
  create: async (history: Parameters<typeof supabaseDb.historyDb.create>[0]) => {
    ensureConfigured()
    return supabaseDb.historyDb.create(history)
  },
}

// ============================================
// SAVED JOBS
// ============================================
export const jobsDb = {
  getAll: async (userId: string) => {
    ensureConfigured()
    return supabaseDb.jobsDb.getAll(userId)
  },
  create: async (job: Parameters<typeof supabaseDb.jobsDb.create>[0]) => {
    ensureConfigured()
    return supabaseDb.jobsDb.create(job)
  },
  updateStatus: async (id: string, status: Parameters<typeof supabaseDb.jobsDb.updateStatus>[1]) => {
    ensureConfigured()
    return supabaseDb.jobsDb.updateStatus(id, status)
  },
  delete: async (id: string) => {
    ensureConfigured()
    return supabaseDb.jobsDb.delete(id)
  },
}

// ============================================
// WORK EXPERIENCE
// ============================================
export const experienceDb = {
  getAll: async (userId: string) => {
    ensureConfigured()
    return supabaseDb.experienceDb.getAll(userId)
  },
  create: async (experience: Parameters<typeof supabaseDb.experienceDb.create>[0]) => {
    ensureConfigured()
    return supabaseDb.experienceDb.create(experience)
  },
  update: async (id: string, updates: Parameters<typeof supabaseDb.experienceDb.update>[1]) => {
    ensureConfigured()
    return supabaseDb.experienceDb.update(id, updates)
  },
  delete: async (id: string) => {
    ensureConfigured()
    return supabaseDb.experienceDb.delete(id)
  },
}

// ============================================
// EDUCATION
// ============================================
export const educationDb = {
  getAll: async (userId: string) => {
    ensureConfigured()
    return supabaseDb.educationDb.getAll(userId)
  },
  create: async (education: Parameters<typeof supabaseDb.educationDb.create>[0]) => {
    ensureConfigured()
    return supabaseDb.educationDb.create(education)
  },
  update: async (id: string, updates: Parameters<typeof supabaseDb.educationDb.update>[1]) => {
    ensureConfigured()
    return supabaseDb.educationDb.update(id, updates)
  },
  delete: async (id: string) => {
    ensureConfigured()
    return supabaseDb.educationDb.delete(id)
  },
}

// ============================================
// AWARDS & CERTIFICATIONS
// ============================================
export const awardsDb = {
  getAll: async (userId: string) => {
    ensureConfigured()
    return supabaseDb.awardsDb.getAll(userId)
  },
  create: async (award: Parameters<typeof supabaseDb.awardsDb.create>[0]) => {
    ensureConfigured()
    return supabaseDb.awardsDb.create(award)
  },
  update: async (id: string, updates: Parameters<typeof supabaseDb.awardsDb.update>[1]) => {
    ensureConfigured()
    return supabaseDb.awardsDb.update(id, updates)
  },
  delete: async (id: string) => {
    ensureConfigured()
    return supabaseDb.awardsDb.delete(id)
  },
}

// ============================================
// SKILLS
// ============================================
export const skillsDb = {
  getAll: async (userId: string) => {
    ensureConfigured()
    return supabaseDb.skillsDb.getAll(userId)
  },
  create: async (skill: Parameters<typeof supabaseDb.skillsDb.create>[0]) => {
    ensureConfigured()
    return supabaseDb.skillsDb.create(skill)
  },
  update: async (id: string, updates: Parameters<typeof supabaseDb.skillsDb.update>[1]) => {
    ensureConfigured()
    return supabaseDb.skillsDb.update(id, updates)
  },
  delete: async (id: string) => {
    ensureConfigured()
    return supabaseDb.skillsDb.delete(id)
  },
}

// ============================================
// RESUME STORAGE
// ============================================
export type { UploadResumeResult } from './supabase'

export const resumeStorage = {
  upload: async (userId: string, file: File, filename?: string) => {
    ensureConfigured()
    return supabaseDb.uploadResumeFile(userId, file, filename)
  },
  getSignedUrl: async (filePath: string, expiresIn?: number) => {
    ensureConfigured()
    return supabaseDb.getResumeFileUrl(filePath, expiresIn)
  },
  delete: async (filePath: string) => {
    ensureConfigured()
    return supabaseDb.deleteResumeFile(filePath)
  },
}

// Export the configuration flag
export { isSupabaseConfigured }
