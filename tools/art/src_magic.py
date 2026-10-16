"""Magic World: dreamy tiles, buildings, magic crops + items, magic animals and neighbours."""
import random, math
from draw import Canvas
SPRITES = {}

# pastel ramps (light -> dark)
LAV = ['(', ')', '[', ']']        # lavender
MINT = ['-', '/', '_', '`']       # mint / teal
PINK = ['$', '?', '>', 'I']       # candy pink
NIGHT = ['}', '|', ',']           # indigo night
GOLD = ['u', 'Y', 'y', 'U']


def grid(rows, w=16):
    for i, r in enumerate(rows):
        if len(r) != w:
            raise SystemExit(f'src_magic: row {i} has len {len(r)} (want {w}): {r!r}')
    return rows


def tile(g):
    return {'outline': False, 'rows': [''.join(r) for r in g]}


def wput(g, x, y, ch):
    g[y % 16][x % 16] = ch


def star5(c, x, y, fill='Y', hi='u', lo='y'):
    """5x5 five-point star with top-left at (x, y)."""
    c.stamp(["..u..",
             ".uYY.",
             "uYYYy",
             ".YYy.",
             ".y.y."], x, y)
    if fill != 'Y':
        for yy in range(5):
            for xx in range(5):
                v = c.get(x + xx, y + yy)
                c.put(x + xx, y + yy, {'u': hi, 'Y': fill, 'y': lo}.get(v, v))


# ================================================================ tiles

def magic_grass():
    rng = random.Random(21)
    g = [['_'] * 16 for _ in range(16)]
    # soft mottling
    for _ in range(10):
        wput(g, rng.randrange(16), rng.randrange(16), rng.choice('/`'))
    # grass blade tufts: lit tip over a darker root
    for (x, y) in ((2, 2), (9, 1), (13, 6), (5, 8), (11, 11), (1, 13), (7, 14)):
        wput(g, x, y, '/'); wput(g, x + 2, y, '/')
        wput(g, x + 1, y + 1, '/')
        wput(g, x, y + 1, '`'); wput(g, x + 2, y + 1, '`')
    # lavender clover patches
    for (x, y) in ((12, 2), (3, 11)):
        wput(g, x, y, ')'); wput(g, x + 1, y, ')'); wput(g, x, y + 1, '['); wput(g, x + 1, y + 1, ']')
        wput(g, x + 1, y - 1, '(')
    # tiny flowers + sparkles
    for (x, y, ch) in ((6, 4, '?'), (14, 13, '?'), (0, 6, '*'), (9, 11, '*')):
        wput(g, x, y, ch)
    wput(g, 6, 5, '>'); wput(g, 14, 14, '>')
    return g


SPRITES['tile_magic_grass'] = tile(magic_grass())


def magic_soil():
    rng = random.Random(5)
    band = ['[', ']', '}', '|']
    g = [[band[y % 4] for x in range(16)] for y in range(16)]
    for _ in range(18):
        x, y = rng.randrange(16), rng.randrange(16)
        b = y % 4
        if b == 0:
            g[y][x] = ']'
        elif b == 1:
            g[y][x] = rng.choice('[}')
        elif b == 2:
            g[y][x] = ']'
    # glowing star specks
    for (x, y, ch) in ((3, 1, '*'), (11, 5, '{'), (7, 9, 'u'), (14, 12, '*'), (1, 13, '{')):
        g[y][x] = ch
    g[0][12] = '('
    return g


SPRITES['magic_soil'] = tile(magic_soil())


def magic_path():
    g = [['<'] * 16 for _ in range(16)]
    widths = ((0, (6, 5, 5)), (3, (5, 6, 5)), (0, (5, 5, 6)), (3, (6, 5, 5)))
    for row, (off, ws) in enumerate(widths):
        y0 = row * 4
        x = off
        for k, w in enumerate(ws):
            body = '?' if (row, k) == (2, 1) else '$'
            for yy in range(3):
                for xx in range(w - 1):
                    ch = body
                    if yy == 0:
                        ch = '(' if body == '$' else '$'
                    if yy == 2 or xx == w - 2:
                        ch = '?' if body == '$' else '>'
                    if yy == 0 and xx == w - 2:
                        ch = body
                    wput(g, x + xx, y0 + yy, ch)
            # round the stone corners into the grout
            wput(g, x, y0, '<'); wput(g, x + w - 2, y0 + 2, '<')
            x += w
    # little gold glints in the grout
    for (x, y) in ((5, 3), (13, 7), (2, 11), (10, 15)):
        wput(g, x, y, 'u')
    return g


SPRITES['magic_path'] = tile(magic_path())


def magic_floor():
    rng = random.Random(9)
    g = [['['] * 16 for _ in range(16)]
    for _ in range(14):
        wput(g, rng.randrange(16), rng.randrange(16), ')')
    # fluffy cloud puffs (wrap around the edges)
    puff = ["..((((..",
            ".((((((.",
            "(((((()).",
            ")))))))]"]
    for (px, py) in ((1, 1), (9, 8)):
        for yy, r in enumerate(puff):
            for xx, ch in enumerate(r):
                if ch != '.':
                    wput(g, px + xx, py + yy, ch)
    # twinkly stars
    for (x, y) in ((12, 2), (4, 11), (14, 14)):
        wput(g, x, y, 'u'); wput(g, x - 1, y, 'Y'); wput(g, x + 1, y, 'Y')
        wput(g, x, y - 1, 'Y'); wput(g, x, y + 1, 'Y')
    for (x, y) in ((7, 6), (1, 7), (10, 13), (15, 5)):
        wput(g, x, y, '*')
    return g


SPRITES['magic_floor'] = tile(magic_floor())

SPRITES['magic_fence'] = {'outline': False, 'rows': grid([
    "a..............A",
    "hG............AW",
    "GgG..........WGW",
    "Ggn..........WGW",
    "Ggn..........WGW",
    "GgAAAAAAAAAAAWGW",
    "g{aaa{aaaa{aaagg",
    "nhhhhhhhhhhhhhgn",
    "Ggn..........WGW",
    "Ggn..........WGW",
    "GgAAAAAAAAAAAWGW",
    "g{aaa{aaaa{aaagg",
    "nhhhhhhhhhhhhhgn",
    "Ggn..........WGW",
    "ggn..........gGg",
    "nnn..........nnn",
])}

SPRITES['magic_fence_v'] = {'outline': False, 'rows': grid([
    "......Wg........",
    "......Wg........",
    "......Wg........",
    "......aA........",
    ".....AaaA.......",
    ".....WGGgn......",
    ".....WGGgn......",
    ".....WGagn......",
    ".....WGGgn......",
    ".....WGGgn......",
    ".....WGagn......",
    ".....WGGgn......",
    ".....ggnnn......",
    "......Wg........",
    "......Wg........",
    "......Wg........",
])}


# ================================================================ buildings

def magic_house():
    c = Canvas(32, 32)
    # crystal spire chimney (behind roof)
    c.rect(22, 3, 24, 10, '/')
    for y in range(3, 11):
        c.put(22, y, '-'); c.put(24, y, '_')
    c.put(23, 2, '-'); c.put(23, 1, 'A'); c.put(23, 0, '*')
    # walls: pale crystal blocks
    c.rect(4, 15, 27, 28, '(')
    for y in range(15, 29):
        c.put(27, y, ')'); c.put(26, y, ')' if y % 3 == 0 else '(')
    for y in (18, 22, 26):
        for x in range(4, 27):
            c.put(x, y, ')')
    for y in range(15, 29):
        off = 0 if (y // 4) % 2 else 3
        for x in range(4 + off, 27, 6):
            if c.get(x, y) == '(':
                c.put(x, y, ')')
    for (x, y) in ((6, 16), (20, 20), (10, 24), (24, 17)):
        c.put(x, y, '{')
    # base stones
    c.rect(3, 28, 28, 29, '[')
    for x in range(3, 29):
        c.put(x, 29, ']')
        if x % 4 == 1:
            c.put(x, 28, ']')
    # faceted pink gem roof
    for y in range(3, 15):
        half = 2 + (y - 3) * 1.25
        x0 = max(int(round(15.5 - half)), 1); x1 = min(int(round(15.5 + half)), 30)
        for x in range(x0, x1 + 1):
            d = x - 15.5
            ch = '?' if d < 0 else '>'
            if abs(abs(d) - (y - 3) * 0.6) < 0.6:
                ch = '$' if d < 0 else 'I'
            c.put(x, y, ch)
        c.put(x0, y, '$'); c.put(x1, y, 'I')
    c.put(15, 2, '$'); c.put(16, 2, '?')
    # gem finial star on top
    c.stamp(["..u..", ".uYy.", "..y.."], 13, 0)
    for x in range(4, 28):
        c.put(x, 15, ']')
    # round star window in the gable
    c.stamp([".[[[[[.",
             "[}}u}}[",
             "[}uYy}[",
             "[uYYYy[",
             "[}Y}y}[",
             ".[[[[[."], 13, 7)
    # glowing arched windows with flower boxes
    for wx in (6, 21):
        c.rect(wx, 18, wx + 4, 23, ']')
        c.rect(wx + 1, 19, wx + 3, 22, 'u')
        c.put(wx, 18, '.'); c.put(wx + 4, 18, '.')
        c.put(wx + 1, 18, ']'); c.put(wx + 3, 18, ']')
        c.put(wx + 2, 18, ']')
        c.put(wx + 3, 21, 'Y'); c.put(wx + 3, 22, 'Y'); c.put(wx + 2, 22, 'Y')
        c.put(wx + 2, 19, ']'); c.put(wx + 2, 20, ']'); c.put(wx + 2, 21, ']'); c.put(wx + 1, 20, ']'); c.put(wx + 3, 20, ']')
        c.rect(wx - 1, 24, wx + 5, 25, '_')
        for x in range(wx - 1, wx + 6):
            c.put(x, 25, '`')
        for k, x in enumerate(range(wx - 1, wx + 6)):
            c.put(x, 23 if k % 2 == 0 else 24, '/' if k % 2 else ('?' if k % 4 == 0 else 'a'))
    # teal round-top door
    c.rect(13, 19, 18, 28, '_')
    c.put(13, 19, '.'); c.put(18, 19, '.')
    for y in range(20, 29):
        c.put(13, y, '`'); c.put(18, y, '`'); c.put(14, y, '/')
    for x in range(14, 18):
        c.put(x, 19, '`')
    c.put(17, 24, 'Y')
    star = ["..u..", ".uYy.", "..y.."]
    c.stamp(star, 13, 20)
    c.rect(12, 29, 19, 30, ')')
    for x in range(12, 20):
        c.put(x, 30, '[')
    # sparkles in the air
    for (x, y, ch) in ((3, 8, '*'), (28, 6, 'A'), (1, 20, '*'), (30, 13, '*')):
        c.put(x, y, ch)
    return c.rows()


SPRITES['magic_house'] = {'w': 32, 'rows': magic_house()}


def magic_barn():
    c = Canvas(32, 32)
    # little tower with a spire, behind the roof
    c.rect(13, 6, 18, 12, ')')
    for y in range(6, 13):
        c.put(13, y, '('); c.put(18, y, '[')
    c.stamp([".uu.", "uYYy", "uYYy"], 14, 8)
    for y in range(1, 6):
        half = (y - 0.5) * 0.75
        for x in range(int(round(15.5 - half - 0.5)), int(round(15.5 + half + 0.5)) + 1):
            c.put(x, y, '}' if x < 16 else '|')
    c.rect(12, 5, 19, 5, '|')
    for x in range(12, 16):
        c.put(x, 5, '}')
    c.put(15, 0, 'u'); c.put(16, 0, 'Y')
    # gambrel barn body
    top = 9
    halves = {0: 5, 1: 8, 2: 10, 3: 12, 4: 13, 5: 13.5, 6: 14, 7: 14}
    for y in range(top, 30):
        h = halves.get(y - top, 14)
        x0 = int(round(15.5 - h)); x1 = int(round(15.5 + h))
        for x in range(x0, x1 + 1):
            c.put(x, y, ')')
            if (x - 2) % 3 == 0 and y > top:
                c.put(x, y, '[')
        c.put(x1, y, '['); c.put(x1 - 1, y, '[')
        c.put(x0, y, '(')
    # roof trim
    prev = None
    for y in range(top - 1, top + 8):
        h = halves.get(y + 1 - top, 14)
        x0 = int(round(15.5 - h)); x1 = int(round(15.5 + h))
        if y == top - 1:
            x0, x1 = 10, 21
        c.put(x0, y, 'u'); c.put(x1, y, 'u')
        c.put(x0 - 1, y, '}'); c.put(x1 + 1, y, '}')
        if prev:
            for x in range(min(x0, prev[0]), max(x0, prev[0]) + 1):
                c.put(x, y, 'u')
                if x < prev[0]:
                    c.put(x, y - 1, '}')
            for x in range(min(x1, prev[1]), max(x1, prev[1]) + 1):
                c.put(x, y, 'u')
                if x > prev[1]:
                    c.put(x, y - 1, '}')
        prev = (x0, x1)
    for x in range(10, 22):
        c.put(x, top - 1, 'u'); c.put(x, top - 2, '}')
    for y in range(top + 8, 30):
        c.put(1, y, 'u'); c.put(30, y, 'y')
    # moon window
    c.rect(13, 11, 18, 15, '|')
    c.stamp(["..uu", ".u..", ".u..", "..uu"], 14, 11)
    c.put(17, 14, '*')
    c.rect(12, 16, 19, 16, 'y')
    # big doors with gold stars
    c.rect(7, 18, 24, 29, 'Y')
    for (dx0, dx1) in ((8, 15), (16, 23)):
        c.rect(dx0, 19, dx1, 28, ']')
        for x in range(dx0, dx1 + 1):
            if x % 2 == 0:
                for y in range(19, 29):
                    c.put(x, y, '}')
        c.stamp(["...u...",
                 "..uYY..",
                 "uuYYYYy",
                 ".YYYYy.",
                 ".YYyYy.",
                 "yy...yy"], dx0 + 1, 21)
    for y in range(19, 29):
        c.put(15, y, 'y'); c.put(16, y, 'u')
    c.rect(7, 29, 24, 29, 'y')
    for x in range(1, 31):
        c.put(x, 30, ']')
    for (x, y, ch) in ((4, 4, '*'), (27, 3, 'A'), (24, 6, '*'), (8, 1, 'u')):
        c.put(x, y, ch)
    return c.rows()


SPRITES['magic_barn'] = {'w': 32, 'rows': magic_barn()}


def magic_market():
    c = Canvas(32, 24)
    # back wall
    c.rect(4, 8, 27, 15, '|')
    for x in range(4, 28):
        if x % 4 == 0:
            for y in range(8, 15):
                c.put(x, y, ',')
    c.rect(5, 10, 26, 10, ']')
    for x in (7, 11, 20, 24):
        c.put(x, 9, 'a'); c.put(x + 1, 9, '?')
    # mushroom stem posts
    for px in (3, 27):
        c.rect(px, 7, px + 1, 22, 'm')
        for y in range(7, 23):
            c.put(px, y, 'N')
    # big spotted mushroom cap
    for y in range(0, 9):
        for x in range(0, 32):
            dx = (x + 0.5 - 16) / 15.6; dy = (y + 0.5 - 8.2) / 8.0
            if dy <= 0.12 and dx * dx + dy * dy <= 1.0:
                d = dx * dx + dy * dy
                ch = '>' if (dx * 0.6 + dy * 0.8) < 0.1 else 'I'
                if d < 0.5 and dx < 0.2:
                    ch = '?'
                c.put(x, y, ch)
    for x in range(1, 31):
        c.put(x, 8, '$' if x % 2 else '(')
        c.put(x, 7, 'I' if c.get(x, 7) != '.' else '.')
    for (sx, sy, big) in ((6, 4, True), (14, 1, True), (23, 3, True), (19, 6, False), (10, 6, False), (28, 6, False)):
        if big:
            c.stamp([".HH.", "HHHW", ".WW."], sx, sy)
        else:
            c.stamp(["HW"], sx, sy)
    # counter
    c.rect(2, 15, 29, 22, ']')
    for x in range(2, 30):
        c.put(x, 15, ')'); c.put(x, 16, ')'); c.put(x, 17, '}')
    for y in (19, 21):
        for x in range(3, 29):
            c.put(x, y, '}')
    for x in range(2, 30, 7):
        for y in range(18, 23):
            c.put(x, y, '}')
    c.rect(13, 18, 18, 21, '(')
    c.stamp(["..u.", ".uYy", "..y."], 14, 18)
    # glowing magic fruit on the counter
    c.stamp(["..u..", ".uYY.", "uYYYy", ".y.y."], 4, 11)        # starfruit
    c.stamp([".{{.", "{(c{", "{cch", ".hh."], 9, 11)            # moonmelon
    c.put(10, 12, 'u')
    c.stamp(["A.A", "aAa", ".h."], 14, 12)                      # crystalberries
    c.stamp(["..E.E", ".RR7.", "R77Y.", "7YE..", "EB..."], 18, 10)  # rainbow carrot
    c.stamp(["..e.", ".RR.", "qRRr", ".R7.", "..Y."], 24, 10)   # dragon pepper
    return c.rows()


SPRITES['magic_market'] = {'w': 32, 'rows': magic_market()}


def magic_tree():
    c = Canvas(32, 32)
    c.rect(13, 19, 18, 29, ']')
    for y in range(19, 30):
        c.put(13, y, '['); c.put(18, y, '}'); c.put(17, y, '}' if y % 3 else ']')
    c.stamp(["]]......]}", "}]]....]}|"], 11, 28)
    c.put(15, 24, '}'); c.put(16, 22, '}')
    for x in range(9, 23):
        c.put(x, 30, '_' if x % 3 else '/')
    for (cx, cy, rx, ry) in ((16, 12, 13.6, 8.8), (8, 13, 6.4, 6), (24, 13, 6.4, 6),
                             (11, 7, 7, 5.6), (21, 7, 7, 5.6), (16, 17, 9, 4)):
        c.ellipse(cx, cy, rx, ry, ['?', '?', '>', 'I'])
    # teal clumps for a two-tone dreamy canopy
    c.ellipse(23, 14, 5, 4.2, ['-', '/', '_', '`'])
    c.ellipse(8, 9, 4, 3.4, ['-', '/', '_', '`'])
    c.ellipse(11, 6.5, 4, 3.2, ['$', '$', '?', '>'])
    c.ellipse(21, 6, 3.4, 2.6, ['$', '?', '?', '>'])
    for x in range(2, 30):
        for y in range(29, 5, -1):
            if c.get(x, y) in '$?>I-/_`':
                if c.get(x, y + 1) not in '$?>I-/_`':
                    c.put(x, y, 'I' if c.get(x, y) in '$?>I' else '`')
                break
    # little glowing lights
    for (ax, ay) in ((8, 13), (14, 14), (20, 10), (25, 17), (11, 18), (19, 17), (16, 5), (5, 10), (26, 9)):
        c.put(ax, ay, 'u'); c.put(ax + 1, ay, 'Y'); c.put(ax, ay + 1, 'Y'); c.put(ax + 1, ay + 1, 'y')
    for (x, y, ch) in ((10, 4, '*'), (13, 9, 'A'), (22, 13, 'A'), (3, 3, '*'), (29, 4, 'A'), (1, 18, '*')):
        c.put(x, y, ch)
    return c.rows()


SPRITES['magic_tree'] = {'w': 32, 'rows': magic_tree()}


def magic_board():
    c = Canvas(28, 24)
    for px in (4, 21):
        c.rect(px, 3, px + 2, 22, ']')
        for y in range(3, 23):
            c.put(px, y, '['); c.put(px + 2, y, '}')
    # crystal roof plank with gem
    c.rect(1, 1, 26, 2, '/')
    for x in range(1, 27):
        c.put(x, 1, '-'); c.put(x, 2, '_' if x % 4 == 0 else '/')
    c.stamp([".A.", "AaA", ".h."], 12, 0)
    c.put(13, 0, 'A')
    # crystal panel
    c.rect(2, 4, 25, 16, '(')
    for y in range(4, 17):
        c.put(2, y, 'W'); c.put(25, y, ')')
    for x in range(2, 26):
        c.put(x, 16, ')'); c.put(x, 4, 'W')
    for (x, y) in ((3, 15), (4, 14), (22, 6), (23, 5)):
        c.put(x, y, '{')
    # three glowing notes
    notes = ((4, 5, 'u', 'Y'), (11, 6, '$', '>'), (18, 5, '-', '_'))
    for (nx, ny, paper, ink) in notes:
        c.rect(nx - 1, ny - 1, nx + 6, ny + 8, '*')
        c.rect(nx, ny, nx + 5, ny + 7, paper)
        for y in range(ny, ny + 8):
            c.put(nx + 5, y, ink)
        for x in range(nx, nx + 6):
            c.put(x, ny + 7, ink)
        for ly in (ny + 3, ny + 5):
            for x in range(nx + 1, nx + 4):
                c.put(x, ly, ink)
        c.put(nx + 2, ny + 1, 'Y'); c.put(nx + 3, ny + 1, 'y'); c.put(nx + 2, ny, 'u')
    for (x, y, ch) in ((3, 22, '_'), (7, 22, '_'), (20, 22, '_'), (24, 22, '_'), (3, 21, '/'), (24, 21, '/')):
        c.put(x, y, ch)
    return c.rows()


SPRITES['magic_board'] = {'w': 28, 'rows': magic_board()}


# ================================================================ magic crops (16x16)

MOUND = [
    ".....[[)[[......",
    "....[]]]]]][....",
    "...}]]]]]]]]}...",
]


def crop(top):
    """top: 13 rows of plant; the magic soil mound fills the bottom."""
    rows = list(top) + [
        "....[[]]]][[....",
        "...}]]]]]]]]}...",
        "................",
    ]
    return grid(rows)


SPRITES['magic_sprout'] = crop([
    "................",
    "................",
    "...........*....",
    "....*...........",
    "................",
    "...---...---....",
    "..-////./////-..",
    "...`////////`...",
    "......`/`.....*.",
    ".......{........",
    ".......{........",
    "*......_........",
    "......._........",
])

SPRITES['crop_starfruit'] = grid([
    "................",
    "...u............",
    "..uYY...........",
    ".uYYYy....u.....",
    "..YYy....uYY....",
    "..y.y...uYYYy...",
    "...`/....YYy....",
    "..-/`/...y.y....",
    ".-//_`/._/......",
    "..`_//`/_//-....",
    "...`_/_//__/-...",
    "....`_/__`_``...",
    "......`__`......",
    "....[[]]]][[....",
    "...}]]]]]]]]}...",
    "................",
])

SPRITES['crop_moonmelon'] = crop([
    "................",
    "................",
    "................",
    "...--.....--....",
    "..-//-...-//-...",
    "..`//_/./__/`...",
    "...``_/_/_``....",
    ".......{{{{.....",
    ".....{{AA{{c....",
    "....{Au{{{{cc...",
    "....{u{{{{ccch..",
    "....{cu{{cccch..",
    ".....cchhhhhh...",
])

SPRITES['crop_rainbowcarrot'] = crop([
    "................",
    "....-.....-.....",
    "...-/-.-.-/-....",
    "..-//_-/-//_.-..",
    "..`/-/_/_/-_./_.",
    "...`/-//-/_.-/_.",
    "..-.`////_-/_`..",
    ".-/-.`/_/_//_...",
    ".`//_.`/_/__....",
    "..``//_//_`/-...",
    "....``//////`...",
    "...qRRq7^7uYY...",
    "..qRRR777YYYEf..",
])

SPRITES['crop_crystalberry'] = crop([
    "................",
    "................",
    "....A...........",
    "...AaA....A.....",
    "...aah...AaA....",
    "..-/h/-..aah....",
    ".-//_//-/-h--...",
    ".`_AA/__//__/-..",
    "..AaaA_/AA_//`..",
    "..ahah`AaaA_`...",
    "...hh._ahah`....",
    "....`__/hh_.....",
    "......`__`......",
])

SPRITES['crop_dragonpepper'] = crop([
    "................",
    "................",
    "..........-.....",
    "...--....-/-....",
    "..-//-..-//_-...",
    "..`/_/-/_/_/`...",
    "...`_//e/_``....",
    "...qRRe_.eRRq...",
    "...RRRr`.rRRR...",
    "....RRr_.rRR....",
    "....R7r_..7R....",
    ".....Y.__..Y....",
    "......`__`......",
])

# ================================================================ magic items (16x16)

SPRITES['item_starfruit'] = grid([
    "................",
    ".......u........",
    "......uYu.......",
    "......uYY.......",
    ".....uYYYy......",
    ".uuuuuYYYyyyyy..",
    "..uYYHYYYYYYy...",
    "...uYkYYYkYy....",
    "....uYYYYYyy....",
    "....YYY?Y?Yy....",
    "...uYYYYYYYYy...",
    "...YYYyyyYYYy...",
    "..uYYy...yYYy...",
    "..Yyy.....yyy...",
    "..y.........y...",
    "................",
])

SPRITES['item_moonmelon'] = grid([
    "................",
    "........e/......",
    ".......`/.--....",
    ".......`.-//....",
    "....{{{{{{{{....",
    "...{AA{{{{{{cc..",
    "..{AH{{{uu{{ccc.",
    "..{A{{{uY{{{ccc.",
    ".{{{{{uY{{{cccch",
    ".{{{{{uY{{{cccch",
    ".{{{{{{uY{{ccchh",
    "..{{{{{{uu{ccch.",
    "..cc{{{{{{ccchh.",
    "...ccccccccchh..",
    ".....hhhhhhh....",
    "................",
])


def rainbow_carrot():
    base = SPRITES_FARM_CARROT
    out = []
    ramps = [('q', 'R', 'r'), ('^', '7', 'T'), ('u', 'Y', 'y'), ('f', 'E', 'e'), ('c', 'B', 'b'), ('w', 'V', 'v')]
    for y, r in enumerate(base):
        row = []
        for x, ch in enumerate(r):
            if ch in '^7T':
                band = ((y - x) + 8) // 2
                band = max(0, min(5, (band) % 6))
                lt, md, dk = ramps[band]
                row.append({'^': lt, '7': md, 'T': dk}[ch])
            elif ch in 'fEe':
                row.append({'f': '-', 'E': '/', 'e': '`'}[ch])
            else:
                row.append(ch)
        out.append(''.join(row))
    return grid(out)


SPRITES_FARM_CARROT = [
    "................",
    "............-.-.",
    "..........-/-/-.",
    "...........`//`.",
    "..........^7`/-.",
    ".........^777`..",
    "........^7777...",
    ".......^777T7...",
    "......^77777....",
    ".....^7777T.....",
    "....^777T7......",
    "....777T7.......",
    "...77T77........",
    "..77TT..........",
    "..TT............",
    "................",
]
SPRITES['item_rainbowcarrot'] = rainbow_carrot()

SPRITES['item_crystalberry'] = grid([
    "................",
    "........`-......",
    ".......`/-/.....",
    "......-/_.......",
    "....AAA.AAA.....",
    "...AHAaAHAah....",
    "...AAaaAAaah....",
    "...aaahaaahh..*.",
    "..AAAhhAAAh.....",
    ".AHAahAHAahh....",
    ".AAaahAAaahh....",
    ".aaahhaaahh.....",
    "..hhh..hhh......",
    "..............*.",
    "....*...........",
    "................",
])

SPRITES['item_dragonpepper'] = grid([
    "................",
    "...........e/...",
    "..........e/-...",
    "........eE/_....",
    ".......qRRe.....",
    "......qHRRRr....",
    "......qRRRRr....",
    ".....qRRRRrr....",
    "....qRRRRRr.....",
    "...qRRRRRrr.....",
    "..qRRRRrrr......",
    "..R77rrr........",
    ".^77^7..........",
    ".Yu^............",
    "..u.............",
    "................",
])


# ================================================================ magic animals (face right)

SPRITES['animal_unicorn'] = {'w': 20, 'rows': grid([
    "....................",
    ".................u..",
    "..............(.uY..",
    ".............>(HYy..",
    "............>7HHHHH.",
    "...........>7YHHHHHH",
    "...........7Y/H{kHHH",
    "...........Y/aHkkHH?",
    ".>7.(((((((/acHHHHG.",
    ">7Y((HHHHHHHHHH(GG..",
    "7Y/(HHHHHHHHHHH(....",
    "Y/a.HHHHHHHHHHH(....",
    "/a..(HHHHHHHHH((....",
    ".c..(H.(H..(H.(H....",
    "....yy.yy..yy.yy....",
    "....................",
], 20)}

SPRITES['animal_dragon'] = {'w': 20, 'rows': grid([
    "....................",
    "......V.....u...u...",
    ".....V?V....Yw..Yw..",
    "....V??$V..wwwwwwww.",
    "...V??$$V.wwwwwwwwwV",
    "..V???$V.wwwwHkwwwwV",
    "..V??$$V.wwwwkkwwwwV",
    "...V??V..wwwwkkw?wwV",
    "....VV..VwwwwwwwwwV.",
    "......VVwwwVVvVVVV..",
    "..w..VwwwwVuYYYuV...",
    ".w...VwwwVVYyyyYV...",
    ".Yww.VVVVVVuYYYuV...",
    ".uY.wwvVV.VyyyyV....",
    "......vv..vv..vv....",
    "....................",
], 20)}

SPRITES['animal_fairy'] = grid([
    "................",
    "........>?>.....",
    "...{(..>?$??>...",
    "..{((A.>?SSS?...",
    "..{(((A>?SkSk...",
    "..{((((A?SSS?...",
    "...{(((({SSS>...",
    "....{{((AfEf....",
    "...{((((AfEfS...",
    "..{(((({.fEEf...",
    "..{(({{..fEEEf..",
    "...{{...fEEEEe..",
    "*.........SS....",
    ".....*...S.S..*.",
    "..u.............",
    "................",
])

SPRITES['animal_griffin'] = {'w': 20, 'rows': grid([
    "....................",
    "...........HHH......",
    "..........HHHHH.....",
    "....pO...HHHH{kH....",
    "...pOOo..HHHHkkHYy..",
    "...NpOOo.HHHHHHYyy..",
    "...pNpOOoHHHHHGY....",
    "....pNpOOoHHHHG.....",
    "....ppNpOo<<<GG.....",
    ".p..<ppNo<<<<<<.....",
    "pp.<<<<<<<<<<<<.....",
    ".p<<<<<<<<<<<<p.....",
    "..p<<<<<<<<<<<p.....",
    "...pp.pp...Yy.Yy....",
    "...yy.yy...yy.yy....",
    "....................",
], 20)}


# ================================================================ neighbour busts (16x16)

SPRITES['npc_gnome'] = grid([
    "................",
    ".......q........",
    "......qR........",
    "......qRR.......",
    ".....qRRRr......",
    ".....qRRRr......",
    "....qRRRRRr.....",
    "...qRRRRRRRr....",
    "...SSSSSSSSs....",
    "...SkSSSSkSs....",
    "...SSSqqSSSs....",
    "..HWWW?qWWWHG...",
    "..HWWWWWWWWWG...",
    ".BBHWWWWWWWGbb..",
    ".BBBGWWWWWGbbb..",
    "................",
])

SPRITES['npc_mermaid'] = grid([
    "................",
    "....._///_......",
    "....-//////_....",
    "...-//uY///_`...",
    "...//SSSSS/_`...",
    "..-/SSSSSSS/_`..",
    "..//SkSSSkS/_`..",
    "..//?SSSSS?/_`..",
    "..-/_SSqSS_/_`..",
    "..//_SSSSS_//`..",
    "..-/_SSSSS_/_`..",
    ".-//SSSSSSSS/_`.",
    ".//SS?>SS?>SS_`.",
    "./_SS>I?S>I?S_`.",
    ".`_SSSSSSSSSS``.",
    "................",
])

SPRITES['npc_wizard'] = grid([
    "................",
    "..........cb....",
    ".........cBb....",
    ".........cuB....",
    "........cBBb....",
    "........cBBBb...",
    ".......cBYBBb...",
    ".......cBBBuBb..",
    "...cccBBBBBBBbb.",
    "....SSSSSSSSs...",
    "...SSySSSSySs...",
    "...yykyyyykyy...",
    "...SSySSSSySs...",
    "..WWWWWssWWWWW..",
    ".BbWWWWWWWWWWbB.",
    "................",
])

SPRITES['npc_pixie'] = grid([
    "................",
    ".......f........",
    "......fEf.......",
    ".....fEEEe......",
    "....fEEEEEe.....",
    "...fEEeEEEEe....",
    "...))))))))](...",
    ".S.)SSSSSSS].S..",
    ".SS)SkSSSkS]SS..",
    "..SSSSSSSSSSs...",
    "...S?SSSSS?s....",
    "....SSSqSSs.....",
    ".....sSSSs......",
    "...?$?$?$?$?....",
    "..?>?>?>?>?>?...",
    "................",
])
