import { SkeletonHistoryItem } from '../../components/Skeleton'
import styles from './history.module.css'

export default function HistoryLoading() {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div style={{ height: 32, width: 180, background: 'var(--card-bg)', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ height: 18, width: 300, background: 'var(--card-bg)', borderRadius: 6 }} />
                </div>
            </header>

            <div className={styles.historyList}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonHistoryItem key={i} />
                ))}
            </div>
        </div>
    )
}
