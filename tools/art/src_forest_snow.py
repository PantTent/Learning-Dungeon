"""Animal Kingdom Quest part 3: the Enchanted Forest and the Snowy Mountains.
Grumpy forest + mountain animals, moose and snow-leopard bosses, two helpers,
food/charm items and forest/snow/festival props. Characters face RIGHT.
(The older src_forest.py holds the dungeon game's Whisperwood art.)"""
import math
from draw import Canvas
SPRITES = {}
LAND = {}          # name -> 'forest' | 'snow' (only used for preview sheets)
_land = 'forest'


def put(name, rows, w=None, outline=True):
    """Rows may be written short; they are padded with '.' to the sprite width."""
    h = len(rows)
    w = w or h
    for i, r in enumerate(rows):
        if len(r) > w:
            raise SystemExit(f'src_forest_snow {name}: row {i} has len {len(r)} (max {w}): {r!r}')
    rows = [r.ljust(w, '.') for r in rows]
    if w == h and outline:
        SPRITES[name] = rows
    else:
        SPRITES[name] = {'w': w, 'rows': rows, 'outline': outline}
    LAND[name] = _land


def canvas_sprite(name, c, outline=True):
    rows = c.rows()
    if c.w == c.h and outline:
        SPRITES[name] = {'w': c.w, 'rows': rows}
    else:
        SPRITES[name] = {'w': c.w, 'rows': rows, 'outline': outline}
    LAND[name] = _land


def soft_outline(name, soft):
    """Bake the dark outline in ourselves, skipping 'soft' pixels (steam, glow
    wisps) so they float without a heavy border; the sprite is then marked
    outline=False so gen.py does not outline them again."""
    spec = SPRITES[name]
    rows = [list(r) for r in (spec['rows'] if isinstance(spec, dict) else spec)]
    h, w = len(rows), len(rows[0])
    add = []
    for y in range(h):
        for x in range(w):
            if rows[y][x] != '.':
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and rows[ny][nx] not in '.' + soft:
                    add.append((x, y))
                    break
    for x, y in add:
        rows[y][x] = 'k'
    SPRITES[name] = {'w': w, 'rows': [''.join(r) for r in rows], 'outline': False}


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


# ================================================================ grumpy forest animals (16x16)

put('wild_deer', [
    "................",
    ".......Op...pO..",
    ".......OiO.OiO..",
    ".......OOOOOOO..",
    ".......OOOOOOO..",
    ".......OHkOHkO..",
    ".......OkkOkkO..",
    "........O<P<O...",
    "..N....OO<<<....",
    ".NNOOOOOOO......",
    "..OONOONOO......",
    "..ONOONOOOO.....",
    "..O<<<<<<O......",
    "..O.O...O.O.....",
    "..P.P...P.P.....",
    "................",
])

put('wild_boar', [
    "................",
    "................",
    "....P.P.P.......",
    "...PoPoPoP...O..",
    "..PoOoOoOoP.OO..",
    ".PoOOOOOOOOOOO..",
    "..oOOOOOOOOOOOO.",
    ".PoOOOOOOOOHkOO.",
    "..oOOOOOOOOkkOzz",
    "..oOOOOOOOOOOzPz",
    "..oOOOOOOOOONOz.",
    "...oOOOOOOOON...",
    "...ooooooooo....",
    "...Po.Po.Po.Po..",
    "...PP.PP.PP.PP..",
    "................",
])

put('wild_porcupine', [
    "................",
    "................",
    ".....N..N.......",
    "..N..mN.mN.N....",
    "...mNomNoNmN....",
    ".NmomomomoNmN...",
    "..moNoNoNoNmpp..",
    ".NooooooooNpppp.",
    "..ooooooooopHkp.",
    ".NooooooooppkkpP",
    "..oooooooopppp..",
    "...oooooooopp...",
    "...ooooooooo....",
    "....Po.Po.Po....",
    "....PP.PP.PP....",
    "................",
])

put('wild_skunk', [
    "................",
    "..DDDD..........",
    ".DWWWWD.........",
    ".DWDDWWD........",
    ".DWD.DWDd.....d.",
    "..D..DWDdddWddd.",
    "....DDWWdddWddd.",
    "...DDWWWdHkWHkd.",
    "...DDDDDdkkWkkd.",
    "...DDDDDDdddiD..",
    "...DDDDDDDDDD...",
    "...KDDDDDDDDK...",
    "....KKKKKKKKK...",
    "....KD.KD.KD.KD.",
    "....KK.KK.KK.KK.",
    "................",
])

put('wild_bearcub', [
    "................",
    "................",
    ".........OO..OO.",
    ".........OpOOpO.",
    "........OOOOOOO.",
    "........OOOOOOO.",
    "........OHkOHkO.",
    "........OkkOkkO.",
    "..OOOOOOO<<P<<O.",
    ".OOOOOOOOO<<<<..",
    ".OOOOOOOOOOOO...",
    ".oOOOOOOOOOOO...",
    ".ooOOOOOOOOOo...",
    "..oooooooooo....",
    "..PO.PO..PO.PO..",
    "................",
])

put('wild_wolf', [
    "................",
    "..........n...n.",
    ".........ngn.ng.",
    ".........ngGGgg.",
    "........ngGGGGg.",
    "........gGHkGGg.",
    "........gGkkGGGG",
    "........gGGGGGGn",
    ".g....nngGGWWWW.",
    "gg.nnnngggGWWW..",
    ".ggggggggggGW...",
    "..gGgggggggGG...",
    "...GGGGgggGG....",
    "...gG.gG.gG.gG..",
    "...nn.nn.nn.nn..",
    "................",
])

put('wild_squirrel', [
    "................",
    "...TT...........",
    "..T^^T......T...",
    ".T^TT^T....TiT..",
    ".T^T.T^T..TTTT..",
    ".T^T..T^TTTTTTT.",
    "..T^T.TTTHkTTTT.",
    "..T^T.TTTkkTT<T.",
    "...T^TTTT<<<<k..",
    "....T^TTT<<<<...",
    "....T^TT<<<<....",
    ".....TTT<<pp....",
    ".....TTTT<OpO...",
    "......TTTTOOO...",
    "......tt.tt.....",
    "................",
])

put('wild_bat', [
    "................",
    ".....V.....V....",
    ".....Vw...wV....",
    ".....vvvvvvv....",
    ".....vvvvvvv....",
    ".V...vHkvHkv..V.",
    ".VV..vkkvkkv.VV.",
    ".VwV.vvHvHvvVwV.",
    ".VwwVvvvvvvvVwV.",
    ".VwwwVvvvvvVwwV.",
    ".VwwwVvvvvvVwwV.",
    ".VwVwVVvvvVVwVV.",
    ".V.V..VvvvV.V...",
    "................",
    "................",
    "................",
])

# frowny brows: outer end high, inner end low
grumpy('wild_deer', [(8, 3, 'P'), (9, 4, 'P'), (11, 4, 'P'), (12, 3, 'P')])
grumpy('wild_boar', [(10, 5, 'P'), (11, 6, 'P'), (12, 6, 'P')])
grumpy('wild_porcupine', [(11, 6, 'P'), (12, 7, 'P'), (13, 7, 'P')])
grumpy('wild_skunk', [(9, 5, 'K'), (10, 6, 'K'), (12, 6, 'K'), (13, 5, 'K')])
grumpy('wild_bearcub', [(9, 4, 'P'), (10, 5, 'P'), (12, 5, 'P'), (13, 4, 'P')])
grumpy('wild_wolf', [(9, 3, 'n'), (10, 4, 'n'), (11, 4, 'n')])
grumpy('wild_squirrel', [(8, 4, 't'), (9, 5, 't'), (10, 5, 't')])
grumpy('wild_bat', [(6, 3, 'x'), (7, 4, 'x'), (9, 4, 'x'), (10, 3, 'x')])


# ================================================================ grumpy mountain animals (16x16)
_land = 'snow'

put('wild_goat', [
    "................",
    ".........K..K...",
    ".........KWWK...",
    "........GWWWWW..",
    ".........WWWWW..",
    ".........WHkWW..",
    "..W......WkkWWG.",
    ".WWWWWWWWWWWWWk.",
    ".GWWWWWWWWGWWG..",
    ".GWWWWWWWWGWG...",
    ".GWWWWWWWWWGW...",
    "..GWGWGWGWGG....",
    "..GWW.GW.GW.WG..",
    "..WG..WG.WG.WG..",
    "..KK..KK.KK.KK..",
    "................",
])

put('wild_yak', [
    "................",
    ".........N....N.",
    ".........mm..mm.",
    "...P.P.P..oOOOO.",
    "..PoPoPoPoOOOOO.",
    ".PoooooooOOHkOO.",
    "PoooooooooOkkOO.",
    ".oooooooooOOOOm.",
    "PoooooooooOOmmm.",
    ".oooooooooooPm..",
    "PoPoooooooooP...",
    ".PoPoPoPoPoPo...",
    "..PoPoPoPoPoP...",
    "..oP.oP..oP.oP..",
    "..KK.KK..KK.KK..",
    "................",
])

put('wild_marmot', [
    "................",
    "................",
    "........OO..O...",
    ".......OpppppO..",
    "......OppppppO..",
    "......pHkpHkpO..",
    "......pkkpkkpO..",
    "......Op<<P<<p..",
    "......Op<HH<pO..",
    ".....OOpp<<ppOO.",
    "....OppppppppppO",
    "...O.Op<<<<<<pO.",
    "..OO.Op<<<<<<pO.",
    "..O..OOp<<<<pOO.",
    ".....oOO.oo.OOo.",
    "................",
])

put('wild_arcticfox', [
    "................",
    ".........W..W...",
    "........WGWWGW..",
    "........WWWWWW..",
    "........WHkWWW..",
    "........WkkWWWk.",
    "........GWWWWG..",
    "..WW....GWWWW...",
    ".WWWG..WWWWWG...",
    ".WWGWWWWWWWWG...",
    "..GGWWWWWWWWG...",
    "...GWWWWWWWWG...",
    "....GWWWWWWG....",
    "...GW.GW.GW.GW..",
    "...GG.GG.GG.GG..",
    "................",
])

put('wild_snowyowl', [
    "................",
    "................",
    "....WW.....WW...",
    "....WWWWWWWWW...",
    "...WWWWWWWWWWW..",
    "...WYYYWWWYYYW..",
    "...YYkkYWYkkYY..",
    "...WYkkYyYkkYW..",
    "...WWYYWyWYYWW..",
    "...GWWWWWWWWWG..",
    "...GWnWWnWWnWG..",
    "...GGWWnWWnWWG..",
    "....GWnWWnWWG...",
    "....GGWWWWWGG...",
    ".....yy...yy....",
    "................",
])

put('wild_eagle', [
    "................",
    "................",
    ".........WWWW...",
    "........WWWWWW..",
    "........WWWHkWY.",
    "........WWWkkYYY",
    ".......WWWWWYYy.",
    "......OWWWWWYy..",
    "....OOooWWWW....",
    "...OoooOoooO....",
    "..OooOoooooO....",
    ".OooOooooooO....",
    "OooOoooooooO....",
    ".WOoooooooo.....",
    "WW....Y..Y......",
    "................",
])

put('wild_pika', [
    "................",
    "................",
    "................",
    "................",
    "................",
    "........MM..MM..",
    ".......MimMMimM.",
    ".......MmmmmmmM.",
    "......MmHkmHkmM.",
    ".....MmmkkmkkmM.",
    "....MmmmmmPmmmM.",
    "...MmmmmmmmmmM..",
    "...MmmmmmmmmMM..",
    "...MMmmmmmmMM...",
    "....NN.NN..NN...",
    "................",
])

put('wild_ibex', [
    "................",
    ".....mMmMm......",
    "....mMmMmMm.....",
    "...mM....mMm....",
    "...M......mMm...",
    "..........OmMO..",
    "..........OOOO..",
    "..........OHkpp.",
    "..........OkkpP.",
    "..OOOOOOOOOOOM..",
    ".OOOOOOOOOOOOM..",
    ".oOOOOOOOOOOo...",
    "..oo<<<<<<<oo...",
    "..oO.oO..oO.oO..",
    "..PP.PP..PP.PP..",
    "................",
])

grumpy('wild_goat', [(9, 3, 'g'), (10, 4, 'g'), (11, 4, 'g')])
grumpy('wild_yak', [(10, 4, 'P'), (11, 4, 'P'), (13, 5, 'P')])
grumpy('wild_marmot', [(7, 3, 'P'), (8, 4, 'P'), (10, 4, 'P'), (11, 3, 'P')])
grumpy('wild_arcticfox', [(9, 2, 'g'), (10, 3, 'g'), (11, 3, 'g')])
grumpy('wild_snowyowl', [(4, 4, 'n'), (5, 4, 'n'), (6, 5, 'n'), (10, 5, 'n'), (11, 4, 'n'), (12, 4, 'n')])
grumpy('wild_eagle', [(10, 2, 'n'), (11, 3, 'n'), (12, 3, 'n')])
grumpy('wild_pika', [(8, 6, 'P'), (9, 7, 'P'), (11, 7, 'P'), (12, 6, 'P')])
grumpy('wild_ibex', [(10, 5, 'P'), (11, 6, 'P'), (12, 6, 'P')])


# ================================================================ boss: huge grumpy moose (32x32, forest)
_land = 'forest'


def moose():
    c = Canvas(32, 32)
    FUR = ['O', 'o', 'o', 'P']
    # long legs with dark hooves (back pair darker)
    for (lx, back) in ((4, True), (8, False), (16, True), (20, False)):
        for y in range(23, 30):
            c.put(lx, y, 'o' if back else 'O'); c.put(lx + 1, y, 'P' if back else 'o')
        c.put(lx, 30, 'K'); c.put(lx + 1, 30, 'K')
        c.put(lx, 27, 'p' if not back else 'O')
    # big body with a shoulder hump
    c.ellipse(13, 19, 11, 6, FUR)
    c.ellipse(17, 14.5, 5.5, 4, FUR)
    # little tail
    c.put(1, 16, 'o'); c.put(2, 16, 'o')
    # neck + head + long droopy muzzle
    c.ellipse(21.5, 15, 3.5, 4.5, FUR)
    c.ellipse(24, 12.5, 4, 3.5, FUR)
    c.ellipse(27.5, 15.5, 3.4, 3, ['p', 'O', 'O', 'o'])
    c.put(29, 13, 'p')
    # dewlap bell under the chin
    c.stamp(["oo", "oo", "Po", ".P"], 24, 18)
    # ear
    c.stamp(["oO", "Po"], 20, 9)
    # big palmate antlers spreading both ways, light bone with shaded rims
    left = ["P.P.P.P.....",
            "<P<P<P<P....",
            "<<<<<<<<<...",
            "p<<<<<<<<<..",
            ".pp<<<<<<<<.",
            "...ppppp<<<<",
            "........pppp"]
    right = ["...P.P.P",
             "..P<P<P<",
             ".<<<<<<<",
             "<<<<<<<p",
             "<<<<<pp.",
             "<<ppp...",
             "pp......"]
    c.stamp(left, 10, 1)
    c.stamp(right, 23, 1)
    # tip highlights on the points
    for x in (10, 12, 14, 16):
        c.put(x, 1, '<')
    for x in (26, 28, 30):
        c.put(x, 1, '<')
    # antler bases into the head
    c.stamp(["pp", "pO"], 21, 7)
    c.stamp(["pp", "Op"], 23, 7)
    # eye with a heavy angry brow (high at the back, low at the front)
    c.stamp(["Hk", "kk"], 24, 12)
    for (x, y) in ((22, 10), (23, 10), (24, 11), (25, 11), (26, 12)):
        c.put(x, y, 'K')
    # nostril + grumpy downturned mouth
    c.put(29, 15, 'K'); c.put(30, 15, 'P')
    for x in (26, 27, 28):
        c.put(x, 17, 'K')
    c.put(25, 18, 'K'); c.put(29, 18, 'K')
    # shaggy fur marks
    for (x, y) in ((8, 16), (12, 15), (6, 20), (15, 21), (19, 18), (10, 22), (17, 13)):
        c.put(x, y, 'O' if y < 18 else 'P')
    return c


canvas_sprite('boss_moose', moose())


# ================================================================ boss: grumpy snow leopard (32x32, snow)
_land = 'snow'


def snowleopard():
    c = Canvas(32, 32)
    FUR = ['W', 'G', 'G', 'G', 'g']
    # long thick tail curling up behind
    path = [(7, 22), (5, 23.5), (3.5, 22), (3, 19), (3, 16), (3.5, 13), (4.5, 10), (6, 8), (8, 7.5), (9.5, 8.5)]
    for i, (x, y) in enumerate(path):
        r = 2.4 if i < 8 else 1.9
        c.ellipse(x, y, r, r, ['W', 'G', 'G', 'G', 'g'])
    # crouching body
    c.ellipse(14, 21, 10, 5.5, FUR)
    # legs + big fluffy paws
    for lx in (6, 10, 17, 21):
        c.rect(lx, 24, lx + 3, 27, 'G')
        c.put(lx, 24, 'W'); c.put(lx, 25, 'W'); c.put(lx + 1, 24, 'W')
        c.rect(lx, 28, lx + 3, 28, 'W')
        c.put(lx + 3, 28, 'G'); c.put(lx + 3, 27, 'g')
    # head
    c.ellipse(24.5, 15, 5.5, 5, FUR)
    c.ellipse(27, 18, 3.2, 2.2, ['W', 'W', 'G'])
    # pale cheeks / face mask so the eye shines read
    c.ellipse(25.5, 15.5, 3.6, 2.2, ['G', 'G', 'G'])
    # ears
    c.stamp([".G.", "GiG"], 20, 9)
    c.stamp([".G.", "GiG"], 26, 9)
    # dark rosettes on body + tail
    ros = [".n.", "n.n", ".n."]
    for (x, y) in ((8, 18), (13, 17), (18, 18), (10, 21), (15, 21), (20, 21), (6, 22)):
        c.stamp(ros, x, y)
    for (x, y) in ((3, 17), (3, 12), (7, 7)):
        c.stamp(["nn", "n."], x, y)
    for (x, y) in ((2, 21), (5, 9), (2, 14)):
        c.put(x, y, 'n')
    # tail tip dark
    c.put(10, 8, 'n'); c.put(11, 8, 'n'); c.put(10, 9, 'n')
    # small head spots
    for (x, y) in ((21, 12), (23, 11), (21, 14)):
        c.put(x, y, 'n')
    # eyes (pale green) with angry brows
    c.stamp(["Hk", "kk"], 23, 14)
    c.stamp(["Hk", "kk"], 27, 14)
    for (x, y) in ((22, 12), (23, 12), (24, 13), (27, 13), (28, 12), (29, 12)):
        c.put(x, y, 'K')
    # pink nose + frown
    c.stamp(["ii", ".I"], 26, 17)
    c.put(26, 19, 'K'); c.put(27, 19, 'K')
    c.put(25, 20, 'K'); c.put(28, 20, 'K')
    # whiskers
    c.put(30, 18, 'g'); c.put(30, 17, 'G')
    return c


canvas_sprite('boss_snowleopard', snowleopard())


# ================================================================ helpers (16x16, friendly)
_land = 'forest'

put('npc_stag', [
    "................",
    ".......<.<..<.<.",
    ".......p<p..p<p.",
    "........Ep...pE.",
    "......oO.OOOOO..",
    ".......OONNONNO.",
    "........OHkOHkO.",
    "........OkkOkkO.",
    ".........N<k<N..",
    "..N.....ONNzNNO.",
    ".NOOOOOOOOONNN..",
    "..OOOOOOOOOO....",
    "..O<<<<<<<OO....",
    "..O.O...O.O.....",
    "..P.P...P.P.....",
    "................",
])

_land = 'snow'

put('npc_goat', [
    "................",
    "...MMm....mMM...",
    "..M..mM..Mm..M..",
    "..M.NNNNNNNN.M..",
    ".mmNNNNNNNNNNmm.",
    "...NNHkNNHkNN...",
    "...NNkkNNkkNN...",
    "...NiNNMMNNiN...",
    "....NNWzzWNN....",
    "....RRWWWWRR..o.",
    "...RqRRWWRRqRRo.",
    "...NRRRRRRRRro..",
    "...NNNNNNNNNro..",
    "...mNNNNNNNmro..",
    "....mM...mM..o..",
    "................",
])


# ================================================================ items (12x12)
_land = 'forest'

put('item_mushroom', [
    "............",
    "..-......-..",
    "....VVVV....",
    "..VwwVVVVV..",
    ".Vw+wVV+VVv.",
    ".VVVV+VVVvv.",
    "..vvvvvvvv..",
    "....N-Nm....",
    "....NNNm....",
    "...NNNNmm...",
    ".-.......-..",
    "............",
], 12)

put('food_honey', [
    "............",
    "......P.....",
    "......o.....",
    "...OOOoOO...",
    "..OYYYYYYO..",
    "..pYuYYyYp..",
    ".pOYOOYOyOo.",
    ".pOOOYOOOOo.",
    ".pO<<<<<<Oo.",
    ".pOOOOOOOOo.",
    "..oOOOOOOo..",
    "............",
], 12)

put('food_pinenuts', [
    "............",
    "....o.......",
    "...OpO......",
    "..OpOpO.....",
    "..oOpOo.....",
    "..OoOoO.....",
    "...oOo..N<..",
    "....o..<Nm..",
    "...N<..N<m..",
    "..<Nm<N.mm..",
    "...mm<Nm....",
    "......mm....",
], 12)

put('food_honeycake', [
    "............",
    "............",
    "........NN..",
    "......NNNNH.",
    "....NNYNNNN.",
    "..NNNNNNYNN.",
    ".YYNYYYYYYY.",
    ".p<<<<<<<<p.",
    ".YYYyYYYyYY.",
    ".p<<<<<<<<p.",
    ".OOOOOOOOOO.",
    "............",
], 12)

put('food_soup', [
    "....W...W...",
    "...W...W....",
    "....W...W...",
    "...W...W....",
    "..p<<N<<p...",
    ".R<NO<<<NOR.",
    ".RqRRRRRRRR.",
    ".RNRRNRRNRr.",
    "..RRRRRRRr..",
    "...rrrrrr...",
    "............",
    "............",
], 12)

_land = 'snow'

put('item_crystal', [
    "............",
    ".....A......",
    "....AAc..H..",
    "....A{c.....",
    "....A{ch....",
    "....A{ch....",
    "..A.A{chc...",
    ".A{.A{ch{h..",
    ".A{hA{chch..",
    ".A{hA{chch..",
    "..hhhhhhhh..",
    "............",
], 12)

put('food_cocoa', [
    "....G.......",
    "...G..G.....",
    "....G..G....",
    "...WH.G.....",
    "..BWWoooB...",
    "..cBBBBBbbb.",
    "..cBBBBBb.b.",
    "..cWWWWWbbb.",
    "..cBBBBBb...",
    "..cBBBBBb...",
    "...bbbbb....",
    "............",
], 12)

put('item_charm_scarf', [
    ".....M......",
    "....YuY.....",
    "...RRRRRr...",
    "..RqRRRRRr..",
    "..RqR.RRRr..",
    "..WWW.RRRr..",
    "..RqR..WWWr.",
    "..RqR..RRRr.",
    "..WWW..RRRr.",
    "..RqR..WWWr.",
    "..R.R..RRRr.",
    "..r.r..r.r..",
], 12)

soft_outline('item_mushroom', '-')
soft_outline('food_soup', 'W')
soft_outline('item_crystal', 'H')
soft_outline('food_cocoa', 'G')


# ================================================================ forest props
_land = 'forest'


def canopy_rim(c, keys, rim='@'):
    """Darken the lowest leaf pixel of every column so the canopy sits on its shadow."""
    for x in range(c.w):
        for y in range(c.h - 1, -1, -1):
            if c.get(x, y) in keys:
                if c.get(x, y + 1) not in keys:
                    c.put(x, y, rim)
                break


def enchanted_oak():
    c = Canvas(32, 32)
    # thick dark gnarled trunk with spreading roots
    c.rect(12, 18, 19, 28, 'o')
    for y in range(18, 29):
        c.put(12, y, 'O'); c.put(13, y, 'o'); c.put(18, y, 'P'); c.put(19, y, 'P')
        if y % 3 == 0:
            c.put(15, y, 'P')
        if y % 4 == 1:
            c.put(16, y, 'O')
    c.stamp(["Oo..........oP", "PoOo......OoPP", "..PP......PP.."], 9, 27)
    # a little glowing knot-hole
    c.stamp(["PP", "Pw"], 15, 22)
    # mossy ground patch
    for x in range(7, 25):
        c.put(x, 30, 'Z' if x % 3 else '9')
    # lush canopy: deep green clumps, then brighter teal-green clumps up-left
    DARK = ['e', 'F', 'F', '@']
    for (cx, cy, rx, ry) in ((16, 11.5, 14.5, 9), (6, 13, 5.5, 5.5), (26, 13, 5.5, 5.5),
                             (10, 6, 7, 5.5), (22, 6, 7, 5.5), (16, 17, 11, 4.5), (16, 3.5, 6, 3)):
        c.ellipse(cx, cy, rx, ry, DARK)
    LIGHT = ['E', 'E', 'e', 'F']
    for (cx, cy, rx, ry) in ((10, 5.5, 4.5, 3.4), (19, 4, 4, 2.6), (5, 11.5, 3, 3), (14, 10.5, 4, 3.2),
                             (24, 10, 3.8, 3), (20, 15.5, 3.6, 2.6), (9, 16, 3, 2.4)):
        c.ellipse(cx, cy, rx, ry, LIGHT)
    for (cx, cy, rx, ry) in ((9, 4.5, 2, 1.4), (18, 3.5, 1.8, 1.2), (13, 9.5, 1.8, 1.3), (23, 9, 1.6, 1.2)):
        c.ellipse(cx, cy, rx, ry, ['+', '+', '='])
    canopy_rim(c, 'fEeF@+=')
    # tiny glowing dots: mint, lilac and starlight
    for (x, y, ch) in ((6, 8, '-'), (12, 13, 'w'), (17, 7, '-'), (21, 12, 'u'), (27, 11, 'w'),
                       (4, 15, 'u'), (25, 6, '-'), (15, 16, '-'), (9, 11, 'w'), (20, 2, 'u'), (29, 15, '-')):
        c.put(x, y, ch)
    # glowing moss + two tiny mushrooms at the roots
    c.stamp([".w.", "wVw", ".N."], 8, 27)
    c.stamp([".+.", "+=+", ".N."], 21, 27)
    return c


canvas_sprite('prop_oak', enchanted_oak())


def honey_tree():
    c = Canvas(32, 32)
    c.rect(13, 18, 18, 28, 'O')
    for y in range(18, 29):
        c.put(13, y, 'p'); c.put(17, y, 'o'); c.put(18, y, 'o')
        if y % 3 == 1:
            c.put(15, y, 'o')
    c.stamp(["pO........Oo", "PoO......OoP"], 10, 28)
    for x in range(8, 24):
        c.put(x, 30, 'Z' if x % 3 else '9')
    # a branch reaching right to hold the hive
    c.line(18, 17, 25, 14, 'o', thick=1)
    c.line(18, 18, 25, 15, 'O', thick=1)
    for (cx, cy, rx, ry) in ((15, 10.5, 13, 8.5), (6, 12, 5, 5), (24, 11, 5.5, 4.5),
                             (10, 5.5, 6.5, 5), (20, 5.5, 6.5, 5), (15, 15, 9, 4)):
        c.ellipse(cx, cy, rx, ry, ['E', 'e', 'F', '@'])
    for (cx, cy, rx, ry) in ((10, 5, 4, 3), (19, 4, 3.5, 2.5), (5, 10.5, 2.8, 2.4), (14, 9.5, 3.4, 2.6), (23, 9, 3, 2.2)):
        c.ellipse(cx, cy, rx, ry, ['f', 'E', 'E', 'e'])
    canopy_rim(c, 'fEeF@')
    # striped beehive hanging under the branch
    hive = ["..UU..",
            ".yYYy.",
            "yuYYYy",
            "UUUUUU",
            "yYYYYy",
            "yYkkYy",
            "UUkkUU",
            ".yYYy.",
            "..UU.."]
    c.stamp(hive, 22, 15)
    c.put(24, 14, 'o'); c.put(25, 14, 'o')
    # honey drip + buzzing bees
    c.put(25, 24, 'Y'); c.put(25, 25, 'y')
    for (bx, by) in ((28, 17), (19, 21), (29, 22)):
        c.stamp(["Hu", "Yk"], bx, by)
    return c


canvas_sprite('prop_honeytree', honey_tree())


def glowshroom():
    c = Canvas(16, 16)
    # three little glowing mushrooms of different heights
    c.stamp([".+++.", "+-+-+", "=+++=", "..N..", "..N..", "..N..", ".NNN."], 2, 6)
    c.stamp(["..www..", ".wVwwVw", "wwwVwwV", "VVVVVVv", "...N...", "...N...", "...Nm..", "..NNm.."], 6, 4)
    c.stamp([".--.", "-+-=", "====", ".N..", "NNm."], 11, 9)
    # glow specks floating around
    for (x, y) in ((1, 3), (5, 2), (14, 5), (12, 2), (9, 1)):
        c.put(x, y, '-')
    # moss tuft
    for x in range(2, 15):
        c.put(x, 13, 'Z' if x % 2 else '9')
    return c


canvas_sprite('prop_glowshroom', glowshroom())
soft_outline('prop_glowshroom', '-')

put('prop_fern', [
    "................",
    "................",
    ".......f........",
    "...f...Ef...f...",
    "..fE..fEf..Ef...",
    "..Ef.fE.Ef.fE.f.",
    ".fE..E...E..Ef..",
    ".E..fE...Ef..Ef.",
    "...fE.f.f.Ef..E.",
    "..fE.fE.Ef.Ef...",
    ".fE..E.f.E..Ef..",
    ".E..E..E..E..E..",
    "...e..eEe..e....",
    "....eeEEEee.....",
    ".....ZZZZZ......",
    "................",
])


def log_body(c, x0, x1, y0, y1):
    """Horizontal bark log with grooves."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            t = (y - y0) / (y1 - y0)
            ch = 'O' if t < 0.35 else 'o' if t < 0.8 else 'P'
            if y == y0:
                ch = 'p'
            c.put(x, y, ch)
    for x in range(x0 + 2, x1, 4):
        for y in range(y0 + 1, y1):
            if (x + y) % 3:
                c.put(x, y, 'P' if y > y0 + 2 else 'o')


def hollowlog():
    c = Canvas(24, 24)
    log_body(c, 2, 18, 9, 18)
    c.ellipse(2.5, 13.5, 1.6, 4.6, ['O', 'o', 'P'])
    # cut end facing us on the right: wood ring with a dark hollow
    c.ellipse(19, 13.5, 3.8, 5, ['<', 'p', 'p', 'O'])
    c.ellipse(19.3, 13.8, 2.2, 3.3, [':'])
    c.put(18, 11, 'P'); c.put(19, 11, 'P')
    # moss blanket + little mushroom on top
    for x in range(4, 16):
        c.put(x, 9, 'Z' if x % 3 else '9')
        if x % 4 == 1:
            c.put(x, 10, 'Z')
    c.stamp([".iRi", "RRHR", "..N."], 6, 6)
    c.stamp(["+=", ".N"], 13, 7)
    # grass at the base
    for x in range(1, 23):
        c.put(x, 19, '9' if x % 2 else 'X')
    return c


canvas_sprite('prop_hollowlog', hollowlog())


def hollowlog_open():
    c = Canvas(24, 24)
    # the log has split lengthwise into two half-pipes that rolled apart,
    # pale inner wood showing in each open trough
    for cx in (5.5, 18.5):
        c.ellipse(cx, 13, 5.2, 5.4, ['O', 'o', 'o', 'P'], mask=lambda x, y: y >= 13)
        c.ellipse(cx, 12.8, 5.2, 2.6, ['<'])
        c.ellipse(cx, 13, 3.8, 1.7, ['P'])
        c.ellipse(cx + 0.5, 13.6, 3.0, 1.0, ['o'])
        for x in range(int(cx) - 3, int(cx) + 4, 3):
            c.put(x, 16, 'P'); c.put(x, 17, 'P')
    # splinters + wood chips flying
    for (x, y) in ((11, 10), (12, 9), (11, 16), (12, 17), (3, 8), (20, 8), (12, 13)):
        c.put(x, y, 'p')
    # sparkle where something was hidden
    c.stamp(["..u..", ".uYu.", "uYHYu", ".uYu.", "..u.."], 9, 2)
    for x in range(0, 24):
        c.put(x, 19, '9' if x % 2 else 'X')
    return c


canvas_sprite('prop_hollowlog_open', hollowlog_open())


def fairyring():
    c = Canvas(24, 24)
    # slightly brighter grass ring
    for i in range(80):
        a = i / 80 * math.tau
        c.put(int(12 + 9.5 * math.cos(a)), int(13 + 6.5 * math.sin(a)), 'Z')
    # little mushrooms around the ring (back row smaller, front row bigger)
    small = [".V.", "VwV", ".N."]
    big = [".VV.", "VwwV", "VVVv", ".NN."]
    for i in range(9):
        a = i / 9 * math.tau + 0.3
        x = int(12 + 9.5 * math.cos(a)) - 1
        y = int(13 + 6.5 * math.sin(a)) - 2
        m = big if math.sin(a) > 0.2 else small
        if i % 3 == 1:
            m = [r.replace('V', '+').replace('w', '-').replace('v', '=') for r in m]
        c.stamp(m, x, y)
    # sparkles dancing in the middle
    for (x, y, ch) in ((11, 11, 'u'), (12, 10, 'H'), (12, 11, 'u'), (12, 12, 'u'), (13, 11, 'u'),
                       (8, 13, '-'), (15, 14, 'u'), (10, 15, '-'), (16, 10, '-'), (12, 4, '-'), (4, 6, 'u')):
        c.put(x, y, ch)
    return c


canvas_sprite('prop_fairyring', fairyring())
soft_outline('prop_fairyring', 'Zu-H')

put('prop_forestsign', [
    "................",
    "................",
    "..ZZpppppppp....",
    "...Z<<<<<<<<pp..",
    "...pOpOOpOOppOp.",
    "...pOOpOOpOOpOO.",
    "...oooooooooOo..",
    "...ooooooooooo..",
    ".......pOo......",
    ".......pOo......",
    ".......pOo......",
    ".......pOZ......",
    ".......pOo......",
    "......ZpOoZ.....",
    "....ZZ9ZZ9ZZ9...",
    "................",
])


# ================================================================ snow props
_land = 'snow'


def snowy_pine():
    c = Canvas(32, 32)
    # trunk
    c.rect(14, 25, 17, 29, 'o')
    for y in range(25, 30):
        c.put(14, y, 'O'); c.put(17, y, 'P')
    # four stacked tiers, each a wide triangle of dark green with a snow cap
    tiers = [(3, 10, 4), (8, 16, 6), (13, 22, 8), (18, 27, 10.5)]
    for (top, bot, half) in tiers:
        for y in range(top, bot + 1):
            t = (y - top) / (bot - top)
            hw = 1 + t * half
            for x in range(int(15.5 - hw), int(16.5 + hw) + 1):
                ch = 'e' if x < 15 else 'F' if x < 19 else '@'
                c.put(x, y, ch)
        # snow sitting on the upper part of the tier, drooping edge
        for y in range(top, top + 3):
            t = (y - top) / (bot - top)
            hw = 1 + t * half
            for x in range(int(15.5 - hw), int(16.5 + hw) + 1):
                if y < top + 2 or (x % 3 != 0):
                    c.put(x, y, 'W' if x < 17 else 'A')
        hw = 1 + half
        # snowy tips at the tier's ends
        c.put(int(15.5 - hw), bot, 'W'); c.put(int(16.5 + hw), bot, 'A')
    # star-ish snow tuft on the top
    c.stamp([".W.", "WHW"], 15, 1)
    # snow at the foot
    c.ellipse(16, 29.5, 9, 1.8, ['W', 'A', '{'])
    return c


canvas_sprite('prop_pine', snowy_pine())


def snowrock():
    c = Canvas(24, 24)
    ROCK = ['G', 'g', 'g', 'n', 'n']
    c.ellipse(12, 20.5, 10, 2.2, ['{', '{', 'c'])
    c.ellipse(12, 13, 10, 7.5, ROCK)
    c.ellipse(7, 15, 4, 4, ['g', 'g', 'n', 'n'])
    # snow cap with a lumpy drooping edge
    c.ellipse(11.5, 8.5, 8.5, 3.6, ['H', 'W', 'W', 'A'], mask=lambda x, y: c.get(x, y) != '.' or y < 8)
    for (x, y) in ((5, 10), (8, 11), (12, 11), (15, 10), (18, 10), (9, 11)):
        c.put(x, y, 'W')
    c.put(12, 12, 'A'); c.put(8, 12, 'A')
    # cracks + speckles
    for (x, y) in ((15, 14), (16, 15), (16, 16), (17, 17), (9, 17), (13, 18)):
        c.put(x, y, 'n')
    c.put(6, 14, 'G'); c.put(19, 13, 'G')
    return c


canvas_sprite('prop_snowrock', snowrock())


def snowpile():
    c = Canvas(16, 16)
    c.ellipse(7.5, 12.5, 7.2, 5.2, ['H', 'W', 'A', '{'], mask=lambda x, y: y <= 13)
    for x in range(1, 15):
        c.put(x, 14, '{' if 2 < x < 13 else 'c')
    c.put(1, 14, '.'); c.put(14, 14, '.')
    for x in range(1, 15):
        if c.get(x, 13) != '.':
            c.put(x, 13, 'c' if x in (1, 14) else '{')
    # soft blue rim so it shows on snow
    for y in range(6, 14):
        for x in range(16):
            if c.get(x, y) != '.' and (c.get(x - 1, y) == '.' or c.get(x + 1, y) == '.'):
                c.put(x, y, 'c')
    for x in range(16):
        for y in range(16):
            if c.get(x, y) != '.':
                if c.get(x, y - 1) == '.':
                    c.put(x, y, 'c' if x < 3 or x > 12 else '{')
                break
    # golden twinkle hint: something is buried here
    c.stamp(["..Y..", ".uYu.", "YYHYY", ".uYu.", "..Y.."], 9, 2)
    c.put(4, 9, 'Y'); c.put(5, 10, 'u')
    c.put(3, 5, 'u'); c.put(3, 4, 'Y'); c.put(2, 5, 'Y')
    return c


canvas_sprite('prop_snowpile', snowpile(), outline=False)


def snowpile_dug():
    c = Canvas(16, 16)
    c.ellipse(7.5, 10, 7.4, 4, ['W', 'A', 'A', '{'])
    c.ellipse(7.5, 10.5, 4.6, 2.4, ['b'])
    c.ellipse(7.5, 11, 3.4, 1.6, ['C'])
    for x in range(16):
        for y in range(16):
            if c.get(x, y) in 'WA{' and ('.' in (c.get(x - 1, y), c.get(x + 1, y), c.get(x, y + 1))):
                c.put(x, y, 'c')
    for x in range(3, 13):
        if c.get(x, 8) == 'b':
            c.put(x, 8, 'h')
    # tossed snow lumps
    c.stamp([".W.", "WAc"], 11, 4)
    c.stamp(["W", "c"], 2, 5)
    return c


canvas_sprite('prop_snowpile_dug', snowpile_dug(), outline=False)


def igloo():
    c = Canvas(32, 32)
    # dome of ice blocks
    c.ellipse(15, 22, 13, 13, ['H', 'W', 'W', 'A', '{'], mask=lambda x, y: y <= 26)
    for y in range(10, 27):
        row = (y - 10) // 3
        for x in range(2, 29):
            if c.get(x, y) == '.':
                continue
            if (y - 10) % 3 == 0:
                c.put(x, y, '{' if x > 15 else 'A')
            elif (x + row * 3) % 6 == 0:
                c.put(x, y, '{' if x > 15 else 'A')
    # entrance tunnel sticking out to the front-right
    for y in range(18, 27):
        for x in range(19, 30):
            if (x - 24.5) ** 2 / 30 + (y - 26) ** 2 / 64 <= 1:
                c.put(x, y, 'W' if x < 26 else 'A')
    for x in range(19, 30):
        if c.get(x, 22) != '.':
            c.put(x, 22, '{')
    # dark doorway
    for y in range(21, 27):
        for x in range(21, 28):
            if (x - 24) ** 2 / 9 + (y - 26.5) ** 2 / 25 <= 1:
                c.put(x, y, 'C' if x < 25 else 'b')
    # snow ground
    for x in range(1, 31):
        c.put(x, 27, 'A' if x % 4 else '{')
    # little icicles + chimney hole steam stays simple: a flag pole on top
    c.put(15, 6, 'o'); c.put(15, 7, 'o'); c.put(15, 8, 'o')
    c.stamp(["RR", "R."], 16, 5)
    return c


canvas_sprite('prop_igloo', igloo())

put('prop_snowsign', [
    "................",
    "....WWWWWW......",
    "..WWHWWWWWWW....",
    "...pAWAWWAWWpp..",
    "...pOpOOpOOppOp.",
    "...pOOpOOpOOpOO.",
    "...oooooooooOo..",
    "...ooooooooooo..",
    ".......pOo......",
    ".......pOo......",
    ".......pOo......",
    ".......pOo......",
    ".......pOo......",
    "......WpOoW.....",
    "....WWWWAWWAA...",
    "................",
])

put('prop_snowman', [
    "................",
    "......KKK.......",
    ".....KDDDK......",
    "....KKKKKKK.....",
    ".....WHWWW......",
    ".....WkWkW......",
    ".....WW77777....",
    ".....WkkkW......",
    "....RRRRRRR.....",
    ".o.WWRqWWWWW.o..",
    "..oWWWRWWkWWo...",
    "...WWWRWWWWA....",
    "...WWWWWWkWA....",
    "...AWWWWWWAA....",
    "....AAAAAAA.....",
    "................",
])


# ================================================================ village festival bunting (32x16)

def bunting():
    c = Canvas(32, 16)
    cols = ['R', 'Y', 'B', 'E', '>', 'R', 'Y', 'B', 'E']
    sag = lambda x: 2 + int(round(3 * math.sin((x - 1) / 29 * math.pi)))
    # little posts at both ends
    for px in (1, 30):
        for y in range(1, 15):
            c.put(px, y, 'O' if px == 1 else 'o')
        c.put(px, 15, 'P')
    # triangle flags hanging from the rope
    for i, fx in enumerate(range(3, 27, 4)):
        ch = cols[i % len(cols)]
        light = {'R': 'q', 'Y': 'u', 'B': 'c', 'E': 'f', '>': '?'}[ch]
        dark = {'R': 'r', 'Y': 'y', 'B': 'b', 'E': 'e', '>': 'I'}[ch]
        y = sag(fx + 1) + 1
        c.stamp([light + ch + ch + dark, light + ch + ch + dark, '.' + ch + dark + '.', '.' + ch + dark + '.', '..' + dark + '.'], fx, y)
    # the rope sags between the posts (drawn over the flag tops)
    for x in range(1, 31):
        c.put(x, sag(x), 'p')
    return c


canvas_sprite('prop_bunting', bunting())
LAND['prop_bunting'] = 'snow'
