'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { supabase } from '../../lib/supabase'
import styles from './AuthModal.module.css'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    initialMode?: 'signin' | 'signup'
}

type ModalView = 'form' | 'awaiting-confirmation'

export default function AuthModal({ isOpen, onClose, initialMode = 'signup' }: AuthModalProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
    const [view, setView] = useState<ModalView>('form')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [resendLoading, setResendLoading] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)

    const pollingRef = useRef<NodeJS.Timeout | null>(null)
    const router = useRouter()
    const { signIn, signUp, isConfigured } = useAuth()

    useEffect(() => {
        setMode(initialMode)
    }, [initialMode])

    const resetForm = useCallback(() => {
        setEmail('')
        setPassword('')
        setFullName('')
        setError(null)
        setSuccess(null)
        setView('form')
        setResendSuccess(false)
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }
    }, [])

    useEffect(() => {
        if (!isOpen) {
            resetForm()
        }
    }, [isOpen, resetForm])

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current)
            }
        }
    }, [])

    // Poll for email confirmation
    const startPollingForConfirmation = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
        }

        pollingRef.current = setInterval(async () => {
            try {
                // Refresh the session to get the latest state from the server
                const { data: { session }, error } = await supabase.auth.refreshSession()

                if (error) {
                    // If refresh fails, try getSession as fallback
                    const { data } = await supabase.auth.getSession()
                    if (data.session?.user?.email_confirmed_at) {
                        if (pollingRef.current) {
                            clearInterval(pollingRef.current)
                            pollingRef.current = null
                        }
                        onClose()
                        router.push('/dashboard')
                    }
                    return
                }

                if (session?.user?.email_confirmed_at) {
                    // Email confirmed! Stop polling and redirect
                    if (pollingRef.current) {
                        clearInterval(pollingRef.current)
                        pollingRef.current = null
                    }
                    onClose()
                    router.push('/dashboard')
                }
            } catch (err) {
                console.error('Error checking confirmation:', err)
            }
        }, 3000) // Poll every 3 seconds (slightly slower to avoid rate limits)
    }, [onClose, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            if (mode === 'signup') {
                const { error, needsEmailConfirmation } = await signUp(email, password, fullName)
                if (error) {
                    setError(error.message)
                } else if (needsEmailConfirmation) {
                    // Switch to awaiting confirmation view
                    setView('awaiting-confirmation')
                    startPollingForConfirmation()
                } else {
                    setSuccess('Account created successfully!')
                    setTimeout(() => {
                        onClose()
                        router.push('/dashboard')
                    }, 500)
                }
            } else {
                const { error } = await signIn(email, password)
                if (error) {
                    if (error.message.includes('Email not confirmed')) {
                        setError('Please confirm your email first. Check your inbox.')
                    } else if (error.message.includes('Invalid login credentials')) {
                        setError('Invalid email or password.')
                    } else {
                        setError(error.message)
                    }
                } else {
                    onClose()
                    router.push('/dashboard')
                }
            }
        } catch {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleResendEmail = async () => {
        setResendLoading(true)
        setResendSuccess(false)

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            })

            if (error) {
                setError(error.message)
            } else {
                setResendSuccess(true)
                setTimeout(() => setResendSuccess(false), 5000)
            }
        } catch {
            setError('Failed to resend email')
        } finally {
            setResendLoading(false)
        }
    }

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (!isOpen) return null

    // Awaiting email confirmation view
    if (view === 'awaiting-confirmation') {
        return (
            <div className={styles.overlay} onClick={handleOverlayClick}>
                <div className={styles.modal}>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>

                    <div className={styles.header}>
                        <div className={styles.emailIcon}>
                            <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path
                                    d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                                />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                        </div>
                        <h2 className={styles.title}>Check your email</h2>
                        <p className={styles.subtitle}>
                            We sent a confirmation link to
                        </p>
                        <p className={styles.emailAddress}>{email}</p>
                    </div>

                    <div className={styles.content}>
                        <div className={styles.waitingIndicator}>
                            <span className={styles.pulsingDot} />
                            <span>Waiting for confirmation...</span>
                        </div>

                        <p className={styles.confirmInstructions}>
                            Click the link in the email to verify your account.
                            This page will automatically redirect once confirmed.
                        </p>

                        {error && <p className={styles.error}>{error}</p>}

                        {resendSuccess && (
                            <p className={styles.success}>Confirmation email resent!</p>
                        )}

                        <div className={styles.resendSection}>
                            <p>Didn&apos;t receive the email?</p>
                            <button
                                onClick={handleResendEmail}
                                disabled={resendLoading}
                                className={styles.resendBtn}
                            >
                                {resendLoading ? 'Sending...' : 'Resend email'}
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                if (pollingRef.current) {
                                    clearInterval(pollingRef.current)
                                    pollingRef.current = null
                                }
                                setView('form')
                                setMode('signin')
                            }}
                            className={styles.backBtn}
                        >
                            ← Back to sign in
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Regular sign in/sign up form
    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                <div className={styles.header}>
                    <div className={styles.logoMark}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            />
                            <path
                                d="M12 6v12M6 12h12"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                    <h2 className={styles.title}>
                        {mode === 'signup' ? 'Create your account' : 'Welcome back'}
                    </h2>
                    <p className={styles.subtitle}>
                        {mode === 'signup'
                            ? 'Save your resumes, track applications, and more'
                            : 'Sign in to access your dashboard'}
                    </p>
                </div>

                <div className={styles.content}>
                    {!isConfigured && (
                        <div className={styles.configWarning}>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <polygon
                                    points="12 2 2 22 22 22"
                                />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span>
                                Database not configured. Add Supabase credentials to .env.local
                            </span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {mode === 'signup' && (
                            <div className={styles.inputGroup}>
                                <label htmlFor="fullName">Full Name</label>
                                <input
                                    id="fullName"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className={styles.input}
                                />
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className={styles.input}
                            />
                            {mode === 'signup' && (
                                <span className={styles.inputHint}>Must be at least 6 characters</span>
                            )}
                        </div>

                        {error && <p className={styles.error}>{error}</p>}
                        {success && <p className={styles.success}>{success}</p>}

                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? (
                                <span className={styles.spinner} />
                            ) : mode === 'signup' ? (
                                'Create Account'
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <p className={styles.switchMode}>
                        {mode === 'signup' ? (
                            <>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('signin')
                                        setError(null)
                                        setSuccess(null)
                                    }}
                                >
                                    Sign in
                                </button>
                            </>
                        ) : (
                            <>
                                Don&apos;t have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('signup')
                                        setError(null)
                                        setSuccess(null)
                                    }}
                                >
                                    Sign up
                                </button>
                            </>
                        )}
                    </p>

                    {isConfigured && (
                        <p className={styles.demoNote}>
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            Your data is securely stored in the cloud
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
