const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  // Inspect employee Kumar
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id, name, email, role, matrix_role')
    .eq('email', 'kumar@mail.namaah.io');
  
  if (empErr) {
    console.error("Employee error:", empErr);
  } else {
    console.log("Employees:", emps);
  }

  // Inspect role_permissions distinct roles
  const { data: perms, error: permErr } = await supabase
    .from('role_permissions')
    .select('role')
    .then(res => {
      if (res.error) return res;
      const roles = [...new Set(res.data.map(p => p.role))];
      return { data: roles };
    });

  if (permErr) {
    console.error("Permissions error:", permErr);
  } else {
    console.log("Roles in role_permissions:", perms);
  }

  // Count visible modules per role
  const { data: visiblePerms, error: visibleErr } = await supabase
    .from('role_permissions')
    .select('role, module_key')
    .eq('can_view', true);
  
  if (visibleErr) {
    console.error("Visible perms error:", visibleErr);
  } else {
    const counts = {};
    visiblePerms.forEach(p => {
      counts[p.role] = (counts[p.role] || []).concat(p.module_key);
    });
    console.log("Visible perms counts:", Object.keys(counts).reduce((acc, r) => {
      acc[r] = counts[r].length;
      return acc;
    }, {}));
  }
}

inspect();
