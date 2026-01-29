'use client'

import React, { useState, useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import { ResumePDF } from '../../resume-test/pdf-components'
import { useAuth } from '../../../lib/auth-context'
import { resumeStorage, isSupabaseConfigured } from '../../../lib/database'
import type { ResumeDocument } from '../../resume-test/types'
import type { JobDescription, TailoredResume, ParsedResume } from './types'
import styles from './results.module.css'

// Check if we're explicitly in mock/demo mode (NOT just development)
// In development, we still use real Supabase if configured
const IS_MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

interface SaveResumeModalProps {
    isOpen: boolean
    onClose: () => void
    resumeDoc: ResumeDocument
    tailoredResume: TailoredResume
    jobDescription: JobDescription
    originalResume?: ParsedResume
    onSaveSuccess?: (resumeId: string) => void
}

type SaveStatus = 'idle' | 'generating' | 'uploading' | 'saving' | 'success' | 'error'

export function SaveResumeModal({
    isOpen,
    onClose,
    resumeDoc,
    tailoredResume,
    jobDescription,
    originalResume,
    onSaveSuccess,
}: SaveResumeModalProps) {
    const { user } = useAuth()
    const [resumeName, setResumeName] = useState(
        `${jobDescription.company} - ${jobDescription.title}`
    )
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
    const [statusMessage, setStatusMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [savedResumeId, setSavedResumeId] = useState<string | null>(null)

    const handleSave = useCallback(async () => {
        // In mock mode or when Supabase isn't configured, skip auth check
        const isMockMode = IS_MOCK_MODE || !isSupabaseConfigured
        
        if (!isMockMode && !user) {
            setErrorMessage('You must be logged in to save resumes')
            setSaveStatus('error')
            return
        }

        try {
            // Step 1: Generate PDF
            setSaveStatus('generating')
            setStatusMessage('Generating PDF...')

            const blob = await pdf(<ResumePDF document={resumeDoc} />).toBlob()
            const file = new File([blob], `${resumeName}.pdf`, { type: 'application/pdf' })

            let fileUrl: string | undefined

            // Step 2: Upload to storage (skip in mock mode)
            if (isMockMode) {
                setSaveStatus('uploading')
                setStatusMessage('Uploading to storage... (mock)')
                // Convert blob to base64 data URL for persistence in localStorage
                const reader = new FileReader()
                fileUrl = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.readAsDataURL(blob)
                })
                await new Promise(resolve => setTimeout(resolve, 300)) // Small delay for UX
            } else {
                setSaveStatus('uploading')
                setStatusMessage('Uploading to storage...')
                const uploadResult = await resumeStorage.upload(user!.id, file, resumeName)
                
                if (!uploadResult.success) {
                    throw new Error(uploadResult.error || 'Failed to upload PDF')
                }
                fileUrl = uploadResult.fileUrl
            }

            // Step 3: Save to database
            setSaveStatus('saving')
            setStatusMessage('Saving resume record...')

            // Clerk handles auth automatically via cookies/middleware
            const response = await fetch('/api/resume/save-tailored', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: resumeName,
                    content: {
                        blocks: resumeDoc.blocks,
                        metadata: resumeDoc.metadata,
                        tailoredData: {
                            experience: tailoredResume.experience,
                            education: tailoredResume.education,
                            skills: tailoredResume.skills,
                            projects: tailoredResume.projects,
                            contactInfo: tailoredResume.contactInfo,
                            summary: tailoredResume.summary,
                        },
                    },
                    fileUrl: fileUrl,
                    matchScore: tailoredResume.matchScore,
                    targetJob: {
                        title: jobDescription.title,
                        company: jobDescription.company,
                        url: jobDescription.sourceUrl,
                        description: jobDescription.fullText,
                    },
                    originalResume: originalResume || null,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to save resume')
            }

            const result = await response.json()

            // In mock mode, save to localStorage for persistence
            if (result.mockMode && result.savedData) {
                try {
                    const existingResumes = JSON.parse(localStorage.getItem('mockSavedResumes') || '[]')
                    existingResumes.unshift(result.savedData) // Add to beginning
                    localStorage.setItem('mockSavedResumes', JSON.stringify(existingResumes))
                    console.log('[MOCK MODE] Saved resume to localStorage:', result.savedData.name)
                } catch (e) {
                    console.warn('Failed to save to localStorage:', e)
                }
            }

            setSaveStatus('success')
            setStatusMessage(isMockMode ? 'Resume saved successfully! (Demo Mode)' : 'Resume saved successfully!')
            setSavedResumeId(result.resumeId)

            if (onSaveSuccess) {
                onSaveSuccess(result.resumeId)
            }

        } catch (err) {
            console.error('Error saving resume:', err)
            setErrorMessage(err instanceof Error ? err.message : 'Failed to save resume')
            setSaveStatus('error')
        }
    }, [user, resumeDoc, resumeName, tailoredResume, jobDescription, originalResume, onSaveSuccess])

    const handleClose = () => {
        // Reset state when closing
        setSaveStatus('idle')
        setStatusMessage('')
        setErrorMessage('')
        setSavedResumeId(null)
        onClose()
    }

    if (!isOpen) return null

    const isProcessing = ['generating', 'uploading', 'saving'].includes(saveStatus)

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Save Resume</h2>
                    <button onClick={handleClose} className={styles.modalCloseBtn} disabled={isProcessing}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className={styles.modalContent}>
                    {saveStatus === 'success' ? (
                        <div className={styles.successState}>
                            <div className={styles.successIcon}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <h3>Resume Saved!</h3>
                            <p>Your tailored resume has been saved to your dashboard.</p>
                            <div className={styles.successActions}>
                                <a href="/dashboard/resumes" className={styles.viewDashboardBtn}>
                                    View in Dashboard
                                </a>
                                <button onClick={handleClose} className={styles.closeModalBtn}>
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : saveStatus === 'error' ? (
                        <div className={styles.errorState}>
                            <div className={styles.errorIcon}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" y1="9" x2="9" y2="15" />
                                    <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            </div>
                            <h3>Error Saving Resume</h3>
                            <p>{errorMessage}</p>
                            <button onClick={() => setSaveStatus('idle')} className={styles.retryBtn}>
                                Try Again
                            </button>
                        </div>
                    ) : isProcessing ? (
                        <div className={styles.processingState}>
                            <div className={styles.processingSpinner} />
                            <h3>{statusMessage}</h3>
                            <div className={styles.processingSteps}>
                                <div className={`${styles.processingStep} ${saveStatus === 'generating' ? styles.active : ''} ${['uploading', 'saving'].includes(saveStatus) ? styles.done : ''}`}>
                                    <span>1</span> Generate PDF
                                </div>
                                <div className={`${styles.processingStep} ${saveStatus === 'uploading' ? styles.active : ''} ${saveStatus === 'saving' ? styles.done : ''}`}>
                                    <span>2</span> Upload
                                </div>
                                <div className={`${styles.processingStep} ${saveStatus === 'saving' ? styles.active : ''}`}>
                                    <span>3</span> Save
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={styles.formGroup}>
                                <label htmlFor="resumeName">Resume Name</label>
                                <input
                                    id="resumeName"
                                    type="text"
                                    value={resumeName}
                                    onChange={(e) => setResumeName(e.target.value)}
                                    placeholder="Enter a name for this resume"
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.savePreview}>
                                <div className={styles.previewItem}>
                                    <span className={styles.previewLabel}>Target Position</span>
                                    <span className={styles.previewValue}>{jobDescription.title}</span>
                                </div>
                                <div className={styles.previewItem}>
                                    <span className={styles.previewLabel}>Company</span>
                                    <span className={styles.previewValue}>{jobDescription.company}</span>
                                </div>
                                {tailoredResume.matchScore && (
                                    <div className={styles.previewItem}>
                                        <span className={styles.previewLabel}>Match Score</span>
                                        <span className={styles.previewScore}>{tailoredResume.matchScore}%</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.modalActions}>
                                <button onClick={handleClose} className={styles.cancelBtn}>
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className={styles.saveBtn}
                                    disabled={!resumeName.trim()}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                        <polyline points="17 21 17 13 7 13 7 21" />
                                        <polyline points="7 3 7 8 15 8" />
                                    </svg>
                                    Save Resume
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SaveResumeModal
