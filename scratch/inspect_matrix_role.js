const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'out' && file !== 'scratch') {
        search(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('matrix_role') || content.includes('matrix-role')) {
        console.log("Found in:", fullPath);
        // Find line numbers
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('matrix_role') || line.includes('matrix-role')) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

search('.');
