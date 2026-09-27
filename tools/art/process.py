#!/usr/bin/env python3
"""process.py — size the raw plates for the app. Art is sized to how it is drawn
(the Bee's art-slim rule): world boards and the atlas 1920 wide, story plates
1280 wide, WebP q78. Writes app/public/art/<name>.webp."""
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = os.path.join(HERE, 'raw'), os.path.join(HERE, '..', '..', 'app', 'public', 'art')
os.makedirs(OUT, exist_ok=True)
total = 0
for f in sorted(os.listdir(RAW)):
    if not f.endswith('.png'): continue
    n = f[:-4]; im = Image.open(os.path.join(RAW, f)).convert('RGB')
    w = 1280 if n.startswith('s-') else 640 if n.startswith('lib-') else 1920
    im = im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
    p = os.path.join(OUT, n + '.webp'); im.save(p, 'WEBP', quality=78, method=6)
    total += os.path.getsize(p); print(f'{n}: {im.width}x{im.height} {os.path.getsize(p)//1024} KB')
print(f'total {total//1024} KB')
