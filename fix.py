import json, re

transcript_path = r'C:\Users\gyrom\.gemini\antigravity\brain\6949b0b3-cee7-4783-8793-79bf13ed9c02\.system_generated\logs\transcript_full.jsonl'
lines_dict = {}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
            def search_strings(obj):
                if isinstance(obj, str):
                    if 'Showing lines' in obj:
                        for l in obj.split('\n'):
                            if ': ' in l:
                                parts = l.split(': ', 1)
                                if parts[0].isdigit():
                                    num = int(parts[0])
                                    lines_dict[num] = parts[1]
                elif isinstance(obj, dict):
                    for v in obj.values(): search_strings(v)
                elif isinstance(obj, list):
                    for item in obj: search_strings(item)
            search_strings(entry)
        except: pass

max_line = max(lines_dict.keys())
html = '\n'.join([lines_dict.get(i, '') for i in range(1, max_line + 1)])

missing = '''            } catch (e) {
                console.error("保存エラー", e);
                showAlertModal("画像の保存に失敗しました。");
            }
            loadingOverlay.classList.remove('active');
            closeMarkupModal();
        };
    </script>
</body>
</html>'''

html += missing
new_html = re.sub(r'<style>[\s\S]*?</style>', '<link rel="stylesheet" href="/src/css/style.css">', html)
new_html = re.sub(r'<script>\s*lucide\.createIcons\(\);[\s\S]*?</script>', '<script type="module" src="/src/js/main.js"></script>', new_html)
new_html = new_html.replace(r'\n', '\n').replace(r'\r', '\r')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
print('Fixed index.html')
