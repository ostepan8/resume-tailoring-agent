'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Icon } from '../icons'
import type { ExperienceBlock, BulletInput } from '../../../../resume-test/types'
import { getBulletText, isBulletEnabled, createBullet } from '../../../../resume-test/types'
import { autoResize } from '../useAutoResize'
import styles from '../ResumeEditor.module.css'

interface ExperienceEditorProps {
    block: ExperienceBlock
    onUpdate: (data: ExperienceBlock['data']) => void
}

export function ExperienceEditor({ block, onUpdate }: ExperienceEditorProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

    const updateEntry = useCallback((
        entryIndex: number,
        field: string,
        value: string | BulletInput[] | boolean
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

    const updateBullet = useCallback((entryIndex: number, bulletIndex: number, value: string) => {
        const newEntries = [...block.data.entries]
        const newBullets = [...newEntries[entryIndex].bullets]
        const currentBullet = newBullets[bulletIndex]
        const wasEnabled = isBulletEnabled(currentBullet)
        newBullets[bulletIndex] = createBullet(value, wasEnabled)
        newEntries[entryIndex] = { ...newEntries[entryIndex], bullets: newBullets }
        onUpdate({ ...block.data, entries: newEntries })
    }, [block.data, onUpdate])

    const toggleBullet = useCallback((entryIndex: number, bulletIndex: number) => {
        const newEntries = [...block.data.entries]
        const newBullets = [...newEntries[entryIndex].bullets]
        const currentBullet = newBullets[bulletIndex]
        const text = getBulletText(currentBullet)
        const wasEnabled = isBulletEnabled(currentBullet)
        newBullets[bulletIndex] = createBullet(text, !wasEnabled)
        newEntries[entryIndex] = { ...newEntries[entryIndex], bullets: newBullets }
        onUpdate({ ...block.data, entries: newEntries })
    }, [block.data, onUpdate])

    const addBullet = useCallback((entryIndex: number) => {
        const newEntries = [...block.data.entries]
        newEntries[entryIndex] = {
            ...newEntries[entryIndex],
            bullets: [...newEntries[entryIndex].bullets, createBullet('')],
        }
        onUpdate({ ...block.data, entries: newEntries })
    }, [block.data, onUpdate])

    const removeBullet = useCallback((entryIndex: number, bulletIndex: number) => {
        const newEntries = [...block.data.entries]
        newEntries[entryIndex] = {
            ...newEntries[entryIndex],
            bullets: newEntries[entryIndex].bullets.filter((_, i) => i !== bulletIndex),
        }
        onUpdate({ ...block.data, entries: newEntries })
    }, [block.data, onUpdate])

    const addEntry = useCallback(() => {
        const newEntry = {
            id: `exp-${Date.now()}`,
            enabled: true,
            company: '',
            position: '',
            location: '',
            startDate: '',
            endDate: undefined,
            bullets: [createBullet('')],
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
                                    {entry.position || entry.company || 'New Position'}
                                </p>
                                <p className={styles.entryMeta}>
                                    {entry.company && entry.position && `${entry.company} • `}
                                    {entry.startDate && (
                                        <>
                                            {entry.startDate}
                                            {entry.endDate ? ` – ${entry.endDate}` : ' – Present'}
                                        </>
                                    )}
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
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>Position</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.position}
                                                onChange={(e) => updateEntry(entryIndex, 'position', e.target.value)}
                                                placeholder="Software Engineer"
                                            />
                                        </div>
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>Company</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.company}
                                                onChange={(e) => updateEntry(entryIndex, 'company', e.target.value)}
                                                placeholder="Company Name"
                                            />
                                        </div>
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>Location</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.location || ''}
                                                onChange={(e) => updateEntry(entryIndex, 'location', e.target.value)}
                                                placeholder="San Francisco, CA"
                                            />
                                        </div>
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>Start Date</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.startDate}
                                                onChange={(e) => updateEntry(entryIndex, 'startDate', e.target.value)}
                                                placeholder="Jan 2022"
                                            />
                                        </div>
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>End Date</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.endDate || ''}
                                                onChange={(e) => updateEntry(entryIndex, 'endDate', e.target.value)}
                                                placeholder="Present"
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.bulletsList}>
                                        <span className={styles.bulletsLabel}>Bullet Points</span>
                                        {entry.bullets.map((bullet, bulletIndex) => {
                                            const bulletEnabled = isBulletEnabled(bullet)
                                            const bulletText = getBulletText(bullet)
                                            return (
                                                <div key={bulletIndex} className={styles.bulletItem}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.bulletVisibility} ${!bulletEnabled ? styles.bulletVisibilityOff : ''}`}
                                                        onClick={() => toggleBullet(entryIndex, bulletIndex)}
                                                        aria-label={bulletEnabled ? 'Hide bullet' : 'Show bullet'}
                                                    >
                                                        <Icon name={bulletEnabled ? 'eye' : 'eye-off'} size={12} />
                                                    </button>
                                                    <span className={styles.bulletDot}>•</span>
                                                    <textarea
                                                        ref={(el) => {
                                                            // Auto-resize on mount
                                                            if (el) autoResize(el)
                                                        }}
                                                        className={`${styles.bulletInput} ${!bulletEnabled ? styles.bulletInputDisabled : ''}`}
                                                        value={bulletText}
                                                        onChange={(e) => {
                                                            autoResize(e.target)
                                                            updateBullet(entryIndex, bulletIndex, e.target.value)
                                                        }}
                                                        placeholder="Describe an achievement or responsibility..."
                                                        rows={1}
                                                        disabled={!bulletEnabled}
                                                    />
                                                    <button
                                                        type="button"
                                                        className={styles.bulletRemove}
                                                        onClick={() => removeBullet(entryIndex, bulletIndex)}
                                                        aria-label="Remove bullet"
                                                    >
                                                        <Icon name="trash" size={14} />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                        <button
                                            type="button"
                                            className={styles.btnAdd}
                                            onClick={() => addBullet(entryIndex)}
                                        >
                                            <Icon name="plus" size={14} /> Add Bullet Point
                                        </button>
                                    </div>

                                    <div className={styles.entryCardActions}>
                                        <button
                                            type="button"
                                            className={`${styles.btn} ${styles.btnGhost} ${styles.btnDanger}`}
                                            onClick={() => removeEntry(entryIndex)}
                                        >
                                            <Icon name="trash" size={14} /> Remove Position
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )
            })}

            <button type="button" className={styles.btnAdd} onClick={addEntry}>
                <Icon name="plus" size={16} /> Add Position
            </button>
        </div>
    )
}
