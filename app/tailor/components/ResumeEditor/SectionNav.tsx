'use client'

import React, { useCallback } from 'react'
import { Icon } from './icons'
import { SECTION_CONFIG, type SectionMeta } from './types'
import type { ResumeBlock } from '../../../resume-test/types'
import styles from './ResumeEditor.module.css'

interface SectionNavProps {
    sections: SectionMeta[]
    activeSection: string | null
    onSectionSelect: (sectionId: string) => void
    onToggleVisibility: (sectionId: string) => void
}

export function SectionNav({
    sections,
    activeSection,
    onSectionSelect,
    onToggleVisibility,
}: SectionNavProps) {
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, sectionId: string, index: number) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                const nextIndex = (index + 1) % sections.length
                const nextSection = sections[nextIndex]
                onSectionSelect(nextSection.id)
                // Focus the next button
                const nextButton = document.querySelector(
                    `[data-section-id="${nextSection.id}"]`
                ) as HTMLButtonElement
                nextButton?.focus()
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                const prevIndex = (index - 1 + sections.length) % sections.length
                const prevSection = sections[prevIndex]
                onSectionSelect(prevSection.id)
                // Focus the prev button
                const prevButton = document.querySelector(
                    `[data-section-id="${prevSection.id}"]`
                ) as HTMLButtonElement
                prevButton?.focus()
            }
        },
        [sections, onSectionSelect]
    )

    return (
        <nav className={styles.sectionNav} aria-label="Resume sections">
            <div className={styles.navHeader}>
                <h2 className={styles.navTitle}>Resume Sections</h2>
            </div>
            <ul className={styles.navList} role="listbox">
                {sections.map((section, index) => {
                    const isActive = activeSection === section.id
                    const config = SECTION_CONFIG[section.type] || { label: section.type, icon: 'plus' }

                    return (
                        <li key={section.id} className={styles.navItem} role="option" aria-selected={isActive}>
                            <button
                                type="button"
                                data-section-id={section.id}
                                className={`${styles.navButton} ${isActive ? styles.navButtonActive : ''} ${!section.enabled ? styles.navButtonDisabled : ''}`}
                                onClick={() => onSectionSelect(section.id)}
                                onKeyDown={(e) => handleKeyDown(e, section.id, index)}
                                aria-current={isActive ? 'true' : undefined}
                            >
                                <span className={styles.navIcon}>
                                    <Icon name={config.icon} size={14} />
                                </span>
                                <span className={styles.navLabel}>{section.label}</span>
                                {section.itemCount !== undefined && section.itemCount > 0 && (
                                    <span className={styles.navCount}>{section.itemCount}</span>
                                )}
                                <button
                                    type="button"
                                    className={`${styles.visibilityToggle} ${!section.enabled ? styles.visibilityToggleOff : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onToggleVisibility(section.id)
                                    }}
                                    aria-label={section.enabled ? 'Hide section' : 'Show section'}
                                    title={section.enabled ? 'Hide section' : 'Show section'}
                                >
                                    <Icon name={section.enabled ? 'eye' : 'eye-off'} size={12} />
                                </button>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}

// Helper to extract section metadata from blocks
export function extractSectionMeta(blocks: ResumeBlock[]): SectionMeta[] {
    return blocks
        .sort((a, b) => a.order - b.order)
        .map((block) => {
            const config = SECTION_CONFIG[block.type] || { label: block.type, icon: 'plus' }
            let itemCount: number | undefined

            // Count items for list-based sections
            if (block.type === 'experience' && 'entries' in block.data) {
                itemCount = block.data.entries.length
            } else if (block.type === 'education' && 'entries' in block.data) {
                itemCount = block.data.entries.length
            } else if (block.type === 'projects' && 'entries' in block.data) {
                itemCount = block.data.entries.length
            }

            // Use the config label (e.g., "Header", "Experience", etc.)
            const label = config.label

            return {
                id: block.id,
                type: block.type,
                label,
                icon: config.icon,
                enabled: block.enabled,
                itemCount,
            }
        })
}
