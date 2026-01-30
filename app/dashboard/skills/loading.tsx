import { SkeletonSkillCard } from '../../components/Skeleton'
import styles from './skills.module.css'

export default function SkillsLoading() {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div style={{ height: 32, width: 100, background: 'var(--card-bg)', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ height: 18, width: 340, background: 'var(--card-bg)', borderRadius: 6 }} />
                </div>
                <div className={styles.headerActions}>
                    <div style={{ height: 42, width: 110, background: 'var(--card-bg)', borderRadius: 8 }} />
                    <div style={{ height: 42, width: 110, background: 'var(--card-bg)', borderRadius: 8 }} />
                </div>
            </header>

            {/* Stats Summary Skeleton */}
            <div className={styles.statsSummary}>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={styles.statItem}>
                        <div style={{ height: 28, width: 32, background: 'var(--card-bg)', borderRadius: 6 }} />
                        <div style={{ height: 14, width: 60, background: 'var(--card-bg)', borderRadius: 4 }} />
                    </div>
                ))}
            </div>

            <div className={styles.skillsContainer}>
                <section className={styles.categorySection}>
                    <div className={styles.categoryTitle}>
                        <div style={{ height: 20, width: 100, background: 'var(--card-bg)', borderRadius: 6 }} />
                    </div>
                    <div className={styles.skillsGrid}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <SkeletonSkillCard key={i} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
