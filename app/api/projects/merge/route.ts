import { NextRequest, NextResponse } from "next/server";
import { getAIClient, DEFAULT_ENGINE } from "@/lib/ai-client";
import { createClient } from "@supabase/supabase-js";
import { createLogger, logError } from "@/lib/logger";
import { aiRateLimiter, applyRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("api/projects/merge");

// Mock mode for testing
// Use NEXT_PUBLIC_USE_MOCK for consistency with frontend
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Types for parsed projects from resume
interface ParsedProject {
  id?: string;
  name: string;
  description?: string;
  technologies?: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
  bullets?: string[];
}

// Types for existing projects in DB
interface ExistingProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  bullets: string[];
  skills: string[];
  start_date: string | null;
  end_date: string | null;
  url: string | null;
  is_featured: boolean;
}

// Merge decision types
interface MergeDecision {
  action: "add" | "update" | "skip";
  newProject: ParsedProject;
  existingProject?: ExistingProject;
  reason: string;
  mergedData?: Partial<ExistingProject>;
}

interface MergeResult {
  add: Array<{
    project: ParsedProject;
    reason: string;
  }>;
  update: Array<{
    existingId: string;
    updates: Partial<ExistingProject>;
    reason: string;
  }>;
  skip: Array<{
    project: ParsedProject;
    matchedWith: string;
    reason: string;
  }>;
}

// AI prompt for intelligent project merging
const MERGE_PROMPT = `You are an expert at comparing and merging project data. 

## EXISTING PROJECTS (already in user's profile)
{existingProjects}

## NEW PROJECTS (extracted from resume)
{newProjects}

## YOUR TASK
For each NEW project, determine if it matches any EXISTING project and what action to take:

1. **ADD**: The project is truly new - no existing project matches it semantically
2. **UPDATE**: The project matches an existing one, but has NEW/BETTER information to merge
3. **SKIP**: The project matches an existing one and has NO new information

## MATCHING CRITERIA
Consider projects as matching if:
- Same project name (exact or very similar, e.g., "JARVIS AI" matches "JARVIS AI Companion")
- Same project URL
- Same core description/purpose even if names differ slightly
- Same technologies AND similar functionality

## RULES
1. Be conservative - only UPDATE if new data is genuinely better/more complete
2. Combine skills arrays when updating (union of both)
3. Keep longer/more detailed descriptions
4. Keep more bullet points (union if they describe different aspects)
5. Always provide a clear reason for each decision

Analyze the projects and provide your decisions.`;

// JSON Schema for merge decisions structured output
const MERGE_DECISIONS_FORMAT = {
  type: "object" as const,
  title: "MergeDecisions",
  properties: {
    decisions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          action: { 
            type: "string" as const, 
            enum: ["add", "update", "skip"] as const,
            description: "The action to take for this project" 
          },
          newProjectName: { type: "string" as const, description: "Name of the new project being evaluated" },
          existingProjectId: { type: "string" as const, description: "ID of matched existing project" },
          reason: { type: "string" as const, description: "Brief explanation of the decision" },
          mergedData: {
            type: "object" as const,
            properties: {
              description: { type: "string" as const, description: "Merged description if better" },
              bullets: { 
                type: "array" as const, 
                items: { type: "string" as const }, 
                description: "Merged bullets if better" 
              },
              skills: { 
                type: "array" as const, 
                items: { type: "string" as const }, 
                description: "Combined skills array" 
              },
              url: { type: "string" as const, description: "URL if new one is better" },
            },
            description: "Only for 'update' action - fields to update in existing project",
          },
        },
        required: ["action", "newProjectName", "reason"],
      },
    },
  },
  required: ["decisions"],
};

// Mock merge result
const MOCK_MERGE_RESULT: MergeResult = {
  add: [
    {
      project: {
        name: "New Project from Resume",
        description: "A new project",
        technologies: ["React", "Node.js"],
      },
      reason: "No matching project found in existing profile",
    },
  ],
  update: [],
  skip: [
    {
      project: { name: "Existing Project" },
      matchedWith: "existing-id-123",
      reason: "Project already exists with same information",
    },
  ],
};

// Create server-side Supabase client
function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Get user from auth header
async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const supabase = getServerSupabase();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user.id;
}

// Fetch existing projects for user
async function getExistingProjects(userId: string): Promise<ExistingProject[]> {
  const supabase = getServerSupabase();
  
  const { data, error } = await supabase
    .from("user_projects")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    logError("api/projects/merge", "Error fetching existing projects", error);
    return [];
  }

  return data || [];
}

// Simple fallback matching when AI fails
function simpleFallbackMatch(
  newProjects: ParsedProject[],
  existingProjects: ExistingProject[]
): MergeResult {
  const result: MergeResult = { add: [], update: [], skip: [] };

  for (const newProj of newProjects) {
    const normalizedNewName = newProj.name.toLowerCase().trim();
    const normalizedNewUrl = newProj.url?.toLowerCase().trim();

    // Check for name or URL match
    const match = existingProjects.find((existing) => {
      const normalizedExistingName = existing.name.toLowerCase().trim();
      const normalizedExistingUrl = existing.url?.toLowerCase().trim();

      // Exact name match
      if (normalizedNewName === normalizedExistingName) return true;

      // One name contains the other (handles "JARVIS" vs "JARVIS AI Companion")
      if (
        normalizedNewName.includes(normalizedExistingName) ||
        normalizedExistingName.includes(normalizedNewName)
      ) {
        return true;
      }

      // URL match
      if (normalizedNewUrl && normalizedExistingUrl && normalizedNewUrl === normalizedExistingUrl) {
        return true;
      }

      return false;
    });

    if (match) {
      result.skip.push({
        project: newProj,
        matchedWith: match.id,
        reason: `Matched with existing project "${match.name}" by name/URL`,
      });
    } else {
      result.add.push({
        project: newProj,
        reason: "No matching project found",
      });
    }
  }

  return result;
}

// Parse AI response into MergeResult (with answerFormat, response is already parsed)
function parseAIResponse(
  aiResponse: unknown,
  newProjects: ParsedProject[],
  existingProjects: ExistingProject[]
): MergeResult {
  const result: MergeResult = { add: [], update: [], skip: [] };

  try {
    // With answerFormat, the response is already a parsed object
    const parsed = aiResponse as { decisions: Array<{
      action: string;
      newProjectName?: string;
      newProject?: { name?: string };
      existingProjectId?: string;
      existingProject?: { id?: string };
      reason?: string;
      mergedData?: Partial<ExistingProject>;
    }> };

    if (!parsed.decisions || !Array.isArray(parsed.decisions)) {
      throw new Error("Invalid response format");
    }

    for (const decision of parsed.decisions) {
      // Find the new project by name
      const newProj = newProjects.find(
        (p) => p.name.toLowerCase() === decision.newProject?.name?.toLowerCase() ||
               p.name.toLowerCase() === decision.newProjectName?.toLowerCase()
      );
      
      if (!newProj) continue;

      const existingProj = decision.existingProject?.id
        ? existingProjects.find((p) => p.id === decision.existingProject?.id)
        : decision.existingProjectId
        ? existingProjects.find((p) => p.id === decision.existingProjectId)
        : undefined;

      switch (decision.action) {
        case "add":
          result.add.push({
            project: newProj,
            reason: decision.reason || "New project to add",
          });
          break;

        case "update":
          if (existingProj && decision.mergedData) {
            result.update.push({
              existingId: existingProj.id,
              updates: decision.mergedData,
              reason: decision.reason || "Updating with new information",
            });
          }
          break;

        case "skip":
          result.skip.push({
            project: newProj,
            matchedWith: existingProj?.id || decision.existingProjectId || "unknown",
            reason: decision.reason || "Already exists",
          });
          break;
      }
    }

    return result;
  } catch (error) {
    logError("api/projects/merge", "Failed to parse AI response", error);
    throw error;
  }
}

// Apply merge results to database
async function applyMergeResults(
  userId: string,
  mergeResult: MergeResult,
  autoApply: boolean
): Promise<{ added: number; updated: number; skipped: number }> {
  if (!autoApply) {
    return {
      added: mergeResult.add.length,
      updated: mergeResult.update.length,
      skipped: mergeResult.skip.length,
    };
  }

  const supabase = getServerSupabase();
  let added = 0;
  let updated = 0;

  // Add new projects
  for (const item of mergeResult.add) {
    const { error } = await supabase.from("user_projects").insert({
      user_id: userId,
      name: item.project.name,
      description: item.project.description || null,
      bullets: item.project.bullets || [],
      skills: item.project.technologies || [],
      start_date: item.project.startDate ? parseDate(item.project.startDate) : null,
      end_date: item.project.endDate ? parseDate(item.project.endDate) : null,
      url: item.project.url || null,
      is_featured: false,
    });

    if (!error) {
      added++;
    } else {
      logError("api/projects/merge", "Error adding project", error);
    }
  }

  // Update existing projects
  for (const item of mergeResult.update) {
    const { error } = await supabase
      .from("user_projects")
      .update({
        ...item.updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.existingId);

    if (!error) {
      updated++;
    } else {
      logError("api/projects/merge", "Error updating project", error);
    }
  }

  return {
    added,
    updated,
    skipped: mergeResult.skip.length,
  };
}

// Parse date string to ISO format
function parseDate(dateStr: string): string | null {
  try {
    // Handle various formats: "Jan 2024", "2024-01", "January 2024"
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  log("POST request received");

  // Rate limiting for AI operations
  const rateLimitResponse = applyRateLimit(request, aiRateLimiter);
  if (rateLimitResponse) {
    log("Rate limit exceeded");
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { projects, autoApply = true } = body as {
      projects: ParsedProject[];
      autoApply?: boolean;
    };

    // Get user ID from auth header only - no body fallback for security
    const userId = await getUserFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No projects to merge",
        result: { add: [], update: [], skip: [] },
        applied: { added: 0, updated: 0, skipped: 0 },
      });
    }

    log(`Processing ${projects.length} projects for user ${userId}`);

    // Fetch existing projects
    const existingProjects = await getExistingProjects(userId);
    log(`Found ${existingProjects.length} existing projects`);

    // If no existing projects, just add all new ones
    if (existingProjects.length === 0) {
      const mergeResult: MergeResult = {
        add: projects.map((p) => ({ project: p, reason: "No existing projects to compare" })),
        update: [],
        skip: [],
      };

      const applied = await applyMergeResults(userId, mergeResult, autoApply);

      return NextResponse.json({
        success: true,
        message: `Added ${applied.added} new projects`,
        result: mergeResult,
        applied,
      });
    }

    // Mock mode
    if (USE_MOCK) {
      log("[MOCK MODE] Returning mock merge result");
      const applied = await applyMergeResults(userId, MOCK_MERGE_RESULT, autoApply);
      return NextResponse.json({
        success: true,
        message: "Mock merge completed",
        result: MOCK_MERGE_RESULT,
        applied,
      });
    }

    // Use AI to intelligently merge projects
    let mergeResult: MergeResult;

    try {
      const client = getAIClient();
      
      const prompt = MERGE_PROMPT
        .replace("{existingProjects}", JSON.stringify(existingProjects, null, 2))
        .replace("{newProjects}", JSON.stringify(projects, null, 2));

      const run = await client.run({
        engine: DEFAULT_ENGINE,
        input: {
          instructions: prompt,
          tools: [],
          answerFormat: MERGE_DECISIONS_FORMAT,
        },
      });

      // Poll for completion (max 60 seconds for merging)
      const maxWaitMs = 60000;
      const pollIntervalMs = 2000;
      const startTime = Date.now();

      let finalRun = run;
      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        finalRun = await client.get(run.runId);

        if (finalRun.status === "succeeded" || finalRun.status === "failed") {
          break;
        }
      }

      if (finalRun.status !== "succeeded" || !finalRun.result?.answer) {
        log("AI merge failed, using simple fallback");
        mergeResult = simpleFallbackMatch(projects, existingProjects);
      } else {
        mergeResult = parseAIResponse(finalRun.result.answer, projects, existingProjects);
      }
    } catch (aiError) {
      logError("api/projects/merge", "AI merge error, using fallback", aiError);
      mergeResult = simpleFallbackMatch(projects, existingProjects);
    }

    // Apply the merge results
    const applied = await applyMergeResults(userId, mergeResult, autoApply);

    const message = [
      applied.added > 0 ? `Added ${applied.added} new projects` : null,
      applied.updated > 0 ? `Updated ${applied.updated} projects` : null,
      applied.skipped > 0 ? `Skipped ${applied.skipped} duplicates` : null,
    ]
      .filter(Boolean)
      .join(", ") || "No changes made";

    return NextResponse.json({
      success: true,
      message,
      result: mergeResult,
      applied,
    });
  } catch (error) {
    logError("api/projects/merge", "Error merging projects", error);
    return NextResponse.json(
      { error: "Failed to merge projects" },
      { status: 500 }
    );
  }
}
