const fs = require('fs');
const file = 'src/books/books.service.ts';
let c = fs.readFileSync(file, 'utf8');

const marker = "let content = chapterLines.join('\\n');";
const idx = c.indexOf(marker);
if (idx < 0) { console.error('Marker not found'); process.exit(1); }

const insertAfter = idx + marker.length;
const norm = '\n\n    // Normalise CRLF → LF so all downstream split/regex is line-ending agnostic\n' +
             "    content = content.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');\n";

c = c.substring(0, insertAfter) + norm + c.substring(insertAfter);
fs.writeFileSync(file, c, 'utf8');
console.log('Done. File size:', c.length, 'bytes');
