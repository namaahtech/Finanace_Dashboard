import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkApplications() {
  console.log('Checking applications table...')
  const { data, error } = await supabase
    .from('applications')
    .select('id, applicant_name, applicant_email, applied_cluster_id, decision')
    .limit(20)

  if (error) {
    console.error('Error fetching applications:', error)
    return
  }

  console.log('Total applications found:', data?.length)
  console.table(data)
}

checkApplications()
