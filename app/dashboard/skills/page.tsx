'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../../../lib/auth-context'
import {
    skillsDb,
    type Skill,
} from '../../../lib/database'
import styles from './skills.module.css'

const SKILL_CATEGORIES = [
    { value: 'technical', label: 'Technical', color: '#3ed0c3' },
    { value: 'framework', label: 'Framework', color: '#ff5c28' },
    { value: 'tool', label: 'Tool', color: '#9370db' },
    { value: 'language', label: 'Language', color: '#f0b060' },
    { value: 'soft', label: 'Soft Skill', color: '#6bbd5b' },
    { value: 'other', label: 'Other', color: '#888' },
] as const

const PROFICIENCY_LEVELS = [
    { value: 'beginner', label: 'Beginner', percent: 25 },
    { value: 'intermediate', label: 'Intermediate', percent: 50 },
    { value: 'advanced', label: 'Advanced', percent: 75 },
    { value: 'expert', label: 'Expert', percent: 100 },
] as const

export default function SkillsPage() {
    const { user } = useAuth()
    const [skills, setSkills] = useState<Skill[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        category: 'technical' as Skill['category'],
        proficiency: 'intermediate' as Skill['proficiency'],
        years_of_experience: '',
    })
    const [saving, setSaving] = useState(false)
    const [quickAddMode, setQuickAddMode] = useState(false)
    const [quickAddText, setQuickAddText] = useState('')
    
    // Track if initial data has been fetched to prevent re-fetching on re-renders
    const hasFetchedRef = useRef(false)

    const loadSkills = useCallback(async (userId: string) => {
        setLoading(true)
        const data = await skillsDb.getAll(userId)
        setSkills(data)
        setLoading(false)
    }, [])

    // Fetch data only once when user becomes available
    useEffect(() => {
        if (user?.id && !hasFetchedRef.current) {
            hasFetchedRef.current = true
            loadSkills(user.id)
        }
    }, [user?.id, loadSkills])

    const handleOpenForm = (skill?: Skill) => {
        if (skill) {
            setEditingSkill(skill)
            setFormData({
                name: skill.name,
                category: skill.category,
                proficiency: skill.proficiency,
                years_of_experience: skill.years_of_experience?.toString() || '',
            })
        } else {
            setEditingSkill(null)
            setFormData({
                name: '',
                category: 'technical',
                proficiency: 'intermediate',
                years_of_experience: '',
            })
        }
        setShowForm(true)
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setEditingSkill(null)
        setFormData({
            name: '',
            category: 'technical',
            proficiency: 'intermediate',
            years_of_experience: '',
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)

        const skillData = {
            name: formData.name,
            category: formData.category,
            proficiency: formData.proficiency,
            years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : null,
        }

        try {
            if (editingSkill) {
                await skillsDb.update(editingSkill.id, skillData)
            } else {
                await skillsDb.create({
                    ...skillData,
                    user_id: user.id,
                })
            }
            await loadSkills(user.id)
            handleCloseForm()
        } catch (error) {
            console.error('Error saving skill:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleQuickAdd = async () => {
        if (!user || !quickAddText.trim()) return

        setSaving(true)
        const skillNames = quickAddText.split(',').map(s => s.trim()).filter(Boolean)

        try {
            for (const name of skillNames) {
                await skillsDb.create({
                    name,
                    category: 'technical',
                    proficiency: 'intermediate',
                    years_of_experience: null,
                    user_id: user.id,
                })
            }
            await loadSkills(user.id)
            setQuickAddText('')
            setQuickAddMode(false)
        } catch (error) {
            console.error('Error adding skills:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!user) return
        await skillsDb.delete(id)
        await loadSkills(user.id)
    }

    const getCategoryInfo = (category: Skill['category']) => {
        return SKILL_CATEGORIES.find(c => c.value === category) || SKILL_CATEGORIES[5]
    }

    const getProficiencyInfo = (proficiency: Skill['proficiency']) => {
        return PROFICIENCY_LEVELS.find(p => p.value === proficiency) || PROFICIENCY_LEVELS[1]
    }

    const groupedSkills = skills.reduce((acc, skill) => {
        if (!acc[skill.category]) {
            acc[skill.category] = []
        }
        acc[skill.category].push(skill)
        return acc
    }, {} as Record<Skill['category'], Skill[]>)

    const categoryOrder: Skill['category'][] = ['technical', 'framework', 'tool', 'language', 'soft', 'other']

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1>Skills</h1>
                    <p>Manage your technical and soft skills for resume tailoring.</p>
                </div>
                <div className={styles.headerActions}>
                    <button onClick={() => setQuickAddMode(true)} className={styles.quickAddBtn}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        Quick Add
                    </button>
                    <button onClick={() => handleOpenForm()} className={styles.addBtn}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add Skill
                    </button>
                </div>
            </header>

            {/* Quick Add Bar */}
            {quickAddMode && (
                <div className={styles.quickAddBar}>
                    <input
                        type="text"
                        value={quickAddText}
                        onChange={(e) => setQuickAddText(e.target.value)}
                        placeholder="Enter skills separated by commas (e.g., React, TypeScript, Node.js)"
                        className={styles.quickAddInput}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuickAdd()
                            if (e.key === 'Escape') setQuickAddMode(false)
                        }}
                    />
                    <button onClick={handleQuickAdd} disabled={saving || !quickAddText.trim()} className={styles.quickAddSubmit}>
                        {saving ? 'Adding...' : 'Add Skills'}
                    </button>
                    <button onClick={() => setQuickAddMode(false)} className={styles.quickAddCancel}>
                        Cancel
                    </button>
                </div>
            )}

            {/* Stats Summary */}
            {!loading && skills.length > 0 && (
                <div className={styles.statsSummary}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{skills.length}</span>
                        <span className={styles.statLabel}>Total Skills</span>
                    </div>
                    {categoryOrder.map(cat => {
                        const count = groupedSkills[cat]?.length || 0
                        if (count === 0) return null
                        const info = getCategoryInfo(cat)
                        return (
                            <div key={cat} className={styles.statItem}>
                                <span className={styles.statValue} style={{ color: info.color }}>{count}</span>
                                <span className={styles.statLabel}>{info.label}</span>
                            </div>
                        )
                    })}
                </div>
            )}

            {loading ? (
                <div className={styles.loadingGrid}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className={styles.loadingCard} />
                    ))}
                </div>
            ) : skills.length > 0 ? (
                <div className={styles.skillsContainer}>
                    {categoryOrder.map(category => {
                        const categorySkills = groupedSkills[category]
                        if (!categorySkills || categorySkills.length === 0) return null
                        const categoryInfo = getCategoryInfo(category)

                        return (
                            <section key={category} className={styles.categorySection}>
                                <h2 className={styles.categoryTitle} style={{ borderColor: categoryInfo.color }}>
                                    <span style={{ color: categoryInfo.color }}>{categoryInfo.label}</span>
                                    <span className={styles.categoryCount}>{categorySkills.length}</span>
                                </h2>
                                <div className={styles.skillsGrid}>
                                    {categorySkills.map((skill) => {
                                        const proficiency = getProficiencyInfo(skill.proficiency)
                                        return (
                                            <div key={skill.id} className={styles.skillCard}>
                                                <div className={styles.skillHeader}>
                                                    <span className={styles.skillName}>{skill.name}</span>
                                                    <div className={styles.skillActions}>
                                                        <button
                                                            onClick={() => handleOpenForm(skill)}
                                                            className={styles.actionBtn}
                                                            title="Edit"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(skill.id)}
                                                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                            title="Delete"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M18 6L6 18M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className={styles.skillMeta}>
                                                    <div className={styles.proficiencyBar}>
                                                        <div
                                                            className={styles.proficiencyFill}
                                                            style={{
                                                                width: `${proficiency.percent}%`,
                                                                background: categoryInfo.color
                                                            }}
                                                        />
                                                    </div>
                                                    <div className={styles.skillDetails}>
                                                        <span className={styles.proficiencyLabel}>{proficiency.label}</span>
                                                        {skill.years_of_experience && (
                                                            <span className={styles.yearsExp}>
                                                                {skill.years_of_experience} yr{skill.years_of_experience > 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )
                    })}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <h3>No skills added yet</h3>
                    <p>Add your technical and soft skills to enhance your tailored resumes.</p>
                    <div className={styles.emptyActions}>
                        <button onClick={() => setQuickAddMode(true)} className={styles.emptyAction}>
                            Quick Add Multiple Skills
                        </button>
                        <button onClick={() => handleOpenForm()} className={styles.emptyActionSecondary}>
                            Add One Skill
                        </button>
                    </div>
                </div>
            )}

            {/* Skill Form Modal */}
            {showForm && (
                <div className={styles.modalOverlay} onClick={handleCloseForm}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingSkill ? 'Edit Skill' : 'Add Skill'}</h2>
                            <button onClick={handleCloseForm} className={styles.closeBtn}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="name">Skill Name *</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., React, Python, Leadership"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Category *</label>
                                <div className={styles.categorySelector}>
                                    {SKILL_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            className={`${styles.categoryOption} ${formData.category === cat.value ? styles.categorySelected : ''}`}
                                            onClick={() => setFormData({ ...formData, category: cat.value })}
                                            style={{
                                                '--cat-color': cat.color,
                                                borderColor: formData.category === cat.value ? cat.color : undefined,
                                                background: formData.category === cat.value ? `${cat.color}15` : undefined
                                            } as React.CSSProperties}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Proficiency Level *</label>
                                <div className={styles.proficiencySelector}>
                                    {PROFICIENCY_LEVELS.map((level) => (
                                        <button
                                            key={level.value}
                                            type="button"
                                            className={`${styles.proficiencyOption} ${formData.proficiency === level.value ? styles.proficiencySelected : ''}`}
                                            onClick={() => setFormData({ ...formData, proficiency: level.value })}
                                        >
                                            <span className={styles.proficiencyName}>{level.label}</span>
                                            <div className={styles.proficiencyPreview}>
                                                <div
                                                    className={styles.proficiencyPreviewFill}
                                                    style={{ width: `${level.percent}%` }}
                                                />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="years_of_experience">Years of Experience</label>
                                <input
                                    id="years_of_experience"
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={formData.years_of_experience}
                                    onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                                    placeholder="e.g., 3"
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" onClick={handleCloseForm} className={styles.cancelBtn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className={styles.saveBtn}>
                                    {saving ? 'Saving...' : editingSkill ? 'Update Skill' : 'Add Skill'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
