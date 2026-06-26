const s = `![alt text](url)
some text
[other]{.underline}`;
console.log(s.replace(/\[([^\]]*)\]\{[^}]*\.underline[^}]*\}/g, '$1'));
