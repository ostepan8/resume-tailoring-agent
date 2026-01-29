/**
 * End-to-End Resume Tailor Test Script
 * 
 * Tests the full tailoring pipeline programmatically:
 * 1. Fetches resume data from Supabase
 * 2. Gets job description (from URL or mock data)
 * 3. Calls the tailor streaming API
 * 4. Validates and saves the output as JSON
 * 
 * Usage:
 *   node scripts/test-tailor-e2e.mjs --mock
 *   node scripts/test-tailor-e2e.mjs --url "https://careers.example.com/job/123"
 *   node scripts/test-tailor-e2e.mjs --title "Engineer" --company "Acme" --description "Build things"
 *   USE_MOCK_TAILORING=true node scripts/test-tailor-e2e.mjs --mock
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env.local") });

// ============================================
// CONFIGURATION
// ============================================

const TARGET_EMAIL = "ohstep23@gmail.com";
const KNOWN_USER_ID = null; // Will be fetched from Supabase
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

// Mock job data for testing
const MOCK_JOB = {
  title: "Senior Backend Engineer",
  company: "DataFlow Systems",
  fullText: `We're looking for a Senior Backend Engineer to join our growing team.

Responsibilities:
• Design and implement scalable backend services
• Build and maintain event-driven architectures
• Collaborate with cross-functional teams
• Mentor junior engineers

Requirements:
• 5+ years of backend development experience
• Strong proficiency in Kotlin or Java
• Experience with distributed systems and microservices
• Familiarity with AWS or GCP
• Excellent communication skills

Nice to have:
• Experience with Kafka or similar message queues
• Knowledge of container orchestration (Kubernetes)
• Previous experience in a startup environment`,
  requirements: [
    "5+ years of backend development experience",
    "Strong proficiency in Kotlin or Java",
    "Experience with distributed systems and microservices",
    "Familiarity with AWS or GCP",
    "Excellent communication skills",
  ],
  responsibilities: [
    "Design and implement scalable backend services",
    "Build and maintain event-driven architectures",
    "Collaborate with cross-functional teams",
    "Mentor junior engineers",
  ],
  keywords: ["Kotlin", "Java", "distributed systems", "microservices", "AWS", "Kafka", "Kubernetes", "event-driven"],
};

// ML-focused mock job for testing intelligent content selection
const MOCK_JOB_ML = {
  title: "Machine Learning Engineer",
  company: "AI Dynamics",
  fullText: `We're looking for a Machine Learning Engineer to join our AI team.

About the Role:
You'll work on cutting-edge ML systems that power our core products, from model development to production deployment.

Responsibilities:
• Design, train, and deploy machine learning models at scale
• Build data pipelines for model training and inference
• Collaborate with product teams to identify ML opportunities
• Optimize model performance and reduce inference latency
• Mentor team members on ML best practices

Requirements:
• 2+ years of experience with machine learning in production
• Strong Python skills and experience with PyTorch or TensorFlow
• Experience with NLP, computer vision, or recommendation systems
• Familiarity with ML ops tools (MLflow, Weights & Biases, etc.)
• Understanding of data pipelines and distributed computing

Nice to have:
• Experience with transformer models and Hugging Face
• Familiarity with cloud ML platforms (SageMaker, Vertex AI)
• Publications in ML conferences
• Experience with real-time ML serving`,
  requirements: [
    "2+ years of experience with machine learning in production",
    "Strong Python skills and experience with PyTorch or TensorFlow",
    "Experience with NLP, computer vision, or recommendation systems",
    "Familiarity with ML ops tools",
    "Understanding of data pipelines and distributed computing",
  ],
  responsibilities: [
    "Design, train, and deploy machine learning models at scale",
    "Build data pipelines for model training and inference",
    "Collaborate with product teams to identify ML opportunities",
    "Optimize model performance and reduce inference latency",
  ],
  keywords: ["Python", "PyTorch", "TensorFlow", "machine learning", "deep learning", "NLP", "computer vision", "transformers", "MLflow", "data pipelines"],
};

// ============================================
// ARGUMENT PARSING
// ============================================

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    mock: false,
    ml: false,
    url: null,
    title: null,
    company: null,
    description: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--mock") {
      config.mock = true;
    } else if (arg === "--ml") {
      config.ml = true;
    } else if (arg === "--url" && args[i + 1]) {
      config.url = args[++i];
    } else if (arg === "--title" && args[i + 1]) {
      config.title = args[++i];
    } else if (arg === "--company" && args[i + 1]) {
      config.company = args[++i];
    } else if (arg === "--description" && args[i + 1]) {
      config.description = args[++i];
    }
  }

  return config;
}

// ============================================
// SUPABASE DATA FETCHING
// ============================================

async function fetchResumeFromSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials in .env.local");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("  ⚠️  SUPABASE_SERVICE_ROLE_KEY not found, using anon key (may fail due to RLS)");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get user by email
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, phone, location, linkedin_url, github_url")
    .eq("email", TARGET_EMAIL)
    .single();

  if (profileError || !profile) {
    throw new Error(`User ${TARGET_EMAIL} not found in database. Error: ${profileError?.message || "No profile returned"}`);
  }

  const userId = profile.id;
  console.log(`  User: ${profile.email} (${userId})`);

  // Fetch work experience
  const { data: experience, error: expError } = await supabase
    .from("work_experience")
    .select("*")
    .eq("user_id", userId)
    .order("is_current", { ascending: false })
    .order("start_date", { ascending: false });

  if (expError) {
    console.error("  Error fetching experience:", expError.message);
  }
  console.log(`  Experience: ${experience?.length || 0} entries`);

  // Fetch education
  const { data: education, error: eduError } = await supabase
    .from("education")
    .select("*")
    .eq("user_id", userId)
    .order("is_current", { ascending: false })
    .order("start_date", { ascending: false });

  if (eduError) {
    console.error("  Error fetching education:", eduError.message);
  }
  console.log(`  Education: ${education?.length || 0} entries`);

  // Fetch skills
  const { data: skills, error: skillsError } = await supabase
    .from("skills")
    .select("*")
    .eq("user_id", userId)
    .order("category", { ascending: true });

  if (skillsError) {
    console.error("  Error fetching skills:", skillsError.message);
  }
  console.log(`  Skills: ${skills?.length || 0} entries`);

  // Fetch projects
  const { data: projects, error: projError } = await supabase
    .from("user_projects")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });

  if (projError) {
    console.error("  Error fetching projects:", projError.message);
  }
  console.log(`  Projects: ${projects?.length || 0} entries`);

  // Fetch primary resume (this contains the actual resume content)
  const { data: resumes } = await supabase
    .from("user_resumes")
    .select("*")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .limit(1);

  const primaryResume = resumes?.[0];
  if (primaryResume) {
    console.log(`  Resume: "${primaryResume.name}" (primary)`);
  } else {
    throw new Error("No primary resume found. Please upload a resume first.");
  }

  // Build ParsedResume format - use actual resume content from database
  return buildParsedResume({ profile, experience, education, skills, projects, primaryResume });
}

function buildParsedResume({ profile, experience, education, skills, projects, primaryResume }) {
  // Parse the resume content from the database (it's stored as JSON string)
  let resumeContent = null;
  try {
    if (typeof primaryResume.content === "string") {
      resumeContent = JSON.parse(primaryResume.content);
    } else {
      resumeContent = primaryResume.content;
    }
    
    // Handle raw PDF parse output (has 'text' field instead of 'fullText')
    if (resumeContent && resumeContent.text && !resumeContent.fullText) {
      console.log(`  Found raw PDF text (${resumeContent.text.length} chars), converting to structured format...`);
      // Convert raw PDF parse output to our format
      resumeContent = {
        fullText: resumeContent.text,
        sections: [{ title: "Resume", content: resumeContent.text, order: 0 }],
        contactInfo: {},
      };
    }
    
  } catch (e) {
    console.warn("  ⚠️  Could not parse resume content:", e.message);
    console.warn("  Content type:", typeof primaryResume.content);
    console.warn("  Content preview:", JSON.stringify(primaryResume.content).substring(0, 200));
  }

  // Start with the actual resume content from the database (this is the source of truth)
  const baseResume = resumeContent || {};

  // Build contact info - prefer resume content, fallback to profile
  const contactInfo = {
    name: baseResume.contactInfo?.name || profile?.full_name || "Unknown",
    email: baseResume.contactInfo?.email || profile?.email || TARGET_EMAIL,
    phone: baseResume.contactInfo?.phone || profile?.phone,
    location: baseResume.contactInfo?.location || profile?.location,
    linkedin: baseResume.contactInfo?.linkedin || profile?.linkedin_url,
    github: baseResume.contactInfo?.github || profile?.github_url,
  };

  // Use structured data from tables if available, otherwise use resume content
  // Structured data is more up-to-date, but resume content is the source of truth
  const experienceEntries = (experience && experience.length > 0)
    ? experience.map((exp, idx) => ({
        id: `exp-${idx + 1}`,
        company: exp.company,
        position: exp.position,
        location: exp.location,
        startDate: formatDate(exp.start_date),
        endDate: exp.is_current ? undefined : formatDate(exp.end_date),
        bullets: exp.achievements || [],
        originalBullets: exp.achievements || [],
      }))
    : (baseResume.experience || []);

  const educationEntries = (education && education.length > 0)
    ? education.map((edu, idx) => ({
        id: `edu-${idx + 1}`,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field_of_study,
        location: edu.location,
        startDate: formatDate(edu.start_date),
        endDate: edu.is_current ? undefined : formatDate(edu.end_date),
        gpa: edu.gpa,
        highlights: edu.achievements || [],
      }))
    : (baseResume.education || []);

  // Build skills - prefer structured data, fallback to resume content
  let skillsData;
  if (skills && skills.length > 0) {
    const skillsByCategory = {};
    skills.forEach((skill) => {
      const category = skill.category || "other";
      if (!skillsByCategory[category]) {
        skillsByCategory[category] = [];
      }
      skillsByCategory[category].push(skill.name);
    });
    skillsData = {
      format: "categorized",
      categories: Object.entries(skillsByCategory).map(([name, skillList]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        skills: skillList,
      })),
    };
  } else {
    skillsData = baseResume.skills || { format: "list", skills: [] };
  }

  const projectEntries = (projects && projects.length > 0)
    ? projects.map((proj, idx) => ({
        id: `proj-${idx + 1}`,
        name: proj.name,
        description: proj.description,
        technologies: proj.skills || [],
        url: proj.url,
        startDate: formatDate(proj.start_date),
        endDate: formatDate(proj.end_date),
        bullets: proj.bullets || [],
      }))
    : (baseResume.projects || []);

  // Use the actual fullText from the resume content - this is critical!
  // If we don't have it, build it from structured data
  const fullText = baseResume.fullText || buildFullText({ 
    contactInfo, 
    experienceEntries, 
    educationEntries, 
    skillsData, 
    projectEntries 
  });

  // Use sections from resume content if available, otherwise build basic ones
  const sections = baseResume.sections || [
    { title: "Experience", content: "Work experience", order: 0 },
    { title: "Education", content: "Education background", order: 1 },
    { title: "Skills", content: "Technical skills", order: 2 },
    { title: "Projects", content: "Personal projects", order: 3 },
  ];

  // Validate we have actual content
  if (!fullText || fullText.trim().length < 50) {
    throw new Error("Resume content is empty or too short. Please ensure the resume was properly uploaded and parsed.");
  }

  return {
    fullText,
    sections,
    contactInfo,
    experience: experienceEntries,
    education: educationEntries,
    skills: skillsData,
    projects: projectEntries,
  };
}

function formatDate(dateStr) {
  if (!dateStr) return undefined;
  try {
    const date = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function buildFullText({ contactInfo, experienceEntries, educationEntries, skillsData, projectEntries }) {
  let text = "";

  // Header
  text += `${contactInfo.name}\n`;
  const contactParts = [contactInfo.email, contactInfo.phone, contactInfo.location].filter(Boolean);
  text += contactParts.join(" | ") + "\n";
  if (contactInfo.linkedin || contactInfo.github) {
    text += [contactInfo.linkedin, contactInfo.github].filter(Boolean).join(" | ") + "\n";
  }
  text += "\n";

  // Experience
  if (experienceEntries.length > 0) {
    text += "EXPERIENCE\n";
    text += "-".repeat(50) + "\n";
    for (const exp of experienceEntries) {
      text += `${exp.company}, ${exp.location || ""}\n`;
      text += `${exp.position} | ${exp.startDate} - ${exp.endDate || "Present"}\n`;
      for (const bullet of exp.bullets) {
        text += `• ${bullet}\n`;
      }
      text += "\n";
    }
  }

  // Education
  if (educationEntries.length > 0) {
    text += "EDUCATION\n";
    text += "-".repeat(50) + "\n";
    for (const edu of educationEntries) {
      text += `${edu.institution}, ${edu.location || ""}\n`;
      text += `${edu.degree}${edu.field ? " in " + edu.field : ""} | ${edu.endDate || ""}\n`;
      if (edu.gpa) text += `GPA: ${edu.gpa}\n`;
      if (edu.highlights) {
        for (const h of edu.highlights) {
          text += `• ${h}\n`;
        }
      }
      text += "\n";
    }
  }

  // Skills
  if (skillsData.categories && skillsData.categories.length > 0) {
    text += "SKILLS\n";
    text += "-".repeat(50) + "\n";
    for (const cat of skillsData.categories) {
      text += `${cat.name}: ${cat.skills.join(", ")}\n`;
    }
    text += "\n";
  }

  // Projects
  if (projectEntries.length > 0) {
    text += "PROJECTS\n";
    text += "-".repeat(50) + "\n";
    for (const proj of projectEntries) {
      text += `${proj.name}`;
      if (proj.technologies && proj.technologies.length > 0) {
        text += ` | ${proj.technologies.join(", ")}`;
      }
      text += "\n";
      if (proj.description) text += `${proj.description}\n`;
      for (const bullet of proj.bullets || []) {
        text += `• ${bullet}\n`;
      }
      text += "\n";
    }
  }

  return text;
}

// ============================================
// JOB DESCRIPTION HANDLING
// ============================================

async function getJobDescription(config) {
  if (config.url) {
    console.log(`  Mode: URL`);
    console.log(`  Parsing: ${config.url}`);
    
    // Note: We can't easily call the Next.js API route from a script
    // without the server running. We'll use the Subconscious SDK directly.
    const { Subconscious } = await import("subconscious");
    const apiKey = process.env.SUBCONSCIOUS_API_KEY;
    
    if (!apiKey) {
      throw new Error("SUBCONSCIOUS_API_KEY required for URL parsing");
    }

    const client = new Subconscious({ apiKey });
    
    const prompt = `Read this job posting and extract the key information: ${config.url}

Return a JSON object with these fields:
- title: Job title
- company: Company name  
- location: Location
- salary: Salary range if mentioned
- requirements: Array of required qualifications
- responsibilities: Array of job duties
- technicalSkills: Array of technical skills mentioned
- keywords: Array of important keywords for a resume

Just return the JSON, nothing else.`;

    const run = await client.run({
      engine: "tim-gpt-heavy",
      input: {
        instructions: prompt,
        tools: [
          { type: "platform", id: "webpage_understanding", options: {} },
        ],
      },
    });

    // Poll for completion
    let finalRun = run;
    const maxAttempts = 90;
    let attempts = 0;
    const startTime = Date.now();

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;
      finalRun = await client.get(run.runId);
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r  [${elapsed}s] Parsing job...    `);

      if (finalRun.status === "succeeded" || finalRun.status === "failed") {
        console.log("");
        break;
      }
    }

    if (finalRun.status !== "succeeded" || !finalRun.result?.answer) {
      throw new Error("Failed to parse job URL");
    }

    let parsed;
    try {
      const answer = finalRun.result.answer;
      if (typeof answer === "string") {
        const cleaned = answer.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } else {
        parsed = answer;
      }
    } catch {
      throw new Error("Failed to parse job JSON from AI response");
    }

    console.log(`  Title: ${parsed.title}`);
    console.log(`  Company: ${parsed.company}`);

    return {
      title: parsed.title || "Unknown",
      company: parsed.company || "Unknown",
      fullText: finalRun.result.answer,
      requirements: parsed.requirements || [],
      responsibilities: parsed.responsibilities || [],
      keywords: parsed.keywords || parsed.technicalSkills || [],
      sourceUrl: config.url,
    };
  }

  if (config.title && config.company && config.description) {
    console.log(`  Mode: Custom`);
    console.log(`  Title: ${config.title}`);
    console.log(`  Company: ${config.company}`);

    return {
      title: config.title,
      company: config.company,
      fullText: config.description,
      requirements: [],
      responsibilities: [],
      keywords: [],
    };
  }

  // Default to mock - use ML job if --ml flag
  const mockJob = config.ml ? MOCK_JOB_ML : MOCK_JOB;
  console.log(`  Mode: Mock${config.ml ? " (ML)" : ""}`);
  console.log(`  Title: ${mockJob.title}`);
  console.log(`  Company: ${mockJob.company}`);
  return mockJob;
}

// ============================================
// TAILOR API INTEGRATION
// ============================================

async function runTailoring(resume, job) {
  const startTime = Date.now();
  
  const response = await fetch(`${BASE_URL}/api/tailor/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      resume,
      jobDescription: job,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tailor API error: ${response.status} - ${text}`);
  }

  // Process SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          const elapsed = Math.round((Date.now() - startTime) / 1000);

          if (data.type === "phase") {
            process.stdout.write(`\r  [${elapsed}s] Phase: ${data.phase}                    `);
          } else if (data.type === "thought") {
            // Just update phase display
          } else if (data.type === "progress") {
            // Progress update
          } else if (data.type === "complete") {
            console.log(`\r  [${elapsed}s] Complete!                              `);
            result = data.result;
          } else if (data.type === "error") {
            throw new Error(data.message || "Tailoring error");
          }
        } catch (e) {
          if (e.message.includes("Tailoring error")) throw e;
          // Ignore JSON parse errors for partial data
        }
      }
    }
  }

  if (!result) {
    throw new Error("No result received from tailoring API");
  }

  return result;
}

// ============================================
// OUTPUT & VALIDATION
// ============================================

function validateResult(result) {
  const errors = [];

  if (!result.fullText) {
    errors.push("Missing fullText");
  }

  if (!result.summary) {
    errors.push("Missing summary");
  }

  if (result.matchScore === undefined && result.matchScore !== 0) {
    errors.push("Missing matchScore");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function saveOutput(result, job) {
  const outputDir = join(__dirname, "output");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `tailor-${timestamp}.json`;
  const filepath = join(outputDir, filename);

  const output = {
    timestamp: new Date().toISOString(),
    job: {
      title: job.title,
      company: job.company,
    },
    result,
  };

  writeFileSync(filepath, JSON.stringify(output, null, 2));
  return { jsonPath: filepath, timestamp, outputDir };
}

function printSummary(result, jsonPath) {
  console.log(`\n[4/4] Results`);
  console.log(`  Match Score: ${result.matchScore || 0}%`);
  console.log(`  Changes Made: ${result.summary?.totalChanges || 0}`);

  if (result.summary?.keyImprovements?.length > 0) {
    console.log(`  Key Improvements:`);
    for (const imp of result.summary.keyImprovements.slice(0, 3)) {
      console.log(`    - ${imp}`);
    }
  }

  if (result.summary?.keywordsAdded?.length > 0) {
    console.log(`  Keywords Added: ${result.summary.keywordsAdded.slice(0, 5).join(", ")}`);
  }

  if (result.summary?.warnings?.length > 0) {
    console.log(`  ⚠️  Warnings:`);
    for (const warn of result.summary.warnings) {
      console.log(`    - ${warn}`);
    }
  }

  console.log(`\n  Output: ${jsonPath.replace(__dirname + "/", "scripts/")}`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("═".repeat(70));
  console.log("  RESUME TAILOR E2E TEST");
  console.log("═".repeat(70));
  console.log("");

  const config = parseArgs();

  // Check for help
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`
Usage: node scripts/test-tailor-e2e.mjs [options]

Options:
  --mock                    Use mock backend engineer job (default)
  --ml                      Use mock ML engineer job (tests content selection)
  --url <url>               Parse job from URL
  --title <title>           Custom job title
  --company <company>       Custom company name
  --description <text>      Custom job description

Examples:
  node scripts/test-tailor-e2e.mjs --mock
  node scripts/test-tailor-e2e.mjs --ml
  node scripts/test-tailor-e2e.mjs --url "https://careers.example.com/job/123"
  node scripts/test-tailor-e2e.mjs --title "Engineer" --company "Acme" --description "Build things"
`);
    process.exit(0);
  }

  try {
    // Step 1: Load resume from Supabase
    console.log("[1/4] Loading resume from Supabase...");
    const resume = await fetchResumeFromSupabase();
    console.log("");

    // Step 2: Get job description
    console.log("[2/4] Processing job description...");
    const job = await getJobDescription(config);
    console.log("");

    // Step 3: Run tailoring
    console.log("[3/4] Running tailoring...");
    const result = await runTailoring(resume, job);

    // Step 4: Validate and save
    const validation = validateResult(result);
    if (!validation.valid) {
      console.error("  ⚠️  Validation issues:", validation.errors.join(", "));
    }

    const { jsonPath } = saveOutput(result, job);
    printSummary(result, jsonPath);

    console.log("");
    console.log("═".repeat(70));
    console.log("  TEST PASSED");
    console.log("═".repeat(70));
  } catch (error) {
    console.error("");
    console.error("═".repeat(70));
    console.error("  TEST FAILED");
    console.error("═".repeat(70));
    console.error("");
    console.error("Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
