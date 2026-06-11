const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testRoles() {
  const roles = ['accounts', 'hr', 'dept_lead', 'team_lead', 'employee', 'intern'];
  
  for (let i = 0; i < roles.length; i++) {
    const r = roles[i];
    // Use valid hex UUIDs:
    const dummyId = '00000000-0000-0000-0000-' + String(i + 1).padStart(12, '0');
    const { error } = await supabase
      .from('employees')
      .insert({
        id: dummyId,
        name: 'Test ' + r,
        email: 'test_' + r + '@test.namaah.io',
        employee_id: 'TST-' + String(i + 1),
        role: r,
        is_active: false
      });
      
    if (error) {
      console.log(`Role [${r}]: FAILED with error: ${error.message} (${error.code})`);
    } else {
      console.log(`Role [${r}]: SUCCESS!`);
      // Delete the dummy insert
      await supabase.from('employees').delete().eq('id', dummyId);
    }
  }
}

testRoles();
