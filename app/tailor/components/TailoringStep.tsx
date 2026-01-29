'use client'

import React, { useRef, useEffect, useMemo } from 'react'
import Image from 'next/image'
import type { AgentThought, TailoringPhase } from './types'
import styles from './TailoringStep.module.css'

interface TailoringStepProps {
  thoughts: AgentThought[]
  currentPhase: TailoringPhase
  error: string | null
  progress: number
  onRetry: () => void
}

const phases: { key: TailoringPhase; label: string; icon: string }[] = [
  { key: 'analyzing-resume', label: 'Analyzing Resume', icon: '📄' },
  { key: 'analyzing-job', label: 'Job Analysis', icon: '🎯' },
  { key: 'researching-company', label: 'Company Research', icon: '🏢' },
  { key: 'identifying-gaps', label: 'Gap Analysis', icon: '🔍' },
  { key: 'tailoring', label: 'Tailoring', icon: '✨' },
  { key: 'validating', label: 'Validation', icon: '✓' },
  { key: 'complete', label: 'Complete', icon: '🎉' },
]

const getPhaseIndex = (phase: TailoringPhase): number => {
  return phases.findIndex(p => p.key === phase)
}

export const TailoringStep = React.memo(function TailoringStep({
  thoughts,
  currentPhase,
  error,
  progress,
  onRetry,
}: TailoringStepProps) {
  const thoughtsContainerRef = useRef<HTMLDivElement>(null)
  const currentPhaseIndex = useMemo(() => getPhaseIndex(currentPhase), [currentPhase])

  // Auto-scroll thoughts container
  useEffect(() => {
    if (thoughtsContainerRef.current) {
      thoughtsContainerRef.current.scrollTo({
        top: thoughtsContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [thoughts])

  return (
    <div className={styles.wrapper}>
      {/* Animated background elements */}
      <div className={styles.backgroundEffects}>
        <div className={styles.gradientOrb1} />
        <div className={styles.gradientOrb2} />
        <div className={styles.gridOverlay} />
      </div>

      <div className={styles.container}>
        {/* Hero Section with Logo */}
        <div className={styles.heroSection}>
          <div className={styles.logoContainer}>
            {/* Orbital rings */}
            <div className={styles.orbitalRing1} />
            <div className={styles.orbitalRing2} />
            <div className={styles.orbitalRing3} />
            
            {/* Pulsing glow */}
            <div className={styles.logoGlow} />
            
            {/* Logo */}
            <div className={styles.logoInner}>
              <Image
                src="/Subconscious_Logo_Graphic.png"
                alt=""
                width={48}
                height={48}
                className={styles.logoImage}
              />
            </div>
            
            {/* Orbiting particles */}
            <div className={styles.particle1} />
            <div className={styles.particle2} />
            <div className={styles.particle3} />
          </div>

          <h1 className={styles.title}>
            <span className={styles.titleGradient}>Tailoring</span> Your Resume
          </h1>
          <p className={styles.subtitle}>
            Our AI agent is analyzing and optimizing your resume for this role
          </p>
        </div>

        {error ? (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className={styles.errorText}>{error}</p>
            <button className={styles.retryButton} onClick={onRetry}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Phase Timeline */}
            <div className={styles.phaseTimeline}>
              {phases.slice(0, -1).map((phase, index) => {
                const isCompleted = index < currentPhaseIndex
                const isCurrent = index === currentPhaseIndex
                const isPending = index > currentPhaseIndex

                return (
                  <div 
                    key={phase.key} 
                    className={`${styles.phaseItem} ${
                      isCompleted ? styles.phaseCompleted : ''
                    } ${isCurrent ? styles.phaseCurrent : ''} ${
                      isPending ? styles.phasePending : ''
                    }`}
                  >
                    <div className={styles.phaseNode}>
                      {isCompleted ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isCurrent ? (
                        <div className={styles.phaseNodePulse} />
                      ) : (
                        <span className={styles.phaseNumber}>{index + 1}</span>
                      )}
                    </div>
                    <span className={styles.phaseLabel}>{phase.label}</span>
                    {index < phases.length - 2 && (
                      <div className={`${styles.phaseConnector} ${isCompleted ? styles.connectorFilled : ''}`}>
                        {isCurrent && <div className={styles.connectorProgress} />}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Progress Section */}
            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>Overall Progress</span>
                <span className={styles.progressValue}>{Math.round(progress)}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
                <div 
                  className={styles.progressGlow}
                  style={{ left: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className={styles.progressFooter}>
                <span className={styles.etaLabel}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Est. time remaining: ~1-2 min
                </span>
              </div>
            </div>

            {/* Agent Thoughts Panel */}
            <div className={styles.thoughtsPanel}>
              <div className={styles.thoughtsPanelHeader}>
                <div className={styles.thoughtsIndicator}>
                  <span className={styles.pulsingDot} />
                  <span className={styles.thoughtsTitle}>Agent Reasoning</span>
                </div>
                <span className={styles.thoughtsCount}>{thoughts.length} steps</span>
              </div>
              <div className={styles.thoughtsList} ref={thoughtsContainerRef}>
                {thoughts.length === 0 ? (
                  <div className={styles.thoughtItemInitial}>
                    <div className={styles.thoughtSpinner} />
                    <span>Initializing analysis...</span>
                  </div>
                ) : (
                  thoughts.map((thought, index) => (
                    <div
                      key={thought.id}
                      className={`${styles.thoughtItem} ${
                        thought.isComplete ? styles.thoughtComplete : styles.thoughtActive
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className={styles.thoughtMeta}>
                        <span className={styles.thoughtStep}>Step {index + 1}</span>
                        {!thought.isComplete && <span className={styles.thoughtLive}>LIVE</span>}
                      </div>
                      <p className={styles.thoughtContent}>
                        {thought.text || 'Processing...'}
                        {!thought.isComplete && <span className={styles.typingCursor} />}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
})

export default TailoringStep
