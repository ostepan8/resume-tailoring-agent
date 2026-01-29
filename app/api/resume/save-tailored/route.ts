import { NextRequest, NextResponse } from 'next/server'
import { createLogger, logError } from '@/lib/logger'
import { getServerSupabase, getUserFromRequest } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Check if we're in mock mode
// Use NEXT_PUBLIC_USE_MOCK for consistency with frontend
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

const log = createLogger('api/resume/save-tailored')

interface SaveTailoredRequest {
    name: string
    content: {
        blocks: unknown[]
        metadata: unknown
        tailoredData: unknown
    }
    fileUrl?: string
    matchScore?: number
    targetJob: {
        title: string
        company: string
        url?: string
        description: string
    }
    originalResume?: unknown // Original resume data for history tracking
}

export async function POST(request: NextRequest) {
    try {
        log('=== POST /api/resume/save-tailored ===')

        const body: SaveTailoredRequest = await request.json()
        const { name, content, fileUrl, matchScore, targetJob, originalResume } = body

        log('Request body:')
        log('  name:', name)
        log('  targetJob.title:', targetJob?.title)
        log('  targetJob.company:', targetJob?.company)
        log('  targetJob.url:', targetJob?.url)
        log('  matchScore:', matchScore)

        if (!name || !content || !targetJob) {
            return NextResponse.json(
                { error: 'Missing required fields: name, content, targetJob' },
                { status: 400 }
            )
        }

        // Mock mode - return success with mock IDs
        // The client will save to localStorage for persistence
        if (USE_MOCK) {
            log('[MOCK MODE] Returning mock success response')
            const mockResumeId = `mock-resume-${Date.now()}`
            const mockJobId = `mock-job-${Date.now()}`
            
            return NextResponse.json({
                success: true,
                resumeId: mockResumeId,
                jobId: mockJobId,
                message: 'Resume saved successfully (mock mode)',
                mockMode: true,
                savedData: {
                    id: mockResumeId,
                    name,
                    createdAt: new Date().toISOString(),
                    matchScore,
                    fileUrl: fileUrl || null,
                    targetJob: {
                        id: mockJobId,
                        title: targetJob.title,
                        company: targetJob.company,
                        url: targetJob.url,
                        description: targetJob.description,
                    },
                    content: content,
                }
            })
        }

        // Verify authentication
        const userId = await getUserFromRequest(request)
        if (!userId) {
            log('Authentication required')
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        log('User authenticated:', userId)

        const supabase = getServerSupabase()

        // Step 1: Create or find the saved job
        let savedJobId: string | null = null

        // Check if job with same title+company already exists
        const { data: existingJob } = await supabase
            .from('saved_jobs')
            .select('id')
            .eq('user_id', userId)
            .eq('title', targetJob.title)
            .eq('company', targetJob.company)
            .single()

        if (existingJob) {
            savedJobId = existingJob.id
        } else {
            // Create new saved job
            const { data: newJob, error: jobError } = await supabase
                .from('saved_jobs')
                .insert({
                    user_id: userId,
                    title: targetJob.title,
                    company: targetJob.company,
                    description: targetJob.description,
                    url: targetJob.url || null,
                    status: 'saved',
                })
                .select('id')
                .single()

            if (jobError) {
                logError('api/resume/save-tailored', 'Error creating saved job', jobError)
                // Continue without linking to job
            } else {
                savedJobId = newJob.id
            }
        }

        // Step 2: Create the tailored resume
        const { data: resume, error: resumeError } = await supabase
            .from('user_resumes')
            .insert({
                user_id: userId,
                name,
                resume_type: 'tailored',
                content: JSON.stringify(content),
                file_url: fileUrl || null,
                match_score: matchScore || null,
                target_job_id: savedJobId,
                is_primary: false,
            })
            .select('id')
            .single()

        if (resumeError) {
            logError('api/resume/save-tailored', 'Error creating resume', resumeError)
            return NextResponse.json(
                { error: 'Failed to save resume', details: resumeError.message },
                { status: 500 }
            )
        }

        // Step 3: Create tailoring history entry for recent activity display
        const { error: historyError } = await supabase
            .from('tailoring_history')
            .insert({
                user_id: userId,
                resume_id: resume.id,
                job_title: targetJob.title,
                company_name: targetJob.company,
                job_description: targetJob.description,
                original_resume: JSON.stringify(originalResume || {}),
                tailored_resume: JSON.stringify(content),
                match_score: matchScore || null,
            })

        if (historyError) {
            // Log but don't fail - resume was already saved successfully
            logError('api/resume/save-tailored', 'Error creating tailoring history', historyError)
        }

        return NextResponse.json({
            success: true,
            resumeId: resume.id,
            jobId: savedJobId,
            message: 'Resume saved successfully',
        })

    } catch (error) {
        logError('api/resume/save-tailored', 'Save tailored resume error', error)
        return NextResponse.json(
            { 
                error: 'Failed to save resume', 
                message: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        )
    }
}
