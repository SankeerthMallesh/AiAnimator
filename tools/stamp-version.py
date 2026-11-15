#!/usr/bin/env python3
"""Stamp a fresh ?v= version on the stylesheet, entry script and every module in index.html.

Run after changing any file in css/ or js/, before pushing:  python3 tools/stamp-version.py
Browsers then fetch the new files right away instead of mixing in cached old ones.
"""
import glob, os, re, time

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
v = time.strftime('%Y%m%d%H%M')
s = open('index.html').read()
s = re.sub(r'href="css/app\.css(\?v=[^"]*)?"', f'href="css/app.css?v={v}"', s)
mods = sorted(os.path.basename(f) for f in glob.glob('js/*.js') if not f.endswith('worker.js'))
entries = [f'  "./js/{m}": "./js/{m}?v={v}"' for m in mods] + [f'  "./vendor/mp4-muxer.mjs": "./vendor/mp4-muxer.mjs?v={v}"']
imap = '<script type="importmap">\n{"imports": {\n' + ',\n'.join(entries) + '\n}}\n</script>\n'
s = re.sub(r'<script type="importmap">.*?</script>\n', '', s, flags=re.S)
s = re.sub(r'<script type="module" src="\./js/app\.js(\?v=[^"]*)?"></script>', lambda m: imap + f'<script type="module" src="./js/app.js?v={v}"></script>', s)
open('index.html', 'w').write(s)
print('stamped', v)
