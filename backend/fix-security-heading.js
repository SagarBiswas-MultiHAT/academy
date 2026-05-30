const fs = require('fs');
const file = 'src/books/books.service.ts';
let c = fs.readFileSync(file, 'utf8');

// Add a conversion inside the STEP 6c block, right after the Examples heading regex
// Target: > _# SECURITY AUDIT (own site only):_  (after escape processing, \# → #)
// OR the variant still with escape:  > _\# SECURITY AUDIT (own site only):_
const marker = "    content = content.replace(\n      /^> \\*\\*([^*]*(Example|Examples|Queries|Scenarios)[^*]*)\\*\\*\\s*$/gm,\n      '\\n#### $1\\n'\n    );";
const idx = c.indexOf(marker);
if (idx < 0) { console.error('STEP 6c marker not found'); process.exit(1); }

// Insert AFTER the marker
const insertAt = idx + marker.length;
const addition =
  '\n    // Also convert italic blockquote comment headings: > _# SECURITY AUDIT..._\n' +
  '    content = content.replace(\n' +
  '      /^> _\\\\?#\\s*(SECURITY AUDIT[^_\\n]*)_\\s*$/gm,\n' +
  "      '\\n#### Security Audit $1\\n'\n" +
  '    );\n';

c = c.substring(0, insertAt) + addition + c.substring(insertAt);
fs.writeFileSync(file, c, 'utf8');
console.log('Done. File size:', c.length);
