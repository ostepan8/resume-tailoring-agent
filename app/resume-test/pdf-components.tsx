'use client'

import React from 'react'
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Link,
    Font,
} from '@react-pdf/renderer'
import type {
    ResumeBlock,
    ResumeDocument,
    HeaderBlock,
    SummaryBlock,
    ExperienceBlock,
    EducationBlock,
    SkillsBlock,
    ProjectsBlock,
    CertificationsBlock,
    AwardsBlock,
    PublicationsBlock,
    LanguagesBlock,
    CustomBlock,
    BulletInput,
    SkillInput,
} from './types'
import { getBulletText, isBulletEnabled, getSkillText, isSkillEnabled } from './types'

// ATS-friendly fonts - using standard PDF fonts
// These are guaranteed to work and are ATS-readable
const styles = StyleSheet.create({
    page: {
        padding: 18,
        paddingTop: 18,
        paddingBottom: 18,
        fontFamily: 'Helvetica',
        fontSize: 10,
        lineHeight: 1.4,
        color: '#1a1a1a',
    },

    // Header styles
    header: {
        marginBottom: 2,
        textAlign: 'center',
    },
    name: {
        fontSize: 22,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    contactRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 4,
    },
    contactItem: {
        fontSize: 9,
        color: '#4a4a4a',
    },
    contactSeparator: {
        fontSize: 9,
        color: '#666',
        marginHorizontal: 4,
    },
    contactLink: {
        fontSize: 9,
        color: '#1d4ed8',
        textDecoration: 'none',
    },

    // Section styles
    section: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 0.5,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
        paddingBottom: 2,
        marginBottom: 6,
    },

    // Summary
    summaryText: {
        fontSize: 10,
        lineHeight: 1.5,
        textAlign: 'justify',
    },

    // Experience & Project entries
    entryContainer: {
        marginBottom: 8,
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 2,
    },
    entryTitle: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
    },
    entrySubtitle: {
        fontSize: 10,
        color: '#4a4a4a',
    },
    entryDate: {
        fontSize: 9,
        color: '#666',
        textAlign: 'right',
    },
    entryLocation: {
        fontSize: 9,
        color: '#666',
        textAlign: 'right',
    },

    // Bullet points
    bulletList: {
        marginTop: 3,
        paddingLeft: 4,
    },
    bulletItem: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    bulletPoint: {
        width: 10,
        fontSize: 10,
        color: '#333',
    },
    bulletText: {
        flex: 1,
        fontSize: 10,
        lineHeight: 1.45,
    },

    // Skills
    skillsInline: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
    },
    skillCategory: {
        marginBottom: 1,
    },
    skillCategoryName: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
    },
    skillText: {
        fontSize: 10,
    },

    // Education
    educationSection: {
        marginBottom: 2,
    },
    educationEntry: {
        marginBottom: 4,
    },
    educationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    degree: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
    },
    institution: {
        fontSize: 10,
        color: '#4a4a4a',
    },
    gpa: {
        fontSize: 9,
        color: '#666',
    },

    // Certifications, Awards, etc.
    simpleEntry: {
        marginBottom: 2,
    },
    simpleEntryTitle: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
    },
    simpleEntrySubtitle: {
        fontSize: 9,
        color: '#666',
    },

    // Languages
    languageRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    languageItem: {
        fontSize: 10,
    },

    // Custom block
    customContent: {
        fontSize: 10,
        lineHeight: 1.5,
    },
})

// Individual block components

const HeaderBlockComponent: React.FC<{ block: HeaderBlock }> = ({ block }) => {
    const { data } = block
    const contactItems: React.ReactNode[] = []

    if (data.email) {
        contactItems.push(
            <Link key="email" src={`mailto:${data.email}`} style={styles.contactLink}>
                {data.email}
            </Link>
        )
    }
    if (data.phone) {
        contactItems.push(<Text key="phone" style={styles.contactItem}>{data.phone}</Text>)
    }
    if (data.location) {
        contactItems.push(<Text key="location" style={styles.contactItem}>{data.location}</Text>)
    }
    if (data.linkedin) {
        const cleanUrl = data.linkedin.replace(/^https?:\/\/(www\.)?/, '')
        contactItems.push(
            <Link key="linkedin" src={data.linkedin} style={styles.contactLink}>
                {cleanUrl}
            </Link>
        )
    }
    if (data.github) {
        const cleanUrl = data.github.replace(/^https?:\/\/(www\.)?/, '')
        contactItems.push(
            <Link key="github" src={data.github} style={styles.contactLink}>
                {cleanUrl}
            </Link>
        )
    }
    if (data.website) {
        const cleanUrl = data.website.replace(/^https?:\/\/(www\.)?/, '')
        contactItems.push(
            <Link key="website" src={data.website} style={styles.contactLink}>
                {cleanUrl}
            </Link>
        )
    }

    return (
        <View style={styles.header}>
            {data.name && <Text style={styles.name}>{data.name}</Text>}
            <View style={styles.contactRow}>
                {contactItems.map((item, index) => (
                    <React.Fragment key={index}>
                        {item}
                        {index < contactItems.length - 1 && (
                            <Text style={styles.contactSeparator}>|</Text>
                        )}
                    </React.Fragment>
                ))}
            </View>
        </View>
    )
}

const SummaryBlockComponent: React.FC<{ block: SummaryBlock }> = ({ block }) => {
    // Don't render if text is empty
    if (!block.data.text || block.data.text.trim() === '') return null

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{block.data.text}</Text>
        </View>
    )
}

const BulletList: React.FC<{ items: (string | BulletInput)[] }> = ({ items }) => {
    // Filter to only show enabled bullets with non-empty text
    const enabledBullets = items
        .filter(item => typeof item === 'string' || isBulletEnabled(item))
        .map(item => typeof item === 'string' ? item : getBulletText(item))
        .filter(text => text && text.trim() !== '') // Filter out empty strings

    if (enabledBullets.length === 0) return null

    return (
        <View style={styles.bulletList}>
            {enabledBullets.map((text, index) => (
                <View key={index} style={styles.bulletItem}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{text}</Text>
                </View>
            ))}
        </View>
    )
}

const ExperienceBlockComponent: React.FC<{ block: ExperienceBlock }> = ({ block }) => {
    const enabledEntries = block.data.entries.filter(e => e.enabled !== false)
    if (enabledEntries.length === 0) return null

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{block.data.title || 'Experience'}</Text>
            {enabledEntries.map((entry, index) => (
                <View key={entry.id} style={index < enabledEntries.length - 1 ? styles.entryContainer : undefined}>
                    <View style={styles.entryHeader}>
                        <View style={{ flex: 1 }}>
                            {entry.position && <Text style={styles.entryTitle}>{entry.position}</Text>}
                            {entry.company && <Text style={styles.entrySubtitle}>{entry.company}</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            {(entry.startDate || entry.endDate) && (
                                <Text style={styles.entryDate}>
                                    {entry.startDate || ''}{entry.startDate && ' – '}{entry.endDate || 'Present'}
                                    {entry.location ? ` | ${entry.location}` : ''}
                                </Text>
                            )}
                        </View>
                    </View>
                    {entry.bullets && entry.bullets.length > 0 && <BulletList items={entry.bullets} />}
                </View>
            ))}
        </View>
    )
}

const EducationBlockComponent: React.FC<{ block: EducationBlock }> = ({ block }) => {
    const enabledEntries = block.data.entries.filter(e => e.enabled !== false)
    if (enabledEntries.length === 0) return null

    return (
        <View style={styles.educationSection}>
            <Text style={styles.sectionTitle}>{block.data.title || 'Education'}</Text>
            {enabledEntries.map((entry, index) => (
                <View key={entry.id} style={index < enabledEntries.length - 1 ? styles.educationEntry : undefined}>
                    <View style={styles.educationHeader}>
                        <View style={{ flex: 1 }}>
                            {(entry.degree || entry.field) && (
                                <Text style={styles.degree}>
                                    {entry.degree || ''}{entry.field ? ` in ${entry.field}` : ''}
                                </Text>
                            )}
                            {entry.institution && <Text style={styles.institution}>{entry.institution}</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            {(entry.startDate || entry.endDate) && (
                                <Text style={styles.entryDate}>
                                    {entry.startDate && entry.endDate
                                        ? `${entry.startDate} – ${entry.endDate}`
                                        : entry.endDate || entry.startDate || ''}
                                    {entry.location ? ` | ${entry.location}` : ''}
                                </Text>
                            )}
                        </View>
                    </View>
                    {entry.gpa && <Text style={styles.gpa}>GPA: {entry.gpa}</Text>}
                    {entry.highlights && entry.highlights.length > 0 && (
                        <BulletList items={entry.highlights} />
                    )}
                </View>
            ))}
        </View>
    )
}

const SkillsBlockComponent: React.FC<{ block: SkillsBlock }> = ({ block }) => {
    const { data } = block

    // Filter enabled skills for inline/list formats
    const getEnabledSkills = (skills: SkillInput[] | undefined): string[] => {
        if (!skills) return []
        return skills.filter(isSkillEnabled).map(getSkillText)
    }

    const enabledSkills = getEnabledSkills(data.skills)

    // Filter enabled categories and their enabled skills
    const enabledCategories = (data.categories || [])
        .filter(cat => cat.enabled !== false)
        .map(cat => ({
            name: cat.name,
            skills: getEnabledSkills(cat.skills)
        }))
        .filter(cat => cat.skills.length > 0)

    // Don't render if no enabled content
    const hasContent =
        (data.format !== 'categorized' && enabledSkills.length > 0) ||
        (data.format === 'categorized' && enabledCategories.length > 0)

    if (!hasContent) return null

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{data.title || 'Skills'}</Text>

            {data.format === 'inline' && enabledSkills.length > 0 && (
                <Text style={styles.skillText}>{enabledSkills.join(' • ')}</Text>
            )}

            {data.format === 'list' && enabledSkills.length > 0 && (
                <BulletList items={enabledSkills} />
            )}

            {data.format === 'categorized' && enabledCategories.length > 0 && (
                <View>
                    {enabledCategories.map((category, index) => (
                        <View key={index} style={styles.skillCategory}>
                            <Text style={styles.skillText}>
                                <Text style={styles.skillCategoryName}>{category.name}: </Text>
                                {category.skills.join(', ')}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    )
}

const ProjectsBlockComponent: React.FC<{ block: ProjectsBlock }> = ({ block }) => {
    const enabledEntries = block.data.entries.filter(e => e.enabled !== false)
    if (enabledEntries.length === 0) return null

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{block.data.title || 'Projects'}</Text>
            {enabledEntries.map((entry, index) => (
                <View key={entry.id} style={index < enabledEntries.length - 1 ? styles.entryContainer : undefined}>
                    <View style={styles.entryHeader}>
                        <View style={{ flex: 1 }}>
                            <Text>
                                {entry.url ? (
                                    <Link src={entry.url} style={styles.entryTitle}>
                                        {entry.name}
                                    </Link>
                                ) : (
                                    <Text style={styles.entryTitle}>{entry.name}</Text>
                                )}
                                {entry.description && (
                                    <Text style={styles.entrySubtitle}> — {entry.description}</Text>
                                )}
                            </Text>
                        </View>
                    </View>
                    {entry.technologies && entry.technologies.length > 0 && (
                        <Text style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                            Technologies: {entry.technologies.join(', ')}
                        </Text>
                    )}
                    {entry.bullets.length > 0 && <BulletList items={entry.bullets} />}
                </View>
            ))}
        </View>
    )
}

const CertificationsBlockComponent: React.FC<{ block: CertificationsBlock }> = ({ block }) => {
    const enabledEntries = block.data.entries.filter(e => e.enabled !== false)
    if (enabledEntries.length === 0) return null

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{block.data.title || 'Certifications'}</Text>
            {enabledEntries.map((entry) => (
                <View key={entry.id} style={styles.simpleEntry}>
                    <Text style={styles.simpleEntryTitle}>{entry.name}</Text>
                    <Text style={styles.simpleEntrySubtitle}>
                        {entry.issuer}
                        {entry.date && ` • ${entry.date}`}
                        {entry.credentialId && ` • ID: ${entry.credentialId}`}
                    </Text>
                </View>
            ))}
        </View>
    )
}

const AwardsBlockComponent: React.FC<{ block: AwardsBlock }> = ({ block }) => {
    const enabledEntries = block.data.entries.filter(e => e.enabled !== false)
    if (enabledEntries.length === 0) return null

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{block.data.title || 'Awards & Honors'}</Text>
            {enabledEntries.map((entry) => (
                <View key={entry.id} style={styles.simpleEntry}>
                    <Text style={styles.simpleEntryTitle}>{entry.name}</Text>
                    <Text style={styles.simpleEntrySubtitle}>
                        {entry.issuer}
                        {entry.date && ` • ${entry.date}`}
                    </Text>
                    {entry.description && (
                        <Text style={{ fontSize: 9, marginTop: 2 }}>{entry.description}</Text>
                    )}
                </View>
            ))}
        </View>
    )
}

const PublicationsBlockComponent: React.FC<{ block: PublicationsBlock }> = ({ block }) => {
    const enabledEntries = block.data.entries.filter(e => e.enabled !== false)
    if (enabledEntries.length === 0) return null

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{block.data.title || 'Publications'}</Text>
            {enabledEntries.map((entry) => (
                <View key={entry.id} style={styles.simpleEntry}>
                    <Text style={styles.simpleEntryTitle}>
                        {entry.title}
                        {entry.url && (
                            <Link src={entry.url} style={styles.contactLink}>
                                {' '}↗
                            </Link>
                        )}
                    </Text>
                    <Text style={styles.simpleEntrySubtitle}>
                        {entry.venue}
                        {entry.date && ` • ${entry.date}`}
                    </Text>
                </View>
            ))}
        </View>
    )
}

const LanguagesBlockComponent: React.FC<{ block: LanguagesBlock }> = ({ block }) => {
    const enabledEntries = block.data.entries.filter(e => e.enabled !== false)
    if (enabledEntries.length === 0) return null

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{block.data.title || 'Languages'}</Text>
            <Text style={styles.skillText}>
                {enabledEntries
                    .map((entry) =>
                        entry.proficiency
                            ? `${entry.language} (${entry.proficiency})`
                            : entry.language
                    )
                    .join(' • ')}
            </Text>
        </View>
    )
}

const CustomBlockComponent: React.FC<{ block: CustomBlock }> = ({ block }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{block.data.title}</Text>
        <Text style={styles.customContent}>{block.data.content}</Text>
    </View>
)

// Block renderer - routes to the correct component
const BlockRenderer: React.FC<{ block: ResumeBlock }> = ({ block }) => {
    if (!block.enabled) return null

    switch (block.type) {
        case 'header':
            return <HeaderBlockComponent block={block} />
        case 'summary':
            return <SummaryBlockComponent block={block} />
        case 'experience':
            return <ExperienceBlockComponent block={block} />
        case 'education':
            return <EducationBlockComponent block={block} />
        case 'skills':
            return <SkillsBlockComponent block={block} />
        case 'projects':
            return <ProjectsBlockComponent block={block} />
        case 'certifications':
            return <CertificationsBlockComponent block={block} />
        case 'awards':
            return <AwardsBlockComponent block={block} />
        case 'publications':
            return <PublicationsBlockComponent block={block} />
        case 'languages':
            return <LanguagesBlockComponent block={block} />
        case 'custom':
            return <CustomBlockComponent block={block} />
        default:
            return null
    }
}

// Main resume document component
export const ResumePDF: React.FC<{ document: ResumeDocument }> = ({ document }) => {
    // Sort blocks by order and filter enabled ones
    const sortedBlocks = [...document.blocks]
        .filter((block) => block.enabled)
        .sort((a, b) => a.order - b.order)

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {sortedBlocks.map((block) => (
                    <BlockRenderer key={block.id} block={block} />
                ))}
            </Page>
        </Document>
    )
}

export default ResumePDF
