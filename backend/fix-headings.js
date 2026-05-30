const fs = require('fs');
const file = 'src/books/books.service.ts';
let c = fs.readFileSync(file, 'utf8');

// Insert after STEP 6b (before STEP 7 comment)
// Convert > **Examples** blockquote headings → #### headings so they always
// render as proper block-level headings, not merged into surrounding blockquotes.
const marker = '    // STEP 7: Detect callout types';
const idx = c.indexOf(marker);
if (idx < 0) { console.error('Marker not found'); process.exit(1); }

const insertion =
  '    // ══════════════════════════════════════════════════════════════════\n' +
  '    // STEP 6c: Promote > **…Examples…** blockquote headings to real ####\n' +
  '    // headings so they always render on their own line with clear styling.\n' +
  '    // ══════════════════════════════════════════════════════════════════\n' +
  '    content = content.replace(\n' +
  '      /^> \\*\\*([^*]*(Example|Examples|Queries|Scenarios)[^*]*)\\*\\*\\s*$/gm,\n' +
  "      '\\n#### $1\\n'\n" +
  '    );\n\n';

c = c.substring(0, idx) + insertion + c.substring(idx);
fs.writeFileSync(file, c, 'utf8');
console.log('Done. File size:', c.length);
