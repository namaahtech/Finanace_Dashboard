import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRLS() {
  const { data, error } = await supabase.rpc('check_rls_status', { table_name: 'employees' })
  if (error) {
    // Try raw query
    const { data: qData, error: qErr } = await supabase.from('employees').select('count', { count: 'exact', head: true })
    console.log('Query result:', qData, qErr)
  } else {
    console.log('RLS Status:', data)
  }
}

checkRLS()
