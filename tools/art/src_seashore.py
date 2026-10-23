"""Animal Kingdom Quest part 4: the Sunny Seashore. Grumpy beach + sea animals,
an octopus boss, Captain Pelican, a baby sea turtle, food/charm items and
beach/sea props. Characters face RIGHT."""
import math
from draw import Canvas
SPRITES = {}


def put(name, rows, w=None, outline=True):
    """Rows may be written short; they are padded with '.' to the sprite width."""
    h = len(rows)
    w = w or h
    for i, r in enumerate(rows):
        if len(r) > w:
            raise SystemExit(f'src_seashore {name}: row {i} has len {len(r)} (max {w}): {r!r}')
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


# ================================================================ grumpy seashore animals (16x16)

put('wild_crab', [
    "................",
    "................",
    "..qR.R......qR.R",
    ".qRR.Rr....qRR.R",
    ".qRRRRr....qRRRR",
    "..RRRr......RRRr",
    "....Rr.HkHk.Rr..",
    ".....R.kkkk.R...",
    "....qRRRrrRRRr..",
    "...qRRRRRRRRRRr.",
    "..qRRRRrrrrRRRRr",
    "..rRRRrRRRRrRRrr",
    "...rrrrrrrrrrrr.",
    "..r.r.r....r.r.r",
    ".r..r.r....r.r..",
    "................",
])

put('wild_seagull', [
    "................",
    "................",
    ".........WWWW...",
    "........WWWWWW..",
    "........WWHkWYYY",
    "........WWkkWYYR",
    "........WWWWW...",
    "...gg...WWWWW...",
    "..gggGGGGWWWW...",
    ".KgggGGGGWWWW...",
    "KKgGGGGGWWWWW...",
    ".KKGGGGWWWWW....",
    "....WWWWWWW.....",
    "......y..y......",
    ".....yy.yy......",
    "................",
])

put('wild_puffin', [
    "................",
    "................",
    "........KKKK....",
    ".......KWWWWK...",
    ".......KWHkWYR..",
    ".......KWkkWY7R.",
    ".......KWWWWYR..",
    "......KKKWWWK...",
    ".....KKDKWWWW...",
    "....KKDKKWWWW...",
    "....KDKKKWWWW...",
    "...KKKKKKWWWW...",
    "..KK..KKKWWW....",
    ".......77.77....",
    "......777777....",
    "................",
])

put('wild_starfish', [
    "................",
    ".......^7.......",
    "......^^77......",
    "......^^77......",
    ".^^^^^^^^777777.",
    "..^^^^^^^^7777..",
    "...^HkT^Hk777...",
    "....kk^^kk77....",
    "....^^^^^^77....",
    "...^^^TTT^777...",
    "...^^T^^^T777...",
    "..^^^7....^777..",
    "..^77......777..",
    ".^7..........77.",
    "................",
    "................",
])

put('wild_lobster', [
    "................",
    ".r..........=+..",
    "..r........=~~R.",
    "...r.......~~...",
    "....r.....=~~~R.",
    ".....r....~~~~..",
    "......r..~~.....",
    "...=====~~~~....",
    "..=~~~~~~~HkT...",
    ".=~~=~~=~~kk~...",
    "=~~~~~~~~~~~~r..",
    "~.r~~r~~r~~rr...",
    "...r.r.r.r......",
    "................",
    "................",
    "................",
])

put('wild_seal', [
    "................",
    "................",
    "................",
    "..........gggg..",
    ".........gGGGGg.",
    ".........GHkGGGg",
    ".........GkkGGkn",
    "........gGGGGGW.",
    "......ggGGGGGG..",
    "...gggGGnGGGGG..",
    ".ggGGnGGGGGnGG..",
    "gGGnGGGGGGGGGGg.",
    "nn.ggGGGGGGGgg..",
    "n...nnnnnnggG...",
    "................",
    "................",
])

put('wild_otter', [
    "................",
    "................",
    ".........oNNo...",
    "........NNNNNN..",
    "........NHkNNNN.",
    "........NkkNNPP.",
    "........NNNNNN..",
    ".......oNNNNo...",
    "......oOOOOOO...",
    ".....oOOOOOOOO..",
    ".....oOOiiIOO...",
    "....ooOOOOOOO...",
    "...oo.OOOOOOO...",
    "..oo..ooO.ooO...",
    "......PP...PP...",
    "................",
])

put('wild_walrus', [
    "................",
    "................",
    "................",
    ".........ssss...",
    "........sSSsss..",
    "........sHksss..",
    "........skksNNN.",
    ".......sssNNNNN.",
    "......ssssNNNNN.",
    "....ssssssszW.W.",
    "..sSsssssszzW.W.",
    ".sSssssssszzW.W.",
    "zssssssssszz....",
    "zzzzzzzzsszz....",
    "z.....zzz.zzz...",
    "................",
])

grumpy('wild_crab', [(7, 5, 'r'), (8, 5, 'r'), (9, 5, 'r'), (10, 5, 'r')])
grumpy('wild_seagull', [(10, 3, 'n'), (11, 3, 'n'), (12, 4, 'n')])
grumpy('wild_puffin', [(9, 3, 'K'), (10, 3, 'K'), (11, 4, 'K')])
grumpy('wild_starfish', [(4, 5, 'T'), (5, 5, 'T'), (8, 5, 'T'), (9, 5, 'T')])
grumpy('wild_lobster', [(9, 7, 'Q'), (10, 7, 'Q'), (11, 8, 'Q')])
grumpy('wild_seal', [(10, 4, 'n'), (11, 4, 'n'), (12, 5, 'n')])
grumpy('wild_otter', [(9, 3, 'P'), (10, 3, 'P'), (11, 4, 'P')])
grumpy('wild_walrus', [(8, 4, 'z'), (9, 4, 'z'), (10, 4, 'z'), (11, 5, 'z')])


# ================================================================ boss: grumpy octopus (32x32)

def octopus():
    c = Canvas(32, 32)
    # six curly arms, drawn by hand on the left and mirrored to the right
    left = [
        "..III...........",
        ".I...I..........",
        ".I.I.I..........",
        ".I..I...........",
        ".II?IIIIII......",
        "..rrrrrrrrr.....",
        ".......IIr..IIr.",
        "......IIr...IIr.",
        ".....I?r....I?r.",
        ".....IIr....IIr.",
        "....IIr.....IIr.",
        "....IIr.....IIr.",
        "....I?r....IIr..",
        ".I..IIr...IIr...",
        "I...IIr.I.IIr...",
        "I..IIr.I.IIr....",
        ".rrrr...rrr.....",
    ]
    for y, row in enumerate(left):
        for x, ch in enumerate(row):
            if ch != '.':
                c.put(x, 13 + y, ch)
                c.put(31 - x, 13 + y, ch)
    # big round head (mantle)
    c.ellipse(16, 9.5, 10, 9, ['>', 'I', 'I', 'I', 'r', 'r'])
    for (x, y) in ((10, 5), (13, 3), (9, 8), (12, 5), (21, 3)):
        c.put(x, y, '?')
    # eyes, looking right
    for ex in (11, 18):
        c.stamp([".WWW.", "WWWWW", "WWWkk", "WWWkk", ".WWW."], ex, 9)
        c.put(ex + 1, 10, 'H')
    # thick angry brows: high on the outside, low in the middle
    c.stamp(["KK....", ".KKK..", "...KK."], 9, 6)
    c.stamp(["....KK", "..KKK.", ".KK..."], 18, 6)
    # frowning mouth
    c.stamp([".KKKK.", "K....K"], 14, 15)
    return c


canvas_sprite('boss_octopus', octopus())


# ================================================================ friendly folk

put('npc_pelican', [
    "................",
    ".....bbbbb......",
    "....bbYYbbb.....",
    "....bbbbbbb.....",
    "...KKKKKKKKK....",
    "....WWWWWW......",
    "....WHkWWWYYYY..",
    "....WkkWW^^^^YY.",
    "....WWWWW^^^^y..",
    "....WWWWWy^^y...",
    "...GWWWWW.yy....",
    "..GGWWWWWW......",
    ".gGGGWWWWW......",
    ".ggGGGWWWW......",
    "....^...^.......",
    "...^^..^^.......",
])

put('npc_babyturtle', [
    "............",
    "............",
    "............",
    ".......fff..",
    "..eeee.fHkf.",
    ".eEfEEefkkf.",
    ".eEEfEEefff.",
    ".eeeeeeeef..",
    ".ff....ff...",
    "............",
    "............",
    "............",
], 12)


# ================================================================ items (12x12)

put('food_coconut', [
    "............",
    "............",
    "............",
    "............",
    "..oooooooo..",
    ".oWWWWWWWWo.",
    ".oWNmmmmNWo.",
    ".OoWWWWWWoO.",
    ".OOoooooooO.",
    "..OOoPoPoO..",
    "...OOOOOO...",
    "............",
], 12)

put('food_smoothie', [
    "........q...",
    ".......q....",
    "..WWWWqWW...",
    "..A??q??AYu.",
    "..A?????AY..",
    "..A^^^^^A...",
    "..A^^^^^A...",
    "...A777A....",
    "...A777A....",
    "....AAA.....",
    "....AAA.....",
    "...AAAAA....",
], 12)

put('food_mango', [
    "............",
    "............",
    ".......eE...",
    "......eEfE..",
    "....7^^e....",
    "...7^uY^7...",
    "..7^YuYY^R..",
    "..7^YYY^7R..",
    "..R7^^^7RR..",
    "...R777RR...",
    "....RRRr....",
    "............",
], 12)

put('item_shell', [
    "............",
    "............",
    "....$$$$....",
    "..$$i$i$i$..",
    ".$i$i$i$i$i.",
    ".$i$i$i$i$i.",
    "..$i$i$i$i..",
    "...$i$i$i...",
    "....I$$I....",
    "...IIiiII...",
    "............",
    "............",
], 12)

put('item_charm_snorkel', [
    "............",
    ".....M...7..",
    ".....M...Y..",
    "....YuY..Y..",
    "..BBBBBBBY..",
    ".BHAaBAHaBY.",
    ".BAaABAaABY.",
    ".BBBBcBBBBY.",
    "....BBB..Y..",
    ".........Y..",
    "........77..",
    "............",
], 12)


# ================================================================ props

def coconutpalm():
    c = Canvas(32, 32)
    for y in range(11, 30):
        bend = int(3 * math.sin((30 - y) / 19 * 1.6))
        x0 = 13 + bend
        for x in range(x0, x0 + 4):
            c.put(x, y, 'p' if x == x0 else 'O' if x < x0 + 3 else 'o')
        if y % 2 == 0:
            c.put(x0 + 1, y, 'o'); c.put(x0 + 2, y, 'o')
    for x in range(10, 22):
        c.put(x, 30, '<' if x % 3 else 'p')
    cx, cy = 16.5, 9
    tips = [(1, 17), (2, 9), (8, 3), (16, 1), (25, 3), (30, 9), (31, 17)]
    for (tx, ty) in tips:
        mx, my = (cx + tx) / 2, min(cy, ty) - 3
        n = 24
        for i in range(n + 1):
            t = i / n
            x = (1 - t) ** 2 * cx + 2 * (1 - t) * t * mx + t * t * tx
            y = (1 - t) ** 2 * cy + 2 * (1 - t) * t * my + t * t * ty
            xi, yi = int(x), int(y)
            c.put(xi, yi, 'E'); c.put(xi, yi + 1, 'e')
            if i % 3 == 0 and 2 < i < n:
                c.put(xi, yi + 2, 'F' if tx != 16 else 'e')
            if i % 4 == 1:
                c.put(xi, yi, 'f')
    # three round coconuts in the crown
    for (dx, dy) in ((12, 9), (16, 10), (19, 9)):
        c.stamp([".oo.", "opOo", "oOOP", ".PP."], dx, dy)
    return c


canvas_sprite('prop_coconutpalm', coconutpalm())


def beachrock():
    c = Canvas(24, 24)
    c.ellipse(11, 14, 10, 7.5, ['8', '6', '5', '4', '3'])
    c.ellipse(16, 10, 6, 5.5, ['8', '6', '5', '4', '3'])
    for (x, y) in ((9, 9), (10, 9), (14, 6), (15, 6), (6, 12), (13, 8)):
        c.put(x, y, 'A')
    for (x, y) in ((12, 15), (13, 16), (14, 16), (17, 13), (7, 17), (8, 17)):
        c.put(x, y, '3')
    # seaweed + wet foot
    for x in range(2, 21):
        c.put(x, 21, 'e' if x % 3 else 'E')
    c.stamp(["E.E", "eEe"], 3, 19)
    c.stamp(["E", "e"], 19, 19)
    return c


canvas_sprite('prop_beachrock', beachrock())


def nest(open_=False):
    c = Canvas(16, 16)
    c.ellipse(7.5, 13, 7.2, 5.5, ['<', 'p', 'p', 'O'], mask=lambda x, y: y <= 13)
    for x in range(1, 15):
        c.put(x, 14, 'O' if 2 < x < 13 else 'o')
    c.put(1, 14, '.'); c.put(14, 14, '.')
    for x in range(2, 14):
        if c.get(x, 13) != '.':
            c.put(x, 13, 'O')
    if not open_:
        # a round white egg peeking out of the top
        c.stamp([".kkkk.", "kWWWNk", "kWHWNk", "kNWNmk"], 5, 5)
        for x in range(4, 12):
            c.put(x, 9, 'O' if x % 2 else 'p')
        c.put(4, 8, 'p'); c.put(11, 8, 'p')
        c.stamp(["..Y..", ".uYu.", "YYHYY", ".uYu.", "..Y.."], 11, 1)
    else:
        # hollow dip with broken shell bits and little flipper tracks
        c.ellipse(7.5, 10, 4.5, 2.2, [':', 'P'])
        c.stamp(["N.", "Nm"], 4, 8)
        c.stamp([".N", "mN"], 10, 8)
        c.stamp(["W"], 7, 11)
        for (x, y) in ((13, 6), (14, 4), (12, 3), (13, 1)):
            c.put(x, y, 'O')
    return c


SPRITES['prop_nest'] = {'w': 16, 'rows': nest().rows(), 'outline': False}
SPRITES['prop_nest_open'] = {'w': 16, 'rows': nest(True).rows(), 'outline': False}


def tidepool():
    c = Canvas(24, 24)
    c.ellipse(12, 13, 11, 8, ['6', '5', '4', '4'])
    c.ellipse(12, 13.5, 8, 5.2, ['A', 'a', 'a', 'h', 'h', ';'])
    # little rocks on the rim
    for (x, y, s) in ((2, 11, ["86", "54"]), (19, 8, ["865", "544"]), (8, 18, ["65"]), (17, 18, ["865"])):
        c.stamp(s, x, y)
    # a tiny sea star and seaweed in the pool
    c.stamp([".^.", "^7^", "7.7"], 14, 13)
    c.stamp(["E", "e", "E"], 8, 12)
    c.stamp(["E", "e"], 10, 13)
    c.put(7, 10, 'H'); c.put(8, 10, 'A')
    return c


canvas_sprite('prop_tidepool', tidepool())


put('prop_shells', [
    "................",
    "................",
    "................",
    "..$$i...........",
    ".$i$i$..........",
    ".$i$i$....YuY...",
    "..III....YyuyY..",
    "..........yyy...",
    "................",
    "................",
    ".....NNm........",
    "....NmNmM...g...",
    "....NNmM...gGg..",
    ".....MM.....g...",
    "................",
    "................",
])


def umbrella():
    c = Canvas(24, 24)
    # striped dome canopy
    for y in range(2, 10):
        half = int(round(10.5 * math.sqrt(max(0, 1 - ((9.5 - y) / 7.8) ** 2))))
        for x in range(12 - half, 12 + half):
            seg = int((x - 12) / max(1, (y - 1.2)) * 1.6 + 10) % 2
            ch = ('R' if seg else 'W')
            if y >= 8:
                ch = 'r' if seg else 'G'
            c.put(x, y, ch)
    # scalloped edge
    for x in range(1, 23):
        if x % 3 != 0:
            c.put(x, 10, c.get(x, 9))
    c.put(12, 1, 'Y'); c.put(11, 1, 'Y')
    # pole into a little sand pile
    for y in range(10, 21):
        c.put(11, y, 'N'); c.put(12, y, 'm')
    c.stamp(["..<<pp..", ".<pppppO", "pppOOOOO"], 8, 20)
    return c


canvas_sprite('prop_umbrella', umbrella())


def seacave():
    c = Canvas(32, 32)
    # rocky hill
    c.ellipse(16, 20, 15.5, 14, ['8', '6', '5', '5', '4', '3'], mask=lambda x, y: y <= 29)
    # dark cave mouth (arched)
    for y in range(13, 30):
        half = 6.5 * math.sqrt(max(0, 1 - ((y - 21) / 8.5) ** 2)) if y < 21 else 6.5
        for x in range(int(16 - half), int(16 + half) + 1):
            c.put(x, y, '0' if abs(x - 16) < half - 1.2 else '1')
    # rim stones around the arch
    for (x, y) in ((9, 18), (10, 15), (12, 13), (15, 12), (18, 12), (21, 14), (22, 17), (23, 20)):
        c.stamp(["86", "54"], x - 1, y - 1)
    # shallow water flowing out of the cave
    for y in range(26, 30):
        for x in range(int(16 - 6.5 - (y - 26)), int(16 + 6.5 + (y - 26)) + 1):
            c.put(x, y, 'a' if (x + y) % 5 else 'A')
        c.put(int(16 - 6.5 - (y - 26)), y, 'h')
    for x in range(10, 23):
        c.put(x, 25, 'h')
    # wet glints, moss and a mysterious twinkle deep inside
    for (x, y) in ((6, 12), (7, 12), (24, 10), (13, 8), (14, 8)):
        c.put(x, y, 'A')
    for (x, y) in ((4, 22), (5, 23), (27, 21), (26, 23), (3, 24)):
        c.put(x, y, 'E')
    c.stamp([".Y.", "YuY", ".Y."], 15, 18)
    return c


canvas_sprite('prop_seacave', seacave())


put('prop_chest', [
    "................",
    "................",
    "................",
    "...OOOOOOOOOO...",
    "..OpppYpppppOO..",
    "..OpppYppppppo..",
    "..YYYYYYYYYYYy..",
    "..ooooYYooooyo..",
    "..OpppYkpppppo..",
    "..OpppYYppppyo..",
    "..OOOOYOOOOOyo..",
    "..ooooYoooooyo..",
    "..PPPPPPPPPPPP..",
    "................",
    "................",
    "................",
])


def lighthouse():
    c = Canvas(32, 48)
    # rock base
    c.ellipse(16, 44, 14, 4.5, ['8', '6', '5', '4'], mask=lambda x, y: y <= 46)
    for x in range(3, 30):
        if c.get(x, 46) != '.':
            c.put(x, 46, '3')
    # tapering striped tower
    top, bot = 14, 42
    for y in range(top, bot + 1):
        t = (y - top) / (bot - top)
        half = 4.5 + 3.5 * t
        band = ((y - top) // 5) % 2
        for x in range(int(16 - half), int(16 + half) + 1):
            lit = x < 16 - half * 0.3
            dark = x > 16 + half * 0.45
            if band:
                ch = 'q' if lit else ('r' if dark else 'R')
            else:
                ch = 'W' if lit else ('G' if dark else 'W')
            c.put(x, y, ch)
    # door + window
    c.rect(15, 37, 17, 42, 'P'); c.rect(16, 37, 16, 37, 'o')
    c.rect(15, 25, 16, 27, 'b'); c.put(15, 25, 'c')
    # gallery rail
    c.rect(9, 12, 23, 13, 'K')
    for x in range(10, 23, 2):
        c.put(x, 11, 'K')
    c.rect(9, 10, 23, 10, 'K')
    # lamp room with glowing light
    c.rect(12, 5, 20, 9, 'K')
    c.rect(13, 6, 19, 9, 'u')
    c.rect(15, 6, 17, 8, 'H')
    c.put(13, 9, 'Y'); c.put(19, 9, 'Y')
    for y in (6, 7, 8, 9):
        c.put(16, y, 'Y' if y == 9 else 'H')
    # red roof dome + tip
    for y in range(1, 5):
        half = y + 1.5
        for x in range(int(16 - half), int(16 + half) + 1):
            c.put(x, y, 'q' if x < 15 else ('r' if x > 17 else 'R'))
    c.put(16, 0, 'K')
    return c


canvas_sprite('prop_lighthouse', lighthouse())


def dock():
    c = Canvas(32, 16)
    # short posts under the front edge, standing in the water
    for px in (3, 15, 27):
        c.rect(px, 11, px + 1, 14, 'o')
        c.put(px, 11, 'P'); c.put(px + 1, 14, 'P')
    # deck seen from above: planks run across, with gaps between them
    for y in range(1, 10):
        for x in range(1, 31):
            ch = 'p' if (x // 4) % 2 == 0 else '<'
            if x % 4 == 3:
                ch = 'O'
            if x % 4 == 0:
                ch = 'o'
            c.put(x, y, ch)
    # nail dots near both ends of each plank
    for x in range(2, 30, 4):
        c.put(x, 2, 'O'); c.put(x, 8, 'O')
    # front edge beam
    for x in range(1, 31):
        c.put(x, 10, 'O' if x % 5 else 'o')
        c.put(x, 11, 'o') if c.get(x, 11) == '.' else None
    # rope coil
    c.stamp([".mm.", "mMNm", ".mm."], 26, 3)
    return c


canvas_sprite('prop_dock', dock())


def boat():
    c = Canvas(32, 24)
    # hull
    for y in range(15, 22):
        t = (y - 15) / 6
        x0 = int(2 + t * 5)
        x1 = int(29 - t * 4)
        for x in range(x0, x1 + 1):
            ch = 'O'
            if y == 15:
                ch = 'p'
            elif y == 16:
                ch = 'W' if x < 26 else 'G'
            elif y == 17:
                ch = 'B'
            elif y >= 20:
                ch = 'o'
            c.put(x, y, ch)
    for x in range(4, 28, 4):
        c.put(x, 18, 'o'); c.put(x + 1, 19, 'o')
    # mast + sail
    for y in range(1, 15):
        c.put(15, y, 'o')
    for y in range(2, 14):
        w = int((y - 1) * 0.9)
        for x in range(16, 17 + w):
            ch = 'W' if x < 16 + w else 'G'
            if 6 <= y <= 8:
                ch = 'R' if x < 16 + w else 'r'
            c.put(x, y, ch)
    for y in range(4, 14):
        w = int((y - 3) * 0.6)
        for x in range(14 - w, 15):
            c.put(x, y, 'N' if x > 14 - w else 'm')
    c.rect(11, 14, 27, 14, 'o')
    # pennant
    c.stamp(["YY", "Y."], 16, 0)
    # oar
    c.line(8, 13, 4, 22, 'p')
    c.put(4, 22, 'O'); c.put(3, 22, 'O')
    return c


canvas_sprite('prop_boat', boat())


put('prop_beachsign', [
    "................",
    "................",
    "...ppppppppp....",
    "...pNNNNNNNNpp..",
    "...pNcNNNcNNpOp.",
    "...pcBcNcBcNpOO.",
    "...pNNBcBNNBpO..",
    "...oooooooooOo..",
    ".......pOo......",
    ".......pOo......",
    ".......pOo......",
    ".......pOo......",
    ".......pOo......",
    "......<pOo<.....",
    "....<<<pppp<....",
    "................",
])

put('prop_sandcastle', [
    "................",
    "........R.......",
    "........RR......",
    "........o.......",
    "......<<o<<.....",
    "......<pp<p.....",
    "......<p:pp.....",
    "..<<..<pppp.<<..",
    "..<p..<pppp.<p..",
    "..<pp<<<<<<<<p..",
    "..<p<ppp:pppppp.",
    "..<pppp:::ppppO.",
    "..<pppp:::pppOO.",
    ".OOOOOOOOOOOOOO.",
    "................",
    "................",
])
