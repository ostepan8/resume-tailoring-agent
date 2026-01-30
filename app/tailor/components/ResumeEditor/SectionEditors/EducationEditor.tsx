'use client'

import React, { useState, useCallback, useId } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../icons'
import type { EducationBlock, BulletInput, EducationEntry } from '../../../../resume-test/types'
import { getBulletText, isBulletEnabled, createBullet } from '../../../../resume-test/types'
import { autoResize } from '../useAutoResize'
import styles from '../ResumeEditor.module.css'

// Sortable Education Entry Component
interface SortableEducationEntryProps {
    entry: EducationEntry
    entryIndex: number
    sortableId: string
    isExpanded: boolean
    isEnabled: boolean
    onToggleExpand: () => void
    onToggleEntry: () => void
    onUpdateEntry: (field: string, value: string | BulletInput[] | boolean | undefined) => void
    onToggleHighlight: (highlightIndex: number) => void
    onUpdateHighlight: (highlightIndex: number, value: string) => void
    onAddHighlight: () => void
    onRemoveHighlight: (highlightIndex: number) => void
    onRemoveEntry: () => void
}

function SortableEducationEntry({
    entry,
    entryIndex,
    sortableId,
    isExpanded,
    isEnabled,
    onToggleExpand,
    onToggleEntry,
    onUpdateEntry,
    onToggleHighlight,
    onUpdateHighlight,
    onAddHighlight,
    onRemoveHighlight,
    onRemoveEntry,
}: SortableEducationEntryProps) {
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
                                    onChange={(e) => onUpdateEntry('institution', e.target.value)}
                                    placeholder="University of California, Berkeley"
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Degree</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={entry.degree}
                                    onChange={(e) => onUpdateEntry('degree', e.target.value)}
                                    placeholder="B.S."
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Field of Study</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={entry.field || ''}
                                    onChange={(e) => onUpdateEntry('field', e.target.value)}
                                    placeholder="Computer Science"
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Location</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={entry.location || ''}
                                    onChange={(e) => onUpdateEntry('location', e.target.value)}
                                    placeholder="Berkeley, CA"
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Graduation Year</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={entry.endDate || ''}
                                    onChange={(e) => onUpdateEntry('endDate', e.target.value)}
                                    placeholder="2024"
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>GPA</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={entry.gpa || ''}
                                    onChange={(e) => onUpdateEntry('gpa', e.target.value)}
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
                                            onClick={() => onToggleHighlight(highlightIndex)}
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
                                                onUpdateHighlight(highlightIndex, e.target.value)
                                            }}
                                            placeholder="Dean's List, Relevant Coursework..."
                                            rows={1}
                                            disabled={!highlightEnabled}
                                        />
                                        <button
                                            type="button"
                                            className={styles.bulletRemove}
                                            onClick={() => onRemoveHighlight(highlightIndex)}
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
                                onClick={onAddHighlight}
                            >
                                <Icon name="plus" size={14} /> Add Highlight
                            </button>
                        </div>

                        <div className={styles.entryCardActions}>
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnGhost} ${styles.btnDanger}`}
                                onClick={onRemoveEntry}
                            >
                                <Icon name="trash" size={14} /> Remove Education
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

interface EducationEditorProps {
    block: EducationBlock
    onUpdate: (data: EducationBlock['data']) => void
}

export function EducationEditor({ block, onUpdate }: EducationEditorProps) {
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
    const prefix = `edu-entry-${block.id}-`
    const getEntryId = useCallback((entry: EducationEntry) => `${prefix}${entry.id}`, [prefix])
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
                            <SortableEducationEntry
                                key={entry.id}
                                entry={entry}
                                entryIndex={entryIndex}
                                sortableId={getEntryId(entry)}
                                isExpanded={isExpanded}
                                isEnabled={isEnabled}
                                onToggleExpand={() => setExpandedIndex(isExpanded ? null : entryIndex)}
                                onToggleEntry={() => toggleEntry(entryIndex)}
                                onUpdateEntry={(field, value) => updateEntry(entryIndex, field, value)}
                                onToggleHighlight={(highlightIndex) => toggleHighlight(entryIndex, highlightIndex)}
                                onUpdateHighlight={(highlightIndex, value) => updateHighlight(entryIndex, highlightIndex, value)}
                                onAddHighlight={() => addHighlight(entryIndex)}
                                onRemoveHighlight={(highlightIndex) => removeHighlight(entryIndex, highlightIndex)}
                                onRemoveEntry={() => removeEntry(entryIndex)}
                            />
                        )
                    })}
                </SortableContext>
            </DndContext>

            <button type="button" className={styles.btnAdd} onClick={addEntry}>
                <Icon name="plus" size={16} /> Add Education
            </button>
        </div>
    )
}
