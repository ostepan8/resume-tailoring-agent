import { NextRequest, NextResponse } from "next/server";
import { createLogger, logError } from "@/lib/logger";
import { aiRateLimiter, applyRateLimit } from "@/lib/rate-limit";
import { getUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("api/resume/parse");

// Mock mode for testing
// Use NEXT_PUBLIC_USE_MOCK for consistency with frontend
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function POST(request: NextRequest) {
  // Rate limiting for file parsing operations
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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    let rawText = "";

    // For PDF files, we need to parse them
    if (file.type === "application/pdf") {
      try {
        // Dynamically import pdf-parse to avoid issues with edge runtime
        const pdfParse = (await import("pdf-parse")).default;
        
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text;
      } catch (pdfError) {
        logError("api/resume/parse", "PDF parse error", pdfError);
        return NextResponse.json(
          { error: "Failed to parse PDF. Please try pasting your resume text instead." },
          { status: 422 }
        );
      }
    } else if (file.type === "text/plain") {
      // For text files, just read the content
      rawText = await file.text();
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or TXT file." },
        { status: 400 }
      );
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from the file. Please try a different file." },
        { status: 422 }
      );
    }

    // Now call the structured parser to extract structured data
    const baseUrl = request.nextUrl.origin;
    
    // Forward the authorization header to the internal API call
    const authHeader = request.headers.get("authorization");
    
    try {
      const structuredResponse = await fetch(`${baseUrl}/api/resume/parse-structured`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(authHeader ? { "Authorization": authHeader } : {}),
        },
        body: JSON.stringify({ text: rawText }),
      });

      if (structuredResponse.ok) {
        const structuredData = await structuredResponse.json();
        
        // Return the fully structured resume
        return NextResponse.json({
          // Raw text for backwards compat
          text: rawText,
          fullText: rawText,
          
          // Structured data
          contactInfo: structuredData.contactInfo || {},
          experience: structuredData.experience || [],
          education: structuredData.education || [],
          skills: structuredData.skills || [],
          projects: structuredData.projects || [],
          sections: structuredData.sections || [
            { title: "Resume", content: rawText, order: 0 }
          ],
        });
      }
    } catch (structuredError) {
      log("Structured parsing failed, falling back to basic");
    }

    // Fallback: return basic parsed data if structured parsing fails
    return NextResponse.json({
      text: rawText,
      fullText: rawText,
      sections: [{ title: "Resume", content: rawText, order: 0 }],
      contactInfo: {},
      experience: [],
      education: [],
      skills: [],
      projects: [],
    });
  } catch (error) {
    logError("api/resume/parse", "Resume parse error", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}
