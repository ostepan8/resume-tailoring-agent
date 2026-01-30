import { SkeletonExperienceCard } from '../../components/Skeleton'
import styles from './education.module.css'

export default function EducationLoading() {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div style={{ height: 32, width: 160, background: 'var(--card-bg)', borderRadius: 8, marginBottom: 8 }} />
                    <div style={{ height: 18, width: 300, background: 'var(--card-bg)', borderRadius: 6 }} />
                </div>
                <div style={{ height: 42, width: 150, background: 'var(--card-bg)', borderRadius: 8 }} />
            </header>

            <div className={styles.educationList}>
                {[1, 2].map((i) => (
                    <SkeletonExperienceCard key={i} />
                ))}
            </div>
        </div>
    )
}
