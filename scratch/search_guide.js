const fs = require('fs');
const path = require('path');

const guidePath = path.join(__dirname, '..', 'zohoo-intigrations-detailed', 'ZOHO_MAIL_INTEGRATION_GUIDE.md');
const text = fs.readFileSync(guidePath, 'utf8');
const lines = text.split('\n');

lines.forEach((line, index) => {
  if (line.toLowerCase().includes('attachment')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
