import { SkeletonStatCard, SkeletonActivityItem, SkeletonQuickAction } from '../components/Skeleton'
import styles from './page.module.css'

export default function DashboardLoading() {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.greeting}>
                    <div style={{ height: 32, width: 280, background: 'var(--card-bg)', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ height: 18, width: 360, background: 'var(--card-bg)', borderRadius: 6 }} />
                </div>
                <div style={{ height: 42, width: 140, background: 'var(--card-bg)', borderRadius: 8 }} />
            </header>

            {/* Stats Grid Skeleton */}
            <div className={styles.statsGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <SkeletonStatCard key={i} />
                ))}
            </div>

            {/* Quick Actions Skeleton */}
            <section className={styles.section}>
                <div style={{ height: 24, width: 120, background: 'var(--card-bg)', borderRadius: 6, marginBottom: 16 }} />
                <div className={styles.quickActions}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <SkeletonQuickAction key={i} />
                    ))}
                </div>
            </section>

            {/* Recent Activity Skeleton */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div style={{ height: 24, width: 140, background: 'var(--card-bg)', borderRadius: 6 }} />
                    <div style={{ height: 18, width: 70, background: 'var(--card-bg)', borderRadius: 6 }} />
                </div>
                <div className={styles.activityList}>
                    {[1, 2, 3].map((i) => (
                        <SkeletonActivityItem key={i} />
                    ))}
                </div>
            </section>
        </div>
    )
}
