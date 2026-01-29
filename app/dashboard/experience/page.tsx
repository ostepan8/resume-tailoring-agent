'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../../../lib/auth-context'
import {
    experienceDb,
    type WorkExperience,
} from '../../../lib/database'
import styles from './experience.module.css'

const EMPLOYMENT_TYPES = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'freelance', label: 'Freelance' },
] as const

export default function ExperiencePage() {
    const { user } = useAuth()
    const [experiences, setExperiences] = useState<WorkExperience[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingExperience, setEditingExperience] = useState<WorkExperience | null>(null)
    const [formData, setFormData] = useState({
        company: '',
        position: '',
        location: '',
        employment_type: 'full-time' as WorkExperience['employment_type'],
        description: '',
        achievements: '',
        skills: '',
        start_date: '',
        end_date: '',
        is_current: false,
    })
    const [saving, setSaving] = useState(false)
    
    // Track if initial data has been fetched to prevent re-fetching on re-renders
    const hasFetchedRef = useRef(false)

    const loadExperiences = useCallback(async (userId: string) => {
        setLoading(true)
        const data = await experienceDb.getAll(userId)
        setExperiences(data)
        setLoading(false)
    }, [])

    // Fetch data only once when user becomes available
    useEffect(() => {
        if (user?.id && !hasFetchedRef.current) {
            hasFetchedRef.current = true
            loadExperiences(user.id)
        }
    }, [user?.id, loadExperiences])

    const handleOpenForm = (experience?: WorkExperience) => {
        if (experience) {
            setEditingExperience(experience)
            setFormData({
                company: experience.company,
                position: experience.position,
                location: experience.location || '',
                employment_type: experience.employment_type,
                description: experience.description || '',
                achievements: experience.achievements.join('\n'),
                skills: experience.skills.join(', '),
                start_date: experience.start_date,
                end_date: experience.end_date || '',
                is_current: experience.is_current,
            })
        } else {
            setEditingExperience(null)
            setFormData({
                company: '',
                position: '',
                location: '',
                employment_type: 'full-time',
                description: '',
                achievements: '',
                skills: '',
                start_date: '',
                end_date: '',
                is_current: false,
            })
        }
        setShowForm(true)
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setEditingExperience(null)
        setFormData({
            company: '',
            position: '',
            location: '',
            employment_type: 'full-time',
            description: '',
            achievements: '',
            skills: '',
            start_date: '',
            end_date: '',
            is_current: false,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)

        const experienceData = {
            company: formData.company,
            position: formData.position,
            location: formData.location || null,
            employment_type: formData.employment_type,
            description: formData.description || null,
            achievements: formData.achievements.split('\n').map(a => a.trim()).filter(Boolean),
            skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
            start_date: formData.start_date,
            end_date: formData.is_current ? null : (formData.end_date || null),
            is_current: formData.is_current,
        }

        try {
            if (editingExperience) {
                await experienceDb.update(editingExperience.id, experienceData)
            } else {
                await experienceDb.create({
                    ...experienceData,
                    user_id: user.id,
                })
            }
            await loadExperiences(user.id)
            handleCloseForm()
        } catch (error) {
            console.error('Error saving experience:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this experience?')) return
        if (!user) return

        await experienceDb.delete(id)
        await loadExperiences(user.id)
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
        })
    }

    const getEmploymentTypeLabel = (type: WorkExperience['employment_type']) => {
        return EMPLOYMENT_TYPES.find(t => t.value === type)?.label || type
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1>Work Experience</h1>
                    <p>Manage your professional work history and achievements.</p>
                </div>
                <button onClick={() => handleOpenForm()} className={styles.addBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add Experience
                </button>
            </header>

            {loading ? (
                <div className={styles.loadingList}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={styles.loadingCard} />
                    ))}
                </div>
            ) : experiences.length > 0 ? (
                <div className={styles.experienceList}>
                    {experiences.map((exp) => (
                        <div key={exp.id} className={styles.experienceCard}>
                            <div className={styles.timeline}>
                                <div className={`${styles.timelineDot} ${exp.is_current ? styles.current : ''}`} />
                                <div className={styles.timelineLine} />
                            </div>
                            <div className={styles.cardContent}>
                                <div className={styles.cardHeader}>
                                    <div>
                                        <h3>{exp.position}</h3>
                                        <p className={styles.company}>{exp.company}</p>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <button
                                            onClick={() => handleOpenForm(exp)}
                                            className={styles.actionBtn}
                                            title="Edit"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(exp.id)}
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
                                        {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                                    </span>
                                    <span className={styles.employmentType}>
                                        {getEmploymentTypeLabel(exp.employment_type)}
                                    </span>
                                    {exp.location && (
                                        <span className={styles.location}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            {exp.location}
                                        </span>
                                    )}
                                </div>

                                {exp.description && (
                                    <p className={styles.description}>{exp.description}</p>
                                )}

                                {exp.achievements.length > 0 && (
                                    <ul className={styles.achievements}>
                                        {exp.achievements.slice(0, 3).map((achievement, i) => (
                                            <li key={i}>{achievement}</li>
                                        ))}
                                        {exp.achievements.length > 3 && (
                                            <li className={styles.moreAchievements}>
                                                +{exp.achievements.length - 3} more achievements
                                            </li>
                                        )}
                                    </ul>
                                )}

                                {exp.skills.length > 0 && (
                                    <div className={styles.skillTags}>
                                        {exp.skills.slice(0, 5).map((skill, i) => (
                                            <span key={i} className={styles.skillTag}>{skill}</span>
                                        ))}
                                        {exp.skills.length > 5 && (
                                            <span className={styles.skillMore}>+{exp.skills.length - 5}</span>
                                        )}
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
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                    </div>
                    <h3>No work experience yet</h3>
                    <p>Add your professional experience to include it in your tailored resumes.</p>
                    <button onClick={() => handleOpenForm()} className={styles.emptyAction}>
                        Add Your First Experience
                    </button>
                </div>
            )}

            {/* Experience Form Modal */}
            {showForm && (
                <div className={styles.modalOverlay} onClick={handleCloseForm}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingExperience ? 'Edit Experience' : 'Add Experience'}</h2>
                            <button onClick={handleCloseForm} className={styles.closeBtn}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="position">Job Title *</label>
                                    <input
                                        id="position"
                                        type="text"
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        placeholder="e.g., Software Engineer"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="company">Company *</label>
                                    <input
                                        id="company"
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="e.g., Google"
                                        required
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
                                        placeholder="e.g., San Francisco, CA"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="employment_type">Employment Type *</label>
                                    <select
                                        id="employment_type"
                                        value={formData.employment_type}
                                        onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as WorkExperience['employment_type'] })}
                                        required
                                    >
                                        {EMPLOYMENT_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
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
                                    I currently work here
                                </label>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief overview of your role and responsibilities..."
                                    rows={3}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="achievements">Key Achievements</label>
                                <textarea
                                    id="achievements"
                                    value={formData.achievements}
                                    onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                                    placeholder="Enter each achievement on a new line..."
                                    rows={4}
                                />
                                <span className={styles.formHint}>One achievement per line. Start with action verbs.</span>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="skills">Skills & Technologies</label>
                                <input
                                    id="skills"
                                    type="text"
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                    placeholder="React, TypeScript, Node.js (comma separated)"
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" onClick={handleCloseForm} className={styles.cancelBtn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className={styles.saveBtn}>
                                    {saving ? 'Saving...' : editingExperience ? 'Update Experience' : 'Add Experience'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
