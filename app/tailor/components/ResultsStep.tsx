'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { pdf } from '@react-pdf/renderer'
import { ResumePDF } from '../../resume-test/pdf-components'
import { PDFPreview } from './PDFPreview'
import { SaveResumeModal } from './SaveResumeModal'
import { UnifiedSidebar, EditPanel, SaveStateIndicator, extractSectionMeta } from './ResumeEditor'
import type { SidebarView, SummarySubview } from './ResumeEditor'
import type { SaveState } from './ResumeEditor/types'
import type {
    ResumeDocument,
    ResumeBlock,
    HeaderBlock,
    SummaryBlock,
    ExperienceBlock,
    EducationBlock,
    SkillsBlock,
    ProjectsBlock,
} from '../../resume-test/types'
import type {
    ParsedResume,
    TailoredResume,
    JobDescription,
} from './types'
import styles from './results.module.css'

// Debounce delays
const PREVIEW_DEBOUNCE_MS = 500
const SAVE_DEBOUNCE_MS = 1000

interface ResultsStepProps {
    originalResume: ParsedResume
    tailoredResume: TailoredResume
    jobDescription: JobDescription
    onStartOver: () => void
}

// Convert TailoredResume to block-based ResumeDocument
function tailoredResumeToDocument(
    tailored: TailoredResume,
    job: JobDescription
): ResumeDocument {
    const blocks: ResumeBlock[] = []
    let order = 0

    // Header block from contact info (order 0)
    if (tailored.contactInfo) {
        blocks.push({
            id: 'header-1',
            type: 'header',
            enabled: true,
            order: order++,
            data: {
                name: tailored.contactInfo.name || '',
                email: tailored.contactInfo.email,
                phone: tailored.contactInfo.phone,
                location: tailored.contactInfo.location,
                linkedin: tailored.contactInfo.linkedin,
                github: tailored.contactInfo.github,
                website: tailored.contactInfo.website,
            },
        } as HeaderBlock)
    }

    // Education block - right after header (order 1)
    if (tailored.education && tailored.education.length > 0) {
        blocks.push({
            id: 'education-1',
            type: 'education',
            enabled: true,
            order: order++,
            data: {
                entries: tailored.education.map(edu => ({
                    id: edu.id,
                    enabled: true,
                    institution: edu.institution,
                    degree: edu.degree,
                    field: edu.field,
                    location: edu.location,
                    startDate: edu.startDate,
                    endDate: edu.endDate,
                    gpa: edu.gpa,
                    highlights: edu.highlights,
                })),
            },
        } as EducationBlock)
    }

    // Summary block (order 2)
    let summaryText: string | undefined
    if (tailored.sections && Array.isArray(tailored.sections)) {
        const summarySection = tailored.sections.find(
            s => s.title.toLowerCase().includes('summary') || s.title.toLowerCase().includes('objective')
        )
        if (summarySection) {
            summaryText = summarySection.content
        }
    }
    if (!summaryText && tailored.fullText) {
        const summaryMatch = tailored.fullText.match(/SUMMARY\n([\s\S]*?)(?=\n\n[A-Z]+\n|\n\nEXPERIENCE|$)/i)
        if (summaryMatch) {
            summaryText = summaryMatch[1].trim()
        }
    }
    if (summaryText) {
        blocks.push({
            id: 'summary-1',
            type: 'summary',
            enabled: true,
            order: order++,
            data: {
                text: summaryText,
            },
        } as SummaryBlock)
    }

    // Experience block (order 3)
    if (tailored.experience && tailored.experience.length > 0) {
        blocks.push({
            id: 'experience-1',
            type: 'experience',
            enabled: true,
            order: order++,
            data: {
                entries: tailored.experience.map(exp => ({
                    id: exp.id,
                    enabled: true,
                    company: exp.company,
                    position: exp.position,
                    location: exp.location,
                    startDate: exp.startDate,
                    endDate: exp.endDate,
                    bullets: exp.bullets,
                })),
            },
        } as ExperienceBlock)
    }

    // Skills block (order 4)
    if (tailored.skills) {
        blocks.push({
            id: 'skills-1',
            type: 'skills',
            enabled: true,
            order: order++,
            data: {
                format: tailored.skills.format,
                skills: tailored.skills.skills,
                categories: tailored.skills.categories,
            },
        } as SkillsBlock)
    }

    // Projects block (order 5)
    if (tailored.projects && tailored.projects.length > 0) {
        blocks.push({
            id: 'projects-1',
            type: 'projects',
            enabled: true,
            order: order++,
            data: {
                entries: tailored.projects.map(proj => ({
                    id: proj.id,
                    enabled: true,
                    name: proj.name,
                    description: proj.description,
                    technologies: proj.technologies,
                    url: proj.url,
                    bullets: proj.bullets,
                })),
            },
        } as ProjectsBlock)
    }

    return {
        blocks,
        metadata: {
            targetJob: job.title,
            targetCompany: job.company,
        },
    }
}

export function ResultsStep({
    originalResume,
    tailoredResume,
    jobDescription,
    onStartOver,
}: ResultsStepProps) {
    // Document state
    const [resumeDoc, setResumeDoc] = useState<ResumeDocument>(() =>
        tailoredResumeToDocument(tailoredResume, jobDescription)
    )

    // Unified view state - either editing resume or viewing AI summary
    const [activeView, setActiveView] = useState<SidebarView>(() => {
        const initialDoc = tailoredResumeToDocument(tailoredResume, jobDescription)
        return initialDoc.blocks.length > 0
            ? { type: 'edit', sectionId: initialDoc.blocks[0].id }
            : { type: 'summary' }
    })

    // Derive activeSection from activeView for compatibility
    const activeSection = activeView.type === 'edit' ? activeView.sectionId : null

    // Ref for summary content scrolling
    const summaryContentRef = useRef<HTMLDivElement>(null)

    // UI state
    const [isGenerating, setIsGenerating] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [saveState, setSaveState] = useState<SaveState>('saved')
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date())

    // Modal and save state
    const [showSaveModal, setShowSaveModal] = useState(false)
    const [isSaved, setIsSaved] = useState(false)

    // Refs for debouncing
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const previewUrlRef = useRef<string | null>(null)
    const isInitialMount = useRef(true)
    const documentRef = useRef(resumeDoc)

    // Keep ref in sync
    useEffect(() => {
        documentRef.current = resumeDoc
    }, [resumeDoc])

    // Section metadata for nav
    const sectionMetas = useMemo(
        () => extractSectionMeta(resumeDoc.blocks),
        [resumeDoc.blocks]
    )


    // Generate preview function
    const generatePreviewInternal = useCallback(async (doc: ResumeDocument) => {
        setIsGenerating(true)
        try {
            const blob = await pdf(<ResumePDF document={doc} />).toBlob()
            const url = URL.createObjectURL(blob)

            // Revoke old URL
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current)
            }

            previewUrlRef.current = url
            setPreviewUrl(url)
        } catch (error) {
            console.error('[ResultsStep] Error generating PDF:', error)
        } finally {
            setIsGenerating(false)
        }
    }, [])

    // Auto-generate preview on mount and debounce on changes
    useEffect(() => {
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

        // Handle scroll for summary subviews
        if (view.type === 'summary' && view.scrollTo) {
            // Use setTimeout to ensure the DOM has updated
            setTimeout(() => {
                const element = document.getElementById(`summary-${view.scrollTo}`)
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }, 50)
        }
    }, [])

    // Handle visibility toggle
    const handleToggleVisibility = useCallback((sectionId: string) => {
        setResumeDoc((prev) => ({
            ...prev,
            blocks: prev.blocks.map((block) =>
                block.id === sectionId ? { ...block, enabled: !block.enabled } : block
            ),
        }))
        setSaveState('unsaved')
    }, [])

    // Handle block data update
    const handleBlockUpdate = useCallback(
        (blockId: string, data: ResumeBlock['data']) => {
            setResumeDoc((prev) => ({
                ...prev,
                blocks: prev.blocks.map((block) =>
                    block.id === blockId ? { ...block, data } : block
                ) as ResumeBlock[],
            }))
            setSaveState('unsaved')
        },
        []
    )

    // Auto-save effect
    useEffect(() => {
        if (saveState !== 'unsaved') return

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(() => {
            setSaveState('saving')
            // Simulate save - in production this would be an API call
            setTimeout(() => {
                setSaveState('saved')
                setLastSavedAt(new Date())
            }, 200)
        }, SAVE_DEBOUNCE_MS)

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [saveState])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                if (saveState === 'unsaved') {
                    setSaveState('saving')
                    setTimeout(() => {
                        setSaveState('saved')
                        setLastSavedAt(new Date())
                    }, 200)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [saveState])

    // Handle save success
    const handleSaveSuccess = useCallback((resumeId: string) => {
        setIsSaved(true)
    }, [])

    // Handle apply - opens job posting in new tab
    const handleApply = useCallback(() => {
        if (jobDescription.sourceUrl) {
            window.open(jobDescription.sourceUrl, '_blank')
        }
    }, [jobDescription.sourceUrl])

    // Download PDF
    const downloadPDF = useCallback(async () => {
        setIsGenerating(true)
        try {
            const blob = await pdf(<ResumePDF document={resumeDoc} />).toBlob()
            const url = URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.href = url
            a.download = `resume-${resumeDoc.metadata?.targetCompany || 'tailored'}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error downloading PDF:', error)
        } finally {
            setIsGenerating(false)
        }
    }, [resumeDoc])

    const summary = tailoredResume.summary

    return (
        <div className={styles.resultsContainer}>
            {/* Header */}
            <header className={styles.resultsHeader}>
                <div className={styles.headerContent}>
                    <div className={styles.headerLeft}>
                        <button
                            className={styles.backButton}
                            onClick={onStartOver}
                            aria-label="Start over"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className={styles.headerTitle}>Edit Resume</h1>
                            <p className={styles.headerSubtitle}>
                                {jobDescription.title} <span className={styles.headerCompany}>@ {jobDescription.company}</span>
                            </p>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <SaveStateIndicator state={saveState} lastSavedAt={lastSavedAt} />
                        {tailoredResume.matchScore && (
                            <div className={styles.matchBadge}>
                                <span className={styles.matchValue}>{tailoredResume.matchScore}%</span>
                                <span className={styles.matchLabel}>match</span>
                            </div>
                        )}
                        <button
                            className={styles.actionButton}
                            onClick={() => setShowSaveModal(true)}
                            disabled={isSaved}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            {isSaved ? 'Saved' : 'Save'}
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

            {/* Content - Unified layout */}
            <div className={styles.editorLayout}>
                {/* Left: Unified Sidebar with Edit/Summary navigation */}
                <div className={styles.sectionNavPane}>
                    <UnifiedSidebar
                        sections={sectionMetas}
                        activeView={activeView}
                        onViewChange={handleViewChange}
                        onToggleVisibility={handleToggleVisibility}
                        summary={summary}
                        hasRequirements={!!(jobDescription.requirements && jobDescription.requirements.length > 0)}
                    />
                </div>

                {/* Main Content Area: Edit/Summary + Preview */}
                <div className={styles.mainContentArea}>
                    {/* Edit/Summary Panel - Scrollable */}
                    <div className={styles.editPane}>
                        {activeView.type === 'edit' ? (
                            <EditPanel
                                blocks={resumeDoc.blocks}
                                activeSection={activeSection}
                                onUpdate={handleBlockUpdate}
                            />
                        ) : (
                            /* AI Summary Content - All sections stacked vertically for scrolling */
                            <div className={styles.summaryContent} ref={summaryContentRef}>
                                {/* Overview Section */}
                                <section id="summary-overview" className={styles.summarySection}>
                                    <h2 className={styles.summaryViewTitle}>AI Analysis Overview</h2>
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statCard}>
                                            <span className={styles.statValue}>{summary.totalChanges}</span>
                                            <span className={styles.statLabel}>Changes Made</span>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statValue}>{summary.keywordsAdded.length}</span>
                                            <span className={styles.statLabel}>Keywords Added</span>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statValue}>{summary.keyImprovements.length}</span>
                                            <span className={styles.statLabel}>Key Improvements</span>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statValue}>{resumeDoc.blocks.filter(b => b.enabled).length}</span>
                                            <span className={styles.statLabel}>Active Sections</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Key Improvements Section */}
                                <section id="summary-improvements" className={styles.summarySection}>
                                    <h2 className={styles.summaryViewTitle}>Key Improvements</h2>
                                    <p className={styles.summaryViewDescription}>
                                        The AI made {summary.keyImprovements.length} key improvements to your resume.
                                    </p>
                                    <ul className={styles.improvementsList}>
                                        {summary.keyImprovements.map((improvement, idx) => (
                                            <li key={idx} className={styles.improvementItem}>
                                                <span className={styles.improvementCheck}>✓</span>
                                                <span>{improvement}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>

                                {/* Keywords Section */}
                                <section id="summary-keywords" className={styles.summarySection}>
                                    <h2 className={styles.summaryViewTitle}>Keywords Added</h2>
                                    <p className={styles.summaryViewDescription}>
                                        These keywords were added to improve your match with the job description.
                                    </p>
                                    <div className={styles.keywordsList}>
                                        {summary.keywordsAdded.map((keyword, idx) => (
                                            <span key={idx} className={styles.keywordTag}>{keyword}</span>
                                        ))}
                                    </div>
                                </section>

                                {/* Requirements Section */}
                                {jobDescription.requirements && jobDescription.requirements.length > 0 && (
                                    <section id="summary-requirements" className={styles.summarySection}>
                                        <h2 className={styles.summaryViewTitle}>Job Requirements Matched</h2>
                                        <p className={styles.summaryViewDescription}>
                                            Your resume was tailored to match these job requirements.
                                        </p>
                                        <ul className={styles.requirementsList}>
                                            {jobDescription.requirements.map((req, idx) => (
                                                <li key={idx} className={styles.requirementItem}>
                                                    <span className={styles.requirementCheck}>✓</span>
                                                    <span>{req}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}

                                {/* Warnings Section */}
                                {summary.warnings && summary.warnings.length > 0 && (
                                    <section id="summary-warnings" className={`${styles.summarySection} ${styles.summarySectionWarning}`}>
                                        <h2 className={styles.summaryViewTitle}>Warnings</h2>
                                        <p className={styles.summaryViewDescription}>
                                            Review these warnings to further improve your resume.
                                        </p>
                                        <ul className={styles.warningsList}>
                                            {summary.warnings.map((warning, idx) => (
                                                <li key={idx} className={styles.warningItem}>{warning}</li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Preview - Large and prominent (always visible) */}
                    <div className={styles.previewPane}>
                        <div className={styles.previewHeader}>
                            <h3 className={styles.previewTitle}>Live Preview</h3>
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
                                <button
                                    className={`${styles.openPdfButton} ${styles.saveTailoredButton}`}
                                    onClick={() => setShowSaveModal(true)}
                                    disabled={isSaved}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                        <polyline points="17 21 17 13 7 13 7 21" />
                                        <polyline points="7 3 7 8 15 8" />
                                    </svg>
                                    {isSaved ? 'Saved to Dashboard' : 'Save to Tailored'}
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
                                        Open PDF in New Tab
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className={styles.previewContent}>
                            <PDFPreview url={previewUrl} isGenerating={isGenerating} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Resume Modal */}
            <SaveResumeModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                resumeDoc={resumeDoc}
                tailoredResume={tailoredResume}
                jobDescription={jobDescription}
                originalResume={originalResume}
                onSaveSuccess={handleSaveSuccess}
            />
        </div>
    )
}

export default ResultsStep
