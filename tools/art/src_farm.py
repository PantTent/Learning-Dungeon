"""Sunny Farm: buildings, farm tiles, crops, harvested items and farm animals."""
import random, math
from draw import Canvas
SPRITES = {}

LEAF = ['f', 'E', 'e', 'F']
BARK = ['p', 'O', 'o', 'P']


def grid(rows, w=16):
    for i, r in enumerate(rows):
        if len(r) != w:
            raise SystemExit(f'src_farm: row {i} has len {len(r)} (want {w}): {r!r}')
    return rows


def tile(g):
    return {'outline': False, 'rows': [''.join(r) for r in g]}


# ================================================================ tiles

def soil(seed=3, wet=False):
    rng = random.Random(seed)
    # 4-row repeating furrow: lit ridge top, ridge, shadow, furrow groove
    band = ['p', 'O', 'o', 'P']
    g = [[band[y % 4] for x in range(16)] for y in range(16)]
    # little clods + crumbs so it isn't stripey-flat
    for _ in range(18):
        x, y = rng.randrange(16), rng.randrange(16)
        b = y % 4
        if b == 0:
            g[y][x] = 'O'
        elif b == 1:
            g[y][x] = rng.choice('po')
        elif b == 2:
            g[y][x] = 'O'
    # tiny pebbles on the ridges
    for (x, y) in ((3, 1), (11, 5), (7, 9), (14, 13), (1, 13)):
        g[y][x] = 'm'
    if wet:
        darker = {'p': 'O', 'O': 'o', 'o': 'P', 'P': ':', 'm': 'M'}
        g = [[darker[c] for c in r] for r in g]
        # a few wet glints
        for (x, y) in ((5, 0), (12, 4), (2, 8), (9, 12)):
            g[y][x] = 'p'
    return g


SPRITES['farm_soil'] = tile(soil())
SPRITES['farm_soil_wet'] = tile(soil(wet=True))


def path():
    rng = random.Random(11)
    g = [['<']*16 for _ in range(16)]
    for _ in range(22):
        x, y = rng.randrange(16), rng.randrange(16)
        g[y][x] = rng.choice('pp<N')
    # pebbles: light top, dark bottom
    for (x, y) in ((3, 3), (12, 2), (8, 8), (1, 11), (13, 12), (6, 14)):
        g[y][x] = 'N'
        g[(y+1) % 16][x] = 'O'
        g[y][(x+1) % 16] = 'm'
        g[(y+1) % 16][(x+1) % 16] = 'p'
    return g


SPRITES['farm_path'] = tile(path())


def hay_floor():
    rng = random.Random(7)
    g = [['O']*16 for _ in range(16)]
    for _ in range(26):
        x, y = rng.randrange(16), rng.randrange(16)
        g[y][x] = 'o'
    # straw strands: short lines in random directions, wrapped
    for i in range(20):
        x, y = rng.randrange(16), rng.randrange(16)
        dx, dy = rng.choice(((1, 0), (1, 0), (1, 1), (1, -1), (0, 1)))
        L = rng.randrange(3, 6)
        col = rng.choice('YYyu')
        for k in range(L):
            g[(y+dy*k) % 16][(x+dx*k) % 16] = col
    return g


SPRITES['farm_hay_floor'] = tile(hay_floor())

SPRITES['farm_fence'] = {'outline': False, 'rows': grid([
    "................",
    "................",
    "pO............Op",
    "pOo..........pOp",
    "pOo..........pOp",
    "pOpppppppppppOOp",
    "oOOOOOOOOOOOOOOo",
    "PoooooooooooooPo",
    "pOo..........pOp",
    "pOo..........pOp",
    "pOpppppppppppOOp",
    "oOOOOOOOOOOOOOOo",
    "PoooooooooooooPo",
    "pOo..........pOp",
    "oOo..........oOo",
    "PoP..........PoP",
])}

SPRITES['farm_fence_v'] = {'outline': False, 'rows': grid([
    "......pO........",
    "......pO........",
    "......pO........",
    ".....pppOo......",
    ".....pOOOo......",
    ".....pOOoo......",
    ".....pOOoo......",
    ".....pOOoo......",
    ".....pOOoo......",
    ".....pOOoo......",
    ".....pOooo......",
    ".....oooPP......",
    "......pO........",
    "......pO........",
    "......pO........",
    "......pO........",
])}


# ================================================================ buildings

def house():
    c = Canvas(32, 32)
    # chimney (behind the roof)
    c.rect(21, 3, 24, 10, '5')
    for y in range(3, 11):
        c.put(21, y, '6')
        c.put(24, y, '4')
    c.rect(20, 2, 25, 3, '6')
    c.rect(20, 3, 25, 3, '5')
    c.put(22, 6, '4'); c.put(23, 8, '4')
    # puff of smoke
    for (x, y, ch) in ((22, 0, 'G'), (23, 0, 'W'), (24, 1, 'G')):
        c.put(x, y, ch)
    # walls
    c.rect(4, 15, 27, 28, 'N')
    for y in range(15, 29):
        c.put(27, y, 'm'); c.put(26, y, 'm' if y % 3 == 0 else 'N')
    for y in (17, 20, 23, 26):
        for x in range(4, 27):
            if c.get(x, y) == 'N':
                c.put(x, y, 'm')
    # stone base
    c.rect(3, 28, 28, 29, '6')
    for x in range(3, 29):
        c.put(x, 29, '5')
        if x % 4 == 1:
            c.put(x, 28, '5')
    # roof: front gable triangle with shingle rows
    for y in range(3, 15):
        half = 2 + (y - 3) * 1.25
        x0 = int(round(15.5 - half)); x1 = int(round(15.5 + half))
        x0 = max(x0, 1); x1 = min(x1, 30)
        for x in range(x0, x1 + 1):
            ch = 'R' if (y % 3) != 1 else 'r'
            if y % 3 != 1 and (x + (y // 3)) % 4 == 0:
                ch = 'r'
            c.put(x, y, ch)
        c.put(x0, y, 'q'); c.put(x0 + 1, y, 'q' if y < 14 else 'R')
        c.put(x1, y, 'Q')
    c.put(15, 2, 'q'); c.put(16, 2, 'R')
    # eave shadow under the roof
    for x in range(4, 28):
        c.put(x, 15, 'M')
    # round attic window in the gable
    c.stamp([".pp.", "pccp", "pAcp", ".pp."], 14, 8)
    # windows with flower boxes
    for wx in (6, 21):
        c.rect(wx, 18, wx + 4, 22, 'p')
        c.rect(wx + 1, 19, wx + 3, 21, 'c')
        c.put(wx + 1, 19, 'A'); c.put(wx + 2, 19, 'A')
        c.put(wx + 2, 20, 'p'); c.put(wx + 1, 20, 'p'); c.put(wx + 3, 20, 'p')
        c.put(wx + 3, 21, 'h')
        c.rect(wx - 1, 23, wx + 5, 24, 'O')
        for x in range(wx - 1, wx + 6):
            c.put(x, 24, 'o')
        for k, x in enumerate(range(wx - 1, wx + 6)):
            c.put(x, 22 if k % 2 == 0 else 23, 'E' if k % 2 else ('i' if k % 4 == 0 else 'Y'))
    # door
    c.rect(13, 19, 18, 28, 'O')
    c.rect(13, 19, 18, 19, 'o')
    for y in range(20, 29):
        c.put(13, y, 'o'); c.put(18, y, 'o'); c.put(15, y, 'o' if y > 20 else 'O')
        c.put(14, y, 'p')
    c.put(17, 24, 'Y')
    c.rect(14, 20, 17, 21, 'c'); c.put(14, 20, 'A'); c.put(15, 20, 'A')
    # step
    c.rect(12, 29, 19, 30, '8')
    for x in range(12, 20):
        c.put(x, 30, '6')
    return c.rows()


SPRITES['farm_house'] = {'w': 32, 'rows': house()}


def barn():
    c = Canvas(32, 32)
    # gambrel outline: half-width per row (top is row 2)
    halves = {2: 5, 3: 8, 4: 10, 5: 12, 6: 13, 7: 13.5, 8: 14, 9: 14}
    for y in range(2, 30):
        h = halves.get(y, 14)
        x0 = int(round(15.5 - h)); x1 = int(round(15.5 + h))
        for x in range(x0, x1 + 1):
            c.put(x, y, 'R')
        # vertical planks
        for x in range(x0, x1 + 1):
            if (x - 2) % 3 == 0 and y > 2:
                c.put(x, y, 'r')
        c.put(x1, y, 'r'); c.put(x1 - 1, y, 'r')
        c.put(x0, y, 'q')
    # dark roof cap + white trim following the roof edge
    prev = None
    for y in range(1, 11):
        h = halves.get(y + 1, 14) if y >= 1 else 5
        x0 = int(round(15.5 - h)); x1 = int(round(15.5 + h))
        if y == 1:
            x0, x1 = 10, 21
        c.put(x0, y, 'H'); c.put(x1, y, 'H')
        c.put(x0 - 1, y, 'D'); c.put(x1 + 1, y, 'D')
        if prev:
            for x in range(min(x0, prev[0]), max(x0, prev[0]) + 1):
                c.put(x, y, 'H'); c.put(x, y - 1, 'D') if x < prev[0] else None
            for x in range(min(x1, prev[1]), max(x1, prev[1]) + 1):
                c.put(x, y, 'H'); c.put(x, y - 1, 'D') if x > prev[1] else None
        prev = (x0, x1)
    for x in range(10, 22):
        c.put(x, 1, 'H'); c.put(x, 0, 'D')
    c.put(9, 0, '.'); c.put(22, 0, '.')
    # white corner trim
    for y in range(10, 30):
        c.put(1, y, 'H'); c.put(30, y, 'G')
    # hay loft
    c.rect(12, 5, 19, 11, 'H')
    c.rect(13, 6, 18, 10, 'P')
    for x in range(13, 19):
        c.put(x, 10, 'Y')
    c.stamp(["..uY..", ".uYYy.", "uYYyyy"], 13, 7)
    c.put(12, 11, 'G'); c.put(19, 11, 'G')
    c.rect(11, 12, 20, 12, 'G')
    # big doors with white X
    c.rect(7, 16, 24, 29, 'H')
    for (dx0, dx1) in ((8, 15), (16, 23)):
        c.rect(dx0, 17, dx1, 28, 'R')
        for x in range(dx0, dx1 + 1):
            if x % 2 == 0:
                for y in range(17, 29):
                    c.put(x, y, 'r')
        for i in range(12):
            t = i / 11
            x = dx0 + round(t * (dx1 - dx0))
            c.put(x, 17 + i, 'H')
            c.put(dx1 - round(t * (dx1 - dx0)), 17 + i, 'H')
        c.put(dx0, 17, 'H'); c.put(dx1, 28, 'H')
    for y in range(17, 29):
        c.put(15, y, 'G'); c.put(16, y, 'H')
    c.rect(7, 29, 24, 29, 'G')
    # little door handles
    c.put(14, 23, 'Y'); c.put(17, 23, 'Y')
    # ground shadow
    for x in range(1, 31):
        c.put(x, 30, 'o')
    return c.rows()


SPRITES['farm_barn'] = {'w': 32, 'rows': barn()}


def market():
    c = Canvas(32, 24)
    # back wall
    c.rect(4, 8, 27, 15, 'o')
    for x in range(4, 28):
        if x % 4 == 0:
            for y in range(8, 15):
                c.put(x, y, 'P')
    # shelf with jars
    c.rect(5, 10, 26, 10, 'O')
    for x in (7, 11, 20, 24):
        c.put(x, 9, 'c'); c.put(x + 1, 9, 'Y')
    # posts
    for px in (3, 27):
        c.rect(px, 7, px + 1, 22, 'O')
        for y in range(7, 23):
            c.put(px, y, 'p')
    # awning: stripes, top edge, scalloped bottom
    for y in range(1, 7):
        x0 = 2 if y > 1 else 3; x1 = 29 if y > 1 else 28
        for x in range(x0, x1 + 1):
            stripe = ((x - 2) // 3) % 2 == 0
            ch = 'R' if stripe else 'H'
            if y >= 5:
                ch = 'r' if stripe else 'G'
            if y == 1:
                ch = 'q' if stripe else 'H'
            c.put(x, y, ch)
    for x in range(2, 30):
        stripe = ((x - 2) // 3) % 2 == 0
        if (x - 2) % 3 != 2:
            c.put(x, 7, 'r' if stripe else 'G')
        if (x - 2) % 3 == 1:
            c.put(x, 8, 'r' if stripe else 'G')
    # counter
    c.rect(2, 15, 29, 22, 'O')
    for x in range(2, 30):
        c.put(x, 15, 'p'); c.put(x, 16, 'p'); c.put(x, 17, 'o')
    for y in (19, 21):
        for x in range(3, 29):
            c.put(x, y, 'o')
    for x in range(2, 30, 7):
        for y in range(18, 23):
            c.put(x, y, 'o')
    # sign plate on the counter
    c.rect(13, 18, 18, 21, 'N')
    c.rect(14, 19, 17, 20, 'Y'); c.put(14, 19, 'u'); c.put(17, 20, 'y')
    # veggies on the counter top
    c.stamp(["..E.E.", "^777..", "77777.", ".777.."], 4, 11)          # carrots? (rounded pile)
    c.stamp([".E.", "qRR", "RRr"], 10, 12)                              # tomato
    c.stamp([".E.", "RqR", "rRr"], 12, 12)
    c.stamp(["..EE...", ".^7777.", "^77y77y", ".7y77y."], 16, 11)        # pumpkin
    c.stamp(["EE..", "uYY.", "uYY.", ".YYe"], 24, 11)                   # corn
    return c.rows()


SPRITES['farm_market'] = {'w': 32, 'rows': market()}

SPRITES['farm_sign'] = grid([
    "................",
    "................",
    "................",
    "..OOOOOOOOOOOO..",
    "..OppppppppppO..",
    "..Opp..YYYpp.oO." if False else "..OppppYYYppppo.",
    "..OpppYuYYyppo..",
    "..OpppYYyyyppo..",
    "..OpppyYYyyppo..",
    "..OppppyyyppPo..",
    "..ooooooooooooo.",
    "......pOo.......",
    "......pOo.......",
    "......pOo.......",
    ".....&pOo&&.....",
    "................",
])


def apple_tree():
    c = Canvas(32, 32)
    # trunk
    c.rect(13, 19, 18, 29, 'O')
    for y in range(19, 30):
        c.put(13, y, 'p'); c.put(18, y, 'o'); c.put(17, y, 'o' if y % 3 else 'O')
    c.stamp(["oO......Oo", "PoO....OoP"], 11, 28)
    c.put(15, 24, 'o'); c.put(16, 22, 'o')
    # grass tuft
    for x in range(9, 23):
        c.put(x, 30, '%' if x % 3 else '#')
    # canopy clumps
    for (cx, cy, rx, ry) in ((16, 12, 13.6, 8.8), (8, 13, 6.4, 6), (24, 13, 6.4, 6),
                             (11, 7, 7, 5.6), (21, 7, 7, 5.6), (16, 17, 9, 4)):
        c.ellipse(cx, cy, rx, ry, ['E', 'E', 'e', 'F'])
    c.ellipse(11, 6.5, 4, 3.2, ['f', 'f', 'E', 'e'])
    c.ellipse(21, 6, 3.4, 2.6, ['f', 'E', 'E', 'e'])
    c.ellipse(6, 11, 2.6, 2.2, ['f', 'E', 'E', 'e'])
    for (x, y, ch) in ((7, 15, 'e'), (12, 13, 'e'), (19, 12, 'e'), (24, 15, 'e'), (15, 9, 'e'),
                       (10, 4, 'J'), (9, 5, 'H'), (26, 10, 'f')):
        c.put(x, y, ch)
    # dark rim under canopy
    for x in range(2, 30):
        for y in range(29, 5, -1):
            if c.get(x, y) in 'EefF':
                if c.get(x, y + 1) not in 'EefF':
                    c.put(x, y, 'F')
                break
    # apples
    for (ax, ay) in ((8, 10), (14, 14), (21, 10), (25, 16), (11, 18), (19, 17), (16, 5)):
        c.stamp(["qR", "Rr"], ax, ay)
        c.put(ax + 1, ay - 1, 'e')
    return c.rows()


SPRITES['farm_tree'] = {'w': 32, 'rows': apple_tree()}

SPRITES['farm_hay'] = grid([
    "................",
    "................",
    "................",
    "................",
    "...uuuuuuuuuu...",
    "..uYuuYuuuYuuu..",
    "..YyYYYYyYYYYy..",
    "..YYuYYYYuYYYy..",
    "..OOOOOOOOOOOo..",
    "..YYyYYuYYyYYy..",
    "..YuYYYYyYYuYy..",
    "..yYYyYYYYYYyy..",
    "..OOOOOOOOOOOo..",
    "..YyYYuYYyYYyU..",
    "...yyyyyyyyyU...",
    "................",
])

SPRITES['farm_trough'] = {'w': 16, 'rows': grid([
    "................",
    ".pppppppppppppp.",
    ".pPPPPPPPPPPPPO.",
    ".pPooYuYYoooPPO.",
    ".OOOOOOOOOOOOOo.",
    "..OppppppppppO..",
    "..ooooooooooooo." if False else "..Ooooooooooooo.",
    "..pO........oO..",
    "..oo........oo..",
    "................",
])}

SPRITES['farm_alert'] = {'w': 10, 'rows': grid([
    "..........",
    "..HHHHHH..",
    ".HHHqRHHH.",
    ".HHHRRHHH.",
    ".HHHRRHHH.",
    ".HHHRRHHH.",
    ".HHHRRHHH.",
    ".HHHrrHHH.",
    ".HHHHHHHH.",
    ".HHHRRHHH.",
    ".GHHrrHHG.",
    "..GGGHHGG.",
    "....GHG...",
    "....GG....",
    "....G.....",
    "..........",
], 10)}

SPRITES['farm_heart'] = {'w': 9, 'rows': grid([
    ".........",
    "..RR.RR..",
    ".RqHRRRR.",
    ".RqRRRRr.",
    "..RRRRr..",
    "...RRr...",
    "....r....",
    ".........",
], 9)}

SPRITES['farm_coin'] = {'w': 10, 'rows': grid([
    "..........",
    "...YYYY...",
    "..YuuuYy..",
    ".YuYyyYYy.",
    ".YuyuYYYy.",
    ".YuyYYYYy.",
    ".YYyYYYyy.",
    "..yYyyyy..",
    "...yyyy...",
    "..........",
], 10)}


def portal32():
    c = Canvas(32, 32)
    # swirl inside the arch opening
    cx, cy = 16, 17.5
    for y in range(6, 30):
        for x in range(8, 24):
            dx = x + 0.5 - cx; dy = y + 0.5 - cy
            inside = (dy >= 0 and abs(dx) <= 7.5) or (dx*dx/56 + dy*dy/110 <= 1.0)
            if not inside or y > 29:
                continue
            r = math.hypot(dx, dy / 1.3)
            a = math.atan2(dy, dx)
            s = (a + r * 0.55) % (2 * math.pi)
            band = int(s / (2 * math.pi) * 6) % 3
            if r < 1.8:
                ch = 'H'
            elif r < 3:
                ch = 'A'
            else:
                ch = ['V', 'v', 'a', ][band] if r < 6 else ['v', 'x', 'h'][band]
                if band == 0 and r < 4.5:
                    ch = 'w'
            c.put(x, y, ch)
    # stone arch: thick ring of blocks around the opening
    for y in range(1, 31):
        for x in range(2, 30):
            dx = x + 0.5 - cx; dy = y + 0.5 - cy
            if dy >= 0:
                d_out = abs(dx) <= 13.5
                d_in = abs(dx) <= 7.5
            else:
                d_out = dx*dx/182 + dy*dy/(16.5**2) <= 1.0
                d_in = dx*dx/56 + dy*dy/110 <= 1.0
            if d_out and not d_in and y <= 29:
                # block pattern
                ang = math.atan2(dy, dx)
                if dy < 0:
                    blk = int((ang + math.pi) / math.pi * 9)
                    seam = abs(((ang + math.pi) / math.pi * 9) - round((ang + math.pi) / math.pi * 9)) < 0.12
                else:
                    blk = (y // 4) + (0 if dx < 0 else 1)
                    seam = (y % 4 == 0)
                ch = '8' if blk % 2 else '6'
                if dx > 0:
                    ch = '6' if blk % 2 else '5'
                if seam:
                    ch = '4'
                c.put(x, y, ch)
    # inner rim glow + outer highlights
    rim = []
    for y in range(1, 30):
        for x in range(1, 31):
            if c.get(x, y) in '8654' and any(c.get(x + ox, y + oy) in 'VvaxhwAH'
                                            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                rim.append((x, y))
    for (x, y) in rim:
        c.put(x, y, 'w' if x < 16 else 'V')
    # keystone gem
    c.stamp([".A.", "AaA", ".h."], 15, 1)
    # base plinths
    c.rect(1, 29, 10, 30, '5'); c.rect(21, 29, 30, 30, '4')
    for x in range(1, 11):
        c.put(x, 29, '6')
    for x in range(21, 31):
        c.put(x, 29, '5')
    # moss and sparkles
    for (x, y, ch) in ((4, 26, 'Z'), (5, 27, '9'), (26, 22, 'Z'), (6, 12, 'Z'), (7, 13, '9'),
                       (0, 6, 'A'), (31, 10, 'w'), (29, 3, 'A'), (1, 20, 'w')):
        c.put(x, y, ch)
    return c.rows()


SPRITES['farm_portal'] = {'w': 32, 'rows': portal32()}


# ================================================================ crops (16x16, outline)

SPRITES['crop_seeds'] = grid([
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    ".....pppppp.....",
    "...ppNpOpNpOO...",
    "..pOpOONOOOpOo..",
    "..oOOOOOOOOOoo..",
    "................",
])

SPRITES['crop_sprout'] = grid([
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "...fff...fff....",
    "..fEEEE.EEEEf...",
    "...eEEEEEEee....",
    "......eEe.......",
    ".......E........",
    "......pEpp......",
    "....ppOOOOpp....",
    "...oOOOOOOOOo...",
    "................",
])

SPRITES['crop_growing'] = grid([
    "................",
    "................",
    "................",
    ".......ff.......",
    "......fEEf......",
    "..ff..fEEe..ff..",
    ".fEEf.eEEe.fEEf.",
    ".fEEEe.Ee.eEEEe.",
    "..eEEEeEeeEEEe..",
    "...eeEEEEEEee...",
    ".fEEeeEEEeeEEf..",
    ".eEEEEeEeEEEEe..",
    "..eeeeEEEeeee...",
    "....ppOEOpp.....",
    "...oOOOOOOOOo...",
    "................",
])

SPRITES['crop_carrot'] = grid([
    "................",
    "....f.....f.....",
    "...fEf.f.fEf....",
    "..fEEefEfEEe.f..",
    "..eEfEeEeEfe.Ef.",
    "...eEfEEfEe.fEe.",
    "..f.eEEEEEefEe..",
    ".fEf.eEeEeEEe...",
    ".eEEe.eEeEee....",
    "..eeEEeEEEeEf...",
    "....eeEEEEEEe...",
    "...^7^7^77^7....",
    "..^777777777T...",
    "...p7T7O77TpO...",
    "..oOOOOOOOOOOo..",
    "................",
])

SPRITES['crop_tomato'] = grid([
    "................",
    ".......fp.......",
    "......fEOf......",
    "....fEEOEEf.....",
    "...fEqRpEEEe....",
    "...eRRrOEqRf....",
    "..fEERrOeRRre...",
    ".fEEfEeOEeRrEe..",
    ".eqReEEOEfEEe...",
    "..RRrEeOEEqRe...",
    "..eRreEOeERRr...",
    "...eEEeOEEeRe...",
    "....eeEOEee.....",
    ".....ppOOpp.....",
    "...oOOOOOOOOo...",
    "................",
])

SPRITES['crop_corn'] = grid([
    "................",
    ".......u........",
    "......uYu.......",
    ".......E........",
    ".......Ef..f....",
    "...f..eEEEfE....",
    "....fEeEfuYE....",
    ".....eEEuYYe....",
    "......EEYYye....",
    "...fEEeEYyyE....",
    "..fE..eEeyEe....",
    ".......EEeE.ff..",
    ".......eEeEEEEf.",
    ".....ppeEepp....",
    "...oOOOOOOOOo...",
    "................",
])

SPRITES['crop_pumpkin'] = grid([
    "................",
    "................",
    "...ff...........",
    "..fEEf..fff.....",
    "..eEEEeffEEf....",
    "...eeEEEEEEe....",
    "......EpOEEe.f..",
    "....^^7O77^7.Ee.",
    "...^^77777777e..",
    "..^^777^77777T..",
    "..^777^7777777T.",
    "..77777^7777T7T.",
    "..T777T777T77T..",
    "...TTTtTTTtTT...",
    "..oOOOOOOOOOOo..",
    "................",
])

SPRITES['crop_strawberry'] = grid([
    "................",
    "................",
    "................",
    "................",
    "................",
    "......ff..ff....",
    "....ffEEffEEf...",
    "...fEEEEEEEEEf..",
    "..fEqREeEEEEEe..",
    "..eRuRreEfEqRe..",
    "..eRRrEEEEeRuR..",
    "...rrEEqREEeRr..",
    "..fEEeERuREEe...",
    "...eeeeRrreee...",
    "...oOOOOOOOOo...",
    "................",
])


# ================================================================ items (16x16 icons)

SPRITES['item_carrot'] = grid([
    "................",
    "............f.f.",
    "..........fEfEf.",
    "...........eEEe.",
    "..........^7eEf.",
    ".........^777e..",
    "........^7777...",
    ".......^777T7...",
    "......^7T777....",
    ".....^7777T.....",
    "....^777T7......",
    "....777T7.......",
    "...77T77........",
    "..77TT..........",
    "..TT............",
    "................",
])

SPRITES['item_tomato'] = grid([
    "................",
    "................",
    "........E.......",
    ".......fE.......",
    ".....eEEEEe.....",
    "...RRRrEErRRR...",
    "..RqHRRRRRRRRr..",
    ".RqHRRRRRRRRRRr.",
    ".RqRRRRRRRRRRRr.",
    ".RRRRRRRRRRRRrr.",
    ".RRRRRRRRRRRrrr.",
    "..RRRRRRRRRrrr..",
    "..rRRRRRRRrrrQ..",
    "...rrrrrrrrrQ...",
    ".....QQQQQQ.....",
    "................",
])

SPRITES['item_corn'] = grid([
    "................",
    "...........uY...",
    "..........uYYY..",
    ".........uYYyY..",
    "........uYYyYy..",
    ".......uYYyYyy..",
    "......EYYyYyy...",
    ".....fEYyYyy....",
    "....fEEEYyy.....",
    "...fEEeEEyeE....",
    "..fEEeEEeEEe....",
    "..EEeeeEEee.....",
    "...eEe.Eee......",
    "...fE...........",
    "..fE............",
    "................",
])

SPRITES['item_pumpkin'] = grid([
    "................",
    "........eO......",
    ".......eOo.ff...",
    "......fOo.fEEe..",
    "....^^7oo7eee...",
    "...^^^77777777..",
    "..^^777^777777T.",
    "..^7777^77777TT.",
    ".^^777^7777777T.",
    ".^7777^7777777T.",
    ".^7777^777T777T.",
    ".77777T777T77TT.",
    "..T777T777T77T..",
    "..TTTTtTTTtTTt..",
    "....ttttttttt...",
    "................",
])

SPRITES['item_strawberry'] = grid([
    "................",
    ".......E........",
    "......fE........",
    "....fEEEEEe.....",
    "...fEeEEEeEe....",
    "...RqRRRRRRRR...",
    "..RqHuRRRuRRRr..",
    "..RqRRRRRRRRRr..",
    "..RRuRRRuRRuRr..",
    "...RRRRRRRRRr...",
    "...RRuRRRuRrr...",
    "....RRRRRRrr....",
    ".....RRuRrr.....",
    "......rrrr......",
    ".......rr.......",
    "................",
])


# ================================================================ animals (face right)

SPRITES['animal_horse'] = {'w': 20, 'rows': grid([
    "....................",
    "..............o.o...",
    ".............PoOoO..",
    "............PPOOOOO.",
    "...........PPOOOHkO.",
    "...........PPOOOkkO.",
    "..........PPOOOOOpp.",
    "..........PPOOOOpoo.",
    "..PP.ppppPPOOOO.....",
    ".PPPOpppOOOOOOO.....",
    ".PPOOOOOOOOOOOO.....",
    ".P..OOOOOOOOOOo.....",
    ".P..oOOOOOOOOoo.....",
    "....oO.oO.oO.oO.....",
    "....PP.PP.PP.PP.....",
    "....................",
], 20)}

SPRITES['animal_pig'] = grid([
    "................",
    "................",
    "................",
    "................",
    "..........iI....",
    "....$$$$$$iIi...",
    "...$$iiiiiiiii..",
    ".I.$iiiiiiiHki..",
    "I.$iiiiiiiikkiI.",
    ".Ii$iiiiiiiiIQI.",
    "..$iiiiiiiiiIII.",
    "...iiiiiiiiiii..",
    "...IiiiiiiiiI...",
    "....IiI..IiI....",
    "....II...II.....",
    "................",
])

SPRITES['animal_chicken'] = grid([
    "................",
    "................",
    "................",
    "..........RR....",
    ".........RRRR...",
    ".........HHHH...",
    "........HHHHkY..",
    "........HHHHHYy.",
    "..G.....GHHHr...",
    ".GHG...HHHHHr...",
    ".GHHHHHHHHHH....",
    "..GHHHGGHHHG....",
    "...GHHHGGHG.....",
    "....GGGGGG......",
    "......y.y.......",
    ".....yy.yy......",
])

SPRITES['animal_goat'] = grid([
    "................",
    ".........M.M....",
    ".........MMMM...",
    "......ggWWWWWW..",
    ".......gWWHkWWW.",
    "..W....GWWkkWWG.",
    ".WW....GWWWWWnG.",
    "..WWWWWWWWWWGG..",
    ".GWWWWWWWWWG.G..",
    ".GWWWWWWWWWG.G..",
    ".GGWWWWWWWGG....",
    "..GGGGGGGGGG....",
    "..g.g...g.g.....",
    "..g.g...g.g.....",
    "..n.n...n.n.....",
    "................",
])
