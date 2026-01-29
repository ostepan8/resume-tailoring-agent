'use client'

import React, { useState, useCallback } from 'react'
import { Icon } from '../icons'
import type { EducationBlock, BulletInput } from '../../../../resume-test/types'
import { getBulletText, isBulletEnabled, createBullet } from '../../../../resume-test/types'
import { autoResize } from '../useAutoResize'
import styles from '../ResumeEditor.module.css'

interface EducationEditorProps {
    block: EducationBlock
    onUpdate: (data: EducationBlock['data']) => void
}

export function EducationEditor({ block, onUpdate }: EducationEditorProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

    const updateEntry = useCallback((
        entryIndex: number,
        field: string,
        value: string | BulletInput[] | boolean | undefined
    ) => {
        const newEntries = [...block.data.entries]
        newEntries[entryIndex] = { ...newEntries[entryIndex], [field]: value }
        onUpdate({ ...block.data, entries: newEntries })
    }, [block.data, onUpdate])

    const toggleEntry = useCallback((entryIndex: number) => {
        const newEntries = [...block.data.entries]
        const currentEnabled = newEntries[entryIndex].enabled !== false
        newEntries[entryIndex] = { ...newEntries[entryIndex], enabled: !currentEnabled }
        onUpdate({ ...block.data, entries: newEntries })
    }, [block.data, onUpdate])

    const updateHighlight = useCallback((entryIndex: number, highlightIndex: number, value: string) => {
        const newEntries = [...block.data.entries]
        const newHighlights = [...(newEntries[entryIndex].highlights || [])]
        const currentHighlight = newHighlights[highlightIndex]
        const wasEnabled = isBulletEnabled(currentHighlight)
        newHighlights[highlightIndex] = createBullet(value, wasEnabled)
        newEntries[entryIndex] = { ...newEntries[entryIndex], highlights: newHighlights }
        onUpdate({ ...block.data, entries: newEntries })
    }, [block.data, onUpdate])

    const toggleHighlight = useCallback((entryIndex: number, highlightIndex: number) => {
        const newEntries = [...block.data.entries]
        const newHighlights = [...(newEntries[entryIndex].highlights || [])]
        const currentHighlight = newHighlights[highlightIndex]
        const text = getBulletText(currentHighlight)
        const wasEnabled = isBulletEnabled(currentHighlight)
        newHighlights[highlightIndex] = createBullet(text, !wasEnabled)
        newEntries[entryIndex] = { ...newEntries[entryIndex], highlights: newHighlights }
        onUpdate({ ...block.data, entries: newEntries })
    }, [block.data, onUpdate])

    const addHighlight = useCallback((entryIndex: number) => {
        const newEntries = [...block.data.entries]
        const newHighlights = [...(newEntries[entryIndex].highlights || []), createBullet('')]
        newEntries[entryIndex] = { ...newEntries[entryIndex], highlights: newHighlights }
        onUpdate({ ...block.data, entries: newEntries })
    }, [block.data, onUpdate])

    const removeHighlight = useCallback((entryIndex: number, highlightIndex: number) => {
        const newEntries = [...block.data.entries]
        const newHighlights = (newEntries[entryIndex].highlights || []).filter((_, i) => i !== highlightIndex)
        newEntries[entryIndex] = { ...newEntries[entryIndex], highlights: newHighlights }
        onUpdate({ ...block.data, entries: newEntries })
    }, [block.data, onUpdate])

    const addEntry = useCallback(() => {
        const newEntry = {
            id: `edu-${Date.now()}`,
            enabled: true,
            institution: '',
            degree: '',
            field: '',
            location: '',
            endDate: '',
            gpa: '',
            highlights: [],
        }
        onUpdate({ ...block.data, entries: [...block.data.entries, newEntry] })
        setExpandedIndex(block.data.entries.length)
    }, [block.data, onUpdate])

    const removeEntry = useCallback((entryIndex: number) => {
        onUpdate({
            ...block.data,
            entries: block.data.entries.filter((_, i) => i !== entryIndex),
        })
        if (expandedIndex === entryIndex) {
            setExpandedIndex(null)
        } else if (expandedIndex !== null && expandedIndex > entryIndex) {
            setExpandedIndex(expandedIndex - 1)
        }
    }, [block.data, onUpdate, expandedIndex])

    return (
        <div className={styles.entriesList}>
            {block.data.entries.map((entry, entryIndex) => {
                const isExpanded = expandedIndex === entryIndex
                const isEnabled = entry.enabled !== false

                return (
                    <div
                        key={entry.id}
                        className={`${styles.entryCard} ${isExpanded ? styles.entryCardExpanded : ''} ${!isEnabled ? styles.entryCardDisabled : ''}`}
                    >
                        <div
                            className={styles.entryCardHeader}
                            onClick={() => setExpandedIndex(isExpanded ? null : entryIndex)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    setExpandedIndex(isExpanded ? null : entryIndex)
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                        >
                            <div className={styles.entryDragHandle}>
                                <Icon name="grip-vertical" size={16} />
                            </div>

                            <button
                                type="button"
                                className={`${styles.entryVisibility} ${!isEnabled ? styles.entryVisibilityOff : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    toggleEntry(entryIndex)
                                }}
                                aria-label={isEnabled ? 'Hide entry' : 'Show entry'}
                            >
                                <Icon name={isEnabled ? 'eye' : 'eye-off'} size={14} />
                            </button>

                            <div className={styles.entryInfo}>
                                <p className={styles.entryTitle}>
                                    {entry.institution || entry.degree || 'New Education'}
                                </p>
                                <p className={styles.entryMeta}>
                                    {entry.degree && entry.field && `${entry.degree} in ${entry.field}`}
                                    {entry.endDate && ` • ${entry.endDate}`}
                                </p>
                            </div>

                            <span className={`${styles.entryExpandIcon} ${isExpanded ? styles.entryExpandIconRotated : ''}`}>
                                <Icon name="chevron-down" size={18} />
                            </span>
                        </div>

                        <div className={`${styles.entryCardBody} ${isExpanded ? styles.entryCardBodyExpanded : styles.entryCardBodyCollapsed}`}>
                            {isExpanded && (
                                <>
                                    <div className={styles.formGrid}>
                                        <div className={`${styles.formField} ${styles.formGridFullWidth}`}>
                                            <label className={styles.formLabel}>Institution</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.institution}
                                                onChange={(e) => updateEntry(entryIndex, 'institution', e.target.value)}
                                                placeholder="University of California, Berkeley"
                                            />
                                        </div>
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>Degree</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.degree}
                                                onChange={(e) => updateEntry(entryIndex, 'degree', e.target.value)}
                                                placeholder="B.S."
                                            />
                                        </div>
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>Field of Study</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.field || ''}
                                                onChange={(e) => updateEntry(entryIndex, 'field', e.target.value)}
                                                placeholder="Computer Science"
                                            />
                                        </div>
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>Location</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.location || ''}
                                                onChange={(e) => updateEntry(entryIndex, 'location', e.target.value)}
                                                placeholder="Berkeley, CA"
                                            />
                                        </div>
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>Graduation Year</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.endDate || ''}
                                                onChange={(e) => updateEntry(entryIndex, 'endDate', e.target.value)}
                                                placeholder="2024"
                                            />
                                        </div>
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>GPA</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.gpa || ''}
                                                onChange={(e) => updateEntry(entryIndex, 'gpa', e.target.value)}
                                                placeholder="3.8"
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.bulletsList}>
                                        <span className={styles.bulletsLabel}>Highlights & Coursework</span>
                                        {(entry.highlights || []).map((highlight, highlightIndex) => {
                                            const highlightEnabled = isBulletEnabled(highlight)
                                            const highlightText = getBulletText(highlight)
                                            return (
                                                <div key={highlightIndex} className={styles.bulletItem}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.bulletVisibility} ${!highlightEnabled ? styles.bulletVisibilityOff : ''}`}
                                                        onClick={() => toggleHighlight(entryIndex, highlightIndex)}
                                                        aria-label={highlightEnabled ? 'Hide highlight' : 'Show highlight'}
                                                    >
                                                        <Icon name={highlightEnabled ? 'eye' : 'eye-off'} size={12} />
                                                    </button>
                                                    <span className={styles.bulletDot}>•</span>
                                                    <textarea
                                                        ref={(el) => {
                                                            if (el) autoResize(el)
                                                        }}
                                                        className={`${styles.bulletInput} ${!highlightEnabled ? styles.bulletInputDisabled : ''}`}
                                                        value={highlightText}
                                                        onChange={(e) => {
                                                            autoResize(e.target)
                                                            updateHighlight(entryIndex, highlightIndex, e.target.value)
                                                        }}
                                                        placeholder="Dean's List, Relevant Coursework..."
                                                        rows={1}
                                                        disabled={!highlightEnabled}
                                                    />
                                                    <button
                                                        type="button"
                                                        className={styles.bulletRemove}
                                                        onClick={() => removeHighlight(entryIndex, highlightIndex)}
                                                        aria-label="Remove highlight"
                                                    >
                                                        <Icon name="trash" size={14} />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                        <button
                                            type="button"
                                            className={styles.btnAdd}
                                            onClick={() => addHighlight(entryIndex)}
                                        >
                                            <Icon name="plus" size={14} /> Add Highlight
                                        </button>
                                    </div>

                                    <div className={styles.entryCardActions}>
                                        <button
                                            type="button"
                                            className={`${styles.btn} ${styles.btnGhost} ${styles.btnDanger}`}
                                            onClick={() => removeEntry(entryIndex)}
                                        >
                                            <Icon name="trash" size={14} /> Remove Education
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )
            })}

            <button type="button" className={styles.btnAdd} onClick={addEntry}>
                <Icon name="plus" size={16} /> Add Education
            </button>
        </div>
    )
}
