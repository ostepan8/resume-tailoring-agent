'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { pdf } from '@react-pdf/renderer'
import { ResumePDF } from '../../../../resume-test/pdf-components'
import { PDFPreview } from '../../../../tailor/components/PDFPreview'
import { SaveResumeModal } from '../../../../tailor/components/SaveResumeModal'
import { UnifiedSidebar, EditPanel, SaveStateIndicator, extractSectionMeta } from '../../../../tailor/components/ResumeEditor'
import type { SidebarView } from '../../../../tailor/components/ResumeEditor'
import type { SaveState } from '../../../../tailor/components/ResumeEditor/types'
import type { ResumeDocument, ResumeBlock } from '../../../../resume-test/types'
import type { TailoredResume, JobDescription } from '../../../../tailor/components/types'
import { useAuth } from '../../../../../lib/auth-context'
import styles from '../../../../tailor/components/results.module.css'

// Debounce delays
const PREVIEW_DEBOUNCE_MS = 500

// Check if we're explicitly in mock/demo mode
const IS_MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

interface StoredResumeContent {
    blocks: ResumeBlock[]
    metadata: {
        targetJob?: string
        targetCompany?: string
    }
    tailoredData: {
        experience?: unknown[]
        education?: unknown[]
        skills?: unknown
        projects?: unknown[]
        contactInfo?: unknown
        summary?: string
    }
}

interface StoredResume {
    id: string
    name: string
    content: string
    file_url: string | null
    match_score: number | null
    target_job_id: string | null
    created_at: string
    saved_job?: {
        id: string
        title: string
        company: string | null
        url: string | null
        description?: string
    }
}

function loadMockResumeById(id: string): StoredResume | null {
    if (typeof window === 'undefined') return null
    try {
        const savedResumes = JSON.parse(localStorage.getItem('mockSavedResumes') || '[]')
        const resume = savedResumes.find((r: { id: string }) => r.id === id)
        if (!resume) return null
        
        return {
            id: resume.id,
            name: resume.name,
            content: JSON.stringify(resume.content || {}),
            file_url: resume.fileUrl || null,
            match_score: resume.matchScore || null,
            target_job_id: resume.targetJob?.id || null,
            created_at: resume.createdAt,
            saved_job: resume.targetJob ? {
                id: resume.targetJob.id,
                title: resume.targetJob.title,
                company: resume.targetJob.company,
                url: resume.targetJob.url || null,
                description: resume.targetJob.description,
            } : undefined,
        }
    } catch (e) {
        console.warn('Failed to load mock resume:', e)
        return null
    }
}

export default function EditResumePage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const resumeId = params?.id as string

    // Loading state
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Resume data
    const [storedResume, setStoredResume] = useState<StoredResume | null>(null)
    const [resumeDoc, setResumeDoc] = useState<ResumeDocument | null>(null)
    const [jobDescription, setJobDescription] = useState<JobDescription | null>(null)
    const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(null)

    // View state
    const [activeView, setActiveView] = useState<SidebarView>({ type: 'edit', sectionId: '' })

    // UI state
    const [isGenerating, setIsGenerating] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [saveState, setSaveState] = useState<SaveState>('saved')
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [showSaveModal, setShowSaveModal] = useState(false)
    const [isSaved, setIsSaved] = useState(true)

    // Refs
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const previewUrlRef = useRef<string | null>(null)
    const isInitialMount = useRef(true)

    // Load resume data
    useEffect(() => {
        async function loadResume() {
            if (!resumeId) {
                setError('No resume ID provided')
                setLoading(false)
                return
            }

            try {
                let resume: StoredResume | null = null

                // Try mock mode first
                if (IS_MOCK_MODE || resumeId.startsWith('mock-')) {
                    resume = loadMockResumeById(resumeId)
                } else if (user?.id) {
                    // Load from Supabase - Clerk handles auth automatically via cookies
                    const response = await fetch(`/api/resume/${resumeId}`, {
                        credentials: 'include',
                    })
                    
                    if (response.ok) {
                        const data = await response.json()
                        resume = data.resume
                    }
                }

                if (!resume) {
                    setError('Resume not found')
                    setLoading(false)
                    return
                }

                setStoredResume(resume)

                // Parse the content
                let content: StoredResumeContent
                try {
                    content = JSON.parse(resume.content)
                } catch {
                    setError('Failed to parse resume content')
                    setLoading(false)
                    return
                }

                // Create ResumeDocument from blocks
                const doc: ResumeDocument = {
                    blocks: content.blocks || [],
                    metadata: {
                        templateId: 'default',
                        targetJob: content.metadata?.targetJob || resume.saved_job?.title || '',
                        targetCompany: content.metadata?.targetCompany || resume.saved_job?.company || '',
                    },
                }
                setResumeDoc(doc)

                // Set initial active section
                if (doc.blocks.length > 0) {
                    setActiveView({ type: 'edit', sectionId: doc.blocks[0].id })
                }

                // Create JobDescription
                const job: JobDescription = {
                    title: resume.saved_job?.title || content.metadata?.targetJob || 'Unknown Position',
                    company: resume.saved_job?.company || content.metadata?.targetCompany || 'Unknown Company',
                    fullText: resume.saved_job?.description || '',
                    sourceUrl: resume.saved_job?.url || undefined,
                }
                setJobDescription(job)

                // Create minimal TailoredResume for the save modal
                const tailored: TailoredResume = {
                    fullText: '',
                    sections: [],
                    contactInfo: content.tailoredData?.contactInfo as TailoredResume['contactInfo'],
                    experience: content.tailoredData?.experience as TailoredResume['experience'],
                    education: content.tailoredData?.education as TailoredResume['education'],
                    skills: content.tailoredData?.skills as TailoredResume['skills'],
                    projects: content.tailoredData?.projects as TailoredResume['projects'],
                    professionalSummary: content.tailoredData?.summary,
                    matchScore: resume.match_score || undefined,
                    summary: {
                        totalChanges: 0,
                        keyImprovements: [],
                        keywordsAdded: [],
                    },
                }
                setTailoredResume(tailored)

                setLastSavedAt(new Date(resume.created_at))
                setLoading(false)
            } catch (err) {
                console.error('Error loading resume:', err)
                setError('Failed to load resume')
                setLoading(false)
            }
        }

        loadResume()
    }, [resumeId, user?.id])

    // Derive activeSection from activeView
    const activeSection = activeView.type === 'edit' ? activeView.sectionId : null

    // Section metadata for nav
    const sectionMetas = useMemo(
        () => resumeDoc ? extractSectionMeta(resumeDoc.blocks) : [],
        [resumeDoc]
    )

    // Generate preview function
    const generatePreviewInternal = useCallback(async (doc: ResumeDocument) => {
        setIsGenerating(true)
        try {
            const blob = await pdf(<ResumePDF document={doc} />).toBlob()
            const url = URL.createObjectURL(blob)

            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current)
            }

            previewUrlRef.current = url
            setPreviewUrl(url)
        } catch (error) {
            console.error('[EditResume] Error generating PDF:', error)
        } finally {
            setIsGenerating(false)
        }
    }, [])

    // Auto-generate preview on mount and debounce on changes
    useEffect(() => {
        if (!resumeDoc) return

        if (isInitialMount.current) {
            isInitialMount.current = false
            generatePreviewInternal(resumeDoc)
            return
        }

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current)
        }

        debounceTimeoutRef.current = setTimeout(() => {
            generatePreviewInternal(resumeDoc)
        }, PREVIEW_DEBOUNCE_MS)

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
        }
    }, [resumeDoc, generatePreviewInternal])

    // Cleanup URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current)
            }
        }
    }, [])

    // Handle view change from sidebar
    const handleViewChange = useCallback((view: SidebarView) => {
        setActiveView(view)
    }, [])

    // Handle visibility toggle
    const handleToggleVisibility = useCallback((sectionId: string) => {
        setResumeDoc((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                blocks: prev.blocks.map((block) =>
                    block.id === sectionId ? { ...block, enabled: !block.enabled } : block
                ),
            }
        })
        setSaveState('unsaved')
        setIsSaved(false)
    }, [])

    // Handle block data update
    const handleBlockUpdate = useCallback(
        (blockId: string, data: ResumeBlock['data']) => {
            setResumeDoc((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    blocks: prev.blocks.map((block) =>
                        block.id === blockId ? { ...block, data } : block
                    ) as ResumeBlock[],
                }
            })
            setSaveState('unsaved')
            setIsSaved(false)
        },
        []
    )

    // Download PDF
    const downloadPDF = useCallback(async () => {
        if (!resumeDoc) return
        
        setIsGenerating(true)
        try {
            const blob = await pdf(<ResumePDF document={resumeDoc} />).toBlob()
            const url = URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.href = url
            a.download = `${storedResume?.name || 'Resume'}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error downloading PDF:', error)
        } finally {
            setIsGenerating(false)
        }
    }, [resumeDoc, storedResume?.name])

    // Handle apply (open job URL)
    const handleApply = useCallback(() => {
        if (jobDescription?.sourceUrl) {
            window.open(jobDescription.sourceUrl, '_blank')
        }
    }, [jobDescription?.sourceUrl])

    // Handle save success
    const handleSaveSuccess = useCallback(() => {
        setIsSaved(true)
        setSaveState('saved')
        setLastSavedAt(new Date())
    }, [])

    // Loading state
    if (loading) {
        return (
            <div className={styles.resultsContainer}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100vh',
                    color: 'rgba(255, 255, 255, 0.6)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            border: '3px solid rgba(255, 255, 255, 0.1)',
                            borderTopColor: 'var(--color-primary-orange)',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            margin: '0 auto 1rem',
                        }} />
                        <p>Loading resume...</p>
                    </div>
                </div>
            </div>
        )
    }

    // Error state
    if (error || !resumeDoc || !jobDescription || !tailoredResume) {
        return (
            <div className={styles.resultsContainer}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100vh',
                    flexDirection: 'column',
                    gap: '1rem',
                }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: 'rgba(255, 107, 107, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    </div>
                    <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600 }}>
                        {error || 'Failed to load resume'}
                    </h2>
                    <Link 
                        href="/dashboard/resumes"
                        style={{
                            color: 'var(--color-primary-orange)',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                        }}
                    >
                        ← Back to Resumes
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.resultsContainer}>
            {/* Header */}
            <header className={styles.resultsHeader}>
                <div className={styles.headerContent}>
                    <div className={styles.headerLeft}>
                        <Link
                            href="/dashboard/resumes"
                            className={styles.backButton}
                            aria-label="Back to resumes"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className={styles.headerTitle}>Edit Resume</h1>
                            <p className={styles.headerSubtitle}>
                                {jobDescription.title} <span className={styles.headerCompany}>@ {jobDescription.company}</span>
                            </p>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <SaveStateIndicator state={saveState} lastSavedAt={lastSavedAt} />
                        {storedResume?.match_score && (
                            <div className={styles.matchBadge}>
                                <span className={styles.matchValue}>{storedResume.match_score}%</span>
                                <span className={styles.matchLabel}>match</span>
                            </div>
                        )}
                        <button
                            className={styles.actionButton}
                            onClick={() => setShowSaveModal(true)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            Save As New
                        </button>
                        <button
                            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                            onClick={downloadPDF}
                            disabled={isGenerating}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download PDF
                        </button>
                        {jobDescription.sourceUrl && (
                            <button
                                className={`${styles.actionButton} ${styles.actionButtonSuccess}`}
                                onClick={handleApply}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                Apply Now
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className={styles.editorLayout}>
                {/* Left: Sidebar - simplified for edit-only mode */}
                <div className={styles.sectionNavPane}>
                    <UnifiedSidebar
                        sections={sectionMetas}
                        activeView={activeView}
                        onViewChange={handleViewChange}
                        onToggleVisibility={handleToggleVisibility}
                        editOnlyMode={true}
                    />
                </div>

                {/* Main Content Area */}
                <div className={styles.mainContentArea}>
                    {/* Edit Panel */}
                    <div className={styles.editPane}>
                        <EditPanel
                            blocks={resumeDoc.blocks}
                            activeSection={activeSection}
                            onUpdate={handleBlockUpdate}
                        />
                    </div>

                    {/* Preview */}
                    <div className={styles.previewPane}>
                        <div className={styles.previewHeader}>
                            <h3 className={styles.previewTitle}>Preview</h3>
                            <div className={styles.previewActions}>
                                <button
                                    className={styles.refreshButton}
                                    onClick={() => generatePreviewInternal(resumeDoc)}
                                    disabled={isGenerating}
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className={isGenerating ? styles.spinning : ''}
                                    >
                                        <path d="M23 4v6h-6M1 20v-6h6" />
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                    </svg>
                                    {isGenerating ? 'Updating...' : 'Refresh'}
                                </button>
                                {previewUrl && (
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.openPdfButton}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                        Open PDF
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className={styles.previewContent}>
                            {isGenerating && !previewUrl && (
                                <div className={styles.previewLoading}>
                                    <div className={styles.previewSpinner} />
                                    <p>Generating preview...</p>
                                </div>
                            )}
                            {previewUrl && (
                                <PDFPreview url={previewUrl} isGenerating={isGenerating} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <SaveResumeModal
                    isOpen={showSaveModal}
                    onClose={() => setShowSaveModal(false)}
                    resumeDoc={resumeDoc}
                    tailoredResume={tailoredResume}
                    jobDescription={jobDescription}
                    onSaveSuccess={handleSaveSuccess}
                />
            )}
        </div>
    )
}
