'use client'

import React, { useEffect, useRef, useState, useCallback, useId, useMemo } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core'
import { useSortable, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from './icons'
import { SECTION_CONFIG } from './types'
import {
    HeaderEditor,
    SummaryEditor,
    ExperienceEditor,
    EducationEditor,
    SkillsEditor,
    ProjectsEditor,
} from './SectionEditors'
import type { ResumeBlock } from '../../../resume-test/types'
import styles from './ResumeEditor.module.css'

// Debug helper
const isDev = process.env.NODE_ENV === 'development'
const debugLog = (context: string, message: string, data?: unknown) => {
    if (isDev) {
        console.log(`[DnD:${context}]`, message, data !== undefined ? data : '')
    }
}


// Sortable Section Block Component
interface SortableSectionProps {
    block: ResumeBlock
    isActive: boolean
    onUpdate: (data: ResumeBlock['data']) => void
    renderEditor: (block: ResumeBlock) => React.ReactNode
    setRef: (el: HTMLDivElement | null) => void
}

function SortableSection({ block, isActive, onUpdate, renderEditor, setRef }: SortableSectionProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id })

    const config = SECTION_CONFIG[block.type] || { label: block.type, icon: 'plus' }

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
        zIndex: isDragging ? 50 : 'auto',
    }

    // Debug logging for section state
    React.useEffect(() => {
        if (isDragging) {
            debugLog('SortableSection', `🔄 Section "${block.type}" is being dragged`, {
                blockId: block.id,
                transform: CSS.Transform.toString(transform),
            })
        }
    }, [isDragging, block.id, block.type, transform])

    return (
        <div
            ref={(el) => {
                setNodeRef(el)
                setRef(el)
            }}
            id={`section-${block.id}`}
            style={style}
            className={`${styles.sectionBlock} ${!block.enabled ? styles.sectionBlockDisabled : ''} ${isDragging ? styles.dragging : ''}`}
        >
            <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderLeft}>
                    <button
                        type="button"
                        className={styles.dragHandle}
                        data-section-drag-handle="true"
                        {...attributes}
                        {...listeners}
                        aria-label="Drag to reorder section"
                    >
                        <Icon name="grip-vertical" size={16} />
                    </button>
                    <div className={styles.sectionIcon}>
                        <Icon name={config.icon} size={16} />
                    </div>
                    <h2 className={styles.sectionTitle}>{config.label}</h2>
                </div>
                {!block.enabled && (
                    <span className={styles.sectionDisabledBadge}>Hidden</span>
                )}
            </div>

            {renderEditor(block)}
        </div>
    )
}

interface EditPanelProps {
    blocks: ResumeBlock[]
    activeSection: string | null
    onUpdate: (blockId: string, data: ResumeBlock['data']) => void
    onReorder?: (reorderedBlocks: ResumeBlock[]) => void
}

export function EditPanel({ blocks, activeSection, onUpdate, onReorder }: EditPanelProps) {
    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
    const containerRef = useRef<HTMLDivElement>(null)
    const [activeDragId, setActiveDragId] = useState<string | null>(null)
    const sectionDndId = useId()

    // DnD sensors for section reordering
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Get the set of valid section IDs (memoized to prevent useCallback deps changing)
    const sectionIdSet = useMemo(() => new Set(blocks.map(b => b.id)), [blocks])

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const id = event.active.id as string
        debugLog('EditPanel', '🟡 onDragStart called', {
            activeId: id,
            sectionIds: Array.from(sectionIdSet),
            isValidSection: sectionIdSet.has(id),
        })

        // Only set active if it's a section ID (not a nested item from child DndContext)
        if (sectionIdSet.has(id)) {
            debugLog('EditPanel', '✅ Setting activeDragId for section', id)
            setActiveDragId(id)
        } else {
            debugLog('EditPanel', '⚠️ Ignoring drag start - not a section ID', id)
        }
    }, [sectionIdSet])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        debugLog('EditPanel', '🟢 onDragEnd called', {
            activeId: active.id,
            overId: over?.id,
            sectionIds: Array.from(sectionIdSet),
        })

        setActiveDragId(null)

        // Only handle if the active item is a section (not from nested DndContext)
        const activeId = active.id as string
        if (!sectionIdSet.has(activeId)) {
            debugLog('EditPanel', '⚠️ Ignoring drag end - not a section ID', activeId)
            return // Ignore drags from nested contexts
        }

        if (over && active.id !== over.id) {
            const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order)
            const oldIndex = sortedBlocks.findIndex((b) => b.id === active.id)
            const newIndex = sortedBlocks.findIndex((b) => b.id === over.id)

            debugLog('EditPanel', '📦 Attempting section reorder', {
                oldIndex,
                newIndex,
                activeId: active.id,
                overId: over.id,
            })

            if (oldIndex !== -1 && newIndex !== -1) {
                const reordered = arrayMove(sortedBlocks, oldIndex, newIndex)
                const updatedBlocks = reordered.map((block, index) => ({
                    ...block,
                    order: index,
                }))

                debugLog('EditPanel', '✅ Reordering sections', {
                    before: sortedBlocks.map(b => b.type),
                    after: updatedBlocks.map(b => b.type),
                })

                if (onReorder) {
                    onReorder(updatedBlocks)
                }
            } else {
                debugLog('EditPanel', '❌ Invalid indices for reorder', { oldIndex, newIndex })
            }
        } else {
            debugLog('EditPanel', '⚠️ No valid drop target or same position', {
                hasOver: !!over,
                sameId: active.id === over?.id,
            })
        }
    }, [blocks, onReorder, sectionIdSet])

    // Scroll to active section when it changes (from nav click)
    useEffect(() => {
        if (activeSection) {
            const sectionEl = sectionRefs.current.get(activeSection)
            if (sectionEl) {
                sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }
    }, [activeSection])

    if (blocks.length === 0) {
        return (
            <div className={styles.editPanel} ref={containerRef}>
                <div className={styles.editPanelEmpty}>
                    <Icon name="file-text" size={64} className={styles.editPanelEmptyIcon} />
                    <h3 className={styles.editPanelEmptyTitle}>No sections available</h3>
                    <p className={styles.editPanelEmptyText}>
                        Your resume doesn&apos;t have any sections yet.
                    </p>
                </div>
            </div>
        )
    }

    const renderEditor = (block: ResumeBlock) => {
        const handleUpdate = (data: ResumeBlock['data']) => {
            onUpdate(block.id, data)
        }

        switch (block.type) {
            case 'header':
                return <HeaderEditor block={block} onUpdate={handleUpdate} />
            case 'summary':
                return <SummaryEditor block={block} onUpdate={handleUpdate} />
            case 'experience':
                return <ExperienceEditor block={block} onUpdate={handleUpdate} />
            case 'education':
                return <EducationEditor block={block} onUpdate={handleUpdate} />
            case 'skills':
                return <SkillsEditor block={block} onUpdate={handleUpdate} />
            case 'projects':
                return <ProjectsEditor block={block} onUpdate={handleUpdate} />
            default:
                return (
                    <div style={{
                        padding: '1rem',
                        textAlign: 'center',
                        color: 'var(--re-text-tertiary)'
                    }}>
                        <p>Editor not yet available for {block.type} blocks.</p>
                    </div>
                )
        }
    }

    // Sort blocks by order
    const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order)
    const blockIds = sortedBlocks.map((b) => b.id)

    // Debug log blocks and IDs on mount/change
    useEffect(() => {
        debugLog('EditPanel', '📋 Blocks loaded/updated', {
            blockCount: blocks.length,
            blockIds,
            blockTypes: sortedBlocks.map(b => ({ id: b.id, type: b.type, order: b.order })),
            sectionIdSet: Array.from(sectionIdSet),
        })
    }, [blocks, blockIds, sortedBlocks, sectionIdSet])

    // Get dragged block info for overlay
    const activeDragBlock = activeDragId
        ? sortedBlocks.find(b => b.id === activeDragId)
        : null

    return (
        <div className={styles.editPanel} ref={containerRef}>
            <DndContext
                id={sectionDndId}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                    {sortedBlocks.map((block) => (
                        <SortableSection
                            key={block.id}
                            block={block}
                            isActive={activeSection === block.id}
                            onUpdate={(data) => onUpdate(block.id, data)}
                            renderEditor={renderEditor}
                            setRef={(el) => {
                                if (el) {
                                    sectionRefs.current.set(block.id, el)
                                } else {
                                    sectionRefs.current.delete(block.id)
                                }
                            }}
                        />
                    ))}
                </SortableContext>
                <DragOverlay>
                    {activeDragBlock ? (
                        <div className={styles.dragOverlay}>
                            <Icon name={SECTION_CONFIG[activeDragBlock.type]?.icon || 'plus'} size={16} />
                            <span>{SECTION_CONFIG[activeDragBlock.type]?.label || activeDragBlock.type}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}
