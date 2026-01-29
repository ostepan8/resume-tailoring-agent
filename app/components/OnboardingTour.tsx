'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import styles from './OnboardingTour.module.css'

interface TourStep {
    id: string
    title: string
    description: string
    targetSelector?: string // CSS selector for element to highlight
    targetPage?: string // Page to navigate to for this step
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
    icon?: React.ReactNode
    requiresClick?: boolean // If true, user must click the highlighted element to continue
    clickNavigatesTo?: string // If set, clicking the element navigates here
    showDemo?: boolean // If true, show the demo/preview panel instead of highlighting
}

interface OnboardingTourProps {
    onComplete: () => void
    userName?: string
}

const TOUR_STEPS: TourStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to Resume Tailor!',
        description: 'Stop sending the same generic resume to every job. Our AI creates custom-tailored resumes that match exactly what employers are looking for.',
        position: 'center',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
        ),
    },
    {
        id: 'how-it-works',
        title: 'How It Works',
        description: 'First, you add all your experience, projects, and skills to one place. Then our AI pulls the most relevant items for each job you apply to—creating a unique, targeted resume every time.',
        position: 'center',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
            </svg>
        ),
    },
    {
        id: 'sidebar-nav',
        title: 'Your Experience Hub',
        description: 'This is where you store everything—work experience, projects, skills, education. Think of it as your master resume. The AI will pull from here when generating tailored versions.',
        targetSelector: '[data-tour="sidebar-nav"]',
        targetPage: '/dashboard',
        position: 'right',
    },
    {
        id: 'quick-actions',
        title: 'Add Your Background',
        description: 'Add your work history, projects, and skills here. The more you add, the better the AI can match your experience to job requirements.',
        targetSelector: '[data-tour="quick-actions"]',
        targetPage: '/dashboard',
        position: 'top',
    },
    {
        id: 'resumes-tab',
        title: 'Your Resume Library',
        description: 'This is where all your resumes live—both imported and AI-tailored versions. Click on it to see your collection!',
        targetSelector: '[data-tour="resumes-tab"]',
        targetPage: '/dashboard',
        position: 'right',
        requiresClick: true,
        clickNavigatesTo: '/dashboard/resumes',
    },
    {
        id: 'import-resume',
        title: 'Quick Start: Import a Resume',
        description: 'Already have a resume? Upload it here and we\'ll automatically parse your projects, experience, and skills—populating your registry in seconds.',
        targetSelector: '[data-tour="import-resume"]',
        targetPage: '/dashboard/resumes',
        position: 'bottom',
    },
    {
        id: 'tailor-button',
        title: 'Ready to Tailor?',
        description: 'When you find a job you want to apply for, click this button. Go ahead—click it now to see how tailoring works!',
        targetSelector: '[data-tour="tailor-button"]',
        targetPage: '/dashboard',
        position: 'right',
        requiresClick: true,
        clickNavigatesTo: '/tailor',
    },
    {
        id: 'tailor-demo',
        title: 'See How It Works',
        description: '',
        targetPage: '/tailor',
        position: 'center',
        showDemo: true,
    },
    {
        id: 'complete',
        title: 'You\'re Ready to Stand Out!',
        description: 'Start by adding your experience and projects, then tailor your first resume. Each application will be uniquely optimized to get you more interviews.',
        position: 'center',
        targetPage: '/dashboard',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        ),
    },
]

export default function OnboardingTour({ onComplete, userName }: OnboardingTourProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [isNavigating, setIsNavigating] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const pathname = usePathname()

    const step = TOUR_STEPS[currentStep]
    const isFirstStep = currentStep === 0
    const isLastStep = currentStep === TOUR_STEPS.length - 1
    const isCentered = step.position === 'center' || !step.targetSelector
    const requiresClick = step.requiresClick === true

    // Find and measure target element
    const updateTargetPosition = useCallback(() => {
        // For centered steps or demo steps, clear the target rect
        if (!step.targetSelector || step.position === 'center' || step.showDemo) {
            setTargetRect(null)
            return
        }

        const target = document.querySelector(step.targetSelector)
        if (target) {
            const rect = target.getBoundingClientRect()
            setTargetRect(rect)
        } else {
            setTargetRect(null)
        }
    }, [step.targetSelector, step.position, step.showDemo])

    // Initial animation
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 100)
        return () => clearTimeout(timer)
    }, [])

    // Navigate to correct page for current step
    useEffect(() => {
        if (step.targetPage && pathname !== step.targetPage && !isNavigating) {
            setIsNavigating(true)
            router.push(step.targetPage)
        }
    }, [step.targetPage, pathname, router, isNavigating])

    // Reset navigation flag when pathname changes
    useEffect(() => {
        if (step.targetPage === pathname) {
            setIsNavigating(false)
            // Wait for page to render, then find target
            const timer = setTimeout(updateTargetPosition, 300)
            return () => clearTimeout(timer)
        }
    }, [pathname, step.targetPage, updateTargetPosition])

    // Update target position on step change and window resize
    useEffect(() => {
        // Immediately clear targetRect when step changes to prevent stale positioning
        setTargetRect(null)
        
        // Then update to new position after a brief delay
        const timer = setTimeout(() => {
            updateTargetPosition()
        }, 50)
        
        const handleResize = () => updateTargetPosition()
        window.addEventListener('resize', handleResize)
        window.addEventListener('scroll', handleResize)
        
        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('scroll', handleResize)
        }
    }, [updateTargetPosition, currentStep])

    const handleComplete = useCallback(() => {
        setIsExiting(true)
        setTimeout(() => {
            onComplete()
            router.push('/dashboard')
        }, 300)
    }, [onComplete, router])

    const handleNext = useCallback(() => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            handleComplete()
        }
    }, [currentStep, handleComplete])

    const handlePrevious = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }, [currentStep])

    const handleSkip = useCallback(() => {
        handleComplete()
    }, [handleComplete])

    // Handle click on highlighted element (for requiresClick steps)
    const handleHighlightClick = useCallback(() => {
        if (step.requiresClick) {
            if (step.clickNavigatesTo) {
                router.push(step.clickNavigatesTo)
            }
            // Advance to next step after a brief delay for navigation
            setTimeout(() => {
                setCurrentStep(prev => prev + 1)
            }, 100)
        }
    }, [step.requiresClick, step.clickNavigatesTo, router])

    // Add click listener to highlighted element
    useEffect(() => {
        if (!step.requiresClick || !step.targetSelector) return

        const target = document.querySelector(step.targetSelector)
        if (target) {
            const clickHandler = (e: Event) => {
                e.preventDefault()
                e.stopPropagation()
                handleHighlightClick()
            }
            target.addEventListener('click', clickHandler, true)
            return () => target.removeEventListener('click', clickHandler, true)
        }
    }, [step.requiresClick, step.targetSelector, handleHighlightClick])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't allow keyboard next if click is required
            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                if (!requiresClick) {
                    handleNext()
                }
            } else if (e.key === 'ArrowLeft') {
                handlePrevious()
            } else if (e.key === 'Escape') {
                handleSkip()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleNext, handlePrevious, handleSkip, requiresClick])

    // Calculate tooltip position
    const getTooltipStyle = (): React.CSSProperties => {
        if (isCentered || !targetRect) {
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            }
        }

        const padding = 20
        const tooltipWidth = 380
        const tooltipHeight = 250 // Approximate height

        switch (step.position) {
            case 'right':
                // Ensure tooltip doesn't go off bottom of screen
                const rightTop = Math.min(
                    targetRect.top + targetRect.height / 2,
                    window.innerHeight - tooltipHeight / 2 - padding
                )
                return {
                    position: 'fixed',
                    top: Math.max(tooltipHeight / 2 + padding, rightTop),
                    left: targetRect.right + padding,
                    transform: 'translateY(-50%)',
                    maxWidth: Math.min(tooltipWidth, window.innerWidth - targetRect.right - padding * 2),
                }
            case 'left':
                const leftTop = Math.min(
                    targetRect.top + targetRect.height / 2,
                    window.innerHeight - tooltipHeight / 2 - padding
                )
                return {
                    position: 'fixed',
                    top: Math.max(tooltipHeight / 2 + padding, leftTop),
                    right: window.innerWidth - targetRect.left + padding,
                    transform: 'translateY(-50%)',
                    maxWidth: Math.min(tooltipWidth, targetRect.left - padding * 2),
                }
            case 'top':
                return {
                    position: 'fixed',
                    bottom: window.innerHeight - targetRect.top + padding,
                    left: Math.max(padding, Math.min(
                        targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
                        window.innerWidth - tooltipWidth - padding
                    )),
                    maxWidth: tooltipWidth,
                }
            case 'bottom':
            default:
                return {
                    position: 'fixed',
                    top: targetRect.bottom + padding,
                    left: Math.max(padding, Math.min(
                        targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
                        window.innerWidth - tooltipWidth - padding
                    )),
                    maxWidth: tooltipWidth,
                }
        }
    }

    // Get spotlight clip path
    const getSpotlightStyle = (): React.CSSProperties => {
        if (!targetRect || isCentered) {
            return {}
        }

        const padding = 8
        const x = targetRect.left - padding
        const y = targetRect.top - padding
        const width = targetRect.width + padding * 2
        const height = targetRect.height + padding * 2
        const radius = 12

        return {
            clipPath: `polygon(
                0% 0%, 0% 100%, 
                ${x}px 100%, ${x}px ${y + radius}px,
                ${x + radius}px ${y}px, ${x + width - radius}px ${y}px,
                ${x + width}px ${y + radius}px, ${x + width}px ${y + height - radius}px,
                ${x + width - radius}px ${y + height}px, ${x + radius}px ${y + height}px,
                ${x}px ${y + height - radius}px, ${x}px 100%,
                100% 100%, 100% 0%
            )`,
        }
    }

    const getTitle = () => {
        if (step.id === 'welcome' && userName) {
            return `Welcome, ${userName}!`
        }
        return step.title
    }

    return (
        <div className={`${styles.overlay} ${isVisible ? styles.visible : ''} ${isExiting ? styles.exiting : ''}`}>
            {/* Spotlight overlay */}
            <div 
                className={`${styles.spotlight} ${isCentered ? styles.dimmed : ''}`}
                style={{
                    ...getSpotlightStyle(),
                    pointerEvents: 'auto',
                }}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // Only allow skipping if click is not required
                    if (!requiresClick) {
                        handleSkip()
                    }
                }}
            />
            
            {/* Clickable area over target for requiresClick steps */}
            {targetRect && requiresClick && (
                <div 
                    className={styles.clickableTarget}
                    style={{
                        position: 'fixed',
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                        cursor: 'pointer',
                        zIndex: 100001,
                    }}
                    onClick={handleHighlightClick}
                />
            )}

            {/* Highlight ring around target */}
            {targetRect && !isCentered && (
                <div 
                    className={`${styles.highlightRing} ${requiresClick ? styles.clickable : ''}`}
                    style={{
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                        pointerEvents: requiresClick ? 'none' : 'none',
                    }}
                />
            )}

            {/* Demo Panel for tailor walkthrough */}
            {step.showDemo && (
                <div className={styles.demoPanel}>
                    <div className={styles.demoPanelInner}>
                        {/* Progress indicator */}
                        <div className={styles.progress}>
                            <div className={styles.progressTrack}>
                                <div 
                                    className={styles.progressFill}
                                    style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
                                />
                            </div>
                            <span className={styles.progressText}>
                                {currentStep + 1} / {TOUR_STEPS.length}
                            </span>
                        </div>

                        <h3 className={styles.demoTitle}>How Tailoring Works</h3>

                        <div className={styles.demoSteps}>
                            {/* Step 1 */}
                            <div className={styles.demoStep}>
                                <div className={styles.demoStepNumber}>1</div>
                                <div className={styles.demoStepContent}>
                                    <div className={styles.demoStepIcon}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4>Paste the Job URL</h4>
                                        <p>We automatically extract all the job details and requirements</p>
                                    </div>
                                </div>
                                <div className={styles.demoMockInput}>
                                    <span className={styles.demoMockUrl}>https://linkedin.com/jobs/view/software-engineer...</span>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className={styles.demoStep}>
                                <div className={styles.demoStepNumber}>2</div>
                                <div className={styles.demoStepContent}>
                                    <div className={styles.demoStepIcon}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8" />
                                            <path d="M21 21l-4.35-4.35" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4>Company Research</h4>
                                        <p>We search for company context, culture, and what they value</p>
                                    </div>
                                </div>
                                <div className={styles.demoMockResult}>
                                    <div className={styles.demoMockBullet}>
                                        <span className={styles.demoMockHighlight}>🏢 Culture</span>
                                        <span className={styles.demoMockHighlight}>📊 Tech Stack</span>
                                        <span className={styles.demoMockHighlight}>🎯 Values</span>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className={styles.demoStep}>
                                <div className={styles.demoStepNumber}>3</div>
                                <div className={styles.demoStepContent}>
                                    <div className={styles.demoStepIcon}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                            <path d="M2 17l10 5 10-5" />
                                            <path d="M2 12l10 5 10-5" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4>Your Perfect Resume</h4>
                                        <p>We combine your experience with job & company insights—fully ATS-optimized and editable in-app</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Resume Preview */}
                        <div className={styles.demoResumePreview}>
                            <div className={styles.demoResumePage}>
                                <div className={styles.demoResumeHeader}>
                                    <div className={styles.demoResumeName}></div>
                                    <div className={styles.demoResumeContact}></div>
                                </div>
                                <div className={styles.demoResumeSection}>
                                    <div className={styles.demoResumeSectionTitle}></div>
                                    <div className={styles.demoResumeLine}></div>
                                    <div className={styles.demoResumeLine} style={{ width: '85%' }}></div>
                                    <div className={styles.demoResumeLine} style={{ width: '90%' }}></div>
                                </div>
                                <div className={styles.demoResumeSection}>
                                    <div className={styles.demoResumeSectionTitle}></div>
                                    <div className={styles.demoResumeLine}></div>
                                    <div className={styles.demoResumeLine} style={{ width: '75%' }}></div>
                                </div>
                                <div className={styles.demoResumeAtsTag}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                    ATS Ready
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className={styles.navigation}>
                            {!isFirstStep && (
                                <button 
                                    className={styles.prevButton}
                                    onClick={handlePrevious}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                            )}
                            
                            <button 
                                className={styles.skipButton}
                                onClick={handleSkip}
                            >
                                Skip tour
                            </button>

                            <button 
                                className={styles.nextButton}
                                onClick={handleNext}
                            >
                                {isLastStep ? 'Get Started' : 'Got it!'}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Regular Tooltip (for non-demo steps) */}
            {!step.showDemo && (
            <div 
                key={`tooltip-${step.id}`}
                ref={tooltipRef}
                className={`${styles.tooltip} ${isCentered ? styles.centered : ''}`}
                style={getTooltipStyle()}
            >
                {/* Progress indicator */}
                <div className={styles.progress}>
                    <div className={styles.progressTrack}>
                        <div 
                            className={styles.progressFill}
                            style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
                        />
                    </div>
                    <span className={styles.progressText}>
                        {currentStep + 1} / {TOUR_STEPS.length}
                    </span>
                </div>

                {/* Icon for centered steps */}
                {step.icon && isCentered && (
                    <div className={styles.iconWrapper}>
                        <div className={styles.iconGlow} />
                        <div className={styles.icon}>{step.icon}</div>
                    </div>
                )}

                {/* Content */}
                <h3 className={styles.title}>{getTitle()}</h3>
                <p className={styles.description}>{step.description}</p>

                {/* Navigation */}
                <div className={styles.navigation}>
                    {!isFirstStep && (
                        <button 
                            className={styles.prevButton}
                            onClick={handlePrevious}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                    )}
                    
                    <button 
                        className={styles.skipButton}
                        onClick={handleSkip}
                    >
                        Skip tour
                    </button>

                    {requiresClick ? (
                        <div className={styles.clickPrompt}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                            Click the highlighted button
                        </div>
                    ) : (
                        <button 
                            className={styles.nextButton}
                            onClick={handleNext}
                        >
                            {isLastStep ? 'Get Started' : 'Next'}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Keyboard hint */}
                {isCentered && (
                    <div className={styles.keyboardHint}>
                        Use <kbd>←</kbd> <kbd>→</kbd> to navigate
                    </div>
                )}
            </div>
            )}

            {/* Pointer arrow */}
            {targetRect && !isCentered && (
                <div 
                    className={`${styles.pointer} ${styles[`pointer${step.position?.charAt(0).toUpperCase()}${step.position?.slice(1)}`]}`}
                    style={getPointerStyle(targetRect, step.position)}
                />
            )}
        </div>
    )
}

function getPointerStyle(rect: DOMRect, position?: string): React.CSSProperties {
    const size = 12
    switch (position) {
        case 'right':
            return {
                top: rect.top + rect.height / 2 - size,
                left: rect.right + 8,
            }
        case 'left':
            return {
                top: rect.top + rect.height / 2 - size,
                right: window.innerWidth - rect.left + 8,
            }
        case 'top':
            return {
                bottom: window.innerHeight - rect.top + 8,
                left: rect.left + rect.width / 2 - size,
            }
        case 'bottom':
        default:
            return {
                top: rect.bottom + 8,
                left: rect.left + rect.width / 2 - size,
            }
    }
}
