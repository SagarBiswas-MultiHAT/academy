const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'books', 'books.service.ts');
let src = fs.readFileSync(filePath, 'utf-8');

// ── FIX 1: Add trailing-backslash strip after the lone-backslash line ──────────
// The pandoc export leaves `\` at end of lines (e.g. flowchart step labels).
// We add it right after the existing "lone backslash lines" replacement.
const LONE_BQ = "content = content.replace(/^\\\\\\\\s*$/gm, '');      // lone backslash lines";
const TRAILING_BQ = "content = content.replace(/\\\\$/gm, '');          // trailing backslash at line end";

if (!src.includes(TRAILING_BQ)) {
  // Find the lone-backslash line in the actual file
  const target = /content = content\.replace\(\/\^\\\\\\\\s\*\$\/gm, ''\);\s*\/\/ lone backslash lines/;
  const replacement = (m) => m + '\n    content = content.replace(/\\\\$/gm, \'\');          // trailing backslash at line end';
  const newSrc = src.replace(target, replacement);
  if (newSrc !== src) {
    src = newSrc;
    console.log('✅ FIX 1 applied: trailing backslash strip');
  } else {
    // fallback: insert after escaped dashes line
    const alt = /content = content\.replace\(\/\\\\-\{2,\}\/g, '--'\);\s*\/\/ escaped dashes/;
    src = src.replace(alt, (m) => m + '\n    content = content.replace(/\\\\$/gm, \'\');          // trailing backslash at line end');
    console.log('✅ FIX 1 applied (alt): trailing backslash strip');
  }
} else {
  console.log('ℹ️  FIX 1 already present');
}

// ── FIX 2: Widen orphaned-bracket regex to handle multi-line content ──────────
// The current regex [^\]\n]{0,120} stops at newlines so `[When it\nfinds...]`
// is not matched. Change to [\s\S]{0,200}? (lazy dotall).
src = src.replace(
  /\/\\\[([a-zA-Z][^\\\]\\n]\{0,120\})\\\](?!\[\\(\\[]\)\/g, '\$1'/g,
  `\/\\[([a-zA-Z][\\s\\S]{0,200}?)\\](?![\\(\\[])\/g, '$1'`
);

// Simpler approach — direct string replace on the exact pattern in the file
const OLD_ORPHAN = `content = content.replace(/\\\\[([a-zA-Z][^\\\\]\\\\n]{0,120})\\\\](?![\\\\(\\\\[])/g, '$1');`;
const NEW_ORPHAN = `content = content.replace(/\\\\[([a-zA-Z][\\\\s\\\\S]{0,200}?)\\\\](?![\\\\(\\\\[])/g, '$1');`;
if (src.includes(OLD_ORPHAN)) {
  src = src.replace(OLD_ORPHAN, NEW_ORPHAN);
  console.log('✅ FIX 2 applied: orphaned bracket dotall regex');
}

// ── FIX 3: Convert **bold** and *italic* inside callout <p> tags ──────────────
// The callout flush builds raw <p> HTML, so markdown bold won't be processed.
// We need to convert it to HTML inline.
const OLD_PARA = `paragraphs.push('<p>' + para.join(' ') + '</p>');`;
const NEW_PARA = `const joined = para.join(' ')
                  .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                  .replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
                paragraphs.push('<p>' + joined + '</p>');`;

if (src.includes(OLD_PARA) && !src.includes('<strong>$1</strong>')) {
  src = src.replace(OLD_PARA, NEW_PARA);
  console.log('✅ FIX 3 applied: bold/italic in callout paragraphs');
} else {
  console.log('ℹ️  FIX 3 already present or not found');
}

fs.writeFileSync(filePath, src, 'utf-8');
console.log('\n✨ Patch complete. File saved.');
