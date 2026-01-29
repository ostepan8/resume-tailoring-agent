/**
 * Supabase Data Seeder
 * 
 * Seeds comprehensive synthetic data for a user in Supabase
 * 
 * Usage: npx ts-node scripts/seed-supabase-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Use service role key to bypass RLS, fall back to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL is set')
  console.error('   And either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not found, using anon key (may fail due to RLS)')
}

const supabase = createClient(supabaseUrl, supabaseKey)

const TARGET_EMAIL = 'stepan.o@northeastern.edu'
// Known user ID - fallback if RLS blocks query
const KNOWN_USER_ID = '6746430b-66c9-4847-8a4c-76dfa88b3359'

// Check for --clear flag
const shouldClear = process.argv.includes('--clear')
// Check for --use-known-id flag (bypasses user lookup)
const useKnownId = process.argv.includes('--use-known-id')

async function clearUserData(userId: string) {
  console.log('🧹 Clearing existing data for user...')
  
  const tables = [
    'tailoring_history',
    'user_resumes',
    'saved_jobs',
    'user_projects',
    'skills',
    'awards',
    'education',
    'work_experience',
  ]
  
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId)
    if (error) {
      console.error(`  ⚠️ Error clearing ${table}:`, error.message)
    } else {
      console.log(`  ✓ Cleared ${table}`)
    }
  }
  console.log('')
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('    SEEDING SUPABASE DATA FOR STEPAN')
  console.log('═══════════════════════════════════════════════════════════\n')

  let userId: string

  if (useKnownId) {
    // Use the hardcoded user ID (bypasses RLS issues)
    userId = KNOWN_USER_ID
    console.log(`👤 User: ${TARGET_EMAIL}`)
    console.log(`🆔 ID: ${userId} (using known ID)\n`)
  } else {
    // Try to look up user from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', TARGET_EMAIL)
      .single()

    if (profileError || !profile) {
      console.error(`❌ User ${TARGET_EMAIL} not found in database.`)
      console.error('   This may be due to RLS policies. Try one of these:')
      console.error('   1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local')
      console.error('   2. Run with --use-known-id flag to use hardcoded user ID')
      console.error('   Error:', profileError?.message)
      process.exit(1)
    }

    userId = profile.id
    console.log(`👤 User: ${TARGET_EMAIL}`)
    console.log(`🆔 ID: ${userId}\n`)
  }

  // Clear existing data if --clear flag is passed
  if (shouldClear) {
    await clearUserData(userId)
  }

  // ============================================
  // WORK EXPERIENCE DATA
  // ============================================
  console.log('📋 Seeding Work Experience...')

  const experiences = [
    {
      user_id: userId,
      company: 'Google',
      position: 'Senior Software Engineer',
      location: 'Mountain View, CA',
      employment_type: 'full-time',
      description: 'Lead engineer on Google Cloud Platform infrastructure team, focusing on distributed systems and developer experience.',
      achievements: [
        "Led redesign of GCP's internal service mesh, reducing p99 latency by 45%",
        'Architected multi-region failover system handling 2M+ requests/second',
        'Mentored 12 engineers across 3 teams, promoting 4 to senior level',
        'Reduced cloud costs by $2.3M annually through optimization initiatives',
      ],
      skills: ['Go', 'Kubernetes', 'gRPC', 'Spanner', 'BigQuery', 'Terraform'],
      start_date: '2022-03-15',
      end_date: null,
      is_current: true,
    },
    {
      user_id: userId,
      company: 'Meta',
      position: 'Software Engineer',
      location: 'Menlo Park, CA',
      employment_type: 'full-time',
      description: 'Core member of News Feed Ranking team, building ML-powered content recommendation systems.',
      achievements: [
        'Improved content relevance score by 28% through novel ranking features',
        'Built real-time analytics pipeline processing 50TB+ daily',
        'Reduced model inference latency from 120ms to 45ms',
      ],
      skills: ['Python', 'PyTorch', 'React', 'GraphQL', 'Spark'],
      start_date: '2019-06-01',
      end_date: '2022-03-01',
      is_current: false,
    },
    {
      user_id: userId,
      company: 'Stripe',
      position: 'Software Engineer',
      location: 'San Francisco, CA',
      employment_type: 'full-time',
      description: 'Built payment fraud detection and prevention systems protecting billions in transactions.',
      achievements: [
        'Reduced payment fraud rate by 35% through improved ML models',
        'Built merchant risk scoring API serving 100K+ requests/second',
        'Designed webhook delivery system with 99.99% reliability',
      ],
      skills: ['Ruby', 'Python', 'PostgreSQL', 'Redis', 'AWS', 'Kafka'],
      start_date: '2017-08-15',
      end_date: '2019-05-25',
      is_current: false,
    },
    {
      user_id: userId,
      company: 'Amazon',
      position: 'Software Development Engineer Intern',
      location: 'Seattle, WA',
      employment_type: 'internship',
      description: 'Summer internship on AWS Lambda team, working on serverless infrastructure.',
      achievements: [
        'Built cold start optimization feature reducing latency by 40%',
        'Developed internal testing framework adopted by 5 teams',
      ],
      skills: ['Java', 'AWS Lambda', 'DynamoDB'],
      start_date: '2017-05-15',
      end_date: '2017-08-10',
      is_current: false,
    },
    {
      user_id: userId,
      company: 'Northeastern University',
      position: 'Research Assistant',
      location: 'Boston, MA',
      employment_type: 'part-time',
      description: 'Research assistant in the Network Science Institute, working on graph neural networks.',
      achievements: [
        'Co-authored 2 papers published at ICML and NeurIPS',
        'Developed GNN library with 500+ GitHub stars',
      ],
      skills: ['Python', 'PyTorch', 'NetworkX', 'Neo4j'],
      start_date: '2015-09-01',
      end_date: '2017-05-01',
      is_current: false,
    },
  ]

  const { error: expError } = await supabase.from('work_experience').insert(experiences)
  if (expError) console.error('  Error inserting experiences:', expError.message)
  else console.log(`  ✓ Inserted ${experiences.length} work experiences`)

  // ============================================
  // EDUCATION DATA
  // ============================================
  console.log('🎓 Seeding Education...')

  const education = [
    {
      user_id: userId,
      institution: 'Stanford University',
      degree: 'Master of Science',
      field_of_study: 'Computer Science (AI Specialization)',
      location: 'Stanford, CA',
      gpa: '3.97',
      description: 'Graduate research focused on large language models and distributed ML systems.',
      achievements: [
        'Stanford Graduate Fellowship recipient',
        'Teaching Assistant for CS229 (Machine Learning)',
        'Published thesis research at ICML 2019',
      ],
      start_date: '2017-09-01',
      end_date: '2019-06-15',
      is_current: false,
    },
    {
      user_id: userId,
      institution: 'Northeastern University',
      degree: 'Bachelor of Science',
      field_of_study: 'Computer Science & Mathematics (Dual Degree)',
      location: 'Boston, MA',
      gpa: '3.92',
      description: 'Combined program with focus on algorithms and machine learning. Completed 3 co-ops.',
      achievements: [
        'Summa Cum Laude',
        "Dean's List (8 semesters)",
        'ACM ICPC Regional Finalist (2nd place)',
        'Khoury College Outstanding Student Award',
      ],
      start_date: '2013-09-01',
      end_date: '2017-05-15',
      is_current: false,
    },
  ]

  const { error: eduError } = await supabase.from('education').insert(education)
  if (eduError) console.error('  Error inserting education:', eduError.message)
  else console.log(`  ✓ Inserted ${education.length} education entries`)

  // ============================================
  // AWARDS & CERTIFICATIONS
  // ============================================
  console.log('🏆 Seeding Awards & Certifications...')

  const awards = [
    {
      user_id: userId,
      title: 'AWS Solutions Architect Professional',
      issuer: 'Amazon Web Services',
      type: 'certification',
      description: 'Advanced certification for designing distributed applications on AWS.',
      date_received: '2023-06-15',
      expiry_date: '2026-06-15',
      url: 'https://aws.amazon.com/verification',
      credential_id: 'AWS-SAP-2023-XXXXX',
    },
    {
      user_id: userId,
      title: 'Google Cloud Professional Data Engineer',
      issuer: 'Google Cloud',
      type: 'certification',
      description: 'Professional certification for data processing systems on GCP.',
      date_received: '2023-03-20',
      expiry_date: '2025-03-20',
      credential_id: 'GCP-PDE-2023-XXXXX',
    },
    {
      user_id: userId,
      title: 'Certified Kubernetes Administrator (CKA)',
      issuer: 'Cloud Native Computing Foundation',
      type: 'certification',
      description: 'Kubernetes administrator certification.',
      date_received: '2022-09-10',
      expiry_date: '2025-09-10',
      credential_id: 'CKA-2209-XXXXX',
    },
    {
      user_id: userId,
      title: 'Best Paper Award - ICML 2024',
      issuer: 'International Conference on Machine Learning',
      type: 'award',
      description: 'Awarded for paper "Efficient Attention Mechanisms for Long-Context Transformers"',
      date_received: '2024-07-15',
    },
    {
      user_id: userId,
      title: 'Forbes 30 Under 30 - Technology',
      issuer: 'Forbes',
      type: 'honor',
      description: 'Recognized for contributions to distributed systems and open source.',
      date_received: '2023-01-15',
      url: 'https://www.forbes.com/30-under-30/technology',
    },
    {
      user_id: userId,
      title: 'Efficient Training of Transformer Models on Heterogeneous Hardware',
      issuer: 'ICML 2019',
      type: 'publication',
      description: 'First-author publication on distributed training techniques for LLMs.',
      date_received: '2019-06-10',
      url: 'https://arxiv.org/abs/xxxx.xxxxx',
    },
    {
      user_id: userId,
      title: 'Method for Distributed Model Training with Adaptive Batch Sizing',
      issuer: 'USPTO',
      type: 'patent',
      description: 'Patent for novel approach to dynamically adjust batch sizes.',
      date_received: '2022-11-15',
      credential_id: 'US11XXXXXXX',
    },
  ]

  const { error: awardsError } = await supabase.from('awards').insert(awards)
  if (awardsError) console.error('  Error inserting awards:', awardsError.message)
  else console.log(`  ✓ Inserted ${awards.length} awards & certifications`)

  // ============================================
  // SKILLS
  // ============================================
  console.log('💡 Seeding Skills...')

  const skills = [
    // Technical
    { user_id: userId, name: 'Python', category: 'technical', proficiency: 'expert', years_of_experience: 10 },
    { user_id: userId, name: 'Go', category: 'technical', proficiency: 'expert', years_of_experience: 5 },
    { user_id: userId, name: 'TypeScript', category: 'technical', proficiency: 'expert', years_of_experience: 6 },
    { user_id: userId, name: 'JavaScript', category: 'technical', proficiency: 'expert', years_of_experience: 8 },
    { user_id: userId, name: 'Java', category: 'technical', proficiency: 'advanced', years_of_experience: 5 },
    { user_id: userId, name: 'C++', category: 'technical', proficiency: 'advanced', years_of_experience: 4 },
    { user_id: userId, name: 'Rust', category: 'technical', proficiency: 'intermediate', years_of_experience: 2 },
    { user_id: userId, name: 'SQL', category: 'technical', proficiency: 'expert', years_of_experience: 9 },
    // Frameworks
    { user_id: userId, name: 'React', category: 'framework', proficiency: 'expert', years_of_experience: 6 },
    { user_id: userId, name: 'Next.js', category: 'framework', proficiency: 'expert', years_of_experience: 4 },
    { user_id: userId, name: 'Node.js', category: 'framework', proficiency: 'expert', years_of_experience: 7 },
    { user_id: userId, name: 'PyTorch', category: 'framework', proficiency: 'expert', years_of_experience: 5 },
    { user_id: userId, name: 'TensorFlow', category: 'framework', proficiency: 'advanced', years_of_experience: 4 },
    { user_id: userId, name: 'FastAPI', category: 'framework', proficiency: 'expert', years_of_experience: 3 },
    { user_id: userId, name: 'GraphQL', category: 'framework', proficiency: 'advanced', years_of_experience: 4 },
    // Tools
    { user_id: userId, name: 'Docker', category: 'tool', proficiency: 'expert', years_of_experience: 6 },
    { user_id: userId, name: 'Kubernetes', category: 'tool', proficiency: 'expert', years_of_experience: 4 },
    { user_id: userId, name: 'Git', category: 'tool', proficiency: 'expert', years_of_experience: 10 },
    { user_id: userId, name: 'Terraform', category: 'tool', proficiency: 'advanced', years_of_experience: 3 },
    { user_id: userId, name: 'AWS', category: 'tool', proficiency: 'expert', years_of_experience: 6 },
    { user_id: userId, name: 'GCP', category: 'tool', proficiency: 'expert', years_of_experience: 4 },
    { user_id: userId, name: 'PostgreSQL', category: 'tool', proficiency: 'expert', years_of_experience: 7 },
    { user_id: userId, name: 'Redis', category: 'tool', proficiency: 'expert', years_of_experience: 5 },
    { user_id: userId, name: 'Kafka', category: 'tool', proficiency: 'advanced', years_of_experience: 4 },
    // Soft Skills
    { user_id: userId, name: 'Technical Leadership', category: 'soft', proficiency: 'expert', years_of_experience: null },
    { user_id: userId, name: 'System Design', category: 'soft', proficiency: 'expert', years_of_experience: null },
    { user_id: userId, name: 'Mentoring', category: 'soft', proficiency: 'expert', years_of_experience: null },
    { user_id: userId, name: 'Technical Writing', category: 'soft', proficiency: 'advanced', years_of_experience: null },
    // Languages
    { user_id: userId, name: 'English', category: 'language', proficiency: 'expert', years_of_experience: null },
    { user_id: userId, name: 'Russian', category: 'language', proficiency: 'expert', years_of_experience: null },
  ]

  const { error: skillsError } = await supabase.from('skills').insert(skills)
  if (skillsError) console.error('  Error inserting skills:', skillsError.message)
  else console.log(`  ✓ Inserted ${skills.length} skills`)

  // ============================================
  // PROJECTS
  // ============================================
  console.log('📁 Seeding Projects...')

  const projects = [
    {
      user_id: userId,
      name: 'OpenLLM - Distributed Training Framework',
      description: 'Open-source framework for efficiently training large language models across heterogeneous hardware.',
      skills: ['Python', 'PyTorch', 'CUDA', 'NCCL', 'Distributed Systems'],
      start_date: '2023-01-15',
      end_date: null,
      url: 'https://github.com/stepan/openllm',
    },
    {
      user_id: userId,
      name: 'CloudCost Optimizer',
      description: 'ML-powered tool for analyzing and optimizing cloud infrastructure costs.',
      skills: ['Go', 'Python', 'AWS', 'GCP', 'Machine Learning'],
      start_date: '2022-06-01',
      end_date: '2023-02-28',
      url: 'https://github.com/stepan/cloudcost',
    },
    {
      user_id: userId,
      name: 'Real-time Anomaly Detection System',
      description: 'Stream processing system for detecting anomalies in time-series data at scale.',
      skills: ['Python', 'Kafka', 'Flink', 'TensorFlow', 'Docker'],
      start_date: '2021-03-10',
      end_date: '2021-09-15',
    },
    {
      user_id: userId,
      name: 'GraphQL API Gateway',
      description: 'High-performance API gateway with automatic GraphQL schema stitching.',
      skills: ['Go', 'GraphQL', 'Redis', 'Kubernetes'],
      start_date: '2020-08-01',
      end_date: '2021-01-30',
      url: 'https://github.com/stepan/gql-gateway',
    },
    {
      user_id: userId,
      name: 'Kubernetes Operator for ML Pipelines',
      description: 'Custom Kubernetes operator for managing ML training pipelines.',
      skills: ['Go', 'Kubernetes', 'Python', 'PyTorch'],
      start_date: '2020-02-15',
      end_date: '2020-07-20',
      url: 'https://github.com/stepan/mlops-operator',
    },
  ]

  const { error: projectsError } = await supabase.from('user_projects').insert(projects)
  if (projectsError) console.error('  Error inserting projects:', projectsError.message)
  else console.log(`  ✓ Inserted ${projects.length} projects`)

  // ============================================
  // SAVED JOBS
  // ============================================
  console.log('📌 Seeding Saved Jobs...')

  const jobs = [
    {
      user_id: userId,
      title: 'Staff Software Engineer - Infrastructure',
      company: 'OpenAI',
      description: "Join OpenAI's infrastructure team to build and scale the systems that power our AI models.",
      url: 'https://openai.com/careers',
      status: 'applied',
      notes: 'Applied Jan 10. Had referral from Sam. Waiting for response.',
    },
    {
      user_id: userId,
      title: 'Principal Engineer - ML Platform',
      company: 'Anthropic',
      description: 'Lead the ML platform team at Anthropic. Design and build infrastructure for training LLMs.',
      url: 'https://anthropic.com/careers',
      status: 'interviewing',
      notes: 'Completed phone screen. On-site scheduled for next Tuesday.',
    },
    {
      user_id: userId,
      title: 'Engineering Manager - Backend',
      company: 'Figma',
      description: 'Lead a team of backend engineers building real-time collaboration infrastructure.',
      url: 'https://figma.com/careers',
      status: 'saved',
      notes: 'Interesting role. Company culture seems great.',
    },
    {
      user_id: userId,
      title: 'Staff Software Engineer - Developer Experience',
      company: 'Vercel',
      description: "Work on Vercel's developer platform, including build systems and edge functions.",
      url: 'https://vercel.com/careers',
      status: 'saved',
    },
  ]

  const { error: jobsError } = await supabase.from('saved_jobs').insert(jobs)
  if (jobsError) console.error('  Error inserting jobs:', jobsError.message)
  else console.log(`  ✓ Inserted ${jobs.length} saved jobs`)

  // ============================================
  // USER RESUMES
  // ============================================
  console.log('📄 Seeding User Resumes...')

  const resumeContent = {
    personalInfo: {
      name: 'Stepan Ostapenko',
      email: 'stepan.o@northeastern.edu',
      phone: '+1 (617) 555-0123',
      location: 'Boston, MA',
      linkedin: 'linkedin.com/in/stepano',
      github: 'github.com/stepan',
      website: 'stepan.dev',
    },
    summary: 'Senior Software Engineer with 8+ years of experience building scalable distributed systems and ML infrastructure. Led teams at Google, Meta, and Stripe. Published researcher with expertise in LLMs and real-time systems.',
    experience: [
      {
        company: 'Google',
        position: 'Senior Software Engineer',
        location: 'Mountain View, CA',
        startDate: '2022-03',
        endDate: null,
        current: true,
        achievements: [
          "Led redesign of GCP's internal service mesh, reducing p99 latency by 45%",
          'Architected multi-region failover system handling 2M+ requests/second',
          'Mentored 12 engineers across 3 teams',
        ],
      },
      {
        company: 'Meta',
        position: 'Software Engineer',
        location: 'Menlo Park, CA',
        startDate: '2019-06',
        endDate: '2022-03',
        current: false,
        achievements: [
          'Improved content relevance score by 28%',
          'Built real-time analytics pipeline processing 50TB+ daily',
        ],
      },
      {
        company: 'Stripe',
        position: 'Software Engineer',
        location: 'San Francisco, CA',
        startDate: '2017-08',
        endDate: '2019-05',
        current: false,
        achievements: [
          'Reduced payment fraud rate by 35% through improved ML models',
          'Built merchant risk scoring API serving 100K+ requests/second',
        ],
      },
    ],
    education: [
      {
        institution: 'Stanford University',
        degree: 'Master of Science',
        field: 'Computer Science (AI Specialization)',
        graduationDate: '2019-06',
        gpa: '3.97',
      },
      {
        institution: 'Northeastern University',
        degree: 'Bachelor of Science',
        field: 'Computer Science & Mathematics',
        graduationDate: '2017-05',
        gpa: '3.92',
      },
    ],
    skills: {
      languages: ['Python', 'Go', 'TypeScript', 'Java', 'C++', 'SQL'],
      frameworks: ['React', 'Next.js', 'PyTorch', 'TensorFlow', 'FastAPI'],
      tools: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'PostgreSQL', 'Redis', 'Kafka'],
    },
    certifications: [
      'AWS Solutions Architect Professional',
      'Google Cloud Professional Data Engineer',
      'Certified Kubernetes Administrator',
    ],
  }

  const resumes = [
    {
      user_id: userId,
      name: 'Master Resume - Full Stack',
      content: resumeContent,
      is_primary: true,
    },
    {
      user_id: userId,
      name: 'ML Engineering Focus',
      content: {
        ...resumeContent,
        summary: 'Machine Learning Engineer with extensive experience in distributed training systems and LLM infrastructure. Published researcher at ICML and NeurIPS with expertise in PyTorch, transformer architectures, and scalable ML pipelines.',
        skills: {
          languages: ['Python', 'C++', 'CUDA', 'SQL'],
          frameworks: ['PyTorch', 'TensorFlow', 'JAX', 'Hugging Face', 'MLflow'],
          tools: ['NVIDIA NCCL', 'DeepSpeed', 'Ray', 'Kubernetes', 'Weights & Biases'],
        },
      },
      is_primary: false,
    },
    {
      user_id: userId,
      name: 'Backend Infrastructure',
      content: {
        ...resumeContent,
        summary: 'Backend Engineer specializing in high-performance distributed systems. Expert in designing fault-tolerant architectures handling millions of requests per second. Deep experience with cloud infrastructure and DevOps practices.',
        skills: {
          languages: ['Go', 'Rust', 'Python', 'Java', 'SQL'],
          frameworks: ['gRPC', 'GraphQL', 'Fiber', 'Gin'],
          tools: ['Kubernetes', 'Terraform', 'AWS', 'GCP', 'PostgreSQL', 'Redis', 'Kafka', 'Prometheus'],
        },
      },
      is_primary: false,
    },
  ]

  const { error: resumesError } = await supabase.from('user_resumes').insert(resumes)
  if (resumesError) console.error('  Error inserting resumes:', resumesError.message)
  else console.log(`  ✓ Inserted ${resumes.length} user resumes`)

  // ============================================
  // TAILORING HISTORY
  // ============================================
  console.log('✂️ Seeding Tailoring History...')

  const tailoringHistory = [
    {
      user_id: userId,
      job_title: 'Staff Software Engineer - Infrastructure',
      company_name: 'OpenAI',
      job_description: `About the Role:
We're looking for a Staff Software Engineer to join our Infrastructure team. You'll work on the systems that power our AI models, including distributed training infrastructure, model serving, and internal developer tools.

Requirements:
- 8+ years of software engineering experience
- Deep expertise in distributed systems
- Experience with Kubernetes and cloud infrastructure (AWS/GCP)
- Strong programming skills in Python and/or Go
- Experience with ML infrastructure is a plus

Responsibilities:
- Design and build scalable infrastructure for training large language models
- Improve reliability and efficiency of model serving systems
- Mentor junior engineers and drive technical decisions`,
      original_resume: resumeContent,
      tailored_resume: {
        ...resumeContent,
        summary: 'Staff-level Software Engineer with 8+ years building distributed ML infrastructure at scale. Led GCP service mesh redesign reducing latency by 45%. Expert in Kubernetes, Python, Go, and cloud-native systems. Published researcher in efficient LLM training.',
        experience: resumeContent.experience.map((exp, i) => ({
          ...exp,
          achievements: i === 0 
            ? [
                'Led redesign of distributed service mesh handling 2M+ req/sec, directly applicable to model serving infrastructure',
                'Architected multi-region failover system with 99.99% uptime SLA',
                'Mentored 12 engineers on distributed systems best practices',
                'Reduced infrastructure costs by $2.3M through optimization initiatives',
              ]
            : exp.achievements,
        })),
      },
      match_score: 92,
    },
    {
      user_id: userId,
      job_title: 'Principal Engineer - ML Platform',
      company_name: 'Anthropic',
      job_description: `Principal Engineer - ML Platform

We're building the future of AI safety. Join us to lead our ML Platform team.

What you'll do:
- Lead architecture of our distributed training infrastructure
- Design systems for efficient model training and evaluation
- Build tooling for AI safety research
- Drive technical strategy and mentor senior engineers

What we're looking for:
- 10+ years of engineering experience, 5+ in ML infrastructure
- Track record of leading large-scale infrastructure projects
- Deep knowledge of PyTorch/JAX and distributed training
- Publications or patents in ML systems (preferred)
- Experience with transformer architectures`,
      original_resume: resumeContent,
      tailored_resume: {
        ...resumeContent,
        summary: 'Principal-level engineer with 8+ years experience, specializing in ML infrastructure and distributed training systems. Led infrastructure projects at Google and Meta. Published at ICML on efficient transformer training. Patent holder for distributed batch sizing methods.',
      },
      match_score: 88,
    },
    {
      user_id: userId,
      job_title: 'Senior Software Engineer - Developer Experience',
      company_name: 'Vercel',
      job_description: `About Vercel:
Vercel is the platform for frontend developers.

Role: Senior Software Engineer - Developer Experience

We're looking for engineers passionate about developer tools to join our DX team.

Requirements:
- 5+ years of software engineering experience
- Strong TypeScript/JavaScript skills
- Experience with React and Next.js
- Understanding of build systems and bundlers
- Excellent communication skills

Nice to have:
- Open source contributions
- Experience with edge computing
- Familiarity with serverless architecture`,
      original_resume: resumeContent,
      tailored_resume: {
        ...resumeContent,
        summary: 'Senior Software Engineer with 8+ years experience and deep expertise in TypeScript, React, and Next.js. Built developer-facing APIs at Stripe and Meta. Passionate about developer experience with multiple open source projects.',
        skills: {
          languages: ['TypeScript', 'JavaScript', 'Python', 'Go'],
          frameworks: ['Next.js', 'React', 'Node.js', 'GraphQL', 'Tailwind CSS'],
          tools: ['Vercel', 'AWS Lambda', 'Edge Functions', 'Webpack', 'Turborepo', 'pnpm'],
        },
      },
      match_score: 85,
    },
  ]

  const { error: historyError } = await supabase.from('tailoring_history').insert(tailoringHistory)
  if (historyError) console.error('  Error inserting tailoring history:', historyError.message)
  else console.log(`  ✓ Inserted ${tailoringHistory.length} tailoring history entries`)

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('                  SEEDING COMPLETE')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   📋 Work Experience:    ${experiences.length} entries`)
  console.log(`   🎓 Education:          ${education.length} entries`)
  console.log(`   🏆 Awards & Certs:     ${awards.length} entries`)
  console.log(`   💡 Skills:             ${skills.length} entries`)
  console.log(`   📁 Projects:           ${projects.length} entries`)
  console.log(`   📌 Saved Jobs:         ${jobs.length} entries`)
  console.log(`   📄 Resumes:            ${resumes.length} entries`)
  console.log(`   ✂️  Tailoring History:  ${tailoringHistory.length} entries`)
  console.log('═══════════════════════════════════════════════════════════\n')
}

main().catch(console.error)
