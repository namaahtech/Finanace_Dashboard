require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.storage.getBucket('resumes');
  if (error) {
    console.log('Creating resumes bucket...');
    const { error: createError } = await supabase.storage.createBucket('resumes', { public: false });
    if (createError) console.error(createError);
    else console.log('Bucket created.');
  } else {
    console.log('Bucket already exists.');
  }
}
main();
