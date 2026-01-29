import { NextRequest, NextResponse } from "next/server";
import { getSubconsciousClient, DEFAULT_ENGINE } from "@/lib/subconscious";
import { createLogger, createVerboseLogger } from "@/lib/logger";
import { fetchRateLimiter, applyRateLimit } from "@/lib/rate-limit";
import { getUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Production-safe logging
const log = createLogger("api/job/fetch");
const verboseLog = createVerboseLogger("api/job/fetch");
const IS_DEV = process.env.NODE_ENV === "development";

// Type for reasoning nodes from Subconscious
interface ReasoningNode {
  title?: string;
  thought?: string;
  tooluse?: unknown[];
  subtask?: ReasoningNode[];
  conclusion?: string;
}

// Pretty print a reasoning tree recursively
function formatReasoningTree(node: ReasoningNode, indent = 0): string {
  const prefix = "  ".repeat(indent);
  const lines: string[] = [];
  
  if (node.title) {
    lines.push(`${prefix}📋 TITLE: ${node.title}`);
  }
  if (node.thought) {
    lines.push(`${prefix}💭 THOUGHT: ${node.thought}`);
  }
  if (node.tooluse && node.tooluse.length > 0) {
    lines.push(`${prefix}🔧 TOOL USE:`);
    node.tooluse.forEach((tool, i) => {
      lines.push(`${prefix}  [${i}] ${JSON.stringify(tool, null, 2).split('\n').join('\n' + prefix + '      ')}`);
    });
  }
  if (node.subtask && node.subtask.length > 0) {
    lines.push(`${prefix}📂 SUBTASKS (${node.subtask.length}):`);
    node.subtask.forEach((sub, i) => {
      lines.push(`${prefix}  --- Subtask ${i + 1} ---`);
      lines.push(formatReasoningTree(sub, indent + 2));
    });
  }
  if (node.conclusion) {
    lines.push(`${prefix}✅ CONCLUSION: ${node.conclusion}`);
  }
  
  return lines.join('\n');
}

// Mock mode for testing without API calls
// Use NEXT_PUBLIC_USE_MOCK for consistency with frontend
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const MOCK_JOB = {
  title: "Senior Fullstack Engineer, New Ventures",
  company: "Toast, Inc.",
  location: "Boston, Massachusetts, United States (Remote; hybrid encouraged)",
  employmentType: "Full-time",
  salaryRange: "$134,000–$214,000 USD (base)",
  description: "Join Toast's New Ventures business unit as a founding engineer to research, develop, and scale new products and business lines beyond the restaurant industry. You'll build new features from scratch within the Toast ecosystem, partnering with a Staff Engineer and New Ventures leads to launch an MVP and scale adoption.",
  responsibilities: [
    "Act as a strong independent contributor with an emphasis on backend development",
    "Partner with the Staff Engineer to deliver the product roadmap",
    "Contribute to architecture and backend implementation for new venture features",
    "Understand operator needs and help influence business strategy",
    "Collaborate with New Ventures leads to launch an MVP and scale adoption",
    "Work across diverse codebases to deliver high-quality code on time",
    "Demonstrate end-to-end ownership throughout the development lifecycle",
    "Leverage cutting-edge AI tools to improve development workflow and productivity",
  ],
  requirements: [
    "Demonstrated significant technical impact in previous roles",
    "Experience or strong interest in 0→1 product builds",
    "Hands-on experience with complex, large-scale distributed systems in production",
    "Strong knowledge of distributed systems, asynchronous messaging, event-driven architecture, APIs, and integration patterns",
    "Ability to write clean, maintainable, resilient code",
    "Strong communication and collaboration skills",
    "Proficiency in Kotlin (preferred) or Java",
    "Experience communicating technical designs within a team",
    "Solution-oriented mindset and ability to partner effectively with leadership and peers",
  ],
  niceToHaves: [
    "Direct experience with 0→1 builds",
    "Familiarity with using AI tools in software development workflows",
  ],
  technicalSkills: [
    "Kotlin",
    "Java",
    "Distributed systems",
    "Asynchronous messaging",
    "Event-driven architecture",
    "API development",
    "Integration patterns",
    "AI developer tools",
  ],
  experienceLevel: "Senior",
  keywords: [
    "Senior Fullstack Engineer",
    "New Ventures",
    "Founding engineer",
    "0→1",
    "Distributed systems",
    "Event-driven architecture",
    "Asynchronous messaging",
    "APIs",
    "Integrations",
    "Kotlin",
    "Java",
    "Backend",
    "MVP",
    "Architecture",
    "Ownership",
    "AI tools",
  ],
};

// Prompt for job extraction
const FETCH_JOB_PROMPT = `Read this job posting and extract the key information: {url}

Extract the job title, company name, location, employment type, salary range if mentioned, a brief 2-3 sentence description, responsibilities, requirements, nice-to-haves, technical skills, experience level, and keywords for a resume.`;

// JSON Schema for structured output
const JOB_ANSWER_FORMAT = {
  type: "object" as const,
  title: "ParsedJob",
  properties: {
    title: { type: "string" as const, description: "Job title" },
    company: { type: "string" as const, description: "Company name" },
    location: { type: "string" as const, description: "Location (city, remote, hybrid, etc.)" },
    employmentType: { type: "string" as const, description: "Full-time, part-time, contract, etc." },
    salaryRange: { type: "string" as const, description: "Salary range if mentioned, or null" },
    description: { type: "string" as const, description: "Brief summary of the role (2-3 sentences)" },
    responsibilities: { 
      type: "array" as const, 
      items: { type: "string" as const },
      description: "Array of job responsibilities" 
    },
    requirements: { 
      type: "array" as const, 
      items: { type: "string" as const },
      description: "Array of required qualifications" 
    },
    niceToHaves: { 
      type: "array" as const, 
      items: { type: "string" as const },
      description: "Array of preferred/nice-to-have qualifications" 
    },
    technicalSkills: { 
      type: "array" as const, 
      items: { type: "string" as const },
      description: "Array of technical skills: languages, frameworks, tools" 
    },
    experienceLevel: { type: "string" as const, description: "Years of experience or seniority level" },
    keywords: { 
      type: "array" as const, 
      items: { type: "string" as const },
      description: "Array of important keywords for a resume" 
    },
  },
  required: ["title", "company", "description", "responsibilities", "requirements", "keywords"],
};

interface FetchJobRequest {
  url: string;
}

interface ParsedJob {
  title: string;
  company: string;
  location?: string;
  employmentType?: string;
  salaryRange?: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHaves?: string[];
  technicalSkills?: string[];
  experienceLevel?: string;
  keywords: string[];
}

export async function POST(request: NextRequest) {
  log("=== POST /api/job/fetch ===");
  log("USE_MOCK:", USE_MOCK);
  
  // Rate limiting for job fetching operations
  const rateLimitResponse = applyRateLimit(request, fetchRateLimiter);
  if (rateLimitResponse) {
    log("Rate limit exceeded");
    return rateLimitResponse;
  }

  // Authentication check
  const userId = await getUserFromRequest(request);
  if (!userId) {
    log("Authentication required");
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  
  try {
    const body = (await request.json()) as FetchJobRequest;
    const { url } = body;
    
    log("Request URL:", url);

    if (!url) {
      log("ERROR: URL is required");
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      log("ERROR: Invalid URL format");
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Mock mode - return fake data with simulated delay
    if (USE_MOCK) {
      log("[MOCK MODE] Returning mock job data");
      await new Promise(r => setTimeout(r, 1500)); // Simulate API delay
      const fullText = buildFullText(MOCK_JOB);
      return NextResponse.json({
        ...MOCK_JOB,
        text: fullText,
        sourceUrl: url,
      });
    }

    // Get Subconscious client
    log("Getting Subconscious client...");
    log("SUBCONSCIOUS_API_KEY exists:", !!process.env.SUBCONSCIOUS_API_KEY);
    log("SUBCONSCIOUS_BASE_URL:", process.env.SUBCONSCIOUS_BASE_URL || "(using default: api.subconscious.dev)");
    
    let client;
    try {
      client = getSubconsciousClient();
      log("Subconscious client initialized successfully");
    } catch (clientError) {
      log("ERROR initializing Subconscious client:", clientError);
      return NextResponse.json(
        { error: "Failed to initialize AI client. Check SUBCONSCIOUS_API_KEY." },
        { status: 500 }
      );
    }

    const prompt = FETCH_JOB_PROMPT.replace("{url}", url);
    log("Prompt:", prompt.substring(0, 200) + "...");
    log("Engine:", DEFAULT_ENGINE);
    
    verboseLog("========================================");
    verboseLog("FULL PROMPT BEING SENT:");
    verboseLog("========================================");
    verboseLog(prompt);
    verboseLog("========================================");

    // Start the run with webpage understanding tool and structured output
    const runInput = {
      engine: DEFAULT_ENGINE,
      input: {
        instructions: prompt,
        tools: [
          { type: "platform" as const, id: "webpage_understanding", options: {} },
          { type: "platform" as const, id: "parallel_extract", options: {} },
        ],
        answerFormat: JOB_ANSWER_FORMAT,
      },
      options: {
        awaitCompletion: true,
      },
    };
    
    log("=== Starting Subconscious run ===");
    log("Run input:", JSON.stringify(runInput, null, 2));
    const startTime = Date.now();
    
    let finalRun;
    try {
      finalRun = await client.run(runInput);
      
      log("=== Run completed ===");
      log("Run ID:", finalRun.runId);
      log("Status:", finalRun.status);
      log("Time elapsed:", Date.now() - startTime, "ms");
      
      // Verbose logging of the full run response
      verboseLog("========================================");
      verboseLog("FULL RUN RESPONSE:");
      verboseLog("========================================");
      verboseLog(JSON.stringify(finalRun, null, 2));
      
      // Log reasoning tree if available
      if (finalRun.result?.reasoning) {
        verboseLog("========================================");
        verboseLog("AGENT REASONING TREE:");
        verboseLog("========================================");
        verboseLog(formatReasoningTree(finalRun.result.reasoning as ReasoningNode));
      }
      
      // Log usage information
      if (finalRun.usage) {
        verboseLog("========================================");
        verboseLog("USAGE INFORMATION:");
        verboseLog("========================================");
        verboseLog("Models:", JSON.stringify(finalRun.usage.models, null, 2));
        verboseLog("Platform Tools:", JSON.stringify(finalRun.usage.platformTools, null, 2));
      }
      
    } catch (runError) {
      log("ERROR in run:", runError);
      verboseLog("========================================");
      verboseLog("RUN ERROR DETAILS:");
      verboseLog("========================================");
      
      // Extract all possible error info
      const errorObj = runError as Record<string, unknown>;
      verboseLog("Error type:", typeof runError);
      verboseLog("Error constructor:", (runError as object)?.constructor?.name);
      
      if (runError instanceof Error) {
        verboseLog("Error name:", runError.name);
        verboseLog("Error message:", runError.message);
        verboseLog("Error stack:", runError.stack);
      }
      
      // SubconsciousError specific fields
      if ('code' in errorObj) verboseLog("Error code:", errorObj.code);
      if ('status' in errorObj) verboseLog("Error status:", errorObj.status);
      if ('details' in errorObj) verboseLog("Error details:", JSON.stringify(errorObj.details, null, 2));
      
      // Try to get all enumerable and non-enumerable properties
      const allProps = Object.getOwnPropertyNames(errorObj);
      verboseLog("All error properties:", allProps);
      for (const prop of allProps) {
        try {
          const value = errorObj[prop];
          if (typeof value !== 'function') {
            verboseLog(`  ${prop}:`, typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
          }
        } catch (e) {
          verboseLog(`  ${prop}: <unable to read>`);
        }
      }
      
      // Build error message
      let errorMessage = 'Failed to fetch job posting';
      if (runError instanceof Error && runError.message) {
        errorMessage = runError.message;
      } else if ('message' in errorObj && typeof errorObj.message === 'string') {
        errorMessage = errorObj.message;
      }
      
      // Provide user-friendly error for common issues
      const status = typeof errorObj.status === 'number' ? errorObj.status : 500;
      if (status === 500) {
        errorMessage = `Failed to access job posting. The page may be unavailable or blocked. (${errorMessage})`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          debug: IS_DEV ? {
            errorType: (runError as object)?.constructor?.name,
            code: errorObj.code,
            status: errorObj.status,
            details: errorObj.details,
            message: runError instanceof Error ? runError.message : undefined,
          } : undefined,
        },
        { status: status >= 400 && status < 600 ? status : 500 }
      );
    }

    if (finalRun.status !== "succeeded") {
      log("ERROR: Run did not succeed. Status:", finalRun.status);
      
      verboseLog("========================================");
      verboseLog("RUN FAILED - DETAILED DEBUGGING:");
      verboseLog("========================================");
      verboseLog("Status:", finalRun.status);
      verboseLog("Run ID:", finalRun.runId);
      
      // Log any reasoning even on failure - agent might have tried something
      if (finalRun.result?.reasoning) {
        verboseLog("Agent reasoning before failure:");
        verboseLog(formatReasoningTree(finalRun.result.reasoning as ReasoningNode));
      }
      
      // Log any partial answer
      if (finalRun.result?.answer) {
        verboseLog("Partial answer (if any):", finalRun.result.answer);
      }
      
      // Extract error message if available
      const errorObj = finalRun as { error?: { message?: string; code?: string; details?: unknown } };
      const errorMessage = errorObj.error?.message || `Job fetch ${finalRun.status || 'failed'}`;
      
      verboseLog("Error object:", JSON.stringify(errorObj.error, null, 2));
      verboseLog("Full run object:", JSON.stringify(finalRun, null, 2));
      
      return NextResponse.json(
        { 
          error: errorMessage,
          debug: IS_DEV ? { 
            runId: finalRun.runId, 
            status: finalRun.status,
            errorCode: errorObj.error?.code,
            reasoning: finalRun.result?.reasoning,
          } : undefined,
        },
        { status: 422 }
      );
    }

    log("Run succeeded!");
    log("Result exists:", !!finalRun.result);
    log("Answer exists:", !!finalRun.result?.answer);
    log("Answer type:", typeof finalRun.result?.answer);

    if (!finalRun.result?.answer) {
      verboseLog("========================================");
      verboseLog("NO ANSWER IN RESULT - DEBUGGING:");
      verboseLog("========================================");
      verboseLog("Full result object:", JSON.stringify(finalRun.result, null, 2));
      
      // Check if agent tried to access the page but failed
      if (finalRun.result?.reasoning) {
        verboseLog("Agent reasoning (looking for page access issues):");
        verboseLog(formatReasoningTree(finalRun.result.reasoning as ReasoningNode));
        
        // Check conclusion for common issues
        const reasoning = finalRun.result.reasoning as ReasoningNode;
        const conclusion = reasoning.conclusion?.toLowerCase() || '';
        if (conclusion.includes('access') || conclusion.includes('blocked') || conclusion.includes('unavailable')) {
          log("HINT: Agent may have been blocked from accessing the page");
        }
        if (conclusion.includes('not found') || conclusion.includes('404')) {
          log("HINT: Page may not exist or job posting may have been removed");
        }
      }
      
      return NextResponse.json(
        { 
          error: "Could not extract job information from the page. The page may be inaccessible or the job posting may have been removed.",
          debug: IS_DEV ? {
            runId: finalRun.runId,
            reasoning: finalRun.result?.reasoning,
          } : undefined,
        },
        { status: 422 }
      );
    }

    // With answerFormat, the answer is already a parsed object
    const answer = finalRun.result.answer;
    log("Answer type:", typeof answer);
    log("Answer preview:", JSON.stringify(answer).substring(0, 500));
    
    const parsed = answer as unknown as ParsedJob;
    
    // Validate the parsed result has required fields
    if (!parsed.title || !parsed.company) {
      verboseLog("========================================");
      verboseLog("MISSING REQUIRED FIELDS - DEBUGGING:");
      verboseLog("========================================");
      verboseLog("Parsed answer:", JSON.stringify(parsed, null, 2));
      
      return NextResponse.json(
        { 
          error: "Failed to extract job information. The page may be inaccessible or the job posting format is not recognized.",
          errorCode: "extraction_failed",
          debug: IS_DEV ? {
            runId: finalRun.runId,
            answer: parsed,
            reasoning: finalRun.result?.reasoning,
          } : undefined,
        },
        { status: 422 }
      );
    }
    
    // Detect "soft failures" where the agent succeeded but couldn't access the page
    const accessErrorIndicators = [
      "unavailable",
      "could not be accessed",
      "permission error",
      "unable to access",
      "not found",
      "access denied",
      "blocked",
      "forbidden",
    ];
    
    const titleLower = parsed.title.toLowerCase();
    const descLower = parsed.description?.toLowerCase() || "";
    const hasAccessError = accessErrorIndicators.some(
      indicator => titleLower.includes(indicator) || descLower.includes(indicator)
    );
    const hasEmptyData = 
      (!parsed.requirements || parsed.requirements.length === 0) &&
      (!parsed.responsibilities || parsed.responsibilities.length === 0) &&
      (!parsed.keywords || parsed.keywords.length === 0);
    
    if (hasAccessError && hasEmptyData) {
      log("Detected soft failure - agent could not access the page");
      verboseLog("========================================");
      verboseLog("SOFT FAILURE - PAGE ACCESS ERROR:");
      verboseLog("========================================");
      verboseLog("Title:", parsed.title);
      verboseLog("Description:", parsed.description);
      
      // Extract a user-friendly message from the agent's response
      let userMessage = "Could not access the job posting. The page may be blocked, require login, or no longer exist.";
      if (descLower.includes("permission")) {
        userMessage = "The job posting page blocked our access. Try pasting the job description text directly instead.";
      } else if (descLower.includes("not found") || titleLower.includes("not found")) {
        userMessage = "The job posting was not found. It may have been removed or the link may be incorrect.";
      }
      
      return NextResponse.json(
        { 
          error: userMessage,
          errorCode: "page_access_error",
          company: parsed.company || undefined,
          debug: IS_DEV ? {
            runId: finalRun.runId,
            title: parsed.title,
            description: parsed.description,
            reasoning: finalRun.result?.reasoning,
          } : undefined,
        },
        { status: 422 }
      );
    }
    
    log("Parsed job:", {
      title: parsed.title,
      company: parsed.company,
      requirementsCount: parsed.requirements?.length,
      keywordsCount: parsed.keywords?.length,
    });

    // Build the full text for display/storage
    const fullText = buildFullText(parsed);
    log("Full text length:", fullText.length);

    const response = {
      ...parsed,
      text: fullText,
      sourceUrl: url,
    };
    log("Returning success response");
    
    return NextResponse.json(response);
  } catch (error) {
    log("FATAL ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch job posting" },
      { status: 500 }
    );
  }
}

// Build a formatted full text version from parsed data
function buildFullText(parsed: ParsedJob): string {
  const sections: string[] = [];

  sections.push(`${parsed.title} at ${parsed.company}`);
  
  if (parsed.location) {
    sections.push(`Location: ${parsed.location}`);
  }
  if (parsed.employmentType) {
    sections.push(`Type: ${parsed.employmentType}`);
  }
  if (parsed.salaryRange) {
    sections.push(`Salary: ${parsed.salaryRange}`);
  }

  sections.push("");

  if (parsed.description) {
    sections.push("About the Role:");
    sections.push(parsed.description);
    sections.push("");
  }

  if (parsed.responsibilities?.length) {
    sections.push("Responsibilities:");
    parsed.responsibilities.forEach(r => sections.push(`• ${r}`));
    sections.push("");
  }

  if (parsed.requirements?.length) {
    sections.push("Requirements:");
    parsed.requirements.forEach(r => sections.push(`• ${r}`));
    sections.push("");
  }

  if (parsed.niceToHaves?.length) {
    sections.push("Nice to Have:");
    parsed.niceToHaves.forEach(r => sections.push(`• ${r}`));
    sections.push("");
  }

  return sections.join("\n");
}
