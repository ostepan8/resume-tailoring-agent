import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createLogger, logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("api/resume/sync-profile");

// Mock mode for testing
// Use NEXT_PUBLIC_USE_MOCK for consistency with frontend
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ============================================
// TYPES
// ============================================

interface ParsedContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

interface ParsedExperience {
  id?: string;
  company: string;
  position?: string;
  title?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets?: string[];
  description?: string;
}

interface ParsedEducation {
  id?: string;
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  highlights?: string[];
}

interface ParsedSkill {
  name: string;
  category?: string;
}

interface ParsedSkills {
  format?: string;
  categories?: Array<{
    name: string;
    skills: string[];
  }>;
}

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

interface ParsedResume {
  contactInfo?: ParsedContactInfo;
  experience?: ParsedExperience[];
  education?: ParsedEducation[];
  skills?: ParsedSkills | string[];
  projects?: ParsedProject[];
}

interface SyncResult {
  profile: { updated: boolean; fields: string[] };
  experience: { added: number; skipped: number };
  education: { added: number; skipped: number };
  skills: { added: number; skipped: number };
  projects: { added: number; updated: number; skipped: number };
}


// ============================================
// SUPABASE HELPERS
// ============================================

function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  const supabase = getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

// ============================================
// DATE PARSING
// ============================================

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  try {
    // Handle "Present", "Current", etc.
    if (/present|current|now/i.test(dateStr)) {
      return null; // null means current/ongoing
    }
    
    // Try parsing various formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    
    // Try "Month Year" format
    const monthYearMatch = dateStr.match(/(\w+)\s+(\d{4})/);
    if (monthYearMatch) {
      const parsed = new Date(`${monthYearMatch[1]} 1, ${monthYearMatch[2]}`);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
    }
    
    // Try just year
    const yearMatch = dateStr.match(/(\d{4})/);
    if (yearMatch) {
      return `${yearMatch[1]}-01-01`;
    }
    
    return null;
  } catch {
    return null;
  }
}

// ============================================
// SYNC FUNCTIONS
// ============================================

async function syncProfile(
  userId: string,
  contactInfo: ParsedContactInfo | undefined
): Promise<{ updated: boolean; fields: string[] }> {
  if (!contactInfo) return { updated: false, fields: [] };
  
  const supabase = getServerSupabase();
  const updates: Record<string, string> = {};
  const fields: string[] = [];
  
  if (contactInfo.name) {
    updates.full_name = contactInfo.name;
    fields.push("name");
  }
  if (contactInfo.phone) {
    updates.phone = contactInfo.phone;
    fields.push("phone");
  }
  if (contactInfo.location) {
    updates.location = contactInfo.location;
    fields.push("location");
  }
  if (contactInfo.linkedin) {
    updates.linkedin_url = contactInfo.linkedin.startsWith("http") 
      ? contactInfo.linkedin 
      : `https://${contactInfo.linkedin}`;
    fields.push("linkedin");
  }
  if (contactInfo.github) {
    updates.github_url = contactInfo.github.startsWith("http")
      ? contactInfo.github
      : `https://${contactInfo.github}`;
    fields.push("github");
  }
  if (contactInfo.website) {
    updates.website_url = contactInfo.website.startsWith("http")
      ? contactInfo.website
      : `https://${contactInfo.website}`;
    fields.push("website");
  }
  
  if (Object.keys(updates).length === 0) {
    return { updated: false, fields: [] };
  }
  
  const { error } = await supabase
    .from("user_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  
  if (error) {
    logError("api/resume/sync-profile", "Error updating profile", error);
    return { updated: false, fields: [] };
  }
  
  return { updated: true, fields };
}

async function syncExperience(
  userId: string,
  experience: ParsedExperience[] | undefined
): Promise<{ added: number; skipped: number }> {
  if (!experience || experience.length === 0) {
    return { added: 0, skipped: 0 };
  }
  
  const supabase = getServerSupabase();
  
  // Fetch existing experience
  const { data: existing } = await supabase
    .from("work_experience")
    .select("id, company, position")
    .eq("user_id", userId);
  
  const existingSet = new Set(
    (existing || []).map(e => `${e.company.toLowerCase()}|${e.position.toLowerCase()}`)
  );
  
  let added = 0;
  let skipped = 0;
  
  for (const exp of experience) {
    const position = exp.position || exp.title || "Unknown Position";
    const key = `${exp.company.toLowerCase()}|${position.toLowerCase()}`;
    
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }
    
    const startDate = parseDate(exp.startDate);
    const endDate = parseDate(exp.endDate);
    const isCurrent = !endDate && exp.endDate && /present|current|now/i.test(exp.endDate);
    
    const { error } = await supabase.from("work_experience").insert({
      user_id: userId,
      company: exp.company,
      position: position,
      location: exp.location || null,
      employment_type: "full-time",
      description: exp.description || null,
      achievements: exp.bullets || [],
      skills: [],
      start_date: startDate || new Date().toISOString().split("T")[0],
      end_date: endDate,
      is_current: isCurrent || false,
    });
    
    if (!error) {
      added++;
      existingSet.add(key);
    } else {
      logError("api/resume/sync-profile", "Error adding experience", error);
    }
  }
  
  return { added, skipped };
}

async function syncEducation(
  userId: string,
  education: ParsedEducation[] | undefined
): Promise<{ added: number; skipped: number }> {
  if (!education || education.length === 0) {
    return { added: 0, skipped: 0 };
  }
  
  const supabase = getServerSupabase();
  
  // Fetch existing education
  const { data: existing } = await supabase
    .from("education")
    .select("id, institution, degree")
    .eq("user_id", userId);
  
  const existingSet = new Set(
    (existing || []).map(e => `${e.institution.toLowerCase()}|${e.degree.toLowerCase()}`)
  );
  
  let added = 0;
  let skipped = 0;
  
  for (const edu of education) {
    const key = `${edu.institution.toLowerCase()}|${edu.degree.toLowerCase()}`;
    
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }
    
    const startDate = parseDate(edu.startDate);
    const endDate = parseDate(edu.endDate);
    const isCurrent = !endDate && edu.endDate && /present|current|expected/i.test(edu.endDate);
    
    const { error } = await supabase.from("education").insert({
      user_id: userId,
      institution: edu.institution,
      degree: edu.degree,
      field_of_study: edu.field || null,
      location: edu.location || null,
      gpa: edu.gpa || null,
      description: null,
      achievements: edu.highlights || [],
      start_date: startDate || new Date().toISOString().split("T")[0],
      end_date: endDate,
      is_current: isCurrent || false,
    });
    
    if (!error) {
      added++;
      existingSet.add(key);
    } else {
      logError("api/resume/sync-profile", "Error adding education", error);
    }
  }
  
  return { added, skipped };
}

async function syncSkills(
  userId: string,
  skills: ParsedSkills | string[] | undefined
): Promise<{ added: number; skipped: number }> {
  if (!skills) return { added: 0, skipped: 0 };
  
  const supabase = getServerSupabase();
  
  // Fetch existing skills
  const { data: existing } = await supabase
    .from("skills")
    .select("id, name")
    .eq("user_id", userId);
  
  const existingSet = new Set(
    (existing || []).map(s => s.name.toLowerCase())
  );
  
  // Flatten skills from various formats
  const skillsToAdd: ParsedSkill[] = [];
  
  if (Array.isArray(skills)) {
    // Simple array of strings
    skills.forEach(s => {
      if (typeof s === "string") {
        skillsToAdd.push({ name: s, category: "other" });
      }
    });
  } else if (skills.categories) {
    // Categorized format
    for (const cat of skills.categories) {
      const category = mapCategory(cat.name);
      for (const skillName of cat.skills) {
        skillsToAdd.push({ name: skillName, category });
      }
    }
  }
  
  let added = 0;
  let skipped = 0;
  
  for (const skill of skillsToAdd) {
    if (existingSet.has(skill.name.toLowerCase())) {
      skipped++;
      continue;
    }
    
    const { error } = await supabase.from("skills").insert({
      user_id: userId,
      name: skill.name,
      category: skill.category || "other",
      proficiency: "intermediate",
      years_of_experience: null,
    });
    
    if (!error) {
      added++;
      existingSet.add(skill.name.toLowerCase());
    } else {
      logError("api/resume/sync-profile", "Error adding skill", error);
    }
  }
  
  return { added, skipped };
}

function mapCategory(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  if (lower.includes("language") && !lower.includes("programming")) {
    return "language";
  }
  if (lower.includes("framework") || lower.includes("library")) {
    return "framework";
  }
  if (lower.includes("tool") || lower.includes("devops") || lower.includes("platform")) {
    return "tool";
  }
  if (lower.includes("soft") || lower.includes("interpersonal")) {
    return "soft";
  }
  return "technical";
}

async function syncProjects(
  userId: string,
  projects: ParsedProject[] | undefined
): Promise<{ added: number; updated: number; skipped: number }> {
  if (!projects || projects.length === 0) {
    return { added: 0, updated: 0, skipped: 0 };
  }
  
  const supabase = getServerSupabase();
  
  // Fetch existing projects
  const { data: existing } = await supabase
    .from("user_projects")
    .select("id, name, url")
    .eq("user_id", userId);
  
  const existingByName = new Map<string, string>();
  const existingByUrl = new Map<string, string>();
  
  for (const p of existing || []) {
    existingByName.set(p.name.toLowerCase(), p.id);
    if (p.url) {
      existingByUrl.set(p.url.toLowerCase(), p.id);
    }
  }
  
  let added = 0;
  let skipped = 0;
  
  for (const proj of projects) {
    // Check for duplicates by name or URL
    const nameKey = proj.name.toLowerCase();
    const urlKey = proj.url?.toLowerCase();
    
    if (existingByName.has(nameKey) || (urlKey && existingByUrl.has(urlKey))) {
      skipped++;
      continue;
    }
    
    const startDate = parseDate(proj.startDate);
    const endDate = parseDate(proj.endDate);
    
    const { error } = await supabase.from("user_projects").insert({
      user_id: userId,
      name: proj.name,
      description: proj.description || null,
      bullets: proj.bullets || [],
      skills: proj.technologies || [],
      start_date: startDate,
      end_date: endDate,
      url: proj.url || null,
      is_featured: false,
    });
    
    if (!error) {
      added++;
      existingByName.set(nameKey, "new");
    } else {
      logError("api/resume/sync-profile", "Error adding project", error);
    }
  }
  
  return { added, updated: 0, skipped };
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: NextRequest) {
  log("POST request received");
  
  try {
    const body = await request.json();
    const { parsedResume } = body as {
      parsedResume: ParsedResume;
    };
    
    // Get user ID from auth header only - no body fallback for security
    const userId = await getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    if (!parsedResume) {
      return NextResponse.json(
        { error: "Parsed resume data is required" },
        { status: 400 }
      );
    }
    
    log("Syncing for user:", userId);
    log("Data:", {
      hasContactInfo: !!parsedResume.contactInfo,
      experienceCount: parsedResume.experience?.length || 0,
      educationCount: parsedResume.education?.length || 0,
      hasSkills: !!parsedResume.skills,
      projectsCount: parsedResume.projects?.length || 0,
    });
    
    // Perform all syncs
    const [profileResult, experienceResult, educationResult, skillsResult, projectsResult] = await Promise.all([
      syncProfile(userId, parsedResume.contactInfo),
      syncExperience(userId, parsedResume.experience),
      syncEducation(userId, parsedResume.education),
      syncSkills(userId, parsedResume.skills),
      syncProjects(userId, parsedResume.projects),
    ]);
    
    const result: SyncResult = {
      profile: profileResult,
      experience: experienceResult,
      education: educationResult,
      skills: skillsResult,
      projects: projectsResult,
    };
    
    // Build summary message
    const messages: string[] = [];
    
    if (profileResult.updated) {
      messages.push(`Updated profile (${profileResult.fields.join(", ")})`);
    }
    if (experienceResult.added > 0) {
      messages.push(`${experienceResult.added} experience${experienceResult.added > 1 ? "s" : ""}`);
    }
    if (educationResult.added > 0) {
      messages.push(`${educationResult.added} education`);
    }
    if (skillsResult.added > 0) {
      messages.push(`${skillsResult.added} skills`);
    }
    if (projectsResult.added > 0) {
      messages.push(`${projectsResult.added} project${projectsResult.added > 1 ? "s" : ""}`);
    }
    
    const totalSkipped = experienceResult.skipped + educationResult.skipped + 
                         skillsResult.skipped + projectsResult.skipped;
    
    let message = messages.length > 0 
      ? `Added: ${messages.join(", ")}`
      : "No new data to add";
    
    if (totalSkipped > 0) {
      message += ` (${totalSkipped} duplicates skipped)`;
    }
    
    log("Result:", message);
    
    return NextResponse.json({
      success: true,
      message,
      result,
    });
  } catch (error) {
    logError("api/resume/sync-profile", "Error syncing profile", error);
    return NextResponse.json(
      { error: "Failed to sync profile data" },
      { status: 500 }
    );
  }
}
