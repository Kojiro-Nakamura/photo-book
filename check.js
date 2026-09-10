const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');
lines.forEach((line, i) => {
    if (line.includes('missing-whitespace')) console.log(i, line);
});
const idx = html.indexOf('data-lucide=\"printer\"');
const str = html.substring(idx - 10, idx + 40);
for (let i = 0; i < str.length; i++) {
    console.log(str[i], str.charCodeAt(i).toString(16));
}
