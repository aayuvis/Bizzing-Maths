#!/usr/bin/env python3
"""process.py — size the raw plates for the app. Art is sized to how it is drawn
(the Bee's art-slim rule): world boards and the atlas 1920 wide, story plates
and game backdrops 1280 wide, WebP q78. Writes app/public/art/<name>.webp.

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

# The family layer (standard v2): Octo's six poses and his head for the top bar, the
# avatars (this app's generated ones and the two packs handed over by Bizzing Bee), the
# six worlds by day and by night, and the app icons. The icon is DRAWN here: a cobalt
# tile with an exact graph grid, and the keyed wave pose laid on top — no lettering can
# appear in it because nothing that could letter it ever touches the tile.
HANDOFF = os.environ.get('BEE_HANDOFF', '')
MASCOT = os.path.join(HERE, '..', '..', 'app', 'public', 'mascot')
PUB = os.path.join(HERE, '..', '..', 'app', 'public')
def keyed(src):
    """The avatar() keying, returned as an image (trimmed to the character, transparent)."""
    import numpy as np
    a = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
    h, w = a.shape[:2]
    kc = np.median(np.stack([a[0, 0, :3], a[0, w - 1, :3], a[h - 1, 0, :3], a[h - 1, w - 1, :3]]), axis=0)
    dist = np.sqrt(((a[:, :, :3] - kc) ** 2).sum(axis=2))
    alpha = np.clip((dist - 60.0) / (145.0 - 60.0), 0, 1)
    # Only ground that is CONNECTED to the border is ground: a pale body the colour of a
    # muted backdrop stays opaque, because no path of backdrop-coloured pixels reaches it.
    from PIL import ImageDraw, ImageFilter
    cand = Image.fromarray(((alpha < 0.98) * 255).astype(np.uint8), 'L').copy()   # a copy: floodfill must own its pixels
    for x, y in [(x, 0) for x in range(0, w, 7)] + [(x, h - 1) for x in range(0, w, 7)] + [(0, y) for y in range(0, h, 7)] + [(w - 1, y) for y in range(0, h, 7)]:
        if cand.getpixel((x, y)) == 255: ImageDraw.floodfill(cand, (x, y), 128)
    ground = np.asarray(cand.point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MaxFilter(5))) > 0
    alpha = np.where(ground & (alpha < 0.98), alpha, 1.0)
    out = a.copy(); out[:, :, 3] = alpha * 255
    edge = (alpha > 0.02) & (alpha < 0.98)
    if edge.any():
        f = alpha[edge][:, None]
        out[:, :, :3][edge] = np.clip((out[:, :, :3][edge] - kc * (1 - f)) / np.maximum(f, 0.15), 0, 255)
    im = Image.fromarray(out.astype(np.uint8), 'RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bb) if bb else im
def square(im, size, room=1.06):
    side = int(max(im.size) * room)
    pad = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    pad.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    return pad.resize((size, size), Image.LANCZOS)
if '--family' in sys.argv:
    os.makedirs(MASCOT, exist_ok=True)
    for pose in ['wave', 'cheer', 'think', 'point', 'sleep', 'oops']:
        im = keyed(os.path.join(RAW, f'octo-{pose}.png'))
        p = os.path.join(MASCOT, f'octo-{pose}.webp'); square(im, 512).save(p, 'WEBP', quality=86, method=6)
        print(f'octo-{pose}: 512 {os.path.getsize(p) // 1024} KB')
    # the head for the 28px logo: the top 62% of the wave pose, squared
    w = keyed(os.path.join(RAW, 'octo-wave.png')); head = w.crop((0, 0, w.width, int(w.height * .62)))
    hb = head.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); head = head.crop(hb)
    p = os.path.join(MASCOT, 'octo-head.webp'); square(head, 96, 1.02).save(p, 'WEBP', quality=88, method=6); print('octo-head: 96')
    # avatars: this app's new ones (raw/av-*.png) at 512
    n = 0
    for f in sorted(os.listdir(RAW)):
        if f.startswith('av-') and f.endswith('.png'):
            dst = os.path.join(AVOUT, f[3:-4] + '.webp')
            if os.path.exists(dst) and '--force' not in sys.argv: continue
            square(keyed(os.path.join(RAW, f)), 512).save(dst, 'WEBP', quality=86, method=6); n += 1
    print(f'avatars generated here: {n}')
    # Bizzing Bee's Turbo and Origami packs, handed over already transparent
    if HANDOFF:
        for pack in ['turbo', 'origami']:
            for f in sorted(os.listdir(os.path.join(HANDOFF, pack))):
                if not f.endswith('.png'): continue
                im = Image.open(os.path.join(HANDOFF, pack, f)).convert('RGBA'); bb = im.getchannel('A').getbbox()
                square(im.crop(bb), 512).save(os.path.join(AVOUT, f[:-4] + '.webp'), 'WEBP', quality=86, method=6)
        print('Bee hand-off: turbo + origami')
    # worlds: day and night, 1920 for wide screens and 960 for phones
    for f in sorted(os.listdir(RAW)):
        if not (f.startswith(('mw-', 'mn-')) and f.endswith('.png')): continue
        wid, tod = f[3:-4], 'day' if f.startswith('mw-') else 'night'
        im = Image.open(os.path.join(RAW, f)).convert('RGB')
        for w, q in [(1920, 74), (960, 70)]:
            p = os.path.join(OUT, f'world-{wid}-{tod}{"" if w == 1920 else "-s"}.webp')
            im.resize((w, round(w * im.height / im.width)), Image.LANCZOS).save(p, 'WEBP', quality=q, method=6)
        print(f'world {wid} {tod}: {os.path.getsize(p) // 1024} KB small')
    # the app icon: cobalt, a graph grid, Octo
    from PIL import ImageDraw
    def tile(size, scale):
        S = 1024; im = Image.new('RGBA', (S, S), (31, 66, 184, 255)); d = ImageDraw.Draw(im)
        for i in range(0, S + 1, 64):        # the grid: fine lines every 64, a heavier line every 256
            c = (78, 116, 226, 255) if i % 256 else (104, 140, 236, 255); wd = 3 if i % 256 else 6
            d.line([(i, 0), (i, S)], fill=c, width=wd); d.line([(0, i), (S, i)], fill=c, width=wd)
        glow = Image.new('RGBA', (S, S), (0, 0, 0, 0)); ImageDraw.Draw(glow).ellipse((170, 170, 854, 854), fill=(120, 170, 255, 70))
        from PIL import ImageFilter
        im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(90)))
        o = keyed(os.path.join(RAW, 'octo-wave.png')); side = int(S * scale)
        o = square(o, side, 1.0); im.alpha_composite(o, ((S - side) // 2, (S - side) // 2 + int(S * .02)))
        return im.resize((size, size), Image.LANCZOS)
    tile(1024, .84).save(os.path.join(HERE, 'icon-master-1024.png'))
    tile(512, .84).convert('RGB').save(os.path.join(PUB, 'icon-512.png'), optimize=True)
    tile(192, .84).convert('RGB').save(os.path.join(PUB, 'icon-192.png'), optimize=True)
    tile(180, .84).convert('RGB').save(os.path.join(PUB, 'apple-touch-icon.png'), optimize=True)
    tile(512, .62).convert('RGB').save(os.path.join(PUB, 'icon-maskable-512.png'), optimize=True)   # inside the 80% safe zone
    print('icons: 192, 512, maskable-512, apple-touch-180')
    sys.exit(0)

only = next((a.split('=', 1)[1] if '=' in a else sys.argv[sys.argv.index(a) + 1] for a in sys.argv if a.startswith('--only')), None)
only = set(only.split(',')) if only else None
if not only: print('no --only given: re-processing EVERY plate in raw/')
total = 0
for f in sorted(os.listdir(RAW)):
    if not f.endswith('.png') or f.startswith(('av-', 'medal-', 'octo-', 'mw-', 'mn-')) or f[:-4] in ROADART: continue
    if only and f[:-4] not in only: continue
    n = f[:-4]; im = Image.open(os.path.join(RAW, f)).convert('RGB')
    w = 1280 if n.startswith(('s-', 'g-')) else 640 if n.startswith('lib-') else 1920
    im = im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
    # game backdrops sit behind play and under a veil, so they take a lower quality to stay near 100 KB
    p = os.path.join(OUT, n + '.webp'); im.save(p, 'WEBP', quality=66 if n.startswith('g-') else 78, method=6)
    total += os.path.getsize(p); print(f'{n}: {im.width}x{im.height} {os.path.getsize(p)//1024} KB')
print(f'total {total//1024} KB')
