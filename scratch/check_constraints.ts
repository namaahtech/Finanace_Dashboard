
import { getSupabaseAdmin } from "../src/lib/supabase";

async function checkConstraints() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'support_tickets' });
  
  if (error) {
    // If RPC doesn't exist, try querying information_schema
    const { data: info, error: infoErr } = await supabase.rpc('run_sql', { 
      sql: `
        SELECT
            tc.constraint_name, 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='support_tickets';
      ` 
    });
    console.log("Constraints for support_tickets:");
    console.log(JSON.stringify(info || infoErr, null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkConstraints();
