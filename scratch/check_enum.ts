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

async function checkEnum() {
  const { data, error } = await supabase.rpc('get_enum_values', { enum_name: 'user_role' })
  if (error) {
    console.log('RPC failed. Trying query...')
    const { data: qData, error: qErr } = await supabase
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumtypid', 1) // This is just a guess, I need the actual type oid
    
    // Better way: query pg_type and pg_enum
    console.log('Enum check query needed.')
  } else {
    console.log('Enum values:', data)
  }
}

checkEnum()
