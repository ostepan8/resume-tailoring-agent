// Type definitions for Resume Tailor

export interface ResumeSection {
  title: string;
  content: string;
  order: number;
}

export interface ParsedResume {
  fullText: string;
  sections: ResumeSection[];
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  skills?: string[];
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  projects?: ProjectEntry[];
}

export interface ExperienceEntry {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field?: string;
  graduationDate?: string;
  gpa?: string;
  coursework?: string[];
}

export interface ProjectEntry {
  name: string;
  description: string;
  technologies?: string[];
  link?: string;
  bullets?: string[];
}

export interface JobDescription {
  title: string;
  company: string;
  fullText: string;
  requirements?: string[];
  responsibilities?: string[];
  qualifications?: string[];
  keywords?: string[];
}

export interface CompanyContext {
  mission?: string;
  values?: string[];
  products?: string;
  culture?: string;
  additionalNotes?: string;
}

export interface TailorRequest {
  resume: ParsedResume;
  jobDescription: JobDescription;
  companyContext?: CompanyContext;
}

export interface SectionChange {
  sectionTitle: string;
  originalContent: string;
  tailoredContent: string;
  reasoning: string;
  changeType: 'modified' | 'added' | 'removed' | 'unchanged';
}

export interface TailoredResume {
  fullText: string;
  sections: Array<{
    title: string;
    content: string;
    changes?: SectionChange;
  }>;
  summary: {
    totalChanges: number;
    keyImprovements: string[];
    keywordsAdded: string[];
    warnings?: string[];
  };
  matchScore?: number;
}

export interface AgentThought {
  id: number;
  text: string;
  isComplete: boolean;
  phase?: string;
}

export type TailoringPhase = 
  | 'analyzing-resume' 
  | 'analyzing-job' 
  | 'identifying-gaps' 
  | 'tailoring' 
  | 'validating' 
  | 'complete';
