import { createClient } from '@supabase/supabase-js';

const NEXT_PUBLIC_SUPABASE_URL = "https://ojepnycexumwpzcvlydb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZXBueWNleHVtd3B6Y3ZseWRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc0MDkwOCwiZXhwIjoyMDkxMzE2OTA4fQ.WKAgJqAUoEbMfB8UA-QK6-kUDFAQiI-ks5sKqHqx0xM";

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkEmployees() {
  console.log("--- Employee Audit ---");
  const { data, error } = await supabase.from('employees').select('id, name, email, role');
  if (error) {
    console.error(error);
    return;
  }
  console.log(`Total Employees: ${data.length}`);
  data.forEach(e => {
    console.log(`ID: ${e.id} | Name: ${e.name} | Role: ${e.role} | Email: ${e.email}`);
  });
}

checkEmployees();
