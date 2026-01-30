import { createBrowserClient } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder')
)

// Singleton pattern that works with Next.js HMR
// Store the client on globalThis to persist across module reloads
declare global {
  // eslint-disable-next-line no-var
  var supabaseClient: SupabaseClient | undefined
}

function getSupabaseClient(): SupabaseClient {
  // Return existing client if it exists
  if (globalThis.supabaseClient) {
    return globalThis.supabaseClient
  }

  // Create new client using @supabase/ssr for proper cookie handling
  if (supabaseUrl && supabaseAnonKey) {
    globalThis.supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        // Use default storage key to ensure consistency
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Use implicit flow for email confirmations (tokens in URL hash)
        flowType: 'implicit',
      },
    })
  } else {
    console.warn('⚠️ Supabase credentials missing. Using placeholder client.')
    globalThis.supabaseClient = createClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          persistSession: false,
        },
      }
    )
  }

  return globalThis.supabaseClient
}

export const supabase = getSupabaseClient()

// ============================================
// DATABASE TYPES
// ============================================

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  location: string | null
  linkedin_url: string | null
  github_url: string | null
  website_url: string | null
  professional_summary: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface UserProject {
  id: string
  user_id: string
  name: string
  description: string | null
  skills: string[]
  start_date: string | null
  end_date: string | null
  url: string | null
  created_at: string
  updated_at: string
}

export interface UserResume {
  id: string
  user_id: string
  name: string
  resume_type: 'source' | 'tailored'
  content: string
  file_url: string | null
  is_primary: boolean
  match_score: number | null
  target_job_id: string | null
  source_resume_id: string | null
  created_at: string
  updated_at: string
}

export interface TailoringHistory {
  id: string
  user_id: string
  resume_id: string | null
  job_title: string
  company_name: string | null
  job_description: string
  original_resume: string
  tailored_resume: string
  match_score: number | null
  created_at: string
}

export interface SavedJob {
  id: string
  user_id: string
  title: string
  company: string | null
  description: string
  url: string | null
  status: 'saved' | 'applied' | 'interviewing' | 'rejected' | 'offered'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WorkExperience {
  id: string
  user_id: string
  company: string
  position: string
  location: string | null
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance'
  description: string | null
  achievements: string[]
  skills: string[]
  start_date: string
  end_date: string | null
  is_current: boolean
  created_at: string
  updated_at: string
}

export interface Education {
  id: string
  user_id: string
  institution: string
  degree: string
  field_of_study: string | null
  location: string | null
  gpa: string | null
  description: string | null
  achievements: string[]
  start_date: string
  end_date: string | null
  is_current: boolean
  created_at: string
  updated_at: string
}

export interface Award {
  id: string
  user_id: string
  title: string
  issuer: string
  type: 'award' | 'certification' | 'honor' | 'publication' | 'patent'
  description: string | null
  date_received: string
  expiry_date: string | null
  url: string | null
  credential_id: string | null
  created_at: string
  updated_at: string
}

export interface Skill {
  id: string
  user_id: string
  name: string
  category: 'technical' | 'soft' | 'language' | 'tool' | 'framework' | 'other'
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  years_of_experience: number | null
  created_at: string
  updated_at: string
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  return data
}

export async function upsertUserProfile(
  profile: Partial<UserProfile> & { id: string }
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      ...profile,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error upserting user profile:', error)
    return null
  }
  return data
}

// ============================================
// PROJECT FUNCTIONS
// ============================================

export const projectsDb = {
  getAll: async (userId: string): Promise<UserProject[]> => {
    const { data, error } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return []
    }
    return data || []
  },

  create: async (
    project: Omit<UserProject, 'id' | 'created_at' | 'updated_at'>
  ): Promise<UserProject | null> => {
    const { data, error } = await supabase
      .from('user_projects')
      .insert(project)
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return null
    }
    return data
  },

  update: async (
    id: string, 
    updates: Partial<UserProject>
  ): Promise<UserProject | null> => {
    const { data, error } = await supabase
      .from('user_projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating project:', error)
      return null
    }
    return data
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('user_projects')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting project:', error)
      return false
    }
    return true
  },
}

// ============================================
// RESUME FUNCTIONS
// ============================================

export const resumesDb = {
  getAll: async (userId: string): Promise<UserResume[]> => {
    const { data, error } = await supabase
      .from('user_resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching resumes:', error)
      return []
    }
    return data || []
  },

  create: async (
    resume: Omit<UserResume, 'id' | 'created_at' | 'updated_at'>
  ): Promise<UserResume | null> => {
    const { data, error } = await supabase
      .from('user_resumes')
      .insert(resume)
      .select()
      .single()

    if (error) {
      console.error('Error creating resume:', error)
      return null
    }
    return data
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('user_resumes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting resume:', error)
      return false
    }
    return true
  },

  getByType: async (userId: string, resumeType: 'source' | 'tailored'): Promise<UserResume[]> => {
    const { data, error } = await supabase
      .from('user_resumes')
      .select('*')
      .eq('user_id', userId)
      .eq('resume_type', resumeType)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching resumes by type:', error)
      return []
    }
    return data || []
  },

  getAllWithJobs: async (userId: string): Promise<(UserResume & { saved_job?: SavedJob })[]> => {
    const { data, error } = await supabase
      .from('user_resumes')
      .select(`
        *,
        saved_job:saved_jobs(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching resumes with jobs:', error)
      return []
    }
    return data || []
  },
}

// ============================================
// TAILORING HISTORY FUNCTIONS
// ============================================

export const historyDb = {
  getAll: async (userId: string): Promise<TailoringHistory[]> => {
    const { data, error } = await supabase
      .from('tailoring_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tailoring history:', error)
      return []
    }
    return data || []
  },

  create: async (
    history: Omit<TailoringHistory, 'id' | 'created_at'>
  ): Promise<TailoringHistory | null> => {
    const { data, error } = await supabase
      .from('tailoring_history')
      .insert(history)
      .select()
      .single()

    if (error) {
      console.error('Error saving tailoring result:', error)
      return null
    }
    return data
  },
}

// ============================================
// SAVED JOBS FUNCTIONS
// ============================================

export const jobsDb = {
  getAll: async (userId: string): Promise<SavedJob[]> => {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved jobs:', error)
      return []
    }
    return data || []
  },

  create: async (
    job: Omit<SavedJob, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SavedJob | null> => {
    const { data, error } = await supabase
      .from('saved_jobs')
      .insert(job)
      .select()
      .single()

    if (error) {
      console.error('Error saving job:', error)
      return null
    }
    return data
  },

  updateStatus: async (id: string, status: SavedJob['status']): Promise<boolean> => {
    const { error } = await supabase
      .from('saved_jobs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating job status:', error)
      return false
    }
    return true
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting job:', error)
      return false
    }
    return true
  },
}

// ============================================
// WORK EXPERIENCE FUNCTIONS
// ============================================

export const experienceDb = {
  getAll: async (userId: string): Promise<WorkExperience[]> => {
    const { data, error } = await supabase
      .from('work_experience')
      .select('*')
      .eq('user_id', userId)
      .order('is_current', { ascending: false })
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching work experience:', error)
      return []
    }
    return data || []
  },

  create: async (
    experience: Omit<WorkExperience, 'id' | 'created_at' | 'updated_at'>
  ): Promise<WorkExperience | null> => {
    const { data, error } = await supabase
      .from('work_experience')
      .insert(experience)
      .select()
      .single()

    if (error) {
      console.error('Error creating work experience:', error)
      return null
    }
    return data
  },

  update: async (
    id: string, 
    updates: Partial<WorkExperience>
  ): Promise<WorkExperience | null> => {
    const { data, error } = await supabase
      .from('work_experience')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating work experience:', error)
      return null
    }
    return data
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('work_experience')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting work experience:', error)
      return false
    }
    return true
  },
}

// ============================================
// EDUCATION FUNCTIONS
// ============================================

export const educationDb = {
  getAll: async (userId: string): Promise<Education[]> => {
    const { data, error } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', userId)
      .order('is_current', { ascending: false })
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching education:', error)
      return []
    }
    return data || []
  },

  create: async (
    education: Omit<Education, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Education | null> => {
    const { data, error } = await supabase
      .from('education')
      .insert(education)
      .select()
      .single()

    if (error) {
      console.error('Error creating education:', error)
      return null
    }
    return data
  },

  update: async (
    id: string, 
    updates: Partial<Education>
  ): Promise<Education | null> => {
    const { data, error } = await supabase
      .from('education')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating education:', error)
      return null
    }
    return data
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('education')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting education:', error)
      return false
    }
    return true
  },
}

// ============================================
// AWARDS & CERTIFICATIONS FUNCTIONS
// ============================================

export const awardsDb = {
  getAll: async (userId: string): Promise<Award[]> => {
    const { data, error } = await supabase
      .from('awards')
      .select('*')
      .eq('user_id', userId)
      .order('date_received', { ascending: false })

    if (error) {
      console.error('Error fetching awards:', error)
      return []
    }
    return data || []
  },

  create: async (
    award: Omit<Award, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Award | null> => {
    const { data, error } = await supabase
      .from('awards')
      .insert(award)
      .select()
      .single()

    if (error) {
      console.error('Error creating award:', error)
      return null
    }
    return data
  },

  update: async (
    id: string, 
    updates: Partial<Award>
  ): Promise<Award | null> => {
    const { data, error } = await supabase
      .from('awards')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating award:', error)
      return null
    }
    return data
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('awards')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting award:', error)
      return false
    }
    return true
  },
}

// ============================================
// SKILLS FUNCTIONS
// ============================================

export const skillsDb = {
  getAll: async (userId: string): Promise<Skill[]> => {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', userId)
      .order('category', { ascending: true })
      .order('proficiency', { ascending: false })

    if (error) {
      console.error('Error fetching skills:', error)
      return []
    }
    return data || []
  },

  create: async (
    skill: Omit<Skill, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Skill | null> => {
    const { data, error } = await supabase
      .from('skills')
      .insert(skill)
      .select()
      .single()

    if (error) {
      console.error('Error creating skill:', error)
      return null
    }
    return data
  },

  update: async (
    id: string, 
    updates: Partial<Skill>
  ): Promise<Skill | null> => {
    const { data, error } = await supabase
      .from('skills')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating skill:', error)
      return null
    }
    return data
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting skill:', error)
      return false
    }
    return true
  },
}

// ============================================
// RESUME STORAGE FUNCTIONS
// Handles uploading/downloading resume PDF files to Supabase Storage
// ============================================

const RESUME_BUCKET = 'resumes'

export interface UploadResumeResult {
  success: boolean
  fileUrl?: string
  error?: string
}

/**
 * Upload a resume PDF file to Supabase Storage
 * @param userId - The user's ID (used as folder path)
 * @param file - The File object to upload
 * @param filename - Optional custom filename (defaults to original file name)
 * @returns Upload result with file URL or error
 */
export async function uploadResumeFile(
  userId: string,
  file: File,
  filename?: string
): Promise<UploadResumeResult> {
  try {
    // Generate a unique filename with timestamp to avoid conflicts
    const timestamp = Date.now()
    const safeName = (filename || file.name)
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.pdf$/i, '')
    const storagePath = `${userId}/${safeName}_${timestamp}.pdf`

    // Upload the file
    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(storagePath, file, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists
      })

    if (error) {
      console.error('[uploadResumeFile] Upload error:', { message: error.message })
      return { success: false, error: error.message }
    }

    // Get the public URL (even for private buckets, this returns the path)
    // We store this URL but use signed URLs for actual download
    const { data: urlData } = supabase.storage
      .from(RESUME_BUCKET)
      .getPublicUrl(data.path)

    return {
      success: true,
      fileUrl: urlData.publicUrl,
    }
  } catch (err) {
    console.error('[uploadResumeFile] Unexpected error:', err instanceof Error ? err.message : 'Unknown error')
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get a signed URL for downloading a resume file (for private buckets)
 * @param filePath - The full storage path of the file
 * @param expiresIn - URL expiration time in seconds (default 1 hour)
 * @returns Signed URL or null if error
 */
export async function getResumeFileUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Extract the storage path from various URL formats
    let storagePath = filePath
    
    // Handle full public URL: https://xxx.supabase.co/storage/v1/object/public/resumes/user-id/file.pdf
    if (filePath.includes('/storage/v1/object/public/resumes/')) {
      storagePath = filePath.split('/storage/v1/object/public/resumes/')[1] || filePath
    }
    // Handle signed URL format: https://xxx.supabase.co/storage/v1/object/sign/resumes/user-id/file.pdf
    else if (filePath.includes('/storage/v1/object/sign/resumes/')) {
      storagePath = filePath.split('/storage/v1/object/sign/resumes/')[1]?.split('?')[0] || filePath
    }
    // Handle just the bucket path: resumes/user-id/file.pdf
    else if (filePath.startsWith('resumes/')) {
      storagePath = filePath.substring('resumes/'.length)
    }

    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      return null
    }

    return data.signedUrl
  } catch (err) {
    console.error('[getResumeFileUrl] Unexpected error:', err instanceof Error ? err.message : 'Unknown error')
    return null
  }
}

/**
 * Delete a resume file from storage
 * @param filePath - The storage path of the file to delete
 * @returns True if deleted successfully
 */
export async function deleteResumeFile(filePath: string): Promise<boolean> {
  try {
    // Extract the path after the bucket URL if a full URL was passed
    let storagePath = filePath
    if (filePath.includes('/storage/v1/object/public/')) {
      storagePath = filePath.split('/storage/v1/object/public/resumes/')[1] || filePath
    }

    const { error } = await supabase.storage
      .from(RESUME_BUCKET)
      .remove([storagePath])

    if (error) {
      console.error('Error deleting resume file:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Unexpected error deleting resume:', err)
    return false
  }
}

// ============================================
// LEGACY FUNCTION EXPORTS (for backward compatibility)
// ============================================

export const getUserProjects = projectsDb.getAll
export const createProject = projectsDb.create
export const updateProject = projectsDb.update
export const deleteProject = projectsDb.delete

export const getUserResumes = resumesDb.getAll
export const createResume = resumesDb.create
export const deleteResume = resumesDb.delete

export const getTailoringHistory = historyDb.getAll
export const saveTailoringResult = historyDb.create

export const getSavedJobs = jobsDb.getAll
export const saveJob = jobsDb.create
export const updateJobStatus = jobsDb.updateStatus
