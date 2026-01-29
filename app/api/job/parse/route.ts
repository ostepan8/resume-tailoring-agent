import { NextRequest, NextResponse } from "next/server";
import {
  getAIClient,
  DEFAULT_ENGINE,
} from "@/lib/ai-client";
import { createLogger, logError } from "@/lib/logger";
import { aiRateLimiter, applyRateLimit } from "@/lib/rate-limit";
import { getUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("api/job/parse");

const PARSE_JOB_PROMPT = `Parse this job description and extract the key information.

JOB DESCRIPTION:
---
{text}
---

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

interface ParseJobRequest {
  text: string;
  title?: string;
  company?: string;
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
  log("POST request received");
  
  // Rate limiting for AI operations
  const rateLimitResponse = applyRateLimit(request, aiRateLimiter);
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
    const body = (await request.json()) as ParseJobRequest;
    const { text, title, company } = body;

    log("text length:", text?.length, "title:", title, "company:", company);

    if (!text || text.trim().length < 50) {
      log("ERROR: Text too short");
      return NextResponse.json(
        { error: "Job description text is required (minimum 50 characters)" },
        { status: 400 }
      );
    }

    log("Starting AI parse...");
    const client = getAIClient();

    // Start the run with structured output
    const run = await client.run({
      engine: DEFAULT_ENGINE,
      input: {
        instructions: PARSE_JOB_PROMPT.replace("{text}", text),
        tools: [], // No tools needed for text parsing
        answerFormat: JOB_ANSWER_FORMAT,
      },
    });

    // Poll for completion
    const maxWaitMs = 120000; // 2 minutes max for text parsing
    const pollIntervalMs = 2000;
    const startTime = Date.now();
    
    let finalRun = run;
    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, pollIntervalMs));
      finalRun = await client.get(run.runId);
      
      if (finalRun.status === "succeeded" || finalRun.status === "failed") {
        break;
      }
    }

    if (finalRun.status !== "succeeded") {
      logError("api/job/parse", "Job parse failed", finalRun.status);
      return NextResponse.json(
        { error: "Failed to parse job description" },
        { status: 422 }
      );
    }

    if (!finalRun.result?.answer) {
      return NextResponse.json(
        { error: "Could not extract structured information" },
        { status: 422 }
      );
    }

    // With answerFormat, the answer is already a parsed object
    const parsed = finalRun.result.answer as unknown as ParsedJob;
    
    // Validate required fields
    if (!parsed.title || !parsed.company) {
      logError("api/job/parse", "Missing required fields in parsed job");
      return NextResponse.json(
        { error: "Failed to extract required job information" },
        { status: 422 }
      );
    }

    // Override with user-provided title/company if given
    if (title) parsed.title = title;
    if (company) parsed.company = company;

    return NextResponse.json({
      ...parsed,
      text, // Include original text
    });
  } catch (error) {
    logError("api/job/parse", "Job parse error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse job description" },
      { status: 500 }
    );
  }
}
