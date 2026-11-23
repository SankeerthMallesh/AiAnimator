#!/usr/bin/env python3
"""Stamp a fresh ?v= version on the stylesheet, entry script and every module in index.html.

Run after changing any file in css/ or js/, before pushing:  python3 tools/stamp-version.py
Browsers then fetch the new files right away instead of mixing in cached old ones.
"""
import glob, os, re, time

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = time.strftime('%Y%m%d%H%M')

# Each tool lives in its own folder and shares the root vendor/ libraries.
for app, vendor in [('cartoon', '../vendor'), ('explainer', '../vendor'), ('board', None), ('clip', '../vendor'), ('editor', '../vendor')]:
    d = os.path.join(root, app)
    if not os.path.exists(os.path.join(d, 'index.html')):
        continue
    os.chdir(d)
    s = open('index.html').read()
    s = re.sub(r'href="css/(\w+)\.css(\?v=[^"]*)?"', lambda m: f'href="css/{m.group(1)}.css?v={v}"', s)
    s = re.sub(r'href="\.\./theme\.css(\?v=[^"]*)?"', f'href="../theme.css?v={v}"', s)
    s = re.sub(r'src="\.\./shared/topbar\.js(\?v=[^"]*)?"', f'src="../shared/topbar.js?v={v}"', s)
    mods = sorted(os.path.relpath(f, 'js').replace(os.sep, '/') for f in glob.glob('js/**/*.js', recursive=True) if not f.endswith('worker.js'))
    entries = [f'  "./js/{m}": "./js/{m}?v={v}"' for m in mods]
    if app == 'explainer':
        entries.append(f'  "../cartoon/js/worlds.js": "../cartoon/js/worlds.js?v={v}"')
        # 2.0: the maps, actions and outfits are shared with the Cartoons tab.
        entries.append(f'  "../cartoon/js/maps.js": "../cartoon/js/maps.js?v={v}"')
        # three.js for the code-drawn 3D engine (js/z3d/); the maps (js/z3d/maps3d.js) use its examples path.
        entries.append(f'  "three": "../vendor/three/three.module.min.js?v={v}"')
        entries.append(f'  "three/addons/": "../vendor/three/addons/"')
        entries.append(f'  "three/examples/jsm/": "../vendor/three/addons/"')
    if app == 'cartoon':
        # The 3D cartoon town (js/c3d, built from tools/c3d-src) needs three.js; town.js plans its shots
        # with the 3D tab's shot planner.
        for m in ['z3d/plan.js', 'z3d/vocab.js']:
            entries.append(f'  "../explainer/js/{m}": "../explainer/js/{m}?v={v}"')
        entries.append(f'  "three": "../vendor/three/three.module.min.js?v={v}"')
        entries.append(f'  "three/examples/jsm/": "../vendor/three/addons/"')
    for sh in sorted(glob.glob(os.path.join(root, 'shared', '*.js'))):
        n = os.path.basename(sh)
        entries.append(f'  "../shared/{n}": "../shared/{n}?v={v}"')
    if vendor:
        entries.append(f'  "{vendor}/mp4-muxer.mjs": "{vendor}/mp4-muxer.mjs?v={v}"')
    imap = '<script type="importmap">\n{"imports": {\n' + ',\n'.join(entries) + '\n}}\n</script>\n'
    s = re.sub(r'<script type="importmap">.*?</script>\n', '', s, flags=re.S)
    s = re.sub(r'<script type="module" src="\./js/app\.js(\?v=[^"]*)?"></script>', lambda m: f'<script type="module" src="./js/app.js?v={v}"></script>', s)
    # The import map must come before the first module script on the page (the top bar loads one in
    # <head>), or the browser ignores it: the ?v= stamps do nothing and bare imports like "three" fail.
    i = s.index('<script type="module"')
    s = s[:i] + imap + s[i:]
    open('index.html', 'w').write(s)
# The Loomy page itself loads account.js.
os.chdir(root)
s = open('index.html').read()
s = re.sub(r'src="account\.js(\?v=[^"]*)?"', f'src="account.js?v={v}"', s)
open('index.html', 'w').write(s)
print('stamped', v)
