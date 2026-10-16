"""Area 2: Whisperwood Forest - sunny outdoor tiles, forest creatures, Old Gnarlroot, potion tiers."""
import random, math
from draw import Canvas
SPRITES = {}

LEAF = ['f', 'E', 'e', 'F']
BARK = ['p', 'O', 'o', 'P']


def wrap_off(v, c, n=16):
    """signed wrapped offset v-c in a tile of size n"""
    return (v - c + n/2) % n - n/2


# ---------------------------------------------------------------- tiles

def grass(seed=5):
    rng = random.Random(seed)
    g = [['#']*16 for _ in range(16)]
    # sparse light / dark specks for a soft texture
    for _ in range(14):
        x, y = rng.randrange(16), rng.randrange(16)
        g[y][x] = rng.choice('!!%')
    # little grass tufts: two light blades over a darker root
    tufts = ((2, 3), (10, 2), (14, 8), (6, 9), (11, 13), (1, 13))
    for (x, y) in tufts:
        for (dx, dy, c) in ((0, -1, '!'), (2, -1, '!'), (0, 0, '%'), (1, 0, '&'), (2, 0, '%'), (1, -1, '%')):
            g[(y+dy) % 16][(x+dx) % 16] = c
    return g


def tile(g):
    return {'outline': False, 'rows': [''.join(r) for r in g]}


SPRITES['tile_grass'] = tile(grass())


def flower(g, x, y, petal, center='Y'):
    for (dx, dy) in ((0, -1), (-1, 0), (1, 0), (0, 1)):
        g[(y+dy) % 16][(x+dx) % 16] = petal
    g[y % 16][x % 16] = center


def grass_flowers():
    g = grass()
    flower(g, 4, 4, 'H')
    flower(g, 12, 7, 'i', 'u')
    flower(g, 7, 11, 'H')
    flower(g, 14, 13, 'c', 'u')
    g[2][12] = 'u'; g[14][2] = 'i'; g[9][1] = 'H'
    return g


SPRITES['tile_grass_flowers'] = tile(grass_flowers())


def blob_field(lumps, base, shades, seed, specks=0, speck_c=None):
    """wrapped leafy clumps: shades = (light, mid, dark-rim)"""
    rng = random.Random(seed)
    g = [[base]*16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            best = None
            for (bx, by, rx, ry) in lumps:
                sx = wrap_off(x+0.5, bx)/rx; sy = wrap_off(y+0.5, by)/ry
                d = sx*sx + sy*sy
                if d < 1.0 and (best is None or by > best[3]):
                    best = (d, sx, sy, by)
            if best:
                d, sx, sy, _ = best
                lit = -(sx*0.7 + sy)
                if d > 0.6 and lit < -0.2:
                    g[y][x] = shades[2]
                elif lit > 0.45 and d > 0.15:
                    g[y][x] = shades[0]
                else:
                    g[y][x] = shades[1]
    for _ in range(specks):
        x, y = rng.randrange(16), rng.randrange(16)
        if g[y][x] == shades[1]:
            g[y][x] = speck_c
    return g


def tree_top():
    lumps = [(3, 3, 3.4, 2.8), (10, 2, 3.4, 2.8), (14.5, 7, 3.2, 2.6), (7, 7.5, 3.6, 2.8),
             (1, 10, 3.0, 2.6), (11, 12, 3.6, 2.8), (5, 14.5, 3.4, 2.6), (15, 15, 2.4, 2.0)]
    g = blob_field(lumps, '@', ('e', 'F', '@'), 9, 0)
    # a few bright leaf glints on the lit clumps
    for (x, y) in ((2, 2), (9, 1), (6, 6), (10, 11), (4, 13), (13, 6), (0, 9)):
        g[y][x] = 'E'
    return g


SPRITES['tile_tree_top'] = tile(tree_top())


def tree():
    c = Canvas(16, 16)
    # dark canopy mass behind (top merges into tree_top / neighbours)
    c.rect(0, 0, 15, 7, '@')
    # grass below
    gr = grass(17)
    for y in range(8, 16):
        for x in range(16):
            c.put(x, y, gr[y][x])
    # cast shadow on the grass
    for y in range(11, 16):
        for x in range(16):
            dx = (x+0.5-8)/7.8; dy = (y+0.5-11.5)/3.6
            if dx*dx + dy*dy < 1.0:
                c.put(x, y, '&' if dx*dx + dy*dy < 0.75 else '%')
    # trunk
    c.rect(6, 10, 9, 14, 'O')
    for y in range(10, 15):
        c.put(6, y, 'p'); c.put(9, y, 'o')
    c.put(8, 12, 'o'); c.put(7, 13, 'o')
    c.stamp(["oO..Oo", "P....P"], 5, 14, skip='.')
    c.put(5, 15, 'P'); c.put(10, 15, 'P'); c.put(6, 15, 'o'); c.put(9, 15, 'o')
    for x in range(6, 10):
        c.put(x, 10, 'P')  # shade under canopy
    # leafy canopy: overlapping clumps, lit from the top-left
    for (cx, cy, rx, ry) in ((8, 6.5, 8.8, 5.0), (3, 7.2, 3.9, 3.6), (13, 7.2, 3.9, 3.6),
                             (5.5, 3.8, 4.6, 3.6), (10.8, 3.8, 4.6, 3.6), (8, 9, 5.6, 2.6)):
        c.ellipse(cx, cy, rx, ry, ['E', 'E', 'e', 'F'])
    # top highlight clumps
    c.ellipse(5.5, 3.6, 2.6, 2.0, ['f', 'f', 'E', 'e'])
    c.ellipse(10.5, 3.6, 2.2, 1.6, ['f', 'E', 'E', 'e'])
    c.ellipse(3, 6, 1.8, 1.4, ['f', 'E', 'E', 'e'])
    # leaf texture flecks
    for (x, y, ch) in ((4, 8, 'e'), (9, 7, 'e'), (12, 8, 'e'), (7, 6, 'e'), (13, 5, 'f'), (2, 8, 'e'),
                       (6, 2, 'H'), (5, 3, 'J'), (11, 6, 'E'), (14, 7, 'e')):
        c.put(x, y, ch)
    # dark rim under the canopy
    for x in range(1, 15):
        if c.get(x, 11) in 'EeF' and c.get(x, 12) not in 'EeF':
            c.put(x, 11, 'F')
    return c.rows()


SPRITES['tile_tree'] = {'outline': False, 'rows': tree()}


def forest_exit():
    """a big hollow log tunnel, seen end-on: the way deeper into the woods"""
    c = Canvas(16, 16)
    g = grass(23)
    for y in range(16):
        for x in range(16):
            c.put(x, y, g[y][x])
    # shadow
    for x in range(1, 16):
        c.put(x, 15, '&')
    for x in range(2, 15):
        c.put(x, 14, '&')
    # log body (bark ring)
    c.ellipse(8, 8, 7.5, 6.8, ['p', 'O', 'o', 'P'])
    # cut face ring (light wood) then dark hollow
    c.ellipse(8, 8.3, 6.0, 5.4, ['N', 'p', 'p', 'O'])
    c.ellipse(8.3, 8.8, 4.4, 4.0, ['P', 'P', 'P', 'P'])
    c.ellipse(8.4, 9.0, 3.6, 3.4, ['K', 'K', 'K', 'K'])
    # inner floor of the log, catching a little light
    for x in range(6, 12):
        if c.get(x, 12) in 'KP':
            c.put(x, 12, 'o')
    c.put(7, 11, 'P'); c.put(10, 11, 'P'); c.put(8, 11, 'P'); c.put(9, 11, 'P')
    # growth-ring lines on the cut face
    for (x, y) in ((4, 5), (3, 8), (12, 5), (13, 9), (5, 13), (11, 13)):
        if c.get(x, y) in 'Np':
            c.put(x, y, 'O')
    # moss cap + little mushroom
    for (x, y, ch) in ((4, 1, 'Z'), (5, 1, 'Z'), (6, 0, 'Z'), (7, 0, 'f'), (8, 0, 'Z'), (9, 1, '9'), (10, 1, 'Z'),
                       (3, 2, '9'), (6, 1, 'Z'), (7, 1, 'Z'), (8, 1, '9'), (11, 2, '9'), (2, 4, '9'), (13, 3, 'X')):
        c.put(x, y, ch)
    c.stamp(["RHR", ".N."], 12, 1)
    # glowing fireflies inside the tunnel = "go deeper"
    c.put(6, 8, 'L')
    # arrow-ish worn path into it
    for x in range(6, 11):
        c.put(x, 15, 'p' if x % 2 else 'O')
    return c.rows()


SPRITES['tile_forest_exit'] = {'outline': False, 'rows': forest_exit()}


def forest_gate():
    """big gnarled root gate with glowing runes: the way into the boss grove"""
    c = Canvas(16, 16)
    c.rect(0, 0, 15, 15, '@')
    g = grass(31)
    for y in range(14, 16):
        for x in range(16):
            c.put(x, y, g[y][x])
    for x in range(1, 15):
        c.put(x, 14, '&')
    # leafy fringe on top so it sits inside a tree wall
    for (cx, cy, rx, ry) in ((2, 0.5, 3.6, 2.0), (13.5, 0.5, 3.6, 2.0), (8, -0.5, 3.2, 1.6)):
        c.ellipse(cx, cy, rx, ry, ['E', 'e', 'e', 'F'])
    # wooden double door (planks)
    plank = {3: 'P', 4: 'p', 5: 'O', 6: 'o', 7: 'P', 8: 'p', 9: 'O', 10: 'O', 11: 'o', 12: 'P'}
    for y in range(4, 14):
        for x in range(3, 13):
            c.put(x, y, plank[x])
    for x in range(4, 12):
        c.put(x, 4, 'P')
    # twisted root band across the doors
    for x in range(3, 13):
        c.put(x, 9, 'O' if x % 3 else 'p'); c.put(x, 10, 'o' if x % 3 != 1 else 'P')
    # glowing rune: a leaf-diamond with a bright core
    c.stamp([
        ".LL.",
        "L.uL",
        "lj.l",
        ".ll.",
    ], 6, 5)
    c.put(7, 6, 'J'); c.put(8, 7, 'j')
    for (x, y, ch) in ((5, 11, 'L'), (5, 12, 'l'), (10, 11, 'L'), (10, 12, 'l'), (4, 12, 'j'), (11, 12, 'j')):
        c.put(x, y, ch)
    # gnarled root pillars + arch
    pil = [
        "oP.",
        "pOP",
        "OpP",
        "pOo",
        "OOP",
        "pOP",
        "Oo.",
        "pOP",
        "OpoP",
        "pOP",
        "OpP",
        "pOoP",
        "OpOoP",
        "PoPPo",
    ]
    for y, r in enumerate(pil):
        for x, ch in enumerate(r):
            if ch != '.':
                c.put(x, y+1, ch)
                c.put(15-x, y+1, {'p': 'O', 'O': 'o', 'o': 'P', 'P': 'P'}[ch])
    arch = [
        "..PoOOOOOOOOoP..",
        ".PpOoOpOOpOoOoP.",
        "..PPo.PooP.oPP..",
    ]
    c.stamp(arch, 0, 1)
    c.put(4, 1, 'p'); c.put(9, 2, 'p')
    # moss + a tiny leaf sprout
    for (x, y, ch) in ((2, 1, 'Z'), (3, 1, '9'), (12, 1, 'Z'), (7, 1, 'Z'), (8, 1, '9'), (1, 7, '9'), (14, 11, '9'), (0, 12, 'Z')):
        c.put(x, y, ch)
    return c.rows()


SPRITES['tile_forest_gate'] = {'outline': False, 'rows': forest_gate()}


def spring():
    c = Canvas(16, 16)
    c.ellipse(8, 9, 7.6, 5.6, ['G', 'g', 'n', 'n'])
    c.ellipse(8, 9, 6.0, 4.2, ['a', 'a', 'h', ';'])
    c.ellipse(8.6, 9.6, 4.6, 3.0, ['a', 'h', 'h', ';'])
    # sparkles / reflection
    for (x, y, ch) in ((5, 7, 'A'), (6, 7, 'H'), (7, 8, 'A'), (10, 11, 'A'), (11, 10, 'H'), (4, 9, 'A')):
        c.put(x, y, ch)
    # individual stones along the rim
    for x in (3, 7, 11):
        c.put(x, 4, 'n')
    for x in (2, 6, 10, 14):
        c.put(x, 13 if x != 2 else 12, 'n')
    c.put(1, 8, 'n'); c.put(14, 8, 'n')
    # lily pad + flower
    c.stamp(["EE.", "fEe", ".ee"], 10, 6)
    c.put(11, 6, 'i'); c.put(12, 6, 'H')
    # magic mote
    c.put(8, 1, 'A'); c.put(5, 2, 'a')
    return c.rows()


SPRITES['tile_spring'] = {'outline': False, 'rows': spring()}


def portal():
    c = Canvas(16, 16)
    c.ellipse(8, 8, 7.4, 7.4, ['w', 'V', 'v', 'x'])
    c.ellipse(8, 8, 5.4, 5.4, ['v', 'x', 'x', 'x'])
    # two clean swirl arms spiralling into a bright core
    for k, (c1, c2) in enumerate((('c', 'B'), ('w', 'V'))):
        for t in range(0, 40):
            a = t*0.2 + k*math.pi
            r = 0.8 + t*0.12
            if r > 5.2:
                break
            x = int(math.floor(8 + math.cos(a)*r)); y = int(math.floor(8 + math.sin(a)*r))
            c.put(x, y, c1 if t < 26 else c2)
    c.ellipse(8, 8, 1.6, 1.6, ['H', 'A', 'A', 'c'])
    # sparkles around the rim
    for (x, y, ch) in ((1, 2, 'A'), (14, 1, 'w'), (15, 12, 'A'), (0, 13, 'w'), (12, 2, 'H'), (3, 13, 'H')):
        c.put(x, y, ch)
    return c.rows()


SPRITES['tile_portal'] = {'outline': False, 'rows': portal()}


def bush():
    c = Canvas(16, 16)
    for (cx, cy, rx, ry) in ((8, 10, 7.0, 4.6), (5, 8, 4.0, 3.6), (11, 8, 4.0, 3.4), (8, 6.5, 3.6, 3.0)):
        c.ellipse(cx, cy, rx, ry, ['E', 'E', 'e', 'F'])
    c.ellipse(6, 6.5, 2.2, 1.8, ['f', 'f', 'E', 'e'])
    c.ellipse(11, 6.8, 1.6, 1.4, ['f', 'E', 'E', 'e'])
    c.ellipse(3.5, 9, 1.4, 1.2, ['f', 'E', 'E', 'e'])
    for (x, y, ch) in ((5, 10, 'e'), (9, 9, 'e'), (12, 11, 'e'), (7, 12, 'e'), (10, 12, 'F')):
        c.put(x, y, ch)
    # berries
    for (x, y) in ((4, 11), (9, 10), (12, 8), (7, 7)):
        c.put(x, y, 'R'); c.put(x, y-1, 'q') if c.get(x, y-1) != '.' else None
    # dark edge so it pops on grass
    _edge(c, 'F')
    return c.rows()


def _edge(c, col):
    pts = []
    for y in range(16):
        for x in range(16):
            if c.get(x, y) == '.':
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1)):
                nx, ny = x+dx, y+dy
                if not (0 <= nx < 16 and 0 <= ny < 16) or c.get(nx, ny) == '.':
                    pts.append((x, y)); break
    for x, y in pts:
        if c.get(x, y) not in ('q', 'R', 'H', 'N'):
            c.put(x, y, col)


SPRITES['deco_bush'] = {'outline': False, 'rows': bush()}

SPRITES['deco_mushrooms'] = {'outline': False, 'rows': [
    "................",
    "................",
    "................",
    "................",
    "........QrrQ....",
    ".......rRHRRr...",
    "......rRHRRHRr..",
    "......QrRRRRrQ..",
    "..QrrQ..mNNm....",
    ".rHRRRr.mNNm....",
    ".QrRHRrQ.NNm....",
    "...mNm..mNNm.Qr.",
    "...NNm.&&&&&rHRr",
    "...NNm&.....QmmQ",
    "..&&&&&......Nm.",
    "............&&&.",
]}

SPRITES['deco_log'] = {'outline': False, 'rows': [
    "................",
    "................",
    "................",
    "................",
    "................",
    "......Z9Z.......",
    "..PPZZ9fZZPPPP..",
    ".PpOOOpOOOOOOP..",
    ".PpOoOOOooOONpP.",
    ".POOOOoOOOOONpOP",
    ".PoOOOOOOoOOpONP",
    ".PooooooooooOpNP",
    "..PPPPPPPPPPNONP",
    "...&&&&&&&&&PPP.",
    "................",
    "................",
]}

SPRITES['deco_flowers'] = {'outline': False, 'rows': [
    "................",
    "................",
    "................",
    "................",
    ".....H..........",
    "....HYH.....i...",
    ".....H.....iui..",
    ".....e..c...i...",
    "..E..e.cuc..e...",
    "..Ee.e..c..ee.E.",
    "...eEe..e..e.eE.",
    "....ee.Ee.ee.e..",
    ".....eeEeee.....",
    "......&&&&......",
    "................",
    "................",
]}


# ---------------------------------------------------------------- creatures

SPRITES['enemy_boar'] = [
    "................",
    "................",
    "................",
    "................",
    "......P.P.P.....",
    "....PPoPoPoPPO..",
    "...oOOpOpOOOPpO.",
    "..oOppppOOOOOOO.",
    ".oOpppOOOOOOWkO.",
    ".oOppOOOOOOOOOii",
    "PoOOOOOOOOOONiIi",
    ".ooOOOOOOOONNii.",
    "..oooOOOOOoooo..",
    "...PoP.oooPoP...",
    "...PP.....PP....",
    "................",
]

SPRITES['enemy_pixie'] = [
    "................",
    "..u.....iii.....",
    ".......iqiiI....",
    "..AA..iqSSSiI...",
    ".AaaA.iSSHkSi...",
    ".AaaaAISSSkSs...",
    "..AaaAA.SSrS....",
    "...AA.++sss..u..",
    "..AaaA+=++=.Yu..",
    ".AaaA.=+++=s.Y..",
    "..AA...=+=......",
    "........S.S.....",
    ".......S...S....",
    "...u........u...",
    "................",
    "................",
]

SPRITES['enemy_beetle'] = [
    "................",
    "................",
    "...........ppO..",
    "..........pO..O.",
    "....bbbb..O...o.",
    "..bBcHHBb.CCC...",
    ".bBcHHcBBbCbbC..",
    ".bBcHcBBBbCHHC..",
    ".bBccBBBBbCHkC..",
    ".bBBBBBBbbCCCCO.",
    ".CbBBBBbbbCC.O.O",
    "..CbbbbbbCC..O.o",
    "...CCCCCCC...ppO",
    "...K.K..K.K.....",
    "..K..K..K..K....",
    "................",
]

SPRITES['enemy_sapling'] = [
    "......f..f......",
    ".....fEf.Ef.....",
    "...fEEfEEEEe....",
    "..fEEEEfEEEEe...",
    "..EfEEEEEEEEe...",
    "..eEEEEEEeEEe...",
    "...eeEEEEeEe....",
    "....FeeFeeFF....",
    ".....pPOOOPo....",
    ".....pOPOPOo....",
    ".....pHkOHko....",
    "..o..pOOOOOo.o..",
    "..oo.pOkkkOooo..",
    "...oopkOOOkO....",
    "....oPOO.oPo....",
    "...oo.PP..Po....",
]

SPRITES['enemy_snapper'] = [
    "................",
    "....eEEEEe......",
    "...eEfEEEEe.....",
    "..eEfEEEEEEeN.N.",
    "..eEEHkEEEeRNRNR",
    "..eEEkkEERRRRRR.",
    "..eEEEEEERRiRRR.",
    "...eEEEEERRRRRR.",
    "....eeEEERNRNRN.",
    "......eEEEEEEe..",
    "..Ee...eEEEe....",
    ".EEee...ee..eEE.",
    "..TTTTTTTTTTTe..",
    "..TPPoPPPoPPt...",
    "...TTTTTTTTt....",
    "....tTTTTTt.....",
]

SPRITES['enemy_owlbear'] = [
    "................",
    ".........O...O..",
    "........oO..oO..",
    ".......oOOOOOOO.",
    "......oONNNONNNO",
    "......ONHHNNHHNO",
    "....ooONHkNNHkNO",
    "..ooOOpONNNYYNN.",
    ".oOpppOOONNNyN..",
    ".oOppOOOOmNNNm..",
    ".oOpOOOOmNNNNNm.",
    ".oOOOOOOmNNNNmOO",
    "..ooOOOOOmmmmOWW",
    "...oOOOooooooo..",
    "...PNPN...PNPN..",
    "................",
]

SPRITES['enemy_bandit'] = [
    "................",
    ".....vvvv.......",
    "....vwwVVv..O...",
    "...vwVVVVVv.oO..",
    "..vwVVVVVVVv.oO.",
    "..vVVSSSSSSs.Go.",
    ".vVVvKHkKHkK.GO.",
    ".vVVvSSSSsSs.GO.",
    ".vVv.RqsSRR..GO.",
    ".vv.RqRRRRRRSSO.",
    "....oOpOOOo..GO.",
    ".....PYPPPP.oO..",
    ".....oOOOOo.O...",
    ".....PP..PP.....",
    "....PPP.PPP.....",
    "................",
]

SPRITES['enemy_mossgolem'] = [
    "................",
    "........iu......",
    "......fZeZf.....",
    "....ZfZZ9ZZfZ...",
    "...ZfZ9ZZZ9ZZ9..",
    "..9ZZ9XZ9ZX9ZZX.",
    "..X8GX88X888X9X.",
    ".58G88888888885.",
    "558888aA888aA655",
    "5G8888aa888aa655",
    "5686888888886655",
    ".55688866666655.",
    "..X5666666655X..",
    "...55556655555..",
    "...4554..4554...",
    "................",
]


# ---------------------------------------------------------------- boss

def treant():
    c = Canvas(32, 32)
    # back arm (left), reaching down
    c.line(7, 15, 2, 22, 'o', thick=2)
    c.line(2, 22, 1, 25, 'o')
    c.line(3, 22, 4, 26, 'o')
    c.line(2, 21, 0, 23, 'P')
    # roots / legs
    c.stamp([
        "..PoOOo.......PoOOo...",
        ".PoOOoo......PoOOOoo..",
        "PoOoPoOo....PoOoPoOoo.",
        "PPP.PPPP...PPPP.PPPPP.",
    ], 5, 27)
    # trunk body
    c.ellipse(15.5, 19, 9.5, 10, BARK)
    # vertical bark grooves
    for (x, y0, y1) in ((9, 15, 26), (12, 22, 28), (20, 23, 28), (23, 13, 24)):
        for y in range(y0, y1):
            if c.get(x, y) in 'pOo':
                c.put(x + (1 if (y // 4) % 2 else 0), y, 'o')
    # leafy crown
    for (cx, cy, rx, ry) in ((9, 7, 7.5, 5.2), (20, 6, 8, 5.6), (14.5, 3.5, 6.5, 3.6), (26.5, 10, 4.6, 3.6), (4, 10.5, 4.2, 3.2)):
        c.ellipse(cx, cy, rx, ry, LEAF)
    for (cx, cy, rx, ry) in ((10, 4.5, 3.4, 2.4), (18.5, 3.4, 3.4, 2.2), (4.5, 8.8, 2.0, 1.4), (24, 6.5, 2.4, 1.6)):
        c.ellipse(cx, cy, rx, ry, ['f', 'f', 'E', 'E'])
    for (x, y) in ((8, 8), (13, 6), (17, 9), (22, 9), (27, 11), (5, 12), (15, 2), (11, 10), (25, 8)):
        c.put(x, y, 'e')
    c.put(11, 3, 'H'); c.put(19, 2, 'J')
    # little red mushroom living on his head (goofy)
    c.stamp([".rRr.", "rRHRr", "QrrrQ", "..N.."], 25, 3)
    # brow ridge (thick, grumpy) - face looks to the right
    c.stamp([
        "PPo.......oPP",
        ".oPPPo..oPPPo",
        "...ooP..Poo..",
    ], 13, 12)
    # glowing eyes
    c.stamp(["LLu", "lLj"], 14, 15)
    c.stamp(["uLL", "LLj"], 21, 15)
    c.put(13, 15, 'P'); c.put(13, 16, 'P'); c.put(24, 15, 'P'); c.put(24, 16, 'P')
    for x in range(14, 17):
        c.put(x, 17, 'P')
    for x in range(21, 24):
        c.put(x, 17, 'P')
    # big knobbly nose
    c.ellipse(19.4, 18.4, 2.6, 2.2, ['p', 'p', 'O', 'o'])
    c.put(18, 17, 'N'); c.put(18, 18, 'p'); c.put(21, 20, 'P'); c.put(20, 20, 'P')
    # grumpy mouth
    c.stamp([
        "P.........P",
        ".PPPPPPPPP.",
        ".PNNQQQNNP.",
    ], 14, 20)
    # mossy beard
    beard = [
        "..X9Z9ZZ9ZZ9X..",
        ".X9ZfZZ9ZfZZ9X.",
        "X9ZZ9ZZfZZ9ZZ9X",
        "X9Z9ZZ9ZZ9Z9Z9X",
        ".X9ZZ9Z9ZZ9ZX..",
        "..X9X9ZZ9X9X...",
        "...X..X9X..X...",
        "........X......",
    ]
    c.stamp(beard, 12, 23)
    c.put(13, 24, 'f')
    # flower in the beard (goofy)
    c.stamp([".i.", "iui", ".i."], 22, 24)
    # front arm (right): branch reaching forward with twig fingers + leaves
    c.line(22, 19, 27, 17, 'O', thick=2)
    c.line(23, 20, 27, 18, 'o')
    c.stamp([
        "..o.o.",
        "..Oo.o",
        "pOOOo.",
        "OOo...",
        ".o.o..",
        "...o..",
    ], 26, 14)
    c.stamp(["fE", "Ee"], 30, 12)
    c.stamp(["Ef", "eE"], 29, 20)
    # moss patches on the trunk
    for (x, y, ch) in ((9, 14, 'Z'), (10, 14, '9'), (8, 15, '9'), (8, 22, 'Z'), (7, 23, '9'), (21, 27, '9'), (22, 26, 'Z')):
        if c.get(x, y) != '.':
            c.put(x, y, ch)
    return c.rows()


SPRITES['boss_treant'] = treant()


# ---------------------------------------------------------------- potion tiers

def _cork(c, x0, x1, y0, y1):
    c.rect(x0, y0, x1, y1, 'O')
    c.put(x0, y0, 'p')
    for y in range(y0, y1+1):
        c.put(x1, y, 'o')


def potion_medium(liq):
    hi, mid, dark, deep = liq
    c = Canvas(16, 16)
    c.ellipse(7.5, 9.6, 6.2, 5.6, ['A', 'A', 'G', 'g'])
    c.ellipse(7.5, 10.0, 5.2, 4.7, [hi, mid, dark, deep])
    for x in range(2, 14):
        if c.get(x, 6) in liq:
            c.put(x, 6, 'A' if x < 7 else 'G')
    # wavy liquid surface
    for x in range(3, 13):
        if c.get(x, 7) in liq:
            c.put(x, 7, hi if x % 3 else mid)
    c.rect(6, 2, 9, 4, 'G'); c.put(6, 3, 'A'); c.put(9, 3, 'g')
    c.put(5, 4, 'G'); c.put(10, 4, 'g')
    _cork(c, 6, 9, 0, 1)
    # shine + bubbles
    c.put(3, 9, 'H'); c.put(3, 10, 'H'); c.put(4, 8, 'H')
    c.put(9, 10, hi); c.put(10, 12, hi)
    return c.rows()


def potion_major(liq, sym):
    hi, mid, dark, deep = liq
    c = Canvas(16, 16)
    # tall shouldered bottle
    c.ellipse(7.5, 11.0, 6.0, 4.6, ['A', 'A', 'G', 'g'])
    c.rect(2, 6, 13, 11, 'G')
    for y in range(6, 12):
        c.put(2, y, 'A'); c.put(3, y, 'A'); c.put(13, y, 'g')
    c.ellipse(7.5, 6.5, 5.8, 2.2, ['A', 'A', 'G', 'g'])
    c.ellipse(7.5, 11.2, 5.0, 3.8, [hi, mid, dark, deep])
    c.rect(3, 7, 12, 11, mid)
    for y in range(7, 12):
        c.put(3, y, hi); c.put(12, y, dark)
    for x in range(4, 12):
        c.put(x, 7, hi if x % 2 else mid)
    # neck with gold band
    c.rect(6, 2, 9, 4, 'G'); c.put(6, 3, 'A'); c.put(9, 3, 'g')
    c.rect(5, 4, 10, 4, 'Y'); c.put(5, 4, 'u'); c.put(10, 4, 'y')
    _cork(c, 6, 9, 0, 1)
    # heart label
    c.stamp(["NNNNNNN"] + sym + ["mmmmmmm"], 4, 8)
    # shine
    c.put(3, 8, 'H'); c.put(3, 9, 'H'); c.put(3, 10, 'H')
    return c.rows()


def potion_superior(liq, glow):
    hi, mid, dark, deep = liq
    c = Canvas(16, 16)
    # crystal teardrop flask
    c.ellipse(7.5, 10.2, 5.4, 5.2, ['A', 'A', 'A', 'G'])
    c.ellipse(7.5, 10.4, 4.5, 4.3, [glow, hi, mid, dark])
    c.ellipse(6.6, 9.4, 1.6, 1.6, ['H', glow, glow, hi])
    for x in range(3, 13):
        if c.get(x, 6) in liq + [glow]:
            c.put(x, 6, 'A')
    c.rect(6, 3, 9, 5, 'A'); c.put(9, 4, 'G'); c.put(9, 5, 'G')
    # gold filigree cage
    for (x, y) in ((2, 10), (13, 10), (7, 15), (8, 15), (3, 13), (12, 13), (3, 7), (12, 7)):
        c.put(x, y, 'Y')
    c.put(2, 9, 'y'); c.put(13, 11, 'y'); c.put(4, 14, 'y'); c.put(11, 14, 'U')
    c.rect(5, 5, 10, 5, 'Y'); c.put(5, 5, 'u'); c.put(10, 5, 'U')
    # golden stopper with gem
    c.stamp([".yYy.", "yYuYy", ".UyU."], 5, 0)
    c.put(7, 1, 'H')
    c.put(6, 1, mid); c.put(7, 0, 'u')
    # sparkles
    for (x, y) in ((1, 3), (14, 2), (14, 7), (0, 12)):
        c.put(x, y, 'u')
    c.put(13, 2, 'H') if False else None
    return c.rows()


RED = ['q', 'R', 'r', 'Q']
BLUE = ['c', 'B', 'b', 'C']
SPRITES['icon_potion_2'] = potion_medium(RED)
SPRITES['icon_mana_2'] = potion_medium(BLUE)
SPRITES['icon_potion_3'] = potion_major(RED, ['NRRNRRN', 'NRRRRRN', 'NNRRRNN', 'NNNRNNN'])
SPRITES['icon_mana_3'] = potion_major(BLUE, ['NNNcNNN', 'NNcBbNN', 'NNBBbNN', 'NNNbNNN'])
SPRITES['icon_potion_4'] = potion_superior(RED, 'i')
SPRITES['icon_mana_4'] = potion_superior(BLUE, 'A')
