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
    python3 tools/art/gen.py --only av-cubebot,av-hexbee   # avatars: see AVATAR below

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
LIB = {
    'lib-explorer': "A magnifying glass over a scattering of glowing coloured counters arranged in rows, columns and little factor rectangles on a wooden desk, a brass telescope and a notebook with blank pages.",
    'lib-working':  "A tidy desk with a large slate showing only a neat grid of empty boxes and arrows drawn in chalk, chalk sticks, a sponge, a warm lamp.",
    'lib-tables':   "A great wall of square glowing tiles in a perfect grid, some tiles lit in a diagonal line and some in coloured stripes, like a stained-glass window at sunset.",
    'lib-shapes':   "An artist's studio for shapes: a large clear protractor, a compass, rulers, set-squares, paper polygons and a cardboard cube net on a drawing board.",
    'lib-graphs':   "A large sheet of graph paper pinned to an easel on a hilltop, one bold straight line and one smooth curve drawn across the grid, kites flying in the sky beyond.",
    'lib-dictionary': "A huge open book with blank pages on a lectern in a cosy reading nook, small paper shapes and counters fluttering out of it like butterflies.",
    'lib-formulas': "A fan of beautifully illustrated collector cards spread on a velvet cloth, each card showing only a simple geometric picture — a square split into four parts, a triangle, a circle with a radius — no writing.",
    'lib-vedic':    "A peaceful courtyard in old India at dawn with a stone step-well, a banyan tree, palm-leaf manuscripts with no visible writing tied with string, brass lamps and a slate with chalk dots.",
    'lib-chinese':  "A calm old Chinese scholar's study: a wooden suanpan abacus with beads, bundles of bamboo counting rods on a table, a brush and ink stone, a round window onto a misty mountain garden, no writing anywhere.",
    'lib-facts':    "Colourful wooden number-bond toys: bead strings, stacking rods of different lengths in a staircase, a tray of counters, on a sunny play table.",
    'lib-stories':  "A cosy bookshelf nook with storybooks with blank spines, a reading cushion, a lamp, and small toy figures of animals peeking from the shelf.",
}
WORLD3 = {
    'w-quarry': "A wide panorama of a sunlit stone quarry in warm sandstone cliffs, where great smooth building blocks of a few different colours are stacked into towers, walls and arches, each tower clearly built from the same few kinds of block, a wooden crane, chisels and hammers on a bench, wildflowers on the ledges. Honey gold, terracotta, slate blue.",
    'w-mine': "A wide cutaway view of a friendly storybook mine: green meadow and a little winding-house at the top, and below the grass line a tall wooden lift shaft going straight down through layers of rock to several lamp-lit tunnels one under another, crystals glowing in the walls, mine carts on rails, a thermometer-like glass tube of coloured liquid on a post, lanterns. Earthy browns, glowing amber, cool crystal blue.",
    'w-lighthouse': "A wide panorama of a rocky headland at dusk with a tall striped lighthouse casting a long clean beam across a calm sea, a keeper's cottage, a brass telescope on a tripod, a big compass rose set into the stone terrace made only of arrows, sailing boats far out at different distances, gulls. Deep sea blue, warm lamp gold, rose sky.",
    'w-coinstreet': "A wide panorama of a cheerful old market street of small shops with awnings, a little bank with columns, glass jars of shining round coins on a counter, a pair of brass weighing scales, a piggy bank on a window sill, baskets of fruit with blank price tags, bunting with no writing. Warm cream, coin gold, leafy green, brick red.",
}
ATLAS3 = ("A storybook fantasy map seen from above at a gentle angle of FOUR separate islands in a calm sea: on the upper left an island "
          "of warm sandstone cliffs with a quarry of stacked stone blocks, on the upper right an island with a winding-house and a lift shaft "
          "going down into a hill with lamp-lit tunnels, on the lower left a rocky island with a tall striped lighthouse on its point, "
          "and on the lower right an island with a little market town of shops with awnings and a small bank with columns. "
          "Every island fully in frame with sea all round it. Open water between them, dotted sea routes connecting them, little sailing boats, NO compass rose. "
          "Painted like the endpapers of a children's book. Absolutely no writing, letters or numbers anywhere.")
JOURNEYART = {
    'j-tables': "A wide panorama of a sunny terraced garden laid out as a great grid: square flower beds in neat rows and columns that grow larger up the terraces, an orchard of fruit trees planted in a perfect square array, low box hedges drawing straight lines across and down, a stone path winding through, a little glass greenhouse, bees and butterflies, hills beyond. Fresh greens, sunflower yellow, sky blue. Absolutely no writing, letters, digits or symbols anywhere.",
    'j-vedic': "A wide panorama of a peaceful courtyard in old India at dawn: a great stone step-well with symmetrical stairs descending to green water, a huge banyan tree with hanging roots, carved sandstone pillars and arches, brass oil lamps glowing, a low wooden desk with a blank slate and a bowl of counting pebbles, marigold garlands, peacocks on a wall, distant temple-free hills. Warm saffron, sandstone gold and leaf green. Absolutely no writing, letters, digits or symbols anywhere.",
    'j-chinese': "A wide panorama of a calm old Chinese scholar's garden at morning: a round moon gate in a white wall, a curved stone bridge over a lotus pond, bamboo groves, a small pavilion with a wooden suanpan abacus and bundles of bamboo counting rods on a low table, an ink stone and brushes, pine trees and misty mountains beyond. Soft jade, ink grey and vermilion accents. Absolutely no writing, characters, letters, digits or symbols anywhere.",
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
for k, v in JOURNEYART.items(): JOBS[k] = (v + ' ' + STYLE + " Very wide landscape composition.", '21:9')
for k, v in WORLD3.items(): JOBS[k] = (v + ' ' + STYLE + " Very wide landscape composition.", '21:9')
JOBS['atlas3'] = (ATLAS3 + ' ' + STYLE, '16:9')
for k, v in SCENE2.items(): JOBS[k] = (v + ' Leave the lower third fairly open and uncluttered, as a stage. ' + STYLE, '16:9')
for k, v in LIB.items(): JOBS[k] = (v + ' ' + STYLE + ' Landscape tile composition.', '4:3')
JOBS['q-tower'] = (TOWER + ' ' + STYLE + ' Wide landscape frame.', '16:9')
for k, v in SCENE.items(): JOBS[k] = (v + ' Leave the lower third fairly open and uncluttered, as a stage. ' + STYLE, '16:9')

# ------------------------------------------------------------------ avatars
# Packs 3-5 of the avatar picker (model.js AVATAR_PACKS). These are CHARACTERS,
# which the plates above never are, so they get their own style block, written
# from looking at Bizzing Bee's set (robo, beaker, atom, crystal): one chibi
# sticker figure, centred, full body; a smooth even dark outline; glossy cel
# shading with soft gradients and a white specular glint; huge dark eyes with
# two white star-glints; pink blush ovals; a tiny smile; a few sparkles. The
# background is flat magenta so process.py --avatars can key it to alpha, the
# way the Bee's champions-pack.py does. Every body is BUILT FROM the maths
# object it is named for, and no maths object carries a numeral: a protractor
# or a ruler shows plain tick marks only.
AV_STYLE = (
    "A cute chibi kawaii collectible sticker character for a children's maths app, in exactly the style of a "
    "premium mobile-game avatar set: ONE single character, full body, centred, facing the viewer, the whole "
    "character inside the frame with a comfortable margin all round. A smooth, even, medium-thick dark navy-brown "
    "outline around every shape. Glossy soft cel shading with gentle gradients and a small white specular "
    "highlight. Huge glossy dark eyes with two bright white star-shaped glints, soft pink blush ovals on the "
    "cheeks, a small happy smile. Stubby rounded little limbs, exactly the right number of them. Bright, friendly, "
    "saturated colours. A few tiny sparkles near the character. "
    "THE ENTIRE BACKGROUND IS FLAT PURE MAGENTA (hex FF00FF), one solid uniform field with nothing in it: no "
    "ground, no shadow, no scenery, no glow, no border, no vignette, and no magenta or hot pink on the character "
    "itself. ABSOLUTELY NO TEXT: no letters, no words, no numbers, no digits, no numerals, no mathematical "
    "symbols, no writing of any kind anywhere in the image. Not a person, no human features beyond the cute face."
)
AVATAR = {
    # Shape Pals — bodies built from a solid
    'cubebot':    "A little robot whose body is a single perfect CUBE (clearly a cube, three faces visible, crisp edges), sky blue with a lighter top face, a friendly face on the front face, tiny stubby arms and legs, one short antenna with a round bead on top.",
    'orbowl':     "An owl whose whole body is a perfect glossy SPHERE, a round ball of soft teal feathers, two small wing flaps, little tufted ear points, orange feet, big round eyes on the front of the ball.",
    'pyrafox':    "A fox whose body is a clear square-based PYRAMID with flat triangular faces in orange and cream (crisp straight edges, apex on top), a face on the front face, pointed ears near the apex, four stubby legs and one fluffy white-tipped tail.",
    'cylicat':    "A cat whose body is an upright CYLINDER like a tin can with flat circular top and curved sides, butter-yellow and cream stripes around it (no purple, no lilac, no pink), cat ears on the flat circular top, a face on the curved front, two small paws and a curly tail.",
    'dodecadrake':"A small friendly dragon whose round body is a regular DODECAHEDRON made of flat pentagon faces in shades of emerald green (the pentagon facets clearly visible), little stubby legs, two small leaf-green wings, a short rounded tail, no teeth showing.",
    'conicorn':   "A unicorn whose body is an upright CONE, wide round base and pointed top, pastel mint and lemon, a face on the front of the cone near the base, a tiny golden spiral horn at the tip, a soft sky-blue mane and tail, four stubby legs under the base.",
    # Tool Kit — bodies built from a geometry tool
    'protortle':  "A turtle whose shell is a clear half-circle PROTRACTOR made of transparent pale-blue plastic, marked around its curved edge with ONLY short plain tick marks (no numerals), a small hole at the centre of the straight edge; a green turtle head and four stubby legs peek out.",
    'compacrab':  "A crab built from a school drawing COMPASS: its two big arms ARE the two long straight legs of the compass, spread apart in an upside-down V from a round silver hinge knob on top of its head; one arm ends in a sharp metal point, the other arm ends in a short yellow pencil. A round coral-orange crab body with the face on it, six small walking legs. No clock, no watch, no dial anywhere.",
    'abacuhog':   "A hedgehog whose spines are the rows of an ABACUS: short wooden rods fanning out across its back, each threaded with round coloured beads (red, yellow, blue, green), a soft brown face, a pink nose, four tiny feet.",
    'rulraffe':   "A giraffe whose long neck is a wooden RULER marked with ONLY plain short tick lines (no numerals), a yellow body with brown patches, little ossicone horns, four stubby legs, a small tufted tail.",
    'setsquin':   "A penguin whose body is a transparent turquoise plastic SET SQUARE: a RIGHT-ANGLED triangle with one perfectly square 90-degree corner at the bottom left, one vertical straight side up the left, one horizontal straight side along the bottom, and the long sloping side on the right, with a smaller right-angled triangular hole in its middle. NOT an equilateral or isosceles triangle. A face near the top, a small orange beak, a white tummy patch, two little flippers and orange feet.",
    'pencilbird': "A small round bird whose beak is a sharpened wooden PENCIL tip and whose tail is the pencil's pink eraser end, the body a yellow painted pencil-coloured ball of feathers, two little wings, orange feet.",
    # Pattern Pets — a pattern from nature and maths
    'nautilus':   "A snail whose shell is a NAUTILUS logarithmic SPIRAL, chambers growing steadily larger as they wind outward, cream and warm terracotta stripes, a soft sea-green snail body with two eye stalks.",
    'hexbee':     "A round honey bee whose striped body is covered in a neat HEXAGON honeycomb pattern of golden cells, small translucent wings, two antennae, a little honey drop in its hands.",
    'tessgecko':  "A gecko whose skin is a TESSELLATION of interlocking tiles that fit together with no gaps (like a mosaic of repeating shapes) in turquoise, lime and navy, a curled tail, four splayed toes on each of its four feet.",
    'flakefox':   "An arctic fox with a SIX-FOLD SNOWFLAKE pattern: a large symmetric six-armed snowflake emblem on its chest and smaller six-armed snowflakes on its fluffy white-and-ice-blue fur, one fluffy tail.",
    'peacock':    "A small round peacock with a fanned tail of feathers; instead of ordinary eyespots, the end of every tail feather is a neat curling SPIRAL, like a snail-shell swirl coiling inward, in gold and royal blue. Rich teal body, a little crest of three feathers on its head, standing on two orange feet. No shadow under it.",
    'sunlion':    "A lion cub whose mane is a SUNFLOWER: golden petals radiating round his face and the seeds arranged in crossing SPIRALS like a real sunflower head, a tan body, a tufted tail.",
}
for k, v in AVATAR.items(): JOBS['av-' + k] = (v + ' ' + AV_STYLE, '1:1')

# ------------------------------------------------------------------ level roads
# The Atlas as ONE ROAD PER LEVEL (ten levels). Each level gets a wide header
# landscape that grows in height and adventure with the level. The app draws its
# own road on top, so the painted path is only scenery — but every one of them
# must visibly lead into the distance. Signposts are asked for with BLANK boards
# (a signpost is the likeliest place for a model to letter something).
LEVELS = {
    'lvl-1':  "A wide panorama of a gentle sunny spring meadow of wildflowers and soft low hills, a small winding garden path of pale earth and round stepping stones leading from the foreground away into the distance, a little wooden picket gate, two short wooden signposts whose boards are completely BLANK plain wood, butterflies, a small pond, a few round trees. Fresh greens, buttercup yellow, pale sky blue. Low, safe, cosy.",
    'lvl-2':  "A wide panorama of a riverside country path winding beside a sparkling slow river towards a small cluster of cottages with thatched and tiled roofs, a little stone footbridge, a water mill with a turning wheel, willow trees, reeds, ducks far away. The path clearly leads from the foreground into the distance. Soft greens, river blue, warm cottage cream.",
    'lvl-3':  "A wide panorama of rolling orchard hills in late summer, rows of round fruit trees heavy with red and golden fruit on the slopes, a winding dirt lane climbing between the orchard rows over one hill and down into the next valley, woven baskets of fruit and a wooden cart parked by the lane, a distant windmill. Apple red, golden ochre, leafy green.",
    'lvl-4':  "A wide panorama of a deep old forest trail, tall trees with shafts of sunlight slanting through, ferns and moss, a winding earthen trail leading into the woods and across a sturdy wooden plank bridge over a rushing stream, mushrooms, a hollow log, fireflies in the shade. Deep emerald, moss gold, dappled light.",
    'lvl-5':  "A wide panorama of dramatic sunlit coastal cliffs above a turquoise sea, a winding clifftop path of packed earth running along the grassy edge and away round the headlands into the distance, wooden fence posts, sea pinks and gorse, waves breaking on rocks below, gulls far off, a small stone lookout. Turquoise, chalk white, gorse yellow, grass green.",
    'lvl-6':  "A wide panorama of a vast red-rock canyon in warm afternoon light, layered sandstone walls, a narrow trail cut into the canyon side winding onward, two long swaying rope-and-plank bridges spanning deep gaps between rock pillars, a thin river far below, desert flowers and hardy shrubs. Terracotta, rust orange, sage green, deep sky blue.",
    'lvl-7':  "A wide panorama of high highland country with two still mirror-like mountain lakes reflecting the peaks, heather-covered slopes, a stony path winding along the lakeshore and up over a high green pass between the mountains, a small stone hut, mist lying low on the water, a waterfall. Heather purple, loch blue, slate grey, moss green.",
    'lvl-8':  "A wide panorama of towering alpine mountains, a zig-zagging switchback road climbing a steep green slope in tight hairpin bends up towards a snowy pass, wooden fence posts along the bends, pine forests below, a small stone shelter hut, snowcapped peaks, clouds drifting at the level of the road. Snow white, pine green, cool blue, warm stone.",
    'lvl-9':  "A wide panorama of a high rocky headland at dusk, a tall striped lighthouse at the far end of the headland casting a beam across the sea, a winding coastal road running along the cliff edge from the foreground out to the lighthouse, stone walls beside the road, a deep violet and rose evening sky with the first stars, the sea far below. Deep sea blue, rose and violet sky, warm lamp gold.",
    'lvl-10': "A wide panorama of a starlit mountain summit high above a sea of soft clouds at night, a winding stone path and steps climbing along a ridge to the very top where a small round observatory dome stands with its shutter open to the sky, a slender stone arch bridge crossing a gap on the ridge, a vast deep-indigo sky full of stars and a glowing band of the milky way, a crescent moon, distant peaks poking through the clouds. Indigo, silver, starlight gold. The highest, most wondrous place of all.",
}
LVL_TAIL = (" The path or road clearly leads from the foreground into the distance. Seen from a slightly raised viewpoint. "
            "Any signs, boards or banners are completely blank with nothing written or painted on them.")
for k, v in LEVELS.items(): JOBS[k] = (v + LVL_TAIL + ' ' + STYLE + " Very wide landscape composition.", '21:9')

# Road furniture: small isolated objects the app places on the road. Keyed to
# alpha off a flat magenta ground, exactly like the avatars (process.py --roadart).
ROAD_STYLE = (
    "A single isolated storybook object for a children's maths app, painted in a warm hand-painted storybook style: "
    "soft gouache and watercolour textures, gentle light from the upper left, rich but not garish colour, clean readable "
    "shapes, a slightly chunky toy-like charm. The whole object centred and fully inside the frame with a comfortable margin "
    "all round, seen from the front at a slight three-quarter angle. "
    "THE ENTIRE BACKGROUND IS FLAT PURE MAGENTA (hex FF00FF), one solid uniform field with nothing in it: no sky, no scenery, "
    "no cast shadow on the background, no border, no vignette, and no magenta or hot pink anywhere on the object itself. "
    "ABSOLUTELY NO TEXT: no letters, no words, no numbers, no digits, no numerals, no symbols, no emblems, no writing of any "
    "kind anywhere. No people, no figures, no faces, no animals."
)
ROADART = {
    'gate':     "A small storybook stone archway gatehouse: a rounded arch of warm honey-coloured stone blocks with a little tiled roof on top, "
                "an open wooden gate folded back so the way through is clear, a small plain teal pennant flag flying from a pole on the roof, "
                "a glowing brass lantern hanging at one side of the arch, a patch of grass and a few flowers at its foot.",
    'summit':   "A rocky mountain summit crag with a tall flagpole flying a large plain golden-yellow flag with no emblem, beside a small "
                "round castle-like stone tower with a pointed blue roof and a warmly lit window, a little snow on the rocks. The flag and the tower "
                "catch bright trophy-gold highlights, and a few small solid golden four-pointed sparkle stars float just above the peak. "
                "The shine is painted ON the object only: no halo, no rays, no glow and no soft light spilling onto the background.",
    'signpost': "A wooden fingerpost signpost: one sturdy weathered wooden post set in a small tuft of grass, with three wooden pointer "
                "boards pointing in different directions, each board completely BLANK plain wood grain with nothing carved or painted "
                "on it, a little moss and a small flower at the base.",
}
for k, v in ROADART.items(): JOBS[k] = (v + ' ' + ROAD_STYLE, '1:1')

# ------------------------------------------------------------------ the Arcade
# One backdrop per game (games.js). The game draws its own play on top — the
# bubbles, the cards, the line — so each plate keeps its busy detail to the
# edges and the bottom, and its middle is open sky or calm water the play can
# sit on. None of them names the game: a named place gets lettered on a sign.
GAMES = {
    'g-rush':   "A wide view of a bright breezy summer sky above a meadow of wildflowers on rolling hills, dozens of shining "
                "soap bubbles of many sizes drifting up from the flowers and catching rainbow light, a few small kites far off, "
                "soft white clouds. The upper two thirds is open luminous sky with only bubbles and clouds; the meadow, "
                "flowers and hills fill the lower edge. Sky blue, buttercup yellow, fresh green, rainbow glints.",
    'g-target': "A wide view of a cheerful archery meadow at a village fair on a golden afternoon: round straw archery "
                "butts with plain painted rings in red, white and gold standing on wooden easels at the left and right edges, "
                "a few arrows stuck in them, bunting of plain coloured triangles strung between poles, a striped tent far off, "
                "a quiver and a wooden bow resting on a hay bale. The centre is an open sunlit lawn under a soft sky. "
                "Warm gold, poppy red, meadow green.",
    'g-line':   "A wide view of a long straight wooden seaside pier stretching perfectly horizontally from the left edge to the "
                "right edge across the middle of the picture, seen exactly side-on at eye level, its evenly spaced wooden posts "
                "standing in calm turquoise water, a small round lamp post at each end, gulls in the sky, a calm sea and a "
                "pale sunrise sky with soft clouds above, small sailing boats far away. Clean, calm and uncluttered. "
                "Turquoise, sand, coral pink, soft sky blue.",
}
for k, v in GAMES.items(): JOBS[k] = (v + ' ' + STYLE + ' Wide landscape composition.', '16:9')


# Medals: the family medallion (Bizzing Hive's badge prompt, word for word in its
# frame), so a Maths medal sits on the Hive's shelf beside the others. A medallion
# HAS a rim, so it does not take STYLE's "no frame" line; it keeps every no-text rule.
MEDAL_STYLE = (
    "Painted illustration for a children's maths app, in a warm, modern storybook style: soft gouache and "
    "watercolour textures, clean readable shapes, gentle light, joyful but calm colour. ABSOLUTELY NO TEXT: no "
    "letters, no words, no numbers, no digits, no numerals, no mathematical symbols, no labels, no watermark, no "
    "signature. No people, no human figures, no faces. A single round enamel-pin style MEDALLION badge, centred, "
    "filling most of the square, with a bold honey-gold rim and a rich coloured inner field, on a plain pure white "
    "background. Inside the medallion: ")
MEDAL = {
    'medal-first-star': "one big golden five-pointed star resting on a mossy stepping stone — a first step. Sky blue and gold.",
    'medal-first-land': "a small green island with a plain triangular flag planted on its hill, calm sea around it. Sea green and gold.",
    'medal-level-up':   "a staircase of chunky stone steps climbing up to a bright sunrise. Warm orange and gold.",
    'medal-quick-25':   "a bright zig-zag lightning bolt over a little cloud. Electric blue and yellow.",
    'medal-fluent-100': "a wooden abacus with rows of round coloured beads, every bead neatly pushed to one side. Deep teal and amber.",
    'medal-fearless':   "a small rocket zooming upward past three little golden stars. Indigo and flame orange.",
    'medal-tower-4':    "a round stone tower with a pennant on top and a little staircase winding up its side, halfway up a mossy hill. Violet and gold.",
    'medal-tower-top':  "a tall stone tower above the clouds with a glowing golden crown on its roof. Royal purple and gold.",
    'medal-puzzler':    "a chunky jigsaw piece slotting into place beside a small cube. Coral pink and cream.",
    'medal-stories':    "an open storybook with a paper boat sailing off its pages. Warm red and cream.",
    'medal-explorer':   "a small open treasure chest with a curl of golden light, a rolled map beside it. Forest green and gold.",
    'medal-paper':      "a neat stack of blank paper sheets with a pencil lying across them and a small hourglass beside. Teal and gold.",
    'medal-paper-half': "a round sand hourglass with the top half and bottom half of sand perfectly equal, a laurel sprig beside it. Plum purple and gold.",
    'medal-contest':    "a plain golden trophy cup with two handles and laurel leaves. Navy and gold.",
}
for k, v in MEDAL.items(): JOBS[k] = (MEDAL_STYLE + v, '1:1')

# The Contest Hall: three strategy worlds and the hall's own road.
CONTEST = {
    'w-strategy': "A wide panorama of a cosy old school of thinking on a green hill: a stone schoolhouse with tall arched windows, a bell tower, a courtyard with chalk-blank slates on easels, a great wooden staircase leading UP to a door at the top and a matching staircase leading back DOWN, a long garden path that forks and rejoins, a set of balance scales on a bench, a weather vane, children's satchels on hooks but no people. Warm brick red, chalk white, meadow green, sky blue.",
    'w-logic': "A wide panorama of a sunny hedge maze seen from slightly above, with tall clipped green hedges forming clear corridors, little stone pedestals at junctions, a fountain at the centre, rows of identical round stepping stones in two colours, pairs of matching gloves and socks pegged on a washing line by a gardener's hut, a big wall calendar carved as blank stone squares, owls on the hedge tops. Deep hedge green, lavender, warm stone, golden light.",
    'w-figures': "A wide panorama of a cheerful fairground of shapes: a striped tent whose canvas is cut into triangles, a big painted grid of square tiles on the ground, a stall stacked with wooden cubes and giant dice with blank faces, bunting made of triangles, a staircase-shaped wooden stage, a ferris wheel with spokes, a rope net of squares, colourful kites of different polygons in the sky. Candy red, sunflower yellow, teal, cream.",
    'j-contest': "A wide panorama of a grand but friendly hall of contests at the top of a long road: a road of flat stones climbing past three little pavilions (a schoolhouse, a hedge maze, a fairground tent) to a great domed hall with tall windows and banners with no writing, rows of small wooden desks visible through an open door, a tower topped by a plain round stained-glass window of coloured glass and no clock, laurel trees, morning light. Royal blue, gold, warm stone, green. Absolutely no writing, letters, digits or symbols anywhere.",
}
for k, v in CONTEST.items(): JOBS[k] = (v + ' ' + STYLE + " Very wide landscape composition.", '21:9')


# ------------------------------------------------------------------ the family layer (standard v2)
# Octo, the mascot (§2), the 50 avatars that take the collection to 96 (§8), and the six
# painted worlds with their separately painted nights (§7). Octo is drawn FROM the concept
# model sheet (tools/art/ref/octo-sheet.webp, sent as a reference image) so all six poses
# are one character. Each night plate is painted FROM its own day plate, so lamps light in
# the same windows and nothing moves. The app icon is NOT generated: the cobalt tile and
# its graph grid are drawn by process.py --icons, and the keyed wave pose is laid on top,
# so the grid is exact and the tile has no lettering by construction.
REF = os.path.join(HERE, 'ref')
OCTO = ("Draw the SAME character as in the attached model sheet: Octo, a small round coral-orange octopus with a big "
        "round glossy head, big glossy dark eyes with two white catch-lights, rosy cheeks, a light-blue graph-paper "
        "neckerchief tied at the front, and EXACTLY EIGHT short curly arms. Same colours, same proportions, same thick "
        "dark-plum outline and soft cel shading, children's sticker style. ONE single Octo, full body, centred, with a "
        "comfortable margin all round. THE ENTIRE BACKGROUND IS FLAT PURE MAGENTA (hex FF00FF), one solid uniform field: "
        "no ground, no shadow, no glow, no border, and no magenta or hot pink on the character. ABSOLUTELY NO TEXT, no "
        "letters (not even a Z), no digits, no numbers, no symbols anywhere. The pose: ")
OCTO_POSE = {
    'octo-wave':  "waving hello with one arm raised high, a warm open smile, the other arms relaxed and curled.",
    'octo-cheer': "cheering, two arms thrown up high in delight, eyes happily squeezed into upward curves, a big open smile, three tiny gold sparkle stars around the arms.",
    'octo-think': "thinking, one curled arm touching the chin, eyes looking up and to the side, a small thoughtful smile, holding a short yellow pencil in another arm.",
    'octo-point': "pointing to the viewer's right with one long arm stretched out sideways, looking that way with a bright encouraging smile.",
    'octo-sleep': "fast asleep, curled up cosily, eyes peacefully closed as gentle downward curves, a small soft smile, a tiny pale-blue night cap, arms tucked in, resting on a small round pale-blue cushion.",
    'octo-oops':  "an 'oops' moment: eyebrows raised, a small embarrassed wobbly smile, one arm scratching the back of its head, a single light-blue sweat drop beside the head, a short yellow pencil dropped beside it.",
}
for k, v in OCTO_POSE.items(): JOBS[k] = (OCTO + v, '1:1', [os.path.join(REF, 'octo-sheet.webp')])

# The new avatars: the Bee family sticker style (chubby, thick plum outline, cel shading), keyed off magenta.
AV2_STYLE = AV_STYLE.replace("A smooth, even, medium-thick dark navy-brown outline", "A smooth, even, THICK dark-plum outline") + (
    " Chubby rounded proportions, sticker style, consistent with a collectible set.")
AVATAR2 = {
    # Shape Pals +2
    'torupup':     "A puppy whose round body is a glazed TORUS, a ring doughnut shape with a hole clean through the middle, strawberry icing with tiny sprinkles, floppy ears, stubby legs, a wagging tail.",
    'octachick':   "A chick whose body is a simple diamond-shaped OCTAHEDRON like two square pyramids glued base to base, one point at the top and one at the bottom, only FOUR large flat triangular faces visible from the front (lemon and gold, crisp edges), a small orange beak in the middle, tiny wings at the sides, orange feet under the bottom point.",
    # Counting Critters
    'ladybird':    "A round ladybird with a shiny red shell and exactly six round black spots, three on each side, a little black head with two antennae, six stubby legs.",
    'beadpillar':  "A caterpillar whose body is a row of round beads in alternating green and yellow like a counting bead string, a happy round head with two tiny antennae, many stubby feet.",
    'starfish':    "A starfish with exactly five rounded arms, coral orange with small cream dots in a neat row along each arm, standing up on two of its arms.",
    'peapod':      "A puppy snuggled inside an open green pea pod, with a neat row of five round green peas beside it in the pod, floppy ears.",
    'eggchick':    "A fluffy yellow chick sitting in a cardboard egg tray of two rows of three cups, five cups holding white eggs and the sixth holding the chick.",
    'dalmatian':   "A dalmatian puppy, white with neat round black spots, a red collar with a round blank tag, sitting.",
    'cubellama':   "A llama whose long neck is a tower of colourful interlocking linking cubes stacked one on another (red, blue, yellow, green), a fluffy cream body, little ears.",
    'berrybear':   "A bear cub holding a bunch of round purple berries arranged in a neat triangle, one berry on top, two below, three below that; brown fur, round ears.",
    # Tool Kit +2
    'chalkbun':    "A bunny whose body is a stubby white CHALK stick standing upright, long ears, a pink nose, a few soft puffs of blue and yellow chalk dust.",
    'sharpowl':    "A soft round sky-blue owl holding a small silver PENCIL SHARPENER in its wings, a sharp yellow pencil poking out of the sharpener and a little curl of wooden shaving falling, round fluffy ear tufts, big friendly eyes, an orange beak.",
    # Fraction Feast
    'pizzapanda':  "A panda cub holding a round pizza cut into four equal slices, one slice pulled a little way out.",
    'piepig':      "A piglet sitting behind a round cherry pie cut into six equal slices.",
    'orangeotter': "An otter holding an orange cut in half, showing its equal segments like the spokes of a wheel.",
    'cakecat':     "A fluffy cream-coloured kitten sitting beside a ROUND two-layer strawberry cake seen from slightly above, the circular cake with exactly one quarter-slice cut out so a clean right-angled gap shows, pink icing, the kitten licking its lips.",
    'melonwhale':  "A small whale whose body is a half-moon slice of watermelon, green rind, red flesh with neat rows of black seeds, a little water spout.",
    'chocobear':   "A bear cub hugging a chocolate bar made of a neat grid of squares, two rows of four, with one square snapped off.",
    'sandhippo':   "A small hippo holding a square sandwich cut corner to corner into two equal triangles.",
    'pancakepeng': "A penguin balancing a stack of round pancakes with a perfect square pat of butter on top.",
    # Gear Gang
    'coggoat':     "A goat whose round body is a big brass COG wheel with even teeth around its edge, little curled horns, four stubby legs.",
    'pulleyparrot':"A parrot hanging from a rope looped over a round wooden PULLEY wheel, bright green and red feathers.",
    'springroo':   "A kangaroo bouncing on a tail that is a shiny metal coil SPRING, sandy fur, small pouch.",
    'boltbeetle':  "A beetle whose shell is a silver hexagonal metal NUT with a short bolt through it, blue head, six stubby legs.",
    'spannerwalrus':"A walrus whose two tusks are small silver spanners, chubby grey body, whiskers, flippers.",
    'scalebadger': "A badger holding a small brass balance scale with two pans hanging perfectly level, one round weight in each pan.",
    'hourhamster': "A hamster sitting inside a glass HOURGLASS with golden sand trickling down past it, wooden top and bottom caps.",
    'windmouse':   "A mouse whose body is a little red-brick windmill with four sails, round mouse ears on top.",
    # Star Crew +2
    'meteorpup':   "A puppy riding a small glowing meteor with a short sparkly tail, wearing tiny flying goggles.",
    'moonrover':   "A little six-wheeled moon rover robot with a round glass dome head and a friendly face, two small solar-panel wings.",
    # Lab Friends +2
    'prismcat':    "A cat whose body is a clear glass triangular PRISM, a thin beam of white light entering one side and a small rainbow fan coming out of the other.",
    'magnifly':    "A firefly whose body is a round MAGNIFYING GLASS with a wooden handle as its tail, glowing gently, little wings.",
    # Pattern Pets +2
    'pineporc':    "A porcupine whose back is a PINE CONE with its scales in crossing spirals, warm brown, a small pink nose.",
    'mandalamoth': "A moth with perfectly mirror-symmetric wings patterned with concentric circles and petals, soft lilac and gold, a fluffy body.",
    # Symmetry Friends
    'mirrorfly':   "A butterfly whose two wings are exact mirror images of each other, bright turquoise and orange with matching dots on each side.",
    'pinpup':      "A puppy holding a paper PINWHEEL with four curled sails in four colours.",
    'kaleidokoala':"A koala holding a KALEIDOSCOPE tube, with a six-fold coloured flower pattern glowing at its end.",
    'kolamturtle': "A tortoise whose terracotta shell is decorated with a white dotted KOLAM pattern: a neat grid of white dots with smooth looping lines drawn around them.",
    'kitekitten':  "A kitten holding the string of a diamond-shaped paper KITE made of four symmetric coloured triangles with a short tail of bows.",
    'lanternlemur':"A ring-tailed lemur holding a round paper LANTERN with symmetric petal patterns, glowing warm.",
    'toptapir':    "A baby tapir beside a wooden SPINNING TOP with symmetric painted stripes.",
    'rangolirabbit':"A rabbit sitting beside a small round RANGOLI flower pattern of coloured petals with eight-fold symmetry.",
    # Pixel Pals
    'pixelkitty':  "A cat made of chunky square PIXELS like an 8-bit video-game sprite, orange and white, a smooth outline around the blocky shape.",
    'blockfrog':   "A frog built from chunky square pixel blocks like a retro game sprite, lime green, a smooth outline around it.",
    'tetrosnake':  "A snake made of four square blocks joined in an S shape like a falling-block puzzle piece, bright teal, a face on the end block.",
    'voxelbear':   "A bear cub built from small 3D cubes (voxels), honey brown, chunky and cute.",
    'joyjelly':    "A jellyfish whose round bell is the red ball on top of an arcade JOYSTICK, wavy purple tentacles below.",
    'mazemole':    "A mole with a simple square MAZE pattern on its back, little pink paws, small round glasses.",
    'bitbunny':    "A bunny made of chunky pixel blocks like an 8-bit sprite, pale pink and white, a smooth outline around it.",
    'glitchgecko': "A gecko whose body has offset colour stripes like a friendly screen glitch, cyan and lime, a curled tail.",
}
for k, v in AVATAR2.items(): JOBS['av-' + k] = (v + ' ' + AV2_STYLE, '1:1')
# Two packs that replace the faces borrowed from Bizzing Bee (Star Crew, Lab Friends): no face may be
# in two apps' 96 (standard §8), so world 4 gets Sky Counters and Measure Lab, painted here.
AVATAR3 = {
    'phasefox':     "A fox whose big fluffy tail is marked with the phases of the moon in a row along it — a full moon, a half moon and a crescent — silver and midnight blue fur, a small star on its forehead.",
    'rocketrabbit': "A bunny riding inside a little rocket built from simple solids: a CYLINDER body, a CONE nose and three triangular fins, cream and red, a tiny puff of cloud below.",
    'stardeer':     "A young deer whose antlers are a CONSTELLATION: small bright dots joined by thin straight lines, soft lavender coat with tiny star freckles.",
    'slothsat':     "A smiling sloth hanging by its arms from a small SATELLITE with two rectangular grid-panel wings, soft brown fur.",
    'ringturtle':   "A turtle whose round shell is a little ringed PLANET with a tilted ring around it, banded in cream and apricot, a green turtle head and stubby legs.",
    'galaxysnail':  "A snail whose shell is a SPIRAL GALAXY, arms of glowing stars curling inward to a bright golden centre, a deep violet body with glowing antennae.",
    'thermobear':   "A polar bear cub holding a tall THERMOMETER marked with ONLY plain tick lines (no numerals), the red line half way up, a woolly blue scarf.",
    'jugmouse':     "A mouse sitting in a clear glass MEASURING JUG with a spout and a handle and NO markings at all on the glass, the jug half full of blue water, round ears.",
    'tapesnail':    "A snail whose shell is a coiled yellow TAPE MEASURE marked with ONLY plain tick lines (no numerals), the tape's end pulled out a little.",
    'levellizard':  "A lizard lying along a SPIRIT LEVEL tool, a long green bar with a small window holding a bubble exactly in the middle, orange and green scales.",
    'pendulumpanda':"A panda cub swinging happily on a PENDULUM: a straight rod with a round brass bob, hanging from a little wooden frame.",
    'fractaldragon':"A friendly small dragon whose wings are FRACTAL snowflake shapes, edges made of smaller and smaller triangles, icy blue and silver body, no teeth showing.",
}
for k, v in AVATAR3.items(): JOBS['av-' + k] = (v + ' ' + AV2_STYLE, '1:1')

# Six worlds: a painted day plate and, from it, a painted night. Places only: no people, no lettering.
MW = {
    'graph':     "A wide panorama of a sunny patchwork countryside seen from a gentle hill: fields laid out in neat squares and rectangles like a giant sheet of squared paper, hedgerows in straight lines crossing at right angles, a river that curves smoothly like a plotted curve, a little red-roofed farmhouse, rows of round trees evenly spaced, colourful kites high in a pale blue sky, soft white clouds. Fresh greens, cornflower blue, buttercup yellow.",
    'chalk':     "A wide panorama of a cosy old village schoolhouse beside the sea: a stone schoolhouse with a little bell tower and tall windows on a green meadow, white chalk cliffs above a calm deep-green sea, a winding path of white pebbles, an apple tree, slate roofs, a few soft swirls of chalk dust in the air. Deep blackboard green, chalk white, warm wood brown, soft sky.",
    'blueprint': "A wide panorama of an inventor's harbour shipyard on a bright morning: a half-built wooden airship inside a tall timber frame, cranes and pulleys, big gear wheels, a drafting table under an awning with rolled plans tied with string, brass telescopes, a lighthouse, a calm blue sea. Blueprint blues, white, brass and honey timber.",
    'orbit':     "A wide panorama of a little moon-base garden on a small rocky planet at pastel dawn: round glass domes with green plants inside, a silver telescope, a small rocket on a launch pad, a huge ringed planet and two small moons in a lavender-and-peach sky, gentle craters, a few comets. Lavender, peach, deep navy and silver.",
    'rangoli':   "A wide panorama of a sunny Indian courtyard house with carved wooden balconies and arches, the stone floor decorated with large colourful symmetrical rangoli floor patterns of coloured powder and petals (abstract geometric flowers, dots and petals only), marigold garlands strung across doorways, potted plants, colourful paper kites on the rooftops, brass pots, a mango tree. No religious objects, no figures. Marigold orange, magenta, turquoise, warm sandstone.",
    'arcade':    "A wide panorama of a cheerful seaside funfair pier: a big ferris wheel, a curling roller-coaster track, a carousel, striped game booths whose boards are completely blank, strings of round light bulbs, colourful square pixel-block patterns painted on the booths, balloons, a calm sea and a bright afternoon sky. Electric teal, coral, sunny yellow, candy red.",
}
MW_NIGHT = {
    'graph': "fireflies over the fields, the farmhouse windows glowing warm yellow, the kites carrying tiny lanterns",
    'chalk': "every schoolhouse window glowing warm gold, a lantern by the door, the chalk cliffs pale silver in the moonlight",
    'blueprint': "the shipyard lamps lit, warm lights inside the airship frame, the lighthouse beam sweeping across the sea",
    'orbit': "the glass domes glowing from inside, the ringed planet lit silver, a sky thick with stars and a soft nebula",
    'rangoli': "rows of small warm lamps along the balconies and steps, paper lanterns glowing, the rangoli lit gold by lamplight",
    'arcade': "every light bulb and booth glowing in bright neon colours, the ferris wheel ringed with lights, reflections on the sea",
}
for k, v in MW.items():
    JOBS['mw-' + k] = (v + ' ' + STYLE + " Very wide landscape composition.", '21:9')
    JOBS['mn-' + k] = ("Repaint the attached painting as the SAME scene at night: keep exactly the same composition, the same "
                       "viewpoint and every building, object and shape in the same place. A deep blue night sky with stars and a moon, "
                       "gentle moonlight, " + MW_NIGHT[k] + ". Keep the warm hand-painted storybook style. " + STYLE, '21:9',
                       [os.path.join(RAW, 'mw-' + k + '.png')])


def call(model, prompt, ratio, refs=()):
    parts = [{"text": prompt}]
    for ref in refs:
        mime = 'image/webp' if ref.endswith('.webp') else 'image/png'
        parts.append({"inlineData": {"mimeType": mime, "data": base64.b64encode(open(ref, 'rb').read()).decode()}})
    body = {"contents": [{"parts": parts}],
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
    prompt, ratio, *rest = JOBS[name]
    refs = rest[0] if rest else ()
    if any(not os.path.exists(r) for r in refs): return f'{name}: SKIPPED — its reference is not painted yet'
    out = os.path.join(RAW, name + '.png')
    for attempt in range(6):
        model = MODELS[attempt % len(MODELS)]
        try:
            img = call(model, prompt, ratio, refs)
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
