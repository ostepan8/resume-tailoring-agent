import { SkeletonJobCard } from '../../components/Skeleton'
import styles from './jobs.module.css'

export default function JobsLoading() {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div style={{ height: 32, width: 140, background: 'var(--card-bg)', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ height: 18, width: 320, background: 'var(--card-bg)', borderRadius: 6 }} />
                </div>
            </header>

            <div className={styles.jobsList}>
                {[1, 2, 3].map((i) => (
                    <SkeletonJobCard key={i} />
                ))}
            </div>
        </div>
    )
}
