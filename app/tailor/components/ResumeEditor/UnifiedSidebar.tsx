'use client'

import React from 'react'
import { Icon, type IconName } from './icons'
import { SECTION_CONFIG, type SectionMeta } from './types'
import styles from './ResumeEditor.module.css'

// Types for sidebar navigation
export type SidebarView =
    | { type: 'edit'; sectionId: string | null }
    | { type: 'summary'; scrollTo?: SummarySubview }

export type SummarySubview = 'overview' | 'improvements' | 'keywords' | 'requirements' | 'warnings'

interface SummaryData {
    totalChanges: number
    keyImprovements: string[]
    keywordsAdded: string[]
    warnings?: string[]
}

interface UnifiedSidebarProps {
    sections: SectionMeta[]
    activeView: SidebarView
    onViewChange: (view: SidebarView) => void
    onToggleVisibility: (sectionId: string) => void
    summary?: SummaryData
    hasRequirements?: boolean
    /** Hide the AI Summary section (for edit-only mode) */
    hideAiSummary?: boolean
    /** Simplified mode - no group headers, just flat list of sections */
    editOnlyMode?: boolean
}

export function UnifiedSidebar({
    sections,
    activeView,
    onViewChange,
    onToggleVisibility,
    summary,
    hasRequirements = false,
    hideAiSummary = false,
    editOnlyMode = false,
}: UnifiedSidebarProps) {
    const isEditActive = activeView.type === 'edit'
    const isSummaryActive = activeView.type === 'summary'

    // Simplified edit-only mode - just show sections without group headers
    if (editOnlyMode) {
        return (
            <nav className={styles.unifiedSidebar} aria-label="Section navigation">
                <div className={styles.sidebarGroup}>
                    <div className={styles.sidebarGroupHeaderSimple}>
                        <span className={styles.sidebarGroupIcon}>
                            <Icon name="file-text" size={16} />
                        </span>
                        <span className={styles.sidebarGroupLabel}>Sections</span>
                    </div>

                    <ul className={`${styles.sidebarSubItems} ${styles.sidebarSubItemsOpen}`}>
                        {sections.map((section, index) => {
                            const isActive = activeView.type === 'edit' && activeView.sectionId === section.id
                            const config = SECTION_CONFIG[section.type] || { label: section.type, icon: 'plus' }

                            return (
                                <li
                                    key={section.id}
                                    className={styles.sidebarSubItem}
                                    style={{ '--item-index': index } as React.CSSProperties}
                                >
                                    <button
                                        type="button"
                                        className={`${styles.sidebarSubButton} ${isActive ? styles.sidebarSubButtonActive : ''} ${!section.enabled ? styles.sidebarSubButtonDisabled : ''}`}
                                        onClick={() => onViewChange({ type: 'edit', sectionId: section.id })}
                                    >
                                        <span className={styles.sidebarSubIcon}>
                                            <Icon name={config.icon} size={14} />
                                        </span>
                                        <span className={styles.sidebarSubLabel}>{section.label}</span>
                                        {section.itemCount !== undefined && section.itemCount > 0 && (
                                            <span className={styles.sidebarSubCount}>{section.itemCount}</span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.sidebarSubVisibility} ${!section.enabled ? styles.sidebarSubVisibilityOff : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onToggleVisibility(section.id)
                                        }}
                                        aria-label={section.enabled ? 'Hide section' : 'Show section'}
                                    >
                                        <Icon name={section.enabled ? 'eye' : 'eye-off'} size={12} />
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </nav>
        )
    }

    return (
        <nav className={styles.unifiedSidebar} aria-label="Editor navigation">
            {/* Edit Resume Section */}
            <div className={styles.sidebarGroup}>
                <button
                    type="button"
                    className={`${styles.sidebarGroupHeader} ${isEditActive ? styles.sidebarGroupHeaderActive : ''}`}
                    onClick={() => onViewChange({ type: 'edit', sectionId: sections[0]?.id || null })}
                >
                    <span className={styles.sidebarGroupIcon}>
                        <Icon name="file-text" size={16} />
                    </span>
                    <span className={styles.sidebarGroupLabel}>Edit Resume</span>
                </button>

                <ul className={`${styles.sidebarSubItems} ${isEditActive ? styles.sidebarSubItemsOpen : ''}`}>
                    {sections.map((section, index) => {
                        const isActive = activeView.type === 'edit' && activeView.sectionId === section.id
                        const config = SECTION_CONFIG[section.type] || { label: section.type, icon: 'plus' }

                        return (
                            <li
                                key={section.id}
                                className={styles.sidebarSubItem}
                                style={{ '--item-index': index } as React.CSSProperties}
                            >
                                <button
                                    type="button"
                                    className={`${styles.sidebarSubButton} ${isActive ? styles.sidebarSubButtonActive : ''} ${!section.enabled ? styles.sidebarSubButtonDisabled : ''}`}
                                    onClick={() => onViewChange({ type: 'edit', sectionId: section.id })}
                                >
                                    <span className={styles.sidebarSubIcon}>
                                        <Icon name={config.icon} size={14} />
                                    </span>
                                    <span className={styles.sidebarSubLabel}>{section.label}</span>
                                    {section.itemCount !== undefined && section.itemCount > 0 && (
                                        <span className={styles.sidebarSubCount}>{section.itemCount}</span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.sidebarSubVisibility} ${!section.enabled ? styles.sidebarSubVisibilityOff : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onToggleVisibility(section.id)
                                    }}
                                    aria-label={section.enabled ? 'Hide section' : 'Show section'}
                                >
                                    <Icon name={section.enabled ? 'eye' : 'eye-off'} size={12} />
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </div>

            {/* AI Summary Section - only show if not hidden and we have summary data */}
            {!hideAiSummary && summary && (
                <div className={styles.sidebarGroup}>
                    <button
                        type="button"
                        className={`${styles.sidebarGroupHeader} ${isSummaryActive ? styles.sidebarGroupHeaderActive : ''}`}
                        onClick={() => onViewChange({ type: 'summary' })}
                    >
                        <span className={styles.sidebarGroupIcon}>
                            <Icon name="sparkles" size={16} />
                        </span>
                        <span className={styles.sidebarGroupLabel}>AI Summary</span>
                        <span className={styles.sidebarGroupBadge}>{summary.totalChanges}</span>
                    </button>

                    <ul className={`${styles.sidebarSubItems} ${isSummaryActive ? styles.sidebarSubItemsOpen : ''}`}>
                        <SummaryNavItem
                            icon="bar-chart"
                            label="Overview"
                            onClick={() => onViewChange({ type: 'summary', scrollTo: 'overview' })}
                            index={0}
                        />
                        <SummaryNavItem
                            icon="check-circle"
                            label="Key Improvements"
                            count={summary.keyImprovements.length}
                            onClick={() => onViewChange({ type: 'summary', scrollTo: 'improvements' })}
                            index={1}
                        />
                        <SummaryNavItem
                            icon="tag"
                            label="Keywords Added"
                            count={summary.keywordsAdded.length}
                            onClick={() => onViewChange({ type: 'summary', scrollTo: 'keywords' })}
                            index={2}
                        />
                        {hasRequirements && (
                            <SummaryNavItem
                                icon="list"
                                label="Requirements"
                                onClick={() => onViewChange({ type: 'summary', scrollTo: 'requirements' })}
                                index={3}
                            />
                        )}
                        {summary.warnings && summary.warnings.length > 0 && (
                            <SummaryNavItem
                                icon="alert-triangle"
                                label="Warnings"
                                count={summary.warnings.length}
                                onClick={() => onViewChange({ type: 'summary', scrollTo: 'warnings' })}
                                isWarning
                                index={hasRequirements ? 4 : 3}
                            />
                        )}
                    </ul>
                </div>
            )}
        </nav>
    )
}

// Summary nav item sub-component
interface SummaryNavItemProps {
    icon: IconName
    label: string
    count?: number
    onClick: () => void
    isWarning?: boolean
    index: number
}

function SummaryNavItem({ icon, label, count, onClick, isWarning, index }: SummaryNavItemProps) {
    return (
        <li
            className={styles.sidebarSubItem}
            style={{ '--item-index': index } as React.CSSProperties}
        >
            <button
                type="button"
                className={`${styles.sidebarSubButton} ${isWarning ? styles.sidebarSubButtonWarning : ''}`}
                onClick={onClick}
            >
                <span className={styles.sidebarSubIcon}>
                    <Icon name={icon} size={14} />
                </span>
                <span className={styles.sidebarSubLabel}>{label}</span>
                {count !== undefined && count > 0 && (
                    <span className={`${styles.sidebarSubCount} ${isWarning ? styles.sidebarSubCountWarning : ''}`}>
                        {count}
                    </span>
                )}
            </button>
        </li>
    )
}
