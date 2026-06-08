const fs = require('fs');
const file = 'c:/GitHub/academy/books/Google_Dorks_Complete_Handbook/Google_Dorks_Complete_Handbook.md';
let c = fs.readFileSync(file, 'utf8');

const target = `> \\<meta name=\\"robots\\" content=\\"noarchive\\"\\> (blocks Google cache)\r
>\r
> \\<meta name=\\"internetarchive\\" content=\\"noarchive\\"\\> (blocks\r
> Wayback Machine)`;

const replacement = `> \\<meta name=\\"robots\\" content=\\"noarchive\\"\\> (blocks Google cache)<br>\r
> \\<meta name=\\"internetarchive\\" content=\\"noarchive\\"\\> (blocks Wayback Machine)`;

c = c.replace(target, replacement);

fs.writeFileSync(file, c);
console.log("Done");
