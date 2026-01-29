'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../../../lib/auth-context'
import {
    projectsDb,
    type UserProject,
} from '../../../lib/database'
import styles from './projects.module.css'

export default function ProjectsPage() {
    const { user } = useAuth()
    const [projects, setProjects] = useState<UserProject[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingProject, setEditingProject] = useState<UserProject | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        skills: '',
        start_date: '',
        end_date: '',
        url: '',
    })
    const [saving, setSaving] = useState(false)
    
    // Track if initial data has been fetched to prevent re-fetching on re-renders
    const hasFetchedRef = useRef(false)

    const loadProjects = useCallback(async (userId: string) => {
        setLoading(true)
        const data = await projectsDb.getAll(userId)
        setProjects(data)
        setLoading(false)
    }, [])

    // Fetch data only once when user becomes available
    useEffect(() => {
        if (user?.id && !hasFetchedRef.current) {
            hasFetchedRef.current = true
            loadProjects(user.id)
        }
    }, [user?.id, loadProjects])

    const handleOpenForm = (project?: UserProject) => {
        if (project) {
            setEditingProject(project)
            setFormData({
                name: project.name,
                description: project.description || '',
                skills: project.skills.join(', '),
                start_date: project.start_date || '',
                end_date: project.end_date || '',
                url: project.url || '',
            })
        } else {
            setEditingProject(null)
            setFormData({
                name: '',
                description: '',
                skills: '',
                start_date: '',
                end_date: '',
                url: '',
            })
        }
        setShowForm(true)
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setEditingProject(null)
        setFormData({
            name: '',
            description: '',
            skills: '',
            start_date: '',
            end_date: '',
            url: '',
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setSaving(true)

        const projectData = {
            name: formData.name,
            description: formData.description || null,
            skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            url: formData.url || null,
        }

        try {
            if (editingProject) {
                await projectsDb.update(editingProject.id, projectData)
            } else {
                await projectsDb.create({
                    ...projectData,
                    user_id: user.id,
                })
            }
            await loadProjects(user.id)
            handleCloseForm()
        } catch (error) {
            console.error('Error saving project:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return
        if (!user) return

        await projectsDb.delete(id)
        await loadProjects(user.id)
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
                    <h1>Projects</h1>
                    <p>Manage your projects and experience to enhance your resumes.</p>
                </div>
                <button onClick={() => handleOpenForm()} className={styles.addBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add Project
                </button>
            </header>

            {loading ? (
                <div className={styles.loadingGrid}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={styles.loadingCard} />
                    ))}
                </div>
            ) : projects.length > 0 ? (
                <div className={styles.projectsGrid}>
                    {projects.map((project) => (
                        <div key={project.id} className={styles.projectCard}>
                            <div className={styles.projectHeader}>
                                <h3>{project.name}</h3>
                                <div className={styles.projectActions}>
                                    <button
                                        onClick={() => handleOpenForm(project)}
                                        className={styles.actionBtn}
                                        title="Edit"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(project.id)}
                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                        title="Delete"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {project.description && (
                                <p className={styles.projectDesc}>{project.description}</p>
                            )}

                            {project.skills.length > 0 && (
                                <div className={styles.skillTags}>
                                    {project.skills.slice(0, 5).map((skill, i) => (
                                        <span key={i} className={styles.skillTag}>{skill}</span>
                                    ))}
                                    {project.skills.length > 5 && (
                                        <span className={styles.skillMore}>+{project.skills.length - 5}</span>
                                    )}
                                </div>
                            )}

                            <div className={styles.projectMeta}>
                                {(project.start_date || project.end_date) && (
                                    <span className={styles.projectDate}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" y1="2" x2="16" y2="6" />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        {formatDate(project.start_date)}
                                        {project.end_date ? ` - ${formatDate(project.end_date)}` : ' - Present'}
                                    </span>
                                )}
                                {project.url && (
                                    <a href={project.url} target="_blank" rel="noopener noreferrer" className={styles.projectLink}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                        View
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <h3>No projects yet</h3>
                    <p>Add your projects to include them in your tailored resumes.</p>
                    <button onClick={() => handleOpenForm()} className={styles.emptyAction}>
                        Add Your First Project
                    </button>
                </div>
            )}

            {/* Project Form Modal */}
            {showForm && (
                <div className={styles.modalOverlay} onClick={handleCloseForm}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingProject ? 'Edit Project' : 'Add Project'}</h2>
                            <button onClick={handleCloseForm} className={styles.closeBtn}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="name">Project Name *</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., E-commerce Platform"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe what you built and your contributions..."
                                    rows={4}
                                />
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

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="start_date">Start Date</label>
                                    <input
                                        id="start_date"
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="end_date">End Date</label>
                                    <input
                                        id="end_date"
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="url">Project URL</label>
                                <input
                                    id="url"
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="https://github.com/..."
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" onClick={handleCloseForm} className={styles.cancelBtn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className={styles.saveBtn}>
                                    {saving ? 'Saving...' : editingProject ? 'Update Project' : 'Add Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
