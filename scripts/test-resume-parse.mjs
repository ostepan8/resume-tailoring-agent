#!/usr/bin/env node
/**
 * Test Resume Parse Flow
 * 
 * Tests the full resume parsing pipeline by calling the local API:
 * 1. Upload PDF to /api/resume/parse
 * 2. Display results
 * 
 * Usage:
 *   node scripts/test-resume-parse.mjs [path-to-pdf]
 * 
 * Make sure the dev server is running on localhost:3000
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(msg, color = '') {
  console.log(`${color}${msg}${COLORS.reset}`);
}

function logSection(title) {
  console.log();
  log(`━━━ ${title} ━━━`, COLORS.cyan + COLORS.bright);
}

function logSuccess(msg) {
  log(`✓ ${msg}`, COLORS.green);
}

function logError(msg) {
  log(`✗ ${msg}`, COLORS.red);
}

function logInfo(msg) {
  log(`ℹ ${msg}`, COLORS.blue);
}

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function main() {
  logSection('Resume Parse Test');
  
  logInfo(`API Base: ${API_BASE}`);

  // Get PDF path from args or show usage
  const pdfPath = process.argv[2];
  
  if (!pdfPath) {
    logError('No PDF path provided');
    logInfo('Usage: node scripts/test-resume-parse.mjs <path-to-pdf>');
    logInfo('Example: node scripts/test-resume-parse.mjs ~/Desktop/resume.pdf');
    process.exit(1);
  }
  
  const resolvedPath = path.resolve(pdfPath);
  
  if (!fs.existsSync(resolvedPath)) {
    logError(`PDF file not found: ${resolvedPath}`);
    process.exit(1);
  }
  
  logSuccess(`PDF file: ${path.basename(resolvedPath)}`);
  
  const fileBuffer = fs.readFileSync(resolvedPath);
  const fileSize = (fileBuffer.length / 1024).toFixed(1);
  logInfo(`File size: ${fileSize} KB`);

  // Step 1: Call the parse API
  logSection('Step 1: Upload to /api/resume/parse');
  
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  formData.append('file', blob, path.basename(resolvedPath));
  
  logInfo('Sending to parse API...');
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/resume/parse`, {
      method: 'POST',
      body: formData,
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (!response.ok) {
      const errorText = await response.text();
      logError(`API returned ${response.status}: ${errorText}`);
      process.exit(1);
    }
    
    const parsed = await response.json();
    logSuccess(`Response received in ${elapsed}s`);
    
    // Step 2: Display results
    logSection('Results Summary');
    
    // Contact Info
    if (parsed.contactInfo && Object.keys(parsed.contactInfo).length > 0) {
      log('\n📇 Contact Info:', COLORS.bright);
      Object.entries(parsed.contactInfo).forEach(([key, value]) => {
        if (value) log(`   ${key}: ${value}`);
      });
    } else {
      logError('No contact info extracted');
    }
    
    // Experience
    if (parsed.experience?.length) {
      log(`\n💼 Experience (${parsed.experience.length}):`, COLORS.bright);
      parsed.experience.forEach((exp, i) => {
        log(`   ${i + 1}. ${exp.position || exp.title} at ${exp.company}`);
        log(`      ${exp.startDate} - ${exp.endDate || 'Present'}`, COLORS.dim);
        if (exp.bullets?.length) {
          log(`      ${exp.bullets.length} bullet points`, COLORS.dim);
        }
      });
    } else {
      logError('No experience extracted');
    }
    
    // Education
    if (parsed.education?.length) {
      log(`\n🎓 Education (${parsed.education.length}):`, COLORS.bright);
      parsed.education.forEach((edu, i) => {
        log(`   ${i + 1}. ${edu.degree} ${edu.field ? `in ${edu.field}` : ''}`);
        log(`      ${edu.institution}`, COLORS.dim);
        if (edu.gpa) log(`      GPA: ${edu.gpa}`, COLORS.dim);
      });
    } else {
      logError('No education extracted');
    }
    
    // Skills
    if (parsed.skills) {
      log('\n🛠️  Skills:', COLORS.bright);
      if (parsed.skills.categories) {
        let totalSkills = 0;
        parsed.skills.categories.forEach(cat => {
          log(`   ${cat.name}: ${cat.skills.join(', ')}`);
          totalSkills += cat.skills.length;
        });
        logSuccess(`Total: ${totalSkills} skills in ${parsed.skills.categories.length} categories`);
      } else if (Array.isArray(parsed.skills)) {
        log(`   ${parsed.skills.join(', ')}`);
        logSuccess(`Total: ${parsed.skills.length} skills`);
      }
    } else {
      logError('No skills extracted');
    }
    
    // Projects
    if (parsed.projects?.length) {
      log(`\n🚀 Projects (${parsed.projects.length}):`, COLORS.bright);
      parsed.projects.forEach((proj, i) => {
        log(`   ${i + 1}. ${proj.name}`);
        if (proj.technologies?.length) {
          log(`      Tech: ${proj.technologies.join(', ')}`, COLORS.dim);
        }
        if (proj.bullets?.length) {
          log(`      ${proj.bullets.length} bullet points`, COLORS.dim);
        }
      });
    } else {
      logError('No projects extracted');
    }
    
    // Final Summary
    logSection('Final Summary');
    
    const skillCount = parsed.skills?.categories?.reduce((acc, c) => acc + c.skills.length, 0) || 
                      (Array.isArray(parsed.skills) ? parsed.skills.length : 0);
    
    const summary = {
      experience: parsed.experience?.length || 0,
      education: parsed.education?.length || 0,
      skills: skillCount,
      projects: parsed.projects?.length || 0,
    };
    
    const totalItems = summary.experience + summary.education + summary.skills + summary.projects;
    
    if (totalItems === 0) {
      logError('No data was extracted from the resume!');
      logInfo('This could mean:');
      log('   - The Subconscious API key is not set correctly');
      log('   - The AI parsing failed silently');
      log('   - Check the terminal running the dev server for errors');
      process.exit(1);
    }
    
    logSuccess(`Experience: ${summary.experience} entries`);
    logSuccess(`Education: ${summary.education} entries`);
    logSuccess(`Skills: ${summary.skills} skills`);
    logSuccess(`Projects: ${summary.projects} entries`);
    
    // Save full output
    const outputPath = path.join(__dirname, 'output/parsed-resume.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
    logInfo(`Full output saved to: ${outputPath}`);
    
    console.log();
    logSuccess('Resume parsing test completed successfully! ✨');
    
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      logError('Could not connect to the API server');
      logInfo('Make sure the dev server is running: pnpm dev');
    } else {
      logError(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main().catch(err => {
  logError(`Unexpected error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
