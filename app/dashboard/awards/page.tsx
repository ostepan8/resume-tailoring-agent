'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../../../lib/auth-context'
import {
    awardsDb,
    type Award,
} from '../../../lib/database'
import styles from './awards.module.css'

const AWARD_TYPES = [
    { value: 'award', label: 'Award', icon: '🏆' },
    { value: 'certification', label: 'Certification', icon: '📜' },
    { value: 'honor', label: 'Honor', icon: '🎖️' },
    { value: 'publication', label: 'Publication', icon: '📚' },
    { value: 'patent', label: 'Patent', icon: '💡' },
] as const

export default function AwardsPage() {
    const { user } = useAuth()
    const [awards, setAwards] = useState<Award[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingAward, setEditingAward] = useState<Award | null>(null)
    const [formData, setFormData] = useState({
        title: '',
        issuer: '',
        type: 'award' as Award['type'],
        description: '',
        date_received: '',
        expiry_date: '',
        url: '',
        credential_id: '',
    })
    const [saving, setSaving] = useState(false)
    
    // Track if initial data has been fetched to prevent re-fetching on re-renders
    const hasFetchedRef = useRef(false)

    const loadAwards = useCallback(async (userId: string) => {
        setLoading(true)
        const data = await awardsDb.getAll(userId)
        setAwards(data)
        setLoading(false)
    }, [])

    // Fetch data only once when user becomes available
    useEffect(() => {
        if (user?.id && !hasFetchedRef.current) {
            hasFetchedRef.current = true
            loadAwards(user.id)
        }
    }, [user?.id, loadAwards])

    const handleOpenForm = (award?: Award) => {
        if (award) {
            setEditingAward(award)
            setFormData({
                title: award.title,
                issuer: award.issuer,
                type: award.type,
                description: award.description || '',
                date_received: award.date_received,
                expiry_date: award.expiry_date || '',
                url: award.url || '',
                credential_id: award.credential_id || '',
            })
        } else {
            setEditingAward(null)
            setFormData({
                title: '',
                issuer: '',
                type: 'award',
                description: '',
                date_received: '',
                expiry_date: '',
                url: '',
                credential_id: '',
            })
        }
        setShowForm(true)
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setEditingAward(null)
        setFormData({
            title: '',
            issuer: '',
            type: 'award',
            description: '',
            date_received: '',
            expiry_date: '',
            url: '',
            credential_id: '',
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)

        const awardData = {
            title: formData.title,
            issuer: formData.issuer,
            type: formData.type,
            description: formData.description || null,
            date_received: formData.date_received,
            expiry_date: formData.expiry_date || null,
            url: formData.url || null,
            credential_id: formData.credential_id || null,
        }

        try {
            if (editingAward) {
                await awardsDb.update(editingAward.id, awardData)
            } else {
                await awardsDb.create({
                    ...awardData,
                    user_id: user.id,
                })
            }
            await loadAwards(user.id)
            handleCloseForm()
        } catch (error) {
            console.error('Error saving award:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this entry?')) return
        if (!user) return

        await awardsDb.delete(id)
        await loadAwards(user.id)
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
        })
    }

    const getTypeInfo = (type: Award['type']) => {
        return AWARD_TYPES.find(t => t.value === type) || AWARD_TYPES[0]
    }

    const groupedAwards = awards.reduce((acc, award) => {
        if (!acc[award.type]) {
            acc[award.type] = []
        }
        acc[award.type].push(award)
        return acc
    }, {} as Record<Award['type'], Award[]>)

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1>Awards & Certifications</h1>
                    <p>Showcase your achievements, certifications, and recognition.</p>
                </div>
                <button onClick={() => handleOpenForm()} className={styles.addBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add Entry
                </button>
            </header>

            {loading ? (
                <div className={styles.loadingGrid}>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={styles.loadingCard} />
                    ))}
                </div>
            ) : awards.length > 0 ? (
                <div className={styles.sections}>
                    {Object.entries(groupedAwards).map(([type, typeAwards]) => {
                        const typeInfo = getTypeInfo(type as Award['type'])
                        return (
                            <section key={type} className={styles.section}>
                                <h2 className={styles.sectionTitle}>
                                    <span className={styles.sectionIcon}>{typeInfo.icon}</span>
                                    {typeInfo.label}s
                                    <span className={styles.sectionCount}>{typeAwards.length}</span>
                                </h2>
                                <div className={styles.awardsGrid}>
                                    {typeAwards.map((award) => (
                                        <div key={award.id} className={styles.awardCard}>
                                            <div className={styles.cardHeader}>
                                                <h3>{award.title}</h3>
                                                <div className={styles.cardActions}>
                                                    <button
                                                        onClick={() => handleOpenForm(award)}
                                                        className={styles.actionBtn}
                                                        title="Edit"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(award.id)}
                                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                        title="Delete"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <p className={styles.issuer}>{award.issuer}</p>

                                            {award.description && (
                                                <p className={styles.description}>{award.description}</p>
                                            )}

                                            <div className={styles.cardMeta}>
                                                <span className={styles.date}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    {formatDate(award.date_received)}
                                                    {award.expiry_date && (
                                                        <span className={styles.expiry}>
                                                            {new Date(award.expiry_date) < new Date() ? ' (Expired)' : ` - ${formatDate(award.expiry_date)}`}
                                                        </span>
                                                    )}
                                                </span>
                                                {award.credential_id && (
                                                    <span className={styles.credentialId}>
                                                        ID: {award.credential_id}
                                                    </span>
                                                )}
                                            </div>

                                            {award.url && (
                                                <a href={award.url} target="_blank" rel="noopener noreferrer" className={styles.viewLink}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                        <polyline points="15 3 21 3 21 9" />
                                                        <line x1="10" y1="14" x2="21" y2="3" />
                                                    </svg>
                                                    View Credential
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )
                    })}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="8" r="7" />
                            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                        </svg>
                    </div>
                    <h3>No awards or certifications yet</h3>
                    <p>Add your achievements to highlight them in your tailored resumes.</p>
                    <button onClick={() => handleOpenForm()} className={styles.emptyAction}>
                        Add Your First Entry
                    </button>
                </div>
            )}

            {/* Award Form Modal */}
            {showForm && (
                <div className={styles.modalOverlay} onClick={handleCloseForm}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingAward ? 'Edit Entry' : 'Add Entry'}</h2>
                            <button onClick={handleCloseForm} className={styles.closeBtn}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Type *</label>
                                <div className={styles.typeSelector}>
                                    {AWARD_TYPES.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            className={`${styles.typeOption} ${formData.type === type.value ? styles.typeSelected : ''}`}
                                            onClick={() => setFormData({ ...formData, type: type.value })}
                                        >
                                            <span>{type.icon}</span>
                                            <span>{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="title">Title *</label>
                                <input
                                    id="title"
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={formData.type === 'certification' ? 'e.g., AWS Solutions Architect' : 'e.g., Dean\'s List'}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="issuer">Issuing Organization *</label>
                                <input
                                    id="issuer"
                                    type="text"
                                    value={formData.issuer}
                                    onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                                    placeholder="e.g., Amazon Web Services"
                                    required
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="date_received">Date Received *</label>
                                    <input
                                        id="date_received"
                                        type="date"
                                        value={formData.date_received}
                                        onChange={(e) => setFormData({ ...formData, date_received: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="expiry_date">Expiry Date</label>
                                    <input
                                        id="expiry_date"
                                        type="date"
                                        value={formData.expiry_date}
                                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                                    />
                                    <span className={styles.formHint}>Leave blank if no expiry</span>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of the achievement..."
                                    rows={3}
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="credential_id">Credential ID</label>
                                    <input
                                        id="credential_id"
                                        type="text"
                                        value={formData.credential_id}
                                        onChange={(e) => setFormData({ ...formData, credential_id: e.target.value })}
                                        placeholder="e.g., ABC123XYZ"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="url">Credential URL</label>
                                    <input
                                        id="url"
                                        type="url"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" onClick={handleCloseForm} className={styles.cancelBtn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className={styles.saveBtn}>
                                    {saving ? 'Saving...' : editingAward ? 'Update Entry' : 'Add Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
