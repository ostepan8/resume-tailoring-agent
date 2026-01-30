'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs'
import { supabase, isSupabaseConfigured } from './supabase'

export interface UserProfile {
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

interface AuthContextType {
    user: {
        id: string
        email: string | undefined
    } | null
    profile: UserProfile | null
    loading: boolean
    signOut: () => Promise<void>
    updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>
    completeOnboarding: () => Promise<boolean>
    isConfigured: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
    const { signOut: clerkSignOut } = useClerkAuth()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [profileLoading, setProfileLoading] = useState(true)

    // Create a user object compatible with the rest of the app
    const user = clerkUser ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress
    } : null

    // Fetch user profile from Supabase database
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

    // Create or update user profile in Supabase when Clerk user changes
    // Always sync full_name and email from Clerk to ensure they're up to date
    // IMPORTANT: We must not overwrite has_completed_onboarding for existing users
    const syncUserToSupabase = useCallback(async (clerkUserId: string, email: string | undefined, fullName: string | null) => {
        if (!isSupabaseConfigured || !email) return null

        try {
            // First, check if profile already exists
            const existingProfile = await fetchProfile(clerkUserId)

            if (existingProfile) {
                // Profile exists - only update Clerk-managed fields (email, full_name)
                // Preserve has_completed_onboarding and other user-set fields
                const { error } = await supabase
                    .from('user_profiles')
                    .update({
                        email: email,
                        full_name: fullName,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', clerkUserId)

                if (error) {
                    console.error('Error updating profile:', error)
                    return existingProfile // Return existing profile even if update fails
                }

                return { ...existingProfile, email, full_name: fullName }
            } else {
                // Profile doesn't exist - create new one with onboarding not completed
                const { data, error } = await supabase
                    .from('user_profiles')
                    .insert({
                        id: clerkUserId,
                        email: email,
                        full_name: fullName,
                        has_completed_onboarding: false,
                        created_at: new Date().toISOString(),
                    })
                    .select()
                    .single()

                if (error) {
                    console.error('Error creating profile:', error)
                    return null
                }

                return data as UserProfile
            }
        } catch (err) {
            console.error('Error syncing user to Supabase:', err)
            return null
        }
    }, [fetchProfile])

    // Effect to sync Clerk user with Supabase profile
    useEffect(() => {
        if (!clerkLoaded) return

        if (clerkUser) {
            setProfileLoading(true)
            const fullName = clerkUser.fullName ||
                [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
                null

            syncUserToSupabase(
                clerkUser.id,
                clerkUser.primaryEmailAddress?.emailAddress,
                fullName
            ).then((userProfile) => {
                setProfile(userProfile)
                setProfileLoading(false)
            })
        } else {
            setProfile(null)
            setProfileLoading(false)
        }
    }, [clerkUser, clerkLoaded, syncUserToSupabase])

    const signOut = useCallback(async () => {
        await clerkSignOut()
        setProfile(null)
    }, [clerkSignOut])

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

    const loading = !clerkLoaded || profileLoading

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
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
