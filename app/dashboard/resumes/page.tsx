'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth-context'
import { createLogger } from '@/lib/logger'
import {
    resumesDb,
    resumeStorage,
    experienceDb,
    educationDb,
    skillsDb,
    projectsDb,
    type UserResume,
    type WorkExperience,
    type Education,
    type Skill,
    type UserProject,
} from '../../../lib/database'
import { SkeletonResumeCard } from '../../components/Skeleton'
import styles from './resumes.module.css'

// Only mock mode if explicitly set - in development we still use real Supabase if configured
const IS_MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

const log = createLogger('ResumesPage')

// Load mock resumes from localStorage
function loadMockResumes(): ResumeWithJob[] {
    if (typeof window === 'undefined') return []
    try {
        const savedResumes = JSON.parse(localStorage.getItem('mockSavedResumes') || '[]')
        return savedResumes.map((resume: {
            id: string
            name: string
            createdAt: string
            matchScore?: number
            fileUrl?: string
            targetJob?: {
                id: string
                title: string
                company: string
                url?: string
            }
            content?: unknown
        }) => ({
            id: resume.id,
            user_id: 'mock-user',
            name: resume.name,
            content: JSON.stringify(resume.content || {}),
            file_url: resume.fileUrl || null,
            is_primary: false,
            resume_type: 'tailored' as const,
            match_score: resume.matchScore || null,
            target_job_id: resume.targetJob?.id || null,
            created_at: resume.createdAt,
            updated_at: resume.createdAt,
            saved_job: resume.targetJob ? {
                id: resume.targetJob.id,
                title: resume.targetJob.title,
                company: resume.targetJob.company,
                url: resume.targetJob.url || null,
            } : undefined,
        }))
    } catch (e) {
        console.warn('Failed to load mock resumes:', e)
        return []
    }
}

type UploadStatus = 'idle' | 'extracting' | 'parsing' | 'uploading' | 'review' | 'syncing' | 'saving' | 'done' | 'error';

// Max file size: 10MB (matches Supabase storage bucket limit)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_SIZE_MB = 10;
type ResumeFilter = 'all' | 'source' | 'tailored';

// Track if initial data has been fetched to prevent re-fetching on re-renders
// Note: Moved outside component since useRef doesn't work well with dynamic dependencies

// Extended resume type to include saved job info
interface ResumeWithJob extends UserResume {
    saved_job?: {
        id: string
        title: string
        company: string | null
        url: string | null
    }
}

// ============================================
// TYPES FOR EXTRACTED DATA
// ============================================

interface ExtractedContactInfo {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
}

interface ExtractedExperience {
    id: string;
    company: string;
    position: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets?: string[];
    accepted: boolean;
    isDuplicate?: boolean; // Already exists in profile
}

interface ExtractedEducation {
    id: string;
    institution: string;
    degree: string;
    field?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    highlights?: string[];
    accepted: boolean;
    isDuplicate?: boolean;
}

interface ExtractedSkill {
    id: string;
    name: string;
    category?: string;
    accepted: boolean;
    isDuplicate?: boolean;
}

interface ExtractedProject {
    id: string;
    name: string;
    description?: string;
    technologies?: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
    bullets?: string[];
    accepted: boolean;
    isDuplicate?: boolean;
}

interface ExtractedData {
    contactInfo: ExtractedContactInfo;
    experience: ExtractedExperience[];
    education: ExtractedEducation[];
    skills: ExtractedSkill[];
    projects: ExtractedProject[];
    rawParsed: Record<string, unknown>;
    fileName: string;
    fileUrl: string | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ResumesPage() {
    const { user } = useAuth()
    const [resumes, setResumes] = useState<ResumeWithJob[]>([])
    const [loading, setLoading] = useState(true)
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
    const [uploadMessage, setUploadMessage] = useState('')
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
    const [filter, setFilter] = useState<ResumeFilter>('all')
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    // Track if initial data has been fetched to prevent re-fetching on re-renders
    const hasFetchedRef = useRef(false)

    log('Component render - status:', uploadStatus, 'user:', user?.id)

    const loadResumes = useCallback(async (userId: string) => {
        log('loadResumes: Loading for user', userId)
        setLoading(true)
        try {
            // In mock mode, load from localStorage
            if (IS_MOCK_MODE) {
                const mockResumes = loadMockResumes()
                log('loadResumes: [MOCK MODE] Got', mockResumes.length, 'resumes from localStorage')
                setResumes(mockResumes)
            } else {
                const data = await resumesDb.getAllWithJobs(userId)
                log('loadResumes: Got', data.length, 'resumes')
                setResumes(data as ResumeWithJob[])
            }
        } catch (err) {
            log('loadResumes: Error', err)
            // Fallback to mock resumes if database fails
            if (IS_MOCK_MODE) {
                const mockResumes = loadMockResumes()
                setResumes(mockResumes)
            }
        }
        setLoading(false)
    }, [])

    // Fetch data only once when user becomes available (or in mock mode)
    useEffect(() => {
        if (!hasFetchedRef.current) {
            if (user?.id) {
                hasFetchedRef.current = true
                loadResumes(user.id)
            } else if (IS_MOCK_MODE) {
                hasFetchedRef.current = true
                loadResumes('mock-user')
            }
        }
    }, [user?.id, loadResumes])

    // ============================================
    // PARSING AND EXTRACTION
    // ============================================

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        log('handleFileUpload: File selected', file?.name, file?.type, file?.size)
        
        if (!file) {
            log('handleFileUpload: No file selected')
            return
        }
        if (!user) {
            log('handleFileUpload: No user')
            return
        }

        // Client-side file size validation
        if (file.size > MAX_FILE_SIZE_BYTES) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
            log('handleFileUpload: File too large', fileSizeMB, 'MB')
            setUploadStatus('error')
            setUploadMessage(`File is too large (${fileSizeMB}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`)
            // Reset the input so the same file can be selected again after fixing
            e.target.value = ''
            return
        }

        let fileUrl: string | null = null

        try {
            // Phase 1: Extracting text from PDF
            log('Phase 1: Extracting text from PDF')
            setUploadStatus('extracting')
            setUploadMessage('Reading your resume...')

            const formData = new FormData()
            formData.append('file', file)

            log('Calling /api/resume/parse')
            // Clerk handles auth automatically via cookies/middleware
            const response = await fetch('/api/resume/parse', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            })
            log('Parse response status:', response.status)

            if (!response.ok) {
                const errorData = await response.json()
                log('Parse error:', errorData)
                throw new Error(errorData.error || 'Failed to parse resume')
            }

            // Phase 2: AI parsing for structure
            log('Phase 2: AI parsing for structure')
            setUploadStatus('parsing')
            setUploadMessage('Extracting experience, skills, and projects...')

            const parsed = await response.json()
            log('Parsed data:', {
                hasContactInfo: !!parsed.contactInfo,
                experienceCount: parsed.experience?.length || 0,
                educationCount: parsed.education?.length || 0,
                skillsType: typeof parsed.skills,
                projectsCount: parsed.projects?.length || 0,
            })

            // Phase 3: Upload PDF to storage (optional)
            log('Phase 3: Uploading to storage')
            setUploadStatus('uploading')
            setUploadMessage('Saving your resume file...')

            try {
                const uploadResult = await resumeStorage.upload(
                    user.id,
                    file,
                    file.name.replace(/\.[^/.]+$/, '')
                )
                log('Upload result:', uploadResult)

                if (uploadResult.success && uploadResult.fileUrl) {
                    fileUrl = uploadResult.fileUrl
                }
            } catch (uploadError) {
                log('Upload failed (continuing):', uploadError)
            }

            // Transform parsed data into our review format
            log('Transforming parsed data for review')
            let extracted = transformParsedData(parsed, file.name, fileUrl)
            log('Extracted data:', {
                contactInfo: extracted.contactInfo,
                experienceCount: extracted.experience.length,
                educationCount: extracted.education.length,
                skillsCount: extracted.skills.length,
                projectsCount: extracted.projects.length,
            })
            
            // Mark duplicates (items already in profile)
            setUploadMessage('Checking for existing items...')
            extracted = await markDuplicates(extracted, user.id)
            
            setExtractedData(extracted)
            setUploadStatus('review')
            setUploadMessage('')
            log('Transition to review mode')

        } catch (error) {
            log('handleFileUpload Error:', error)
            setUploadStatus('error')
            setUploadMessage(error instanceof Error ? error.message : 'Failed to process resume')
            
            setTimeout(() => {
                setUploadStatus('idle')
                setUploadMessage('')
            }, 4000)
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const transformParsedData = (
        parsed: Record<string, unknown>,
        fileName: string,
        fileUrl: string | null
    ): ExtractedData => {
        log('transformParsedData: Input', parsed)
        
        const contactInfo = (parsed.contactInfo as ExtractedContactInfo) || {}
        
        // Transform experience
        const rawExperience = (parsed.experience as Array<Record<string, unknown>>) || []
        const experience: ExtractedExperience[] = rawExperience.map((exp, i) => ({
            id: `exp-${i}`,
            company: String(exp.company || ''),
            position: String(exp.position || exp.title || ''),
            location: exp.location ? String(exp.location) : undefined,
            startDate: exp.startDate ? String(exp.startDate) : undefined,
            endDate: exp.endDate ? String(exp.endDate) : undefined,
            bullets: Array.isArray(exp.bullets) ? exp.bullets.map(String) : undefined,
            accepted: true,
        }))
        log('Transformed experience:', experience.length)

        // Transform education
        const rawEducation = (parsed.education as Array<Record<string, unknown>>) || []
        const education: ExtractedEducation[] = rawEducation.map((edu, i) => ({
            id: `edu-${i}`,
            institution: String(edu.institution || ''),
            degree: String(edu.degree || ''),
            field: edu.field ? String(edu.field) : undefined,
            location: edu.location ? String(edu.location) : undefined,
            startDate: edu.startDate ? String(edu.startDate) : undefined,
            endDate: edu.endDate ? String(edu.endDate) : undefined,
            gpa: edu.gpa ? String(edu.gpa) : undefined,
            highlights: Array.isArray(edu.highlights) ? edu.highlights.map(String) : undefined,
            accepted: true,
        }))
        log('Transformed education:', education.length)

        // Transform skills
        const skills: ExtractedSkill[] = []
        const rawSkills = parsed.skills
        log('Raw skills type:', typeof rawSkills, rawSkills)
        
        if (Array.isArray(rawSkills)) {
            rawSkills.forEach((s, i) => {
                if (typeof s === 'string') {
                    skills.push({ id: `skill-${i}`, name: s, accepted: true })
                }
            })
        } else if (rawSkills && typeof rawSkills === 'object') {
            const categorized = rawSkills as { categories?: Array<{ name: string; skills: string[] }> }
            if (categorized.categories) {
                let idx = 0
                for (const cat of categorized.categories) {
                    for (const skillName of cat.skills || []) {
                        skills.push({
                            id: `skill-${idx++}`,
                            name: skillName,
                            category: cat.name,
                            accepted: true,
                        })
                    }
                }
            }
        }
        log('Transformed skills:', skills.length)

        // Transform projects
        const rawProjects = (parsed.projects as Array<Record<string, unknown>>) || []
        const projects: ExtractedProject[] = rawProjects.map((proj, i) => ({
            id: `proj-${i}`,
            name: String(proj.name || ''),
            description: proj.description ? String(proj.description) : undefined,
            technologies: Array.isArray(proj.technologies) ? proj.technologies.map(String) : undefined,
            url: proj.url ? String(proj.url) : undefined,
            startDate: proj.startDate ? String(proj.startDate) : undefined,
            endDate: proj.endDate ? String(proj.endDate) : undefined,
            bullets: Array.isArray(proj.bullets) ? proj.bullets.map(String) : undefined,
            accepted: true,
        }))
        log('Transformed projects:', projects.length)

        return {
            contactInfo,
            experience,
            education,
            skills,
            projects,
            rawParsed: parsed,
            fileName,
            fileUrl,
        }
    }

    // ============================================
    // DUPLICATE DETECTION
    // ============================================

    const markDuplicates = async (
        data: ExtractedData,
        userId: string
    ): Promise<ExtractedData> => {
        log('markDuplicates: Fetching existing profile data')
        
        try {
            // Fetch all existing profile data in parallel
            const [existingExp, existingEdu, existingSkills, existingProj] = await Promise.all([
                experienceDb.getAll(userId),
                educationDb.getAll(userId),
                skillsDb.getAll(userId),
                projectsDb.getAll(userId),
            ])

            log('Existing data:', {
                experience: existingExp?.length || 0,
                education: existingEdu?.length || 0,
                skills: existingSkills?.length || 0,
                projects: existingProj?.length || 0,
            })

            // Create lookup sets for fast comparison
            const expSet = new Set(
                (existingExp || []).map(e => `${e.company.toLowerCase()}|${e.position.toLowerCase()}`)
            )
            const eduSet = new Set(
                (existingEdu || []).map(e => `${e.institution.toLowerCase()}|${e.degree.toLowerCase()}`)
            )
            const skillsSet = new Set(
                (existingSkills || []).map(s => s.name.toLowerCase())
            )
            const projSet = new Set(
                (existingProj || []).map(p => p.name.toLowerCase())
            )
            const projUrlSet = new Set(
                (existingProj || []).filter(p => p.url).map(p => p.url!.toLowerCase())
            )

            // Mark duplicates and set accepted=false for duplicates
            const experience = data.experience.map(exp => {
                const key = `${exp.company.toLowerCase()}|${exp.position.toLowerCase()}`
                const isDuplicate = expSet.has(key)
                return { ...exp, isDuplicate, accepted: isDuplicate ? false : exp.accepted }
            })

            const education = data.education.map(edu => {
                const key = `${edu.institution.toLowerCase()}|${edu.degree.toLowerCase()}`
                const isDuplicate = eduSet.has(key)
                return { ...edu, isDuplicate, accepted: isDuplicate ? false : edu.accepted }
            })

            const skills = data.skills.map(skill => {
                const isDuplicate = skillsSet.has(skill.name.toLowerCase())
                return { ...skill, isDuplicate, accepted: isDuplicate ? false : skill.accepted }
            })

            const projects = data.projects.map(proj => {
                const nameMatch = projSet.has(proj.name.toLowerCase())
                const urlMatch = !!(proj.url && projUrlSet.has(proj.url.toLowerCase()))
                const isDuplicate = nameMatch || urlMatch
                return { ...proj, isDuplicate, accepted: isDuplicate ? false : proj.accepted }
            })

            const duplicateCounts = {
                experience: experience.filter(e => e.isDuplicate).length,
                education: education.filter(e => e.isDuplicate).length,
                skills: skills.filter(s => s.isDuplicate).length,
                projects: projects.filter(p => p.isDuplicate).length,
            }
            log('Duplicate counts:', duplicateCounts)

            return {
                ...data,
                experience,
                education,
                skills,
                projects,
            }
        } catch (error) {
            log('markDuplicates: Error fetching existing data', error)
            // Return unchanged if we can't fetch existing data
            return data
        }
    }

    // ============================================
    // REVIEW ACTIONS
    // ============================================

    const toggleAccepted = (type: 'experience' | 'education' | 'skills' | 'projects', id: string) => {
        log('toggleAccepted:', type, id)
        if (!extractedData) return

        setExtractedData(prev => {
            if (!prev) return prev
            return {
                ...prev,
                [type]: prev[type].map((item: { id: string; accepted: boolean }) =>
                    item.id === id ? { ...item, accepted: !item.accepted } : item
                ),
            }
        })
    }

    const acceptAll = (type: 'experience' | 'education' | 'skills' | 'projects') => {
        log('acceptAll:', type)
        if (!extractedData) return

        setExtractedData(prev => {
            if (!prev) return prev
            return {
                ...prev,
                // Only accept items that are not duplicates
                [type]: prev[type].map((item: { accepted: boolean; isDuplicate?: boolean }) => 
                    ({ ...item, accepted: item.isDuplicate ? false : true })
                ),
            }
        })
    }

    const denyAll = (type: 'experience' | 'education' | 'skills' | 'projects') => {
        log('denyAll:', type)
        if (!extractedData) return

        setExtractedData(prev => {
            if (!prev) return prev
            return {
                ...prev,
                [type]: prev[type].map((item: { accepted: boolean; isDuplicate?: boolean }) => 
                    ({ ...item, accepted: false })
                ),
            }
        })
    }

    const cancelReview = () => {
        log('cancelReview')
        setExtractedData(null)
        setUploadStatus('idle')
        setUploadMessage('')
    }

    // ============================================
    // CONFIRM AND SYNC
    // ============================================

    const confirmAndSync = async () => {
        log('confirmAndSync: Starting')
        if (!extractedData || !user) {
            log('confirmAndSync: Missing data or user')
            return
        }

        setUploadStatus('syncing')
        setUploadMessage('Adding selected items to your profile...')

        try {
            // Build the payload with only accepted items
            const acceptedExp = extractedData.experience.filter(e => e.accepted)
            const acceptedEdu = extractedData.education.filter(e => e.accepted)
            const acceptedSkills = extractedData.skills.filter(s => s.accepted)
            const acceptedProj = extractedData.projects.filter(p => p.accepted)
            
            log('Accepted counts:', {
                experience: acceptedExp.length,
                education: acceptedEdu.length,
                skills: acceptedSkills.length,
                projects: acceptedProj.length,
            })

            const payload = {
                parsedResume: {
                    contactInfo: extractedData.contactInfo,
                    experience: acceptedExp.map(({ accepted, id, ...rest }) => rest),
                    education: acceptedEdu.map(({ accepted, id, ...rest }) => rest),
                    skills: acceptedSkills.length > 0
                        ? {
                            format: 'categorized',
                            categories: groupSkillsByCategory(acceptedSkills),
                        }
                        : undefined,
                    projects: acceptedProj.map(({ accepted, id, ...rest }) => rest),
                },
            }

            log('Sync payload:', payload)

            // Clerk handles auth automatically via cookies/middleware
            const syncResponse = await fetch('/api/resume/sync-profile', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            })

            log('Sync response status:', syncResponse.status)

            if (!syncResponse.ok) {
                const errorText = await syncResponse.text()
                log('Sync error:', errorText)
                throw new Error('Failed to sync profile')
            }

            const syncResult = await syncResponse.json()
            log('Sync result:', syncResult)

            // Save resume record
            setUploadStatus('saving')
            setUploadMessage('Saving resume record...')

            log('Creating resume record')
            const resumeRecord = await resumesDb.create({
                user_id: user.id,
                name: extractedData.fileName.replace(/\.[^/.]+$/, ''),
                resume_type: 'source',
                content: JSON.stringify(extractedData.rawParsed),
                file_url: extractedData.fileUrl,
                is_primary: resumes.length === 0,
                match_score: null,
                target_job_id: null,
                source_resume_id: null,
            })
            log('Resume record created:', resumeRecord)

            // Done
            setUploadStatus('done')
            setUploadMessage(`Profile updated! ${syncResult.message}`)
            setExtractedData(null)

            await loadResumes(user.id)

            setTimeout(() => {
                setUploadStatus('idle')
                setUploadMessage('')
            }, 4000)

        } catch (error) {
            log('confirmAndSync Error:', error)
            setUploadStatus('error')
            setUploadMessage(error instanceof Error ? error.message : 'Failed to sync')

            setTimeout(() => {
                setUploadStatus('review')
                setUploadMessage('')
            }, 3000)
        }
    }

    const groupSkillsByCategory = (skills: ExtractedSkill[]) => {
        const groups: Record<string, string[]> = {}
        for (const skill of skills) {
            const cat = skill.category || 'Other'
            if (!groups[cat]) groups[cat] = []
            groups[cat].push(skill.name)
        }
        return Object.entries(groups).map(([name, skillList]) => ({
            name,
            skills: skillList,
        }))
    }

    // ============================================
    // OTHER HANDLERS
    // ============================================

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this resume?')) return

        log('handleDelete:', id)

        // In mock mode, delete from localStorage
        if (IS_MOCK_MODE || id.startsWith('mock-')) {
            try {
                const savedResumes = JSON.parse(localStorage.getItem('mockSavedResumes') || '[]')
                const filtered = savedResumes.filter((r: { id: string }) => r.id !== id)
                localStorage.setItem('mockSavedResumes', JSON.stringify(filtered))
                log('Deleted mock resume from localStorage')
                setResumes(prev => prev.filter(r => r.id !== id))
            } catch (e) {
                console.warn('Failed to delete mock resume:', e)
            }
            return
        }

        if (!user) return

        const resumeToDelete = resumes.find(r => r.id === id)
        if (resumeToDelete?.file_url) {
            try {
                await resumeStorage.delete(resumeToDelete.file_url)
            } catch (storageError) {
                log('Failed to delete storage file:', storageError)
            }
        }

        await resumesDb.delete(id)
        await loadResumes(user.id)
    }

    const handleDownload = async (resume: UserResume | ResumeWithJob) => {
        if (!resume.file_url) {
            alert('No PDF file available for this resume')
            return
        }

        try {
            // Check if it's a data URL (mock mode) or a storage URL
            if (resume.file_url.startsWith('data:')) {
                // Data URL - open directly in new tab
                window.open(resume.file_url, '_blank')
            } else {
                // Storage URL - get signed URL
                const signedUrl = await resumeStorage.getSignedUrl(resume.file_url)
                if (signedUrl) {
                    window.open(signedUrl, '_blank')
                } else {
                    alert('Failed to get download link')
                }
            }
        } catch (error) {
            log('Download error:', error)
            alert('Failed to download resume')
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const getResumePreview = (content: string, resumeName?: string) => {
        try {
            const parsed = JSON.parse(content)
            let skillsCount = 0
            if (Array.isArray(parsed.skills)) {
                skillsCount = parsed.skills.length
            } else if (parsed.skills?.categories) {
                skillsCount = parsed.skills.categories.reduce(
                    (acc: number, cat: { skills: string[] }) => acc + (cat.skills?.length || 0),
                    0
                )
            }

            // Use the resume name (file name) as primary, with contact info as secondary for email display
            const contactName = parsed.contactInfo?.name || parsed.name
            return {
                name: contactName || null, // null means we'll use the resume.name in the UI
                email: parsed.contactInfo?.email || parsed.email || '',
                hasStructuredData: !!(parsed.experience?.length || parsed.education?.length || parsed.projects?.length),
                experienceCount: parsed.experience?.length || 0,
                skillsCount,
                projectsCount: parsed.projects?.length || 0,
            }
        } catch {
            return {
                name: null,
                email: '',
                hasStructuredData: false,
                experienceCount: 0,
                skillsCount: 0,
                projectsCount: 0,
            }
        }
    }

    const isProcessing = ['extracting', 'parsing', 'uploading', 'syncing', 'saving'].includes(uploadStatus)
    const isReviewing = uploadStatus === 'review'

    // Filter resumes based on selected filter
    const filteredResumes = resumes.filter(resume => {
        if (filter === 'all') return true
        const resumeType = resume.resume_type || 'source'
        return resumeType === filter
    })

    // Count by type for filter tabs
    const counts = {
        all: resumes.length,
        source: resumes.filter(r => !r.resume_type || r.resume_type === 'source').length,
        tailored: resumes.filter(r => r.resume_type === 'tailored').length,
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className={styles.pageWrapper}>
            {/* Processing Overlay - contained within page */}
            {isProcessing && (
                <div className={styles.overlay}>
                    <div className={styles.overlayContent}>
                        <div className={styles.overlaySpinner} />
                        <h2>
                            {uploadStatus === 'extracting' && 'Reading your resume...'}
                            {uploadStatus === 'parsing' && 'Extracting your data...'}
                            {uploadStatus === 'uploading' && 'Saving resume file...'}
                            {uploadStatus === 'syncing' && 'Syncing to your profile...'}
                            {uploadStatus === 'saving' && 'Finalizing...'}
                        </h2>
                        <p className={styles.overlaySubtext}>{uploadMessage}</p>
                        <div className={styles.overlaySteps}>
                            <div className={`${styles.step} ${uploadStatus === 'extracting' ? styles.active : ''} ${['parsing', 'uploading', 'syncing', 'saving'].includes(uploadStatus) ? styles.done : ''}`}>
                                <span>1</span> Read
                            </div>
                            <div className={`${styles.step} ${uploadStatus === 'parsing' ? styles.active : ''} ${['uploading', 'syncing', 'saving'].includes(uploadStatus) ? styles.done : ''}`}>
                                <span>2</span> Extract
                            </div>
                            <div className={`${styles.step} ${uploadStatus === 'uploading' ? styles.active : ''} ${['syncing', 'saving'].includes(uploadStatus) ? styles.done : ''}`}>
                                <span>3</span> Save
                            </div>
                            <div className={`${styles.step} ${['syncing', 'saving'].includes(uploadStatus) ? styles.active : ''}`}>
                                <span>4</span> Sync
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Mode */}
            {isReviewing && extractedData ? (
                <div className={styles.reviewPage}>
                    {(() => {
                        // Calculate summary stats
                        const totalItems = extractedData.experience.length + 
                                          extractedData.education.length + 
                                          extractedData.skills.length + 
                                          extractedData.projects.length
                        
                        const newExp = extractedData.experience.filter(e => !e.isDuplicate).length
                        const newEdu = extractedData.education.filter(e => !e.isDuplicate).length
                        const newSkills = extractedData.skills.filter(s => !s.isDuplicate).length
                        const newProj = extractedData.projects.filter(p => !p.isDuplicate).length
                        const totalNew = newExp + newEdu + newSkills + newProj
                        
                        const dupExp = extractedData.experience.filter(e => e.isDuplicate).length
                        const dupEdu = extractedData.education.filter(e => e.isDuplicate).length
                        const dupSkills = extractedData.skills.filter(s => s.isDuplicate).length
                        const dupProj = extractedData.projects.filter(p => p.isDuplicate).length
                        const totalDup = dupExp + dupEdu + dupSkills + dupProj
                        
                        const noDataExtracted = totalItems === 0
                        const allDuplicates = totalNew === 0 && totalDup > 0

                        // Debug logging
                        log('Review stats:', {
                            totalItems,
                            totalNew,
                            totalDup,
                            noDataExtracted,
                            allDuplicates,
                            experience: extractedData.experience.length,
                            education: extractedData.education.length,
                            skills: extractedData.skills.length,
                            projects: extractedData.projects.length,
                        })

                        return (
                            <>
                                <header className={styles.reviewHeader}>
                                    <div>
                                        <h1>Review Extracted Data</h1>
                                        {noDataExtracted ? (
                                            <p className={styles.noDataMessage}>
                                                We couldn&apos;t extract any experience, education, skills, or projects from this resume.
                                            </p>
                                        ) : allDuplicates ? (
                                            <p className={styles.allDuplicatesMessage}>
                                                All items from this resume are already in your profile.
                                            </p>
                                        ) : totalDup > 0 ? (
                                            <p>
                                                Found {totalNew} new item{totalNew !== 1 ? 's' : ''} to add.
                                                <span className={styles.dupNote}> ({totalDup} already in profile)</span>
                                            </p>
                                        ) : totalNew > 0 ? (
                                            <p>Found {totalNew} item{totalNew !== 1 ? 's' : ''} to add to your profile.</p>
                                        ) : (
                                            <p>Select what to add to your profile.</p>
                                        )}
                                    </div>
                                    <div className={styles.reviewActions}>
                                        <button onClick={cancelReview} className={styles.cancelBtn}>
                                            {noDataExtracted || allDuplicates ? 'Close' : 'Cancel'}
                                        </button>
                                        {!noDataExtracted && !allDuplicates && totalNew > 0 && (
                                            <button onClick={confirmAndSync} className={styles.confirmBtn}>
                                                Add to Profile
                                            </button>
                                        )}
                                    </div>
                                </header>

                                {noDataExtracted && (
                                    <div className={styles.noDataCard}>
                                        <div className={styles.warningIcon}>!</div>
                                        <h2>No Data Found</h2>
                                        <p>
                                            We couldn&apos;t find any structured data in this resume. This might happen if:
                                        </p>
                                        <ul className={styles.noDataReasons}>
                                            <li>The PDF is an image-based scan</li>
                                            <li>The resume uses an unusual format</li>
                                            <li>The text couldn&apos;t be properly extracted</li>
                                        </ul>
                                        <p className={styles.noDataHint}>
                                            Try uploading a text-based PDF or manually add your information to your profile.
                                        </p>
                                        <button onClick={cancelReview} className={styles.confirmBtn}>
                                            Close
                                        </button>
                                    </div>
                                )}

                                {allDuplicates && (
                                    <div className={styles.allDuplicatesCard}>
                                        <div className={styles.checkIcon}>✓</div>
                                        <h2>You&apos;re all set!</h2>
                                        <p>
                                            We found {totalDup} item{totalDup !== 1 ? 's' : ''} in this resume, 
                                            but they&apos;re all already saved in your profile.
                                        </p>
                                        <button onClick={cancelReview} className={styles.confirmBtn}>
                                            Continue
                                        </button>
                                    </div>
                                )}
                            </>
                        )
                    })()}

                    {/* Only show sections if not all duplicates */}
                    {extractedData.experience.some(e => !e.isDuplicate) || 
                     extractedData.education.some(e => !e.isDuplicate) ||
                     extractedData.skills.some(s => !s.isDuplicate) ||
                     extractedData.projects.some(p => !p.isDuplicate) ? (
                        <>
                            {/* Contact Info */}
                            {extractedData.contactInfo.name && (
                                <section className={styles.reviewSection}>
                                    <h2>Contact Information</h2>
                                    <div className={styles.contactGrid}>
                                        {Object.entries(extractedData.contactInfo).map(([key, value]) => 
                                            value ? (
                                                <div key={key} className={styles.contactItem}>
                                                    <label>{key}</label>
                                                    <span>{value}</span>
                                                </div>
                                            ) : null
                                        )}
                                    </div>
                                </section>
                            )}

                    {/* Experience */}
                    {extractedData.experience.length > 0 && (
                        <section className={styles.reviewSection}>
                            <div className={styles.sectionHeader}>
                                <h2>Experience ({extractedData.experience.filter(e => e.accepted).length}/{extractedData.experience.filter(e => !e.isDuplicate).length} new)</h2>
                                <div className={styles.bulkActions}>
                                    <button onClick={() => acceptAll('experience')}>All New</button>
                                    <button onClick={() => denyAll('experience')}>None</button>
                                </div>
                            </div>
                            <div className={styles.itemsList}>
                                {extractedData.experience.map(exp => (
                                    <div
                                        key={exp.id}
                                        className={`${styles.reviewItem} ${exp.isDuplicate ? styles.duplicate : ''} ${exp.accepted ? styles.accepted : styles.denied}`}
                                        onClick={() => !exp.isDuplicate && toggleAccepted('experience', exp.id)}
                                        style={exp.isDuplicate ? { cursor: 'default' } : undefined}
                                    >
                                        <div className={styles.checkbox}>
                                            {exp.isDuplicate ? (
                                                <span className={styles.dupCheck}>✓</span>
                                            ) : exp.accepted ? (
                                                <span>✓</span>
                                            ) : null}
                                        </div>
                                        <div className={styles.itemContent}>
                                            <div className={styles.itemHeader}>
                                                <h3>{exp.position || 'Position'}</h3>
                                                {exp.isDuplicate && <span className={styles.dupBadge}>Already in profile</span>}
                                            </div>
                                            <p className={styles.itemMeta}>{exp.company}{exp.location && ` • ${exp.location}`}</p>
                                            <p className={styles.itemDates}>{exp.startDate} - {exp.endDate || 'Present'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Education */}
                    {extractedData.education.length > 0 && (
                        <section className={styles.reviewSection}>
                            <div className={styles.sectionHeader}>
                                <h2>Education ({extractedData.education.filter(e => e.accepted).length}/{extractedData.education.filter(e => !e.isDuplicate).length} new)</h2>
                                <div className={styles.bulkActions}>
                                    <button onClick={() => acceptAll('education')}>All New</button>
                                    <button onClick={() => denyAll('education')}>None</button>
                                </div>
                            </div>
                            <div className={styles.itemsList}>
                                {extractedData.education.map(edu => (
                                    <div
                                        key={edu.id}
                                        className={`${styles.reviewItem} ${edu.isDuplicate ? styles.duplicate : ''} ${edu.accepted ? styles.accepted : styles.denied}`}
                                        onClick={() => !edu.isDuplicate && toggleAccepted('education', edu.id)}
                                        style={edu.isDuplicate ? { cursor: 'default' } : undefined}
                                    >
                                        <div className={styles.checkbox}>
                                            {edu.isDuplicate ? (
                                                <span className={styles.dupCheck}>✓</span>
                                            ) : edu.accepted ? (
                                                <span>✓</span>
                                            ) : null}
                                        </div>
                                        <div className={styles.itemContent}>
                                            <div className={styles.itemHeader}>
                                                <h3>{edu.degree}{edu.field && ` in ${edu.field}`}</h3>
                                                {edu.isDuplicate && <span className={styles.dupBadge}>Already in profile</span>}
                                            </div>
                                            <p className={styles.itemMeta}>{edu.institution}</p>
                                            <p className={styles.itemDates}>{edu.endDate || 'Present'}{edu.gpa && ` • GPA: ${edu.gpa}`}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Skills */}
                    {extractedData.skills.length > 0 && (
                        <section className={styles.reviewSection}>
                            <div className={styles.sectionHeader}>
                                <h2>Skills ({extractedData.skills.filter(s => s.accepted).length}/{extractedData.skills.filter(s => !s.isDuplicate).length} new)</h2>
                                <div className={styles.bulkActions}>
                                    <button onClick={() => acceptAll('skills')}>All New</button>
                                    <button onClick={() => denyAll('skills')}>None</button>
                                </div>
                            </div>
                            <div className={styles.skillsGrid}>
                                {extractedData.skills.map(skill => (
                                    <button
                                        key={skill.id}
                                        className={`${styles.skillChip} ${skill.isDuplicate ? styles.duplicate : ''} ${skill.accepted ? styles.accepted : styles.denied}`}
                                        onClick={() => !skill.isDuplicate && toggleAccepted('skills', skill.id)}
                                        disabled={skill.isDuplicate}
                                        title={skill.isDuplicate ? 'Already in profile' : undefined}
                                    >
                                        {skill.isDuplicate && <span className={styles.dupCheckSmall}>✓</span>}
                                        {skill.name}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Projects */}
                    {extractedData.projects.length > 0 && (
                        <section className={styles.reviewSection}>
                            <div className={styles.sectionHeader}>
                                <h2>Projects ({extractedData.projects.filter(p => p.accepted).length}/{extractedData.projects.filter(p => !p.isDuplicate).length} new)</h2>
                                <div className={styles.bulkActions}>
                                    <button onClick={() => acceptAll('projects')}>All New</button>
                                    <button onClick={() => denyAll('projects')}>None</button>
                                </div>
                            </div>
                            <div className={styles.itemsList}>
                                {extractedData.projects.map(proj => (
                                    <div
                                        key={proj.id}
                                        className={`${styles.reviewItem} ${proj.isDuplicate ? styles.duplicate : ''} ${proj.accepted ? styles.accepted : styles.denied}`}
                                        onClick={() => !proj.isDuplicate && toggleAccepted('projects', proj.id)}
                                        style={proj.isDuplicate ? { cursor: 'default' } : undefined}
                                    >
                                        <div className={styles.checkbox}>
                                            {proj.isDuplicate ? (
                                                <span className={styles.dupCheck}>✓</span>
                                            ) : proj.accepted ? (
                                                <span>✓</span>
                                            ) : null}
                                        </div>
                                        <div className={styles.itemContent}>
                                            <div className={styles.itemHeader}>
                                                <h3>{proj.name}</h3>
                                                {proj.isDuplicate && <span className={styles.dupBadge}>Already in profile</span>}
                                            </div>
                                            {proj.description && <p className={styles.itemMeta}>{proj.description}</p>}
                                            {proj.technologies && proj.technologies.length > 0 && (
                                                <div className={styles.techTags}>
                                                    {proj.technologies.slice(0, 5).map((tech, i) => (
                                                        <span key={i} className={styles.techTag}>{tech}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                        {/* Footer for sections view */}
                        <div className={styles.reviewFooter}>
                            <button onClick={cancelReview} className={styles.cancelBtn}>Cancel</button>
                            <button onClick={confirmAndSync} className={styles.confirmBtn}>
                                Add {
                                    extractedData.experience.filter(e => e.accepted && !e.isDuplicate).length +
                                    extractedData.education.filter(e => e.accepted && !e.isDuplicate).length +
                                    extractedData.skills.filter(s => s.accepted && !s.isDuplicate).length +
                                    extractedData.projects.filter(p => p.accepted && !p.isDuplicate).length
                                } Items
                            </button>
                        </div>
                        </>
                    ) : null}
                </div>
            ) : (
                /* Main page content */
                <div className={styles.page}>
                    <header className={styles.header}>
                        <div>
                            <h1>Resumes</h1>
                            <p>Manage your imported and tailored resumes.</p>
                        </div>
                        <label className={styles.uploadBtn} data-tour="import-resume">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleFileUpload}
                                disabled={isProcessing}
                                hidden
                            />
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Import Resume
                        </label>
                    </header>

                    {/* Filter Tabs */}
                    <div className={styles.filterTabs}>
                        <button
                            className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All <span className={styles.count}>{counts.all}</span>
                        </button>
                        <button
                            className={`${styles.filterTab} ${filter === 'source' ? styles.active : ''}`}
                            onClick={() => setFilter('source')}
                        >
                            Imported <span className={styles.count}>{counts.source}</span>
                        </button>
                        <button
                            className={`${styles.filterTab} ${filter === 'tailored' ? styles.active : ''}`}
                            onClick={() => setFilter('tailored')}
                        >
                            Tailored <span className={styles.count}>{counts.tailored}</span>
                        </button>
                    </div>

                    {/* Success/Error message */}
                    {uploadMessage && (uploadStatus === 'done' || uploadStatus === 'error') && (
                        <div className={`${styles.uploadProgress} ${uploadStatus === 'error' ? styles.error : styles.success}`}>
                            {uploadMessage}
                        </div>
                    )}

                    {loading ? (
                        <div className={styles.resumesGrid}>
                            {[1, 2].map((i) => (
                                <SkeletonResumeCard key={i} />
                            ))}
                        </div>
                    ) : filteredResumes.length > 0 ? (
                        <div className={styles.resumesGrid}>
                            {filteredResumes.map((resume) => {
                                const preview = getResumePreview(resume.content)
                                const isTailored = resume.resume_type === 'tailored'
                                return (
                                    <div key={resume.id} className={`${styles.resumeCard} ${isTailored ? styles.tailoredCard : ''}`}>
                                        <div className={`${styles.resumeIcon} ${isTailored ? styles.tailoredIcon : ''}`}>
                                            {isTailored ? (
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M12 20h9" />
                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                </svg>
                                            ) : (
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <path d="M14 2v6h6" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className={styles.resumeContent}>
                                            <div className={styles.resumeHeader}>
                                                <h3>{resume.name}</h3>
                                                {resume.is_primary && <span className={styles.primaryBadge}>Primary</span>}
                                                {isTailored && <span className={styles.tailoredBadge}>Tailored</span>}
                                                {resume.match_score && (
                                                    <span className={styles.matchBadge}>{resume.match_score}% match</span>
                                                )}
                                            </div>
                                            {isTailored && resume.saved_job ? (
                                                <>
                                                    <p className={styles.resumeMeta}>
                                                        {resume.saved_job.title}
                                                        {resume.saved_job.company && ` at ${resume.saved_job.company}`}
                                                    </p>
                                                    {resume.saved_job.url && (
                                                        <a 
                                                            href={resume.saved_job.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className={styles.jobLink}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                                <polyline points="15 3 21 3 21 9" />
                                                                <line x1="10" y1="14" x2="21" y2="3" />
                                                            </svg>
                                                            View Job
                                                        </a>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <p className={styles.resumeMeta}>
                                                        {preview.name || resume.name}
                                                        {preview.email && <span> • {preview.email}</span>}
                                                    </p>
                                                    {preview.hasStructuredData && (
                                                        <div className={styles.structuredBadges}>
                                                            {preview.experienceCount > 0 && (
                                                                <span className={styles.dataBadge}>{preview.experienceCount} exp</span>
                                                            )}
                                                            {preview.projectsCount > 0 && (
                                                                <span className={styles.dataBadge}>{preview.projectsCount} proj</span>
                                                            )}
                                                            {preview.skillsCount > 0 && (
                                                                <span className={styles.dataBadge}>{preview.skillsCount} skills</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <p className={styles.resumeDate}>
                                                {isTailored ? 'Created' : 'Uploaded'} {formatDate(resume.created_at)}
                                            </p>
                                        </div>
                                        <div className={styles.resumeActions}>
                                            {isTailored && (
                                                <Link 
                                                    href={`/dashboard/resumes/edit/${resume.id}`} 
                                                    className={styles.editBtn} 
                                                    title="Edit"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </Link>
                                            )}
                                            {resume.file_url && (
                                                <button onClick={() => handleDownload(resume)} className={styles.downloadBtn} title="Download">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="7 10 12 15 17 10" />
                                                        <line x1="12" y1="15" x2="12" y2="3" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(resume.id)} className={styles.deleteBtn} title="Delete">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : resumes.length > 0 ? (
                        <div className={styles.emptyFilterState}>
                            <p>No {filter === 'source' ? 'imported' : 'tailored'} resumes yet.</p>
                            {filter === 'tailored' && (
                                <Link href="/tailor" className={styles.tailorLink}>
                                    Create a tailored resume
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <path d="M14 2v6h6" />
                                    <path d="M12 18v-6M9 15l3-3 3 3" />
                                </svg>
                            </div>
                            <h3>Import your resume</h3>
                            <p>Upload a PDF to extract your experience, education, skills, and projects.</p>
                            <label className={styles.emptyUploadBtn}>
                                <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={isProcessing} hidden />
                                Import Resume
                            </label>
                        </div>
                    )}

                    <section className={styles.tips}>
                        <h2>How It Works</h2>
                        <div className={styles.tipsGrid}>
                            <div className={styles.tipCard}>
                                <div className={styles.tipIcon}>📄</div>
                                <h4>Upload</h4>
                                <p>Upload your resume PDF</p>
                            </div>
                            <div className={styles.tipCard}>
                                <div className={styles.tipIcon}>✓</div>
                                <h4>Review</h4>
                                <p>Select what to import</p>
                            </div>
                            <div className={styles.tipCard}>
                                <div className={styles.tipIcon}>🎯</div>
                                <h4>Profile</h4>
                                <p>Build your profile</p>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}
