'use client'

import React, { useState, useCallback } from 'react'
import { Icon } from '../icons'
import type { ProjectsBlock, BulletInput } from '../../../../resume-test/types'
import { getBulletText, isBulletEnabled, createBullet } from '../../../../resume-test/types'
import { autoResize } from '../useAutoResize'
import styles from '../ResumeEditor.module.css'

interface ProjectsEditorProps {
    block: ProjectsBlock
    onUpdate: (data: ProjectsBlock['data']) => void
}

export function ProjectsEditor({ block, onUpdate }: ProjectsEditorProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
    // Local state for technologies input to allow typing commas freely
    const [techInputs, setTechInputs] = useState<Record<number, string>>({})

    const updateEntry = useCallback((
        entryIndex: number,
        field: string,
        value: string | string[] | BulletInput[] | boolean
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
            id: `proj-${Date.now()}`,
            enabled: true,
            name: '',
            description: '',
            technologies: [],
            url: '',
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
                                    {entry.name || 'New Project'}
                                </p>
                                <p className={styles.entryMeta}>
                                    {entry.technologies && entry.technologies.length > 0
                                        ? entry.technologies.slice(0, 3).join(', ') +
                                        (entry.technologies.length > 3 ? ` +${entry.technologies.length - 3}` : '')
                                        : entry.description?.slice(0, 50) || 'No description'}
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
                                            <label className={styles.formLabel}>Project Name</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={entry.name}
                                                onChange={(e) => updateEntry(entryIndex, 'name', e.target.value)}
                                                placeholder="My Awesome Project"
                                            />
                                        </div>
                                        <div className={styles.formField}>
                                            <label className={styles.formLabel}>URL</label>
                                            <input
                                                type="url"
                                                className={styles.formInput}
                                                value={entry.url || ''}
                                                onChange={(e) => updateEntry(entryIndex, 'url', e.target.value)}
                                                placeholder="github.com/user/project"
                                            />
                                        </div>
                                        <div className={`${styles.formField} ${styles.formGridFullWidth}`}>
                                            <label className={styles.formLabel}>Description</label>
                                            <textarea
                                                ref={(el) => {
                                                    if (el) autoResize(el)
                                                }}
                                                className={styles.formTextarea}
                                                value={entry.description || ''}
                                                onChange={(e) => {
                                                    autoResize(e.target)
                                                    updateEntry(entryIndex, 'description', e.target.value)
                                                }}
                                                placeholder="A brief description of the project and its purpose..."
                                                rows={2}
                                            />
                                        </div>
                                        <div className={`${styles.formField} ${styles.formGridFullWidth}`}>
                                            <label className={styles.formLabel}>Technologies (comma-separated)</label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                value={techInputs[entryIndex] ?? (entry.technologies || []).join(', ')}
                                                onChange={(e) => {
                                                    setTechInputs(prev => ({ ...prev, [entryIndex]: e.target.value }))
                                                }}
                                                onBlur={(e) => {
                                                    const parsed = e.target.value
                                                        .split(',')
                                                        .map((s) => s.trim())
                                                        .filter(Boolean)
                                                    updateEntry(entryIndex, 'technologies', parsed)
                                                    setTechInputs(prev => {
                                                        const next = { ...prev }
                                                        delete next[entryIndex]
                                                        return next
                                                    })
                                                }}
                                                placeholder="React, TypeScript, Node.js"
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.bulletsList}>
                                        <span className={styles.bulletsLabel}>Key Features & Accomplishments</span>
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
                                                            if (el) autoResize(el)
                                                        }}
                                                        className={`${styles.bulletInput} ${!bulletEnabled ? styles.bulletInputDisabled : ''}`}
                                                        value={bulletText}
                                                        onChange={(e) => {
                                                            autoResize(e.target)
                                                            updateBullet(entryIndex, bulletIndex, e.target.value)
                                                        }}
                                                        placeholder="Describe a key feature or accomplishment..."
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
                                            <Icon name="trash" size={14} /> Remove Project
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )
            })}

            <button type="button" className={styles.btnAdd} onClick={addEntry}>
                <Icon name="plus" size={16} /> Add Project
            </button>
        </div>
    )
}
