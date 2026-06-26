const s = "![Google's built-in time filter — click Tools → Any time to filter results by date range](media/image1.png)";
console.log(s.replace(/\[([a-zA-Z][\s\S]{0,200}?)\](?![\(\[])/g, '$1'));
