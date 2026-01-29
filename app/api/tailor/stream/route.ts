import { NextRequest } from "next/server";
import { getSubconsciousClient, DEFAULT_ENGINE } from "@/lib/subconscious";
import { createClient } from "@supabase/supabase-js";
import { createLogger, logError } from "@/lib/logger";
import { streamingRateLimiter, applyRateLimit } from "@/lib/rate-limit";
import type { 
  ExperienceEntry, 
  EducationEntry, 
  ProjectEntry, 
  SkillsData, 
  ContactInfo,
} from "@/app/tailor/components/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 480; // 8 minutes timeout

// Production-safe logging
const log = createLogger("api/tailor/stream");

// Mock mode for testing without API calls
// Use NEXT_PUBLIC_USE_MOCK for consistency with frontend
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ============================================
// TYPES
// ============================================

interface TailorRequest {
  jobDescription: {
    title: string;
    company: string;
    fullText: string;
    requirements?: string[];
    responsibilities?: string[];
    keywords?: string[];
    sourceUrl?: string;
  };
  useProfileData?: boolean;
}

interface ProfileData {
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  skills: SkillsData;
  contactInfo: ContactInfo;
  professionalSummary?: string;
}

// ============================================
// HELPER: Get user from auth header
// ============================================

interface AuthResult {
  user: { id: string; email?: string } | null;
  accessToken: string | null;
}

async function getUserFromRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie");
  
  log("=== getUserFromRequest ===");
  log("Auth header:", authHeader ? `${authHeader.substring(0, 30)}...` : "NOT PRESENT");
  log("Cookie header:", cookieHeader ? `${cookieHeader.substring(0, 50)}...` : "NOT PRESENT");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  log("Supabase URL:", supabaseUrl ? "SET" : "NOT SET");
  log("Supabase Anon Key:", supabaseAnonKey ? "SET" : "NOT SET");
  log("Supabase Service Role Key:", supabaseServiceKey ? "SET" : "NOT SET");
  
  if (!supabaseUrl || !supabaseAnonKey) {
    log("ERROR: Supabase not configured");
    return { user: null, accessToken: null };
  }

  // If we have a Bearer token, use the service role key to verify it
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    log("Using Bearer token for auth, token length:", token.length);
    
    // Use service role key if available for proper token verification
    const keyToUse = supabaseServiceKey || supabaseAnonKey;
    log("Using key type:", supabaseServiceKey ? "SERVICE_ROLE" : "ANON");
    
    // Create client with the token in global headers for auth
    const supabase = createClient(supabaseUrl, keyToUse, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    
    // Get user - this should work with the token in headers
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      log("ERROR getting user from token:", error.message);
      
      // Try alternative: decode JWT and extract user ID, then verify via admin
      if (supabaseServiceKey) {
        try {
          // Decode JWT payload (middle part, base64url encoded)
          const parts = token.split(".");
          if (parts.length === 3) {
            const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
            log("JWT payload sub (user id):", payload.sub);
            
            if (payload.sub) {
              // Use admin client to get user by ID
              const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
              const { data: userData, error: adminError } = await adminSupabase
                .from("user_profiles")
                .select("*")
                .eq("id", payload.sub)
                .single();
              
              if (!adminError && userData) {
                log("SUCCESS: User verified via admin lookup:", payload.sub);
                // Return a user-like object with the essential fields
                return {
                  user: {
                    id: payload.sub,
                    email: payload.email || userData.email,
                  },
                  accessToken: token,
                };
              } else {
                log("Admin lookup failed:", adminError?.message);
              }
            }
          }
        } catch (decodeError) {
          log("JWT decode error:", decodeError);
        }
      }
      
      return { user: null, accessToken: null };
    }
    
    log("SUCCESS: User found from token:", user?.id, user?.email);
    return { user, accessToken: token };
  }

  // Fallback: Try to extract token from Supabase cookies
  if (cookieHeader) {
    log("Attempting to extract token from cookies...");
    
    // Supabase stores auth in sb-<project-ref>-auth-token cookie
    const cookies = cookieHeader.split(";").map(c => c.trim());
    const authCookie = cookies.find(c => c.includes("-auth-token="));
    
    if (authCookie) {
      log("Found auth cookie");
      try {
        // The cookie value is URL-encoded JSON with access_token and refresh_token
        const cookieValue = authCookie.split("=").slice(1).join("=");
        const decoded = decodeURIComponent(cookieValue);
        // Handle both base64 and direct JSON formats
        let tokenData;
        try {
          tokenData = JSON.parse(decoded);
        } catch {
          // Try base64 decode
          const base64Decoded = Buffer.from(decoded, "base64").toString("utf-8");
          tokenData = JSON.parse(base64Decoded);
        }
        
        if (tokenData?.access_token) {
          log("Extracted access_token from cookie, length:", tokenData.access_token.length);
          const supabase = createClient(supabaseUrl, supabaseAnonKey);
          const { data: { user }, error } = await supabase.auth.getUser(tokenData.access_token);
          
          if (error) {
            log("ERROR getting user from cookie token:", error.message);
          } else if (user) {
            log("SUCCESS: User found from cookie token:", user?.id, user?.email);
            return { user, accessToken: tokenData.access_token };
          }
        }
      } catch (parseError) {
        log("ERROR parsing auth cookie:", parseError);
      }
    } else {
      log("No auth cookie found in cookies");
    }
  }

  log("FAILED: Could not authenticate user");
  return { user: null, accessToken: null };
}

// ============================================
// HELPER: Fetch user's profile data
// ============================================

async function fetchProfileData(userId: string, accessToken?: string): Promise<ProfileData | null> {
  log("Fetching profile data for user:", userId);
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    log("ERROR: Supabase not configured");
    return null;
  }

  // Use service role key if available (bypasses RLS), otherwise use anon key with user's token
  let supabase;
  if (supabaseServiceKey) {
    log("Using service role key for profile fetch (bypasses RLS)");
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  } else if (accessToken) {
    log("Using anon key with user's access token for profile fetch");
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  } else {
    log("WARNING: No service role key or access token, RLS may block queries");
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  try {
    // Fetch all profile data in parallel, including user_profiles for contact info
    const [profileResult, expResult, eduResult, projResult, skillsResult] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", userId).single(),
      supabase.from("work_experience").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
      supabase.from("education").select("*").eq("user_id", userId).order("end_date", { ascending: false }),
      supabase.from("user_projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("skills").select("*").eq("user_id", userId),
    ]);

    // Log ALL results including errors
    log("=== Database Query Results ===");
    log("Profile result:", { 
      data: profileResult.data ? "EXISTS" : "NULL", 
      error: profileResult.error?.message || "none",
      code: profileResult.error?.code || "none"
    });
    log("Experience result:", { 
      count: expResult.data?.length || 0, 
      error: expResult.error?.message || "none" 
    });
    log("Education result:", { 
      count: eduResult.data?.length || 0, 
      error: eduResult.error?.message || "none" 
    });
    log("Projects result:", { 
      count: projResult.data?.length || 0, 
      error: projResult.error?.message || "none" 
    });
    log("Skills result:", { 
      count: skillsResult.data?.length || 0, 
      error: skillsResult.error?.message || "none" 
    });
    
    log("Profile data counts:", {
      hasProfile: !!profileResult.data,
      experience: expResult.data?.length || 0,
      education: eduResult.data?.length || 0,
      projects: projResult.data?.length || 0,
      skills: skillsResult.data?.length || 0,
    });
    
    // Debug: log first project if any
    if (projResult.data && projResult.data.length > 0) {
      log("First project:", projResult.data[0].name);
    }

    // Transform to our types
    const experience: ExperienceEntry[] = (expResult.data || []).map((e, i) => ({
      id: `exp-${i}`,
      company: e.company || "",
      position: e.position || "",
      location: e.location || "",
      startDate: e.start_date || "",
      endDate: e.end_date || undefined,
      bullets: e.description ? e.description.split("\n").filter((b: string) => b.trim()) : [],
    }));

    const education: EducationEntry[] = (eduResult.data || []).map((e, i) => ({
      id: `edu-${i}`,
      institution: e.institution || "",
      degree: e.degree || "",
      field: e.field_of_study || "",
      location: e.location || "",
      endDate: e.end_date || "",
      gpa: e.gpa || undefined,
      highlights: e.highlights ? (Array.isArray(e.highlights) ? e.highlights : [e.highlights]) : [],
    }));

    const projects: ProjectEntry[] = (projResult.data || []).map((p, i) => ({
      id: `proj-${i}`,
      name: p.name || "",
      description: p.description || "",
      technologies: p.skills || [], // user_projects uses 'skills' column for technologies
      url: p.url || undefined,
      // Use bullets array from DB, fallback to splitting description if empty
      bullets: (p.bullets && p.bullets.length > 0) 
        ? p.bullets 
        : (p.description ? p.description.split("\n").filter((b: string) => b.trim()) : []),
    }));

    // Group skills by category
    const skillsByCategory: Record<string, string[]> = {};
    (skillsResult.data || []).forEach((s) => {
      const category = s.category || "Other";
      if (!skillsByCategory[category]) {
        skillsByCategory[category] = [];
      }
      skillsByCategory[category].push(s.name);
    });

    const skills: SkillsData = {
      format: "categorized",
      categories: Object.entries(skillsByCategory).map(([name, skills]) => ({ name, skills })),
    };

    // Build contact info from user profile
    const userProfile = profileResult.data;
    const contactInfo: ContactInfo = {
      name: userProfile?.full_name || "",
      email: userProfile?.email || "",
      phone: userProfile?.phone || undefined,
      location: userProfile?.location || undefined,
      linkedin: userProfile?.linkedin_url || undefined,
      github: userProfile?.github_url || undefined,
      website: userProfile?.website_url || undefined,
    };
    
    // Also capture professional summary for use in resume generation
    const professionalSummary = userProfile?.professional_summary || undefined;

    return { experience, education, projects, skills, contactInfo, professionalSummary };
  } catch (error) {
    log("ERROR fetching profile data:", error);
    return null;
  }
}

// ============================================
// HELPER: Generate tailored resume
// ============================================

// JSON Schema for tailored resume structured output - FLATTENED for reliability
const TAILORED_RESUME_FORMAT = {
  type: "object" as const,
  title: "TailoredResume",
  properties: {
    // Flattened contact info
    name: { type: "string" as const, description: "Full name" },
    email: { type: "string" as const, description: "Email address" },
    phone: { type: "string" as const, description: "Phone number" },
    location: { type: "string" as const, description: "Location" },
    linkedin: { type: "string" as const, description: "LinkedIn URL" },
    github: { type: "string" as const, description: "GitHub URL" },
    website: { type: "string" as const, description: "Personal website" },
    
    // Core resume content
    professionalSummary: { type: "string" as const, description: "2-3 sentence professional summary tailored to the job" },
    
    // Experience as JSON string (we'll parse it later)
    experienceJson: { type: "string" as const, description: "JSON array of experience objects with company, position, location, startDate, endDate, bullets" },
    
    // Education as JSON string
    educationJson: { type: "string" as const, description: "JSON array of education objects with institution, degree, field, location, endDate, gpa, highlights" },
    
    // Projects as JSON string
    projectsJson: { type: "string" as const, description: "JSON array of project objects with name, description, technologies, bullets" },
    
    // Skills as simple arrays
    technicalSkills: { type: "array" as const, items: { type: "string" as const }, description: "Technical skills" },
    frameworksAndTools: { type: "array" as const, items: { type: "string" as const }, description: "Frameworks and tools" },
    
    // Summary info
    keyImprovements: { type: "array" as const, items: { type: "string" as const }, description: "Key improvements made to the resume" },
    keywordsAdded: { type: "array" as const, items: { type: "string" as const }, description: "Keywords from job posting incorporated" },
    matchScore: { type: "integer" as const, description: "ATS match score from 0-100" },
  },
  required: ["name", "email", "professionalSummary", "experienceJson", "matchScore"],
  additionalProperties: false,
};

async function generateTailoredResume(
  profileData: ProfileData,
  jobDescription: TailorRequest["jobDescription"],
  sendEvent: (data: object) => void
) {
  log("=== Generating tailored resume ===");
  
  const client = getSubconsciousClient();
  
  const prompt = `Tailor this resume for ATS optimization. Reorder and rephrase to match job keywords.

## RULES
- NEVER fabricate info. Only use candidate's data below.
- Use STAR format: Action verb + what you did + quantified result
- Example: "Architected microservices handling 10K req/sec, reducing latency 40%"
- Action verbs: Built, Led, Optimized, Delivered, Scaled, Launched, Designed, Implemented
- Quantify: users, %, time saved, scale
- Experience: 3-4 bullets each | Projects: 2-3 bullets each
- Match keywords from the job posting in your bullets

## JOB POSTING
${jobDescription.title} at ${jobDescription.company}
${jobDescription.fullText}
${jobDescription.keywords?.length ? `Keywords: ${jobDescription.keywords.join(", ")}` : ""}

## CANDIDATE DATA
Contact: ${JSON.stringify(profileData.contactInfo)}
${profileData.professionalSummary ? `Current Summary: ${profileData.professionalSummary}` : ""}
Experience: ${JSON.stringify(profileData.experience)}
Education: ${JSON.stringify(profileData.education)}
Projects: ${JSON.stringify(profileData.projects)}
Skills: ${JSON.stringify(profileData.skills)}`;

  log("Resume generation prompt length:", prompt.length);
  
  sendEvent({
    type: "phase",
    phase: "tailoring",
    progress: 30,
  });
  sendEvent({
    type: "thought",
    thought: `Tailoring your resume for ${jobDescription.company}...`,
    phase: "tailoring",
    progress: 35,
  });

  const run = await client.run({
    engine: DEFAULT_ENGINE,
    input: {
      instructions: prompt,
      tools: [
        { type: "platform" as const, id: "parallel_extract", options: {} },
      ],
      answerFormat: TAILORED_RESUME_FORMAT,
    },
    options: {
      awaitCompletion: true,
    },
  });

  log("Resume generation completed");
  log("Run ID:", run.runId);
  log("Status:", run.status);
  log("Full response:", JSON.stringify(run, null, 2));

  if (run.status !== "succeeded" || !run.result?.answer) {
    log("ERROR: Resume generation failed");
    log("Run result:", JSON.stringify(run.result, null, 2));
    throw new Error("Failed to generate resume");
  }

  // With answerFormat, the answer is already a parsed object
  const flatResult = run.result.answer as unknown as Record<string, unknown>;
  log("Flat resume result:", JSON.stringify(flatResult, null, 2).substring(0, 1000));

  // Transform flattened format back to structured format for frontend
  const safeParseJson = (jsonStr: unknown, fallback: unknown[] = []) => {
    if (!jsonStr || typeof jsonStr !== 'string') return fallback;
    try {
      return JSON.parse(jsonStr);
    } catch {
      log("Failed to parse JSON:", jsonStr);
      return fallback;
    }
  };

  const result = {
    fullText: `${flatResult.name || ''}\n${flatResult.email || ''}\n\n${flatResult.professionalSummary || ''}`,
    contactInfo: {
      name: flatResult.name as string || '',
      email: flatResult.email as string || '',
      phone: flatResult.phone as string || undefined,
      location: flatResult.location as string || undefined,
      linkedin: flatResult.linkedin as string || undefined,
      github: flatResult.github as string || undefined,
      website: flatResult.website as string || undefined,
    },
    professionalSummary: flatResult.professionalSummary as string || '',
    experience: safeParseJson(flatResult.experienceJson, []),
    education: safeParseJson(flatResult.educationJson, []),
    projects: safeParseJson(flatResult.projectsJson, []),
    skills: {
      format: 'categorized' as const,
      categories: [
        { name: 'Technical Skills', skills: (flatResult.technicalSkills as string[]) || [] },
        { name: 'Frameworks & Tools', skills: (flatResult.frameworksAndTools as string[]) || [] },
      ],
    },
    summary: {
      totalChanges: ((flatResult.keyImprovements as string[]) || []).length,
      keyImprovements: (flatResult.keyImprovements as string[]) || [],
      keywordsAdded: (flatResult.keywordsAdded as string[]) || [],
      warnings: [],
    },
    matchScore: flatResult.matchScore as number || 0,
  };

  log("Transformed resume result:", JSON.stringify(result, null, 2).substring(0, 1000));
  return result;
}

// ============================================
// MOCK DATA
// ============================================

const MOCK_RESULT = {
  fullText: `Owen H. Stepan
stepan.o@northeastern.edu | (312) 982-9808 | Chicago, IL

Technical Program Manager Intern candidate with strong background in AI/ML, software engineering, and Agile project leadership. Proven track record of coordinating cross-functional teams, delivering quantifiable results through efficient project management, and communicating complex program status to diverse stakeholders.`,

  contactInfo: {
    name: "Owen H. Stepan",
    email: "stepan.o@northeastern.edu",
    phone: "(312) 982-9808",
    location: "Chicago, IL",
  },

  professionalSummary: "Technical Program Manager Intern candidate with strong background in AI/ML, software engineering, and Agile project leadership. Proven track record of coordinating cross-functional teams, delivering quantifiable results through efficient project management, and communicating complex program status to diverse stakeholders. Expertise with Git, CI/CD, and modern frameworks, pursuing a B.S. in Computer Science at Northeastern University (GPA: 3.84). ATS-optimized for NVIDIA Deep Learning Software internships.",

  experience: [
    {
      id: "exp-1",
      company: "Feed Tech LLC",
      position: "CEO & Full-Stack Developer",
      location: "Chicago, IL",
      startDate: "2022-12-01",
      bullets: [
        "Led full-stack development and delivery of B2B SaaS solutions, managing project schedules, Git-based version control, and cross-functional collaboration with clients, driving 2X customer growth.",
        "Implemented Agile project management for software releases, streamlining the software development life cycle, and boosting on-time delivery to 100%.",
        "Coordinated distributed engineering teams through regular status meetings, improving project visibility and stakeholder communication.",
        "Established automated testing and deployment pipelines to elevate quality assurance and shorten release cycles by 40%.",
      ],
    },
    {
      id: "exp-2",
      company: "Ahold Delhaize",
      position: "Mobile Application Engineer Co-op",
      location: "Quincy, MA",
      startDate: "2025-01-01",
      endDate: "2025-06-01",
      bullets: [
        "Executed full mobile app development lifecycle, leveraging Agile methodologies to deliver new features supporting 1M+ active users.",
        "Collaborated across teams and communicated release schedules, ensuring on-time, high-quality production deployments.",
        "Utilized Git and CI/CD pipelines for efficient code integration and automated QA, reducing manual testing time by 35%.",
        "Reported project milestones to engineering leadership, driving transparency and alignment across team functions.",
      ],
    },
    {
      id: "exp-3",
      company: "Code4Community",
      position: "Developer",
      location: "Boston, MA",
      startDate: "2024-09-01",
      bullets: [
        "Built and deployed features for nonprofit platforms using Agile methodologies, collaborating cross-functionally with designers and client partners.",
        "Led sprint planning, backlog grooming, and code reviews to ensure high-quality, timely releases, improving delivery predictability by 30%.",
        "Integrated CI/CD pipelines and Git for streamlined development workflows and automated testing, reducing manual QA overhead by 25%.",
        "Communicated project progress and technical challenges in cross-team syncs, enabling on-time feature launches and stakeholder alignment.",
      ],
    },
    {
      id: "exp-4",
      company: "Francis W. Parker School",
      position: "2nd Grade Math Tutoring App Developer",
      location: "Chicago, IL",
      startDate: "2022-09-01",
      endDate: "2023-06-01",
      bullets: [
        "Designed and developed a tutoring application from concept through deployment, collaborating with curriculum developers and teachers to define product requirements.",
        "Implemented software development life cycle and QA practices, reducing post-launch issues and increasing student engagement by 50%.",
        "Coordinated beta testing with students and faculty, gathering user feedback to iterate and enhance user experience.",
        "Delivered status updates and technical documentation to non-technical stakeholders, facilitating seamless project adoption.",
      ],
    },
  ],

  education: [
    {
      id: "edu-1",
      institution: "Northeastern University",
      degree: "Bachelor of Science",
      field: "Computer Science",
      location: "Boston, MA",
      endDate: "2027-05-01",
      gpa: "3.84",
      highlights: [],
    },
  ],

  skills: {
    format: "categorized" as const,
    categories: [
      {
        name: "Languages",
        skills: ["Python", "JavaScript", "TypeScript", "Java", "Kotlin", "C", "C++", "C#", "HTML", "CSS"],
      },
      {
        name: "Frameworks & Tools",
        skills: ["React.js", "React Native", "Tailwind", "Next.js", "Nest.js", "Express.js", "MongoDB", "PostgreSQL", "Vercel", "Git", "CI/CD", "Jira (familiar)", "Jupyter Notebooks"],
      },
    ],
  },

  projects: [
    {
      id: "proj-1",
      name: "JARVIS AI Companion",
      description: "AI-powered personal assistant integrating OpenAI Whisper for real-time voice recognition, ElevenLabs for speech synthesis, and MongoDB for dynamic scheduling.",
      technologies: ["OpenAI Whisper", "ElevenLabs", "MongoDB"],
      bullets: [
        "Built an AI-powered personal assistant using OpenAI Whisper, ElevenLabs, and MongoDB, enabling natural language interaction and automated scheduling for 3+ users.",
        "Designed and implemented a self-learning user profiling system, increasing task automation accuracy by 50% and enhancing daily productivity.",
        "Delivered voice recognition and scheduling features through Agile sprints, collaborating with stakeholders to align on requirements and optimize user experience.",
      ],
    },
    {
      id: "proj-2",
      name: "DiPasquale's Sandwiches Website",
      description: "Full-stack online ordering platform for a student-run sandwich business using Next.js, MongoDB, Express, and Stripe.",
      technologies: ["Next.js", "MongoDB", "Express", "Stripe"],
      bullets: [
        "Engineered a Next.js/MongoDB-based ordering platform, automating workflows and facilitating $6,000+ in sales for a student-run business.",
        "Built a real-time administrative dashboard, allowing non-technical users to independently manage menu, pricing, and store operations.",
        "Coordinated full project lifecycle, aligning development with client requirements and achieving a 100% on-time delivery rate.",
      ],
    },
    {
      id: "proj-3",
      name: "Sports Arbitrage Algorithm",
      description: "Multi-threaded Python algorithm to identify arbitrage opportunities across sportsbooks by analyzing real-time betting odds.",
      technologies: ["Python", "Odds API"],
      bullets: [
        "Developed a multi-threaded Python algorithm to identify arbitrage opportunities by analyzing real-time betting odds across hundreds of sportsbooks, generating $1,500 in profit in two months.",
        "Implemented automated reporting tools to surface profitable bet combinations, increasing decision accuracy and time-to-act for users.",
        "Applied version control with Git to manage rapid prototyping and deployment, reducing debugging cycles by 30%.",
      ],
    },
  ],

  sections: [],

  summary: {
    totalChanges: 6,
    keyImprovements: [
      "Reordered experience and projects for strongest ATS match",
      "Rewrote all bullets to match NVIDIA keyword list",
      "Embedded measurable results in every accomplishment",
      "Reinforced AI/ML/deep learning terminology where supported by candidate data",
      "Clarified cross-functional collaboration and project management impact throughout",
      "Added Git/Agile/CI/CD/QC wherever candidate's evidence allowed",
    ],
    keywordsAdded: [
      "Technical Program Manager",
      "Deep Learning",
      "AI/ML",
      "Software Development Life Cycle",
      "Project Management",
      "Jira",
      "Git",
      "Agile",
      "Machine Learning",
      "Communication",
      "Cross-functional Coordination",
      "Continuous Integration",
      "Quality Assurance",
      "Jupyter",
      "Reporting Tools",
    ],
    warnings: [],
  },

  matchScore: 88,
};
// ============================================
// API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  log("=== POST /api/tailor/stream ===");
  
  // Rate limiting for expensive AI streaming operations
  const rateLimitResponse = applyRateLimit(request, streamingRateLimiter);
  if (rateLimitResponse) {
    log("Rate limit exceeded");
    return rateLimitResponse;
  }
  
  try {
    const body = (await request.json()) as TailorRequest;
    const { jobDescription, useProfileData } = body;

    log("Request body:");
    log("  jobDescription.title:", jobDescription?.title);
    log("  jobDescription.company:", jobDescription?.company);
    log("  useProfileData:", useProfileData);

    if (!jobDescription) {
      log("ERROR: Missing jobDescription");
      return new Response(
        JSON.stringify({ error: "Job description is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    
    // Mock mode
    if (USE_MOCK) {
      log("[MOCK MODE] Returning mock result");
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (data: object) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          await new Promise(r => setTimeout(r, 500));
          sendEvent({ type: "phase", phase: "analyzing-resume", progress: 10 });
          sendEvent({ type: "thought", thought: "Loading profile data...", phase: "analyzing-resume", progress: 15 });
          
          await new Promise(r => setTimeout(r, 500));
          sendEvent({ type: "phase", phase: "tailoring", progress: 30 });
          sendEvent({ type: "thought", thought: "Generating resume...", phase: "tailoring", progress: 50 });
          
          await new Promise(r => setTimeout(r, 500));
          sendEvent({ type: "complete", result: MOCK_RESULT });
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Real processing
    const stream = new ReadableStream({
      async start(controller) {
        let isControllerClosed = false;
        
        const sendEvent = (data: object) => {
          if (isControllerClosed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            isControllerClosed = true;
          }
        };

        const closeController = () => {
          if (isControllerClosed) return;
          isControllerClosed = true;
          try {
            controller.close();
          } catch {
            // Already closed
          }
        };

        try {
          // Step 1: Get user and profile data
          sendEvent({
            type: "phase",
            phase: "analyzing-resume",
            progress: 5,
          });
          sendEvent({
            type: "thought",
            thought: "Loading your profile data...",
            phase: "analyzing-resume",
            progress: 10,
          });

          const { user, accessToken } = await getUserFromRequest(request);
          if (!user) {
            sendEvent({ type: "error", message: "Not authenticated. Please log in." });
            closeController();
            return;
          }

          const profileData = await fetchProfileData(user.id, accessToken || undefined);
          if (!profileData || (profileData.experience.length === 0 && profileData.projects.length === 0)) {
            sendEvent({ type: "error", message: "No profile data found. Please add experience or projects to your profile." });
            closeController();
            return;
          }

          log("Profile data loaded:", {
            experience: profileData.experience.length,
            education: profileData.education.length,
            projects: profileData.projects.length,
            skillCategories: profileData.skills.categories?.length || 0,
          });

          sendEvent({
            type: "thought",
            thought: `Found ${profileData.experience.length} jobs, ${profileData.projects.length} projects, ${profileData.education.length} education entries`,
            phase: "analyzing-resume",
            progress: 20,
          });

          // Step 2: Generate tailored resume
          sendEvent({
            type: "phase",
            phase: "tailoring",
            progress: 30,
          });

          const result = await generateTailoredResume(
            profileData,
            jobDescription,
            sendEvent
          );

          // Step 4: Complete
          sendEvent({
            type: "phase",
            phase: "complete",
            progress: 100,
          });
          sendEvent({
            type: "thought",
            thought: "Resume tailoring complete!",
            phase: "complete",
            progress: 100,
          });
          sendEvent({
            type: "complete",
            result,
            originalResume: {
              fullText: "Generated from your profile",
              sections: [],
              contactInfo: profileData.contactInfo,
              professionalSummary: profileData.professionalSummary,
              experience: profileData.experience,
              education: profileData.education,
              skills: profileData.skills,
              projects: profileData.projects,
            },
          });

          closeController();
        } catch (error) {
          log("ERROR in stream:", error);
          sendEvent({
            type: "error",
            message: error instanceof Error ? error.message : "An error occurred",
          });
          closeController();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    log("ERROR:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start tailoring" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
