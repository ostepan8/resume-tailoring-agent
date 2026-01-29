'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/auth-context'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import styles from './DevPanel.module.css'

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

export default function DevPanel() {
    const { user, profile, session, loading, signOut, isConfigured } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [signInLoading, setSignInLoading] = useState(false)
    const [signInError, setSignInError] = useState<string | null>(null)

    // Don't render anything if not in dev mode
    if (!IS_DEV) return null

    const handleQuickSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        setSignInLoading(true)
        setSignInError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) {
                setSignInError(error.message)
            } else {
                setEmail('')
                setPassword('')
            }
        } catch (err) {
            setSignInError('Failed to sign in')
        } finally {
            setSignInLoading(false)
        }
    }

    const handleSignOut = async () => {
        await signOut()
    }

    const handleClearStorage = () => {
        localStorage.clear()
        sessionStorage.clear()
        alert('Storage cleared! Refresh the page.')
    }

    const handleRefreshSession = async () => {
        const { data, error } = await supabase.auth.refreshSession()
        if (error) {
            alert(`Error: ${error.message}`)
        } else {
            alert(`Session refreshed! User: ${data.user?.email}`)
        }
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
                                    <span className={styles.statusLabel}>Supabase</span>
                                    <span className={`${styles.statusValue} ${isConfigured ? styles.success : styles.error}`}>
                                        {isConfigured ? '✅ Connected' : '❌ Not configured'}
                                    </span>
                                </div>
                                <div className={styles.statusItem}>
                                    <span className={styles.statusLabel}>Auth Loading</span>
                                    <span className={styles.statusValue}>{loading ? '⏳ Yes' : '✓ No'}</span>
                                </div>
                                <div className={styles.statusItem}>
                                    <span className={styles.statusLabel}>Session</span>
                                    <span className={`${styles.statusValue} ${session ? styles.success : styles.warning}`}>
                                        {session ? '✅ Active' : '⚠️ None'}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* User Info */}
                        <section className={styles.section}>
                            <h4>User</h4>
                            {user ? (
                                <div className={styles.userInfo}>
                                    <div className={styles.infoRow}>
                                        <span>Email:</span>
                                        <code onClick={() => copyToClipboard(user.email || '')}>
                                            {user.email}
                                        </code>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span>ID:</span>
                                        <code onClick={() => copyToClipboard(user.id)} title="Click to copy">
                                            {user.id.slice(0, 8)}...
                                        </code>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span>Name:</span>
                                        <code>{profile?.full_name || 'Not set'}</code>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span>Confirmed:</span>
                                        <code>{user.email_confirmed_at ? '✅ Yes' : '❌ No'}</code>
                                    </div>
                                    <button onClick={handleSignOut} className={styles.dangerBtn}>
                                        Sign Out
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.signInForm}>
                                    <p className={styles.noUser}>No user signed in</p>
                                    <form onSubmit={handleQuickSignIn}>
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={styles.input}
                                        />
                                        <input
                                            type="password"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={styles.input}
                                        />
                                        {signInError && <p className={styles.errorText}>{signInError}</p>}
                                        <button
                                            type="submit"
                                            disabled={signInLoading || !isConfigured}
                                            className={styles.primaryBtn}
                                        >
                                            {signInLoading ? 'Signing in...' : 'Quick Sign In'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </section>

                        {/* Actions */}
                        <section className={styles.section}>
                            <h4>Actions</h4>
                            <div className={styles.actions}>
                                <button onClick={handleRefreshSession} className={styles.actionBtn}>
                                    🔄 Refresh Session
                                </button>
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
                                    onClick={() => console.log({ user, profile, session, isConfigured })}
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
