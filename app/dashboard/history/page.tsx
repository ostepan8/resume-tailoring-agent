'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { historyDb, type TailoringHistory } from '../../../lib/database'
import styles from './history.module.css'

export default function HistoryPage() {
    const { user } = useAuth()
    const [history, setHistory] = useState<TailoringHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedItem, setSelectedItem] = useState<TailoringHistory | null>(null)
    
    // Track if initial data has been fetched to prevent re-fetching on re-renders
    const hasFetchedRef = useRef(false)

    const loadHistory = useCallback(async (userId: string) => {
        setLoading(true)
        const data = await historyDb.getAll(userId)
        setHistory(data)
        setLoading(false)
    }, [])

    // Fetch data only once when user becomes available
    useEffect(() => {
        if (user?.id && !hasFetchedRef.current) {
            hasFetchedRef.current = true
            loadHistory(user.id)
        }
    }, [user?.id, loadHistory])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const getMatchScoreColor = (score: number) => {
        if (score >= 80) return 'high'
        if (score >= 60) return 'medium'
        return 'low'
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1>Tailoring History</h1>
                    <p>View your past resume tailoring sessions and their results.</p>
                </div>
            </header>

            {loading ? (
                <div className={styles.loadingList}>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={styles.loadingItem} />
                    ))}
                </div>
            ) : history.length > 0 ? (
                <div className={styles.historyList}>
                    {history.map((item) => (
                        <div
                            key={item.id}
                            className={styles.historyItem}
                            onClick={() => setSelectedItem(item)}
                        >
                            <div className={styles.historyIcon}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                            </div>

                            <div className={styles.historyContent}>
                                <h3>{item.job_title}</h3>
                                {item.company_name && (
                                    <p className={styles.companyName}>{item.company_name}</p>
                                )}
                                <p className={styles.historyDate}>{formatDate(item.created_at)}</p>
                            </div>

                            {item.match_score && (
                                <div className={`${styles.matchScore} ${styles[getMatchScoreColor(item.match_score)]}`}>
                                    <span className={styles.scoreValue}>{item.match_score}%</span>
                                    <span className={styles.scoreLabel}>Match</span>
                                </div>
                            )}

                            <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <h3>No history yet</h3>
                    <p>Your tailored resumes will appear here after you complete a tailoring session.</p>
                </div>
            )}

            {/* Detail Modal */}
            {selectedItem && (
                <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h2>{selectedItem.job_title}</h2>
                                {selectedItem.company_name && (
                                    <p className={styles.modalCompany}>{selectedItem.company_name}</p>
                                )}
                            </div>
                            <button onClick={() => setSelectedItem(null)} className={styles.closeBtn}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className={styles.modalContent}>
                            <div className={styles.modalMeta}>
                                <div className={styles.metaItem}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    <span>{formatDate(selectedItem.created_at)}</span>
                                </div>
                                {selectedItem.match_score && (
                                    <div className={`${styles.metaScore} ${styles[getMatchScoreColor(selectedItem.match_score)]}`}>
                                        {selectedItem.match_score}% Match
                                    </div>
                                )}
                            </div>

                            <div className={styles.modalSection}>
                                <h4>Job Description</h4>
                                <p className={styles.jobDescPreview}>
                                    {selectedItem.job_description.slice(0, 500)}
                                    {selectedItem.job_description.length > 500 && '...'}
                                </p>
                            </div>

                            <div className={styles.modalActions}>
                                <button className={styles.viewResumeBtn}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <path d="M14 2v6h6" />
                                    </svg>
                                    View Tailored Resume
                                </button>
                                <button className={styles.downloadBtn}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
