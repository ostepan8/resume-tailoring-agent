import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listAllUsers() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('    ALL USERS IN DATABASE')
  console.log('═══════════════════════════════════════════════════════════\n')
  
  const { data: users } = await supabase.from('user_profiles').select('id, email, full_name')
  
  if (!users || users.length === 0) {
    console.log('No users found.')
    return
  }
  
  const tables = [
    'tailoring_history',
    'saved_jobs', 
    'awards',
    'user_resumes',
    'user_projects',
    'skills',
    'education',
    'work_experience'
  ]
  
  for (const user of users) {
    console.log(`📧 ${user.email} (${user.full_name || 'no name'})`)
    console.log(`   ID: ${user.id}`)
    
    let totalRecords = 0
    const tableCounts: string[] = []
    
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      if (count && count > 0) {
        tableCounts.push(`${table}: ${count}`)
        totalRecords += count
      }
    }
    
    if (totalRecords > 0) {
      console.log(`   Data: ${tableCounts.join(', ')}`)
    } else {
      console.log('   Data: (none)')
    }
    console.log('')
  }
}

listAllUsers()
