'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import Navbar from '../components/Navbar'
import styles from './dashboard.module.css'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, loading, isConfigured } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    // Track if we've determined auth state to prevent flash
    const [authChecked, setAuthChecked] = useState(false)

    useEffect(() => {
        // Only act once loading is complete
        if (!loading) {
            setAuthChecked(true)
            if (!user) {
                router.replace('/')
            }
        }
    }, [user, loading, router])

    // Show loading state while:
    // 1. Auth is still loading
    // 2. Auth check is complete but we haven't rendered yet
    // 3. User is not authenticated (we're about to redirect)
    if (loading || !authChecked || !user) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner} />
                <p>{!isConfigured ? 'Database not configured' : 'Loading...'}</p>
            </div>
        )
    }

    const navItems = [
        { href: '/dashboard', label: 'Overview', icon: 'grid' },
        { href: '/dashboard/profile', label: 'Profile', icon: 'user' },
        { href: '/dashboard/resumes', label: 'Resumes', icon: 'file' },
        { href: '/dashboard/experience', label: 'Experience', icon: 'briefcase' },
        { href: '/dashboard/education', label: 'Education', icon: 'graduation' },
        { href: '/dashboard/projects', label: 'Projects', icon: 'folder' },
        { href: '/dashboard/skills', label: 'Skills', icon: 'layers' },
        { href: '/dashboard/awards', label: 'Awards', icon: 'award' },
        { href: '/dashboard/jobs', label: 'Saved Jobs', icon: 'bookmark' },
    ]

    const getIcon = (icon: string) => {
        switch (icon) {
            case 'grid':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="9" rx="1" />
                        <rect x="14" y="3" width="7" height="5" rx="1" />
                        <rect x="14" y="12" width="7" height="9" rx="1" />
                        <rect x="3" y="16" width="7" height="5" rx="1" />
                    </svg>
                )
            case 'file':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                )
            case 'briefcase':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                )
            case 'graduation':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                )
            case 'folder':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                )
            case 'layers':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                    </svg>
                )
            case 'award':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="7" />
                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                    </svg>
                )
            case 'clock':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                )
            case 'bookmark':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                )
            case 'user':
                return (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                )
            default:
                return null
        }
    }

    return (
        <div className={styles.container}>
            <Navbar />
            <div className={styles.dashboardLayout}>
                <aside className={styles.sidebar} data-tour="sidebar">
                    <nav className={styles.sidebarNav} data-tour="sidebar-nav">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.sidebarLink} ${pathname === item.href ? styles.sidebarLinkActive : ''
                                    }`}
                                {...(item.href === '/dashboard/resumes' ? { 'data-tour': 'resumes-tab' } : {})}
                            >
                                {getIcon(item.icon)}
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </nav>

                    <div className={styles.sidebarFooter} data-tour="tailor-button">
                        <Link href="/tailor" className={styles.newTailorBtn}>
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            New Tailoring
                        </Link>
                    </div>
                </aside>
                <main className={styles.mainContent}>
                    {children}
                </main>
            </div>
        </div>
    )
}
