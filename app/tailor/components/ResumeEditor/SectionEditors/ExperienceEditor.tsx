'use client'

import React, { useState, useCallback, useId } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../icons'
import type { ExperienceBlock, BulletInput, ExperienceEntry } from '../../../../resume-test/types'
import { getBulletText, isBulletEnabled, createBullet } from '../../../../resume-test/types'
import { autoResize } from '../useAutoResize'
import styles from '../ResumeEditor.module.css'

// Sortable Experience Entry Component
interface SortableEntryProps {
    entry: ExperienceEntry
    entryIndex: number
    sortableId: string
    isExpanded: boolean
    isEnabled: boolean
    onToggleExpand: () => void
    onToggleEntry: () => void
    onUpdateEntry: (field: string, value: string | BulletInput[] | boolean) => void
    onToggleBullet: (bulletIndex: number) => void
    onUpdateBullet: (bulletIndex: number, value: string) => void
    onAddBullet: () => void
    onRemoveBullet: (bulletIndex: number) => void
    onRemoveEntry: () => void
}

function SortableEntry({
    entry,
    entryIndex,
    sortableId,
    isExpanded,
    isEnabled,
    onToggleExpand,
    onToggleEntry,
    onUpdateEntry,
    onToggleBullet,
    onUpdateBullet,
    onAddBullet,
    onRemoveBullet,
    onRemoveEntry,
}: SortableEntryProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sortableId })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 50 : 'auto',
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.entryCard} ${isExpanded ? styles.entryCardExpanded : ''} ${!isEnabled ? styles.entryCardDisabled : ''} ${isDragging ? styles.dragging : ''}`}
        >
            <div
                className={styles.entryCardHeader}
                onClick={onToggleExpand}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onToggleExpand()
                    }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
            >
                <button
                    type="button"
                    className={styles.dragHandle}
                    {...attributes}
                    {...listeners}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Drag to reorder"
                >
                    <Icon name="grip-vertical" size={16} />
                </button>

                <button
                    type="button"
                    className={`${styles.entryVisibility} ${!isEnabled ? styles.entryVisibilityOff : ''}`}
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleEntry()
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
                                    onChange={(e) => onUpdateEntry('position', e.target.value)}
                                    placeholder="Software Engineer"
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Company</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={entry.company}
                                    onChange={(e) => onUpdateEntry('company', e.target.value)}
                                    placeholder="Company Name"
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Location</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={entry.location || ''}
                                    onChange={(e) => onUpdateEntry('location', e.target.value)}
                                    placeholder="San Francisco, CA"
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Start Date</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={entry.startDate}
                                    onChange={(e) => onUpdateEntry('startDate', e.target.value)}
                                    placeholder="Jan 2022"
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>End Date</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={entry.endDate || ''}
                                    onChange={(e) => onUpdateEntry('endDate', e.target.value)}
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
                                            onClick={() => onToggleBullet(bulletIndex)}
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
                                                onUpdateBullet(bulletIndex, e.target.value)
                                            }}
                                            placeholder="Describe an achievement or responsibility..."
                                            rows={1}
                                            disabled={!bulletEnabled}
                                        />
                                        <button
                                            type="button"
                                            className={styles.bulletRemove}
                                            onClick={() => onRemoveBullet(bulletIndex)}
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
                                onClick={onAddBullet}
                            >
                                <Icon name="plus" size={14} /> Add Bullet Point
                            </button>
                        </div>

                        <div className={styles.entryCardActions}>
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnGhost} ${styles.btnDanger}`}
                                onClick={onRemoveEntry}
                            >
                                <Icon name="trash" size={14} /> Remove Position
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

interface ExperienceEditorProps {
    block: ExperienceBlock
    onUpdate: (data: ExperienceBlock['data']) => void
}

export function ExperienceEditor({ block, onUpdate }: ExperienceEditorProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
    const dndId = useId()

    // DnD sensors - use small activation distance for responsive dragging
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Create prefixed IDs for sorting (to avoid conflicts with parent context)
    const prefix = `exp-entry-${block.id}-`
    const getEntryId = useCallback((entry: ExperienceEntry) => `${prefix}${entry.id}`, [prefix])
    const getOriginalId = useCallback((sortableId: string) => sortableId.replace(prefix, ''), [prefix])

    // Handle entry reordering
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const entries = block.data.entries
            const activeOriginalId = getOriginalId(active.id as string)
            const overOriginalId = getOriginalId(over.id as string)
            const oldIndex = entries.findIndex((e) => e.id === activeOriginalId)
            const newIndex = entries.findIndex((e) => e.id === overOriginalId)

            if (oldIndex !== -1 && newIndex !== -1) {
                onUpdate({ ...block.data, entries: arrayMove(entries, oldIndex, newIndex) })
                // Update expanded index if needed
                if (expandedIndex === oldIndex) {
                    setExpandedIndex(newIndex)
                } else if (expandedIndex !== null) {
                    if (oldIndex < expandedIndex && newIndex >= expandedIndex) {
                        setExpandedIndex(expandedIndex - 1)
                    } else if (oldIndex > expandedIndex && newIndex <= expandedIndex) {
                        setExpandedIndex(expandedIndex + 1)
                    }
                }
            }
        }
    }, [block.data, onUpdate, expandedIndex, getOriginalId])

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

    const entryIds = block.data.entries.map((e) => getEntryId(e))

    return (
        <div className={styles.entriesList} data-nested-dnd="true">
            <DndContext
                id={dndId}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={entryIds} strategy={verticalListSortingStrategy}>
                    {block.data.entries.map((entry, entryIndex) => {
                        const isExpanded = expandedIndex === entryIndex
                        const isEnabled = entry.enabled !== false

                        return (
                            <SortableEntry
                                key={entry.id}
                                entry={entry}
                                entryIndex={entryIndex}
                                sortableId={getEntryId(entry)}
                                isExpanded={isExpanded}
                                isEnabled={isEnabled}
                                onToggleExpand={() => setExpandedIndex(isExpanded ? null : entryIndex)}
                                onToggleEntry={() => toggleEntry(entryIndex)}
                                onUpdateEntry={(field, value) => updateEntry(entryIndex, field, value)}
                                onToggleBullet={(bulletIndex) => toggleBullet(entryIndex, bulletIndex)}
                                onUpdateBullet={(bulletIndex, value) => updateBullet(entryIndex, bulletIndex, value)}
                                onAddBullet={() => addBullet(entryIndex)}
                                onRemoveBullet={(bulletIndex) => removeBullet(entryIndex, bulletIndex)}
                                onRemoveEntry={() => removeEntry(entryIndex)}
                            />
                        )
                    })}
                </SortableContext>
            </DndContext>

            <button type="button" className={styles.btnAdd} onClick={addEntry}>
                <Icon name="plus" size={16} /> Add Position
            </button>
        </div>
    )
}
