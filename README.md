# Custom Resume Tailor

A profile-based resume tailoring system powered by the [Subconscious AI SDK](https://github.com/subconscious-systems/subconscious-node). Instead of modifying a single resume file, this app builds a comprehensive **project registry** from your uploaded resume and generates fresh, tailored resumes for each job application.

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Upload Resume  │────▶│  Parse & Extract │────▶│  Project        │
│  (PDF or text)  │     │  (AI-powered)    │     │  Registry       │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐              │
│  Tailored       │◀────│  Generate Resume │◀─────────────┤
│  PDF Resume     │     │  (per company)   │              │
└─────────────────┘     └──────────────────┘              │
                                                          │
                        ┌──────────────────┐              │
                        │  Job Description │──────────────┘
                        │  (URL or paste)  │
                        └──────────────────┘
```

### 1. Build Your Profile Registry

Upload your existing resume (PDF or paste text). The AI parses it into structured components:
- **Experience** — Work history with achievements and bullet points
- **Education** — Degrees, institutions, GPA, honors
- **Projects** — Personal/professional projects with technologies used
- **Skills** — Technical and soft skills, categorized by type
- **Awards** — Certifications, honors, publications

These are stored in your profile and become the source of truth for all future resumes.

### 2. Intelligent Project Merging

When you upload a new resume, the system intelligently merges projects:
- **Add** — New projects not in your registry
- **Update** — Existing projects with better/new information
- **Skip** — Duplicate projects already fully captured

This keeps your project registry growing without duplicates.

### 3. Per-Company Resume Generation

When you're ready to apply:

1. **Enter Job Description** — Paste the job posting or provide a URL
2. **AI Research** — The system researches the company (mission, values, tech stack)
3. **Smart Tailoring** — Generates a resume from your registry that:
   - Highlights relevant experience and projects
   - Uses keywords from the job description naturally
   - Emphasizes achievements aligned with company values
   - Maintains factual accuracy (never fabricates experience)

4. **Export** — Download as PDF, copy as text/markdown

## Key Principles

- **Single Source of Truth** — Your profile registry, not individual resume files
- **Factual Accuracy** — AI reframes and optimizes, never invents experience
- **Company-Specific** — Each resume is generated fresh for the target role
- **Always Growing** — Upload multiple resumes to expand your project registry

## Features

### Profile Dashboard
- **Experience** — Manage work history entries
- **Education** — Academic background and achievements
- **Projects** — Your project portfolio (the core registry)
- **Skills** — Technical and soft skills with proficiency levels
- **Awards** — Certifications, publications, honors
- **Saved Jobs** — Track applications and their status

### AI-Powered Capabilities
- Resume parsing from PDF or text
- Job posting extraction from URLs
- Company research and context gathering
- Intelligent keyword optimization
- Section-by-section tailoring with reasoning

### Export Options
- PDF download (professional formatting)
- Plain text copy
- Markdown copy

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: [Subconscious SDK](https://docs.subconscious.dev) with TIM engine
- **PDF Generation**: React-PDF
- **Styling**: CSS Modules

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- [Subconscious API key](https://subconscious.dev)
- [Supabase project](https://supabase.com)

### Installation

```bash
cd custom_resume_tailor
pnpm install
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001)

### Environment Variables

Create `.env.local`:

```bash
# Required: Subconscious API key
SUBCONSCIOUS_API_KEY=your-api-key

# Required: Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Service role key for server-side operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Development settings
NEXT_PUBLIC_DEV_MODE=true

# Optional: Mock mode (when true, uses localStorage instead of Supabase)
# This is useful for demos or when Supabase isn't configured
NEXT_PUBLIC_USE_MOCK=false
```

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema in the SQL Editor:

```bash
# The schema is in supabase/schema.sql
```

The schema creates:
- `user_profiles` — Contact info and professional summary
- `work_experience` — Employment history
- `education` — Academic background
- `user_projects` — **The project registry**
- `skills` — Technical and soft skills
- `awards` — Certifications and achievements
- `user_resumes` — Source and tailored resume storage
- `saved_jobs` — Job tracking with status
- `tailoring_history` — Past tailoring sessions

All tables have Row Level Security (RLS) policies for data isolation.

## Project Structure

```
custom_resume_tailor/
├── app/
│   ├── api/
│   │   ├── job/
│   │   │   ├── fetch/          # Extract job from URL (AI-powered)
│   │   │   └── parse/          # Parse job description text
│   │   ├── projects/
│   │   │   └── merge/          # Intelligent project merging
│   │   ├── resume/
│   │   │   ├── parse/          # PDF to text extraction
│   │   │   ├── parse-structured/  # AI-powered structured parsing
│   │   │   ├── generate-pdf/   # PDF export with React-PDF
│   │   │   └── sync-profile/   # Sync parsed data to profile
│   │   └── tailor/
│   │       └── stream/         # SSE streaming for tailoring
│   │
│   ├── dashboard/              # Profile management UI
│   │   ├── experience/
│   │   ├── education/
│   │   ├── projects/           # Project registry management
│   │   ├── skills/
│   │   ├── awards/
│   │   ├── resumes/
│   │   ├── history/
│   │   └── jobs/
│   │
│   ├── tailor/                 # Main tailoring flow
│   │   └── components/
│   │       ├── JobDescriptionStep.tsx
│   │       ├── TailoringStep.tsx
│   │       └── ResultsStep.tsx
│   │
│   └── components/             # Shared components
│       ├── Navbar.tsx
│       ├── AuthModal.tsx
│       └── OnboardingTour.tsx
│
├── lib/
│   ├── ai-client/              # AI client abstraction
│   ├── auth-context.tsx        # React auth context
│   ├── database.ts             # Database operations layer
│   ├── subconscious.ts         # Subconscious SDK wrapper
│   └── supabase.ts             # Supabase client
│
└── supabase/
    └── schema.sql              # Full database schema with RLS
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/tailor/stream` | POST | Generate tailored resume (SSE streaming) |
| `/api/resume/parse` | POST | Extract text from PDF |
| `/api/resume/parse-structured` | POST | AI-parse resume into structured data |
| `/api/resume/generate-pdf` | POST | Generate PDF from tailored resume |
| `/api/resume/sync-profile` | POST | Save parsed data to user profile |
| `/api/job/fetch` | POST | Extract job posting from URL |
| `/api/projects/merge` | POST | Intelligently merge projects into registry |

## Subconscious SDK Usage

```typescript
import { Subconscious } from "subconscious";

const client = new Subconscious({
  apiKey: process.env.SUBCONSCIOUS_API_KEY,
});

// Fetch and parse a job posting
const run = await client.run({
  engine: "tim-gpt",
  input: {
    instructions: "Parse this job posting...",
    tools: [{ type: "platform", id: "webpage_understanding" }],
  },
  options: { awaitCompletion: true },
});

// Generate tailored resume
const tailorRun = await client.run({
  engine: "tim-gpt",
  input: {
    instructions: `Create a tailored resume for ${jobTitle} at ${company}...`,
    tools: [],
  },
  options: { awaitCompletion: true },
});
```

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#FF5C28` | CTAs, highlights |
| Teal | `#3ED0C3` | Skills, success states |
| Purple | `#9370DB` | Education |
| Gold | `#F0B060` | Awards |
| Dark | `#0F0F0F` | Backgrounds |

## Resources

- [Subconscious Documentation](https://docs.subconscious.dev)
- [Subconscious Node SDK](https://www.npmjs.com/package/subconscious)
- [Supabase Documentation](https://supabase.com/docs)
- [React-PDF](https://react-pdf.org/)
