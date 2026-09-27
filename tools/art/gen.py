#!/usr/bin/env python3
"""gen.py — paint the Atlas and the story plates with a Gemini image model.

The family doctrine (Bizzing-Videos docs/02): generative IMAGE models draw the
plates; everything structural is composited locally. So these prompts ask for
PLACES ONLY — no people, no animals that could read as characters, and no
lettering, digits or numerals of any kind (a model letters convincingly and
counts badly, and this is a maths app). The route across each world board is
drawn by the app as SVG over the painting, so the painting only has to leave
a calm band for it; the pins never depend on where a model put a path.

    python3 tools/art/gen.py            # everything missing
    python3 tools/art/gen.py --only w-gardens,s-market
    python3 tools/art/gen.py --force --only atlas

The key is read from $GKEY_FILE or /root/.gkey (never from the repo, never
printed). Output: raw PNGs in tools/art/raw/ (gitignored), then process.py
sizes them into app/public/art/.
"""
import base64, json, os, sys, time, urllib.request, concurrent.futures as cf

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw')
os.makedirs(RAW, exist_ok=True)
KEY = open(os.environ.get('GKEY_FILE', '/root/.gkey')).read().strip()
MODELS = os.environ.get('NB_MODELS', 'gemini-3-pro-image,gemini-3.1-flash-image,gemini-2.5-flash-image').split(',')

STYLE = (
    "Painted illustration for a children's maths app, in a warm hand-painted storybook style: "
    "soft gouache and watercolour textures, gentle directional light, rich but not garish colour, "
    "clean readable shapes, a sense of wonder. One continuous scene with no blank panels, no empty "
    "rectangles, no translucent bands or white strips, no flat colour blocks — busy detail may thin out a "
    "little toward the middle, but the painting always continues through it. "
    "ABSOLUTELY NO TEXT: no letters, no words, no numbers, no digits, no numerals, no mathematical "
    "symbols written anywhere, no signs with writing, no labels, no captions, no watermark, no "
    "signature. No people, no human figures, no faces, no characters. No frame, no border, no mount — "
    "one continuous full-bleed scene."
)

WORLD = {
    'w-gardens': "A wide panorama of sunny terraced flower gardens on gentle hills in morning light. "
                 "Flowerbeds laid out in neat pairs and rows of ten, flowers with ten petals, round stepping stones, "
                 "strings of bright berries like abacus beads, a little stone bridge over a stream, hedges clipped into "
                 "tidy blocks. Fresh greens, soft pinks and sunny yellows.",
    'w-market':  "A wide panorama of a lively open-air bazaar of striped awnings in late-afternoon "
                 "gold. Crates of mangoes and oranges stacked in perfect rectangular arrays, egg trays in grids, rows "
                 "and columns of hanging lanterns, woven baskets in lines, bolts of patterned cloth. Terracotta, "
                 "saffron, turquoise and deep green. Warm, busy, but no people.",
    'w-workshop':"A wide panorama of a whimsical inventor's workshop inside a tall timber hall, lit "
                 "by warm lamps and a big round window. Brass gears and cogs, balance scales, rulers and set-squares on "
                 "the walls, glass jars of coloured beads, a chalkboard with only a few abstract swirls of chalk dust, pulleys and levers, a workbench. "
                 "Honey wood, brass, deep blue shadows.",
    'w-observatory': "A wide panorama of a hilltop open-air stone observatory at twilight, with "
                 "great geometric instruments in pale sandstone — curved stairs, arcs, a huge sundial wedge, round "
                 "platforms — like an old Indian astronomical garden. A deep indigo sky full of stars and faint "
                 "constellation lines, a crescent moon, fireflies. Indigo, violet, rose-gold stone.",
    'w-harbour': "A wide panorama of a cheerful harbour at golden-blue evening. Painted fishing boats "
                 "in rows, a striped lighthouse, stone quay with coiled ropes, fishing nets drying in geometric patterns, "
                 "tide poles, gulls far away, sparkling water. Teal, sea-blue, coral and warm lamplight.",
}
ATLAS = ("A storybook fantasy MAP seen from above at a gentle angle, of a single island land made of five regions "
         "joined by one winding road from lower-left to upper-right: first a green terraced FLOWER GARDEN region "
         "(lower left), then a colourful MARKET TOWN of striped awnings, then a timber WORKSHOP village with gears "
         "and windmills (centre), then a HILLTOP STONE OBSERVATORY under a starry patch of sky, and finally a "
         "HARBOUR with boats and a lighthouse on the coast (upper right). Sea all around with soft waves. "
         "Painted like the endpapers of a children's book.")

SCENE = {
    's-garden':   "A sunny back garden with a lawn, a flowerbed, a tree and a bench; a glass jar of marbles on the bench.",
    's-festival': "A courtyard garden on a festival evening, potted plants and a tree strung with warm lanterns and fairy lights, plates of sweets on a low table, a deep blue sky.",
    's-bus':      "A friendly city bus stop on a bright day, a rounded bus pulling in, trees along the pavement.",
    's-library':  "A cosy school library corner with tall wooden shelves of books with blank spines, a reading rug and a plant.",
    's-cricket':  "A village cricket ground on a summer afternoon, a pavilion with a blank scoreboard, stumps on the pitch.",
    's-market':   "A fruit and vegetable market stall under a striped awning, crates of mangoes, egg trays and baskets.",
    's-hall':     "A bright school hall seen from the side, sunlight through tall windows, neat rows of wooden chairs on a polished floor, a small stage with red curtains at the far end.",
    's-train':    "The inside of a train carriage with a big window showing green hills and a river rushing past.",
    's-kitchen':  "A warm home kitchen with a wooden table, tins of biscuits, a teapot and a sunny window.",
    's-fair':     "A school fair on a grassy field with a small ferris wheel, a striped tent, plain coloured bunting and a few hay bales.",
    's-pond':     "A park pond with a line of flat stepping stones across it, reeds, ducks far away, a sunny sky.",
    's-night':    "A hilltop at night under a sky full of stars, a telescope on a stand, glowing lanterns by a stone wall.",
    's-stadium':  "A big sports stadium seen from inside, curving rows and rows of empty coloured seats, bright sky.",
    's-harbour':  "A harbour quay in the evening, painted fishing boats, crates of fish, coiled ropes, a lighthouse.",
    's-shop':     "A small corner shop with colourful kites hanging from the ceiling and shelves of toys, sunlight.",
    's-room':     "A sunny room with a floor being laid with square tiles in a neat grid, a stack of spare tiles.",
}

TOWER = ("ONE single tall whimsical storybook tower, exactly one tower and no second building of the same kind on a green hill at golden hour, seen from a little distance: twelve "
         "storeys stacked like different puzzle pieces — some with round windows, some with square ones, a spiral "
         "staircase winding up the outside, little balconies, a glass observatory dome at the very top, banners without "
         "writing, clouds drifting past the upper floors, a path leading to its door. Portrait-feeling composition "
         "centred in a wide frame, with sky and hills on both sides.")
WORLD2 = {
    'w-library':  "A wide panorama of a grand old library hall with towering bookshelves of blank-spined books, rolling ladders, long reading tables, globes, a great round window, stacks of counting blocks and bead frames. Warm amber light, deep green and burgundy.",
    'w-clocktower': "A wide panorama of a sunny town square around a tall clock tower whose round clock faces show ONLY short plain tick marks and two hands — absolutely no numerals, no Roman numerals, no digits on the dial, a market scale, a tape measure strung between lamp posts, jugs and jars of different sizes on a stall, a coin fountain. Cheerful blues and warm stone.",
    'w-bakery':   "A wide panorama of a cosy bakery kitchen: round pies and cakes cut into equal slices, pizzas in halves and quarters, trays of cookies in neat rows, measuring jugs, a big wooden table dusted with flour, copper pans. Creamy yellows, warm browns, pastel icing colours.",
    'w-shapecity':"A wide panorama of a playful city built entirely from geometric shapes: triangle roofs, circular windows, hexagon tiles, cube and cylinder towers, a pyramid, archways, colourful polygons, shadows falling at clear angles. Bright primary colours softened, clean blue sky.",
    'w-forest':   "A wide panorama of an enchanted forest where trees branch in neat forking patterns like factor trees, mushrooms grouped in rows and arrays, fireflies, a sparkling stream, a hollow log bridge. Deep greens, mossy golds, soft glowing light.",
    'w-palace':   "A wide panorama of a palace courtyard built from squares: square tiled floors in growing square patterns, square pools, stepped square terraces rising like a staircase, cube-shaped topiary, a checkerboard garden, fountains. Marble white, royal blue and gold, bright day.",
    'w-dock':     "A wide panorama of a busy wooden dock with measuring poles in the water, cargo crates of many sizes stacked by height, rope coils, a tall-masted sailing ship, lanterns, scales for weighing goods, gulls. Sea teals, warm timber, sunset orange.",
    'w-setisland':"A wide panorama of a small island with two large overlapping circular lagoons whose overlap forms a shared pool, little bridges between them, palm trees and flowers sorted into groups on either side, a treehouse lookout. Turquoise water, coral and leaf green.",
    'w-carnival': "A wide panorama of a cheerful carnival at dusk: striped tents, a carousel, game stalls with spinners and dice made of wood, bunting without writing, balloons in bunches of different sizes, strings of lights. Magenta, teal, warm gold.",
}
ATLAS2 = ("A storybook fantasy map seen from above at a gentle angle of an archipelago of NINE small separate islands in a calm sea, "
          "each island clearly different: a library island with a domed hall, a clock tower island whose clock has only plain tick marks, an island with a round cake-shop building covered in pie-shaped roof tiles, "
          "a city of geometric shapes, a dense forest island, a palace island of square terraces, a dock island with a ship, "
          "an island with two overlapping round lagoons, and a carnival island with striped tents. The islands are spread out in a loose "
          "ring with open water between them, dotted sea routes connecting them. Painted like the endpapers of a children's book.")
SCENE2 = {
    's-bakery':  "A bakery counter with round pies and cakes cut into slices, a tray of cookies and a pizza on a board.",
    's-clock':   "A town square with a clock tower whose round clock face shows ONLY short plain tick marks and two hands — absolutely no numerals of any kind on the dial — benches and a flower cart.",
    's-city':    "A park made of geometric shapes: a triangle climbing frame, a round pond, a hexagon sandpit, cube benches.",
    's-forest':  "A sunny forest clearing with mushrooms in neat rows and a fallen log bench.",
    's-palace':  "A palace courtyard with a floor of square tiles in a big square pattern and a square fountain.",
    's-carnival':"A carnival stall with a spinner wheel of plain coloured sections, wooden dice and prize balloons, no writing.",
    's-beach':   "A sunny beach with sandcastles, buckets and spades, shells in little piles, a calm sea.",
}
JOBS = {}
for k, v in WORLD.items(): JOBS[k] = (v + ' ' + STYLE + " Very wide landscape composition.", '21:9')
JOBS['atlas'] = (ATLAS + ' ' + STYLE.replace('No people', 'No people'), '16:9')
HERO = ("A wide, joyful storybook panorama for the top of a children's maths app home screen: a sunny morning sky "
        "with soft clouds, gentle hills, and floating above them small playful shapes — paper cubes, spheres, "
        "pyramids, abacus beads, a kite shaped like a triangle — casting soft shadows. Far off, a lighthouse, a "
        "windmill and a little observatory dome on the hills. Bright, warm, optimistic. The left half is calmer sky, "
        "busier detail toward the right and along the bottom.")
JOBS['home-hero'] = (HERO + ' ' + STYLE + ' Very wide banner.', '21:9')
for k, v in WORLD2.items(): JOBS[k] = (v + ' ' + STYLE + " Very wide landscape composition.", '21:9')
JOBS['atlas2'] = (ATLAS2 + ' ' + STYLE, '16:9')
for k, v in SCENE2.items(): JOBS[k] = (v + ' Leave the lower third fairly open and uncluttered, as a stage. ' + STYLE, '16:9')
JOBS['q-tower'] = (TOWER + ' ' + STYLE + ' Wide landscape frame.', '16:9')
for k, v in SCENE.items(): JOBS[k] = (v + ' Leave the lower third fairly open and uncluttered, as a stage. ' + STYLE, '16:9')


def call(model, prompt, ratio):
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": ratio}}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                                 data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    with urllib.request.urlopen(req, timeout=240) as r:
        d = json.load(r)
    for c in d.get('candidates', []):
        for p in c.get('content', {}).get('parts', []):
            if 'inlineData' in p: return base64.b64decode(p['inlineData']['data'])
    raise RuntimeError('no image in response: ' + json.dumps(d)[:300])


def run(name):
    prompt, ratio = JOBS[name]
    out = os.path.join(RAW, name + '.png')
    for attempt in range(6):
        model = MODELS[attempt % len(MODELS)]
        try:
            img = call(model, prompt, ratio)
            open(out, 'wb').write(img)
            return f'{name}: ok ({model}, {len(img)//1024} KB)'
        except Exception as e:
            msg = str(e)[:160]
            time.sleep(4 + attempt * 6)
    return f'{name}: FAILED — {msg}'


if __name__ == '__main__':
    only = next((a.split('=', 1)[1] if '=' in a else sys.argv[sys.argv.index(a) + 1] for a in sys.argv if a.startswith('--only')), None)
    names = only.split(',') if only else list(JOBS)
    if not only: print(f'no --only given: generating EVERYTHING missing ({len(names)} jobs)')
    if '--force' not in sys.argv: names = [n for n in names if not os.path.exists(os.path.join(RAW, n + '.png'))]
    with cf.ThreadPoolExecutor(int(os.environ.get('NB_WORKERS', '6'))) as ex:
        for line in ex.map(run, names): print(line, flush=True)
