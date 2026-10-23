"""Sunny Farm, part 2: more animals, products, baked goods, kitchen + fair,
orchard trees/bushes/bog/hives, and fair awards."""
import math, random
from draw import Canvas
SPRITES = {}


def grid(rows, w=16):
    for i, r in enumerate(rows):
        if len(r) != w:
            raise SystemExit(f'src_farm2: row {i} has len {len(r)} (want {w}): {r!r}')
    return rows


def blob(c, cx, cy, rx, ry, shades, top_rx=None, light=(-0.6, -0.8)):
    """Shaded ellipse; top_rx narrows the upper half (egg shape)."""
    lx, ly = light
    n = len(shades)
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dy = (y + 0.5 - cy) / ry
            r = top_rx if (top_rx and dy < 0) else rx
            dx = (x + 0.5 - cx) / r
            d = dx * dx + dy * dy
            if d > 1.0:
                continue
            dz = math.sqrt(max(0, 1 - d))
            dot = (dx * lx + dy * ly) * 0.9 + dz * 0.5
            t = (1.1 - dot) / 1.6
            if d > 0.72:
                t += 0.25
            c.put(x, y, shades[min(n - 1, max(0, int(t * n)))])


def berry(c, x, y, cols, crown):
    """3x3 round berry with highlight and a crown/blossom dot."""
    l, m, d = cols
    c.stamp([f".{m}{m}.", f"{m}{l}{m}{d}", f"{m}{m}{d}{d}", f".{d}{d}."], x, y)
    c.put(x + 2, y + 1, crown) if crown else None


# ================================================================ animals (face right)

SPRITES['animal_cow'] = {'w': 20, 'rows': grid([
    "....................",
    "....................",
    "..............N..N..",
    ".............KHHHHK.",
    "..............HHkHH.",
    "..............HHHHH.",
    "...HHHHKKKHHHHHHH$$.",
    "..KHHKKKKHHHHKHHHi$.",
    ".K.HHHKKHHHHKKKH$$$.",
    ".K.HHHHHHHHKKKKG....",
    ".K.GHHHHHHHHKKHG....",
    "...GGHHHHHHHHHGG....",
    "...HG.HG$i$HG.HG....",
    "...HG.HG.i.HG.HG....",
    "...KK.KK...KK.KK....",
    "....................",
], 20)}

SPRITES['animal_sheep'] = grid([
    "................",
    "................",
    "................",
    "................",
    "....HH.HH.HH....",
    "...HWHHWHHWHDD..",
    "..HHHHHHHHHDDDD.",
    ".HWHHHHHHHHDNkD.",
    ".HHHWHHHWHHDDDD.",
    ".GHHHHHHHHHGDD..",
    "..GHHWHHHHHG....",
    "...GGGGGGGG.....",
    "...D.D....D.D...",
    "...D.D....D.D...",
    "...K.K....K.K...",
    "................",
])


# ================================================================ products (16x16)

def egg():
    c = Canvas(16, 16)
    # straw nest
    for x in range(2, 14):
        c.put(x, 13, 'y' if x % 3 else 'Y')
        c.put(x, 12, 'Y' if x % 2 else 'u')
    for x in range(3, 13):
        c.put(x, 14, 'U' if x % 2 else 'y')
    blob(c, 10, 7.5, 3.2, 4.4, ['<', 'p', 'O', 'o'], top_rx=2.7)
    blob(c, 6, 8.5, 3.4, 4.5, ['H', 'N', 'm', 'M'], top_rx=2.8)
    c.put(4, 6, 'H'); c.put(9, 5, 'N')
    for x in (1, 14):
        c.put(x, 12, 'y')
    return c.rows()


SPRITES['item_egg'] = egg()

SPRITES['item_milk'] = grid([
    "................",
    "......qRRR......",
    "......RRRr......",
    "......AWWG......",
    ".....AWWWWG.....",
    "....AWWWWWWG....",
    "....HWWWWWWG....",
    "....HBBBBBBb....",
    "....HBBHBBBb....",
    "....HBHHHBBb....",
    "....HBBHBBBb....",
    "....HBBBBBBb....",
    "....HWWWWWWG....",
    "....GWWWWWGG....",
    ".....GGGGGG.....",
    "................",
])


def wool():
    c = Canvas(16, 16)
    # loose strand trailing off to the right
    for (x, y) in ((11, 12), (12, 13), (13, 13), (14, 12)):
        c.put(x, y, 'm')
    blob(c, 7.5, 7.5, 5.8, 5.8, ['H', 'N', 'N', 'm'])
    for k in (-2, -1, 0, 1, 2):
        for x in range(2, 14):
            y = int(round(7.5 + k * 2.6 + 0.07 * (x - 7.5) ** 2 - 0.35 * (x - 7.5)))
            b = c.get(x, y)
            if b in 'HNm' and (x - 7.5) ** 2 + (y - 7.5) ** 2 < 25:
                c.put(x, y, 'm' if b == 'H' else 'M')
    for (x, y) in ((4, 4), (5, 3), (4, 5)):
        c.put(x, y, 'H')
    return c.rows()


SPRITES['item_wool'] = wool()


def truffle():
    c = Canvas(16, 16)
    blob(c, 8, 9, 6, 4.5, ['O', 'o', 'P', ':'])
    for (bx, by, r) in ((5, 6.5, 2.5), (9, 5.5, 2.8), (12, 8, 2.2), (4, 10, 2.2)):
        blob(c, bx, by, r, r * 0.9, ['O', 'o', 'P', ':'])
    rng = random.Random(4)
    for _ in range(14):
        x, y = rng.randrange(3, 14), rng.randrange(5, 13)
        if c.get(x, y) in 'oP':
            c.put(x, y, ':' if rng.random() < 0.6 else 'O')
    for (x, y) in ((4, 5), (8, 4), (9, 4), (3, 9)):
        c.put(x, y, 'p')
    # a tiny leaf to say "found in the woods"
    c.stamp(["fE", ".Ee"], 12, 4)
    return c.rows()


SPRITES['item_truffle'] = truffle()


def horseshoe():
    c = Canvas(16, 16)
    cx, cy = 7.5, 7.5
    for y in range(1, 15):
        for x in range(1, 15):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy * 1.05)
            inside = False
            if dy >= -0.5:
                inside = 2.6 <= d <= 6.2
            elif y >= 2:
                inside = 2.6 <= abs(dx) <= 6.2
            if not inside:
                continue
            ch = 'Y'
            if dx < -4.6 or (dy < -2 and dx < 0 and abs(dx) > 4.6):
                ch = 'u'
            if dx > 4.6 or dy > 5.0:
                ch = 'y'
            if dy > 5.6:
                ch = 'U'
            c.put(x, y, ch)
    # flared heels at the top
    for (x, y, ch) in ((1, 2, 'u'), (14, 2, 'y'), (1, 1, '.'), (14, 1, '.')):
        c.put(x, y, ch)
    # nail holes
    for (x, y) in ((2, 5), (2, 9), (4, 12), (13, 5), (13, 9), (11, 12)):
        c.put(x, y, 'U')
    c.put(7, 13, 'u'); c.put(8, 13, 'Y')
    # sparkle
    return c.rows()


SPRITES['item_horseshoe'] = horseshoe()

SPRITES['item_apple'] = grid([
    "................",
    "........o.......",
    "........oEEf....",
    "........oEe.....",
    "...qRRRRoRRRr...",
    "..qHqRRRRRRRRr..",
    ".RqHRRRRRRRRRRr.",
    ".RqRRRRRRRRRRRr.",
    ".RqRRRRRRRRRRrr.",
    ".RRRRRRRRRRRrrr.",
    ".RRRRRRRRRRRrrr.",
    "..RRRRRRRRRrrr..",
    "..rRRRRRRRrrrQ..",
    "...rrrQrrrrrQ...",
    "....QQQ..QQQ....",
    "................",
])


def berry_cluster(cols, crown, positions, leaf=True, stem=None):
    c = Canvas(16, 16)
    if stem:
        for (x, y) in stem:
            c.put(x, y, 'o')
    if leaf:
        c.stamp(["..fE.", ".fEEe", "fEEe.", ".ee.."], 9, 1)
    for (x, y) in positions:
        berry(c, x, y, cols, crown)
    return c.rows()


SPRITES['item_blueberry'] = berry_cluster(
    ('c', 'B', 'b'), 'C', ((2, 5), (6, 4), (9, 6), (4, 8), (8, 9), (1, 9), (5, 11), (10, 10)))
SPRITES['item_cranberry'] = berry_cluster(
    ('q', 'R', 'r'), None, ((3, 6), (7, 5), (10, 8), (5, 9), (2, 10), (8, 11)),
    stem=((9, 4), (8, 4), (10, 5), (6, 5), (5, 6)))


SPRITES['item_syrup'] = grid([
    "................",
    "......qRRr......",
    "......RRRr......",
    ".......Yy.......",
    "......uYyU......",
    ".....uYYyyUUU...",
    "....uYYYyyU..U..",
    "....uNNNNNU..U..",
    "....uNNRNNU.U...",
    "....uNRRRNUU....",
    "....uNNRNNy.....",
    "....uYYYYyy.....",
    "....uYYyyyU.....",
    "....YyyyyUU.....",
    ".....UUUUU......",
    "................",
])

SPRITES['item_honey'] = grid([
    "................",
    "............pO..",
    "...........pO...",
    "..........pO....",
    "..pppppppOppp...",
    "..OOOOOOOOOOo...",
    "...uYYYYYYyU....",
    "..uuYYYYYYYyU...",
    "..uYNNNNNNNyU...",
    "..uYNNYKYNNyU...",
    "..uYNNNNNNNyU...",
    "..uYYYYYYYYyU...",
    "..uYYYYYYYyyU...",
    "...yYYYYYyyU....",
    "....UUUUUUU.....",
    "................",
])


# ================================================================ baked goods (16x16)

SPRITES['item_muffin'] = grid([
    "................",
    "........Ef......",
    ".......^7.......",
    "......NN7NN.....",
    ".....HNNNNNm....",
    "...pHNNNNNmmO...",
    "..pp7HNNNmmOOO..",
    ".ppOpp7pOO7pOOo.",
    ".pOOO7OOOOOO7Oo.",
    "..cBcBcBcBcBcB..",
    "..cBcBcBcBcBcB..",
    "...cBcBcBcBcB...",
    "...cBcBcBcBcb...",
    "...bbbbbbbbbb...",
    "................",
    "................",
])

SPRITES['item_jam'] = grid([
    "................",
    "................",
    "...RHRHRHRHRH...",
    "..HRHRHRHRHRHR..",
    ".RHRHRHRHRHRHRH.",
    "...YYYYYYYYYY...",
    "...WGGGGGGGGW...",
    "..WqRRRRRRRRrW..",
    "..WqNNNNENNNrW..",
    "..WqNNNRRRNNrW..",
    "..WqNNNNRNNNrW..",
    "..WqRRRRRRRRrW..",
    "..WqRRRRRRRrrW..",
    "..GrrrrrrrrrQG..",
    "...GGGGGGGGGG...",
    "................",
])

SPRITES['item_soup'] = grid([
    "................",
    "................",
    "................",
    "............GW..",
    "...........GW...",
    "..........GW....",
    "....ccccccGc....",
    "..ccRRRRRRRRcc..",
    ".cRRqHHRRERRRRB.",
    ".cRRRRHHRRRERRB.",
    ".BcRRRRRRRRRRBb.",
    ".cBccccccccccBb.",
    "..cBBBBBBBBBBb..",
    "...cBBBBBBBBb...",
    ".....bbbbbb.....",
    "................",
])

SPRITES['item_cornbread'] = grid([
    "................",
    "................",
    "................",
    "......HHN.......",
    "....yyyNNmuyyyy.",
    "...yYuYYuyYYuYy.",
    "..yYYYuYYYYuYYy.",
    ".yYuYYYYYuYYYyU.",
    ".yyyyyyyyyyyyyU.",
    ".YYyYYYuYYyYYyU.",
    ".YuYYyYYYYYuYyU.",
    ".YYYYYYyYYYYYyU.",
    ".yYyYYYYYyYYyyU.",
    ".UUUUUUUUUUUUUU.",
    "................",
    "................",
])

SPRITES['item_cheese'] = grid([
    "................",
    "................",
    "................",
    "..........uuY...",
    "........uuuuYy..",
    "......uuYuuuYy..",
    "....uuuuuuuuYy..",
    "..uuuuuuuYuuYy..",
    "..YYYYYYYYYYyy..",
    "..YyYYYYYyYYyy..",
    "..YUYYYyYYYYyy..",
    "..YYYYYUyYYYyy..",
    "..YYyYYYYYYUyy..",
    "..yyyyyyyyyyUU..",
    "................",
    "................",
])


def pie(kind):
    c = Canvas(16, 16)
    # tin / crust side
    blob(c, 8, 9.6, 7, 4.2, ['O', 'O', 'o', 'P'])
    for x in range(1, 15):
        if c.get(x, 12) != '.':
            c.put(x, 12, 'o')
    # crust rim
    blob(c, 8, 8.2, 7, 4.2, ['<', 'p', 'p', 'O'])
    if kind == 'pumpkin':
        blob(c, 8, 8.0, 5.4, 2.9, ['^', '7', '7', 'T'])
        # whipped cream dollop
        c.stamp([".HN.", "HHNm", ".Nm."], 6, 6)
    else:
        blob(c, 8, 8.0, 5.6, 3.0, ['u', 'Y', 'y', 'y'])
        for y in range(4, 13):
            for x in range(2, 15):
                if c.get(x, y) in 'uYy':
                    c.put(x, y, 'y' if (x + y) % 2 else 'U')
                    if x % 3 == 1 or y in (6, 9):
                        c.put(x, y, 'u' if x < 8 and y < 8 else ('Y' if x < 11 else '<'))
    # crimped edge dots
    for k in range(14):
        a = k / 14 * 2 * math.pi
        x = int(8 + 6.4 * math.cos(a)); y = int(8.2 + 3.7 * math.sin(a))
        if c.get(x, y) in '<p':
            c.put(x, y, 'O' if k % 2 else 'N')
    return c.rows()


SPRITES['item_pumpkinpie'] = pie('pumpkin')
SPRITES['item_applepie'] = pie('apple')

SPRITES['item_pancakes'] = grid([
    "................",
    "................",
    "................",
    "...cB..uH.cB....",
    "...bB<pYYp<bB...",
    "..<pyYYYYYyp<p..",
    "..OyOOOOOOOyOo..",
    "..<pp<pyp<pp<p..",
    "..OOOOOyOOOOOo..",
    "..<p<pp<yp<p<p..",
    "..OOOOOOyOOOOo..",
    "..<pp<ppp<pp<p..",
    "..oOOOOOOOOOOo..",
    ".GHHHHHHHHHHHHG.",
    "..GGGGGGGGGGGG..",
    "................",
])

SPRITES['item_cranberrysauce'] = grid([
    "................",
    "...........pO...",
    "..........pO....",
    ".........pO.....",
    ".....RqR.O......",
    "...qRRrRqRRr....",
    "..RqRRRqRrRqRr..",
    ".HrRRqRRRRqRrRG.",
    ".HNNNNNNNNNNNmG.",
    ".HNNNNNNNNNNmmG.",
    "..HNNNNNNNNmmG..",
    "..GNNNNNNNNmmG..",
    "...GNNNNNNmmG...",
    "....GGGGGGGG....",
    "................",
    "................",
])

SPRITES['item_honeycake'] = grid([
    "................",
    "................",
    "......uYY.......",
    "...uuYYYYYYYy...",
    "..uYYYYYYYYYYy..",
    "..YYyYYYyYYYYy..",
    "..pYppYpppYppO..",
    "..ppYpppppYppO..",
    "..NNYNNNNNNNNm..",
    "..pppppppppppO..",
    "..NNNNNNNNNNNm..",
    "..pppppppppppO..",
    "..oooooooooooo..",
    ".GHHHYHHHHHHHHG.",
    "..GGGGGGGGGGGG..",
    "................",
])


# ================================================================ buildings (32x32)

def kitchen():
    c = Canvas(32, 32)
    # brick chimney behind the roof + puffs of smoke
    c.rect(22, 4, 25, 11, 'T')
    for y in range(4, 12):
        for x in range(22, 26):
            if (y % 2 == 0 and x == 23) or (y % 2 == 1 and x == 25):
                c.put(x, y, 't')
        c.put(22, y, '^' if y % 2 else 'T')
    c.rect(21, 3, 26, 4, '5'); c.rect(21, 3, 26, 3, '6')
    for (x, y, ch) in ((23, 2, 'W'), (24, 2, 'W'), (24, 1, 'G'), (22, 2, 'G'), (23, 1, 'W'),
                       (25, 1, 'W'), (26, 1, 'G'), (25, 2, 'G'), (26, 2, 'W'), (27, 1, 'G')):
        c.put(x, y, ch)
    # walls: warm cream with timber frame
    c.rect(4, 15, 27, 28, '<')
    for y in range(15, 29):
        c.put(4, y, 'o'); c.put(27, y, 'o'); c.put(15, y, 'o'); c.put(16, y, 'O')
        c.put(26, y, 'p')
    for x in range(4, 28):
        c.put(x, 16, 'o'); c.put(x, 28, 'o')
    for y in range(17, 28):
        c.put(5, y, 'N') if y < 22 else None
    # roof: brown shingles (trapezoid)
    for y in range(5, 16):
        t = (y - 5) / 10
        x0 = int(round(9 - 8 * t)); x1 = int(round(22 + 8 * t))
        for x in range(x0, x1 + 1):
            ch = 'O'
            if y % 2 == 0:
                ch = 'o' if (x + y // 2) % 3 == 0 else 'O'
            else:
                ch = 'p' if (x + y) % 5 == 0 else 'O'
            c.put(x, y, ch)
        c.put(x0, y, 'p'); c.put(x1, y, 'P')
    for x in range(9, 23):
        c.put(x, 5, 'p')
    for x in range(1, 31):
        c.put(x, 15, 'o') if c.get(x, 15) != '.' else None
    # little dormer window in the roof
    c.stamp(["..oo..", ".oNNo.", "oNccNo", "oNAcNo", "oooooo"], 13, 7)
    # big kitchen window with a pie cooling on the sill
    c.rect(6, 18, 13, 24, 'O')
    c.rect(7, 19, 12, 23, 'c')
    c.put(8, 19, 'A'); c.put(9, 20, 'A'); c.put(11, 23, 'h')
    for y in range(19, 24):
        c.put(9, y, 'O'); c.put(10, y, 'O') if y == 21 else None
    for x in range(7, 13):
        c.put(x, 21, 'O')
    # checkered curtains
    for y in range(19, 23):
        c.put(7, y, 'R' if y % 2 else 'H'); c.put(12, y, 'H' if y % 2 else 'R')
    c.rect(5, 24, 14, 25, 'p'); c.rect(5, 25, 14, 25, 'o')
    c.stamp(["..<pp<..", ".p^77^p.", ".oOOOOo."], 6, 22)
    c.put(8, 21, 'W'); c.put(10, 20, 'W')
    # round-top green door
    c.rect(18, 19, 23, 28, 'e')
    c.rect(19, 18, 22, 18, 'e')
    for y in range(19, 29):
        c.put(18, y, 'E'); c.put(23, y, 'F')
    c.put(18, 19, 'o'); c.put(23, 19, 'o'); c.put(19, 18, 'o'); c.put(22, 18, 'o')
    c.put(19, 17, 'o'); c.put(20, 17, 'o'); c.put(21, 17, 'o'); c.put(22, 17, 'o')
    c.rect(19, 20, 22, 21, 'c'); c.put(19, 20, 'A')
    c.put(22, 24, 'Y')
    # hanging sign with a pie + spoon
    for x in range(24, 30):
        c.put(x, 17, 'P')
    c.put(28, 18, 'g'); c.put(25, 18, 'g')
    c.rect(24, 19, 30, 24, 'p')
    for x in range(24, 31):
        c.put(x, 24, 'o')
    for y in range(19, 25):
        c.put(30, y, 'o'); c.put(24, y, '<')
    c.stamp([".^7.", "^777", "OOOO"], 25, 20)
    c.put(29, 20, 'G'); c.put(29, 21, 'g'); c.put(29, 22, 'g'); c.put(29, 23, 'g')
    # flower pot by the door + step
    c.stamp([".iE", "EiY", "TTT", ".t."], 13, 25)
    c.rect(17, 29, 24, 30, '8')
    for x in range(17, 25):
        c.put(x, 30, '6')
    c.rect(3, 29, 16, 29, '6'); c.rect(25, 29, 28, 29, '6')
    for x in range(3, 29):
        if c.get(x, 29) == '6' and x % 4 == 0:
            c.put(x, 29, '5')
    return c.rows()


SPRITES['farm_kitchen'] = {'w': 32, 'rows': kitchen()}


def fair():
    c = Canvas(32, 32)
    peak, eave = 6, 16
    # tent walls with stripes
    for y in range(eave, 29):
        for x in range(4, 28):
            stripe = ((x - 4) // 3) % 2 == 0
            ch = 'R' if stripe else 'H'
            if x >= 24:
                ch = 'r' if stripe else 'G'
            c.put(x, y, ch)
    # entrance: dark opening with tied-back flaps
    for y in range(20, 29):
        half = (y - 20) * 0.45 + 1
        for x in range(int(16 - half), int(16 + half) + 1):
            c.put(x, y, ':' if y > 22 else 'P')
    c.put(12, 23, 'Y'); c.put(19, 23, 'Y')
    # roof cone (stripes radiate from the peak)
    for y in range(peak, eave + 1):
        t = (y - peak) / (eave - peak)
        half = 1 + t * 14
        x0 = int(round(15.5 - half)); x1 = int(round(15.5 + half))
        for x in range(x0, x1 + 1):
            u = (x + 0.5 - 15.5) / max(half, 0.5)
            band = int((u + 1) * 4.5)
            ch = 'R' if band % 2 == 0 else 'H'
            if u > 0.45:
                ch = 'r' if band % 2 == 0 else 'G'
            c.put(x, y, ch)
    # scalloped valance under the eave
    for x in range(1, 31):
        k = (x - 1) % 4
        c.put(x, eave + 1, 'Y' if x < 24 else 'y')
        if k in (1, 2):
            c.put(x, eave + 2, 'Y' if x < 24 else 'y')
    for x in range(1, 31):
        c.put(x, eave, 'u' if x < 24 else 'Y')
    # pole + big pennant on top
    for y in range(1, peak + 1):
        c.put(15, y, 'o'); c.put(16, y, 'O')
    c.stamp(["BBBb", "BBb.", "Bb.."], 17, 1)
    c.put(15, 1, 'Y'); c.put(16, 1, 'Y')
    # bunting flags hanging off the roof
    flags = 'BYfBYf'
    for i, fx in enumerate((5, 8, 11, 20, 23, 26)):
        y = 10 + abs(fx - 15.5) // 5
        col = flags[i]
        y = int(eave - 4 + (abs(fx - 15.5) / 11) * 3)
        c.put(fx, y, col); c.put(fx + 1, y, col); c.put(fx, y + 1, col)
    # ground shadow + grass
    for x in range(3, 29):
        c.put(x, 29, 'o')
    # little star sign over the door
    c.stamp([".u.", "uYu", ".y."], 15, 18)
    return c.rows()


SPRITES['farm_fair'] = {'w': 32, 'rows': fair()}


# ================================================================ orchard (32x32, base at bottom)

def apple_tree(ready):
    c = Canvas(32, 32)
    # mulch ring + trunk
    for x in range(8, 24):
        c.put(x, 29, 'o' if x % 3 else 'O')
        c.put(x, 30, 'P') if 9 < x < 22 else None
    c.rect(14, 19, 17, 29, 'O')
    for y in range(19, 30):
        c.put(14, y, 'p'); c.put(17, y, 'o')
    c.put(15, 24, 'o'); c.put(16, 21, 'o')
    c.stamp(["oO....Oo"], 12, 28)
    # round canopy
    for (cx, cy, rx, ry) in ((16, 12, 11.5, 8.5), (9, 14, 5.5, 5), (23, 14, 5.5, 5),
                             (12, 7, 6, 5), (20, 7, 6, 5)):
        blob(c, cx, cy, rx, ry, ['E', 'E', 'e', 'F'])
    blob(c, 12, 6.5, 3.6, 2.8, ['f', 'f', 'E', 'e'])
    blob(c, 20, 6.5, 3, 2.3, ['f', 'E', 'E', 'e'])
    blob(c, 8, 12, 2.4, 2, ['f', 'E', 'E', 'e'])
    for (x, y, ch) in ((10, 15, 'e'), (14, 12, 'e'), (19, 13, 'e'), (23, 16, 'e'),
                       (16, 9, 'e'), (11, 4, 'J')):
        c.put(x, y, ch)
    for x in range(3, 29):
        for y in range(29, 3, -1):
            if c.get(x, y) in 'EefF':
                if c.get(x, y + 1) not in 'EefF':
                    c.put(x, y, 'F')
                break
    if ready:
        for (ax, ay) in ((8, 10), (13, 14), (20, 9), (24, 14), (11, 18), (18, 17), (16, 5),
                         (6, 15), (22, 19), (15, 10), (26, 10), (10, 6)):
            c.stamp(["qR", "Rr"], ax, ay)
            c.put(ax + 1, ay - 1, 'e')
        c.stamp(["qR", "Rr"], 20, 28)
    return c.rows()


SPRITES['orchard_apple'] = {'w': 32, 'rows': apple_tree(False)}
SPRITES['orchard_apple_ready'] = {'w': 32, 'rows': apple_tree(True)}


def blueberry_bush(ready):
    c = Canvas(32, 32)
    # woody stems at the base
    for (x0, x1) in ((12, 9), (16, 16), (20, 23)):
        c.line(x0, 29, x1, 24, 'o')
    for x in range(6, 26):
        c.put(x, 29, 'O' if x % 2 else 'o')
    # low wide leafy mound (cool blue-green)
    for (cx, cy, rx, ry) in ((16, 21, 13, 6.5), (9, 19, 6.5, 5), (23, 19, 6.5, 5),
                             (16, 16, 8, 5)):
        blob(c, cx, cy, rx, ry, ['Z', '9', '9', 'X'])
    blob(c, 13, 14.5, 3.8, 2.4, ['E', 'Z', 'Z', '9'])
    blob(c, 7, 18, 2.5, 2, ['E', 'Z', 'Z', '9'])
    blob(c, 22, 16, 2.6, 2, ['E', 'Z', 'Z', '9'])
    rng = random.Random(9)
    for _ in range(22):
        x, y = rng.randrange(4, 28), rng.randrange(13, 27)
        if c.get(x, y) in '9Z':
            c.put(x, y, 'X' if rng.random() < 0.6 else 'Z')
    for x in range(2, 30):
        for y in range(29, 8, -1):
            if c.get(x, y) in 'Z9XE':
                if c.get(x, y + 1) not in 'Z9XE':
                    c.put(x, y, 'X')
                break
    if ready:
        for (x, y) in ((6, 17), (10, 15), (14, 18), (18, 14), (21, 18), (25, 19), (8, 21),
                       (12, 22), (17, 21), (22, 23), (26, 22), (15, 12), (4, 20), (19, 24)):
            berry(c, x, y, ('c', 'B', 'b'), 'C')
    else:
        for (x, y) in ((8, 17), (15, 13), (21, 19), (12, 21), (24, 17), (18, 23)):
            c.put(x, y, 'H'); c.put(x + 1, y, 'N')
    return c.rows()


SPRITES['orchard_blueberry'] = {'w': 32, 'rows': blueberry_bush(False)}
SPRITES['orchard_blueberry_ready'] = {'w': 32, 'rows': blueberry_bush(True)}


def maple_tree(ready):
    c = Canvas(32, 32)
    leaf = ['^', '7', 'T', 't'] if ready else ['E', 'E', 'e', 'F']
    lite = ['Y', '^', '7', 'T'] if ready else ['f', 'f', 'E', 'e']
    for x in range(10, 22):
        c.put(x, 30, '%' if x % 3 else '#')
    c.rect(13, 16, 18, 29, 'O')
    for y in range(16, 30):
        c.put(13, y, 'p'); c.put(18, y, 'o'); c.put(16, y, 'o' if y % 4 == 1 else 'O')
    c.stamp(["oO......Oo", "PoO....OoP"], 11, 28)
    # branches peek into the canopy
    c.line(15, 17, 10, 12, 'o'); c.line(16, 17, 22, 11, 'o')
    # pointy-ish maple canopy built from lobes
    for (cx, cy, rx, ry) in ((16, 10, 12, 7.5), (7, 12, 5.5, 4.5), (25, 12, 5.5, 4.5),
                             (16, 4.5, 6, 4), (10, 7, 5, 4), (22, 7, 5, 4)):
        blob(c, cx, cy, rx, ry, leaf)
    blob(c, 12, 5.5, 3.4, 2.4, lite)
    blob(c, 20, 4.5, 3, 2.2, lite)
    blob(c, 6, 10.5, 2.4, 1.8, lite)
    for x in range(1, 31):
        for y in range(29, 1, -1):
            if c.get(x, y) in ''.join(leaf + lite):
                if c.get(x, y + 1) not in ''.join(leaf + lite):
                    c.put(x, y, leaf[3])
                break
    if ready:
        for (x, y) in ((9, 8), (18, 6), (23, 12), (13, 13), (5, 13), (27, 9)):
            c.put(x, y, 'R'); c.put(x + 1, y, 'r')
        # falling leaves
        for (x, y, ch) in ((5, 22, '7'), (6, 23, '^'), (26, 20, 'R'), (27, 21, 'r'), (24, 27, '7')):
            c.put(x, y, ch)
    # sap spout + bucket hung on the trunk
    c.put(16, 20, 'G'); c.put(17, 20, 'g')
    c.rect(16, 22, 20, 26, 'G')
    for y in range(22, 27):
        c.put(16, y, 'W'); c.put(20, y, 'g')
    for x in range(15, 22):
        c.put(x, 21, 'n')
    for x in range(16, 21):
        c.put(x, 24, 'g')
    if ready:
        c.put(17, 21, 'y'); c.put(18, 21, 'Y'); c.put(19, 21, 'y')
        c.put(17, 20, 'Y')  # drip at the spout
    return c.rows()


SPRITES['orchard_maple'] = {'w': 32, 'rows': maple_tree(False)}
SPRITES['orchard_maple_ready'] = {'w': 32, 'rows': maple_tree(True)}


def cranberry_bog(ready):
    c = Canvas(32, 32)
    x0, x1, y0, y1 = 2, 29, 13, 28
    # earthen dike all round (top lip lighter, front face darker)
    c.rect(x0, y0, x1, y1, 'O')
    for x in range(x0, x1 + 1):
        c.put(x, y0, 'p'); c.put(x, y1, 'o'); c.put(x, y1 - 1, 'o' if x % 3 else 'O')
    for y in range(y0, y1 + 1):
        c.put(x0, y, 'p'); c.put(x1, y, 'o')
    # inside bed
    ix0, ix1, iy0, iy1 = x0 + 2, x1 - 2, y0 + 2, y1 - 3
    rng = random.Random(21)
    for y in range(iy0, iy1 + 1):
        for x in range(ix0, ix1 + 1):
            if ready:
                ch = 'h' if (x + y * 3) % 9 else 'a'
                if y == iy0:
                    ch = ';'
            else:
                ch = 'e' if (x * 7 + y * 3) % 5 else 'F'
                if rng.random() < 0.12:
                    ch = 'E'
                if y == iy0:
                    ch = 'F'
            c.put(x, y, ch)
    if ready:
        # ripples
        for (x, y) in ((6, 18), (7, 18), (21, 21), (22, 21), (13, 23), (25, 17)):
            c.put(x, y, 'A')
        # floating berries crowded together
        for y in range(iy0 + 1, iy1, 2):
            for x in range(ix0 + (y // 2) % 2, ix1, 2):
                d = min(x - ix0, ix1 - x, y - iy0, iy1 - y)
                if rng.random() < (0.97 if d > 2 else 0.6):
                    c.stamp(["qR", "Rr"], x, y)
    else:
        # a few tiny pink blossoms and sprigs
        for (x, y) in ((7, 18), (15, 20), (22, 17), (11, 23), (24, 22)):
            c.put(x, y, 'i')
        for (x, y) in ((9, 16), (18, 22), (25, 19), (13, 18)):
            c.put(x, y, 'f')
    # wooden boards on the wall + little sign post
    for x in (8, 16, 24):
        c.put(x, y1 - 1, 'P')
    c.rect(25, 7, 29, 10, 'p')
    for x in range(25, 30):
        c.put(x, 10, 'o')
    c.put(27, 8, 'R'); c.put(26, 9, 'R'); c.put(28, 9, 'r')
    c.put(27, 11, 'O'); c.put(27, 12, 'O')
    return c.rows()


SPRITES['orchard_cranberry'] = {'w': 32, 'rows': cranberry_bog(False)}
SPRITES['orchard_cranberry_ready'] = {'w': 32, 'rows': cranberry_bog(True)}


def beehive(ready):
    c = Canvas(32, 32)
    # stand
    c.rect(8, 25, 23, 26, 'O')
    for x in range(8, 24):
        c.put(x, 25, 'p')
    for lx in (9, 21):
        c.rect(lx, 27, lx + 1, 29, 'o'); c.put(lx, 27, 'O')
    for x in range(6, 26):
        c.put(x, 30, '%' if x % 3 else '#')
    # two stacked white boxes
    for (by0, by1) in ((16, 24), (8, 15)):
        c.rect(9, by0, 22, by1, 'W')
        for y in range(by0, by1 + 1):
            c.put(9, y, 'H'); c.put(22, y, 'G'); c.put(21, y, 'G')
        for x in range(9, 23):
            c.put(x, by1, 'G')
        # hand-hold slot
        c.rect(14, by0 + 3, 17, by0 + 3, 'g')
        c.rect(14, by0 + 2, 17, by0 + 2, 'G')
    # entrance slit
    c.rect(13, 23, 18, 23, 'P')
    # lid with overhang
    c.rect(7, 5, 24, 7, 'g')
    for x in range(7, 25):
        c.put(x, 5, 'G'); c.put(x, 7, 'n')
    c.rect(9, 4, 22, 4, 'G')
    if ready:
        # honey oozing at the seam and under the entrance
        for (x, y0, n) in ((10, 15, 3), (13, 15, 2), (19, 15, 4), (15, 24, 2), (12, 7, 2)):
            for k in range(n):
                c.put(x, y0 + k, 'Y')
            c.put(x, y0 + n, 'y')
            c.put(x + 1, y0, 'Y')
        c.put(11, 15, 'u')
        # bees
        for (bx, by) in ((4, 9), (26, 14), (25, 2)):
            c.stamp([".A.", "YKY"], bx, by)
    return c.rows()


SPRITES['orchard_beehive'] = {'w': 32, 'rows': beehive(False)}
SPRITES['orchard_beehive_ready'] = {'w': 32, 'rows': beehive(True)}


def plot():
    c = Canvas(32, 32)
    blob(c, 15.5, 24, 11, 5, ['p', 'O', 'O', 'o'])
    blob(c, 15.5, 24, 6.5, 2.6, ['o', 'o', 'P', 'P'])
    for (x, y) in ((8, 21), (22, 22), (12, 27), (19, 27)):
        c.put(x, y, 'p')
    # little stake sign
    c.rect(24, 13, 25, 23, 'O')
    for y in range(13, 24):
        c.put(24, y, 'p')
    c.rect(21, 11, 28, 16, 'p')
    for x in range(21, 29):
        c.put(x, 16, 'o'); c.put(x, 11, '<')
    c.put(28, 12, 'o'); c.put(28, 13, 'o'); c.put(28, 14, 'o'); c.put(28, 15, 'o')
    c.stamp([".f.", "fEe", ".e."], 23, 12)
    return c.rows()


SPRITES['orchard_plot'] = {'w': 32, 'rows': plot()}


# ================================================================ awards

def ribbon(cols):
    l, m, d = cols
    c = Canvas(12, 16)
    # two tails with V-notched ends
    for y in range(8, 15):
        k = y - 8
        for x in (4 - k // 2, 5 - k // 2):
            c.put(x, y, m if x == 5 - k // 2 else l)
        for x in (6 + k // 2, 7 + k // 2):
            c.put(x, y, d if x == 7 + k // 2 else m)
    c.put(1, 14, '.'); c.put(9, 14, '.')
    # ruffled rosette
    for y in range(0, 12):
        for x in range(0, 12):
            dx, dy = x + 0.5 - 6, y + 0.5 - 5.5
            r = math.hypot(dx, dy)
            a = math.atan2(dy, dx)
            edge = 4.6 + 0.6 * math.cos(a * 8)
            if r <= edge:
                ch = l if (dx + dy) < -1 else (d if (dx + dy) > 2.5 else m)
                if int((a + math.pi) / (2 * math.pi) * 16) % 2 and r > 3:
                    ch = {l: m, m: d, d: d}[ch]
                c.put(x, y, ch)
    blob(c, 6, 5.5, 2.4, 2.4, ['u', 'Y', 'y', 'U'])
    c.put(5, 4, 'H')
    return c.rows()


SPRITES['ribbon_blue'] = {'w': 12, 'rows': ribbon(('c', 'B', 'b'))}
SPRITES['ribbon_red'] = {'w': 12, 'rows': ribbon(('q', 'R', 'r'))}

SPRITES['trophy_gold'] = grid([
    "................",
    "...uYYYYYYYy....",
    ".yyuYYYYYYYyyy..",
    ".y.uHYYYYYYy.y..",
    ".y.uHYYYYYYy.y..",
    "..yuYYYYYYyyy...",
    "....uYYYYYy.....",
    ".....uYYyy......",
    "......uYy.......",
    "......uYy.......",
    ".....uYYyy......",
    "....oOOOOOo.....",
    "....OuYYYyO.....",
    "...ooooooooo....",
    "................",
    "................",
])

SPRITES['farm_journal'] = grid([
    "................",
    "..pppppppppp....",
    "..PpOOOOOOOOoN..",
    "..PoOOOOOOOOoN..",
    "..PoOOOOOOEOoN..",
    "..PoOOOOOfEOoN..",
    "..PoOOOOfEEOoN..",
    "..PoOOOfEEeOoN..",
    "..PoOOOEEeOOoN..",
    "..PoOOoeOOOOoN..",
    "..PoOoOOOOOOoN..",
    "..PoOOOOOOOOom..",
    "..PoOOOOOOOOom..",
    "..PoooooRRooom..",
    "........Rr......",
    "................",
])


# --- Pony ride: galloping horse frames (same head as animal_horse), hat, flag ---
_HORSE_TOP = [
    "....................",
    "..............o.o...",
    ".............PoOoO..",
    "............PPOOOOO.",
    "...........PPOOOHkO.",
    "...........PPOOOkkO.",
    ".....r....PPOOOOOpp.",
    ".....RRRq.PPOOOOpoo.",
    "..P..cBBbPPOOOO.....",
    ".PPPOcBBbOOOOOOO....",
    ".PPOOubbuOOOOOOO....",
    "..P.OOOOOOOOOOOo....",
]

SPRITES['animal_horse_run1'] = {'w': 20, 'rows': grid(_HORSE_TOP + [
    "...oOOOOOOOOOOOoO...",
    "..oO............oO..",
    ".PP..............PP.",
    "....................",
], 20)}

SPRITES['animal_horse_run2'] = {'w': 20, 'rows': grid(_HORSE_TOP + [
    "....oOOOOOOOOOOo....",
    ".....Oo.....oO......",
    ".......PP.PP........",
    "....................",
], 20)}

SPRITES['hat_cowboy'] = {'w': 12, 'rows': grid([
    "............",
    "....pOOo....",
    "...pOoOOo...",
    ".p.pOOOOo.o.",
    ".p.PPYPPP.o.",
    ".ppOOOOOOoo.",
    "..oooooooo..",
    "............",
], 12)}

SPRITES['ride_flag'] = grid([
    "................",
    "..uY............",
    "..GgHHKKHHKKHH..",
    "..GgHHKKHHKKHH..",
    "..GgKKHHKKHHKK..",
    "..GgKKHHKKHHKK..",
    "..GgHHKKHHKKHH..",
    "..GgHHKKHHKKHH..",
    "..GgKKHHKKHHKK..",
    "..GgKKHHKKHHKK..",
    "..Gg............",
    "..Gg............",
    "..Gg............",
    "..Gg............",
    ".nggn...........",
    "................",
])
