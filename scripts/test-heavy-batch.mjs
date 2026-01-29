/**
 * Batch test for tim-gpt-heavy engine with structured JSON output
 * Runs 10 tasks that require JSON responses
 */

import { Subconscious } from "subconscious";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env.local") });

const TASKS = [
  { 
    id: 1, 
    prompt: "Add 15 + 27. Return JSON: {\"result\": <number>}",
    validate: (json) => json.result === 42
  },
  { 
    id: 2, 
    prompt: "What is the capital of France? Return JSON: {\"city\": \"<name>\", \"country\": \"France\"}",
    validate: (json) => json.city === "Paris" && json.country === "France"
  },
  { 
    id: 3, 
    prompt: "List 3 programming languages. Return JSON: {\"languages\": [\"<lang1>\", \"<lang2>\", \"<lang3>\"]}",
    validate: (json) => Array.isArray(json.languages) && json.languages.length === 3
  },
  { 
    id: 4, 
    prompt: "Mix red and blue colors. Return JSON: {\"color1\": \"red\", \"color2\": \"blue\", \"result\": \"<color>\"}",
    validate: (json) => json.result?.toLowerCase() === "purple"
  },
  { 
    id: 5, 
    prompt: "How many days in a leap year? Return JSON: {\"days\": <number>, \"isLeapYear\": true}",
    validate: (json) => json.days === 366 && json.isLeapYear === true
  },
  { 
    id: 6, 
    prompt: "Give the chemical symbol for gold. Return JSON: {\"element\": \"Gold\", \"symbol\": \"<symbol>\", \"atomicNumber\": 79}",
    validate: (json) => json.symbol === "Au" && json.atomicNumber === 79
  },
  { 
    id: 7, 
    prompt: "Name 2 planets. Return JSON: {\"planets\": [{\"name\": \"<planet1>\"}, {\"name\": \"<planet2>\"}]}",
    validate: (json) => Array.isArray(json.planets) && json.planets.length === 2 && json.planets[0].name && json.planets[1].name
  },
  { 
    id: 8, 
    prompt: "Calculate 100 / 4. Return JSON: {\"dividend\": 100, \"divisor\": 4, \"quotient\": <number>}",
    validate: (json) => json.quotient === 25 && json.dividend === 100
  },
  { 
    id: 9, 
    prompt: "What language is spoken in Brazil? Return JSON: {\"country\": \"Brazil\", \"language\": \"<lang>\", \"continent\": \"South America\"}",
    validate: (json) => json.language === "Portuguese" && json.country === "Brazil"
  },
  { 
    id: 10, 
    prompt: "Give antonym of 'hot'. Return JSON: {\"word\": \"hot\", \"antonym\": \"<word>\", \"category\": \"temperature\"}",
    validate: (json) => json.antonym?.toLowerCase() === "cold"
  },
];

async function runTask(client, task) {
  const startTime = Date.now();
  
  try {
    const run = await client.run({
      engine: "tim-gpt-heavy",
      input: {
        instructions: task.prompt + "\n\nReturn ONLY the JSON object, no markdown, no explanation.",
        tools: [],
        
      },
    });

    // Poll for completion
    let finalRun = run;
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      finalRun = await client.get(run.runId);
      
      if (finalRun.status === "succeeded" || finalRun.status === "failed") {
        break;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (finalRun.status === "succeeded" && finalRun.result?.answer) {
      // Try to parse JSON from answer
      let answer = finalRun.result.answer;
      
      // Clean up markdown code blocks if present
      if (typeof answer === "string") {
        answer = answer
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
      }

      try {
        const json = typeof answer === "string" ? JSON.parse(answer) : answer;
        const valid = task.validate(json);
        
        return {
          id: task.id,
          success: true,
          valid,
          time: elapsed,
          json,
        };
      } catch (parseErr) {
        return {
          id: task.id,
          success: false,
          time: elapsed,
          error: "JSON parse failed",
          raw: answer.substring(0, 100),
        };
      }
    } else {
      return {
        id: task.id,
        success: false,
        time: elapsed,
        error: finalRun.status,
      };
    }
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    return {
      id: task.id,
      success: false,
      time: elapsed,
      error: error.message,
    };
  }
}

async function main() {
  console.log("🚀 Batch Test: tim-gpt-heavy (JSON Output)\n");
  console.log("=".repeat(70));

  const apiKey = process.env.SUBCONSCIOUS_API_KEY;
  if (!apiKey) {
    console.error("❌ SUBCONSCIOUS_API_KEY not found");
    process.exit(1);
  }

  const client = new Subconscious({ apiKey });
  const results = [];
  const overallStart = Date.now();

  // Run tasks sequentially
  for (const task of TASKS) {
    process.stdout.write(`[${task.id}/10] Testing... `);
    const result = await runTask(client, task);
    results.push(result);
    
    if (result.success && result.valid) {
      console.log(`✅ ${result.time}s → ${JSON.stringify(result.json).substring(0, 50)}...`);
    } else if (result.success && !result.valid) {
      console.log(`⚠️  ${result.time}s → JSON valid but wrong values: ${JSON.stringify(result.json).substring(0, 40)}`);
    } else {
      console.log(`❌ ${result.time}s → ${result.error}`);
    }
  }

  const overallTime = ((Date.now() - overallStart) / 1000).toFixed(1);
  const successCount = results.filter(r => r.success).length;
  const validCount = results.filter(r => r.success && r.valid).length;
  const avgTime = (results.reduce((sum, r) => sum + parseFloat(r.time), 0) / results.length).toFixed(1);

  console.log("\n" + "=".repeat(70));
  console.log(`📊 JSON Parsed: ${successCount}/10`);
  console.log(`✓  Values Valid: ${validCount}/10`);
  console.log(`⏱️  Total time: ${overallTime}s`);
  console.log(`📈 Avg per task: ${avgTime}s`);
  console.log("=".repeat(70));

  if (validCount === 10) {
    console.log("\n✅ All JSON tests passed with correct values!");
  } else if (successCount === 10) {
    console.log("\n⚠️  All JSON parsed but some values incorrect");
  } else {
    console.log("\n❌ Some JSON parsing failed!");
    process.exit(1);
  }
}

main();
