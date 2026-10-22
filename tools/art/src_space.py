"""Learning Space: astronaut, ships, alien saucer, base buildings, asteroids, minerals, fuel."""
import random, math
from draw import Canvas
SPRITES = {}

# ramps (light -> dark)
STEEL = ['W', 'G', 'g', 'n']
BLUE = ['c', 'B', 'b', 'C']
RED = ['q', 'R', 'r', 'Q']
GOLD = ['u', 'Y', 'y', 'U']
ORANGE = ['^', '7', 'T', 't']
PURPLE = ['w', 'V', 'v', 'x']
GREEN = ['f', 'E', 'e', 'F']
ICE = ['A', 'a', 'h', ';']
ROCK = ['m', 'M', '5', '3']


def grid(rows, w):
    for i, r in enumerate(rows):
        if len(r) != w:
            raise SystemExit(f'src_space: row {i} has len {len(r)} (want {w}): {r!r}')
    return rows


def inpoly(x, y, pts):
    px, py = x + 0.5, y + 0.5
    inside = False
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]; x1, y1 = pts[(i + 1) % n]
        if (y0 > py) != (y1 > py):
            xi = x0 + (py - y0) * (x1 - x0) / (y1 - y0)
            if px < xi:
                inside = not inside
    return inside


def poly(c, pts, ramp, top=None, bot=None):
    """Fill polygon; shade by height (light top -> dark bottom)."""
    ys = [p[1] for p in pts]
    t0 = min(ys) if top is None else top
    t1 = max(ys) if bot is None else bot
    for y in range(c.h):
        for x in range(c.w):
            if inpoly(x, y, pts):
                t = (y + 0.5 - t0) / max(1, (t1 - t0))
                i = min(len(ramp) - 1, max(0, int(t * len(ramp))))
                c.put(x, y, ramp[i])


def nozzle(c, x, y0, y1):
    """Small engine bell at the back (left) end: x is its left column."""
    for y in range(y0, y1 + 1):
        c.put(x, y, 'g' if y < (y0 + y1) / 2 else 'n')
        c.put(x + 1, y, 'G' if y == y0 else 'g')
    c.put(x, y0, 'G'); c.put(x, y1, 'K')
    for y in range(y0 + 1, y1):
        c.put(x - 1, y, 'K')


# ================================================================ astronaut

SPRITES['space_astronaut'] = grid([
    "................",
    "......WWWWWG....",
    ".....WWWWWWWG...",
    "....WWWWYAaahG..",
    "....WWWWYaahbg..",
    "....WWWGYahbbg..",
    "....GWGgYYYYgn..",
    ".GGg.gGGGGgn....",
    ".WGgWWWWWWWGg...",
    ".GRgWWWcRWGWWg..",
    ".ggnGWWWWWgGWg..",
    "..nnGGWWWWgGGg..",
    "....gGGYYGGgg...",
    "....WWGg.WWGg...",
    "....gnnn.gnnnn..",
    "................",
], 16)


# ================================================================ ships (24x24, nose right)

def ship_mercury():
    c = Canvas(24, 24)
    # solar wings (swept back), dark blue panels with gold frames
    for (pts, flip) in (([(8, 11), (15, 11), (10, 3), (5, 3)], False),
                        ([(8, 13), (15, 13), (10, 21), (5, 21)], True)):
        for y in range(24):
            for x in range(24):
                if inpoly(x, y, pts):
                    c.put(x, y, 'b' if (x + y) % 2 else 'B')
        # gridlines
        for y in range(24):
            for x in range(24):
                if c.get(x, y) in 'bB' and (y % 3 == 0):
                    c.put(x, y, 'C')
    for y in range(3, 22):
        for x in range(24):
            if c.get(x, y) in 'bBC' and (c.get(x - 1, y) == '.' or c.get(x + 1, y) == '.' or c.get(x, y - 1) == '.' or c.get(x, y + 1) == '.'):
                c.put(x, y, 'Y' if y < 12 else 'y')
    for x in range(5, 11):
        c.put(x, 3, 'u')
    # sleek needle fuselage
    poly(c, [(3, 10), (14, 10), (22, 12), (14, 14), (3, 14)], STEEL)
    for x in range(4, 16):
        c.put(x, 10, 'W')
    # gold trim stripe
    for x in range(4, 19):
        c.put(x, 12, 'Y')
    c.put(19, 12, 'y')
    # cockpit
    c.stamp(["Aah", "ahb"], 14, 10)
    c.put(14, 10, 'A'); c.put(15, 10, 'a'); c.put(16, 11, 'h')
    nozzle(c, 1, 10, 14)
    return c.rows()


def ship_venus():
    c = Canvas(24, 24)
    # top and bottom fins (back)
    poly(c, [(4, 9), (9, 9), (5, 4), (3, 4)], ['^', '7'])
    poly(c, [(4, 15), (9, 15), (5, 20), (3, 20)], ['T', 't'])
    # rounded orange pod
    c.ellipse(11.5, 12, 8.5, 6.5, ['u', 'Y', '^', '7', 'T', 't'])
    # yellow belly band
    for y in range(6, 19):
        for x in range(9, 11):
            if c.get(x, y) != '.':
                c.put(x, y, 'Y' if y < 12 else 'y')
    # big heat-shield nose (dark bronze dome)
    c.ellipse(18, 12, 4.5, 8, ['W', 'G', 'g', 'n'], mask=lambda x, y: x >= 17)
    for y in range(5, 20):
        if c.get(17, y) != '.':
            c.put(17, y, 'y')
    # tiles on shield
    for (x, y) in ((19, 8), (20, 11), (19, 14), (21, 13), (20, 16)):
        if c.get(x, y) != '.':
            c.put(x, y, 'g' if y < 12 else 'n')
    # round porthole
    c.stamp([".n.", "nAn", "nhn", ".n."], 12, 8)
    c.put(13, 9, 'A'); c.put(13, 10, 'a')
    nozzle(c, 1, 10, 14)
    return c.rows()


def ship_earth():
    c = Canvas(24, 24)
    # tail fin
    poly(c, [(4, 10), (10, 10), (5, 4), (3, 4)], STEEL)
    c.put(3, 4, 'B'); c.put(4, 4, 'B'); c.put(4, 5, 'B'); c.put(5, 5, 'B')
    # swept wing under body
    poly(c, [(8, 13), (15, 13), (8, 19), (5, 19)], ['G', 'g', 'n'])
    for x in range(5, 9):
        c.put(x, 19, 'B')
    c.put(6, 18, 'B'); c.put(7, 18, 'B')
    # fuselage
    poly(c, [(3, 9), (15, 9), (21, 11), (22, 12), (21, 13), (15, 15), (3, 15)], STEEL)
    for x in range(4, 16):
        c.put(x, 9, 'W')
    # blue stripes
    for x in range(3, 21):
        c.put(x, 12, 'B')
    for x in range(3, 18):
        c.put(x, 13, 'b' if x % 4 else 'B')
    c.put(21, 12, 'b')
    # nose cap
    c.put(22, 12, 'R'); c.put(21, 11, 'q'); c.put(21, 13, 'r')
    # blue cockpit bubble
    c.stamp(["..cc..", ".cABb.", "BBbbbb"], 13, 8)
    c.put(14, 9, 'A')
    # windows
    for x in (8, 10):
        c.put(x, 11, 'h')
    nozzle(c, 1, 10, 14)
    return c.rows()


def ship_mars():
    c = Canvas(24, 24)
    # two big engine pods
    for (y0, y1) in ((5, 9), (15, 19)):
        poly(c, [(4, y0), (12, y0), (13, y0 + 1), (13, y1 - 1), (12, y1), (4, y1)], ['G', 'g', 'n'])
        for x in range(5, 12):
            c.put(x, y0, 'W')
        c.rect(9, y0 + 1, 9, y1 - 1, 'r')
        # big nozzle bell
        for y in range(y0, y1 + 1):
            c.put(3, y, 'n'); c.put(2, y, 'g' if y < y1 - 1 else 'n')
        c.put(1, y0 + 1, 'D'); c.put(1, y0 + 2, 'D'); c.put(1, y1 - 1, 'D')
        c.put(2, y0, 'G')
    # chunky red hull
    poly(c, [(5, 8), (16, 8), (21, 10), (22, 12), (21, 14), (16, 16), (5, 16)], RED)
    for x in range(6, 17):
        c.put(x, 8, 'q')
    # rust patches + panel lines
    for (x, y) in ((8, 11), (9, 11), (12, 14), (13, 14), (7, 14)):
        c.put(x, y, 'T')
    for y in range(9, 16):
        c.put(11, y, 'r' if y < 12 else 'Q')
    # yellow hazard stripe near nose
    for y in range(9, 16):
        c.put(17, y, 'Y' if y < 12 else 'y')
    # cockpit
    c.stamp(["Aaa", "ahh"], 18, 10)
    nozzle(c, 4, 10, 14)
    c.put(3, 11, 'K'); c.put(3, 12, 'K'); c.put(3, 13, 'K')
    return c.rows()


SPRITES['ship_mercury'] = {'w': 24, 'rows': ship_mercury()}
SPRITES['ship_venus'] = {'w': 24, 'rows': ship_venus()}
SPRITES['ship_earth'] = {'w': 24, 'rows': ship_earth()}
SPRITES['ship_mars'] = {'w': 24, 'rows': ship_mars()}


# ================================================================ alien saucer

def alien():
    c = Canvas(24, 24)
    # glass dome
    c.ellipse(11.5, 11, 5.5, 5.5, ['A', 'A', 'a', 'a'], mask=lambda x, y: y <= 11)
    # little green alien inside
    c.stamp(["..l..l..",
             "..L..L..",
             ".lllll..",
             "lKlllKl.",
             "llllllle",
             ".lljjll.",
             ".ejjjje."], 8, 5)
    c.put(9, 8, 'H'); c.put(14, 8, 'H')  # eye shine
    c.put(8, 8, 'K'); c.put(13, 8, 'K')
    c.put(9, 8, 'H'); c.put(14, 8, 'H')
    # cheeky brows
    c.put(8, 7, 'j'); c.put(14, 7, 'j')
    # dome highlight
    c.put(8, 6, 'H'); c.put(7, 7, 'H')
    # saucer disc
    c.ellipse(11.5, 13.5, 10.5, 3.5, PURPLE)
    for x in range(3, 21):
        if c.get(x, 11) != '.':
            pass
    # rim band + lights
    for x in range(1, 23):
        if c.get(x, 14) != '.':
            c.put(x, 14, 'v')
    for x in (3, 7, 11, 15, 19):
        c.put(x, 14, 'L'); c.put(x + 1, 14, 'l')
    # underside glow
    c.stamp([".jlllj.", "..jjj.."], 8, 17)
    c.put(11, 17, 'L')
    return c.rows()


SPRITES['space_alien'] = {'w': 24, 'rows': alien()}


# ================================================================ base buildings (32x32)

def foundation(c, x0, x1, y=28):
    c.rect(x0, y, x1, y, 'G')
    c.rect(x0, y + 1, x1, y + 1, 'g')
    c.rect(x0 + 1, y + 2, x1 - 1, y + 2, 'n')


def cyl(c, x0, x1, y0, y1, ramp):
    """Vertical cylinder shaded left (light) to right (dark)."""
    w = x1 - x0
    for x in range(x0, x1 + 1):
        t = (x - x0) / max(1, w)
        i = 0 if t < 0.2 else 1 if t < 0.55 else 2 if t < 0.85 else 3
        for y in range(y0, y1 + 1):
            c.put(x, y, ramp[i])


def font3(c, glyphs, x, y, ch):
    F = {'O': ["###", "#.#", "#.#", "#.#", "###"],
         '2': ["##", "..#", ".#", "#..", "###"],
         'C': ["###", "#..", "#..", "#..", "###"],
         'H': ["#.#", "#.#", "###", "#.#", "#.#"],
         '4': ["#.#", "#.#", "###", "..#", "..#"]}
    for g in glyphs:
        rows = F[g]
        for yy, r in enumerate(rows):
            for xx, v in enumerate(r):
                if v == '#':
                    c.put(x + xx, y + yy, ch)
        x += 4


def base_lox():
    c = Canvas(32, 32)
    # side small tank
    cyl(c, 22, 28, 15, 27, ['W', 'A', 'a', 'h'])
    for x in range(22, 29):
        c.put(x, 14, 'A' if x < 25 else 'a')
    c.put(22, 14, '.'); c.put(28, 14, '.')
    c.rect(22, 20, 28, 20, 'g')
    # main tall tank with domed top
    cyl(c, 6, 18, 6, 27, ['W', 'A', 'a', 'h'])
    c.ellipse(12.5, 6.5, 6.5, 4, ['H', 'W', 'A', 'a'], mask=lambda x, y: y <= 6)
    # steel bands
    for y in (10, 22):
        for x in range(6, 19):
            c.put(x, y, 'G' if x < 13 else 'g')
    # O2 label on a blue badge
    c.rect(8, 13, 16, 19, 'B')
    c.rect(8, 19, 16, 19, 'b')
    font3(c, 'O2', 9, 14, 'W')
    c.put(9, 13, 'c')
    # frost patches
    for (x, y) in ((7, 8), (8, 7), (7, 12), (17, 24), (16, 25), (7, 25), (8, 26), (18, 12), (17, 9), (10, 4), (11, 3)):
        c.put(x, y, 'H')
    # pipes between tanks
    c.rect(19, 17, 21, 17, 'G'); c.rect(19, 18, 21, 18, 'g')
    c.rect(19, 24, 21, 24, 'G'); c.rect(19, 25, 21, 25, 'g')
    c.put(20, 16, 'c'); c.put(20, 23, 'c')
    # vent pipe on top of small tank
    c.rect(25, 10, 25, 13, 'G'); c.rect(26, 10, 26, 13, 'g')
    c.put(25, 9, 'H'); c.put(26, 9, 'A'); c.put(24, 8, 'A'); c.put(27, 7, 'H')
    # side ladder
    for y in range(8, 28):
        c.put(4, y, 'g')
        if y % 3 == 0:
            c.put(5, y, 'g')
    c.put(3, 7, 'g')
    foundation(c, 2, 29)
    return c.rows()


def base_methane():
    c = Canvas(32, 32)
    # legs under the sphere
    for x in (7, 11, 15, 19):
        c.rect(x, 22, x, 27, 'g'); c.rect(x + 1, 22, x + 1, 27, 'n')
    # sphere tank
    c.ellipse(13.5, 15, 9, 8.5, ['^', '7', '7', 'T', 'T', 't'])
    # equator band
    for x in range(4, 24):
        if c.get(x, 15) != '.':
            c.put(x, 15, 'y' if x < 14 else 'U')
    # CH4 label
    c.rect(7, 9, 20, 13, '.')
    for y in range(9, 14):
        for x in range(7, 21):
            c.put(x, y, 'u' if y == 9 else 'Y')
    font3(c, 'CH4', 8, 9, 't')
    for x in range(7, 21):
        c.put(x, 14, 'y')
    # highlight
    c.put(8, 18, 'u'); c.put(7, 17, 'u')
    # pipe to flare stack
    c.rect(22, 24, 26, 24, 'G'); c.rect(22, 25, 26, 25, 'g')
    c.rect(24, 6, 24, 27, 'G'); c.rect(25, 6, 25, 27, 'g'); c.rect(26, 6, 26, 27, 'n')
    for y in (10, 16, 22):
        c.rect(24, y, 26, y, 'D')
    c.rect(23, 5, 27, 5, 'g')
    # little flame
    c.stamp(["..u..",
             ".uY7.",
             ".Y7..",
             "u7Y7.",
             ".777."], 23, 0)
    c.put(25, 4, 'Y')
    # valve wheel
    c.put(21, 23, 'R'); c.put(21, 22, 'q')
    foundation(c, 2, 29)
    return c.rows()


def base_admin():
    c = Canvas(32, 32)
    # antenna mast with red light
    c.rect(15, 2, 15, 8, 'G'); c.rect(16, 2, 16, 8, 'g')
    c.put(15, 1, 'q'); c.put(16, 1, 'R'); c.put(15, 0, 'q'); c.put(16, 0, 'r')
    c.rect(14, 5, 17, 5, 'g')
    # big dome
    c.ellipse(15.5, 27, 13.5, 18, ['W', 'W', 'G', 'G', 'g', 'n'], mask=lambda x, y: y <= 27)
    # panel seams
    for y in range(10, 28):
        for x in range(32):
            if c.get(x, y) != '.' and y in (15, 21):
                c.put(x, y, 'g' if c.get(x, y) in 'WG' else 'n')
    # big window band
    for x in range(5, 27):
        for y in range(17, 21):
            if c.get(x - 1, y) != '.' and c.get(x + 1, y) != '.':
                c.put(x, y, 'a' if y < 19 else 'h')
    for x in range(5, 27, 4):
        for y in range(17, 21):
            if c.get(x, y) in 'ah':
                c.put(x, y, 'n')
    for (x, y) in ((7, 17), (8, 17), (12, 17), (16, 17), (20, 17), (24, 17)):
        if c.get(x, y) == 'a':
            c.put(x, y, 'A')
    # door
    c.rect(13, 22, 18, 27, 'n')
    c.rect(14, 23, 17, 27, 'h')
    c.rect(15, 23, 15, 27, 'b'); c.rect(16, 23, 16, 27, 'a')
    c.put(14, 23, 'A')
    # door lamp
    c.put(15, 21, 'Y'); c.put(16, 21, 'Y')
    # satellite dish on the right shoulder
    c.stamp(["...WG",
             "..WGg",
             ".WGgn",
             "WGgn.",
             ".gn..",
             "..n.."], 23, 4)
    c.put(21, 5, 'g'); c.put(22, 6, 'g'); c.put(20, 4, 'R')
    c.rect(25, 10, 25, 12, 'g')
    # little flag/sign light
    c.put(6, 13, 'B'); c.put(7, 13, 'c')
    foundation(c, 1, 30)
    return c.rows()


def base_pad():
    c = Canvas(32, 32)
    # crane post
    c.rect(3, 6, 4, 26, 'Y')
    for y in range(6, 27):
        c.put(4, y, 'y')
        if y % 3 == 0:
            c.put(3, y, 'U')
    # crane arm
    c.rect(3, 5, 18, 5, 'Y'); c.rect(3, 6, 18, 6, 'y')
    for x in range(5, 18, 3):
        c.put(x, 6, 'U')
    c.rect(2, 4, 5, 4, 'u')
    # cable + claw
    c.rect(16, 7, 16, 11, 'n')
    c.stamp(["gGGg",
             "g..g",
             "n..n"], 14, 12)
    # cab on top of post
    c.rect(2, 2, 6, 4, 'R'); c.rect(3, 2, 5, 2, 'q'); c.put(5, 3, 'a')
    # round landing pad (squashed disc)
    c.ellipse(16, 25, 14, 4.5, ['G', 'G', 'g', 'n'])
    for x in range(2, 31):
        for y in range(25, 31):
            pass
    # yellow ring marking + H
    for y in range(20, 31):
        for x in range(32):
            if c.get(x, y) == '.':
                continue
            dx = (x + 0.5 - 16) / 10.5; dy = (y + 0.5 - 25) / 3.2
            d = dx * dx + dy * dy
            if 0.8 <= d <= 1.15:
                c.put(x, y, 'Y' if y < 25 else 'y')
    c.stamp(["W..W", "WWWW", "W..W"], 14, 24)
    # pad side (thickness)
    for x in range(3, 30):
        if c.get(x, 29) != '.' or c.get(x, 28) != '.':
            pass
    # tool rack
    c.rect(24, 9, 24, 21, 'O'); c.rect(30, 9, 30, 21, 'o')
    c.rect(24, 9, 30, 9, 'p'); c.rect(24, 15, 30, 15, 'O')
    # wrench, screwdriver, hammer
    c.stamp(["G.G", "GGG", ".G.", ".g.", ".g."], 25, 10)
    c.stamp(["R", "R", "g", "g"], 29, 10)
    c.stamp(["ggg", ".O.", ".O.", ".o.", ".o."], 25, 16)
    c.stamp(["B", "B", "G", "g", "g"], 29, 16)
    return c.rows()


def base_launch():
    c = Canvas(32, 32)
    # lattice tower
    x0, x1 = 3, 9
    for y in range(3, 26):
        c.put(x0, y, 'R'); c.put(x1, y, 'r')
    for seg in range(3, 25, 4):
        for i in range(5):
            c.put(x0 + 1 + i, seg + i, 'q' if i < 3 else 'R')
            c.put(x1 - 1 - i, seg + i, 'r')
        c.rect(x0, seg, x1, seg, 'R')
    c.rect(x0, 3, x1, 3, 'q')
    # top light + roof
    c.rect(2, 2, 10, 2, 'g')
    c.rect(5, 0, 7, 1, 'n'); c.put(6, 0, 'R'); c.put(6, 1, 'Y')
    # swing arms reaching to the rocket
    for (y, col) in ((9, 'G'), (17, 'G')):
        c.rect(10, y, 18, y, col); c.rect(10, y + 1, 18, y + 1, 'g')
        c.put(18, y + 2, 'n'); c.put(17, y + 2, 'n')
        for x in range(11, 18, 2):
            c.put(x, y + 1, 'n')
    # pad platform
    c.rect(1, 26, 30, 26, 'W')
    c.rect(1, 27, 30, 27, 'G')
    c.rect(1, 28, 30, 28, 'g')
    c.rect(2, 29, 29, 29, 'n')
    # flame trench in centre
    c.rect(17, 27, 25, 28, 'n')
    c.rect(18, 28, 24, 28, 'D')
    # hazard stripes on pad edge
    for x in range(1, 31):
        if x % 4 in (0, 1) and not (17 <= x <= 25):
            c.put(x, 27, 'Y')
    # ladder / stairs on tower base
    for y in range(20, 26, 2):
        c.put(10, y, 'g'); c.put(11, y + 1, 'g')
    # rocket hold-down clamps
    c.put(16, 25, 'g'); c.put(26, 25, 'g'); c.put(16, 24, 'G'); c.put(26, 24, 'G')
    return c.rows()


SPRITES['base_lox'] = {'w': 32, 'rows': base_lox()}
SPRITES['base_methane'] = {'w': 32, 'rows': base_methane()}
SPRITES['base_admin'] = {'w': 32, 'rows': base_admin()}
SPRITES['base_pad'] = {'w': 32, 'rows': base_pad()}
SPRITES['base_launch'] = {'w': 32, 'rows': base_launch()}


# ================================================================ asteroids (16x16)

def rock(seed, rx, ry, vein, sparkle=None):
    rng = random.Random(seed)
    c = Canvas(16, 16)
    cx, cy = 7.5, 7.8
    k = [rng.uniform(0.82, 1.08) for _ in range(9)]
    def radius(a):
        f = a / (2 * math.pi) * 9
        i = int(f) % 9; t = f - int(f)
        return k[i] * (1 - t) + k[(i + 1) % 9] * t
    for y in range(16):
        for x in range(16):
            dx = (x + 0.5 - cx) / rx; dy = (y + 0.5 - cy) / ry
            r = math.hypot(dx, dy)
            a = math.atan2(dy, dx) % (2 * math.pi)
            lim = radius(a)
            if r <= lim and 1 <= x <= 14 and 1 <= y <= 14:
                rel = r / lim
                dot = -(dx * 0.6 + dy * 0.8) / max(r, 0.01)
                t = 0.3 - dot * 0.45 * rel + rel * 0.3
                i = min(3, max(0, int(t * 4)))
                c.put(x, y, ROCK[i])
    # craters
    for _ in range(2):
        for _ in range(20):
            x, y = rng.randrange(3, 13), rng.randrange(3, 13)
            if c.get(x, y) != '.' and c.get(x + 1, y + 1) != '.' and c.get(x + 1, y) != '.':
                c.put(x, y, '3'); c.put(x + 1, y, '5'); c.put(x + 1, y + 1, 'm' if c.get(x+1, y+1) != '.' else '.')
                break
    # mineral veins / crystals: a few small clusters
    placed = 0
    tries = 0
    while placed < 5 and tries < 300:
        tries += 1
        x, y = rng.randrange(3, 12), rng.randrange(3, 12)
        if all(c.get(x + dx, y + dy) not in '.' + ''.join(vein) for dx in (-1, 0, 1, 2) for dy in (-1, 0, 1, 2)):
            c.put(x, y, vein[0]); c.put(x + 1, y, vein[1])
            c.put(x, y + 1, vein[1]); c.put(x + 1, y + 1, vein[2])
            if placed % 2 == 0:
                c.put(x + 2, y + 1, vein[2])
            placed += 1
    if sparkle:
        for (x, y) in sparkle:
            c.put(x, y, 'H')
            for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if c.get(x + dx, y + dy) != '.':
                    c.put(x + dx, y + dy, 'A')
    return c.rows()


SPRITES['rock_fe'] = rock(11, 7.0, 6.4, ['q', 'T', 't'])
SPRITES['rock_ni'] = rock(23, 7.4, 6.0, ['J', '-', '/'])
SPRITES['rock_cu'] = rock(5, 6.5, 7.0, ['^', '7', 'T'])
SPRITES['rock_al'] = rock(41, 7.2, 6.5, ['W', 'G', 'g'])
SPRITES['rock_ag'] = rock(8, 6.8, 6.8, ['H', 'W', 'c'], sparkle=[(5, 5), (10, 9), (6, 11)])
SPRITES['rock_au'] = rock(17, 7.2, 6.2, ['u', 'Y', 'y'])


# ================================================================ mineral icons (12x12)

NUGGET = [
    "............",
    "............",
    "....1122....",
    "...112223...",
    "..11222333..",
    "..1H222333..",
    "..12223334..",
    "..22233344..",
    "...233444...",
    "....3444....",
    "............",
    "............",
]

CRYSTAL = [
    "............",
    "......1.....",
    ".....H12....",
    ".....1123...",
    "..1..1223...",
    ".H12.1223.2.",
    ".1123122312.",
    ".1223122323.",
    "..2233223...",
    "...44444....",
    "............",
    "............",
]

BAR = [
    "............",
    "............",
    "............",
    "....11111...",
    "...1H11112..",
    "..11111123..",
    "..22222233..",
    "..2222223...",
    "..333333....",
    "............",
    "............",
    "............",
]


def icon(shape, ramp):
    m = {'1': ramp[0], '2': ramp[1], '3': ramp[2], '4': ramp[3], 'H': 'H'}
    return {'w': 12, 'rows': grid([''.join(m.get(ch, ch) for ch in r) for r in shape], 12)}


SPRITES['min_fe'] = icon(NUGGET, ['q', 'T', 't', 'Q'])
SPRITES['min_ni'] = icon(CRYSTAL, ['J', '-', '/', '`'])
SPRITES['min_cu'] = icon(NUGGET, ['^', '7', 'T', 't'])
SPRITES['min_al'] = icon(BAR, ['W', 'G', 'g', 'n'])
SPRITES['min_ag'] = icon(CRYSTAL, ['W', 'G', 'g', 'n'])
SPRITES['min_au'] = icon(NUGGET, ['u', 'Y', 'y', 'U'])


# ================================================================ fuel icons (12x12)

SPRITES['fuel_lox'] = {'w': 12, 'rows': grid([
    "............",
    ".....A......",
    ".....A......",
    "....AAa.....",
    "....Aah.....",
    "...AAaah....",
    "..AHaaahh...",
    "..AHaaahh...",
    "..Aaaahhb...",
    "...ahhhb....",
    "....hbb.....",
    "............",
], 12)}

SPRITES['fuel_ch4'] = {'w': 12, 'rows': grid([
    "............",
    ".....u......",
    "....uY.7....",
    "....Y77Y....",
    ".....7T.....",
    "....gGGg....",
    "...^^77TT...",
    "...^uY7Tt...",
    "...^Y77Tt...",
    "...^777Tt...",
    "...77TTtt...",
    "............",
], 12)}
