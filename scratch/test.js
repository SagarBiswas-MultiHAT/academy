const fs = require('fs');
const content = `To check whether a page blocks caching, [view the pa]{.underline}g[e
source and look for]{.underline}:

> \\<meta name=\\"robots\\" content=\\"noarchive\\"\\> (blocks Google cache)
>
> \\<meta name=\\"internetarchive\\" content=\\"noarchive\\"\\> (blocks
> Wayback Machine)`;

// I'll just copy the relevant parts of books.service.ts logic
let processed = content;
processed = processed.replace(/\\\\/g, '');
processed = processed.replace(/\\'/g, "'");
processed = processed.replace(/\\"/g, '"');

// ... (skipping some steps that don't apply) ...

// STEP 6b
processed = processed.replace(/^(> [^\\n\\r]+)\\r?\\n(?!\\r?\\n|>)/gm, '$1\\n\\n');

console.log("PROCESSED:\\n" + processed);
