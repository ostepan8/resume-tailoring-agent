/**
 * Seed Synthetic Test Data
 * 
 * Adds diverse experience/projects to ohstep23@gmail.com for testing
 * that the AI correctly selects relevant content based on job description.
 * 
 * Usage:
 *   node scripts/seed-test-data.mjs           # Add all synthetic data
 *   node scripts/seed-test-data.mjs --clear   # Remove synthetic data first
 *   node scripts/seed-test-data.mjs --list    # List current data
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env.local") });

const TARGET_EMAIL = "ohstep23@gmail.com";

// ============================================
// SYNTHETIC DATA - Mix of ML and non-ML content
// ============================================

const WORK_EXPERIENCE = [
  // ML-related
  {
    company: "TensorFlow Labs",
    position: "Machine Learning Engineer Intern",
    location: "San Francisco, CA",
    start_date: "2024-06-01",
    end_date: "2024-08-31",
    is_current: false,
    achievements: [
      "Developed and deployed a real-time fraud detection model using TensorFlow and scikit-learn, achieving 94% precision",
      "Built data pipelines with Apache Spark to process 10M+ daily transactions for model training",
      "Implemented A/B testing framework to evaluate model performance in production",
      "Collaborated with data scientists to optimize hyperparameters using Optuna and Weights & Biases",
    ],
  },
  // Backend/general (not ML)
  {
    company: "CloudScale Inc",
    position: "Backend Developer Intern",
    location: "Boston, MA",
    start_date: "2024-01-01",
    end_date: "2024-05-31",
    is_current: false,
    achievements: [
      "Built RESTful APIs using Node.js and Express serving 50K+ daily requests",
      "Designed and implemented PostgreSQL database schemas for user management system",
      "Created CI/CD pipelines with GitHub Actions reducing deployment time by 60%",
      "Wrote comprehensive unit tests achieving 85% code coverage",
    ],
  },
  // ML-related
  {
    company: "DataVision Research",
    position: "Computer Vision Research Assistant",
    location: "Cambridge, MA",
    start_date: "2023-09-01",
    end_date: "2023-12-31",
    is_current: false,
    achievements: [
      "Trained YOLOv8 object detection models for autonomous vehicle perception",
      "Implemented image augmentation pipelines using Albumentations and OpenCV",
      "Published research on few-shot learning techniques for medical imaging",
      "Optimized model inference using ONNX and TensorRT for edge deployment",
    ],
  },
];

const PROJECTS = [
  // ML Project
  {
    name: "Neural Style Transfer App",
    description: "Real-time artistic style transfer using deep learning",
    start_date: "2024-03-01",
    end_date: "2024-04-15",
    url: "github.com/owenstepan/neural-style",
    skills: ["PyTorch", "FastAPI", "Docker", "CNN"],
    bullets: [
      "Implemented VGG-19 based neural style transfer with custom loss functions",
      "Built FastAPI backend with async processing for real-time image transformation",
      "Deployed on AWS Lambda with Docker containerization for serverless inference",
      "Achieved 3x speedup through model quantization and CUDA optimization",
    ],
  },
  // Web Project (not ML)
  {
    name: "Real-time Collaboration Platform",
    description: "Google Docs-like collaborative editing tool",
    start_date: "2024-01-01",
    end_date: "2024-02-28",
    url: "github.com/owenstepan/collab-docs",
    skills: ["React", "WebSocket", "Redis", "Node.js"],
    bullets: [
      "Built real-time document editing with operational transformation algorithms",
      "Implemented WebSocket-based sync handling 100+ concurrent users",
      "Designed Redis pub/sub architecture for horizontal scaling",
      "Created rich text editor with Slate.js supporting markdown and code blocks",
    ],
  },
  // ML Project
  {
    name: "Sentiment Analysis API",
    description: "NLP service for social media sentiment classification",
    start_date: "2023-11-01",
    end_date: "2023-12-15",
    url: "github.com/owenstepan/sentiment-api",
    skills: ["Transformers", "Hugging Face", "Flask", "BERT"],
    bullets: [
      "Fine-tuned BERT model on 100K labeled tweets achieving 91% accuracy",
      "Built REST API with Flask serving 1000+ predictions per minute",
      "Implemented batch processing and caching for improved throughput",
      "Created interactive dashboard for real-time sentiment monitoring",
    ],
  },
  // Mobile Project (not ML)
  {
    name: "Fitness Tracking App",
    description: "Cross-platform mobile app for workout logging",
    start_date: "2023-08-01",
    end_date: "2023-10-31",
    url: "github.com/owenstepan/fittrack",
    skills: ["React Native", "Firebase", "TypeScript"],
    bullets: [
      "Developed cross-platform mobile app with React Native and Expo",
      "Integrated Firebase for real-time sync and user authentication",
      "Implemented offline-first architecture with local SQLite storage",
      "Published on App Store with 500+ downloads in first month",
    ],
  },
  // ML Project
  {
    name: "Recommendation Engine",
    description: "Collaborative filtering system for e-commerce",
    start_date: "2023-06-01",
    end_date: "2023-07-31",
    url: "github.com/owenstepan/rec-engine",
    skills: ["Python", "Spark MLlib", "PostgreSQL", "Redis"],
    bullets: [
      "Built hybrid recommendation system combining collaborative and content-based filtering",
      "Processed 1M+ user interactions using Apache Spark for model training",
      "Achieved 23% improvement in click-through rate vs. baseline",
      "Implemented real-time serving layer with Redis for sub-10ms latency",
    ],
  },
];

const SKILLS = [
  // ML/AI skills
  { name: "Python", category: "technical" },
  { name: "PyTorch", category: "framework" },
  { name: "TensorFlow", category: "framework" },
  { name: "scikit-learn", category: "framework" },
  { name: "Hugging Face Transformers", category: "framework" },
  { name: "Pandas", category: "technical" },
  { name: "NumPy", category: "technical" },
  { name: "Apache Spark", category: "technical" },
  { name: "Computer Vision", category: "technical" },
  { name: "NLP", category: "technical" },
  { name: "Deep Learning", category: "technical" },
  
  // General dev skills
  { name: "TypeScript", category: "technical" },
  { name: "JavaScript", category: "technical" },
  { name: "Java", category: "technical" },
  { name: "React", category: "framework" },
  { name: "Node.js", category: "framework" },
  { name: "PostgreSQL", category: "technical" },
  { name: "MongoDB", category: "technical" },
  { name: "Docker", category: "technical" },
  { name: "AWS", category: "technical" },
  { name: "Git", category: "technical" },
];

const EDUCATION = [
  {
    institution: "Northeastern University",
    degree: "Bachelor of Science",
    field_of_study: "Computer Science with AI Concentration",
    location: "Boston, MA",
    start_date: "2023-09-01",
    end_date: null,
    is_current: true,
    gpa: "3.85",
    achievements: [
      "Dean's List (3 semesters)",
      "Relevant Coursework: Machine Learning, Deep Learning, Computer Vision, NLP, Algorithms",
      "Teaching Assistant for CS 4100 Artificial Intelligence",
    ],
  },
];

// ============================================
// DATABASE OPERATIONS
// ============================================

async function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  return createClient(supabaseUrl, supabaseKey);
}

async function getUserId(supabase) {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("email", TARGET_EMAIL)
    .single();

  if (error || !profile) {
    throw new Error(`User ${TARGET_EMAIL} not found`);
  }

  return profile.id;
}

async function clearData(supabase, userId) {
  console.log("Clearing existing synthetic data...");

  const tables = ["work_experience", "user_projects", "skills", "education"];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", userId);
    
    if (error) {
      console.warn(`  Warning: Could not clear ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ Cleared ${table}`);
    }
  }
}

async function listData(supabase, userId) {
  console.log(`\nCurrent data for ${TARGET_EMAIL}:\n`);

  // Work experience
  const { data: exp } = await supabase
    .from("work_experience")
    .select("company, position")
    .eq("user_id", userId);
  console.log(`Work Experience (${exp?.length || 0}):`);
  exp?.forEach(e => console.log(`  - ${e.position} @ ${e.company}`));

  // Projects
  const { data: proj } = await supabase
    .from("user_projects")
    .select("name, skills")
    .eq("user_id", userId);
  console.log(`\nProjects (${proj?.length || 0}):`);
  proj?.forEach(p => console.log(`  - ${p.name} [${p.skills?.join(", ")}]`));

  // Skills
  const { data: skills } = await supabase
    .from("skills")
    .select("name, category")
    .eq("user_id", userId);
  console.log(`\nSkills (${skills?.length || 0}):`);
  const byCategory = {};
  skills?.forEach(s => {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s.name);
  });
  Object.entries(byCategory).forEach(([cat, items]) => {
    console.log(`  ${cat}: ${items.join(", ")}`);
  });

  // Education
  const { data: edu } = await supabase
    .from("education")
    .select("institution, degree, field_of_study")
    .eq("user_id", userId);
  console.log(`\nEducation (${edu?.length || 0}):`);
  edu?.forEach(e => console.log(`  - ${e.degree} in ${e.field_of_study} @ ${e.institution}`));
}

async function seedData(supabase, userId) {
  console.log("\nSeeding synthetic data...\n");

  // Add work experience
  console.log("Adding work experience...");
  for (const exp of WORK_EXPERIENCE) {
    const { error } = await supabase.from("work_experience").insert({
      user_id: userId,
      ...exp,
    });
    if (error) {
      console.error(`  ✗ ${exp.company}: ${error.message}`);
    } else {
      console.log(`  ✓ ${exp.position} @ ${exp.company}`);
    }
  }

  // Add projects
  console.log("\nAdding projects...");
  for (const proj of PROJECTS) {
    const { error } = await supabase.from("user_projects").insert({
      user_id: userId,
      ...proj,
    });
    if (error) {
      console.error(`  ✗ ${proj.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${proj.name}`);
    }
  }

  // Add skills
  console.log("\nAdding skills...");
  const skillsToInsert = SKILLS.map(s => ({ user_id: userId, ...s }));
  const { error: skillsError } = await supabase.from("skills").insert(skillsToInsert);
  if (skillsError) {
    console.error(`  ✗ Skills: ${skillsError.message}`);
  } else {
    console.log(`  ✓ Added ${SKILLS.length} skills`);
  }

  // Add education
  console.log("\nAdding education...");
  for (const edu of EDUCATION) {
    const { error } = await supabase.from("education").insert({
      user_id: userId,
      ...edu,
    });
    if (error) {
      console.error(`  ✗ ${edu.institution}: ${error.message}`);
    } else {
      console.log(`  ✓ ${edu.institution}`);
    }
  }

  console.log("\n✓ Seeding complete!");
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");
  const shouldList = args.includes("--list");

  console.log("═".repeat(60));
  console.log("  SEED TEST DATA");
  console.log("═".repeat(60));

  try {
    const supabase = await getSupabaseClient();
    const userId = await getUserId(supabase);
    console.log(`\nUser: ${TARGET_EMAIL} (${userId})`);

    if (shouldList) {
      await listData(supabase, userId);
      return;
    }

    if (shouldClear) {
      await clearData(supabase, userId);
    }

    await seedData(supabase, userId);
    
    console.log("\n" + "═".repeat(60));
    console.log("  Run test with: node scripts/test-tailor-e2e.mjs");
    console.log("═".repeat(60));
  } catch (error) {
    console.error("\nError:", error.message);
    process.exit(1);
  }
}

main();
