const fs = require('fs');
const content = fs.readFileSync('c:\\GitHub\\academy\\books\\Google_Dorks_Complete_Handbook\\Google_Dorks_Complete_Handbook.md', 'utf8');
const lines = content.split('\n');
const line = lines[1367];
console.log("Original line:", line);
console.log("Regex stripped:", line.replace(/\[([a-zA-Z][\s\S]{0,200}?)\](?![\(\[])/g, '$1'));
