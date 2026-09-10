const fs = require('fs');
let html = fs.readFileSync('backup/reconstructed.html', 'utf-8');
const missing =             } catch (e) {
                console.error('ï€ë∂ÉGÉâÅ[', e);
                showAlertModal('âÊëúÇÃï€ë∂Ç…é∏îsÇµÇ‹ÇµÇΩÅB');
            }
            loadingOverlay.classList.remove('active');
            closeMarkupModal();
        };
    </script>
</body>
</html>;
html += missing;
fs.writeFileSync('backup/reconstructed.html', html);
console.log('Appended missing lines.');

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const scriptMatch = html.match(/<script>\s*lucide\.createIcons\(\);([\s\S]*?)<\/script>/);

if (styleMatch) {
    fs.mkdirSync('src/css', { recursive: true });
    fs.writeFileSync('src/css/style.css', styleMatch[1].trim());
    console.log('Saved src/css/style.css');
}

if (scriptMatch) {
    fs.mkdirSync('src/js', { recursive: true });
    const jsContent = 'lucide.createIcons();\n' + scriptMatch[1].trim();
    fs.writeFileSync('src/js/main.js', jsContent);
    console.log('Saved src/js/main.js');
}

const newHtml = html
  .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/src/css/style.css">')
  .replace(/<script>\s*lucide\.createIcons\(\);[\s\S]*?<\/script>/, '<script type="module" src="/src/js/main.js"></script>');

fs.writeFileSync('index.html', newHtml);
console.log('Updated index.html.');
