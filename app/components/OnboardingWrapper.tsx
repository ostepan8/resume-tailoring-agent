'use client'

import { useState, useEffect, useCallback } from 'react'
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

    // Only show onboarding for authenticated users who haven't completed it
    // and are on a protected route (dashboard or tailor)
    useEffect(() => {
        if (!loading && user && profile) {
            const isProtectedRoute = pathname?.startsWith('/dashboard') || pathname?.startsWith('/tailor')
            const needsOnboarding = !profile.has_completed_onboarding
            
            if (isProtectedRoute && needsOnboarding) {
                setShowOnboarding(true)
            }
        }
    }, [loading, user, profile, pathname])

    const handleOnboardingComplete = useCallback(async () => {
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
