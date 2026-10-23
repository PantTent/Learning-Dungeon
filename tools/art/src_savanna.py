"""Animal Kingdom Quest part 5: the African Savanna. Grumpy savanna animals, a
rhino boss, a giraffe guide, a baby elephant calf, food/charm items and
golden-grass props. Characters face RIGHT."""
import math
from draw import Canvas
SPRITES = {}


def put(name, rows, w=None, outline=True):
    """Rows may be written short; they are padded with '.' to the sprite width."""
    h = len(rows)
    w = w or h
    for i, r in enumerate(rows):
        if len(r) > w:
            raise SystemExit(f'src_savanna {name}: row {i} has len {len(r)} (max {w}): {r!r}')
    rows = [r.ljust(w, '.') for r in rows]
    if w == h and outline:
        SPRITES[name] = rows
    else:
        SPRITES[name] = {'w': w, 'rows': rows, 'outline': outline}


def canvas_sprite(name, c, outline=True):
    rows = c.rows()
    if c.w == c.h and outline:
        SPRITES[name] = {'w': c.w, 'rows': rows}
    else:
        SPRITES[name] = {'w': c.w, 'rows': rows, 'outline': outline}


def grumpy(name, brows):
    """Stamp slanted frowny eyebrows (list of (x, y, ch)) onto a wild animal."""
    spec = SPRITES[name]
    rows = [list(r) for r in (spec['rows'] if isinstance(spec, dict) else spec)]
    for x, y, ch in brows:
        rows[y][x] = ch
    rows = [''.join(r) for r in rows]
    if isinstance(spec, dict):
        spec['rows'] = rows
    else:
        SPRITES[name] = rows


# ================================================================ grumpy savanna animals (16x16)

put('wild_zebra', [
    "................",
    "..........W..W..",
    "..........WK.WK.",
    ".........KWWWWW.",
    ".........KWWWWWW",
    ".........KWHkWWW",
    "........KWWkkWWW",
    "........KWKWWWDD",
    "..WKWWKWWKWW.DD.",
    ".KWKWWKWWKWW....",
    "K.WKWWKWWKWW....",
    "..WKWWKWWKWG....",
    "..WK....WK......",
    "..KW....KW......",
    "..KK....KK......",
    "................",
])

put('wild_warthog', [
    "................",
    "................",
    "................",
    "..........M.....",
    ".......PPPMm....",
    "......PPoOMMMMM.",
    "...PPPoOOOMmHkM.",
    "..PoOOOOOOMMkkMM",
    ".PoOOOOOOOMMMMWi",
    ".oOOOOOOOOOMMWMi",
    "PoOOOOOOOOOoMMM.",
    ".oOOOOOOOOOo....",
    "..oOOOOOOOoo....",
    "..Oo.Oo..Oo.Oo..",
    "..PP.PP..PP.PP..",
    "................",
])

put('wild_gazelle', [
    "................",
    "..........K..K..",
    "...........K.K..",
    "...........pKp..",
    "..........ppppp.",
    "..........pHkpp.",
    "..........pkkppp",
    "..........WppPPP",
    "...ppppppWpp....",
    "..ppppppppWp....",
    ".KPPPPPPPPPW....",
    "..WWWWWWWWWW....",
    "...pO.pO.pO.pO..",
    "...pO.pO.pO.pO..",
    "...PP.PP.PP.PP..",
    "................",
])

put('wild_ostrich', [
    "................",
    "..........mmm...",
    ".........mHkmpp.",
    ".........mkkmpp.",
    "..........mmm...",
    "..........$i....",
    "..........$i....",
    "...W......$i....",
    "..WWDDDDDD$i....",
    ".WWDDKDDKDDD....",
    "..WDKDDKDDKDW...",
    "...DDDKDDDDWW...",
    "....DDDDDWWW....",
    ".......$i.$i....",
    "......$$..$$....",
    "................",
])

put('wild_hyena', [
    "................",
    "...........pp...",
    "..........pPp...",
    "........OO<<<<..",
    ".......OO<<HkO<.",
    "......OO<<<kk<<.",
    "..O.OO<<o<<<<PPP",
    "..<<<<<o<<o<<PP.",
    "...<o<<<<o<<<<..",
    "...<<<o<<<o<<...",
    "...<<<<<o<<<<...",
    "...<p<..<<<p....",
    "...<p...<<.<p...",
    "...PP...PP..PP..",
    "................",
    "................",
])

put('wild_baboon', [
    "................",
    "................",
    "........MMMM....",
    ".......MmmmmM...",
    "......MmiiiimM..",
    "......MiHkiiI...",
    "......MikkiiIII.",
    "......MMiiiIIIk.",
    "......MMMiIIII..",
    "...MMMMmmMMM....",
    "..MmmmmmmmmM....",
    "..MmmmmmmmMi....",
    ".MMmmmmmmMMi....",
    "M.MMm.MMmMM.....",
    "M.Mii.Mii.......",
    ".M..............",
])

put('wild_hippo', [
    "................",
    "................",
    "................",
    ".........6..6...",
    "........666666..",
    ".......66666666.",
    "...6666688Hk6666",
    "..688886666kk666",
    ".68866666666666i",
    ".6666666666666iI",
    ".666666666665NiN",
    ".56666666666555.",
    "..55iiiiiii55...",
    "...656..656.....",
    "...555..555.....",
    "................",
])

put('wild_buffalo', [
    "................",
    "........m.......",
    "........Nm....mN",
    ".........NmmmmN.",
    "..........NNNN..",
    "..........dDDDd.",
    "..........DHkDDD",
    "....DDDDDDDkkDDD",
    "...DddddddDDDDKK",
    "..DddddddddDDKK.",
    ".DddddddddddD...",
    ".DdddddddddDD...",
    "..DdddddddDD....",
    "...dD.dD.dD.dD..",
    "...dD.dD.dD.dD..",
    "...KK.KK.KK.KK..",
])

# frowny brows: outer end high, inner end low (side views slope down toward the face front)
grumpy('wild_zebra', [(10, 4, 'K'), (11, 4, 'K'), (12, 5, 'K')])
grumpy('wild_warthog', [(11, 4, 'P'), (12, 5, 'P'), (13, 5, 'P')])
grumpy('wild_gazelle', [(10, 4, 'P'), (11, 4, 'P'), (12, 4, 'P')])
grumpy('wild_ostrich', [(9, 1, 'K'), (10, 1, 'K'), (11, 1, 'K')])
grumpy('wild_hyena', [(11, 3, 'P'), (12, 3, 'P'), (13, 4, 'P')])
grumpy('wild_baboon', [(8, 4, 'M'), (9, 4, 'M'), (10, 5, 'M')])
grumpy('wild_hippo', [(9, 4, 'K'), (10, 5, 'K'), (11, 5, 'K')])
grumpy('wild_buffalo', [(10, 5, 'K'), (11, 5, 'K'), (12, 5, 'K'), (13, 6, 'K')])


# ================================================================ boss: grumpy grey rhinoceros (32x32)

def rhino():
    c = Canvas(32, 32)
    SKIN = ['G', 'g', 'g', 'n']
    # four stumpy legs with pale toenails
    for lx in (3, 9, 15, 21):
        c.rect(lx, 22, lx + 4, 28, 'g')
        c.rect(lx + 3, 22, lx + 4, 28, 'n')
        c.put(lx, 23, 'G')
        for x in (lx, lx + 2, lx + 4):
            c.put(x, 28, 'N')
    # big round body
    c.ellipse(13, 16.5, 12.5, 8.5, SKIN)
    # skin folds
    for y in range(11, 23):
        c.put(18 + (y - 11) // 5, y, 'n')
    for y in range(13, 22):
        c.put(8, y, 'n') if y % 2 else None
    # head: low and heavy, pointing right
    c.ellipse(24.5, 17.5, 6, 5.5, SKIN)
    c.ellipse(28, 19.5, 3.5, 3.2, SKIN)
    # ear
    c.stamp([".G.", "GgG", "Gng", ".g."], 20, 9)
    # two horns: big curved front horn, small rear horn
    c.stamp(["...N", "..Nm", "..Nm", ".NmM", ".NmM", "NmmM", "NmMM"], 27, 7)
    c.stamp([".N.", "NmM", "NmM"], 24, 11)
    # eye + bushy frowning brow (high at the back, low at the front)
    c.stamp(["Hk", "kk"], 23, 15)
    c.stamp(["nn..", ".nnn", "...n"], 21, 12)
    c.put(22, 14, 'n')
    # nostril + grumpy downturned mouth
    c.put(30, 18, 'n')
    for x in range(26, 31):
        c.put(x, 21, 'n')
    c.put(25, 22, 'n')
    # tail tuft
    c.put(0, 13, 'g'); c.put(0, 14, 'g'); c.put(0, 15, 'n')
    return c


canvas_sprite('boss_rhino', rhino())


# ================================================================ friendly helpers

# Gentle giraffe guide in a little safari hat (16 wide x 24 tall).
put('npc_giraffe', [
    "..........mm....",
    ".........mmmm...",
    ".........ooooM..",
    ".......MmmmmmmmM",
    "........NNyNNNN.",
    ".......NNNNHkNN.",
    "......yN.NNkkNNN",
    ".........NNNNNmm",
    ".........NNNPPm.",
    "........ONyNNN..",
    "........OyyN....",
    ".......ONNNy....",
    ".......OyyNN....",
    "......ONNyyN....",
    "......OyNNNN....",
    ".....ONyyNyy....",
    "..NyyNNNyyNN....",
    ".NyyNNyyNNyN....",
    "O.NNyyNNyyNN....",
    "..NyyNNNNyyN....",
    "..Ny.Ny.Ny.Ny...",
    "..NN.NN.NN.NN...",
    "..NN.NN.NN.NN...",
    "..oo.oo.oo.oo...",
], 16)

# Tiny baby elephant calf (12x12), cute and smiley.
put('npc_calf', [
    "............",
    "....gGGGg...",
    "..ggGGGGGGg.",
    ".giigGGGHkG.",
    ".giigGGGkkGG",
    ".giigGGiGGGG",
    "..gggGGGGg.G",
    "..gGGGGGg..G",
    ".gGGGGGGg.g.",
    ".gGGGGGGg...",
    "..Gg..Gg....",
    "..gg..gg....",
], 12)


# ================================================================ items (12x12)

put('food_baobab', [
    "............",
    ".....o......",
    ".....o......",
    "....mMM.....",
    "...mmMMM....",
    "..mmMZMMM...",
    "..mMMMMZM...",
    "..MZMMMMM...",
    "..MMMMZMO...",
    "...MMMMO....",
    "....OOO.....",
    "............",
], 12)

put('food_kebab', [
    "..........p.",
    ".........pp.",
    ".......qR...",
    "......RRRr..",
    "......rRr...",
    ".....YYp....",
    "....uYYy....",
    "...fEp......",
    "..fEEe......",
    "..p7e.......",
    ".777p.......",
    ".p77........",
], 12)

put('item_charm_hat', [
    "............",
    ".....M......",
    "....YuY.....",
    "....mmmM....",
    "...mNmmmM...",
    "...mmmmmM...",
    "...ooooRo...",
    ".mmmmmmmmmM.",
    "mNmmmmmmmmMM",
    "MM......MMM.",
    "............",
    "............",
], 12)


# ================================================================ props

def acacia():
    c = Canvas(32, 32)
    # twisty trunk splitting into a V
    c.line(14, 28, 15, 20, 'o', thick=2)
    c.line(15, 20, 10, 12, 'o', thick=2)
    c.line(16, 20, 22, 11, 'o', thick=2)
    c.line(14, 28, 15, 20, 'O')
    c.line(15, 20, 10, 12, 'O')
    c.line(19, 16, 25, 13, 'o')
    c.line(12, 15, 6, 12, 'o')
    # wide flat-topped canopy, layered
    LEAF = ['Z', 'Z', '9', 'X']
    c.ellipse(16, 8, 15, 3.6, LEAF, mask=lambda x, y: y >= 5)
    c.ellipse(9, 7, 7, 2.6, LEAF)
    c.ellipse(22, 6.5, 7.5, 2.4, LEAF)
    c.ellipse(16, 5.5, 6, 2, LEAF)
    for x in range(2, 30):
        if c.get(x, 11) != '.':
            c.put(x, 11, 'X')
        if c.get(x, 10) in 'Z9':
            c.put(x, 10, '9')
    for (x, y) in ((6, 6), (11, 5), (14, 4), (20, 5), (24, 5), (17, 4), (8, 8), (26, 7)):
        c.put(x, y, 'f')
    # dry grass at the foot
    for x in range(9, 22):
        c.put(x, 29, 'y' if x % 2 else 'U')
    for x in (10, 12, 17, 20):
        c.put(x, 28, 'y')
    return c


canvas_sprite('prop_acacia', acacia())


def baobab():
    c = Canvas(32, 32)
    # fat bottle trunk (grey-pink bark)
    for y in range(9, 29):
        t = (y - 9) / 19
        half = 5.5 + 4 * math.sin(t * math.pi * 0.85)
        for x in range(int(15.5 - half), int(15.5 + half) + 1):
            dx = (x - 15.5) / half
            ch = '6' if dx < -0.5 else ('8' if dx < -0.05 else ('6' if dx < 0.45 else '5'))
            c.put(x, y, ch)
    for (x0, y0, x1, y1) in ((12, 12, 11, 26), (19, 13, 20, 27), (15, 17, 15, 21)):
        c.line(x0, y0, x1, y1, '5')
    # stubby root-like branches at the top
    for (x0, y0, x1, y1) in ((12, 10, 5, 4), (14, 9, 12, 2), (17, 9, 20, 2), (19, 10, 27, 4)):
        c.line(x0, y0, x1, y1, '5', thick=2)
    # small leaf clumps
    LEAF = ['Z', '9', 'X']
    for (cx, cy) in ((5, 3), (12, 2), (20.5, 2), (27, 3.5)):
        c.ellipse(cx, cy, 3.2, 2, LEAF)
    # hanging velvety fruit pods on strings
    for (x, y0, y1) in ((8, 6, 9), (24, 6, 9), (16, 4, 6)):
        for y in range(y0, y1):
            c.put(x, y, 'o')
        c.stamp([".mM.", "mMZM", "MZMO", "MMMO", ".OO."], x - 1, y1)
    # trunk hollow + ground
    c.ellipse(15.5, 24, 1.8, 2.4, [':'])
    for x in range(3, 29):
        c.put(x, 29, 'y' if x % 3 else 'U')
    return c


canvas_sprite('prop_baobab', baobab())


def tallgrass(open_=False):
    c = Canvas(16, 16)
    if not open_:
        # a little grey elephant ear + curling trunk peeking out (a hint!)
        c.ellipse(5, 6.5, 3, 3, ['G', 'g', 'g', 'n'])
        c.stamp(["..nn", ".ngG", "ngG.", "nG..", "nG..", "ng.."], 9, 1)
        c.put(8, 1, 'n'); c.put(8, 2, 'n')
        blades = [(1, 15, 1, 8), (2, 15, 3, 6), (4, 15, 3, 9), (5, 15, 6, 7), (7, 15, 7, 9),
                  (8, 15, 9, 6), (10, 15, 10, 8), (11, 15, 13, 6), (13, 15, 14, 9), (12, 15, 12, 8),
                  (3, 15, 0, 10), (14, 15, 15, 7)]
        for i, (x0, y0, x1, y1) in enumerate(blades):
            c.line(x0, y0, x1, y1, 'U')
            c.line(x0 + 1, y0, x1 + 1, y1 + 1, 'y' if i % 2 else 'Y')
            c.put(x1, y1, 'u')
        for x in range(0, 16):
            c.put(x, 15, 'U')
    else:
        # flattened / pushed-apart grass
        for (x0, y0, x1, y1) in ((7, 14, 0, 9), (7, 14, 1, 12), (8, 14, 15, 9), (8, 14, 14, 12),
                                 (6, 15, 1, 15), (9, 15, 14, 15), (7, 13, 3, 7), (8, 13, 12, 7)):
            c.line(x0, y0, x1, y1, 'U')
            c.line(x0, y0 - 1, x1, y1 - 1, 'y')
        c.ellipse(7.5, 12.5, 3.5, 1.6, ['p', 'O'])
        for (x, y) in ((2, 9), (13, 9), (4, 7), (11, 7)):
            c.put(x, y, 'Y')
    return c


SPRITES['prop_tallgrass'] = {'w': 16, 'rows': tallgrass().rows(), 'outline': False}
SPRITES['prop_tallgrass_open'] = {'w': 16, 'rows': tallgrass(True).rows(), 'outline': False}


def termitemound():
    c = Canvas(24, 24)
    # knobbly red-clay spires
    for (cx, top, bot, half) in ((11.5, 2, 21, 4.2), (6.5, 9, 21, 3.2), (16.5, 7, 21, 3.4)):
        for y in range(top, bot + 1):
            t = (y - top) / (bot - top)
            h = 1 + (half - 1) * math.sqrt(t)
            for x in range(int(cx - h), int(cx + h) + 1):
                dx = (x - cx) / max(h, 0.1)
                c.put(x, y, '^' if dx < -0.4 else ('t' if dx > 0.35 else 'T'))
    for (x, y) in ((11, 8), (10, 14), (13, 12), (6, 15), (17, 13), (16, 17)):
        c.put(x, y, ':')
    for (x, y) in ((9, 5), (10, 10), (5, 12), (15, 10)):
        c.put(x, y, '^')
    for x in range(1, 23):
        c.put(x, 22, 't' if 2 < x < 21 else '.')
    for x in (2, 4, 19, 21):
        c.put(x, 21, 'y'); c.put(x, 22, 'U')
    return c


canvas_sprite('prop_termitemound', termitemound())


def kopje():
    c = Canvas(24, 24)
    STONE = ['8', '6', '5', '4']
    for (cx, cy, rx, ry) in ((6, 17, 5.5, 4.8), (17, 17.5, 6, 4.5), (11.5, 10.5, 5.5, 5), (18, 9, 3.4, 3)):
        c.ellipse(cx, cy, rx + 0.9, ry + 0.9, ['3'])
    for (cx, cy, rx, ry) in ((6, 17, 5.5, 4.8), (17, 17.5, 6, 4.5), (11.5, 10.5, 5.5, 5), (18, 9, 3.4, 3)):
        c.ellipse(cx, cy, rx, ry, STONE)
    for (x, y) in ((9, 7), (10, 7), (4, 14), (14, 15), (17, 7)):
        c.put(x, y, 'G')
    for (x, y) in ((12, 13), (13, 13), (7, 20), (19, 20)):
        c.put(x, y, '3')
    for x in range(1, 23):
        if c.get(x, 22) != '.' or c.get(x, 21) != '.':
            c.put(x, 22, '3')
    c.stamp(["y.y", "UyU"], 0, 20)
    c.stamp(["y.Y", "yUU"], 21, 20)
    return c


canvas_sprite('prop_kopje', kopje())


def safaritent():
    c = Canvas(32, 32)
    # canvas walls (khaki) with a peaked roof
    for y in range(8, 29):
        if y < 18:
            half = 3 + (y - 8) * 1.25
        else:
            half = 14.5
        for x in range(int(16 - half), int(16 + half) + 1):
            if y < 18:
                ch = '<' if x < 16 else 'm'
                if y >= 16:
                    ch = 'p' if x < 16 else 'M'
            else:
                ch = 'm' if x < 16 else 'M'
                if (x - 2) % 6 == 0:
                    ch = 'M'
            c.put(x, y, ch)
    # roof edge flap with scallops
    for x in range(2, 31):
        c.put(x, 18, 'O')
        c.put(x, 19, 'O' if x % 3 else '.')
    # open doorway with flaps rolled back
    for y in range(20, 29):
        for x in range(13, 20):
            c.put(x, y, ':')
    c.rect(12, 20, 12, 28, 'p'); c.rect(20, 20, 20, 28, 'p')
    c.rect(11, 20, 11, 22, 'O'); c.rect(21, 20, 21, 22, 'O')
    # lantern glow inside + a peeking star sparkle (the secret spot)
    c.stamp([".Y.", "YuY", ".7."], 15, 23)
    # ridge pole + flag
    c.put(16, 6, 'o'); c.put(16, 7, 'o'); c.put(16, 5, 'o')
    c.stamp(["RRR", "RR."], 17, 5)
    # guy ropes + pegs
    c.line(3, 18, 0, 28, 'o'); c.line(29, 18, 31, 28, 'o')
    c.put(0, 29, 'P'); c.put(31, 29, 'P')
    for x in range(1, 31):
        c.put(x, 29, 'y' if x % 2 else 'U')
    return c


canvas_sprite('prop_safaritent', safaritent())

put('prop_savannasign', [
    "................",
    "................",
    "...ppppppppp....",
    "...<<<<<<<<<pp..",
    "...pOpOOpOOppOp.",
    "...pOOpOOpOOpOO.",
    "...oooooooooOo..",
    "...ooooooooooo..",
    ".......pOo......",
    ".......pOo......",
    ".......pOo......",
    ".......pOo......",
    ".....y.pOo.y....",
    "....yUyyOoyUy...",
    "...yUYUyUyUYUy..",
    "................",
])


def grasstuft():
    c = Canvas(16, 16)
    for (x0, x1, y1, ch) in ((7, 4, 7, 'y'), (8, 8, 5, 'Y'), (8, 12, 8, 'y'), (6, 2, 10, 'U'),
                             (9, 13, 11, 'U'), (7, 6, 6, 'u'), (9, 10, 7, 'y')):
        c.line(x0, 14, x1, y1, ch)
    for x in range(3, 13):
        c.put(x, 14, 'U')
    c.put(4, 6, 'u'); c.put(12, 7, 'u')
    return c


SPRITES['prop_grasstuft'] = {'w': 16, 'rows': grasstuft().rows(), 'outline': False}


def balloon():
    c = Canvas(32, 48)
    # envelope: shaded ellipse remapped into colourful gores
    tmp = Canvas(32, 48)
    tmp.ellipse(16, 15, 14, 14.5, ['0', '1', '2', '3'])
    GORES = [('q', 'R', 'r', 'Q'), ('u', 'Y', 'y', 'U'), ('c', 'B', 'b', 'C'), ('u', 'Y', 'y', 'U')]
    for y in range(48):
        for x in range(32):
            v = tmp.get(x, y)
            if v == '.':
                continue
            dx = max(-1, min(1, (x + 0.5 - 16) / 14))
            g = int((math.asin(dx) / math.pi + 0.5) * 7.999)
            c.put(x, y, GORES[g % 4][int(v)])
    # tapered neck under the envelope
    for y in range(28, 34):
        half = 7 - (y - 28) * 0.9
        for x in range(int(16 - half), int(16 + half) + 1):
            dx = (x + 0.5 - 16) / max(half, 1)
            g = int((math.asin(max(-1, min(1, dx))) / math.pi + 0.5) * 7.999)
            col = GORES[g % 4]
            c.put(x, y, col[2] if dx > 0.3 else col[1])
    for x in range(10, 23):
        c.put(x, 33, 'o')
    # burner flame
    c.stamp([".7.", "7Y7", ".u."], 15, 34)
    # ropes
    for (x0, x1) in ((10, 10), (22, 22)):
        c.line(x0, 34, x1, 39, 'o')
    # wicker basket
    c.rect(10, 40, 22, 46, 'O')
    c.rect(10, 40, 22, 40, 'p')
    for y in range(41, 47):
        for x in range(10, 23):
            if (x + y) % 3 == 0:
                c.put(x, y, 'o')
            elif (x - y) % 4 == 0:
                c.put(x, y, 'p')
    c.rect(20, 41, 22, 46, 'o')
    c.put(12, 41, 'p')
    # shine on the envelope
    for (x, y) in ((8, 6), (9, 5), (7, 8), (7, 9)):
        c.put(x, y, 'H')
    return c


canvas_sprite('prop_balloon', balloon())
