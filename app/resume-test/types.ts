// Modular Resume Block Types
// Each block is independent and can be toggled on/off by the AI

export type BlockType = 
  | 'header'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'publications'
  | 'languages'
  | 'custom';

// Base block interface
export interface BaseBlock {
  id: string;
  type: BlockType;
  enabled: boolean;
  order: number;
}

// Header block - contact info
export interface HeaderBlock extends BaseBlock {
  type: 'header';
  data: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
}

// Professional summary
export interface SummaryBlock extends BaseBlock {
  type: 'summary';
  data: {
    text: string;
  };
}

// Bullet point with optional visibility
export interface BulletPoint {
  text: string;
  enabled?: boolean; // default true if undefined
}

// Helper to normalize bullets (string or BulletPoint)
export type BulletInput = string | BulletPoint;

// Single experience entry
export interface ExperienceEntry {
  id: string;
  enabled?: boolean; // default true if undefined
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string; // undefined means "Present"
  bullets: BulletInput[];
}

export interface ExperienceBlock extends BaseBlock {
  type: 'experience';
  data: {
    title?: string; // Section title override
    entries: ExperienceEntry[];
  };
}

// Single education entry
export interface EducationEntry {
  id: string;
  enabled?: boolean; // default true if undefined
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  highlights?: BulletInput[]; // Supports visibility toggle per highlight
}

export interface EducationBlock extends BaseBlock {
  type: 'education';
  data: {
    title?: string;
    entries: EducationEntry[];
  };
}

// Skill item with optional visibility
export interface SkillItem {
  text: string;
  enabled?: boolean; // default true if undefined
}

// Helper type for skill input (string or SkillItem)
export type SkillInput = string | SkillItem;

// Skill category with optional visibility
export interface SkillCategory {
  name: string;
  enabled?: boolean; // default true if undefined
  skills: SkillInput[];
}

// Skills block - can be formatted various ways
export interface SkillsBlock extends BaseBlock {
  type: 'skills';
  data: {
    title?: string;
    // Can be simple list or categorized
    format: 'list' | 'categorized' | 'inline';
    skills?: SkillInput[]; // For 'list' or 'inline' format
    categories?: SkillCategory[]; // For 'categorized' format
  };
}

// Single project entry
export interface ProjectEntry {
  id: string;
  enabled?: boolean; // default true if undefined
  name: string;
  description?: string;
  technologies?: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
  bullets: BulletInput[];
}

export interface ProjectsBlock extends BaseBlock {
  type: 'projects';
  data: {
    title?: string;
    entries: ProjectEntry[];
  };
}

// Certifications
export interface CertificationEntry {
  id: string;
  enabled?: boolean; // default true if undefined
  name: string;
  issuer: string;
  date?: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface CertificationsBlock extends BaseBlock {
  type: 'certifications';
  data: {
    title?: string;
    entries: CertificationEntry[];
  };
}

// Awards & Honors
export interface AwardEntry {
  id: string;
  enabled?: boolean; // default true if undefined
  name: string;
  issuer: string;
  date?: string;
  description?: string;
}

export interface AwardsBlock extends BaseBlock {
  type: 'awards';
  data: {
    title?: string;
    entries: AwardEntry[];
  };
}

// Publications
export interface PublicationEntry {
  id: string;
  enabled?: boolean; // default true if undefined
  title: string;
  venue?: string; // Journal, conference, etc.
  date?: string;
  url?: string;
  description?: string;
}

export interface PublicationsBlock extends BaseBlock {
  type: 'publications';
  data: {
    title?: string;
    entries: PublicationEntry[];
  };
}

// Languages
export interface LanguageEntry {
  id?: string;
  enabled?: boolean; // default true if undefined
  language: string;
  proficiency?: 'Native' | 'Fluent' | 'Professional' | 'Conversational' | 'Basic';
}

export interface LanguagesBlock extends BaseBlock {
  type: 'languages';
  data: {
    title?: string;
    entries: LanguageEntry[];
  };
}

// Custom block for anything else
export interface CustomBlock extends BaseBlock {
  type: 'custom';
  data: {
    title: string;
    content: string; // Plain text content
  };
}

// Union type of all blocks
export type ResumeBlock = 
  | HeaderBlock
  | SummaryBlock
  | ExperienceBlock
  | EducationBlock
  | SkillsBlock
  | ProjectsBlock
  | CertificationsBlock
  | AwardsBlock
  | PublicationsBlock
  | LanguagesBlock
  | CustomBlock;

// The full resume document
export interface ResumeDocument {
  blocks: ResumeBlock[];
  metadata?: {
    templateId?: string;
    targetJob?: string;
    targetCompany?: string;
    createdAt?: string;
  };
}

// Helper to generate unique IDs
export const generateId = () => Math.random().toString(36).substring(2, 9);

// Factory functions for creating new blocks
export const createHeaderBlock = (data: HeaderBlock['data']): HeaderBlock => ({
  id: generateId(),
  type: 'header',
  enabled: true,
  order: 0,
  data,
});

export const createSummaryBlock = (text: string): SummaryBlock => ({
  id: generateId(),
  type: 'summary',
  enabled: true,
  order: 1,
  data: { text },
});

export const createExperienceBlock = (entries: ExperienceEntry[]): ExperienceBlock => ({
  id: generateId(),
  type: 'experience',
  enabled: true,
  order: 2,
  data: { entries },
});

export const createEducationBlock = (entries: EducationEntry[]): EducationBlock => ({
  id: generateId(),
  type: 'education',
  enabled: true,
  order: 3,
  data: { entries },
});

export const createSkillsBlock = (
  skills: string[], 
  format: SkillsBlock['data']['format'] = 'inline'
): SkillsBlock => ({
  id: generateId(),
  type: 'skills',
  enabled: true,
  order: 4,
  data: { format, skills },
});

export const createProjectsBlock = (entries: ProjectEntry[]): ProjectsBlock => ({
  id: generateId(),
  type: 'projects',
  enabled: true,
  order: 5,
  data: { entries },
});

// Bullet helpers
export const getBulletText = (bullet: BulletInput): string => 
  typeof bullet === 'string' ? bullet : bullet.text;

export const isBulletEnabled = (bullet: BulletInput): boolean => 
  typeof bullet === 'string' ? true : bullet.enabled !== false;

export const createBullet = (text: string, enabled: boolean = true): BulletPoint => 
  ({ text, enabled });

// Skill helpers
export const getSkillText = (skill: SkillInput): string => 
  typeof skill === 'string' ? skill : skill.text;

export const isSkillEnabled = (skill: SkillInput): boolean => 
  typeof skill === 'string' ? true : skill.enabled !== false;

export const createSkill = (text: string, enabled: boolean = true): SkillItem => 
  ({ text, enabled });
