"""Animal Kingdom Quest part 2 (desert): grumpy desert animals, tortoise boss,
oasis-village folk, food/charm items and desert/village props. Characters face RIGHT."""
import math
from draw import Canvas
SPRITES = {}


def put(name, rows, w=None, outline=True):
    """Rows may be written short; they are padded with '.' to the sprite width."""
    h = len(rows)
    w = w or h
    for i, r in enumerate(rows):
        if len(r) > w:
            raise SystemExit(f'src_desert {name}: row {i} has len {len(r)} (max {w}): {r!r}')
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


# ================================================================ grumpy desert animals (16x16)

put('wild_camel', [
    "................",
    "..........o.....",
    ".........pppp...",
    "........pPPpppp.",
    "........pHkPppp.",
    "...pp...pkkpppP.",
    "..p<pp..pppppo..",
    ".p<<ppp.ppp.....",
    ".pppppppppp.....",
    "Opppppppppp.....",
    ".pppppppppO.....",
    ".OOOOOOOOO......",
    "..pO.pO.pO.pO...",
    "..pO.pO.pO.pO...",
    "..oo.oo.oo.oo...",
    "................",
])

put('wild_fennec', [
    "................",
    "......^.....^...",
    ".....^i^...^i^..",
    ".....^ii^.^ii^..",
    ".....^ii^^^ii^..",
    ".....^T^^^^^T^..",
    "......^HkT^Hk^..",
    "..<^..^kk^^kk^..",
    ".<^^..<<<^^<<<..",
    ".^^T...<<<k<<...",
    ".^^T^^^^^<<<....",
    "..T^^^^^^<<^....",
    "...^^^^^^^^T....",
    "...^^T^^^^TT....",
    "...^<.^<..^<....",
    "................",
])

put('wild_meerkat', [
    "................",
    "........ppp.....",
    ".......ppppp....",
    "......pOpOpppp..",
    "......pPHPkpppO.",
    "......pPkPkp<<k.",
    "......ppp<<<<...",
    "......Op<<<p....",
    ".....OOp<<<pO...",
    ".....Op<<<<pO...",
    "....OOp<<<<p....",
    "...OO.p<<<<p....",
    "..OO..pp<<pp....",
    ".O....pO..pO....",
    ".....oOO.oOO....",
    "................",
])

put('wild_gecko', [
    "................",
    "................",
    "................",
    "................",
    "..........EEEE..",
    ".........EHkEEE.",
    ".........EkkEEe.",
    "...EEEEEEEEEEe..",
    "..EEYEEEYEEEE...",
    ".EfEEEYEEEEe....",
    ".E.EEe...EEe....",
    ".E.e.e..e.e.....",
    "..EE............",
    "................",
    "................",
    "................",
])

put('wild_armadillo', [
    "................",
    "................",
    "................",
    ".....mmmmmm.....",
    "....mNmNmNmm....",
    "...mNMmMmMmMm.ss",
    "..mmMmMmMmMmMsss",
    "..mMmMmMmMmMszHk",
    "..mMmMmMmMmMsskk",
    ".smMmMmMmMmMssss",
    "ss.MMMMMMMMMsss.",
    "....sz..sz......",
    "....zz..zz......",
    "................",
    "................",
    "................",
])

put('wild_vulture', [
    "................",
    "..........ii....",
    ".........iiIi...",
    ".........kHkiy..",
    ".........kkIiyy.",
    ".........iiIiU..",
    "........NNNNN...",
    ".......NNNmN....",
    "....DDKKKKKK....",
    "...DdDKKKKKK....",
    "..DdDKKKDKKK....",
    ".DdDKKKDKKKK....",
    "DdDKKKDKKKKD....",
    ".DKKKDDKKKD.....",
    "....DD..yy.y....",
    "................",
])

put('wild_scorpion', [
    "................",
    "....7777........",
    "...7^^^^7.......",
    "..7^TTTT^7......",
    "..7^T...TN......",
    "..7^T....N......",
    "...7^T.....7.7..",
    "...7^T....7^7^7.",
    "....7^7....777..",
    "....7^^7777.7...",
    "...7^^^^^HkT7...",
    "...7^^^^^kk77...",
    "....T7777777....",
    "....T.T.T.T.....",
    "................",
    "................",
])

put('wild_jackrabbit', [
    "................",
    "........mm..mm..",
    "........mim.mim.",
    "........mim.mim.",
    ".........mimmim.",
    ".........mmmmmm.",
    "........mmHkMmm.",
    "........mmkkmmi.",
    "..N.....mmmmmNN.",
    ".NN...mmmmmmNN..",
    "..N.mmmmmmmmN...",
    "...mmmmmmmmNN...",
    "...MmmmmmmmN....",
    "...MMmmmMmmm....",
    "..MMM.Mm..NN....",
    "................",
])


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


grumpy('wild_meerkat', [(8, 3, 'P'), (9, 3, 'P'), (10, 4, 'P')])
grumpy('wild_gecko', [(10, 4, 'j'), (11, 4, 'j'), (12, 5, 'j')])
grumpy('wild_armadillo', [(14, 6, 'z'), (15, 6, 'z')])
grumpy('wild_vulture', [(9, 2, 'I'), (10, 2, 'I'), (11, 3, 'I')])
grumpy('wild_scorpion', [(9, 9, 'T'), (10, 9, 'T')])
grumpy('wild_jackrabbit', [(9, 5, 'M'), (10, 5, 'M'), (11, 5, 'M')])


# ================================================================ boss: grumpy old desert tortoise (32x32)

def tortoise():
    c = Canvas(32, 32)
    SKIN = ['m', 'M', 'M', 'M']
    # stumpy round legs with pale toenails
    for lx in (4, 11, 18):
        c.ellipse(lx + 2.5, 25, 3, 4.5, SKIN)
        for x in range(lx, lx + 5):
            c.put(x, 28, 'M')
        for x in (lx, lx + 2, lx + 4):
            c.put(x, 28, 'N')
        c.put(lx + 1, 24, 'M'); c.put(lx + 3, 26, 'M')
    # tall domed shell
    c.ellipse(13, 15, 12, 10.5, ['p', 'O', 'O', 'o', 'o'], mask=lambda x, y: y <= 21)
    for x in range(1, 26):
        if c.get(x, 21) != '.' or c.get(x, 20) in 'pOo':
            c.put(x, 21, 'P')
            c.put(x, 22, 'o' if x % 3 else 'P')
    for x in range(2, 25, 3):
        c.put(x, 20, 'P')
    scutes = [(13, 7, 3, 2), (8, 10.5, 3, 2.2), (18, 10.5, 3, 2.2),
              (4, 15.5, 2.3, 2.2), (11, 15.5, 3, 2.4), (18, 15.5, 2.8, 2.4), (23, 15, 1.4, 2)]
    for (cx, cy, rx, ry) in scutes:
        c.ellipse(cx, cy, rx + 1.2, ry + 1.2, ['P'], mask=lambda x, y: c.get(x, y) in 'pOo')
    for (cx, cy, rx, ry) in scutes:
        c.ellipse(cx, cy, rx, ry, ['<', 'p', 'p', 'O'])
        c.put(int(cx), int(cy), 'O')
    for x in range(1, 26):
        for y in range(4, 21):
            if c.get(x, y) == 'O' and (x + y) % 2 == 0:
                c.put(x, y, 'o')
    # neck + big wrinkly head poking out to the right
    c.ellipse(22.5, 19, 4, 2.8, SKIN)
    c.ellipse(25.5, 14.5, 5, 5, SKIN)
    c.ellipse(28, 16.5, 2.6, 2.4, SKIN)
    for (x, y) in ((21, 18), (22, 20), (23, 19), (21, 15), (22, 17)):
        c.put(x, y, 'M')
    # eye
    c.stamp(["Hk", "kk"], 26, 13)
    # bushy white frowning brow: high at the back, low over the front of the eye
    c.stamp(["NWW...", "NNWWW.", "..NWWW"], 23, 10)
    # nostril and a grumpy downturned mouth
    c.put(29, 14, 'P')
    for x in range(25, 31):
        c.put(x, 17, 'P')
    c.put(24, 18, 'P')
    # little tail
    c.put(0, 20, 'M'); c.put(1, 20, 'M')
    return c


canvas_sprite('boss_tortoise', tortoise())


# ================================================================ oasis village folk (16x16, friendly)

put('npc_mole', [
    "................",
    "......mmmmm.....",
    ".....mNNNNNm....",
    "....MMMMMMMMMM..",
    ".....DDDDDDDD...",
    "....DDDDDDDDDD..",
    "....DDGGGDGGGD..",
    "....DGHkGGHkGD..",
    "....DDGGGDGGGDi.",
    "....DDDDDDDDDiI.",
    "...DDDDDDiiDDD..",
    "..DDDDDDDDDDD...",
    ".iiDDDNNNNDDDii.",
    "...DDDDNNDDDDD..",
    "...ii.DD..DD.ii.",
    "................",
])

put('npc_chef_raccoon', [
    "................",
    "....WWW.WWW.....",
    "...WWWWWWWWWW...",
    "...WWWWWWWWGW...",
    "....WWWWWWWG....",
    "..g.GGGGGGGG.g..",
    ".gnGGGGGGGGGGng.",
    "..KKKKKGGKKKKK..",
    ".GKHkKKGGKHkKKG.",
    ".GKkkKKGGKkkKKG.",
    "..GKKWWWWWWKKG..",
    "...GWWWkkWWWG...",
    "...gGGWkkWGGg...",
    "..gGGGWWWWGGGg..",
    "...nn..nn..nn...",
    "................",
])

put('npc_hedgehog', [
    "................",
    "......O.O.O.....",
    "....OoOoOoOoO...",
    "...OoPoOoPoO....",
    "..OoOoOoOoS<<...",
    "..PoOoPoOS<<<<..",
    ".OoOoOoO<HkS<<..",
    "..OPoOoO<kkS<<k.",
    ".OoOoOoO<<<<<<i.",
    "..PoOoOS<<ii<<..",
    ".OoOPoO<cccccc..",
    "..OoOoO<cWccc...",
    "...OoOo<cccccc..",
    "....OO<<cccBc...",
    ".....<<..<<.....",
    "................",
])

put('npc_camel', [
    "................",
    "..........ooo...",
    ".........ppppp..",
    "........pppppp..",
    "........pHkppppp",
    "...pp...pkkpp<<p",
    "..p<pp..pppp<<k.",
    ".p<<ppp.pppppp..",
    ".ppppppp>?>?>...",
    "Oppppppp>>?>>>..",
    ".pppppppp>>.>?..",
    ".OOOOOOOOO..>...",
    "..pO.pO.pO.pO...",
    "..pO.pO.pO.pO...",
    "..oo.oo.oo.oo...",
    "................",
])


# ================================================================ items (12x12)

put('food_date', [
    "............",
    "............",
    "....OO......",
    "...OpOo.....",
    "...OOoo.....",
    "...Oooo.Oo..",
    "...oooP.pOo.",
    "....oP..OOoo",
    "........oooP",
    ".........oP.",
    "............",
    "............",
], 12)

put('food_cactusfruit', [
    "............",
    "......E.....",
    ".....EfE....",
    "....>?>>....",
    "...>?H>>I...",
    "...>>N>I>I..",
    "...>I>>>NI..",
    "...>>>N>II..",
    "....I>>II...",
    ".....III....",
    "............",
    "............",
], 12)

put('food_salad', [
    "............",
    "............",
    "....fE.R....",
    "..YqREYRqi..",
    "..uYR>>EYi..",
    ".RqYEfR>uYR.",
    ".WWWWWWWWWW.",
    ".cAAAAAAAAc.",
    "..cAAAAAAc..",
    "...cccccc...",
    "............",
    "............",
], 12)

put('food_bread', [
    "............",
    "............",
    "............",
    "....pppp....",
    "..ppYpYpYp..",
    ".p<pYppYppO.",
    ".pppppppppO.",
    ".OpOpOpOpOo.",
    ".OOOOOOOOOo.",
    "..oooooooo..",
    "............",
    "............",
], 12)

put('food_juice', [
    "............",
    "........G...",
    ".......G....",
    "..WWWWGWW...",
    "..A>>>G>A...",
    "..A?>>G>A...",
    "..A?>>>>A...",
    "...A>>>>A...",
    "...A?>>A....",
    "...AAAAA....",
    "............",
    "............",
], 12)

put('item_fossil', [
    "............",
    "............",
    "....NNNN....",
    "...NmMMmN...",
    "..NmNNNMmN..",
    "..NMNMmNMN..",
    "..NMmNNmMN..",
    "...NMMMMN...",
    "..ppNNNNpp..",
    ".p<<pppppOO.",
    ".OOOOOOOOOo.",
    "............",
], 12)

put('item_charm_heart', [
    "............",
    "....M.......",
    "....M.......",
    "....M.......",
    "...YuY......",
    "..RR.RR.....",
    ".RqHRRRr....",
    ".RqRRRRr....",
    "..RRRRr.....",
    "...RRr......",
    "....r.......",
    "............",
], 12)

put('item_charm_clover', [
    "............",
    ".....M......",
    ".....M......",
    "....YuY.....",
    "..ff...ff...",
    ".fEEf.fEEe..",
    ".EEEEYEEEe..",
    "...EYuYe....",
    ".fEEEYEEEe..",
    ".eEEe.eEEe..",
    "..ee.e.ee...",
    "......e.....",
], 12)

put('item_charm_boot', [
    "............",
    "............",
    "..W..BBBB...",
    ".WW..cBBB...",
    "WWWW.cBBB...",
    ".WWWWcBBB...",
    "..GWGcBBB...",
    "....GcBBBB..",
    ".....cBBBBB.",
    "....cBBBBBBb",
    "....WWWWWWW.",
    "............",
], 12)


# ================================================================ props

def saguaro():
    c = Canvas(24, 24)
    CAC = ['f', 'E', 'e', 'F']

    def column(x0, x1, y0, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                t = (x - x0) / max(1, x1 - x0)
                c.put(x, y, 'f' if t < 0.25 else 'E' if t < 0.6 else 'e')
        # rounded cap
        c.put(x0, y0, '.'); c.put(x1, y0, '.')
    column(9, 14, 3, 21)       # trunk
    column(3, 6, 6, 13)        # left arm up
    for x in range(3, 10):
        for y in (13, 14, 15):
            c.put(x, y, 'E' if y < 15 else 'e')
    c.put(3, 15, '.')
    column(17, 20, 4, 11)      # right arm up
    for x in range(14, 21):
        for y in (11, 12, 13):
            c.put(x, y, 'E' if y < 13 else 'e')
    c.put(20, 13, '.')
    # rib lines
    for y in range(3, 21):
        c.put(11, y, 'e'); c.put(13, y, 'F')
    for y in range(7, 13):
        c.put(5, y, 'e')
    for y in range(5, 11):
        c.put(19, y, 'e')
    # spines
    for (x, y) in ((10, 4), (12, 7), (10, 10), (12, 13), (10, 16), (12, 19), (4, 8), (18, 6), (19, 9), (4, 11)):
        c.put(x, y, 'N')
    # pink flower on top
    c.stamp([".>.", ">?>"], 10, 1)
    # little sand mound at the base
    for x in range(7, 17):
        c.put(x, 22, 'p' if x % 3 else 'O')
    return c


canvas_sprite('prop_cactus', saguaro())


def palm():
    c = Canvas(32, 32)
    # curved trunk with ring marks
    for y in range(11, 30):
        bend = int(2.5 * math.sin((30 - y) / 19 * 1.6))
        x0 = 14 + bend
        for x in range(x0, x0 + 4):
            c.put(x, y, 'p' if x == x0 else 'O' if x < x0 + 3 else 'o')
        if y % 2 == 0:
            c.put(x0 + 1, y, 'o'); c.put(x0 + 2, y, 'o')
    for x in range(11, 22):
        c.put(x, 30, 'p' if x % 3 else 'O')
    # date clusters hanging under the crown (drawn before the fronds)
    for (dx, dy) in ((11, 11), (19, 11)):
        c.stamp(["OoO.", "oOoO", "OoOo", ".oO."], dx, dy)
        c.put(dx, dy, 'p'); c.put(dx + 2, dy + 1, 'p'); c.put(dx + 1, dy + 2, 'p')
    # fronds: arching quadratic curves out of the crown, with leaflets below
    cx, cy = 16.5, 9
    tips = [(1, 16), (3, 9), (8, 3), (16, 1), (25, 3), (30, 9), (31, 16)]
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
    c.stamp([".EE.", "EffE", ".Ee."], 15, 8)
    return c


canvas_sprite('prop_palm', palm())


def sandmound():
    c = Canvas(16, 16)
    c.ellipse(7.5, 13, 7.2, 5.5, ['<', 'p', 'p', 'O'], mask=lambda x, y: y <= 13)
    for x in range(1, 15):
        c.put(x, 14, 'O' if 2 < x < 13 else 'o')
    c.put(1, 14, '.'); c.put(14, 14, '.')
    for x in range(2, 14):
        if c.get(x, 13) != '.':
            c.put(x, 13, 'O')
    # big red X marks the spot
    for i in range(5):
        c.put(5 + i, 8 + i, 'R'); c.put(9 - i, 8 + i, 'R')
        c.put(6 + i, 8 + i, 'R'); c.put(10 - i, 8 + i, 'R')
    # twinkle
    c.stamp(["..Y..", ".uYu.", "YYHYY", ".uYu.", "..Y.."], 10, 1)
    c.put(3, 5, 'u'); c.put(3, 4, 'Y'); c.put(2, 5, 'Y')
    return c


SPRITES['prop_sandmound'] = {'w': 16, 'rows': sandmound().rows(), 'outline': False}


def dughole():
    c = Canvas(16, 16)
    c.ellipse(7.5, 10, 7.4, 4, ['<', 'p', 'p', 'O'])
    c.ellipse(7.5, 10.5, 4.6, 2.4, [':'])
    for x in range(3, 13):
        if c.get(x, 9) == ':' or c.get(x, 8) == ':':
            y = 8 if c.get(x, 8) == ':' else 9
            c.put(x, y, 'P')
    for x in range(4, 12):
        if c.get(x, 12) == ':':
            c.put(x, 13, 'p') if c.get(x, 13) == 'O' else None
    # spilled sand lumps
    c.stamp([".p.", "pOO"], 11, 5)
    return c


SPRITES['prop_dug'] = {'w': 16, 'rows': dughole().rows(), 'outline': False}


def sandstone():
    c = Canvas(24, 24)
    # three stacked sandstone layers, each with a lit top, banded face and shaded right side
    tiers = [(2, 21, 15, 20), (3, 17, 10, 15), (6, 14, 5, 10)]
    for (x0, x1, y0, y1) in tiers:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                ch = 'T'
                if y == y0:
                    ch = '^'
                elif y == y0 + 1:
                    ch = '^' if x < x1 - 1 else 'T'
                elif (y - y0) % 3 == 0:
                    ch = 'p' if (x + y) % 4 else 'T'
                if x >= x1 - 1 and y > y0:
                    ch = 't'
                if y == y1:
                    ch = 't'
                c.put(x, y, ch)
        c.put(x0, y0, '.'); c.put(x1, y0, '.')
        c.put(x0 + 1, y0, '^')
    # cracks + pebbles
    for (x, y) in ((9, 17), (9, 18), (10, 19), (13, 12), (13, 13), (11, 7), (11, 8)):
        c.put(x, y, 't')
    c.stamp(["^T", "Tt"], 0, 19)
    c.stamp(["pO"], 22, 20)
    return c


canvas_sprite('prop_desertrock', sandstone())


def tumbleweed():
    c = Canvas(16, 16)
    for (cx, cy, r, ch, step) in ((7.5, 8, 6.2, 'o', 1), (7.5, 8, 4.6, 'O', 2), (8, 7.5, 3, 'o', 1),
                                  (6.5, 9, 2, 'O', 1), (9, 6, 5.2, 'p', 3)):
        for i in range(0, 60, step):
            a = i / 60 * math.tau
            c.put(int(cx + r * math.cos(a)), int(cy + r * 0.92 * math.sin(a)), ch)
    for (x0, y0, x1, y1, ch) in ((3, 4, 12, 12, 'o'), (12, 3, 4, 12, 'O'), (2, 9, 13, 6, 'o'), (7, 2, 9, 14, 'O')):
        c.line(x0, y0, x1, y1, ch)
    for (x, y) in ((4, 4), (11, 3), (13, 9), (4, 12), (9, 9), (6, 6)):
        c.put(x, y, 'p')
    # little sticks poking out
    for (x, y) in ((1, 5), (14, 11), (12, 1), (2, 12)):
        c.put(x, y, 'o')
    return c


SPRITES['prop_tumbleweed'] = {'w': 16, 'rows': tumbleweed().rows(), 'outline': False}

put('prop_desertsign', [
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
    ".......pOo......",
    ".......pOo......",
    ".....OppOopO....",
    "................",
])


def kitchen():
    c = Canvas(32, 32)
    # cream walls
    c.rect(5, 15, 26, 28, 'N')
    for y in range(15, 29):
        c.put(25, y, 'm'); c.put(26, y, 'M')
    for (x, y) in ((8, 18), (22, 26), (10, 27), (20, 17)):
        c.put(x, y, 'm')
    # stone footing
    c.rect(4, 28, 27, 29, '6')
    for x in range(4, 28):
        c.put(x, 29, '5')
        if x % 4 == 1:
            c.put(x, 28, '5')
    # tall chimney with smoke puffs (drawn first, roof covers base)
    c.rect(20, 3, 23, 10, 'T')
    for y in range(3, 11):
        c.put(20, y, '^'); c.put(23, y, 't')
        if y % 2:
            for x in range(21, 23):
                c.put(x, y, 't')
    c.rect(19, 2, 24, 2, 't')
    c.stamp([".GW.", "GWWG", ".GG."], 21, -1)
    # red gabled roof
    for y in range(5, 17):
        half = (y - 4) * 1.35
        x0, x1 = int(15.5 - half), int(16.5 + half)
        for x in range(max(2, x0), min(30, x1) + 1):
            ch = 'R' if (y + (x // 3)) % 3 else 'r'
            if y in (16,):
                ch = 'Q'
            c.put(x, y, ch)
    for y in range(5, 17):
        half = (y - 4) * 1.35
        c.put(int(15.5 - half), y, 'q')
    # little round window up in the gable
    c.stamp([".pp.", "pYYp", "pYup", ".pp."], 14, 9)
    # door
    c.rect(13, 21, 18, 28, 'O')
    for y in range(21, 29):
        c.put(13, y, 'p'); c.put(18, y, 'o'); c.put(15, y, 'o')
    c.rect(13, 20, 18, 20, 'o')
    c.put(17, 25, 'Y')
    # window with warm light
    c.stamp(["pppp", "pYup", "pyYp", "pppp"], 7, 19)
    c.stamp(["pppp", "pYup", "pyYp", "pppp"], 21, 19)
    # hanging sign with a pie on it
    c.put(9, 24, 'o'); c.put(12, 24, 'o')
    c.stamp(["oooooo", "p<<<<p", "pRqRqp", "pOOOOp", "oooooo"], 7, 24)
    # doorstep
    c.rect(12, 29, 19, 30, '8')
    for x in range(12, 20):
        c.put(x, 30, '6')
    return c


canvas_sprite('prop_kitchen', kitchen())


def shop():
    c = Canvas(32, 32)
    # posts
    for px in (4, 26):
        c.rect(px, 10, px + 1, 28, 'O')
        for y in range(10, 29):
            c.put(px, y, 'p')
    # back wall / shelves
    c.rect(6, 12, 25, 20, 'o')
    for x in range(6, 26):
        c.put(x, 16, 'O')
    for (x, ch) in ((8, 'R'), (10, 'Y'), (13, 'E'), (16, '>'), (19, 'Y'), (22, 'R')):
        c.stamp([ch + ch, ch + ch], x, 14)
    for (x, ch) in ((7, '^'), (11, 'c'), (15, 'f'), (20, 'i'), (23, '^')):
        c.stamp([ch + ch], x, 19)
    # striped awning with scalloped edge
    for y in range(4, 11):
        inset = (10 - y) // 2
        for x in range(2 - 0 + inset // 3, 30 - inset // 3):
            stripe = ((x - 2) // 3) % 2
            c.put(x, y, ('R' if y > 4 else 'q') if stripe == 0 else 'W')
    for x in range(2, 30):
        if (x - 2) % 3 != 1:
            c.put(x, 11, 'R' if ((x - 2) // 3) % 2 == 0 else 'G')
    for x in range(3, 29):
        c.put(x, 3, 'r')
    # counter
    c.rect(3, 21, 28, 27, 'p')
    for x in range(3, 29):
        c.put(x, 21, '<'); c.put(x, 27, 'o')
        if x % 5 == 0:
            for y in range(22, 27):
                c.put(x, y, 'O')
    # goods on the counter: fruit crates
    c.stamp(["RqR", "ORO"], 6, 19)
    c.stamp(["YuY", "OYO"], 22, 19)
    # sign plate on the counter with a coin
    c.stamp(["ooooo", "oYuYo", "oYYyo", "ooooo"], 13, 22)
    for x in range(2, 30):
        c.put(x, 28, 'O')
    return c


canvas_sprite('prop_shop', shop())


def museum():
    c = Canvas(32, 32)
    # triangular pediment
    for y in range(3, 10):
        half = (y - 2) * 2.1
        for x in range(int(15.5 - half), int(16.5 + half) + 1):
            c.put(x, y, 'W' if y < 5 else 'G')
    for x in range(2, 30):
        c.put(x, 10, 'g'); c.put(x, 11, 'G')
    for y in range(3, 10):
        half = (y - 2) * 2.1
        c.put(int(16.5 + half), y, 'g')
    # a little bone emblem in the pediment
    c.stamp(["N...N", ".NNN.", "N...N"], 14, 6)
    # back wall
    c.rect(4, 12, 27, 25, 'g')
    for y in range(12, 26):
        for x in range(4, 28):
            if (y % 3 == 0) or ((x + (y // 3) * 3) % 6 == 0):
                c.put(x, y, 'n')
    # doorway
    c.rect(13, 16, 18, 25, 'K')
    c.rect(14, 17, 17, 25, 'D')
    c.put(15, 16, 'K'); c.put(16, 16, 'K')
    # columns
    for px in (3, 8, 21, 26):
        c.rect(px, 12, px + 2, 25, 'G')
        for y in range(12, 26):
            c.put(px, y, 'W'); c.put(px + 2, y, 'g')
        c.rect(px - 1, 12, px + 3, 12, 'W')
        c.rect(px - 1, 25, px + 3, 25, 'g')
    # steps
    c.rect(2, 26, 29, 27, 'G')
    for x in range(2, 30):
        c.put(x, 27, 'g')
    c.rect(1, 28, 30, 29, 'W')
    for x in range(1, 31):
        c.put(x, 29, 'G')
    # banner
    c.rect(19, 13, 19, 13, 'G')
    return c


canvas_sprite('prop_museum', museum())


def well():
    c = Canvas(24, 24)
    # posts + roof
    for px in (4, 18):
        c.rect(px, 4, px + 1, 16, 'O')
        for y in range(4, 17):
            c.put(px, y, 'p')
    for y in range(1, 5):
        half = 5 + y * 2
        for x in range(12 - half, 12 + half):
            c.put(x, y, 'T' if (x + y) % 3 else 't')
    for x in range(1, 23):
        c.put(x, 4, 't')
    # crossbar, rope and bucket
    c.rect(5, 6, 18, 6, 'o')
    for y in range(7, 11):
        c.put(12, y, 'm')
    c.stamp(["OpOO", "OooO", ".oo."], 11, 10)
    # stone ring
    c.ellipse(12, 15, 9, 3, [':'])
    c.ellipse(12, 15.5, 6.5, 1.8, ['a', 'h'])
    c.put(10, 15, 'A'); c.put(11, 15, 'A')
    for y in range(16, 22):
        for x in range(3, 21):
            row = (y - 16) // 2
            c.put(x, y, '<' if y % 2 == 0 and (x + row * 2) % 4 == 0 else ('^' if y < 19 else 'p'))
            if (x + row * 2) % 4 == 0 and y % 2:
                c.put(x, y, 'O')
            if y % 2 == 0 and (x + row * 2) % 4 == 0:
                c.put(x, y, 'O')
    for x in range(3, 21):
        c.put(x, 15 if x in (3, 20) else 16, '<')
        c.put(x, 21, 'T')
    for x in range(4, 20):
        if c.get(x, 12) == ':':
            c.put(x, 12, '^')
    return c


canvas_sprite('prop_well', well())


def tent():
    c = Canvas(32, 32)
    # A-frame tent body with stripes
    for y in range(6, 29):
        half = (y - 5) * 0.62 + 0.5
        x0, x1 = int(15.5 - half * 1.25), int(16.5 + half * 1.25)
        for x in range(max(1, x0), min(31, x1)):
            stripe = (x // 4) % 2
            ch = ('N' if stripe else 'R') if x < 16 else ('m' if stripe else 'r')
            c.put(x, y, ch)
    # door flap (dark opening, flap tied back)
    for y in range(15, 29):
        half = (y - 14) * 0.45
        for x in range(int(16 - half), int(16 + half) + 1):
            c.put(x, y, ':' if x > 15 - half * 0.2 else 'P')
    for y in range(17, 29):
        half = (y - 14) * 0.45
        c.put(int(16 - half) - 1, y, 'Y')
    # pole tip + pennant
    c.put(16, 4, 'o'); c.put(16, 5, 'o'); c.put(16, 3, 'o')
    c.stamp(["YY", "Y."], 17, 3)
    # ropes + pegs
    c.line(4, 22, 1, 28, 'M'); c.line(27, 22, 30, 28, 'M')
    c.put(1, 29, 'o'); c.put(30, 29, 'o')
    # sand base
    for x in range(2, 30):
        c.put(x, 29, 'p' if x % 3 else 'O')
    return c


canvas_sprite('prop_tent', tent())
