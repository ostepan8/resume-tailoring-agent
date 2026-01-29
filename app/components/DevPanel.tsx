'use client'

import { useState } from 'react'
import { useUser, useClerk, SignInButton } from '@clerk/nextjs'
import { useAuth } from '../../lib/auth-context'
import { isSupabaseConfigured } from '../../lib/supabase'
import styles from './DevPanel.module.css'

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

export default function DevPanel() {
    const { profile, loading, signOut, isConfigured } = useAuth()
    const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
    const { openSignIn } = useClerk()
    const [isOpen, setIsOpen] = useState(false)

    // Don't render anything if not in dev mode
    if (!IS_DEV) return null

    const handleSignOut = async () => {
        await signOut()
    }

    const handleClearStorage = () => {
        localStorage.clear()
        sessionStorage.clear()
        alert('Storage cleared! Refresh the page.')
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    return (
        <>
            {/* Toggle Button */}
            <button
                className={styles.toggleBtn}
                onClick={() => setIsOpen(!isOpen)}
                title="Dev Panel"
            >
                🛠️
            </button>

            {/* Panel */}
            {isOpen && (
                <div className={styles.panel}>
                    <div className={styles.header}>
                        <h3>🛠️ Dev Panel</h3>
                        <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>
                            ×
                        </button>
                    </div>

                    <div className={styles.content}>
                        {/* Status Section */}
                        <section className={styles.section}>
                            <h4>Status</h4>
                            <div className={styles.statusGrid}>
                                <div className={styles.statusItem}>
                                    <span className={styles.statusLabel}>Clerk</span>
                                    <span className={`${styles.statusValue} ${clerkLoaded ? styles.success : styles.warning}`}>
                                        {clerkLoaded ? '✅ Loaded' : '⏳ Loading'}
                                    </span>
                                </div>
                                <div className={styles.statusItem}>
                                    <span className={styles.statusLabel}>Supabase</span>
                                    <span className={`${styles.statusValue} ${isConfigured ? styles.success : styles.error}`}>
                                        {isConfigured ? '✅ Connected' : '❌ Not configured'}
                                    </span>
                                </div>
                                <div className={styles.statusItem}>
                                    <span className={styles.statusLabel}>Profile Loading</span>
                                    <span className={styles.statusValue}>{loading ? '⏳ Yes' : '✓ No'}</span>
                                </div>
                                <div className={styles.statusItem}>
                                    <span className={styles.statusLabel}>Auth</span>
                                    <span className={`${styles.statusValue} ${clerkUser ? styles.success : styles.warning}`}>
                                        {clerkUser ? '✅ Signed In' : '⚠️ Not signed in'}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* User Info */}
                        <section className={styles.section}>
                            <h4>User</h4>
                            {clerkUser ? (
                                <div className={styles.userInfo}>
                                    <div className={styles.infoRow}>
                                        <span>Email:</span>
                                        <code onClick={() => copyToClipboard(clerkUser.primaryEmailAddress?.emailAddress || '')}>
                                            {clerkUser.primaryEmailAddress?.emailAddress}
                                        </code>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span>Clerk ID:</span>
                                        <code onClick={() => copyToClipboard(clerkUser.id)} title="Click to copy">
                                            {clerkUser.id.slice(0, 12)}...
                                        </code>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span>Name:</span>
                                        <code>{clerkUser.fullName || profile?.full_name || 'Not set'}</code>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span>Profile synced:</span>
                                        <code>{profile ? '✅ Yes' : '❌ No'}</code>
                                    </div>
                                    <button onClick={handleSignOut} className={styles.dangerBtn}>
                                        Sign Out
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.signInForm}>
                                    <p className={styles.noUser}>No user signed in</p>
                                    <SignInButton mode="modal">
                                        <button className={styles.primaryBtn}>
                                            Sign In with Clerk
                                        </button>
                                    </SignInButton>
                                </div>
                            )}
                        </section>

                        {/* Actions */}
                        <section className={styles.section}>
                            <h4>Actions</h4>
                            <div className={styles.actions}>
                                <button onClick={handleClearStorage} className={styles.actionBtn}>
                                    🗑️ Clear Storage
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className={styles.actionBtn}
                                >
                                    🔃 Reload Page
                                </button>
                                <button
                                    onClick={() => console.log({ clerkUser, profile, isConfigured })}
                                    className={styles.actionBtn}
                                >
                                    📋 Log State
                                </button>
                            </div>
                        </section>

                        {/* Environment */}
                        <section className={styles.section}>
                            <h4>Environment</h4>
                            <div className={styles.envInfo}>
                                <div className={styles.infoRow}>
                                    <span>CLERK_KEY:</span>
                                    <code>
                                        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                                            ? '✅ Set (hidden)'
                                            : '❌ Not set'}
                                    </code>
                                </div>
                                <div className={styles.infoRow}>
                                    <span>SUPABASE_URL:</span>
                                    <code>
                                        {process.env.NEXT_PUBLIC_SUPABASE_URL
                                            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.slice(0, 30)}...`
                                            : '❌ Not set'}
                                    </code>
                                </div>
                                <div className={styles.infoRow}>
                                    <span>SUPABASE_KEY:</span>
                                    <code>
                                        {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                                            ? '✅ Set (hidden)'
                                            : '❌ Not set'}
                                    </code>
                                </div>
                                <div className={styles.infoRow}>
                                    <span>DEV_MODE:</span>
                                    <code>{process.env.NEXT_PUBLIC_DEV_MODE || 'false'}</code>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </>
    )
}
