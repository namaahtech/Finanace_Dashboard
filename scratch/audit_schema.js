const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkInterviewsTable() {
  const { data, error } = await supabase.from('interviews').select('*').limit(0);
  
  if (error) {
    console.log('Error accessing interviews table:', error.message);
  } else {
    console.log('Successfully connected to interviews table.');
  }

  // Use a raw query to check columns
  const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { t_name: 'interviews' });
  
  if (colError) {
    // If RPC fails, try a direct query on a non-existent row to see if it errors on specific columns
    const { error: testError } = await supabase.from('interviews').select('interview_type').limit(1);
    if (testError && testError.message.includes('column "interview_type" does not exist')) {
       console.log('--- AUDIT RESULT: Column "interview_type" is MISSING ---');
    } else if (!testError) {
       console.log('--- AUDIT RESULT: Column "interview_type" EXISTS ---');
    } else {
       console.log('Audit Error:', testError.message);
    }
  } else {
    console.log('Columns:', cols);
  }
}

checkInterviewsTable();
