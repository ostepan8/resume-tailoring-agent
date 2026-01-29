'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'
import {
    resumesDb,
    projectsDb,
    historyDb,
    jobsDb,
    experienceDb,
    educationDb,
    awardsDb,
    skillsDb,
    type TailoringHistory,
} from '../../lib/database'
import { SkeletonStatCard, SkeletonActivityItem, SkeletonQuickAction } from '../components/Skeleton'
import styles from './page.module.css'

export default function DashboardPage() {
    const { user, profile, loading: authLoading } = useAuth()

    const [stats, setStats] = useState({
        resumes: 0,
        experience: 0,
        education: 0,
        projects: 0,
        skills: 0,
        awards: 0,
        tailorings: 0,
        savedJobs: 0,
    })
    const [recentHistory, setRecentHistory] = useState<TailoringHistory[]>([])
    const [dataLoading, setDataLoading] = useState(true)

    // Track if initial data has been fetched to prevent re-fetching on re-renders
    const hasFetchedRef = useRef(false)

    const loadDashboardData = useCallback(async (userId: string) => {
        setDataLoading(true)

        try {
            const [resumes, projects, history, jobs, experience, education, awards, skills] = await Promise.all([
                resumesDb.getAll(userId),
                projectsDb.getAll(userId),
                historyDb.getAll(userId),
                jobsDb.getAll(userId),
                experienceDb.getAll(userId),
                educationDb.getAll(userId),
                awardsDb.getAll(userId),
                skillsDb.getAll(userId),
            ])

            const newStats = {
                resumes: resumes.length,
                experience: experience.length,
                education: education.length,
                projects: projects.length,
                skills: skills.length,
                awards: awards.length,
                tailorings: history.length,
                savedJobs: jobs.length,
            }

            setStats(newStats)
            setRecentHistory(history.slice(0, 5))
        } catch (error) {
            console.error('Error loading dashboard data:', error)
        } finally {
            setDataLoading(false)
        }
    }, [])

    // Fetch data only once when user becomes available and auth is done loading
    useEffect(() => {
        if (!authLoading && user?.id && !hasFetchedRef.current) {
            hasFetchedRef.current = true
            loadDashboardData(user.id)
        }
    }, [user?.id, authLoading, loadDashboardData])

    // Combined loading state
    const loading = authLoading || dataLoading

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 18) return 'Good afternoon'
        return 'Good evening'
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.greeting}>
                    <h1>{getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'}!</h1>
                    <p>Here&apos;s an overview of your resume tailoring activity.</p>
                </div>
                <Link href="/tailor" className={styles.headerAction}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    New Tailoring
                </Link>
            </header>

            {/* Stats Grid */}
            <div className={styles.statsGrid} data-tour="stats-grid">
                {loading ? (
                    <>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <SkeletonStatCard key={i} />
                        ))}
                    </>
                ) : (
                    <>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <path d="M14 2v6h6" />
                                </svg>
                            </div>
                            <div className={styles.statContent}>
                                <p className={styles.statValue}>{stats.resumes}</p>
                                <p className={styles.statLabel}>Resumes</p>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'rgba(255, 92, 40, 0.1)', color: '#ff5c28' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                </svg>
                            </div>
                            <div className={styles.statContent}>
                                <p className={styles.statValue}>{stats.experience}</p>
                                <p className={styles.statLabel}>Experience</p>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'rgba(147, 112, 219, 0.1)', color: '#9370db' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                </svg>
                            </div>
                            <div className={styles.statContent}>
                                <p className={styles.statValue}>{stats.education}</p>
                                <p className={styles.statLabel}>Education</p>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <div className={styles.statContent}>
                                <p className={styles.statValue}>{stats.projects}</p>
                                <p className={styles.statLabel}>Projects</p>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'rgba(62, 208, 195, 0.1)', color: '#3ed0c3' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                    <polyline points="2 17 12 22 22 17" />
                                    <polyline points="2 12 12 17 22 12" />
                                </svg>
                            </div>
                            <div className={styles.statContent}>
                                <p className={styles.statValue}>{stats.skills}</p>
                                <p className={styles.statLabel}>Skills</p>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'rgba(240, 176, 96, 0.1)', color: '#f0b060' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="8" r="7" />
                                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                                </svg>
                            </div>
                            <div className={styles.statContent}>
                                <p className={styles.statValue}>{stats.awards}</p>
                                <p className={styles.statLabel}>Awards</p>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                            </div>
                            <div className={styles.statContent}>
                                <p className={styles.statValue}>{stats.tailorings}</p>
                                <p className={styles.statLabel}>Tailorings</p>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <div className={styles.statContent}>
                                <p className={styles.statValue}>{stats.savedJobs}</p>
                                <p className={styles.statLabel}>Saved Jobs</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Quick Actions */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Quick Actions</h2>
                <div className={styles.quickActions} data-tour="quick-actions">
                    <Link href="/tailor" className={styles.quickAction}>
                        <div className={styles.quickActionIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                        </div>
                        <div>
                            <h3>Tailor Resume</h3>
                            <p>Customize your resume for a specific job</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/experience" className={styles.quickAction}>
                        <div className={styles.quickActionIcon} style={{ background: 'rgba(255, 92, 40, 0.1)', color: '#ff5c28' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                        </div>
                        <div>
                            <h3>Add Experience</h3>
                            <p>Document your work history</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/skills" className={styles.quickAction}>
                        <div className={styles.quickActionIcon} style={{ background: 'rgba(62, 208, 195, 0.1)', color: '#3ed0c3' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                <polyline points="2 17 12 22 22 17" />
                                <polyline points="2 12 12 17 22 12" />
                            </svg>
                        </div>
                        <div>
                            <h3>Add Skills</h3>
                            <p>List your technical and soft skills</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/education" className={styles.quickAction}>
                        <div className={styles.quickActionIcon} style={{ background: 'rgba(147, 112, 219, 0.1)', color: '#9370db' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                <path d="M6 12v5c3 3 9 3 12 0v-5" />
                            </svg>
                        </div>
                        <div>
                            <h3>Add Education</h3>
                            <p>Add your academic background</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/awards" className={styles.quickAction}>
                        <div className={styles.quickActionIcon} style={{ background: 'rgba(240, 176, 96, 0.1)', color: '#f0b060' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="8" r="7" />
                                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                            </svg>
                        </div>
                        <div>
                            <h3>Add Awards</h3>
                            <p>Showcase your achievements</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/projects" className={styles.quickAction}>
                        <div className={styles.quickActionIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3>Add Project</h3>
                            <p>Document your projects</p>
                        </div>
                    </Link>
                </div>
            </section>

            {/* Recent Activity */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Recent Activity</h2>
                    <Link href="/dashboard/history" className={styles.viewAllLink}>
                        View All
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                {loading ? (
                    <div className={styles.activityList}>
                        {[1, 2, 3].map((i) => (
                            <SkeletonActivityItem key={i} />
                        ))}
                    </div>
                ) : recentHistory.length > 0 ? (
                    <div className={styles.activityList}>
                        {recentHistory.map((item) => (
                            <div key={item.id} className={styles.activityItem}>
                                <div className={styles.activityIcon}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                    </svg>
                                </div>
                                <div className={styles.activityContent}>
                                    <p className={styles.activityTitle}>
                                        Tailored resume for <strong>{item.job_title}</strong>
                                        {item.company_name && <span> at {item.company_name}</span>}
                                    </p>
                                    <p className={styles.activityDate}>{formatDate(item.created_at)}</p>
                                </div>
                                {item.match_score && (
                                    <div className={styles.matchScore}>
                                        <span className={styles.matchScoreValue}>{item.match_score}%</span>
                                        <span className={styles.matchScoreLabel}>Match</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <p>No tailoring history yet</p>
                        <Link href="/tailor" className={styles.emptyAction}>
                            Get started
                        </Link>
                    </div>
                )}
            </section>
        </div>
    )
}
