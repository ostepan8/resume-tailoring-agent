import { SkeletonAwardCard } from '../../components/Skeleton'
import styles from './awards.module.css'

export default function AwardsLoading() {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div style={{ height: 32, width: 120, background: 'var(--card-bg)', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ height: 18, width: 300, background: 'var(--card-bg)', borderRadius: 6 }} />
                </div>
                <div style={{ height: 42, width: 130, background: 'var(--card-bg)', borderRadius: 8 }} />
            </header>

            <div className={styles.awardsGrid}>
                {[1, 2, 3].map((i) => (
                    <SkeletonAwardCard key={i} />
                ))}
            </div>
        </div>
    )
}
