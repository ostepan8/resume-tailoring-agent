'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { ResumeBlock as RB } from '../../../resume-test/types'
import { SectionNav, extractSectionMeta } from './SectionNav'
import { EditPanel } from './EditPanel'
import { SaveStateIndicator } from './SaveStateIndicator'
import type { ResumeEditorProps, SaveState } from './types'
import type { ResumeBlock, ResumeDocument } from '../../../resume-test/types'
import styles from './ResumeEditor.module.css'

const DEFAULT_AUTO_SAVE_DELAY = 1000 // 1 second

export function ResumeEditor({
    initialDocument,
    jobDescription,
    onDocumentChange,
    onPreviewUpdate,
    autoSaveDelay = DEFAULT_AUTO_SAVE_DELAY,
}: ResumeEditorProps) {
    // State
    const [document, setDocument] = useState<ResumeDocument>(initialDocument)
    const [activeSection, setActiveSection] = useState<string | null>(
        initialDocument.blocks.length > 0 ? initialDocument.blocks[0].id : null
    )
    const [saveState, setSaveState] = useState<SaveState>('saved')
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date())

    // Refs for debouncing
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const documentRef = useRef(document)

    // Keep ref in sync
    useEffect(() => {
        documentRef.current = document
    }, [document])

    // Extracted section metadata for nav
    const sectionMetas = useMemo(
        () => extractSectionMeta(document.blocks),
        [document.blocks]
    )


    // Handle section selection
    const handleSectionSelect = useCallback((sectionId: string) => {
        setActiveSection(sectionId)
    }, [])

    // Handle visibility toggle
    const handleToggleVisibility = useCallback((sectionId: string) => {
        setDocument((prev) => ({
            ...prev,
            blocks: prev.blocks.map((block) =>
                block.id === sectionId ? { ...block, enabled: !block.enabled } : block
            ),
        }))
        setSaveState('unsaved')
    }, [])

    // Handle section reordering via drag and drop
    const handleSectionReorder = useCallback((reorderedBlocks: RB[]) => {
        setDocument((prev) => ({
            ...prev,
            blocks: reorderedBlocks,
        }))
        setSaveState('unsaved')
    }, [])

    // Handle block data update
    const handleBlockUpdate = useCallback(
        (blockId: string, data: ResumeBlock['data']) => {
            setDocument((prev) => ({
                ...prev,
                blocks: prev.blocks.map((block) =>
                    block.id === blockId ? { ...block, data } : block
                ) as ResumeBlock[],
            }))
            setSaveState('unsaved')
        },
        []
    )

    // Debounced save and preview update
    useEffect(() => {
        if (saveState !== 'unsaved') return

        // Clear existing timeouts
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        if (previewTimeoutRef.current) {
            clearTimeout(previewTimeoutRef.current)
        }

        // Set up debounced preview update (faster than save)
        previewTimeoutRef.current = setTimeout(() => {
            onPreviewUpdate?.(documentRef.current)
        }, autoSaveDelay / 2)

        // Set up debounced save
        saveTimeoutRef.current = setTimeout(() => {
            setSaveState('saving')

            // Simulate save (in real app, this would be an API call)
            setTimeout(() => {
                onDocumentChange?.(documentRef.current)
                setSaveState('saved')
                setLastSavedAt(new Date())
            }, 200)
        }, autoSaveDelay)

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
            if (previewTimeoutRef.current) {
                clearTimeout(previewTimeoutRef.current)
            }
        }
    }, [saveState, autoSaveDelay, onDocumentChange, onPreviewUpdate])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + S to save immediately
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                if (saveState === 'unsaved') {
                    setSaveState('saving')
                    setTimeout(() => {
                        onDocumentChange?.(documentRef.current)
                        setSaveState('saved')
                        setLastSavedAt(new Date())
                    }, 200)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [saveState, onDocumentChange])

    return (
        <div className={styles.editor}>
            {/* Context Bar */}
            <div className={styles.contextBar}>
                <div className={styles.contextInfo}>
                    <span className={styles.contextLabel}>Tailoring for</span>
                    <span className={styles.contextTitle}>
                        {jobDescription.title}
                        <span className={styles.contextCompany}> @ {jobDescription.company}</span>
                    </span>
                </div>
                <div className={styles.contextActions}>
                    <SaveStateIndicator state={saveState} lastSavedAt={lastSavedAt} />
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.content}>
                <SectionNav
                    sections={sectionMetas}
                    activeSection={activeSection}
                    onSectionSelect={handleSectionSelect}
                    onToggleVisibility={handleToggleVisibility}
                />
                <EditPanel
                    blocks={document.blocks}
                    activeSection={activeSection}
                    onUpdate={handleBlockUpdate}
                    onReorder={handleSectionReorder}
                />
            </div>
        </div>
    )
}

// Export for convenience
export { extractSectionMeta } from './SectionNav'
