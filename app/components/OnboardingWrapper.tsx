'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import OnboardingTour from './OnboardingTour'

/**
 * OnboardingWrapper - Renders the onboarding tour at the app level
 * This component persists across route changes so the tour doesn't get unmounted
 */
export default function OnboardingWrapper() {
    const { user, profile, loading, completeOnboarding } = useAuth()
    const [showOnboarding, setShowOnboarding] = useState(false)
    const pathname = usePathname()
    // Track if we've already completed onboarding this session to prevent re-showing
    const hasCompletedThisSession = useRef(false)

    // Only show onboarding for authenticated users who haven't completed it
    // and are on a protected route (dashboard or tailor)
    useEffect(() => {
        // Reset state when not on protected route or user logs out
        if (!user || !profile || loading) {
            setShowOnboarding(false)
            return
        }

        const isProtectedRoute = pathname?.startsWith('/dashboard') || pathname?.startsWith('/tailor')
        const needsOnboarding = !profile.has_completed_onboarding && !hasCompletedThisSession.current
        
        if (isProtectedRoute && needsOnboarding) {
            // Delay showing onboarding to let page elements fully render and stabilize
            const timer = setTimeout(() => {
                setShowOnboarding(true)
            }, 800)
            return () => clearTimeout(timer)
        } else {
            // Hide onboarding if conditions no longer met
            setShowOnboarding(false)
        }
    }, [loading, user, profile, pathname])

    const handleOnboardingComplete = useCallback(async () => {
        // Mark as completed this session to prevent any race conditions
        hasCompletedThisSession.current = true
        setShowOnboarding(false)
        await completeOnboarding()
    }, [completeOnboarding])

    // Don't render anything if conditions aren't met
    if (!showOnboarding) {
        return null
    }

    return (
        <OnboardingTour 
            onComplete={handleOnboardingComplete}
            userName={profile?.full_name?.split(' ')[0]}
        />
    )
}
