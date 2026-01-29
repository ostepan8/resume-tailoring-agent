// ResumeEditor Types
// Clean, focused types for the resume editing experience

import type { ResumeBlock, ResumeDocument } from '../../../resume-test/types'
import type { JobDescription } from '../types'

export type SaveState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

export interface SectionMeta {
  id: string
  type: ResumeBlock['type']
  label: string
  icon: string
  enabled: boolean
  itemCount?: number
}

export interface ResumeEditorState {
  document: ResumeDocument
  activeSection: string | null
  saveState: SaveState
  lastSavedAt: Date | null
}

export interface ResumeEditorProps {
  initialDocument: ResumeDocument
  jobDescription: JobDescription
  onDocumentChange?: (doc: ResumeDocument) => void
  onPreviewUpdate?: (doc: ResumeDocument) => void
  autoSaveDelay?: number
}

// Section display configuration
export const SECTION_CONFIG: Record<string, { label: string; icon: string }> = {
  header: { label: 'Header', icon: 'user' },
  summary: { label: 'Summary', icon: 'file-text' },
  experience: { label: 'Experience', icon: 'briefcase' },
  education: { label: 'Education', icon: 'graduation-cap' },
  skills: { label: 'Skills', icon: 'code' },
  projects: { label: 'Projects', icon: 'folder' },
  certifications: { label: 'Certifications', icon: 'award' },
  awards: { label: 'Awards', icon: 'trophy' },
  publications: { label: 'Publications', icon: 'book' },
  languages: { label: 'Languages', icon: 'globe' },
  custom: { label: 'Custom', icon: 'plus' },
}
