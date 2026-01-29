'use client'

import React, { useState } from 'react'
import { Icon } from '../icons'
import type { HeaderBlock } from '../../../../resume-test/types'
import styles from '../ResumeEditor.module.css'

interface HeaderEditorProps {
    block: HeaderBlock
    onUpdate: (data: HeaderBlock['data']) => void
}

export function HeaderEditor({ block, onUpdate }: HeaderEditorProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const handleChange = (field: keyof HeaderBlock['data'], value: string) => {
        onUpdate({ ...block.data, [field]: value || undefined })
    }

    // Generate summary for collapsed view
    const getSummary = () => {
        const parts = [block.data.name, block.data.email, block.data.phone].filter(Boolean)
        return parts.join(' • ') || 'Add your contact information'
    }

    return (
        <div className={styles.entriesList}>
            <div className={`${styles.entryCard} ${isExpanded ? styles.entryCardExpanded : ''}`}>
                <div
                    className={styles.entryCardHeader}
                    onClick={() => setIsExpanded(!isExpanded)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setIsExpanded(!isExpanded)
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                >
                    <div className={styles.entryInfo}>
                        <p className={styles.entryTitle}>Contact Information</p>
                        <p className={styles.entryMeta}>{getSummary()}</p>
                    </div>

                    <span className={`${styles.entryExpandIcon} ${isExpanded ? styles.entryExpandIconRotated : ''}`}>
                        <Icon name="chevron-down" size={18} />
                    </span>
                </div>

                <div className={`${styles.entryCardBody} ${isExpanded ? styles.entryCardBodyExpanded : styles.entryCardBodyCollapsed}`}>
                    {isExpanded && (
                        <div className={styles.formGrid}>
                            <div className={`${styles.formField} ${styles.formGridFullWidth}`}>
                                <label className={styles.formLabel} htmlFor="header-name">Full Name</label>
                                <input
                                    id="header-name"
                                    type="text"
                                    className={styles.formInput}
                                    value={block.data.name || ''}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="John Smith"
                                    autoComplete="name"
                                />
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.formLabel} htmlFor="header-email">Email</label>
                                <input
                                    id="header-email"
                                    type="email"
                                    className={styles.formInput}
                                    value={block.data.email || ''}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="john@example.com"
                                    autoComplete="email"
                                />
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.formLabel} htmlFor="header-phone">Phone</label>
                                <input
                                    id="header-phone"
                                    type="tel"
                                    className={styles.formInput}
                                    value={block.data.phone || ''}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="(555) 123-4567"
                                    autoComplete="tel"
                                />
                            </div>

                            <div className={`${styles.formField} ${styles.formGridFullWidth}`}>
                                <label className={styles.formLabel} htmlFor="header-location">Location</label>
                                <input
                                    id="header-location"
                                    type="text"
                                    className={styles.formInput}
                                    value={block.data.location || ''}
                                    onChange={(e) => handleChange('location', e.target.value)}
                                    placeholder="San Francisco, CA"
                                />
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.formLabel} htmlFor="header-linkedin">LinkedIn</label>
                                <input
                                    id="header-linkedin"
                                    type="url"
                                    className={styles.formInput}
                                    value={block.data.linkedin || ''}
                                    onChange={(e) => handleChange('linkedin', e.target.value)}
                                    placeholder="linkedin.com/in/johnsmith"
                                />
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.formLabel} htmlFor="header-github">GitHub</label>
                                <input
                                    id="header-github"
                                    type="url"
                                    className={styles.formInput}
                                    value={block.data.github || ''}
                                    onChange={(e) => handleChange('github', e.target.value)}
                                    placeholder="github.com/johnsmith"
                                />
                            </div>

                            <div className={`${styles.formField} ${styles.formGridFullWidth}`}>
                                <label className={styles.formLabel} htmlFor="header-website">Website</label>
                                <input
                                    id="header-website"
                                    type="url"
                                    className={styles.formInput}
                                    value={block.data.website || ''}
                                    onChange={(e) => handleChange('website', e.target.value)}
                                    placeholder="johnsmith.dev"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
