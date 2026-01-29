// Shared types for tailor step components

// ============================================
// STRUCTURED ENTRY TYPES
// These mirror the block system for seamless conversion
// ============================================

export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string; // undefined means "Present"
  bullets: string[];
  // For tracking changes
  originalBullets?: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  highlights?: string[];
}

export interface ProjectEntry {
  id: string;
  name: string;
  description?: string;
  technologies?: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
}

export interface SkillCategory {
  name: string;
  skills: string[];
}

export interface SkillsData {
  format: 'list' | 'categorized' | 'inline';
  skills?: string[]; // For list/inline format
  categories?: SkillCategory[]; // For categorized format
}

// ============================================
// CONTACT & SECTION TYPES
// ============================================

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface ResumeSection {
  title: string;
  content: string;
  order: number;
}

// ============================================
// PARSED RESUME (from upload/parsing)
// ============================================

export interface ParsedResume {
  fullText: string;
  sections: ResumeSection[];
  contactInfo?: ContactInfo;
  // Structured data (populated by AI parser)
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  skills?: string[] | SkillsData;
  projects?: ProjectEntry[];
}

// ============================================
// JOB & COMPANY CONTEXT
// ============================================

export interface JobDescription {
  title: string;
  company: string;
  fullText: string;
  requirements?: string[];
  responsibilities?: string[];
  keywords?: string[];
  sourceUrl?: string;
}

export interface CompanyContext {
  mission?: string;
  values?: string[];
  products?: string;
  culture?: string;
  additionalNotes?: string;
}

// ============================================
// TAILORING CHANGE TRACKING
// ============================================

export interface SectionChange {
  sectionTitle: string;
  originalContent: string;
  tailoredContent: string;
  reasoning: string;
  changeType: 'modified' | 'added' | 'removed' | 'unchanged';
}

export interface ExperienceChange {
  entryId: string;
  company: string;
  reasoning: string;
  bulletChanges?: Array<{
    original: string;
    tailored: string;
  }>;
}

// ============================================
// TAILORED RESUME (output from AI)
// ============================================

export interface TailoredResume {
  fullText: string;
  
  // Legacy section-based format (backwards compat)
  sections: Array<{
    title: string;
    content: string;
    originalContent?: string;
    changes?: SectionChange;
  }>;
  
  // Structured data (new format)
  contactInfo?: ContactInfo;
  professionalSummary?: string;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  skills?: SkillsData;
  projects?: ProjectEntry[];
  
  // Change tracking
  experienceChanges?: ExperienceChange[];
  
  // Summary
  summary: {
    totalChanges: number;
    keyImprovements: string[];
    keywordsAdded: string[];
    warnings?: string[];
  };
  
  matchScore?: number;
  markdownVersion?: string;
  latexVersion?: string;
}

// ============================================
// UI STATE TYPES
// ============================================

export interface AgentThought {
  id: number;
  text: string;
  isComplete: boolean;
  phase?: string;
}

export type TailoringPhase = 
  | 'analyzing-resume' 
  | 'analyzing-job' 
  | 'researching-company'
  | 'identifying-gaps' 
  | 'tailoring' 
  | 'validating' 
  | 'complete';

export type Step = 'job' | 'tailoring' | 'results';

// Resume source mode - always from projects now (kept for backwards compatibility)
export type ResumeSourceMode = 'from-projects';
