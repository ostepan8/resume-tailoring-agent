/**
 * Delete User Data Script
 * 
 * Deletes all data associated with a user by email address.
 * 
 * Usage: 
 *   npx ts-node scripts/delete-user-data.ts <email>
 *   npx ts-node scripts/delete-user-data.ts <email> --include-profile
 *   npx ts-node scripts/delete-user-data.ts <email> --dry-run
 * 
 * Options:
 *   --include-profile  Also delete the user_profiles entry
 *   --dry-run          Show what would be deleted without actually deleting
 *   --force            Skip confirmation prompt
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as readline from 'readline'
import { fileURLToPath } from 'url'

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Use service role key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL is set')
  console.error('   And either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not found, using anon key (may fail due to RLS)')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Parse command line arguments
const args = process.argv.slice(2)
const email = args.find(arg => !arg.startsWith('--'))
const includeProfile = args.includes('--include-profile')
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')

if (!email) {
  console.error('❌ Usage: npx ts-node scripts/delete-user-data.ts <email> [options]')
  console.error('')
  console.error('Options:')
  console.error('  --include-profile  Also delete the user_profiles entry')
  console.error('  --dry-run          Show what would be deleted without actually deleting')
  console.error('  --force            Skip confirmation prompt')
  process.exit(1)
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  console.error(`❌ Invalid email format: ${email}`)
  process.exit(1)
}

interface TableCount {
  table: string
  count: number
}

async function getDataCounts(userId: string): Promise<TableCount[]> {
  const tables = [
    'tailoring_history',
    'user_resumes',
    'saved_jobs',
    'user_projects',
    'skills',
    'awards',
    'education',
    'work_experience',
  ]

  const counts: TableCount[] = []

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      console.error(`  ⚠️ Error counting ${table}:`, error.message)
      counts.push({ table, count: -1 })
    } else {
      counts.push({ table, count: count || 0 })
    }
  }

  return counts
}

async function deleteUserData(userId: string): Promise<void> {
  console.log(dryRun ? '\n🔍 DRY RUN - Simulating deletion...\n' : '\n🗑️  Deleting user data...\n')

  // Delete order matters due to foreign key constraints
  // user_resumes has self-referential FK (source_resume_id) and FK to saved_jobs (target_job_id)
  // So we need to:
  // 1. Delete tailored resumes first (they reference source resumes)
  // 2. Delete source resumes
  // 3. Delete saved_jobs (referenced by user_resumes)
  // 4. Delete everything else
  
  const deleteOperations = [
    { table: 'tailoring_history', label: 'Tailoring History' },
    { table: 'user_resumes', label: 'User Resumes (tailored)', filter: { resume_type: 'tailored' } },
    { table: 'user_resumes', label: 'User Resumes (source)', filter: { resume_type: 'source' } },
    { table: 'user_resumes', label: 'User Resumes (remaining)' }, // Catch any without type
    { table: 'saved_jobs', label: 'Saved Jobs' },
    { table: 'user_projects', label: 'User Projects' },
    { table: 'skills', label: 'Skills' },
    { table: 'awards', label: 'Awards & Certifications' },
    { table: 'education', label: 'Education' },
    { table: 'work_experience', label: 'Work Experience' },
  ]

  for (const op of deleteOperations) {
    let query = supabase.from(op.table).delete().eq('user_id', userId)
    
    // Apply additional filters if specified
    if (op.filter) {
      for (const [key, value] of Object.entries(op.filter)) {
        query = query.eq(key, value)
      }
    }

    if (dryRun) {
      // In dry run, just count what would be deleted
      let countQuery = supabase.from(op.table).select('*', { count: 'exact', head: true }).eq('user_id', userId)
      if (op.filter) {
        for (const [key, value] of Object.entries(op.filter)) {
          countQuery = countQuery.eq(key, value)
        }
      }
      const { count } = await countQuery
      if (count && count > 0) {
        console.log(`  📋 Would delete ${count} record(s) from ${op.label}`)
      }
    } else {
      const { error } = await query
      if (error) {
        console.error(`  ⚠️ Error deleting from ${op.label}:`, error.message)
      } else {
        console.log(`  ✓ Deleted from ${op.label}`)
      }
    }
  }

  // Delete storage files
  if (!dryRun) {
    console.log('\n🗂️  Cleaning up storage files...')
    const { data: files, error: listError } = await supabase.storage
      .from('resumes')
      .list(userId)

    if (listError) {
      console.error('  ⚠️ Error listing storage files:', listError.message)
    } else if (files && files.length > 0) {
      const filePaths = files.map(f => `${userId}/${f.name}`)
      const { error: deleteError } = await supabase.storage
        .from('resumes')
        .remove(filePaths)

      if (deleteError) {
        console.error('  ⚠️ Error deleting storage files:', deleteError.message)
      } else {
        console.log(`  ✓ Deleted ${files.length} file(s) from storage`)
      }
    } else {
      console.log('  ✓ No storage files to delete')
    }
  } else {
    // Dry run - count storage files
    const { data: files } = await supabase.storage
      .from('resumes')
      .list(userId)
    if (files && files.length > 0) {
      console.log(`\n📁 Would delete ${files.length} file(s) from storage`)
    }
  }

  // Optionally delete user profile
  if (includeProfile) {
    if (dryRun) {
      console.log('\n👤 Would delete user profile')
    } else {
      console.log('\n👤 Deleting user profile...')
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('  ⚠️ Error deleting profile:', error.message)
      } else {
        console.log('  ✓ Deleted user profile')
      }
    }
  }
}

async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('    DELETE USER DATA')
  console.log('═══════════════════════════════════════════════════════════\n')

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be deleted\n')
  }

  console.log(`📧 Looking up user: ${email}`)

  // Find user by email
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('email', email)
    .single()

  if (profileError || !profile) {
    console.error(`\n❌ User not found: ${email}`)
    if (profileError) {
      console.error('   Error:', profileError.message)
    }
    console.error('\n   Make sure:')
    console.error('   1. The email address is correct')
    console.error('   2. SUPABASE_SERVICE_ROLE_KEY is set in .env.local to bypass RLS')
    process.exit(1)
  }

  console.log(`\n✓ Found user:`)
  console.log(`   ID: ${profile.id}`)
  console.log(`   Email: ${profile.email}`)
  console.log(`   Name: ${profile.full_name || '(not set)'}`)

  // Get counts of data to be deleted
  console.log('\n📊 Data to be deleted:')
  const counts = await getDataCounts(profile.id)
  
  let totalRecords = 0
  for (const { table, count } of counts) {
    if (count > 0) {
      console.log(`   ${table}: ${count} record(s)`)
      totalRecords += count
    } else if (count === 0) {
      console.log(`   ${table}: 0 records`)
    }
  }

  // Check storage files
  const { data: storageFiles } = await supabase.storage
    .from('resumes')
    .list(profile.id)
  
  const storageCount = storageFiles?.length || 0
  if (storageCount > 0) {
    console.log(`   storage files: ${storageCount} file(s)`)
  }

  if (includeProfile) {
    console.log(`   user_profiles: 1 record (profile will be deleted)`)
    totalRecords += 1
  }

  if (totalRecords === 0 && storageCount === 0) {
    console.log('\n✓ No data found for this user. Nothing to delete.')
    process.exit(0)
  }

  console.log(`\n   Total: ${totalRecords} record(s) + ${storageCount} file(s)`)

  // Confirmation
  if (!force && !dryRun) {
    console.log('')
    const confirmed = await promptConfirmation(
      `⚠️  Are you sure you want to delete all data for ${email}? (y/N): `
    )
    if (!confirmed) {
      console.log('\n❌ Cancelled. No data was deleted.')
      process.exit(0)
    }
  }

  // Perform deletion
  await deleteUserData(profile.id)

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════')
  if (dryRun) {
    console.log('    DRY RUN COMPLETE - No data was deleted')
    console.log('    Run without --dry-run to perform actual deletion')
  } else {
    console.log('    DELETION COMPLETE')
    console.log(`    All data for ${email} has been deleted`)
  }
  console.log('═══════════════════════════════════════════════════════════\n')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
