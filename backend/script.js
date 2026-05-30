const fs = require('fs');
const c = fs.readFileSync('src/books/books.service.ts', 'utf8');
const lines = c.split('\n');
const start = lines.findIndex(l => l.includes('const innerLines = bqBuffer'));
console.log(lines.slice(start, start + 30).join('\n'));
