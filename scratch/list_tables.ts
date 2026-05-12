import { createClient } from '@supabase/supabase-js';

const NEXT_PUBLIC_SUPABASE_URL = "https://ojepnycexumwpzcvlydb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZXBueWNleHVtd3B6Y3ZseWRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0MDkwOCwiZXhwIjoyMDkxMzE2OTA4fQ.WKAgJqAUoEbMfB8UA-QK6-kUDFAQiI-ks5sKqHqx0xM";

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); // This might not work if RPC is not defined
  if (error) {
     // fallback to a generic query
     const { data: tables, error: tableError } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
     if (tableError) {
         console.error(tableError);
         return;
     }
     console.log(tables.map(t => t.tablename));
  } else {
    console.log(data);
  }
}

listTables();
