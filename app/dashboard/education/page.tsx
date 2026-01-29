'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../../../lib/auth-context'
import {
    educationDb,
    type Education,
} from '../../../lib/database'
import styles from './education.module.css'

export default function EducationPage() {
    const { user } = useAuth()
    const [education, setEducation] = useState<Education[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingEducation, setEditingEducation] = useState<Education | null>(null)
    const [formData, setFormData] = useState({
        institution: '',
        degree: '',
        field_of_study: '',
        location: '',
        gpa: '',
        description: '',
        achievements: '',
        start_date: '',
        end_date: '',
        is_current: false,
    })
    const [saving, setSaving] = useState(false)
    
    // Track if initial data has been fetched to prevent re-fetching on re-renders
    const hasFetchedRef = useRef(false)

    const loadEducation = useCallback(async (userId: string) => {
        setLoading(true)
        const data = await educationDb.getAll(userId)
        setEducation(data)
        setLoading(false)
    }, [])

    // Fetch data only once when user becomes available
    useEffect(() => {
        if (user?.id && !hasFetchedRef.current) {
            hasFetchedRef.current = true
            loadEducation(user.id)
        }
    }, [user?.id, loadEducation])

    const handleOpenForm = (edu?: Education) => {
        if (edu) {
            setEditingEducation(edu)
            setFormData({
                institution: edu.institution,
                degree: edu.degree,
                field_of_study: edu.field_of_study || '',
                location: edu.location || '',
                gpa: edu.gpa || '',
                description: edu.description || '',
                achievements: edu.achievements.join('\n'),
                start_date: edu.start_date,
                end_date: edu.end_date || '',
                is_current: edu.is_current,
            })
        } else {
            setEditingEducation(null)
            setFormData({
                institution: '',
                degree: '',
                field_of_study: '',
                location: '',
                gpa: '',
                description: '',
                achievements: '',
                start_date: '',
                end_date: '',
                is_current: false,
            })
        }
        setShowForm(true)
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setEditingEducation(null)
        setFormData({
            institution: '',
            degree: '',
            field_of_study: '',
            location: '',
            gpa: '',
            description: '',
            achievements: '',
            start_date: '',
            end_date: '',
            is_current: false,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)

        const educationData = {
            institution: formData.institution,
            degree: formData.degree,
            field_of_study: formData.field_of_study || null,
            location: formData.location || null,
            gpa: formData.gpa || null,
            description: formData.description || null,
            achievements: formData.achievements.split('\n').map(a => a.trim()).filter(Boolean),
            start_date: formData.start_date,
            end_date: formData.is_current ? null : (formData.end_date || null),
            is_current: formData.is_current,
        }

        try {
            if (editingEducation) {
                await educationDb.update(editingEducation.id, educationData)
            } else {
                await educationDb.create({
                    ...educationData,
                    user_id: user.id,
                })
            }
            await loadEducation(user.id)
            handleCloseForm()
        } catch (error) {
            console.error('Error saving education:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this education entry?')) return
        if (!user) return

        await educationDb.delete(id)
        await loadEducation(user.id)
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
        })
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1>Education</h1>
                    <p>Manage your academic background and qualifications.</p>
                </div>
                <button onClick={() => handleOpenForm()} className={styles.addBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add Education
                </button>
            </header>

            {loading ? (
                <div className={styles.loadingList}>
                    {[1, 2].map((i) => (
                        <div key={i} className={styles.loadingCard} />
                    ))}
                </div>
            ) : education.length > 0 ? (
                <div className={styles.educationList}>
                    {education.map((edu) => (
                        <div key={edu.id} className={styles.educationCard}>
                            <div className={styles.cardIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                </svg>
                            </div>
                            <div className={styles.cardContent}>
                                <div className={styles.cardHeader}>
                                    <div>
                                        <h3>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}</h3>
                                        <p className={styles.institution}>{edu.institution}</p>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <button
                                            onClick={() => handleOpenForm(edu)}
                                            className={styles.actionBtn}
                                            title="Edit"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(edu.id)}
                                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                            title="Delete"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.cardMeta}>
                                    <span className={styles.dateRange}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" y1="2" x2="16" y2="6" />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        {formatDate(edu.start_date)} - {edu.is_current ? 'Present' : formatDate(edu.end_date)}
                                    </span>
                                    {edu.location && (
                                        <span className={styles.location}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            {edu.location}
                                        </span>
                                    )}
                                    {edu.gpa && (
                                        <span className={styles.gpa}>
                                            GPA: {edu.gpa}
                                        </span>
                                    )}
                                </div>

                                {edu.description && (
                                    <p className={styles.description}>{edu.description}</p>
                                )}

                                {edu.achievements.length > 0 && (
                                    <div className={styles.achievementsList}>
                                        <span className={styles.achievementsLabel}>Achievements & Activities</span>
                                        <ul className={styles.achievements}>
                                            {edu.achievements.slice(0, 3).map((achievement, i) => (
                                                <li key={i}>{achievement}</li>
                                            ))}
                                            {edu.achievements.length > 3 && (
                                                <li className={styles.moreAchievements}>
                                                    +{edu.achievements.length - 3} more
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                            <path d="M6 12v5c3 3 9 3 12 0v-5" />
                        </svg>
                    </div>
                    <h3>No education added yet</h3>
                    <p>Add your academic background to include it in your tailored resumes.</p>
                    <button onClick={() => handleOpenForm()} className={styles.emptyAction}>
                        Add Your Education
                    </button>
                </div>
            )}

            {/* Education Form Modal */}
            {showForm && (
                <div className={styles.modalOverlay} onClick={handleCloseForm}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingEducation ? 'Edit Education' : 'Add Education'}</h2>
                            <button onClick={handleCloseForm} className={styles.closeBtn}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="institution">Institution *</label>
                                <input
                                    id="institution"
                                    type="text"
                                    value={formData.institution}
                                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                                    placeholder="e.g., Stanford University"
                                    required
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="degree">Degree *</label>
                                    <input
                                        id="degree"
                                        type="text"
                                        value={formData.degree}
                                        onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                        placeholder="e.g., Bachelor of Science"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="field_of_study">Field of Study</label>
                                    <input
                                        id="field_of_study"
                                        type="text"
                                        value={formData.field_of_study}
                                        onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                                        placeholder="e.g., Computer Science"
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="location">Location</label>
                                    <input
                                        id="location"
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="e.g., Stanford, CA"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="gpa">GPA</label>
                                    <input
                                        id="gpa"
                                        type="text"
                                        value={formData.gpa}
                                        onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                                        placeholder="e.g., 3.8/4.0"
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="start_date">Start Date *</label>
                                    <input
                                        id="start_date"
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="end_date">End Date</label>
                                    <input
                                        id="end_date"
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        disabled={formData.is_current}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_current}
                                        onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                                    />
                                    Currently enrolled
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief overview of your program or focus areas..."
                                    rows={3}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="achievements">Achievements & Activities</label>
                                <textarea
                                    id="achievements"
                                    value={formData.achievements}
                                    onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                                    placeholder="Enter each achievement on a new line..."
                                    rows={4}
                                />
                                <span className={styles.formHint}>Dean&apos;s List, clubs, honors, relevant coursework, etc.</span>
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" onClick={handleCloseForm} className={styles.cancelBtn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className={styles.saveBtn}>
                                    {saving ? 'Saving...' : editingEducation ? 'Update Education' : 'Add Education'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
