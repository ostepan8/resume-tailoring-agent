'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { supabase } from '../../../lib/supabase'
import { SkeletonProfileSection } from '../../components/Skeleton'
import styles from './profile.module.css'

interface ProfileFormData {
    full_name: string
    email: string
    phone: string
    location: string
    linkedin_url: string
    github_url: string
    website_url: string
    professional_summary: string
}

export default function ProfilePage() {
    const { user, profile, updateProfile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState<ProfileFormData>({
        full_name: '',
        email: '',
        phone: '',
        location: '',
        linkedin_url: '',
        github_url: '',
        website_url: '',
        professional_summary: '',
    })
    
    // Track if initial data has been fetched to prevent re-fetching on re-renders
    const hasFetchedRef = useRef(false)

    const loadProfile = useCallback(async (userId: string, userEmail: string | undefined) => {
        setLoading(true)

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error)
                setError('Failed to load profile data')
            } else if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    email: data.email || userEmail || '',
                    phone: data.phone || '',
                    location: data.location || '',
                    linkedin_url: data.linkedin_url || '',
                    github_url: data.github_url || '',
                    website_url: data.website_url || '',
                    professional_summary: data.professional_summary || '',
                })
            } else {
                // Profile doesn't exist yet, use email from auth
                setFormData(prev => ({
                    ...prev,
                    email: userEmail || '',
                }))
            }
        } catch (err) {
            console.error('Error loading profile:', err)
            setError('Failed to load profile data')
        } finally {
            setLoading(false)
        }
    }, [])

    // Fetch data only once when user becomes available
    useEffect(() => {
        if (user?.id && !hasFetchedRef.current) {
            hasFetchedRef.current = true
            loadProfile(user.id, user.email)
        }
    }, [user?.id, user?.email, loadProfile])

    const handleChange = (field: keyof ProfileFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setSaved(false)
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)
        setError(null)

        try {
            const updates = {
                id: user.id,
                full_name: formData.full_name || null,
                phone: formData.phone || null,
                location: formData.location || null,
                linkedin_url: formData.linkedin_url || null,
                github_url: formData.github_url || null,
                website_url: formData.website_url || null,
                professional_summary: formData.professional_summary || null,
            }

            const success = await updateProfile(updates)
            
            if (success) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            } else {
                setError('Failed to save profile. Please try again.')
            }
        } catch (err) {
            console.error('Error saving profile:', err)
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const validateUrl = (url: string): boolean => {
        if (!url) return true
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    }

    const isValidLinkedIn = validateUrl(formData.linkedin_url)
    const isValidGitHub = validateUrl(formData.github_url)
    const isValidWebsite = validateUrl(formData.website_url)

    if (loading) {
        return (
            <div className={styles.page}>
                <header className={styles.header}>
                    <div>
                        <h1>Profile</h1>
                        <p>Manage your personal information for resume generation.</p>
                    </div>
                </header>
                <div className={styles.loadingState}>
                    <SkeletonProfileSection />
                    <SkeletonProfileSection />
                    <SkeletonProfileSection />
                </div>
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1>Profile</h1>
                    <p>Manage your personal information for resume generation.</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className={styles.profileForm}>
                {/* Contact Information Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <h2>Contact Information</h2>
                    </div>
                    <p className={styles.sectionDescription}>
                        This information will appear at the top of your generated resumes.
                    </p>

                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="full_name">Full Name</label>
                            <input
                                id="full_name"
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => handleChange('full_name', e.target.value)}
                                placeholder="John Doe"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={formData.email}
                                disabled
                                className={styles.disabledInput}
                            />
                            <span className={styles.helpText}>Email is managed through your account settings</span>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="phone">Phone Number</label>
                            <input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="location">Location</label>
                            <input
                                id="location"
                                type="text"
                                value={formData.location}
                                onChange={(e) => handleChange('location', e.target.value)}
                                placeholder="San Francisco, CA"
                            />
                        </div>
                    </div>
                </section>

                {/* Online Presence Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                        </div>
                        <h2>Online Presence</h2>
                    </div>
                    <p className={styles.sectionDescription}>
                        Add links to your professional profiles. These can be included on your resume.
                    </p>

                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="linkedin_url">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                                LinkedIn URL
                            </label>
                            <input
                                id="linkedin_url"
                                type="url"
                                value={formData.linkedin_url}
                                onChange={(e) => handleChange('linkedin_url', e.target.value)}
                                placeholder="https://linkedin.com/in/johndoe"
                                className={!isValidLinkedIn ? styles.inputError : ''}
                            />
                            {!isValidLinkedIn && <span className={styles.errorText}>Please enter a valid URL</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="github_url">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                                GitHub URL
                            </label>
                            <input
                                id="github_url"
                                type="url"
                                value={formData.github_url}
                                onChange={(e) => handleChange('github_url', e.target.value)}
                                placeholder="https://github.com/johndoe"
                                className={!isValidGitHub ? styles.inputError : ''}
                            />
                            {!isValidGitHub && <span className={styles.errorText}>Please enter a valid URL</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                            <label htmlFor="website_url">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                                Personal Website / Portfolio
                            </label>
                            <input
                                id="website_url"
                                type="url"
                                value={formData.website_url}
                                onChange={(e) => handleChange('website_url', e.target.value)}
                                placeholder="https://johndoe.com"
                                className={!isValidWebsite ? styles.inputError : ''}
                            />
                            {!isValidWebsite && <span className={styles.errorText}>Please enter a valid URL</span>}
                        </div>
                    </div>
                </section>

                {/* Professional Summary Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                        </div>
                        <h2>Professional Summary</h2>
                    </div>
                    <p className={styles.sectionDescription}>
                        A brief overview of your professional background. This will be used as a base for AI-tailored summaries.
                    </p>

                    <div className={styles.formGroup}>
                        <label htmlFor="professional_summary">Summary</label>
                        <textarea
                            id="professional_summary"
                            value={formData.professional_summary}
                            onChange={(e) => handleChange('professional_summary', e.target.value)}
                            placeholder="Experienced software engineer with 5+ years of expertise in building scalable web applications. Passionate about clean code, user experience, and mentoring junior developers..."
                            rows={5}
                        />
                        <span className={styles.helpText}>
                            {formData.professional_summary.length} / 500 characters recommended
                        </span>
                    </div>
                </section>

                {/* Error Message */}
                {error && (
                    <div className={styles.errorMessage}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Form Actions */}
                <div className={styles.formActions}>
                    <button
                        type="submit"
                        disabled={saving || !isValidLinkedIn || !isValidGitHub || !isValidWebsite}
                        className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ''}`}
                    >
                        {saving ? (
                            <>
                                <div className={styles.buttonSpinner} />
                                Saving...
                            </>
                        ) : saved ? (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Saved!
                            </>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                    <polyline points="17 21 17 13 7 13 7 21" />
                                    <polyline points="7 3 7 8 15 8" />
                                </svg>
                                Save Profile
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Preview Card */}
            <section className={styles.previewSection}>
                <h3>Resume Header Preview</h3>
                <div className={styles.previewCard}>
                    <div className={styles.previewName}>
                        {formData.full_name || 'Your Name'}
                    </div>
                    <div className={styles.previewContact}>
                        {formData.email && <span>{formData.email}</span>}
                        {formData.phone && <span>{formData.phone}</span>}
                        {formData.location && <span>{formData.location}</span>}
                    </div>
                    <div className={styles.previewLinks}>
                        {formData.linkedin_url && (
                            <a href={formData.linkedin_url} target="_blank" rel="noopener noreferrer">
                                LinkedIn
                            </a>
                        )}
                        {formData.github_url && (
                            <a href={formData.github_url} target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>
                        )}
                        {formData.website_url && (
                            <a href={formData.website_url} target="_blank" rel="noopener noreferrer">
                                Portfolio
                            </a>
                        )}
                    </div>
                    {formData.professional_summary && (
                        <div className={styles.previewSummary}>
                            {formData.professional_summary}
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
