'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { User, Session, AuthError } from '@supabase/supabase-js'

const IS_DEV = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true'

interface UserProfile {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    location: string | null
    linkedin_url: string | null
    github_url: string | null
    website_url: string | null
    professional_summary: string | null
    avatar_url: string | null
    has_completed_onboarding: boolean
    created_at: string
}

interface SignUpResult {
    error: AuthError | null
    needsEmailConfirmation: boolean
}

interface AuthContextType {
    user: User | null
    profile: UserProfile | null
    session: Session | null
    loading: boolean
    signUp: (email: string, password: string, fullName?: string) => Promise<SignUpResult>
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
    signOut: () => Promise<void>
    updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>
    completeOnboarding: () => Promise<boolean>
    isConfigured: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    // Track if initial session has been processed
    const hasInitialized = useRef(false)

    // Fetch user profile from database
    const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
        if (!isSupabaseConfigured) return null

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                // Profile might not exist yet (e.g., just signed up)
                // This is not a critical error
                if (error.code !== 'PGRST116') {
                    console.error('Error fetching profile:', error)
                }
                return null
            }
            return data as UserProfile
        } catch (err) {
            console.error('Error fetching profile:', err)
            return null
        }
    }, [])

    useEffect(() => {
        if (!isSupabaseConfigured) {
            console.error(
                '❌ Supabase not configured! Add NEXT_PUBLIC_SUPABASE_URL and',
                'NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
            )
            setLoading(false)
            return
        }

        let mounted = true

        // Set up auth state change listener FIRST
        // This is the single source of truth for auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (IS_DEV) {
                    console.log('Auth state changed:', event, newSession?.user?.email)
                }

                if (!mounted) return

                // Update session and user state synchronously
                setSession(newSession)
                setUser(newSession?.user ?? null)

                if (newSession?.user) {
                    // Fetch profile asynchronously
                    // Use setTimeout to avoid potential Supabase client deadlock
                    // when calling other Supabase methods inside the callback
                    setTimeout(async () => {
                        if (!mounted) return
                        const userProfile = await fetchProfile(newSession.user.id)
                        if (mounted) {
                            setProfile(userProfile)
                            setLoading(false)
                        }
                        hasInitialized.current = true
                    }, 0)
                } else {
                    setProfile(null)
                    setLoading(false)
                    hasInitialized.current = true
                }
            }
        )

        // Get initial session to trigger the auth state change
        // Note: We don't directly use the result - onAuthStateChange handles it
        supabase.auth.getSession().then(({ error }) => {
            if (error) {
                console.error('Error getting initial session:', error)
                if (mounted) {
                    setLoading(false)
                    hasInitialized.current = true
                }
            }
            // If there's no session and onAuthStateChange hasn't fired yet,
            // set a timeout to ensure loading is set to false
            setTimeout(() => {
                if (mounted && !hasInitialized.current) {
                    setLoading(false)
                    hasInitialized.current = true
                }
            }, 100)
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [fetchProfile])

    const signUp = useCallback(async (email: string, password: string, fullName?: string): Promise<SignUpResult> => {
        if (!isSupabaseConfigured) {
            return {
                error: {
                    message: 'Database not configured. Please add Supabase credentials to .env.local',
                    name: 'ConfigurationError',
                    status: 500
                } as AuthError,
                needsEmailConfirmation: false
            }
        }

        setLoading(true)

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            })

            // Check if email confirmation is required
            // When email confirmation is enabled, session will be null
            const needsEmailConfirmation = !error && data.user && !data.session

            if (error) {
                setLoading(false)
                return { error, needsEmailConfirmation: false }
            }

            if (needsEmailConfirmation) {
                // User needs to confirm email, don't wait for session
                setLoading(false)
                return { error: null, needsEmailConfirmation: true }
            }

            // If session is available (email confirmation disabled),
            // onAuthStateChange will handle updating state and loading
            return { error: null, needsEmailConfirmation: false }
        } catch (err) {
            console.error('Sign up error:', err)
            setLoading(false)
            return {
                error: {
                    message: 'An unexpected error occurred',
                    name: 'UnexpectedError',
                    status: 500
                } as AuthError,
                needsEmailConfirmation: false
            }
        }
    }, [])

    const signIn = useCallback(async (email: string, password: string) => {
        if (!isSupabaseConfigured) {
            return {
                error: {
                    message: 'Database not configured. Please add Supabase credentials to .env.local',
                    name: 'ConfigurationError',
                    status: 500
                } as AuthError
            }
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setLoading(false)
                return { error }
            }

            // onAuthStateChange will handle updating state and setting loading to false
            return { error: null }
        } catch (err) {
            console.error('Sign in error:', err)
            setLoading(false)
            return {
                error: {
                    message: 'An unexpected error occurred',
                    name: 'UnexpectedError',
                    status: 500
                } as AuthError
            }
        }
    }, [])

    const signOut = useCallback(async () => {
        if (isSupabaseConfigured) {
            await supabase.auth.signOut()
        }
        // State will be cleared by onAuthStateChange
    }, [])

    const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<boolean> => {
        if (!user || !isSupabaseConfigured) return false

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (!error && profile) {
                setProfile({ ...profile, ...updates })
                return true
            }
            return false
        } catch (err) {
            console.error('Error updating profile:', err)
            return false
        }
    }, [user, profile])

    const completeOnboarding = useCallback(async (): Promise<boolean> => {
        if (!user || !isSupabaseConfigured) return false

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    has_completed_onboarding: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (!error && profile) {
                setProfile({ ...profile, has_completed_onboarding: true })
                return true
            }
            return false
        } catch (err) {
            console.error('Error completing onboarding:', err)
            return false
        }
    }, [user, profile])

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                session,
                loading,
                signUp,
                signIn,
                signOut,
                updateProfile,
                completeOnboarding,
                isConfigured: isSupabaseConfigured,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
