/**
 * Full E2E test for the resume tailoring flow
 * Tests: Job parsing, Resume parsing, and Full tailoring
 */

import { Subconscious } from "subconscious";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env.local") });

const ENGINE = "tim-gpt-heavy";

// Sample resume for testing
const SAMPLE_RESUME = {
  fullText: `John Doe
Software Engineer
john.doe@email.com | (555) 123-4567 | San Francisco, CA
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe

SUMMARY
Experienced software engineer with 5+ years building web applications and distributed systems. 
Strong background in JavaScript, Python, and cloud technologies. Passionate about clean code and scalable architecture.

EXPERIENCE

Senior Software Engineer | TechCorp Inc. | 2021 - Present
• Led development of microservices architecture serving 10M+ users
• Reduced API response times by 40% through optimization and caching
• Mentored 3 junior developers and conducted code reviews
• Implemented CI/CD pipelines using GitHub Actions and AWS

Software Engineer | StartupXYZ | 2019 - 2021
• Built real-time data pipeline processing 1M events/day
• Developed React dashboard for analytics visualization
• Collaborated with product team to define feature requirements
• Maintained 99.9% uptime for production services

EDUCATION

B.S. Computer Science | Stanford University | 2019
GPA: 3.8/4.0

SKILLS
Languages: JavaScript, TypeScript, Python, Java, SQL
Frameworks: React, Node.js, Express, Django, FastAPI
Cloud: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes
Tools: Git, GitHub Actions, Jenkins, Terraform`,
  sections: [
    { title: "Summary", content: "Experienced software engineer with 5+ years building web applications and distributed systems. Strong background in JavaScript, Python, and cloud technologies.", order: 0 },
    { title: "Experience", content: "Senior Software Engineer at TechCorp Inc (2021-Present), Software Engineer at StartupXYZ (2019-2021)", order: 1 },
    { title: "Education", content: "B.S. Computer Science, Stanford University, 2019", order: 2 },
    { title: "Skills", content: "JavaScript, TypeScript, Python, Java, React, Node.js, AWS, Docker, Kubernetes", order: 3 },
  ],
  contactInfo: {
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "(555) 123-4567",
    location: "San Francisco, CA",
  },
  skills: ["JavaScript", "TypeScript", "Python", "Java", "React", "Node.js", "AWS", "Docker", "Kubernetes"],
};

// Sample job description
const SAMPLE_JOB = {
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

async function pollForCompletion(client, runId, maxWaitMs = 180000, pollIntervalMs = 2000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));
    const run = await client.get(runId);
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\r  [${elapsed}s] Status: ${run.status}    `);
    
    if (run.status === "succeeded" || run.status === "failed") {
      console.log("");
      return run;
    }
  }
  
  console.log("");
  return { status: "timeout" };
}

async function testJobParsing(client) {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 1: Job Description Parsing");
  console.log("=".repeat(70));
  
  const prompt = `Parse this job description and extract key information.

JOB:
${SAMPLE_JOB.fullText}

Return ONLY a JSON object:
{
  "title": "Job title",
  "company": "Company name",
  "requirements": ["requirement 1", "requirement 2"],
  "responsibilities": ["responsibility 1", "responsibility 2"],
  "keywords": ["keyword 1", "keyword 2"]
}`;

  console.log("  Starting job parsing...");
  const startTime = Date.now();

  const run = await client.run({
    engine: ENGINE,
    input: { instructions: prompt, tools: [] },
  });

  console.log(`  Run ID: ${run.runId}`);
  const finalRun = await pollForCompletion(client, run.runId);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (finalRun.status === "succeeded" && finalRun.result?.answer) {
    try {
      const answer = typeof finalRun.result.answer === "string" 
        ? JSON.parse(finalRun.result.answer.replace(/```json\n?/g, "").replace(/```\n?/g, ""))
        : finalRun.result.answer;
      
      console.log(`  ✅ SUCCESS (${elapsed}s)`);
      console.log(`  Title: ${answer.title}`);
      console.log(`  Requirements: ${answer.requirements?.length || 0} found`);
      console.log(`  Keywords: ${answer.keywords?.slice(0, 5).join(", ")}...`);
      return { success: true, result: answer };
    } catch (e) {
      console.log(`  ❌ FAILED - JSON parse error`);
      return { success: false, error: "JSON parse error" };
    }
  } else {
    console.log(`  ❌ FAILED - ${finalRun.status}`);
    return { success: false, error: finalRun.status };
  }
}

async function testResumeParsing(client) {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 2: Resume Text Extraction");
  console.log("=".repeat(70));
  
  const prompt = `Extract structured information from this resume.

RESUME:
${SAMPLE_RESUME.fullText}

Return ONLY a JSON object:
{
  "name": "Full name",
  "email": "Email address",
  "skills": ["skill1", "skill2"],
  "experience": [{"company": "Company", "title": "Title", "years": "Duration"}],
  "education": [{"school": "School", "degree": "Degree", "year": "Year"}]
}`;

  console.log("  Starting resume parsing...");
  const startTime = Date.now();

  const run = await client.run({
    engine: ENGINE,
    input: { instructions: prompt, tools: [] },
  });

  console.log(`  Run ID: ${run.runId}`);
  const finalRun = await pollForCompletion(client, run.runId);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (finalRun.status === "succeeded" && finalRun.result?.answer) {
    try {
      const answer = typeof finalRun.result.answer === "string" 
        ? JSON.parse(finalRun.result.answer.replace(/```json\n?/g, "").replace(/```\n?/g, ""))
        : finalRun.result.answer;
      
      console.log(`  ✅ SUCCESS (${elapsed}s)`);
      console.log(`  Name: ${answer.name}`);
      console.log(`  Email: ${answer.email}`);
      console.log(`  Skills: ${answer.skills?.length || 0} found`);
      console.log(`  Experience: ${answer.experience?.length || 0} positions`);
      return { success: true, result: answer };
    } catch (e) {
      console.log(`  ❌ FAILED - JSON parse error`);
      return { success: false, error: "JSON parse error" };
    }
  } else {
    console.log(`  ❌ FAILED - ${finalRun.status}`);
    return { success: false, error: finalRun.status };
  }
}

async function testResumeTailoring(client) {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 3: Full Resume Tailoring");
  console.log("=".repeat(70));
  
  const prompt = `You are an expert resume tailoring assistant. Tailor this resume for the job.

## RULES
1. NEVER invent experience or skills not in the original
2. Reframe existing content to match job requirements
3. Add relevant keywords naturally
4. Preserve all factual information

## RESUME
${SAMPLE_RESUME.fullText}

## JOB
Title: ${SAMPLE_JOB.title}
Company: ${SAMPLE_JOB.company}
${SAMPLE_JOB.fullText}

Keywords: ${SAMPLE_JOB.keywords.join(", ")}

## OUTPUT
Return ONLY a JSON object:
{
  "fullText": "Complete tailored resume text",
  "summary": {
    "totalChanges": 5,
    "keyImprovements": ["improvement 1", "improvement 2"],
    "keywordsAdded": ["keyword1", "keyword2"]
  },
  "matchScore": 85
}`;

  console.log("  Starting resume tailoring (this takes ~30-60s)...");
  const startTime = Date.now();

  const run = await client.run({
    engine: ENGINE,
    input: { instructions: prompt, tools: [] },
  });

  console.log(`  Run ID: ${run.runId}`);
  const finalRun = await pollForCompletion(client, run.runId, 300000); // 5 min timeout for tailoring

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (finalRun.status === "succeeded" && finalRun.result?.answer) {
    try {
      const answer = typeof finalRun.result.answer === "string" 
        ? JSON.parse(finalRun.result.answer.replace(/```json\n?/g, "").replace(/```\n?/g, ""))
        : finalRun.result.answer;
      
      console.log(`  ✅ SUCCESS (${elapsed}s)`);
      console.log(`  Match Score: ${answer.matchScore}%`);
      console.log(`  Total Changes: ${answer.summary?.totalChanges || 0}`);
      console.log(`  Improvements: ${answer.summary?.keyImprovements?.slice(0, 3).join(", ")}...`);
      console.log(`  Keywords Added: ${answer.summary?.keywordsAdded?.join(", ")}`);
      
      // Show a snippet of the tailored resume
      if (answer.fullText) {
        console.log("\n  --- Tailored Resume Preview (first 500 chars) ---");
        console.log("  " + answer.fullText.substring(0, 500).replace(/\n/g, "\n  ") + "...");
      }
      
      return { success: true, result: answer };
    } catch (e) {
      console.log(`  ❌ FAILED - JSON parse error: ${e.message}`);
      console.log(`  Raw answer: ${finalRun.result.answer.substring(0, 200)}...`);
      return { success: false, error: "JSON parse error" };
    }
  } else {
    console.log(`  ❌ FAILED - ${finalRun.status}`);
    return { success: false, error: finalRun.status };
  }
}

async function main() {
  console.log("🚀 Resume Tailoring E2E Test Suite");
  console.log("Engine: " + ENGINE);
  console.log("=".repeat(70));

  const apiKey = process.env.SUBCONSCIOUS_API_KEY;
  if (!apiKey) {
    console.error("❌ SUBCONSCIOUS_API_KEY not found in .env.local");
    process.exit(1);
  }
  console.log("✅ API Key found");

  const client = new Subconscious({ apiKey });
  const results = [];
  const overallStart = Date.now();

  // Run all tests
  results.push(await testJobParsing(client));
  results.push(await testResumeParsing(client));
  results.push(await testResumeTailoring(client));

  // Summary
  const overallTime = ((Date.now() - overallStart) / 1000).toFixed(1);
  const successCount = results.filter(r => r.success).length;

  console.log("\n" + "=".repeat(70));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(70));
  console.log(`  Tests Passed: ${successCount}/3`);
  console.log(`  Total Time: ${overallTime}s`);
  console.log("=".repeat(70));

  if (successCount === 3) {
    console.log("\n✅ ALL TESTS PASSED! Tailoring flow is working correctly.");
  } else {
    console.log("\n❌ SOME TESTS FAILED. Check logs above for details.");
    process.exit(1);
  }
}

main();
