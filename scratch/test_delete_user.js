const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const targetId = '0e9a68f0-a4db-456d-be6a-914a39ffe584';
  console.log("Attempting to delete employee from database...");
  const { error } = await supabase.from('employees').delete().eq('id', targetId);
  if (error) {
    console.error("Deletion Error:", error);
  } else {
    console.log("Deletion Succeeded!");
  }
}

run();
