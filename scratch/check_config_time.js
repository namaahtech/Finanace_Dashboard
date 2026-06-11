const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfigTime() {
  const { data, error } = await supabase.from('system_config').select('updated_at').limit(1).single();
  if (error) {
    console.error(error);
  } else {
    console.log('system_config updated_at:', data.updated_at);
  }
}

checkConfigTime();
