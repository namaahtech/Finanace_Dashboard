const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const sql = `
    SELECT
      tc.table_name AS child_table,
      kcu.column_name AS child_column,
      ccu.table_name AS parent_table,
      ccu.column_name AS parent_column,
      rc.delete_rule AS delete_rule,
      rc.constraint_name AS constraint_name
    FROM
      information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
    WHERE
      tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'employees';
  `;

  console.log("Fetching foreign key constraints referencing 'employees'...");
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.error("RPC Error:", error);
    
    // If RPC exec_sql is not available, we can query it using another way or look at schemas.
    // Let's print out what we got.
  } else {
    console.log("Foreign Keys:");
    console.table(data);
  }
}

run();
