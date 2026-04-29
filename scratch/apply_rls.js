const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://ojepnycexumwpzcvlydb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZXBueWNleHVtd3B6Y3ZseWRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0MDkwOCwiZXhwIjoyMDkxMzE2OTA4fQ.WKAgJqAUoEbMfB8UA-QK6-kUDFAQiI-ks5sKqHqx0xM'
);

async function applyRLS() {
  const sql = fs.readFileSync('d:/Finanace_Dashboard/src/supabase/rls.sql', 'utf8');
  
  // Since we can't run multi-statement SQL easily via RPC without a helper, 
  // we'll assume the user has a way to run this or we'll try to run the critical part.
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.error('Error applying RLS via exec_sql:', error);
    console.log('Trying to apply only the function update...');
    
    const funcSql = `
    CREATE OR REPLACE FUNCTION get_my_role()
    RETURNS user_role AS $$
    DECLARE
        r user_role;
    BEGIN
        SELECT role INTO r FROM employees WHERE id = auth.uid();
        RETURN COALESCE(r, 'employee'::user_role);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    const { error: fError } = await supabase.rpc('exec_sql', { sql_query: funcSql });
    if (fError) console.error('Final failure:', fError);
    else console.log('Function updated successfully!');
  } else {
    console.log('RLS applied successfully!');
  }
}

applyRLS();
