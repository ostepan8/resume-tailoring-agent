'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { JobDescription } from './types'
import styles from '../tailor.module.css'
import loadingStyles from './JobLoadingStep.module.css'
import { createLogger } from '@/lib/logger'

const log = createLogger('JobDescriptionStep')

// Check if mock mode is enabled (set via NEXT_PUBLIC_ env var)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

interface ParsedJobData {
  title: string
  company: string
  location?: string
  employmentType?: string
  salaryRange?: string
  description: string
  aboutRole?: string
  aboutCompany?: string
  responsibilities: string[]
  requirements: string[]
  niceToHaves?: string[]
  technicalSkills?: string[]
  softSkills?: string[]
  experienceLevel?: string
  educationRequirements?: string[]
  benefits?: string[]
  keywords: string[]
  text?: string
  sourceUrl?: string
}

interface JobDescriptionStepProps {
  onContinue: (job: JobDescription) => void
}

// Simple URL validation
function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const JobDescriptionStep = React.memo(function JobDescriptionStep({
  onContinue,
}: JobDescriptionStepProps) {
  const [jobUrl, setJobUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [parsedJob, setParsedJob] = useState<ParsedJobData | null>(null)
  const [mode, setMode] = useState<'input' | 'review'>('input')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [jobText, setJobText] = useState('')

  // Manual override fields (in case AI gets it wrong)
  const [manualTitle, setManualTitle] = useState('')
  const [manualCompany, setManualCompany] = useState('')

  // Track if we're already fetching to prevent duplicate requests
  const fetchingRef = useRef(false)
  const lastFetchedUrlRef = useRef('')
  const mockLoadedRef = useRef(false)
  
  // Auth headers helper - Clerk handles auth automatically via cookies/middleware
  const getAuthHeaders = useCallback(() => {
    return { 'Content-Type': 'application/json' }
  }, [])

  // Auto-load mock data on mount if mock mode is enabled
  useEffect(() => {
    if (USE_MOCK && !mockLoadedRef.current) {
      mockLoadedRef.current = true
      setIsLoading(true)

      // Use a real sample job URL for mock mode (Toast careers page)
      const mockJobUrl = 'https://careers.toasttab.com/jobs/senior-fullstack-engineer'
      setJobUrl(mockJobUrl)

      // Fetch mock data from API (which will return mock instantly)
      fetch('/api/job/fetch', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ url: mockJobUrl }),
      })
        .then(res => res.json())
        .then(data => {
          setParsedJob(data)
          setManualTitle(data.title || '')
          setManualCompany(data.company || '')
          setMode('review')
        })
        .catch(() => {
          // Fallback - just show input
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [])

  // Fetch job from URL
  const fetchJobFromUrl = useCallback(async (url: string) => {
    if (!url.trim() || !isValidUrl(url)) return

    // Prevent duplicate fetches for the same URL
    if (fetchingRef.current || lastFetchedUrlRef.current === url) return

    fetchingRef.current = true
    lastFetchedUrlRef.current = url
    setIsLoading(true)
    setError(null)
    setErrorCode(null)

    try {
      const response = await fetch('/api/job/fetch', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Capture error code for special handling
        setErrorCode(data.errorCode || null)
        throw new Error(data.error || 'Failed to fetch job posting')
      }

      setParsedJob(data)
      setManualTitle(data.title || '')
      setManualCompany(data.company || '')
      setMode('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job posting')
      setShowManualEntry(true)
      // Reset so user can retry
      lastFetchedUrlRef.current = ''
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [])

  // Handle paste event - fetch immediately
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text').trim()
    if (isValidUrl(pastedText)) {
      setJobUrl(pastedText)
      fetchJobFromUrl(pastedText)
    }
  }, [fetchJobFromUrl])

  // Handle manual URL submission (button click or enter)
  const handleFetchClick = useCallback(() => {
    if (jobUrl.trim() && isValidUrl(jobUrl)) {
      // Reset the last fetched URL to allow refetch
      lastFetchedUrlRef.current = ''
      fetchJobFromUrl(jobUrl)
    }
  }, [jobUrl, fetchJobFromUrl])

  const handleParseText = async () => {
    log('handleParseText called')
    log('jobText length:', jobText.length)
    log('manualTitle:', manualTitle)
    log('manualCompany:', manualCompany)

    if (!jobText.trim() || jobText.length < 50) {
      log('ERROR: Job text too short')
      setError('Please enter at least 50 characters of job description')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      log('Calling /api/job/parse...')
      const response = await fetch('/api/job/parse', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text: jobText,
          title: manualTitle || undefined,
          company: manualCompany || undefined,
        }),
      })

      log('Response status:', response.status)
      const data = await response.json()
      log('Parsed job data:', data)

      if (!response.ok) {
        log('ERROR:', data.error)
        throw new Error(data.error || 'Failed to parse job description')
      }

      setParsedJob(data)
      setManualTitle(data.title || '')
      setManualCompany(data.company || '')
      setMode('review')
    } catch (err) {
      log('ERROR in handleParseText:', err)
      setError(err instanceof Error ? err.message : 'Failed to parse job description')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    log('handleContinue called')
    log('parsedJob:', parsedJob)

    if (!parsedJob) {
      log('ERROR: No parsed job')
      setError('Please fetch or parse a job description first')
      return
    }

    const title = manualTitle || parsedJob.title
    const company = manualCompany || parsedJob.company

    log('title:', title)
    log('company:', company)

    if (!title.trim()) {
      log('ERROR: No title')
      setError('Job title is required')
      return
    }
    if (!company.trim()) {
      log('ERROR: No company')
      setError('Company name is required')
      return
    }

    const job: JobDescription = {
      title,
      company,
      fullText: parsedJob.text || parsedJob.description,
      requirements: parsedJob.requirements || [],
      responsibilities: parsedJob.responsibilities || [],
      keywords: parsedJob.keywords || [],
      sourceUrl: parsedJob.sourceUrl || jobUrl || undefined,
    }

    log('Final job object:', job)
    log('fullText length:', job.fullText?.length)
    onContinue(job)
  }

  const handleBackToInput = () => {
    setMode('input')
    setError(null)
    setErrorCode(null)
    setParsedJob(null)
    setShowManualEntry(false)
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className={loadingStyles.loadingWrapper}>
        {/* Background effects */}
        <div className={loadingStyles.bgEffects}>
          <div className={loadingStyles.glowOrb1} />
          <div className={loadingStyles.glowOrb2} />
        </div>

        <div className={loadingStyles.loadingCard}>
          {/* Animated icon container */}
          <div className={loadingStyles.iconContainer}>
            <div className={loadingStyles.orbitRing1} />
            <div className={loadingStyles.orbitRing2} />
            <div className={loadingStyles.iconGlow} />
            <div className={loadingStyles.iconInner}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary-orange)"
                strokeWidth="2"
                className={loadingStyles.iconSvg}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className={loadingStyles.particle1} />
            <div className={loadingStyles.particle2} />
          </div>

          {/* Title */}
          <h2 className={loadingStyles.loadingTitle}>
            <span className={loadingStyles.titleAccent}>Analyzing</span> Job Posting
          </h2>
          <p className={loadingStyles.loadingSubtitle}>
            Extracting requirements, skills, and keywords
          </p>

          {/* Progress steps */}
          <div className={loadingStyles.stepsContainer}>
            <div className={loadingStyles.stepItem}>
              <div className={`${loadingStyles.stepDot} ${loadingStyles.stepActive}`} />
              <span>Fetching page content</span>
            </div>
            <div className={loadingStyles.stepConnector}>
              <div className={loadingStyles.stepConnectorFill} />
            </div>
            <div className={loadingStyles.stepItem}>
              <div className={loadingStyles.stepDot} />
              <span>Parsing requirements</span>
            </div>
            <div className={loadingStyles.stepConnector} />
            <div className={loadingStyles.stepItem}>
              <div className={loadingStyles.stepDot} />
              <span>Extracting keywords</span>
            </div>
          </div>

          {/* Shimmer progress bar */}
          <div className={loadingStyles.progressTrack}>
            <div className={loadingStyles.progressShimmer} />
          </div>

          <p className={loadingStyles.etaText}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            This usually takes 10-20 seconds
          </p>
        </div>
      </div>
    )
  }

  // Render input mode
  if (mode === 'input') {
    return (
      <div data-tour="job-input">
        <div className={styles.stepHeader}>
          <div className={styles.stepNumber}>1</div>
          <h1 className={styles.stepTitle}>Add Job Posting</h1>
          <p className={styles.stepDescription}>
            Paste the job posting URL to analyze
          </p>
        </div>

        <div className={styles.card}>
          {/* URL Input - Primary */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Job Posting URL</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="url"
                className={styles.input}
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && jobUrl.trim()) {
                    e.preventDefault()
                    handleFetchClick()
                  }
                }}
                placeholder="Paste job URL here (e.g., linkedin.com/jobs/...)"
                autoFocus
                style={{
                  fontSize: '1rem',
                  padding: '1rem 1.25rem',
                  flex: 1,
                }}
              />
              <button
                className={styles.primaryButton}
                onClick={handleFetchClick}
                disabled={!jobUrl.trim() || !isValidUrl(jobUrl)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '0 1.5rem',
                }}
              >
                Fetch
                <span>→</span>
              </button>
            </div>
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--color-background-cream)',
              opacity: 0.5,
              marginTop: '0.5rem'
            }}>
              Paste a job URL and we&apos;ll extract the details automatically
            </p>
          </div>

          {error && (
            <div className={styles.errorBox} style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{
                  flexShrink: 0,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255, 100, 100, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
                  {errorCode === 'page_access_error' && (
                    <p style={{ 
                      margin: '0.5rem 0 0 0', 
                      fontSize: '0.85rem', 
                      opacity: 0.8 
                    }}>
                      💡 <strong>Tip:</strong> Copy the job description text from the page and paste it below instead.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manual Entry Toggle */}
          {!showManualEntry && (
            <button
              onClick={() => setShowManualEntry(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-background-cream)',
                opacity: 0.6,
                fontSize: '0.9rem',
                cursor: 'pointer',
                padding: '1rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Or paste job description manually
            </button>
          )}

          {/* Manual Entry Section */}
          {showManualEntry && (
            <>
              <div className={styles.orDivider} style={{ margin: '1.5rem 0' }}>
                <span className={styles.orDividerText}>or enter manually</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Job Title</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Company Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    placeholder="e.g., Acme Corp"
                  />
                </div>
              </div>

              <div className={styles.textareaContainer} style={{ marginTop: '1rem' }}>
                <textarea
                  className={styles.textarea}
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={10}
                />
                <span className={styles.textareaCount}>
                  {jobText.length} characters
                </span>
              </div>

              <button
                className={styles.primaryButton}
                onClick={handleParseText}
                disabled={jobText.length < 50}
                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
              >
                Parse Job Description
                <span>→</span>
              </button>
            </>
          )}

        </div>
      </div>
    )
  }

  // Render review mode (after parsing)
  return (
    <div>
      <div className={styles.stepHeader}>
        <div className={styles.stepNumber}>1</div>
        <h1 className={styles.stepTitle}>Review Job Details</h1>
        <p className={styles.stepDescription}>
          Verify the extracted information is correct
        </p>
      </div>

      <div className={styles.card}>
        {/* Editable Title and Company */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Job Title</label>
            <input
              type="text"
              className={styles.input}
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Job title"
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Company</label>
            <input
              type="text"
              className={styles.input}
              value={manualCompany}
              onChange={(e) => setManualCompany(e.target.value)}
              placeholder="Company name"
            />
          </div>
        </div>

        {/* Job Meta */}
        {(parsedJob?.location || parsedJob?.employmentType || parsedJob?.salaryRange) && (
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
          }}>
            {parsedJob?.location && (
              <div style={{
                fontSize: '0.9rem',
                color: 'var(--color-background-cream)',
                opacity: 0.8
              }}>
                📍 {parsedJob.location}
              </div>
            )}
            {parsedJob?.employmentType && (
              <div style={{
                fontSize: '0.9rem',
                color: 'var(--color-background-cream)',
                opacity: 0.8
              }}>
                💼 {parsedJob.employmentType}
              </div>
            )}
            {parsedJob?.salaryRange && (
              <div style={{
                fontSize: '0.9rem',
                color: 'var(--color-background-cream)',
                opacity: 0.8
              }}>
                💰 {parsedJob.salaryRange}
              </div>
            )}
            {parsedJob?.experienceLevel && (
              <div style={{
                fontSize: '0.9rem',
                color: 'var(--color-background-cream)',
                opacity: 0.8
              }}>
                📊 {parsedJob.experienceLevel}
              </div>
            )}
          </div>
        )}

        {/* Requirements */}
        {parsedJob?.requirements && parsedJob.requirements.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              color: 'var(--color-background-cream)',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{
                background: 'var(--color-primary-orange)',
                color: 'var(--color-primary-black)',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {parsedJob.requirements.length}
              </span>
              Requirements
            </h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {parsedJob.requirements.slice(0, 6).map((req, i) => (
                <li key={i} style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-background-cream)',
                  opacity: 0.9,
                  paddingLeft: '1rem',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    color: 'var(--color-primary-orange)'
                  }}>•</span>
                  {req}
                </li>
              ))}
              {parsedJob.requirements.length > 6 && (
                <li style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-background-cream)',
                  opacity: 0.5,
                  paddingLeft: '1rem'
                }}>
                  +{parsedJob.requirements.length - 6} more requirements
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Keywords */}
        {parsedJob?.keywords && parsedJob.keywords.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              color: 'var(--color-background-cream)',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.75rem'
            }}>
              Key Skills & Keywords
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {parsedJob.keywords.map((keyword, i) => (
                <span key={i} style={{
                  background: 'rgba(181, 232, 0, 0.15)',
                  color: 'var(--color-accent-green)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '100px',
                  fontSize: '0.8rem',
                  fontWeight: 500
                }}>
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Technical Skills */}
        {parsedJob?.technicalSkills && parsedJob.technicalSkills.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              color: 'var(--color-background-cream)',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.75rem'
            }}>
              Technical Skills
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {parsedJob.technicalSkills.map((skill, i) => (
                <span key={i} style={{
                  background: 'rgba(255, 92, 40, 0.15)',
                  color: 'var(--color-primary-orange)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '100px',
                  fontSize: '0.8rem',
                  fontWeight: 500
                }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Responsibilities (collapsed) */}
        {parsedJob?.responsibilities && parsedJob.responsibilities.length > 0 && (
          <details style={{ marginBottom: '1.5rem' }}>
            <summary style={{
              color: 'var(--color-background-cream)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: 0.8
            }}>
              View {parsedJob.responsibilities.length} Responsibilities
            </summary>
            <ul style={{
              listStyle: 'none',
              padding: '0.75rem 0 0 0',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {parsedJob.responsibilities.map((resp, i) => (
                <li key={i} style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-background-cream)',
                  opacity: 0.8,
                  paddingLeft: '1rem',
                  position: 'relative'
                }}>
                  <span style={{ position: 'absolute', left: 0, opacity: 0.5 }}>•</span>
                  {resp}
                </li>
              ))}
            </ul>
          </details>
        )}

        {error && (
          <div className={styles.errorBox}>
            <p>{error}</p>
          </div>
        )}

        <div className={styles.buttonRow}>
          <button className={styles.backButton} onClick={handleBackToInput}>
            <span>←</span>
            Edit
          </button>
          <button
            className={styles.primaryButton}
            onClick={handleContinue}
            disabled={!manualTitle.trim() || !manualCompany.trim()}
          >
            Continue
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  )
})

export default JobDescriptionStep
