'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'
import AuthModal from './AuthModal'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, profile, loading, signOut, isConfigured } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setShowUserMenu(false)
  }

  const openSignUp = () => {
    setAuthMode('signup')
    setShowAuthModal(true)
  }

  const openSignIn = () => {
    setAuthMode('signin')
    setShowAuthModal(true)
  }

  const getUserInitials = () => {
    if (profile?.full_name && profile.full_name.trim()) {
      return profile.full_name
        .split(' ')
        .filter(n => n.length > 0)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'
    }
    if (user?.email && typeof user.email === 'string') {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/Subconscious_Logo.png"
              alt="Subconscious"
              width={162}
              height={30}
              priority
              style={{ objectFit: 'contain' }}
            />
          </Link>
          <div className={styles.navLinks}>
            <a
              href="https://docs.subconscious.dev"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navLink}
            >
              Docs
            </a>

            {loading ? (
              <div className={styles.loadingSkeleton} />
            ) : user && isConfigured ? (
              <div className={styles.userSection} ref={menuRef}>
                <button
                  className={styles.userButton}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-expanded={showUserMenu}
                >
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt=""
                      width={32}
                      height={32}
                      className={styles.userAvatar}
                    />
                  ) : (
                    <div className={styles.userInitials}>{getUserInitials()}</div>
                  )}
                  <svg
                    className={`${styles.chevron} ${showUserMenu ? styles.chevronUp : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className={styles.userMenu}>
                    <div className={styles.userMenuHeader}>
                      <p className={styles.userName}>
                        {profile?.full_name || 'User'}
                      </p>
                      <p className={styles.userEmail}>{user.email}</p>
                    </div>
                    <div className={styles.userMenuDivider} />
                    <Link
                      href="/dashboard/resumes"
                      className={styles.userMenuItem}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      Resumes
                    </Link>
                    <Link
                      href="/dashboard"
                      className={styles.userMenuItem}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="7" height="9" rx="1" />
                        <rect x="14" y="3" width="7" height="5" rx="1" />
                        <rect x="14" y="12" width="7" height="9" rx="1" />
                        <rect x="3" y="16" width="7" height="5" rx="1" />
                      </svg>
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/profile"
                      className={styles.userMenuItem}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Profile
                    </Link>
                    <div className={styles.userMenuDivider} />
                    <button
                      className={styles.userMenuItemDanger}
                      onClick={handleSignOut}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.authButtons}>
                <button onClick={openSignIn} className={styles.signInBtn}>
                  Sign In
                </button>
                <button onClick={openSignUp} className={styles.signUpBtn}>
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </>
  )
}
