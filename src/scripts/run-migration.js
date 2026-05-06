const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ojepnycexumwpzcvlydb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZXBueWNleHVtd3B6Y3ZseWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDA5MDgsImV4cCI6MjA5MTMxNjkwOH0.e_EmQlN-nGWxUe3NCn_tLv8StquYutPvjtFQLAvCh88';

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationFile = path.join(__dirname, '../supabase/migrations/046_teams_and_project_members.sql');
    const sql = fs.readFileSync(migrationFile, 'utf-8');

    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Executing migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Migration error:', error);
      return;
    }

    console.log('✓ Migration completed successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

runMigration();
