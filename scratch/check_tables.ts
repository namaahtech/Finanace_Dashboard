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

async function checkTables() {
  const { data, error } = await supabase.rpc('get_tables')
  if (error) {
    // If RPC doesn't exist, try querying a common table
    console.log('RPC get_tables failed. Checking tables via metadata...')
    const tables = ['employees', 'users', 'profiles', 'applications', 'job_clusters']
    for (const t of tables) {
      const { error: tErr } = await supabase.from(t).select('count', { count: 'exact', head: true })
      console.log(`Table ${t}: ${tErr ? 'Error ' + tErr.code : 'Exists'}`)
    }
  } else {
    console.log('Tables:', data)
  }
}

checkTables()
