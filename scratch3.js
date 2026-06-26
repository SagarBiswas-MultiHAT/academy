const s = `![alt text](url)
some text
[other]{.underline}`;
console.log(s.replace(/\[([\s\S]*?)\]\{[^}]*\.underline[^}]*\}/g, '$1'));
