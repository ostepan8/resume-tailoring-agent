import { SkeletonExperienceCard } from '../../components/Skeleton'
import styles from './experience.module.css'

export default function ExperienceLoading() {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div style={{ height: 32, width: 200, background: 'var(--card-bg)', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ height: 18, width: 340, background: 'var(--card-bg)', borderRadius: 6 }} />
                </div>
                <div style={{ height: 42, width: 150, background: 'var(--card-bg)', borderRadius: 8 }} />
            </header>

            <div className={styles.experienceList}>
                {[1, 2, 3].map((i) => (
                    <SkeletonExperienceCard key={i} />
                ))}
            </div>
        </div>
    )
}
