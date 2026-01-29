'use client'

import React from 'react'
import styles from './Skeleton.module.css'

interface SkeletonProps {
    width?: string | number
    height?: string | number
    borderRadius?: string | number
    className?: string
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
    animation?: 'pulse' | 'shimmer' | 'none'
}

export function Skeleton({
    width,
    height,
    borderRadius,
    className = '',
    variant = 'rectangular',
    animation = 'shimmer',
}: SkeletonProps) {
    const getVariantRadius = () => {
        switch (variant) {
            case 'text':
                return '4px'
            case 'circular':
                return '50%'
            case 'rounded':
                return '12px'
            default:
                return borderRadius || '4px'
        }
    }

    return (
        <div
            className={`${styles.skeleton} ${styles[animation]} ${className}`}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
                borderRadius: getVariantRadius(),
            }}
        />
    )
}

// Preset skeleton components for common use cases
export function SkeletonText({ 
    lines = 1, 
    lastLineWidth = '60%',
    lineHeight = 16,
    gap = 8,
}: { 
    lines?: number
    lastLineWidth?: string
    lineHeight?: number
    gap?: number
}) {
    return (
        <div className={styles.textContainer} style={{ gap }}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height={lineHeight}
                    width={i === lines - 1 ? lastLineWidth : '100%'}
                    variant="text"
                />
            ))}
        </div>
    )
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
    return <Skeleton width={size} height={size} variant="circular" />
}

export function SkeletonButton({ width = 120, height = 40 }: { width?: number; height?: number }) {
    return <Skeleton width={width} height={height} variant="rounded" />
}

// Dashboard stat card skeleton
export function SkeletonStatCard() {
    return (
        <div className={styles.statCard}>
            <div className={styles.statIcon}>
                <Skeleton width={42} height={42} variant="rounded" />
            </div>
            <div className={styles.statContent}>
                <Skeleton width={32} height={24} variant="text" />
                <Skeleton width={60} height={14} variant="text" />
            </div>
        </div>
    )
}

// Experience/Education card skeleton
export function SkeletonExperienceCard() {
    return (
        <div className={styles.experienceCard}>
            <div className={styles.timeline}>
                <Skeleton width={12} height={12} variant="circular" />
                <div className={styles.timelineLine} />
            </div>
            <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                    <div style={{ flex: 1 }}>
                        <Skeleton width="70%" height={20} variant="text" />
                        <Skeleton width="50%" height={16} variant="text" />
                    </div>
                </div>
                <div className={styles.cardMeta}>
                    <Skeleton width={140} height={14} variant="text" />
                    <Skeleton width={80} height={24} variant="rounded" />
                </div>
                <SkeletonText lines={2} lineHeight={14} />
                <div className={styles.skillTags}>
                    <Skeleton width={60} height={24} variant="rounded" />
                    <Skeleton width={75} height={24} variant="rounded" />
                    <Skeleton width={55} height={24} variant="rounded" />
                </div>
            </div>
        </div>
    )
}

// Activity item skeleton
export function SkeletonActivityItem() {
    return (
        <div className={styles.activityItem}>
            <Skeleton width={36} height={36} variant="rounded" />
            <div className={styles.activityContent}>
                <Skeleton width="80%" height={16} variant="text" />
                <Skeleton width={100} height={12} variant="text" />
            </div>
            <div className={styles.matchScore}>
                <Skeleton width={40} height={18} variant="text" />
                <Skeleton width={32} height={12} variant="text" />
            </div>
        </div>
    )
}

// Project card skeleton
export function SkeletonProjectCard() {
    return (
        <div className={styles.projectCard}>
            <div className={styles.projectHeader}>
                <Skeleton width="60%" height={20} variant="text" />
            </div>
            <Skeleton width="100%" height={40} variant="text" />
            <div className={styles.skillTags}>
                <Skeleton width={50} height={24} variant="rounded" />
                <Skeleton width={65} height={24} variant="rounded" />
                <Skeleton width={45} height={24} variant="rounded" />
            </div>
            <Skeleton width={120} height={14} variant="text" />
        </div>
    )
}

// Skill card skeleton
export function SkeletonSkillCard() {
    return (
        <div className={styles.skillCard}>
            <div className={styles.skillHeader}>
                <Skeleton width="70%" height={16} variant="text" />
            </div>
            <div className={styles.skillMeta}>
                <Skeleton width="100%" height={6} variant="rounded" />
                <Skeleton width={80} height={12} variant="text" />
            </div>
        </div>
    )
}

// Award card skeleton
export function SkeletonAwardCard() {
    return (
        <div className={styles.awardCard}>
            <Skeleton width="70%" height={18} variant="text" />
            <Skeleton width="50%" height={14} variant="text" />
            <Skeleton width="100%" height={32} variant="text" />
            <Skeleton width={120} height={14} variant="text" />
        </div>
    )
}

// Job card skeleton
export function SkeletonJobCard() {
    return (
        <div className={styles.jobCard}>
            <div className={styles.jobMain}>
                <div className={styles.jobInfo}>
                    <Skeleton width="60%" height={18} variant="text" />
                    <Skeleton width="40%" height={14} variant="text" />
                    <Skeleton width={80} height={12} variant="text" />
                </div>
                <div className={styles.jobActions}>
                    <Skeleton width={100} height={32} variant="rounded" />
                    <Skeleton width={70} height={32} variant="rounded" />
                </div>
            </div>
        </div>
    )
}

// Resume card skeleton
export function SkeletonResumeCard() {
    return (
        <div className={styles.resumeCard}>
            <Skeleton width={48} height={56} variant="rounded" />
            <div className={styles.resumeContent}>
                <Skeleton width="70%" height={18} variant="text" />
                <Skeleton width="50%" height={14} variant="text" />
                <div className={styles.resumeBadges}>
                    <Skeleton width={50} height={20} variant="rounded" />
                    <Skeleton width={50} height={20} variant="rounded" />
                    <Skeleton width={60} height={20} variant="rounded" />
                </div>
                <Skeleton width={100} height={12} variant="text" />
            </div>
            <div className={styles.resumeActions}>
                <Skeleton width={28} height={28} variant="rounded" />
                <Skeleton width={28} height={28} variant="rounded" />
            </div>
        </div>
    )
}

// History item skeleton
export function SkeletonHistoryItem() {
    return (
        <div className={styles.historyItem}>
            <Skeleton width={36} height={36} variant="rounded" />
            <div className={styles.historyContent}>
                <Skeleton width="60%" height={18} variant="text" />
                <Skeleton width="40%" height={14} variant="text" />
                <Skeleton width={120} height={12} variant="text" />
            </div>
            <div className={styles.matchScore}>
                <Skeleton width={44} height={20} variant="text" />
                <Skeleton width={36} height={12} variant="text" />
            </div>
        </div>
    )
}

// Profile form skeleton
export function SkeletonProfileSection() {
    return (
        <div className={styles.profileSection}>
            <div className={styles.sectionHeader}>
                <Skeleton width={20} height={20} variant="rounded" />
                <Skeleton width={160} height={20} variant="text" />
            </div>
            <Skeleton width="80%" height={14} variant="text" />
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <Skeleton width={80} height={14} variant="text" />
                    <Skeleton width="100%" height={44} variant="rounded" />
                </div>
                <div className={styles.formGroup}>
                    <Skeleton width={100} height={14} variant="text" />
                    <Skeleton width="100%" height={44} variant="rounded" />
                </div>
            </div>
        </div>
    )
}

// Quick action skeleton
export function SkeletonQuickAction() {
    return (
        <div className={styles.quickAction}>
            <Skeleton width={40} height={40} variant="rounded" />
            <div style={{ flex: 1 }}>
                <Skeleton width="60%" height={16} variant="text" />
                <Skeleton width="80%" height={12} variant="text" />
            </div>
        </div>
    )
}
