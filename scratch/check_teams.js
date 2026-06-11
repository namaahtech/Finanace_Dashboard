const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, type, is_active')
    .eq('type', 'department');
    
  if (error) {
    console.error("Error fetching teams:", error);
  } else {
    console.log("Departments in teams table:", data);
  }
}

checkTeams();
