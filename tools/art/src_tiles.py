import random, math
from draw import Canvas
SPRITES = {}


def wrapd(ax, ay, bx, by, n=16):
    dx = abs(ax-bx); dy = abs(ay-by)
    dx = min(dx, n-dx); dy = min(dy, n-dy)
    return math.hypot(dx, dy)


def flagstones(seed, pts, base, crack, hi, dark, speck_hi, speck_lo, nspeck=10):
    rng = random.Random(seed)
    g = [[base]*16 for _ in range(16)]
    owner = [[0]*16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            ds = sorted((wrapd(x+0.5, y+0.5, px, py), i) for i, (px, py) in enumerate(pts))
            owner[y][x] = ds[0][1]
            if ds[1][0] - ds[0][0] < 1.1:
                g[y][x] = crack
    for y in range(16):
        for x in range(16):
            if g[y][x] == crack:
                continue
            up = g[(y-1) % 16][x]; left = g[y][(x-1) % 16]
            dn = g[(y+1) % 16][x]; rt = g[y][(x+1) % 16]
            if up == crack or left == crack:
                g[y][x] = hi
            elif dn == crack or rt == crack:
                g[y][x] = dark
    for _ in range(nspeck):
        x, y = rng.randrange(16), rng.randrange(16)
        if g[y][x] == base:
            g[y][x] = rng.choice([speck_hi, speck_lo])
    return g


FLOOR_PTS = [(3, 3), (11, 2), (7, 9), (14, 11), (2, 13), (10, 15.5)]


def floor():
    return flagstones(7, FLOOR_PTS, '2', '1', '3', '2', '3', '1', 12)


SPRITES['tile_floor'] = {'rows': [''.join(r) for r in floor()], 'outline': False}


def moss_floor():
    g = floor()
    blobs = [(4, 4, 3.2, 2.4), (12, 11, 3.6, 2.6), (13, 3, 1.6, 1.2), (3, 13, 1.8, 1.3)]
    rng = random.Random(3)
    for y in range(16):
        for x in range(16):
            best = None
            for (bx, by, rx, ry) in blobs:
                dx = min(abs(x+0.5-bx), 16-abs(x+0.5-bx)) / rx
                dy = min(abs(y+0.5-by), 16-abs(y+0.5-by)) / ry
                d = dx*dx + dy*dy + rng.uniform(-0.25, 0.25)
                # signed offset for lighting (top-left lighter)
                sx = ((x+0.5-bx + 8) % 16 - 8) / rx
                sy = ((y+0.5-by + 8) % 16 - 8) / ry
                if d < 1.0 and (best is None or d < best[0]):
                    best = (d, sx, sy)
            if best:
                d, sx, sy = best
                lit = -(sx + sy)
                if d > 0.7:
                    g[y][x] = 'X'
                elif lit > 0.5:
                    g[y][x] = 'Z'
                else:
                    g[y][x] = '9'
    # a few tiny sprouts
    for (x, y) in ((8, 6), (9, 7), (1, 9), (7, 14)):
        g[y][x] = 'X'
    g[6][8] = 'Z'
    return g


SPRITES['tile_floor_moss'] = {'rows': [''.join(r) for r in moss_floor()], 'outline': False}


def wall():
    rng = random.Random(11)
    g = [['5']*16 for _ in range(16)]
    for course in range(4):
        y0 = course*4
        off = 0 if course % 2 == 0 else 4
        # mortar row
        for x in range(16):
            g[y0+3][x] = '1'
        joints = [(off + 7) % 16, (off + 15) % 16]
        for j in joints:
            for y in range(y0, y0+3):
                g[y][j] = '1'
        # shade each stone: top row highlight, bottom row shadow, left col highlight
        for y in range(y0, y0+3):
            for x in range(16):
                if g[y][x] == '1':
                    continue
                left_m = g[y][(x-1) % 16] == '1'
                right_m = g[y][(x+1) % 16] == '1'
                if y == y0:
                    g[y][x] = '6'
                elif y == y0+2:
                    g[y][x] = '4'
                if left_m and y != y0+2:
                    g[y][x] = '6'
                if right_m and y != y0:
                    g[y][x] = '4'
        # round the corners (chipped rock)
        for j in joints:
            g[y0][(j+1) % 16] = '4'
            g[y0+2][(j-1) % 16] = '3'
    for _ in range(9):
        x, y = rng.randrange(16), rng.randrange(16)
        if g[y][x] == '5':
            g[y][x] = rng.choice('486')
    g[1][3] = '8'; g[9][12] = '8'; g[5][9] = '8'
    return g


SPRITES['tile_wall'] = {'rows': [''.join(r) for r in wall()], 'outline': False}


def wall_top():
    # dark solid rock mass with a few rounded lumps (clearly not walkable floor)
    rng = random.Random(21)
    g = [['1']*16 for _ in range(16)]
    lumps = [(4, 4, 3.4, 2.6), (12, 6, 3.0, 2.4), (6, 12, 3.6, 2.6), (14.5, 14, 2.4, 2.0), (0.5, 9, 1.8, 1.6)]
    for y in range(16):
        for x in range(16):
            for (bx, by, rx, ry) in lumps:
                sx = ((x+0.5-bx + 8) % 16 - 8) / rx
                sy = ((y+0.5-by + 8) % 16 - 8) / ry
                d = sx*sx + sy*sy
                if d < 1.0:
                    lit = -(sx + sy)
                    if d > 0.55 and lit < -0.4:
                        g[y][x] = '0'
                    elif d > 0.45 and lit > 0.5:
                        g[y][x] = '3'
                    else:
                        g[y][x] = '2'
    for _ in range(8):
        x, y = rng.randrange(16), rng.randrange(16)
        if g[y][x] == '1':
            g[y][x] = '0'
    return g


SPRITES['tile_wall_top'] = {'rows': [''.join(r) for r in wall_top()], 'outline': False}

def stairs():
    g = [list(r) for r in floor()]
    tops = ['8', '6', '5', '4', '3']
    risers = ['4', '3', '2', '1', '0']
    # frame
    for x in range(1, 15):
        g[1][x] = '4'
    for y in range(1, 15):
        g[y][1] = '4'; g[y][14] = '3'
    for x in range(1, 15):
        g[14][x] = '5'
    for y in range(2, 14):
        for x in range(2, 14):
            g[y][x] = '0'
    for i in range(5):
        y = 2 + i*2 + (1 if i > 0 else 0)
        y = 2 + int(i*2.4)
        inset = i
        for x in range(2+inset, 14-inset):
            g[y][x] = tops[i]
            if y+1 < 14:
                g[y+1][x] = risers[i]
        # side walls of the shaft
        for yy in range(y, 14):
            for x in range(2, 2+inset):
                g[yy][x] = '1'
            for x in range(14-inset, 14):
                g[yy][x] = '0'
    g[2][2] = '8'
    return [''.join(r) for r in g]


SPRITES['tile_stairs_down'] = {'outline': False, 'rows': stairs()}

SPRITES['tile_door'] = {'outline': False, 'rows': [
    "5666666886666665",
    "6555555665555556",
    "655kopOopOok5546",
    "65kOopOopOopk546",
    "6kpOopOopOopOk46",
    "6kpOopOopOopOk46",
    "6knGnnnnnnnnGk46",
    "6kpOopOopOopOk46",
    "6kpOopOopOyYOk46",
    "6kpOopOopOUyOk46",
    "6kpOopOopOopOk46",
    "6knGnnnnnnnnGk46",
    "6kpOopOopOopOk46",
    "6kpOopOopOopOk46",
    "6koooooooooook46",
    "4444444444444444",
]}

SPRITES['tile_chest'] = {'outline': False, 'rows': [
    "................",
    "................",
    "................",
    "...PPPPPPPPPP...",
    "..PYppppppppYP..",
    "..PyOpOOOOOOyP..",
    "..PyOOOOOOOOyP..",
    "..PPPPPuYPPPPP..",
    "..PYpOOYUOOOYP..",
    "..PyOOOyUOOOyP..",
    "..PyoooooooOyP..",
    "..PyOOOOOOOOyP..",
    "..PyOOOOOOOOyP..",
    "..PPPPPPPPPPPP..",
    "...P........P...",
    "................",
]}

SPRITES['tile_chest_open'] = {'outline': False, 'rows': [
    "................",
    "...PPPPPPPPPP...",
    "..PyoooooooOyP..",
    "..PyOOOOOOOOyP..",
    "..PYoOOOOOOOYP..",
    "..PPPPPPPPPPPP..",
    "..PPuYPYuPPYPP..",
    "..PuYuYuYYuYyP..",
    "..PPPPPPPPPPPP..",
    "..PYpOOOOOOOYP..",
    "..PyoooooooOyP..",
    "..PyOOOOOOOOyP..",
    "..PyOOOOOOOOyP..",
    "..PPPPPPPPPPPP..",
    "...P........P...",
    "................",
]}


def fountain():
    c = Canvas(16, 16)
    c.rect(1, 9, 14, 13, '5')
    for x in range(1, 15):
        c.put(x, 13, '4'); c.put(x, 14, '3')
    c.put(1, 14, '.'); c.put(14, 14, '.')
    for x in (1, 14):
        for y in range(9, 14):
            c.put(x, y, '4')
    for x in range(2, 14):
        c.put(x, 10, '6')
    c.ellipse(8, 8.5, 7, 3, ['8', '6', '6', '5'])
    c.ellipse(8, 8.5, 5.4, 2.0, ['A', 'a', 'a', 'h'])
    # pillar + bowl
    c.rect(7, 4, 8, 8, '6'); c.put(8, 5, '5'); c.put(8, 6, '5'); c.put(8, 7, '5')
    c.stamp(["8665"], 6, 3)
    # spray
    c.stamp([
        "..AA..",
        ".aAAa.",
        "a....a",
    ], 5, 0)
    c.put(4, 3, 'a'); c.put(11, 3, 'a'); c.put(4, 5, 'A'); c.put(11, 5, 'A')
    c.put(5, 8, 'A'); c.put(10, 9, 'A')
    # stone bricks on front wall
    for x in (4, 8, 12):
        c.put(x, 11, '4'); c.put(x, 12, '4')
    for x in (2, 6, 10):
        c.put(x, 12, '4')
    return c.rows()


SPRITES['tile_fountain'] = {'outline': False, 'rows': fountain()}

SPRITES['tile_campfire'] = {'outline': False, 'rows': [
    "................",
    "................",
    "........R.......",
    ".......RR.......",
    "......R7R..R....",
    "......R77R.RR...",
    ".....R7Y7RR7R...",
    ".....R7YY77R....",
    "....R7YuuY7R....",
    "....R7YuuY7R....",
    "...oPR7YY7RPp...",
    "..5PpOPRRPOpP5..",
    ".568PoOOOOoP865.",
    ".455PpPooPpP554.",
    "..4445555554443.",
    "................",
]}

SPRITES['tile_torch'] = {'outline': False, 'rows': [
    "................",
    ".......R........",
    "......R7R.......",
    "......7Y7R......",
    ".....R7uY7......",
    ".....7YuuY......",
    ".....RYuY7......",
    "......R7R.......",
    ".....nGGgn......",
    "......pOo.......",
    ".......Oo.......",
    "....ngGOogn.....",
    ".......Oo.......",
    ".......oP.......",
    "................",
    "................",
]}

SPRITES['npc_merchant'] = [
    "................",
    "..rRRr..........",
    ".rqRRRr.........",
    ".oOOOOo..===....",
    ".OpOOOO.=+++=...",
    ".OpOyOO=+++++=..",
    ".OpOOOO=+SSkS=..",
    ".OpOOOO=+SSkSs..",
    ".OpoooO=~zsGGs..",
    ".oOOOO=++~yy~...",
    ".oOOOO=+++y+=sY.",
    ".Poooo=+++y+=...",
    "..PPPP=+++y++=..",
    "......=~~~~~~=..",
    ".......PP..PP...",
    "................",
]
