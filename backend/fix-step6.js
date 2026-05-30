const fs = require('fs');
const file = 'src/books/books.service.ts';
let c = fs.readFileSync(file, 'utf8');

// FIX 1: STEP 6 — append \n after closing fence so the next paragraph
// gets a blank line. Current: '```\n$1\n```' → New: '```\n$1\n```\n'
const old6 = "'```\\n$1\\n```'";
const new6 = "'```\\n$1\\n```\\n'";
if (c.includes(old6)) {
  c = c.replace(old6, new6);
  console.log('FIX 1 applied: STEP 6 trailing newline added');
} else {
  console.log('FIX 1: marker not found —', JSON.stringify(old6));
}

// FIX 2: STEP 6b — remove the buggy ``` fence regex (line 490) that was
// adding a blank line INSIDE code fences, breaking the isQuery detection.
// Keep the > blockquote blank-line fix (line 492).
const badFenceRe = "    // Blank line after closing ``` fence not already followed by blank\n    content = content.replace(/^```\\r?\\n(?!\\r?\\n)/gm, '```\\n\\n');\n";
if (c.includes(badFenceRe)) {
  c = c.replace(badFenceRe, '');
  console.log('FIX 2 applied: removed buggy fence regex from STEP 6b');
} else {
  console.log('FIX 2: fence regex not found — checking STEP 6b area:');
  const idx = c.indexOf('STEP 6b');
  console.log(JSON.stringify(c.substring(idx, idx + 500)));
}

fs.writeFileSync(file, c, 'utf8');
console.log('Done. File size:', c.length, 'bytes');

// Verify
const v6 = c.indexOf("'```\\n$1\\n```\\n'");
const v6b = c.indexOf('(?!\\r?\\n)/gm');
console.log('STEP 6 has trailing newline:', v6 >= 0);
console.log('Buggy fence regex still present:', v6b >= 0);
