const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key is missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetQueue() {
  try {
    const { data, error } = await supabase
      .from('onboarding_analysis_queue')
      .update({ status: 'pending' })
      .eq('status', 'processing')
      .select();

    if (error) {
      console.error('Error resetting queue:', error);
      return;
    }

    console.log('Reset tasks:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

resetQueue();
