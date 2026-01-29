'use client'

import React, { useEffect, useRef } from 'react'
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

interface EditPanelProps {
    blocks: ResumeBlock[]
    activeSection: string | null
    onUpdate: (blockId: string, data: ResumeBlock['data']) => void
}

export function EditPanel({ blocks, activeSection, onUpdate }: EditPanelProps) {
    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())
    const containerRef = useRef<HTMLDivElement>(null)

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

    return (
        <div className={styles.editPanel} ref={containerRef}>
            {sortedBlocks.map((block) => {
                const config = SECTION_CONFIG[block.type] || { label: block.type, icon: 'plus' }

                return (
                    <div
                        key={block.id}
                        id={`section-${block.id}`}
                        ref={(el) => {
                            if (el) {
                                sectionRefs.current.set(block.id, el)
                            } else {
                                sectionRefs.current.delete(block.id)
                            }
                        }}
                        className={`${styles.sectionBlock} ${!block.enabled ? styles.sectionBlockDisabled : ''}`}
                    >
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionHeaderLeft}>
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
            })}
        </div>
    )
}
