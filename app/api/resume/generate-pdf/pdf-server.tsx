// Server-side PDF component (no 'use client' directive)
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";
import type {
  ResumeBlock,
  ResumeDocument,
  HeaderBlock,
  SummaryBlock,
  ExperienceBlock,
  EducationBlock,
  SkillsBlock,
  ProjectsBlock,
  BulletInput,
  SkillInput,
} from "@/app/resume-test/types";
import { getBulletText, isBulletEnabled, getSkillText, isSkillEnabled } from "@/app/resume-test/types";

// ATS-friendly fonts - using standard PDF fonts
const styles = StyleSheet.create({
  page: {
    padding: 18,
    paddingTop: 18,
    paddingBottom: 18,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 2,
    textAlign: "center",
  },
  name: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  contactItem: {
    fontSize: 9,
    color: "#4a4a4a",
  },
  contactSeparator: {
    fontSize: 9,
    color: "#666",
    marginHorizontal: 4,
  },
  contactLink: {
    fontSize: 9,
    color: "#1d4ed8",
    textDecoration: "none",
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
    paddingBottom: 2,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
    textAlign: "justify",
  },
  entryContainer: {
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  entryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  entrySubtitle: {
    fontSize: 9,
    color: "#666",
    marginTop: 1,
  },
  entryDate: {
    fontSize: 9,
    color: "#666",
  },
  bulletList: {
    marginTop: 2,
  },
  bulletItem: {
    fontSize: 9,
    marginLeft: 8,
    marginTop: 2,
  },
  skillsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  skillItem: {
    fontSize: 9,
  },
  skillCategory: {
    marginBottom: 4,
  },
  categoryName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 2,
  },
});

function HeaderRenderer({ block }: { block: HeaderBlock }) {
  const { name, email, phone, location, linkedin, github, website } = block.data;
  const contactItems = [email, phone, location].filter(Boolean);
  const links = [linkedin, github, website].filter(Boolean);

  return (
    <View style={styles.header}>
      <Text style={styles.name}>{name}</Text>
      {contactItems.length > 0 && (
        <View style={styles.contactRow}>
          {contactItems.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <Text style={styles.contactSeparator}>|</Text>}
              <Text style={styles.contactItem}>{item}</Text>
            </React.Fragment>
          ))}
        </View>
      )}
      {links.length > 0 && (
        <View style={styles.contactRow}>
          {links.map((link, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <Text style={styles.contactSeparator}>|</Text>}
              <Link src={link?.startsWith("http") ? link : `https://${link}`} style={styles.contactLink}>
                {link}
              </Link>
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

function SummaryRenderer({ block }: { block: SummaryBlock }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
      <Text style={styles.summaryText}>{block.data.text}</Text>
    </View>
  );
}

function ExperienceRenderer({ block }: { block: ExperienceBlock }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>EXPERIENCE</Text>
      {block.data.entries
        .filter((entry) => entry.enabled !== false)
        .map((entry) => (
          <View key={entry.id} style={styles.entryContainer}>
            <View style={styles.entryHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryTitle}>
                  {entry.position} | {entry.company}
                </Text>
                {entry.location && <Text style={styles.entrySubtitle}>{entry.location}</Text>}
              </View>
              <Text style={styles.entryDate}>
                {entry.startDate} - {entry.endDate || "Present"}
              </Text>
            </View>
            <View style={styles.bulletList}>
              {entry.bullets
                .filter((bullet) => isBulletEnabled(bullet))
                .map((bullet, idx) => (
                  <Text key={idx} style={styles.bulletItem}>
                    • {getBulletText(bullet)}
                  </Text>
                ))}
            </View>
          </View>
        ))}
    </View>
  );
}

function EducationRenderer({ block }: { block: EducationBlock }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>EDUCATION</Text>
      {block.data.entries
        .filter((entry) => entry.enabled !== false)
        .map((entry) => (
          <View key={entry.id} style={styles.entryContainer}>
            <View style={styles.entryHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryTitle}>
                  {entry.degree} {entry.field ? `in ${entry.field}` : ""} | {entry.institution}
                </Text>
                {entry.location && <Text style={styles.entrySubtitle}>{entry.location}</Text>}
              </View>
              {entry.endDate && <Text style={styles.entryDate}>{entry.endDate}</Text>}
            </View>
            {entry.gpa && <Text style={styles.entrySubtitle}>GPA: {entry.gpa}</Text>}
            {entry.highlights && entry.highlights.length > 0 && (
              <View style={styles.bulletList}>
                {entry.highlights
                  .filter((h) => isBulletEnabled(h))
                  .map((highlight, idx) => (
                    <Text key={idx} style={styles.bulletItem}>
                      • {getBulletText(highlight)}
                    </Text>
                  ))}
              </View>
            )}
          </View>
        ))}
    </View>
  );
}

function SkillsRenderer({ block }: { block: SkillsBlock }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>SKILLS</Text>
      {block.data.format === "categorized" && block.data.categories ? (
        block.data.categories
          .filter((cat) => cat.enabled !== false)
          .map((category, idx) => (
            <View key={idx} style={styles.skillCategory}>
              <Text style={styles.categoryName}>{category.name}:</Text>
              <View style={styles.skillsList}>
                {category.skills
                  .filter((skill) => isSkillEnabled(skill))
                  .map((skill, skillIdx) => (
                    <React.Fragment key={skillIdx}>
                      {skillIdx > 0 && <Text>, </Text>}
                      <Text style={styles.skillItem}>{getSkillText(skill)}</Text>
                    </React.Fragment>
                  ))}
              </View>
            </View>
          ))
      ) : (
        <View style={styles.skillsList}>
          {(block.data.skills || [])
            .filter((skill) => isSkillEnabled(skill))
            .map((skill, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <Text>, </Text>}
                <Text style={styles.skillItem}>{getSkillText(skill)}</Text>
              </React.Fragment>
            ))}
        </View>
      )}
    </View>
  );
}

function ProjectsRenderer({ block }: { block: ProjectsBlock }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PROJECTS</Text>
      {block.data.entries
        .filter((entry) => entry.enabled !== false)
        .map((entry) => (
          <View key={entry.id} style={styles.entryContainer}>
            <View style={styles.entryHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryTitle}>{entry.name}</Text>
                {entry.technologies && entry.technologies.length > 0 && (
                  <Text style={styles.entrySubtitle}>{entry.technologies.join(", ")}</Text>
                )}
              </View>
              {entry.startDate && (
                <Text style={styles.entryDate}>
                  {entry.startDate} - {entry.endDate || "Present"}
                </Text>
              )}
            </View>
            {entry.description && <Text style={styles.entrySubtitle}>{entry.description}</Text>}
            {entry.bullets && entry.bullets.length > 0 && (
              <View style={styles.bulletList}>
                {entry.bullets
                  .filter((bullet) => isBulletEnabled(bullet))
                  .map((bullet, idx) => (
                    <Text key={idx} style={styles.bulletItem}>
                      • {getBulletText(bullet)}
                    </Text>
                  ))}
              </View>
            )}
          </View>
        ))}
    </View>
  );
}

function CustomRenderer({ block }: { block: any }) {
  // Split content into lines and render with proper formatting
  const lines: string[] = (block.data.content || "").split("\n").filter((l: string) => l.trim());
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{block.data.title}</Text>
      {lines.map((line, idx) => {
        // Check if line is a bullet point
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("●") || trimmedLine.startsWith("•") || trimmedLine.startsWith("-")) {
          // Replace various bullet characters with ASCII bullet for font compatibility
          const bulletText = trimmedLine.replace(/^[●•\-]\s*/, "• ");
          return (
            <Text key={idx} style={styles.bulletItem}>
              {bulletText}
            </Text>
          );
        }
        // Check if line looks like a header (company, position, etc.)
        if (line.trim().length > 0 && line.trim().length < 80 && !line.includes("|")) {
          return (
            <Text key={idx} style={styles.entryTitle}>
              {line.trim()}
            </Text>
          );
        }
        // Regular text
        return (
          <Text key={idx} style={styles.summaryText}>
            {line.trim()}
          </Text>
        );
      })}
    </View>
  );
}

function BlockRenderer({ block }: { block: ResumeBlock }) {
  switch (block.type) {
    case "header":
      return <HeaderRenderer block={block as HeaderBlock} />;
    case "summary":
      return <SummaryRenderer block={block as SummaryBlock} />;
    case "experience":
      return <ExperienceRenderer block={block as ExperienceBlock} />;
    case "education":
      return <EducationRenderer block={block as EducationBlock} />;
    case "skills":
      return <SkillsRenderer block={block as SkillsBlock} />;
    case "projects":
      return <ProjectsRenderer block={block as ProjectsBlock} />;
    case "custom":
      return <CustomRenderer block={block as any} />;
    default:
      return null;
  }
}

export function ResumePDFServer({ document }: { document: ResumeDocument }) {
  const sortedBlocks = [...document.blocks]
    .filter((block) => block.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {sortedBlocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </Page>
    </Document>
  );
}
