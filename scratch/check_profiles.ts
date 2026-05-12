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

async function checkProfiles() {
  console.log('Checking profiles table...')
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(20)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Total:', data?.length)
  console.table(data)
}

checkProfiles()
