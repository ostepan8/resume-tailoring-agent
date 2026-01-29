import { NextRequest, NextResponse } from 'next/server'
import { createLogger, logError } from '@/lib/logger'
import { getServerSupabase, getUserFromRequest } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = createLogger('api/resume/[id]')

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        log('=== GET /api/resume/[id] ===')
        log('Resume ID:', id)

        if (!id) {
            return NextResponse.json(
                { error: 'Resume ID is required' },
                { status: 400 }
            )
        }

        // Verify authentication
        const userId = await getUserFromRequest(request)
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        log('User:', userId)

        const supabase = getServerSupabase()

        // Fetch the resume with its associated job
        const { data: resume, error: resumeError } = await supabase
            .from('user_resumes')
            .select(`
                *,
                saved_job:saved_jobs(*)
            `)
            .eq('id', id)
            .eq('user_id', userId)
            .single()

        if (resumeError) {
            log('Error fetching resume:', resumeError)
            if (resumeError.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Resume not found' },
                    { status: 404 }
                )
            }
            return NextResponse.json(
                { error: 'Failed to fetch resume', details: resumeError.message },
                { status: 500 }
            )
        }

        log('Resume found:', resume.name)

        return NextResponse.json({
            success: true,
            resume,
        })

    } catch (error) {
        logError('api/resume/[id]', 'Get resume error', error)
        return NextResponse.json(
            { 
                error: 'Failed to fetch resume', 
                message: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        )
    }
}
