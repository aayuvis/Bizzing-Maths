#!/usr/bin/env python3
"""process.py — size the raw plates for the app. Art is sized to how it is drawn
(the Bee's art-slim rule): world boards and the atlas 1920 wide, story plates
1280 wide, WebP q78. Writes app/public/art/<name>.webp.

    python3 tools/art/process.py             # the plates
    python3 tools/art/process.py --avatars   # raw/av-<id>.png -> app/public/avatars/<id>.webp
    python3 tools/art/process.py --roadart   # raw/{gate,summit,signpost}.png -> art/<id>.webp, keyed
    python3 tools/art/process.py --only lvl-1,lvl-2   # just these plates

Avatars are keyed off their flat magenta ground to alpha, trimmed, centred on a
square with a little room, and saved 384px RGBA WebP — the size and shape of
Bizzing Bee's set, whose champions-pack.py this keying follows."""
import os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = os.path.join(HERE, 'raw'), os.path.join(HERE, '..', '..', 'app', 'public', 'art')
AVOUT = os.path.join(HERE, '..', '..', 'app', 'public', 'avatars')
os.makedirs(OUT, exist_ok=True)


def avatar(src, dst, size=384, q=90):
    import numpy as np
    a = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
    h, w = a.shape[:2]
    kc = np.median(np.stack([a[0, 0, :3], a[0, w - 1, :3], a[h - 1, 0, :3], a[h - 1, w - 1, :3]]), axis=0)
    dist = np.sqrt(((a[:, :, :3] - kc) ** 2).sum(axis=2))
    alpha = np.clip((dist - 60.0) / (145.0 - 60.0), 0, 1)
    out = a.copy(); out[:, :, 3] = alpha * 255
    edge = (alpha > 0.02) & (alpha < 0.98)          # un-premultiply the magenta fringe
    if edge.any():
        f = alpha[edge][:, None]
        out[:, :, :3][edge] = np.clip((out[:, :, :3][edge] - kc * (1 - f)) / np.maximum(f, 0.15), 0, 255)
    im = Image.fromarray(out.astype(np.uint8), 'RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if bb: im = im.crop(bb)
    side = int(max(im.size) * 1.06)
    pad = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    pad.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    pad.resize((size, size), Image.LANCZOS).save(dst, 'WEBP', quality=q, method=6)
    return os.path.getsize(dst)


if '--avatars' in sys.argv:
    total = 0
    for f in sorted(os.listdir(RAW)):
        if not (f.startswith('av-') and f.endswith('.png')): continue
        n = f[3:-4]; b = avatar(os.path.join(RAW, f), os.path.join(AVOUT, n + '.webp'))
        total += b; print(f'avatar {n}: 384x384 {b // 1024} KB')
    print(f'total {total // 1024} KB'); sys.exit(0)

# Road furniture for the level roads: keyed off magenta exactly like the avatars.
ROADART = {'gate': 512, 'summit': 512, 'signpost': 384}
if '--roadart' in sys.argv:
    for n, sz in ROADART.items():
        b = avatar(os.path.join(RAW, n + '.png'), os.path.join(OUT, n + '.webp'), sz, 86)
        print(f'roadart {n}: {sz}x{sz} {b // 1024} KB')
    sys.exit(0)

# Medals: the Hive's own cut-out — the medallion is found by its bounding box on the
# white ground and cut as a circle, 256 square with alpha, so it sits on any card.
if '--medals' in sys.argv:
    from PIL import ImageDraw, ImageChops
    for f in sorted(os.listdir(RAW)):
        if not (f.startswith('medal-') and f.endswith('.png')): continue
        im = Image.open(os.path.join(RAW, f)).convert('RGB')
        diff = ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255))).convert('L').point(lambda v: 255 if v > 38 else 0)
        x0, y0, x1, y1 = diff.getbbox(); side = max(x1 - x0, y1 - y0); cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        im = im.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((512, 512), Image.LANCZOS)
        mask = Image.new('L', (2048, 2048), 0); ImageDraw.Draw(mask).ellipse((10, 10, 2038, 2038), fill=255)
        im.putalpha(mask.resize((512, 512), Image.LANCZOS))
        p = os.path.join(OUT, f[:-4] + '.webp'); im.resize((256, 256), Image.LANCZOS).save(p, 'WEBP', quality=84, method=6)
        print(f'{f[:-4]}: 256x256 {os.path.getsize(p) // 1024} KB')
    sys.exit(0)

only = next((a.split('=', 1)[1] if '=' in a else sys.argv[sys.argv.index(a) + 1] for a in sys.argv if a.startswith('--only')), None)
only = set(only.split(',')) if only else None
if not only: print('no --only given: re-processing EVERY plate in raw/')
total = 0
for f in sorted(os.listdir(RAW)):
    if not f.endswith('.png') or f.startswith(('av-', 'medal-')) or f[:-4] in ROADART: continue
    if only and f[:-4] not in only: continue
    n = f[:-4]; im = Image.open(os.path.join(RAW, f)).convert('RGB')
    w = 1280 if n.startswith('s-') else 640 if n.startswith('lib-') else 1920
    im = im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
    p = os.path.join(OUT, n + '.webp'); im.save(p, 'WEBP', quality=78, method=6)
    total += os.path.getsize(p); print(f'{n}: {im.width}x{im.height} {os.path.getsize(p)//1024} KB')
print(f'total {total//1024} KB')
