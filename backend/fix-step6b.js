const fs = require('fs');
const file = 'src/books/books.service.ts';
let c = fs.readFileSync(file, 'utf8');

// Locate the entire STEP 6b block (from the blank line before it to just before STEP 7)
const step6bStart = c.indexOf('\n    // STEP 6b:');
const step7Start  = c.indexOf('    // STEP 7: Detect callout');

if (step6bStart < 0 || step7Start < 0) {
  console.error('Markers not found — step6bStart:', step6bStart, 'step7Start:', step7Start);
  process.exit(1);
}

console.log('Replacing STEP 6b block from char', step6bStart, 'to', step7Start);

// Build the correct replacement block
const newBlock =
  '\n' +
  '    // ══════════════════════════════════════════════════════════════════\n' +
  '    // STEP 6b: Ensure blank line after closing code fences and after any\n' +
  '    // blockquote line immediately followed by prose (no blank separator).\n' +
  '    // Pandoc omits these blanks, causing text to hug code blocks.\n' +
  '    // ══════════════════════════════════════════════════════════════════\n' +
  '    // Blank line after closing ``` fence not already followed by blank\n' +
  '    content = content.replace(/^```\\r?\\n(?!\\r?\\n)/gm, \'```\\n\\n\');\n' +
  '    // Blank line after any > blockquote line not followed by blank or >\n' +
  '    content = content.replace(/^(> [^\\n\\r]+)\\r?\\n(?!\\r?\\n|>)/gm, \'$1\\n\\n\');\n' +
  '\n';

c = c.substring(0, step6bStart) + newBlock + c.substring(step7Start);
fs.writeFileSync(file, c, 'utf8');
console.log('Done. File is now', c.length, 'bytes.');

// Verify
const verify = c.indexOf('``` fence not already');
console.log('Verification — "``` fence" found at:', verify);
const snip = c.substring(step6bStart, step6bStart + 600);
console.log('New block:\n', snip);
