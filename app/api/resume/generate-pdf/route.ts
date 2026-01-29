import { NextRequest, NextResponse } from "next/server";
import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumePDFServer } from "./pdf-server";
import type { ResumeDocument, ResumeBlock } from "@/app/resume-test/types";
import type { TailoredResume, JobDescription } from "@/app/tailor/components/types";
import { createLogger, logError } from "@/lib/logger";
import { getUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("api/resume/generate-pdf");

// Parse contact info from fullText
function parseContactInfo(fullText: string): any {
  const lines = fullText.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return null;

  const name = lines[0].trim();
  const contactLine = lines[1] || "";
  const linkLine = lines[2] || "";

  // Parse email, phone, location from contact line
  const emailMatch = contactLine.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = contactLine.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  const locationMatch = contactLine.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})/);

  // Parse links
  const linkedinMatch = linkLine.match(/linkedin[\.com\/in\/]*([^\s|]+)/i);
  const githubMatch = linkLine.match(/github[\.com\/]*([^\s|]+)/i);

  return {
    name: name || "",
    email: emailMatch ? emailMatch[1] : null,
    phone: phoneMatch ? phoneMatch[1] : null,
    location: locationMatch ? locationMatch[1] : null,
    linkedin: linkedinMatch ? `linkedin.com/in/${linkedinMatch[1]}` : null,
    github: githubMatch ? `github.com/${githubMatch[1]}` : null,
  };
}

// Convert TailoredResume to ResumeDocument (same logic as ResultsStep.tsx)
function tailoredResumeToDocument(
  tailored: TailoredResume,
  job: JobDescription
): ResumeDocument {
  const blocks: ResumeBlock[] = [];
  let order = 0;

  // Header block - try structured data first, then parse from fullText
  let contactInfo = tailored.contactInfo;
  if (!contactInfo && tailored.fullText) {
    contactInfo = parseContactInfo(tailored.fullText);
  }
  
  if (contactInfo) {
    blocks.push({
      id: "header-1",
      type: "header",
      enabled: true,
      order: order++,
      data: {
        name: contactInfo.name || "",
        email: contactInfo.email,
        phone: contactInfo.phone,
        location: contactInfo.location,
        linkedin: contactInfo.linkedin,
        github: contactInfo.github,
        website: contactInfo.website,
      },
    } as any);
  }

  // Education block
  if (tailored.education && tailored.education.length > 0) {
    blocks.push({
      id: "education-1",
      type: "education",
      enabled: true,
      order: order++,
      data: {
        entries: tailored.education.map((edu) => ({
          id: edu.id,
          enabled: true,
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field,
          location: edu.location,
          startDate: edu.startDate,
          endDate: edu.endDate,
          gpa: edu.gpa,
          highlights: edu.highlights || [],
        })),
      },
    } as any);
  } else {
    // Fallback: create custom block from EDUCATION section or parse from fullText
    const eduSection = tailored.sections?.find(
      (s) => s.title.toUpperCase().includes("EDUCATION")
    );
    if (eduSection && eduSection.content) {
      blocks.push({
        id: "education-custom",
        type: "custom",
        enabled: true,
        order: order++,
        data: {
          title: "EDUCATION",
          content: eduSection.content,
        },
      } as any);
    } else if (tailored.fullText) {
      // Try to extract EDUCATION section from fullText
      const eduMatch = tailored.fullText.match(/EDUCATION\s+([\s\S]*?)(?=\n\n(?:COMPUTER|EXPERIENCE|SKILLS|PROJECTS|$))/i);
      if (eduMatch && eduMatch[1]) {
        blocks.push({
          id: "education-custom",
          type: "custom",
          enabled: true,
          order: order++,
          data: {
            title: "EDUCATION",
            content: eduMatch[1].trim(),
          },
        } as any);
      }
    }
  }

  // Summary block - use professionalSummary first, then fallback to sections
  if (tailored.professionalSummary) {
    blocks.push({
      id: "summary-1",
      type: "summary",
      enabled: true,
      order: order++,
      data: {
        text: tailored.professionalSummary,
      },
    } as any);
  } else {
    const summarySection = tailored.sections?.find(
      (s) =>
        s.title.toLowerCase().includes("summary") ||
        s.title.toLowerCase().includes("objective")
    );
    if (summarySection) {
      blocks.push({
        id: "summary-1",
        type: "summary",
        enabled: true,
        order: order++,
        data: {
          text: summarySection.content,
        },
      } as any);
    }
  }

  // Experience block - use structured data or fallback to sections
  if (tailored.experience && tailored.experience.length > 0) {
    blocks.push({
      id: "experience-1",
      type: "experience",
      enabled: true,
      order: order++,
      data: {
        entries: tailored.experience.map((exp) => ({
          id: exp.id,
          enabled: true,
          company: exp.company,
          position: exp.position,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          bullets: exp.bullets || [],
        })),
      },
    } as any);
  } else {
    // Fallback: combine all EXPERIENCE sections or parse from fullText
    const expSections = tailored.sections?.filter(
      (s) => s.title.toUpperCase().includes("EXPERIENCE")
    );
    if (expSections && expSections.length > 0) {
      // Combine all experience sections
      const combinedContent = expSections.map((s) => s.content).join("\n\n");
      blocks.push({
        id: "experience-custom",
        type: "custom",
        enabled: true,
        order: order++,
        data: {
          title: "EXPERIENCE",
          content: combinedContent,
        },
      } as any);
    } else if (tailored.fullText) {
      // Try to extract EXPERIENCE section from fullText
      const expMatch = tailored.fullText.match(/EXPERIENCE\s+([\s\S]*?)(?=\n\n(?:PROJECTS|SKILLS|EDUCATION|$))/i);
      if (expMatch && expMatch[1]) {
        blocks.push({
          id: "experience-custom",
          type: "custom",
          enabled: true,
          order: order++,
          data: {
            title: "EXPERIENCE",
            content: expMatch[1].trim(),
          },
        } as any);
      }
    }
  }

  // Skills block - use structured data or fallback to sections
  if (tailored.skills) {
    blocks.push({
      id: "skills-1",
      type: "skills",
      enabled: true,
      order: order++,
      data: {
        format: tailored.skills.format || "list",
        skills: tailored.skills.skills,
        categories: tailored.skills.categories,
      },
    } as any);
  } else {
    // Fallback: create custom block from SKILLS section
    const skillsSection = tailored.sections?.find(
      (s) =>
        s.title.toUpperCase().includes("SKILL") ||
        s.title.toUpperCase().includes("COMPUTER KNOWLEDGE")
    );
    if (skillsSection && skillsSection.content) {
      blocks.push({
        id: "skills-custom",
        type: "custom",
        enabled: true,
        order: order++,
        data: {
          title: skillsSection.title.toUpperCase(),
          content: skillsSection.content,
        },
      } as any);
    }
  }

  // Projects block - use structured data or fallback to sections
  if (tailored.projects && tailored.projects.length > 0) {
    blocks.push({
      id: "projects-1",
      type: "projects",
      enabled: true,
      order: order++,
      data: {
        entries: tailored.projects.map((proj) => ({
          id: proj.id,
          enabled: true,
          name: proj.name,
          description: proj.description,
          technologies: proj.technologies,
          url: proj.url,
          bullets: proj.bullets || [],
        })),
      },
    } as any);
  } else {
    // Fallback: create custom block from PROJECTS section or parse from fullText
    const projSection = tailored.sections?.find(
      (s) => s.title.toUpperCase().includes("PROJECT")
    );
    if (projSection && projSection.content) {
      blocks.push({
        id: "projects-custom",
        type: "custom",
        enabled: true,
        order: order++,
        data: {
          title: "PROJECTS",
          content: projSection.content,
        },
      } as any);
    } else if (tailored.fullText) {
      // Try to extract PROJECTS section from fullText
      const projMatch = tailored.fullText.match(/PROJECTS\s+([\s\S]*?)(?=\n\n(?:EXPERIENCE|SKILLS|EDUCATION|$))/i);
      if (projMatch && projMatch[1]) {
        blocks.push({
          id: "projects-custom",
          type: "custom",
          enabled: true,
          order: order++,
          data: {
            title: "PROJECTS",
            content: projMatch[1].trim(),
          },
        } as any);
      }
    }
  }

  return {
    blocks,
    metadata: {
      targetJob: job.title,
      targetCompany: job.company,
    },
  };
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { tailoredResume, jobDescription } = body;

    if (!tailoredResume || !jobDescription) {
      return NextResponse.json(
        { error: "tailoredResume and jobDescription are required" },
        { status: 400 }
      );
    }

    // Convert to ResumeDocument
    const document = tailoredResumeToDocument(tailoredResume, jobDescription);

    // Ensure we have at least some blocks
    if (document.blocks.length === 0) {
      // Fallback: create a simple text block from fullText
      document.blocks.push({
        id: "fulltext-fallback",
        type: "custom",
        enabled: true,
        order: 0,
        data: {
          title: "RESUME",
          content: tailoredResume.fullText || "No resume content available",
        },
      } as any);
    }

    // Generate PDF using React.createElement
    const pdfElement = React.createElement(ResumePDFServer, { document });
    // Cast to any to satisfy react-pdf's type expectations
    const pdfBuffer = await renderToBuffer(pdfElement as any);

    // Return PDF as response
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume-${jobDescription.company || "tailored"}.pdf"`,
      },
    });
  } catch (error) {
    logError("api/resume/generate-pdf", "PDF generation error", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
