'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { colors } from '@/constants/colors'

/**
 * Auth Callback Page
 * 
 * This page handles redirects after Clerk authentication.
 * Clerk handles most auth flows internally, but this page
 * provides a fallback landing spot and redirects to dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useUser()

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
        // User is signed in, redirect to dashboard
        router.push('/dashboard')
      } else {
        // Not signed in, redirect to home
        router.push('/')
      }
    }
  }, [isLoaded, isSignedIn, router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: colors.primaryBlack,
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${colors.secondaryTeal}33`,
        borderRadius: '16px',
        padding: '3rem',
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: `3px solid ${colors.secondaryTeal}33`,
          borderTopColor: colors.secondaryTeal,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1.5rem',
        }} />
        <h1 style={{ color: colors.backgroundCream, fontSize: '1.5rem', margin: 0 }}>
          Redirecting...
        </h1>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
