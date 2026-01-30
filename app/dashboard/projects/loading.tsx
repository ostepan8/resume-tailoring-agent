import { SkeletonProjectCard } from '../../components/Skeleton'
import styles from './projects.module.css'

export default function ProjectsLoading() {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div style={{ height: 32, width: 140, background: 'var(--card-bg)', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ height: 18, width: 340, background: 'var(--card-bg)', borderRadius: 6 }} />
                </div>
                <div style={{ height: 42, width: 130, background: 'var(--card-bg)', borderRadius: 8 }} />
            </header>

            <div className={styles.projectsGrid}>
                {[1, 2, 3].map((i) => (
                    <SkeletonProjectCard key={i} />
                ))}
            </div>
        </div>
    )
}
