import { SkeletonProfileSection } from '../../components/Skeleton'
import styles from './profile.module.css'

export default function ProfileLoading() {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div style={{ height: 32, width: 100, background: 'var(--card-bg)', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ height: 18, width: 280, background: 'var(--card-bg)', borderRadius: 6 }} />
                </div>
            </header>

            <div className={styles.loadingState}>
                {[1, 2, 3].map((i) => (
                    <SkeletonProfileSection key={i} />
                ))}
            </div>
        </div>
    )
}
