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

const log = createLogger("api/resume/parse-structured");

// Mock mode for testing without API calls
// Use NEXT_PUBLIC_USE_MOCK for consistency with frontend
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const PARSING_PROMPT = `You are an expert resume parser. Extract structured data from the resume text below.

## RESUME TEXT
{resumeText}

## YOUR TASK
Parse the resume and return a JSON object with the following structure. Extract ALL information - do not skip any details.

{
  "contactInfo": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "(123) 456-7890",
    "location": "City, State",
    "linkedin": "linkedin.com/in/username",
    "github": "github.com/username",
    "website": "example.com"
  },
  "experience": [
    {
      "id": "exp-1",
      "company": "Company Name",
      "position": "Job Title",
      "location": "City, State",
      "startDate": "Month Year",
      "endDate": "Month Year or null if current",
      "bullets": [
        "First bullet point describing achievement",
        "Second bullet point"
      ]
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "institution": "University Name",
      "degree": "B.S.",
      "field": "Computer Science",
      "location": "City, State",
      "startDate": "Year",
      "endDate": "Year or Expected Year",
      "gpa": "3.8",
      "highlights": ["Dean's List", "Relevant coursework"]
    }
  ],
  "skills": {
    "format": "categorized",
    "categories": [
      { "name": "Languages", "skills": ["Python", "JavaScript"] },
      { "name": "Frameworks", "skills": ["React", "Node.js"] },
      { "name": "Tools", "skills": ["Git", "Docker"] }
    ]
  },
  "projects": [
    {
      "id": "proj-1",
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["React", "Node.js"],
      "url": "github.com/project",
      "startDate": "Month Year",
      "endDate": "Month Year",
      "bullets": [
        "What you built or achieved"
      ]
    }
  ],
  "sections": [
    { "title": "Experience", "content": "Raw text content", "order": 0 },
    { "title": "Education", "content": "Raw text content", "order": 1 }
  ]
}

## RULES
1. Extract ALL experience entries, education entries, projects
2. Parse each bullet point separately into the bullets array
3. For skills, try to categorize them (Languages, Frameworks, Tools, etc.)
4. If a field is not present, omit it (don't include null or empty strings)
5. Generate unique IDs for each entry (exp-1, exp-2, edu-1, proj-1, etc.)
6. Keep date formats consistent (e.g., "Jan 2024", "May 2025")
7. Return ONLY valid JSON, no markdown code blocks

Return the JSON object now:`;

// Mock structured resume data
const MOCK_PARSED_RESUME = {
  contactInfo: {
    name: "Owen H. Stepan",
    email: "stepan.o@northeastern.edu",
    phone: "(312) 982-9808",
    location: "Chicago, IL",
    linkedin: "linkedin.com/in/owenstepan",
    github: "github.com/owenstepan",
  },
  experience: [
    {
      id: "exp-1",
      company: "Ahold Delhaize",
      position: "Mobile Application Engineer Co-op",
      location: "Quincy, MA",
      startDate: "Jan 2025",
      endDate: "Jun 2025",
      bullets: [
        "Engineered a comprehensive JUnit 5 testing framework for a distributed, multi-module Android application using Kotlin",
        "Partnered closely with engineers across teams to deliver reusable Jetpack Compose components aligned with architectural standards",
        "Redesigned a Node.js and MongoDB backend integration for a React Native audit application",
      ],
    },
    {
      id: "exp-2",
      company: "Code4Community",
      position: "Developer",
      location: "Boston, MA",
      startDate: "Sep 2024",
      endDate: undefined,
      bullets: [
        "Led backend and API development for ShelterLink, a React Native and Nest.js application supporting LGBTQ+ housing safety",
        "Collaborated with cross-functional partners to design and implement secure APIs and real-time data flows",
      ],
    },
    {
      id: "exp-3",
      company: "Feed Tech LLC",
      position: "CEO & Full-Stack Developer",
      location: "Chicago, IL",
      startDate: "Dec 2022",
      endDate: undefined,
      bullets: [
        "Founded and built 'Feed Official', a full-stack, event-driven social platform using the MERN stack",
        "Designed and maintained a scalable backend architecture with Node.js, Express, and MongoDB",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      institution: "Northeastern University",
      degree: "B.S.",
      field: "Computer Science",
      location: "Boston, MA",
      endDate: "May 2027",
      gpa: "3.85",
      highlights: ["Dean's List (3x)", "Khoury College of Computer Sciences"],
    },
  ],
  skills: {
    format: "categorized" as const,
    categories: [
      {
        name: "Languages",
        skills: ["TypeScript", "JavaScript", "Kotlin", "Java", "Python", "C", "C++", "C#", "HTML", "CSS"],
      },
      {
        name: "Frameworks & Tools",
        skills: ["React.js", "React Native", "Next.js", "Nest.js", "Express.js", "MongoDB", "PostgreSQL", "Tailwind"],
      },
      {
        name: "DevOps & Tools",
        skills: ["Git", "Vercel", "CI/CD", "SonarQube", "JaCoCo"],
      },
    ],
  },
  projects: [
    {
      id: "proj-1",
      name: "Quill Programming Language Compiler",
      startDate: "Aug 2025",
      endDate: "Sep 2025",
      technologies: ["C++17", "LLVM"],
      bullets: [
        "Designed and implemented a full C++17 compiler pipeline including lexing, parsing, and LLVM IR generation",
        "Built custom LLVM optimization passes achieving a 4.1x average performance improvement",
      ],
    },
    {
      id: "proj-2",
      name: "JARVIS AI Companion",
      startDate: "Jun 2024",
      endDate: undefined,
      technologies: ["Python", "OpenAI", "ElevenLabs", "MongoDB"],
      bullets: [
        "Built an AI-powered personal assistant integrating OpenAI Whisper, ElevenLabs, and MongoDB",
        "Engineered backend workflows and user profiling systems for context-aware responses",
      ],
    },
    {
      id: "proj-3",
      name: "Sports Arbitrage Algorithm",
      startDate: "Apr 2024",
      endDate: undefined,
      technologies: ["Python", "APIs"],
      bullets: [
        "Developed a multi-threaded Python backend system to analyze real-time betting odds",
        "Achieved $1,500 net profit within two months of MVP deployment",
      ],
    },
  ],
  sections: [
    { title: "Experience", content: "Work experience entries", order: 0 },
    { title: "Education", content: "Education entries", order: 1 },
    { title: "Skills", content: "Technical skills", order: 2 },
    { title: "Projects", content: "Personal and academic projects", order: 3 },
  ],
};

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Resume text is required" },
        { status: 400 }
      );
    }

    // Mock mode - return structured mock data
    if (USE_MOCK) {
      log("[MOCK MODE] Returning mock structured resume");
      return NextResponse.json({
        ...MOCK_PARSED_RESUME,
        fullText: text,
      });
    }

    // Real AI parsing
    const client = getAIClient();
    const prompt = PARSING_PROMPT.replace("{resumeText}", text);

    const run = await client.run({
      engine: DEFAULT_ENGINE,
      input: {
        instructions: prompt,
        tools: [],
      },
    });

    // Poll for completion (max 2 minutes for parsing)
    const maxWaitMs = 120000;
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
      logError("api/resume/parse-structured", "Parsing failed", finalRun.status);
      // Return basic fallback
      return NextResponse.json({
        fullText: text,
        sections: [{ title: "Resume", content: text, order: 0 }],
        contactInfo: {},
      });
    }

    // Parse the AI response
    let parsed;
    try {
      const answer = finalRun.result.answer;
      if (typeof answer === "string") {
        const cleaned = answer
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } else {
        parsed = answer;
      }
    } catch (parseError) {
      logError("api/resume/parse-structured", "Failed to parse AI response", parseError);
      return NextResponse.json({
        fullText: text,
        sections: [{ title: "Resume", content: text, order: 0 }],
        contactInfo: {},
      });
    }

    return NextResponse.json({
      ...parsed,
      fullText: text,
    });
  } catch (error) {
    logError("api/resume/parse-structured", "Structured parse error", error);
    return NextResponse.json(
      { error: "Failed to parse resume" },
      { status: 500 }
    );
  }
}
