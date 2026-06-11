const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testClientSelect() {
  const { data, error } = await supabase
    .from('teams')
    .select('name')
    .eq('type', 'department');
    
  if (error) {
    console.error("Anon select error:", error);
  } else {
    console.log("Anon select data:", data);
  }
}

testClientSelect();
