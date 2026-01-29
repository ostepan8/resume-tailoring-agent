/**
 * Test script for job parsing with Subconscious
 * 
 * Usage: node scripts/test-job-parse-simple.mjs
 * 
 * Tests the job parsing functionality using tim-gpt engine
 * with the webpage_understanding tool.
 */

import { Subconscious } from "subconscious";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env.local") });

const TEST_URL = "https://careers.toasttab.com/jobs/senior-software-engineer-new-ventures-boston-massachusetts-united-states-7d480f56-152b-456b-8d1b-1b8f0f66b777";

// Simpler, more direct prompt
const PROMPT = `Read this job posting and extract the key information: ${TEST_URL}

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

async function testJobParse() {
  console.log("🚀 Simple Job Parse Test\n");
  console.log("URL:", TEST_URL);
  console.log("-".repeat(60));

  const apiKey = process.env.SUBCONSCIOUS_API_KEY;
  if (!apiKey) {
    console.error("❌ SUBCONSCIOUS_API_KEY not found");
    process.exit(1);
  }

  const client = new Subconscious({ apiKey });
  const startTime = Date.now();

  try {
    console.log("Starting run...");
    
    const run = await client.run({
      engine: "tim-gpt-heavy",
      input: {
        instructions: PROMPT,
        tools: [
          { type: "platform", id: "webpage_understanding", options: {} },
        ],
      },
    });

    console.log(`Run ID: ${run.runId}`);
    console.log("Polling...\n");

    let attempts = 0;
    const maxAttempts = 90; // 3 minutes
    let finalRun = run;

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;
      finalRun = await client.get(run.runId);
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r[${elapsed}s] Status: ${finalRun.status}    `);

      if (finalRun.status === "succeeded" || finalRun.status === "failed") {
        console.log("\n");
        break;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Completed in ${elapsed}s`);
    console.log("-".repeat(60));

    if (finalRun.status === "succeeded" && finalRun.result?.answer) {
      console.log("\n✅ SUCCESS!\n");
      console.log("Answer:");
      console.log(finalRun.result.answer);
    } else {
      console.log("\n❌ FAILED or No Answer");
      console.log(JSON.stringify(finalRun, null, 2));
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

testJobParse();
