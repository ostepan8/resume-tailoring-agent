'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth-context'
import {
    jobsDb,
    type SavedJob,
} from '../../../lib/database'
import styles from './jobs.module.css'

type JobStatus = SavedJob['status']

const statusLabels: Record<JobStatus, string> = {
    saved: 'Saved',
    applied: 'Applied',
    interviewing: 'Interviewing',
    rejected: 'Rejected',
    offered: 'Offered',
}

const statusColors: Record<JobStatus, string> = {
    saved: 'neutral',
    applied: 'blue',
    interviewing: 'orange',
    rejected: 'red',
    offered: 'green',
}

export default function JobsPage() {
    const { user } = useAuth()
    const [jobs, setJobs] = useState<SavedJob[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<JobStatus | 'all'>('all')
    const [showAddModal, setShowAddModal] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        description: '',
        url: '',
        notes: '',
    })
    const [saving, setSaving] = useState(false)
    
    // Track if initial data has been fetched to prevent re-fetching on re-renders
    const hasFetchedRef = useRef(false)

    const loadJobs = useCallback(async (userId: string) => {
        setLoading(true)
        const data = await jobsDb.getAll(userId)
        setJobs(data)
        setLoading(false)
    }, [])

    // Fetch data only once when user becomes available
    useEffect(() => {
        if (user?.id && !hasFetchedRef.current) {
            hasFetchedRef.current = true
            loadJobs(user.id)
        }
    }, [user?.id, loadJobs])

    const handleStatusChange = async (id: string, status: JobStatus) => {
        await jobsDb.updateStatus(id, status)
        setJobs(jobs.map((job) => (job.id === id ? { ...job, status } : job)))
    }

    const handleAddJob = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)
        try {
            await jobsDb.create({
                user_id: user.id,
                title: formData.title,
                company: formData.company || null,
                description: formData.description,
                url: formData.url || null,
                status: 'saved',
                notes: formData.notes || null,
            })
            await loadJobs(user.id)
            setShowAddModal(false)
            setFormData({ title: '', company: '', description: '', url: '', notes: '' })
        } catch (error) {
            console.error('Error saving job:', error)
        } finally {
            setSaving(false)
        }
    }

    const filteredJobs = filter === 'all' ? jobs : jobs.filter((job) => job.status === filter)

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        })
    }

    const getStatusCounts = () => {
        const counts: Record<string, number> = { all: jobs.length }
        jobs.forEach((job) => {
            counts[job.status] = (counts[job.status] || 0) + 1
        })
        return counts
    }

    const counts = getStatusCounts()

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1>Saved Jobs</h1>
                    <p>Track your job applications and their status.</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className={styles.addBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add Job
                </button>
            </header>

            {/* Filter Tabs */}
            <div className={styles.filters}>
                <button
                    className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All <span className={styles.count}>{counts.all || 0}</span>
                </button>
                {(['saved', 'applied', 'interviewing', 'offered', 'rejected'] as JobStatus[]).map((status) => (
                    <button
                        key={status}
                        className={`${styles.filterTab} ${filter === status ? styles.active : ''}`}
                        onClick={() => setFilter(status)}
                    >
                        {statusLabels[status]}
                        {counts[status] > 0 && <span className={styles.count}>{counts[status]}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className={styles.loadingList}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={styles.loadingCard} />
                    ))}
                </div>
            ) : filteredJobs.length > 0 ? (
                <div className={styles.jobsList}>
                    {filteredJobs.map((job) => (
                        <div key={job.id} className={styles.jobCard}>
                            <div className={styles.jobMain}>
                                <div className={styles.jobInfo}>
                                    <h3>{job.title}</h3>
                                    {job.company && <p className={styles.company}>{job.company}</p>}
                                    <p className={styles.jobDate}>Added {formatDate(job.created_at)}</p>
                                </div>

                                <div className={styles.jobActions}>
                                    <select
                                        value={job.status}
                                        onChange={(e) => handleStatusChange(job.id, e.target.value as JobStatus)}
                                        className={`${styles.statusSelect} ${styles[statusColors[job.status]]}`}
                                    >
                                        {Object.entries(statusLabels).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>

                                    <Link
                                        href={`/tailor?job=${encodeURIComponent(job.description)}`}
                                        className={styles.tailorBtn}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 20h9" />
                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                        </svg>
                                        Tailor
                                    </Link>
                                </div>
                            </div>

                            {job.notes && (
                                <p className={styles.notes}>{job.notes}</p>
                            )}

                            {job.url && (
                                <a href={job.url} target="_blank" rel="noopener noreferrer" className={styles.jobLink}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                    View Job Posting
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <h3>{filter === 'all' ? 'No saved jobs' : `No ${statusLabels[filter as JobStatus].toLowerCase()} jobs`}</h3>
                    <p>
                        {filter === 'all'
                            ? 'Save jobs to track your applications and quickly tailor resumes.'
                            : 'Jobs with this status will appear here.'}
                    </p>
                    {filter === 'all' && (
                        <button onClick={() => setShowAddModal(true)} className={styles.emptyAction}>
                            Add Your First Job
                        </button>
                    )}
                </div>
            )}

            {/* Add Job Modal */}
            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Add Job</h2>
                            <button onClick={() => setShowAddModal(false)} className={styles.closeBtn}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleAddJob} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="title">Job Title *</label>
                                <input
                                    id="title"
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Senior Software Engineer"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="company">Company</label>
                                <input
                                    id="company"
                                    type="text"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    placeholder="e.g., Acme Corp"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="description">Job Description *</label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Paste the job description here..."
                                    rows={6}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="url">Job URL</label>
                                <input
                                    id="url"
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="notes">Notes</label>
                                <textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Any personal notes about this position..."
                                    rows={3}
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" onClick={() => setShowAddModal(false)} className={styles.cancelBtn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className={styles.saveBtn}>
                                    {saving ? 'Saving...' : 'Save Job'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
