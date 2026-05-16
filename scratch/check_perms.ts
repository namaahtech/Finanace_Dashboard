import { getSupabaseAdmin } from "./src/lib/supabase";

async function check() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('role_permissions').select('*');
  if (error) {
    console.error(error);
    return;
  }
  console.log(`Total rows: ${data.length}`);
  const visible = data.filter(r => r.can_view);
  console.log(`Visible rows: ${visible.length}`);
  visible.forEach(r => {
    console.log(`Role: ${r.role}, Module: ${r.module_key}`);
  });
}

check();
