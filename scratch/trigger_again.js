const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key is missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function triggerAgain() {
  try {
    // Get the latest task
    const { data: latest, error: fetchError } = await supabase
      .from('onboarding_analysis_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      console.error('Error fetching latest task:', fetchError);
      return;
    }

    console.log('Resetting task:', latest.id);

    // Update it to pending
    const { data: updated, error: updateError } = await supabase
      .from('onboarding_analysis_queue')
      .update({
        status: 'pending',
        analyzed_text: null,
        error_message: null
      })
      .eq('id', latest.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return;
    }

    console.log('Task reset successfully. New status:', updated.status);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

triggerAgain();
