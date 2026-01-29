'use client'

import React from 'react'
import { Icon } from './icons'
import type { SaveState } from './types'
import styles from './ResumeEditor.module.css'

interface SaveStateIndicatorProps {
    state: SaveState
    lastSavedAt?: Date | null
}

export function SaveStateIndicator({ state, lastSavedAt }: SaveStateIndicatorProps) {
    const getStateConfig = () => {
        switch (state) {
            case 'saved':
                return {
                    icon: 'check',
                    label: lastSavedAt ? `Saved ${formatRelativeTime(lastSavedAt)}` : 'Saved',
                    className: styles.saveStateSaved,
                }
            case 'saving':
                return {
                    icon: 'loader',
                    label: 'Saving...',
                    className: styles.saveStateSaving,
                }
            case 'unsaved':
                return {
                    icon: 'alert-circle',
                    label: 'Unsaved changes',
                    className: styles.saveStateUnsaved,
                }
            case 'error':
                return {
                    icon: 'alert-circle',
                    label: 'Save failed',
                    className: styles.saveStateError,
                }
            default:
                return {
                    icon: 'check',
                    label: 'Ready',
                    className: '',
                }
        }
    }

    const config = getStateConfig()

    return (
        <div className={`${styles.saveState} ${config.className}`} role="status" aria-live="polite">
            <span className={styles.saveStateIcon}>
                <Icon name={config.icon} size={14} />
            </span>
            <span>{config.label}</span>
        </div>
    )
}

// Format relative time (e.g., "just now", "2 min ago")
function formatRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)

    if (diffSeconds < 10) {
        return 'just now'
    } else if (diffSeconds < 60) {
        return `${diffSeconds}s ago`
    } else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`
    } else if (diffHours < 24) {
        return `${diffHours}h ago`
    } else {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
}
