'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Icon } from '../icons'
import type { SummaryBlock } from '../../../../resume-test/types'
import { autoResize } from '../useAutoResize'
import styles from '../ResumeEditor.module.css'

interface SummaryEditorProps {
    block: SummaryBlock
    onUpdate: (data: SummaryBlock['data']) => void
}

export function SummaryEditor({ block, onUpdate }: SummaryEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [isExpanded, setIsExpanded] = useState(false)

    // Auto-resize textarea on mount and value change
    useEffect(() => {
        if (isExpanded) {
            autoResize(textareaRef.current)
        }
    }, [block.data.text, isExpanded])

    // Generate summary for collapsed view
    const getSummary = () => {
        if (block.data.text) {
            return block.data.text.length > 80 ? block.data.text.slice(0, 80) + '...' : block.data.text
        }
        return 'Add a professional summary'
    }

    return (
        <div className={styles.entriesList}>
            <div className={`${styles.entryCard} ${isExpanded ? styles.entryCardExpanded : ''}`}>
                <div
                    className={styles.entryCardHeader}
                    onClick={() => setIsExpanded(!isExpanded)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setIsExpanded(!isExpanded)
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                >
                    <div className={styles.entryInfo}>
                        <p className={styles.entryTitle}>Professional Summary</p>
                        <p className={styles.entryMeta}>{getSummary()}</p>
                    </div>

                    <span className={`${styles.entryExpandIcon} ${isExpanded ? styles.entryExpandIconRotated : ''}`}>
                        <Icon name="chevron-down" size={18} />
                    </span>
                </div>

                <div className={`${styles.entryCardBody} ${isExpanded ? styles.entryCardBodyExpanded : styles.entryCardBodyCollapsed}`}>
                    {isExpanded && (
                        <div className={styles.formGrid}>
                            <div className={`${styles.formField} ${styles.formGridFullWidth}`}>
                                <label className={styles.formLabel} htmlFor="summary-text">
                                    Summary Text
                                </label>
                                <textarea
                                    ref={textareaRef}
                                    id="summary-text"
                                    className={styles.formTextarea}
                                    value={block.data.text || ''}
                                    onChange={(e) => {
                                        autoResize(e.target)
                                        onUpdate({ text: e.target.value })
                                    }}
                                    placeholder="A brief professional summary highlighting your key qualifications..."
                                    rows={3}
                                />
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--re-text-tertiary)',
                                    marginTop: '0.375rem'
                                }}>
                                    {block.data.text?.length || 0} characters
                                    {block.data.text && block.data.text.length > 400 && (
                                        <span style={{ color: 'var(--re-warning)' }}> — Consider shortening</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
