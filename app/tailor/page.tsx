'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './tailor.module.css'
import Navbar from '../components/Navbar'
import { useAuth } from '../../lib/auth-context'
import { createLogger } from '@/lib/logger'
import {
  JobDescriptionStep,
  TailoringStep,
  ResultsStep,
  type ParsedResume,
  type JobDescription,
  type TailoredResume,
  type AgentThought,
  type TailoringPhase,
} from './components'

// Simplified step type - job -> tailoring -> results
type Step = 'job' | 'tailoring' | 'results'

const log = createLogger('TailorPage')

export default function TailorPage() {
  const { user, loading, isConfigured } = useAuth()
  const router = useRouter()
  // Track if auth check is complete to prevent flash
  const [authChecked, setAuthChecked] = useState(false)

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading) {
      setAuthChecked(true)
      if (!user) {
        router.replace('/')
      }
    }
  }, [user, loading, router])

  // Navigation state - start with job (step 1)
  const [currentStep, setCurrentStep] = useState<Step>('job')

  // Form data
  const [jobDescription, setJobDescription] = useState<JobDescription | null>(null)

  // Tailoring state
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(null)
  const [generatedResume, setGeneratedResume] = useState<ParsedResume | null>(null)
  const [thoughts, setThoughts] = useState<AgentThought[]>([])
  const [currentPhase, setCurrentPhase] = useState<TailoringPhase>('analyzing-resume')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const thoughtIdRef = useRef(0)

  // Reset handler
  const handleReset = useCallback(() => {
    setCurrentStep('job')
    setJobDescription(null)
    setTailoredResume(null)
    setGeneratedResume(null)
    setThoughts([])
    setCurrentPhase('analyzing-resume')
    setProgress(0)
    setError(null)
    thoughtIdRef.current = 0
  }, [])

  // Add thought helper
  const addThought = useCallback((text: string, isComplete: boolean = false, phase?: string) => {
    const id = thoughtIdRef.current++
    setThoughts(prev => [...prev, { id, text, isComplete, phase }])
  }, [])

  const completeCurrentThought = useCallback(() => {
    setThoughts(prev => {
      if (prev.length === 0) return prev
      const updated = [...prev]
      updated[updated.length - 1] = { ...updated[updated.length - 1], isComplete: true }
      return updated
    })
  }, [])

  // Start tailoring process - goes straight from job to tailoring
  // The API will handle company research + resume generation
  const startTailoring = useCallback(async (job: JobDescription) => {
    log('=== startTailoring called ===')
    log('Job:', {
      title: job.title,
      company: job.company,
      fullTextLength: job.fullText?.length,
    })

    setCurrentStep('tailoring')
    setThoughts([])
    setCurrentPhase('researching-company')
    setProgress(0)
    setError(null)
    thoughtIdRef.current = 0

    try {
      log('Fetching /api/tailor/stream...')

      const requestBody = {
        jobDescription: job,
        // Signal to use profile data
        useProfileData: true,
      }
      log('Request body:', JSON.stringify(requestBody, null, 2))

      // Clerk handles auth automatically via cookies/middleware
      const response = await fetch('/api/tailor/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies for auth
        body: JSON.stringify(requestBody),
      })

      log('Response status:', response.status)
      log('Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        log('ERROR response:', errorText)
        throw new Error('Failed to start tailoring: ' + errorText)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        log('ERROR: No response stream available')
        throw new Error('No response stream available')
      }

      log('Starting to read SSE stream...')
      const decoder = new TextDecoder()
      let buffer = ''
      let eventCount = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          log('Stream done, total events:', eventCount)
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6)
              const data = JSON.parse(jsonStr)
              eventCount++
              log('SSE event #' + eventCount + ':', data.type, data.phase || '')

              switch (data.type) {
                case 'phase':
                  log('Phase change:', data.phase)
                  setCurrentPhase(data.phase)
                  if (data.progress) setProgress(data.progress)
                  break

                case 'thought':
                  if (data.thought) {
                    log('Thought:', data.thought.substring(0, 100) + '...')
                    completeCurrentThought()
                    addThought(data.thought, true, data.phase)
                  }
                  if (data.progress) setProgress(data.progress)
                  break

                case 'progress':
                  setProgress(data.progress)
                  break

                case 'research':
                  // Log company research results
                  log('=== Company Research Results ===')
                  log(JSON.stringify(data.research, null, 2))
                  addThought(`Researched ${job.company}: ${data.research?.summary || 'Found company info'}`, true, 'researching-company')
                  break

                case 'complete':
                  log('=== COMPLETE ===')
                  log('Result received:', !!data.result)
                  if (data.result) {
                    log('Result fullText length:', data.result.fullText?.length)
                    log('Result matchScore:', data.result.matchScore)
                    log('Result sections:', data.result.sections?.length)
                    log('Result experience:', data.result.experience?.length || 0)
                    log('Result education:', data.result.education?.length || 0)
                  }
                  completeCurrentThought()
                  setCurrentPhase('complete')
                  setProgress(100)

                  if (data.result) {
                    setTailoredResume(data.result)
                    // Store the original/generated resume for comparison
                    if (data.originalResume) {
                      setGeneratedResume(data.originalResume)
                    } else {
                      setGeneratedResume({
                        fullText: 'Generated from your profile',
                        sections: [],
                        contactInfo: data.result.contactInfo,
                      })
                    }
                    setCurrentStep('results')
                  } else {
                    log('ERROR: No result in complete event')
                    throw new Error('No tailored resume received')
                  }
                  break

                case 'error':
                  log('ERROR event:', data.message)
                  throw new Error(data.message)
              }
            } catch (parseError) {
              if (!(parseError instanceof SyntaxError)) {
                log('Parse error:', parseError)
                throw parseError
              }
            }
          }
        }
      }
    } catch (err) {
      log('ERROR in startTailoring:', err)
      setError(err instanceof Error ? err.message : 'Failed to tailor resume')
    }
  }, [addThought, completeCurrentThought])

  // Step 1: Job completed -> Start tailoring immediately
  const handleJobComplete = useCallback((job: JobDescription) => {
    log('handleJobComplete called')
    log('Job title:', job.title)
    log('Job company:', job.company)
    setJobDescription(job)
    startTailoring(job)
  }, [startTailoring])

  const handleRetry = useCallback(() => {
    if (jobDescription) {
      startTailoring(jobDescription)
    }
  }, [startTailoring, jobDescription])

  // Show loading state while:
  // 1. Auth is still loading
  // 2. Auth check is complete but we haven't rendered yet  
  // 3. User is not authenticated (we're about to redirect)
  if (loading || !authChecked || !user) {
    return (
      <div className={styles.container}>
        <Navbar />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>{!isConfigured ? 'Database not configured' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  // Results step gets expanded treatment (with navbar, but no main wrapper constraints)
  if (currentStep === 'results' && generatedResume && tailoredResume && jobDescription) {
    return (
      <div className={styles.container}>
        <Navbar />
        <ResultsStep
          originalResume={generatedResume}
          tailoredResume={tailoredResume}
          jobDescription={jobDescription}
          onStartOver={handleReset}
        />
      </div>
    )
  }

  return (
    <div className={styles.container} data-tour="tailor-page">
      <Navbar />

      {/* Secondary toolbar */}
      <div className={styles.toolbar}>
        <button onClick={handleReset} className={styles.startOverBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Start Over
        </button>
      </div>

      {/* Main Content */}
      <main className={styles.main}>
        {currentStep === 'job' && (
          <JobDescriptionStep
            onContinue={handleJobComplete}
          />
        )}

        {currentStep === 'tailoring' && (
          <TailoringStep
            thoughts={thoughts}
            currentPhase={currentPhase}
            error={error}
            progress={progress}
            onRetry={handleRetry}
          />
        )}
      </main>
    </div>
  )
}
