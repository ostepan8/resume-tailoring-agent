'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from '@clerk/nextjs'
import { useAuth } from '../../lib/auth-context'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { profile, loading, isConfigured } = useAuth()
  const { isLoaded: clerkLoaded } = useUser()
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

  const isLoading = loading || !clerkLoaded

  return (
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

          {isLoading ? (
            <div className={styles.loadingSkeleton} />
          ) : (
            <>
              <SignedOut>
                <div className={styles.authButtons}>
                  <SignInButton mode="modal">
                    <button className={styles.signInBtn}>Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className={styles.signUpBtn}>Sign Up</button>
                  </SignUpButton>
                </div>
              </SignedOut>

              <SignedIn>
                <div className={styles.userSection} ref={menuRef}>
                  <button
                    className={styles.userButton}
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    aria-expanded={showUserMenu}
                  >
                    <UserButton 
                      appearance={{
                        elements: {
                          avatarBox: {
                            width: 32,
                            height: 32,
                          }
                        }
                      }}
                    />
                  </button>

                  {showUserMenu && isConfigured && (
                    <div className={styles.userMenu}>
                      {profile && (
                        <>
                          <div className={styles.userMenuHeader}>
                            <p className={styles.userName}>
                              {profile.full_name || 'User'}
                            </p>
                            <p className={styles.userEmail}>{profile.email}</p>
                          </div>
                          <div className={styles.userMenuDivider} />
                        </>
                      )}
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
                    </div>
                  )}
                </div>
              </SignedIn>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
