const fs = require('fs');
const path = require('path');

const dir = 'src/supabase/migrations';
if (!fs.existsSync(dir)) {
  console.log("Directory does not exist:", dir);
  process.exit(1);
}

const files = fs.readdirSync(dir).sort();
console.log("Migration files:");
files.forEach(f => console.log(f));
