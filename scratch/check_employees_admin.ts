import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // USE SERVICE ROLE

if (!supabaseUrl || !supabaseKey) {
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEmployeesAdmin() {
  console.log('Checking all employees using SERVICE ROLE...')
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role, is_active')
  
  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Total found with Admin access:', data?.length)
  console.table(data)
}

checkEmployeesAdmin()
