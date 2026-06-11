const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '..', 'src', 'app', 'admin', 'mail', 'inbox', 'page.tsx');
const text = fs.readFileSync(pagePath, 'utf8');
const lines = text.split('\n');

lines.forEach((line, index) => {
  if (line.toLowerCase().includes('has_attachment') || line.toLowerCase().includes('attachments') || line.toLowerCase().includes('download')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
