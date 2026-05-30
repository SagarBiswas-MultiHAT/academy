const fs = require('fs');
const file = 'src/books/books.service.ts';
let c = fs.readFileSync(file, 'utf8');

const marker = "const innerLines = bqBuffer.map(l => l.replace(/^>\\s?/, ''));";
const idx = c.indexOf(marker);
if (idx < 0) { console.error('Marker not found'); process.exit(1); }

const insertAt = idx + marker.length;
const addition =
  "\n          // Strip the bold callout prefix (e.g. **CRITICAL:**) from the first line\n" +
  "          // so it doesn't render redundantly inside the box\n" +
  "          innerLines[0] = innerLines[0].replace(/^(?:\\*\\*|_)?(?:NOTE|IMPORTANT|GOLDEN PRINCIPLE|TIP|CRITICAL|WARNING)(?:\\*\\*|_)?\\s*[:\\-]?\\s*/i, '');\n";

c = c.substring(0, insertAt) + addition + c.substring(insertAt);
fs.writeFileSync(file, c, 'utf8');
console.log('Done. File size:', c.length);
