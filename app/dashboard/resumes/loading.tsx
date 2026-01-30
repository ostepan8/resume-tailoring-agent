import { SkeletonResumeCard } from '../../components/Skeleton'
import styles from './resumes.module.css'

export default function ResumesLoading() {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.page}>
                <header className={styles.header}>
                    <div>
                        <div style={{ height: 32, width: 120, background: 'var(--card-bg)', borderRadius: 8, marginBottom: 8 }} />
                        <div style={{ height: 18, width: 280, background: 'var(--card-bg)', borderRadius: 6 }} />
                    </div>
                    <div style={{ height: 42, width: 150, background: 'var(--card-bg)', borderRadius: 8 }} />
                </header>

                {/* Filter Tabs Skeleton */}
                <div className={styles.filterTabs}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{ height: 36, width: 90, background: 'var(--card-bg)', borderRadius: 8 }} />
                    ))}
                </div>

                <div className={styles.resumesGrid}>
                    {[1, 2].map((i) => (
                        <SkeletonResumeCard key={i} />
                    ))}
                </div>
            </div>
        </div>
    )
}
