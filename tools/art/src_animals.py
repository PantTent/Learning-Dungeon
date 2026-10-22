"""Animal Kingdom Quest: player pets, grumpy jungle animals, gorilla boss,
village folk, food/acorn items and jungle/village props. Characters face RIGHT."""
import random, math
from draw import Canvas
SPRITES = {}


def grid(rows, w=16, name='?'):
    for i, r in enumerate(rows):
        if len(r) != w:
            raise SystemExit(f'src_animals {name}: row {i} has len {len(r)} (want {w}): {r!r}')
    return rows


def put(name, rows, w=None, outline=True):
    w = w or len(rows)
    grid(rows, w, name)
    if w == len(rows) and outline:
        SPRITES[name] = rows
    else:
        SPRITES[name] = {'w': w, 'rows': rows, 'outline': outline}


# ================================================================ player pets (16x16, happy)

put('pet_cat', [
    "................",
    "........7...7...",
    ".......7i7.7i7..",
    ".......^^^^^^7..",
    "......^^7^^7^^7.",
    "..7...^^^^^^^^7.",
    ".7T...^Hk^^Hk^7.",
    ".7T...^kk^^kk^T.",
    ".7T...^^^NiN^^T.",
    "..7T..T^NNNNN7..",
    "...7^^^^^7NN7...",
    "...^^7^^7^^^T...",
    "...^^7^^7^^^T...",
    "...^^^^^^^^TT...",
    "...7N.7N..7N7...",
    "................",
])

put('pet_dog', [
    "................",
    "................",
    ".......OOOOOO...",
    "......OppOOOOO..",
    ".....oOpOOOOOOo.",
    ".....oOHkOOHkOo.",
    ".....ookkOOkkoo.",
    ".....PoNNkkNNoP.",
    ".....P.NNNNNN.P.",
    "..O....oNNiiNo..",
    ".OO.OOOOoNiNo...",
    "..OOOOOOONNNO...",
    "..OOWWOOOOOOo...",
    "..oOOOOOOOOoo...",
    "..ON.oN..ON.oN..",
    "................",
])

put('pet_mouse', [
    "................",
    "......GGG..GGG..",
    ".....GiiiGGiiiG.",
    ".....GiiIGGiiIg.",
    "......GGGGGGGg..",
    ".....GWGGGGGGGg.",
    ".....GGHkGGHkGg.",
    ".....GGkkGGkkGg.",
    "......GGGiiGGg..",
    ".ii....gGWWGg...",
    ".i..GGGGGWWg....",
    ".i.GGGGGGWWWg...",
    "..iGGGGGGWWgg...",
    "...gGGGGGGggg...",
    "...ii.gg.ii.....",
    "................",
])

put('pet_cheetah', [
    "................",
    "........Y...Y...",
    ".......YPY.YPY..",
    ".......uYYYYYy..",
    "......uYYPYYYYy.",
    "......YYYYYYYYy.",
    "..P...YHkYYHkYy.",
    ".YY...YkkYYkkYy.",
    ".Y....YYkiikYYy.",
    ".Y....yYkNNkYy..",
    ".YP..YYYyNNNy...",
    "..YYPYYYPYNNy...",
    "...YYYPYYYYYy...",
    "...yYyYPyYyYy...",
    "...yY.yY..yY.yY.",
    "................",
])

put('pet_owl', [
    "................",
    "....O.......O...",
    "....OO.....OO...",
    "....OOOOOOOOO...",
    "...OOYYOOOYYOO..",
    "...OYHkYOYHkYO..",
    "...OYkkYyYkkYO..",
    "...OOYYOUOYYOO..",
    "...OOpNNNNNpOo..",
    "..oOpNmNNmNNpo..",
    "..oOpNNNNNNNpo..",
    "..ooOpNmNNmNpo..",
    "...ooOpNNNNpo...",
    "....ooOOOOoo....",
    ".....yy..yy.....",
    "................",
])

put('pet_elephant', [
    "................",
    ".............GG.",
    "........WGG...g.",
    "...ggg.WGGGG..g.",
    "..gGiig.GGGGG.g.",
    "..gGiiigGHkGGGg.",
    "..gGiiigGkkGGg..",
    "..gGiiigGGiGgg..",
    ".GgGGiggGGGg....",
    ".GGgggggGGGg....",
    ".GGGGGGGGGGg....",
    ".GGGGGGGGGgg....",
    ".gGGGGGGGGgg....",
    ".gGG.gGG.gGG....",
    ".gnn.gnn.gnn....",
    "................",
])

put('pet_lion', [
    "................",
    ".......7.77.7...",
    "......77TTTT77..",
    ".....7TTYTTYTT7.",
    ".....7TYYYYYYT7.",
    ".....TYHkYYHkYT.",
    ".....TYkkYYkkYT.",
    ".T...7YYNiiNYY7.",
    ".7...T7YNNNNY7T.",
    ".Y....T7YYYY7T..",
    ".Y.YYYYTT777T...",
    "..YYYYYYYYNNy...",
    "..YYYYYYYYYNy...",
    "..yYYYYYYYYyy...",
    "..yY.yY..yY.yY..",
    "................",
])

put('pet_snake', [
    "................",
    ".........EEE....",
    "........EfEEE...",
    ".......EHkEHkE..",
    ".......EkkEkkE..",
    ".......eEEEEEe..",
    "........eeuueeR.",
    "........EEEe....",
    ".....fEEEEEe....",
    ".....EEYEEee....",
    "...fffEEEEEEe...",
    "...EEYEEEYEee...",
    "..fffEEEEEEEEe..",
    "..eEEYEEEYEEeeE.",
    "...eeeeeeeeeee..",
    "................",
])


# ================================================================ grumpy wild animals (16x16)

put('wild_monkey', [
    "................",
    "........OOOO....",
    ".......OOOOOO...",
    "......OOPOOOPO..",
    ".....sOSSPSPSOs.",
    ".....sOSHkSHkSs.",
    ".....sOSkkSkkSs.",
    "......OSSSSSSO..",
    "......OSsPPsSO..",
    ".O.....OSSSSO...",
    "O..OOOOOOOOOO...",
    "O..OOOOSSSOO....",
    ".O.OOOSSSSOO....",
    "..OoOOOSSOOo....",
    "...SS.oo..SS....",
    "................",
])

put('wild_parrot', [
    "................",
    "........RRRR....",
    ".......RqRRRR...",
    "......RRkRRkWN..",
    "......RRHkRWkNN.",
    "......RRkkRWNNk.",
    "......RRRRRWNk..",
    ".....BRRRRRRk...",
    "....BBYRRRRR....",
    "...BBYYRRRRr....",
    "..BbYYBRRRr.....",
    "..bBBBBRRr......",
    "..bbBbbRr.......",
    ".bb..yy.y.......",
    ".b...y..y.......",
    "................",
])

put('wild_frog', [
    "................",
    "................",
    "......lll..lll..",
    ".....l77Rll77Rl.",
    ".....lHkRllHkRl.",
    ".....lkkRllkkRl.",
    ".....lElllllllj.",
    "....lllllllllllj",
    "....llFllllFFlj.",
    "....lLLLLLLLLlj.",
    "...jllLLLLLLlj..",
    "..7jlllLLLLljj7.",
    ".77jjljjjjljj77.",
    "..7..77...77....",
    "................",
    "................",
])

put('wild_toucan', [
    "................",
    "......KKKK......",
    ".....KKKKKK.....",
    ".....KkkWKK.....",
    ".....KWHkKY7777.",
    ".....KWkkKYYYY7.",
    ".....KWWWKyYYY7R",
    ".....KWWWKyyyRR.",
    ".....KWWWKK.....",
    "....KKWWWKK.....",
    "....KKKKKKK.....",
    "...DKKKKKKK.....",
    "...DKKKKKK......",
    "..DD.KRK........",
    "..D..7.7........",
    "................",
])

put('wild_tiger', [
    "................",
    "........7...7...",
    ".......7N7.7N7..",
    ".......^^7k^^7..",
    "......^k^^k^k^7.",
    "..7...^^k^^k^^T.",
    ".7k...^Hk^^Hk^T.",
    ".k7...kkk^^kkkT.",
    ".7k...NNNiiNNNT.",
    "..7k..TNNNNNNT..",
    "..7777k77k7NN...",
    "..7^7k77k77NT...",
    "...7k77k77k7T...",
    "...T7kTT7kT7T...",
    "...TN.TN..TN.TN.",
    "................",
])

put('wild_sloth', [
    "................",
    "................",
    ".......<<<<<<...",
    "......<ppppppp..",
    ".....<pNNNNNNp..",
    ".....pNOOONOOOp.",
    ".....pOkHOOkHOp.",
    ".....pOkkNNkkOp.",
    ".....pNNNPPNNNp.",
    ".....pNNsNNsNNp.",
    "..ppppppNNNNpp..",
    ".pppOpppppppOp..",
    "N.pOpppppppOp.N.",
    "NN.ppppOpppp.NN.",
    "....Op.Op.Op....",
    "................",
])

put('wild_croc', [
    "................",
    "................",
    "................",
    "........Ek..kE..",
    ".......EHkEEHkE.",
    ".......EkkEEkkE.",
    "..E.fEfEfEEEEEE.",
    ".EEEEEEEEEEEEEe.",
    ".EEEEEEEeeeeeee.",
    ".eEEuuuuuuWuWue.",
    "..eeuuuuuuuuue..",
    "...eE.eE..eE.eE.",
    "...ee.ee..ee.ee.",
    "................",
    "................",
    "................",
])

put('wild_tapir', [
    "................",
    "................",
    ".........dD.....",
    "........dDDD....",
    ".......DKKDDD...",
    "......DDDHkDDD..",
    "......DDDkkDDDd.",
    "..WWWWKDDDDDDDd.",
    ".WWWWWWKDDDDDdd.",
    ".WWWWWWKKDDDd...",
    ".GWWWWWKKKDD....",
    ".KGGGGGKKKKK....",
    "..KKDDDKKKK.....",
    "..KD.KD..KD.KD..",
    "..KW.KW..KW.KW..",
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


# frowny brows: outer end high, inner end low (side views slope down toward the face front)
grumpy('wild_parrot', [(7, 3, 'k'), (8, 3, 'k'), (11, 3, 'R')])
grumpy('wild_frog', [(7, 2, 'F'), (8, 3, 'F'), (12, 2, 'F'), (11, 3, 'F')])
grumpy('wild_sloth', [(7, 4, 'P'), (8, 4, 'P'), (9, 5, 'P'), (11, 5, 'P'), (12, 4, 'P'), (13, 4, 'P')])


# ================================================================ village folk (16x16, friendly)

put('npc_badger', [
    "................",
    "................",
    ".....WKKWWKKW...",
    "...GWKKKWWKKKWG.",
    "....WKYYWWYYKW..",
    "....WYHkYYHkYW..",
    "....WKYYWWYYKW..",
    ".....WWWkkWWW...",
    "......WWWWWW....",
    "...GGGGiiiiGG...",
    "..GGgGiHHHHiG...",
    "..GGgGiHiHHiGG..",
    "..gGggiHHHiHig..",
    "..gggggiiiiigg..",
    "...KK.KK..KK.KK.",
    "................",
])

put('npc_dogmom', [
    "................",
    ".......>>.>>....",
    "......>?>>?>....",
    "......<>>>>pp...",
    ".....O<<<<<<<O..",
    ".....O<HkS<HkO..",
    ".....o<kkSSkko..",
    ".....o<SSkkSS<o.",
    ".....P.SSSSSS.P.",
    "..<....<SS>SS<..",
    ".<<.<<<<?>>><...",
    "..<<<<<<?>?><...",
    "..<<<<<<<<<<p...",
    "..p<<<<<<<<pp...",
    "..pS.pS..pS.pS..",
    "................",
])

put('npc_mayor_beaver', [
    "................",
    "........KKKK....",
    "........KKKK....",
    "........RRRR....",
    ".......KKKKKK...",
    "......OOOOOOOO..",
    "......OHkOOHkO..",
    "......OkkOOkkO..",
    "......OppkkppO..",
    "......OpWWWWpO..",
    ".PP...OOWHWWOO..",
    "PoPoOOOOOOOOY...",
    "PoPoOOOOOYYYO...",
    ".PPOOOOYYYOOO...",
    "...OO.oOYYOO.O..",
    "................",
])

put('npc_puppy', [
    "............",
    "....pppp....",
    "...ppppp....",
    "..opHkpHko..",
    "..opkkpkko..",
    "..o.NkkN.o..",
    ".p...NiN....",
    "p.pppNNp....",
    ".ppppppp....",
    ".pp.pppp....",
    ".pO.pO.pO...",
    "............",
], 12)


# ================================================================ items (12x12)

put('food_apple', [
    "............",
    "......O.....",
    ".....OEE....",
    "...RRORfE...",
    "..RqqRRRR...",
    "..RqHRRRRr..",
    "..RqRRRRRr..",
    "..RRRRRRRr..",
    "..rRRRRRrr..",
    "...rRRRrr...",
    "....rrrr....",
    "............",
], 12)

put('food_banana', [
    "............",
    ".........O..",
    "........yU..",
    "........YY..",
    "........YYy.",
    ".......uYYy.",
    "......uYYy..",
    "....uuYYYy..",
    ".UuuYYYYy...",
    "..yYYYyy....",
    "...yyyy.....",
    "............",
], 12)

put('food_berries', [
    "............",
    "......eE....",
    ".....eEfE...",
    "....cB.ee...",
    "...cHBBwV...",
    "...BBBbwHV..",
    "..cB.cBVVv..",
    "..cHBcHBvv..",
    "..BBbBBbB...",
    "...b.BBb....",
    "....bbb.....",
    "............",
], 12)

put('food_pie', [
    "............",
    "............",
    "............",
    "...ppppp....",
    "..p<p<p<p...",
    ".p<<<<<<<p..",
    ".pppppppppp.",
    ".OqRqRqRqOo.",
    ".pOOOOOOOOo.",
    "..ooooooooo.",
    "............",
    "............",
], 12)

put('item_acorn', [
    "............",
    ".....o......",
    "....oO......",
    "..pppppp....",
    ".pOpOpOpO...",
    ".OoOoOoOo...",
    "..YuYYYy....",
    "..YuYYYy....",
    "..yYYYyy....",
    "...yYyU.....",
    "....yU......",
    "............",
], 12)

put('prop_heart', [
    "..........",
    "..RR..RR..",
    ".RqqRRRRr.",
    ".RqHRRRRr.",
    ".RRRRRRRr.",
    "..RRRRRr..",
    "...RRRr...",
    "....Rr....",
    "..........",
    "..........",
], 10)

put('prop_sparkle', [
    "............",
    ".....u......",
    ".....Y......",
    ".....Y......",
    "....uYY.....",
    ".uYYYHYYYy..",
    "....YYy.....",
    ".....Y......",
    ".....y......",
    ".....y......",
    "............",
    "............",
], 12)


# ================================================================ small props (16x16)

put('prop_bush', [
    "................",
    "................",
    "......E...E.....",
    "...E..fE.Ef..E..",
    "...fE.fEEfE.Ef..",
    "....fEfEEfEEf...",
    "..E.EffEEfEfE.E.",
    "..fEEfEEEEEfEEf.",
    "...fEEEEEEEEEe..",
    "..EEEEfEEEfEEEe.",
    "..EfEEEEEEEEEee.",
    "...EEEeEEEeEee..",
    "...eEEEeEEeEe...",
    "....eeeeeeeee...",
    "................",
    "................",
])

put('prop_flowers', [
    "................",
    "................",
    "..>>........YY..",
    ".>?>>......YuYY.",
    ".>>H>.i$i..Y7YY.",
    "..>>..$H$...YYe.",
    "...E..i$i....E..",
    "...E...E....EE..",
    "..fEE..E..>>.E..",
    "...EE.fEf>?H>E..",
    "....E..EE.>>.E..",
    "..f.EE.E..E.EE..",
    "...EEEEEEEEEEE..",
    "....eeeeeeeeee..",
    "................",
    "................",
])

put('prop_burrow', [
    "................",
    "................",
    "................",
    "....pppppppp....",
    "..pp<<<<<<<<pp..",
    ".p<OOooooooOO<p.",
    ".p<OoPP::PPoO<p.",
    "p<OoP::::::PoO<p",
    "p<OP::::::::PO<p",
    "p<Oo::::::::oOOp",
    ".pOOo::::::oOOp.",
    ".ppOOooooooOOpp.",
    "...ppOOOOOOpp...",
    ".....pppppp.....",
    "................",
    "................",
], outline=False)

put('prop_sign', [
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
    ".....%#pOo#%....",
    "................",
])

def stump():
    c = Canvas(16, 16)
    # bark sides with grooves
    c.rect(2, 8, 13, 13, 'O')
    for y in range(8, 14):
        c.put(2, y, 'p'); c.put(12, y, 'o'); c.put(13, y, 'o')
        for x in (5, 8, 11):
            c.put(x, y, 'o')
    for (x, ch) in ((1, 'O'), (14, 'o')):
        c.put(x, 13, ch); c.put(x, 12, ch)
    for x in range(1, 15):
        c.put(x, 14, '&' if x % 3 else '%')
    # flat cut top with rings
    c.ellipse(7.5, 8, 6.2, 2.4, ['<', '<', '<', 'p'])
    for (x, y) in ((5, 8), (6, 9), (9, 9), (10, 8), (9, 7), (6, 7)):
        c.put(x, y, 'p')
    c.put(7, 8, 'O'); c.put(8, 8, 'O')
    # three shiny acorns sitting on top
    ac = [".o.", "OoO", "uYy", ".y."]
    for (ax, ay) in ((2, 4), (6, 3), (10, 5)):
        c.stamp(ac, ax, ay)
    return c.rows()


SPRITES['prop_stump'] = stump()


# ================================================================ boss: grumpy silverback (32x32)

def gorilla():
    c = Canvas(32, 32)
    FUR = ['D', 'K', 'K', 'K']
    # stubby legs + feet
    for lx in (7, 18):
        c.ellipse(lx + 3, 26.5, 4, 3.5, ['D', 'K', 'K', 'K'])
        c.rect(lx, 29, lx + 6, 29, 'n')
        c.rect(lx + 1, 29, lx + 5, 29, 'g')
    # big round body, broad shoulders
    c.ellipse(15.5, 18, 12.5, 9.5, FUR)
    # silver saddle on the back (left side = back, he faces right)
    c.ellipse(6, 15, 4.5, 6.5, ['W', 'G', 'G', 'g'],
              mask=lambda x, y: c.get(x, y) != '.' and x < 9)
    # head with a pointy crest
    c.ellipse(20.5, 9, 7, 6.5, FUR)
    c.ellipse(19.5, 3.5, 3.4, 2.4, ['D', 'D', 'K', 'K'])
    # pale face + muzzle
    c.ellipse(22, 10.5, 4.8, 4.2, ['G', 'g', 'g', 'n'])
    c.ellipse(22.5, 13.5, 4, 2.3, ['g', 'g', 'n', 'n'])
    # heavy frowning brow (outer high, inner low)
    for (x, y) in ((17, 7), (18, 7), (19, 8), (20, 8), (21, 9),
                   (23, 9), (24, 8), (25, 8), (26, 7), (27, 7)):
        c.put(x, y, 'K')
    for x in range(18, 27):
        if c.get(x, 7) == '.':
            pass
    # eyes
    c.stamp(["Hk", "kk"], 19, 9)
    c.stamp(["Hk", "kk"], 24, 9)
    # nostrils + grumpy frown
    c.put(22, 12, 'K'); c.put(23, 12, 'K')
    for x in range(21, 25):
        c.put(x, 14, 'K')
    c.put(20, 15, 'K'); c.put(25, 15, 'K')
    # bare dark-gray chest above the folded arms
    c.ellipse(16, 15.5, 5, 3, ['d', 'd', 'D', 'D'], mask=lambda x, y: y >= 13)
    # folded arms: two stacked forearms, light fur with dark seams
    for (x0, x1, y0) in ((7, 24, 16), (8, 25, 20)):
        for x in range(x0, x1 + 1):
            for i, ch in enumerate(['d', 'd', 'D', 'K']):
                c.put(x, y0 + i, ch)
        c.put(x0, y0, 'D'); c.put(x1, y0 + 3, 'K')
        for x in range(x0, x1 + 1):
            c.put(x, y0 - 1, 'K') if c.get(x, y0 - 1) in 'Dd' else None
    # fur tufts on the forearms
    for (x, y) in ((11, 17), (15, 17), (19, 17), (13, 21), (17, 21), (21, 21)):
        c.put(x, y, 'D')
    # fists: one tucked on the left, one on the right
    c.stamp([".gg.", "Gggn", "gggn", ".nn."], 4, 16)
    c.stamp([".Gg.", "Gggn", "gggn", ".nn."], 25, 20)
    return c.rows()


SPRITES['boss_gorilla'] = {'w': 32, 'rows': gorilla()}


# ================================================================ rocks (24x24)

ROCK = ['W', 'G', 'G', 'g', 'g', 'n']


def boulder(cracked=False):
    c = Canvas(24, 24)
    # soft ground shadow
    c.ellipse(12, 20.5, 10, 2.5, ['9', '9', 'X', 'X'])
    c.ellipse(12, 12.5, 10, 8.5, ROCK)
    c.ellipse(8, 8, 3.2, 2.4, ['W', 'W', 'G', 'G'])
    # speckles + a lump line
    for (x, y, ch) in ((14, 6, 'G'), (17, 10, 'g'), (6, 14, 'g'), (11, 16, 'n'), (16, 15, 'n'), (9, 11, 'G')):
        if c.get(x, y) != '.':
            c.put(x, y, ch)
    for x in range(13, 19):
        if c.get(x, 13) != '.':
            c.put(x, 13, 'g' if x < 16 else 'n')
    if cracked:
        crack = [(12, 4), (12, 5), (11, 6), (11, 7), (12, 8), (13, 9), (13, 10), (12, 11), (11, 12),
                 (10, 13), (10, 14), (11, 15), (11, 16), (12, 17), (12, 18), (12, 19),
                 (13, 10), (14, 10), (15, 11), (16, 11), (17, 12), (18, 12),
                 (11, 12), (10, 12), (9, 11), (8, 11), (7, 12), (6, 12),
                 (11, 16), (10, 17), (9, 18)]
        for (x, y) in crack:
            if c.get(x, y) != '.':
                c.put(x, y, 'K')
        for (x, y) in crack:
            if c.get(x + 1, y) in ROCK:
                c.put(x + 1, y, 'W' if y < 12 else 'G')
        # chips flying off
        for (x, y) in ((3, 4), (20, 3), (21, 5)):
            c.put(x, y, 'g')
        c.put(19, 4, 'G')
    return c.rows()


SPRITES['prop_rock'] = {'w': 24, 'rows': boulder()}
SPRITES['prop_rock_cracked'] = {'w': 24, 'rows': boulder(True)}


# ================================================================ trees (32x32)

def canopy_rim(c, keys):
    for x in range(c.w):
        for y in range(c.h - 1, -1, -1):
            if c.get(x, y) in keys:
                if c.get(x, y + 1) not in keys:
                    c.put(x, y, 'F')
                break


def jungle_tree():
    c = Canvas(32, 32)
    # short thick trunk with roots
    c.rect(13, 20, 18, 28, 'O')
    for y in range(20, 29):
        c.put(13, y, 'p'); c.put(14, y, 'O'); c.put(17, y, 'o'); c.put(18, y, 'o')
    c.stamp(["pO........Oo", "PoO......OoP"], 10, 28)
    c.put(15, 24, 'o'); c.put(16, 26, 'o')
    for x in range(8, 24):
        c.put(x, 30, '&' if x % 3 else '%')
    # big round canopy: dark base clumps then lighter leaf clumps on top-left
    DARK = ['e', 'e', 'F', '@']
    for (cx, cy, rx, ry) in ((16, 12, 14, 9.5), (6, 14, 5.5, 5.5), (26, 14, 5.5, 5.5),
                             (10, 6.5, 7, 5.5), (22, 6.5, 7, 5.5), (16, 18, 10, 4.5)):
        c.ellipse(cx, cy, rx, ry, DARK)
    LIGHT = ['f', 'E', 'E', 'e']
    for (cx, cy, rx, ry) in ((10, 6, 4.5, 3.5), (19, 5, 4, 3), (6, 12, 3, 3), (14, 11, 4, 3.2),
                             (24, 11, 3.6, 3), (19, 16, 3.6, 2.8), (9, 16, 3, 2.4)):
        c.ellipse(cx, cy, rx, ry, LIGHT)
    # leaf glints + a few hanging vines
    for (x, y) in ((8, 4), (17, 3), (12, 9), (4, 10), (22, 9)):
        c.put(x, y, 'f')
    canopy_rim(c, 'fEeF@')
    for (vx, y0, y1) in ((7, 18, 22), (24, 18, 23), (11, 20, 24)):
        for y in range(y0, y1 + 1):
            c.put(vx, y, 'E' if y % 2 else 'e')
        c.put(vx, y1, 'f')
    # a pink jungle flower in the leaves
    c.stamp([".i.", "iHi", ".i."], 23, 13)
    return c.rows()


def fruit_tree():
    c = Canvas(32, 32)
    c.rect(14, 20, 18, 28, 'O')
    for y in range(20, 29):
        c.put(14, y, 'p'); c.put(18, y, 'o'); c.put(17, y, 'o' if y % 3 else 'O')
    c.stamp(["oO.....Oo", "PoO...OoP"], 12, 28)
    for x in range(10, 23):
        c.put(x, 30, '%' if x % 3 else '#')
    for (cx, cy, rx, ry) in ((16, 11, 13, 9), (7, 13, 6, 5.5), (25, 13, 6, 5.5),
                             (12, 6, 7, 5), (21, 6, 7, 5), (16, 17, 9, 4)):
        c.ellipse(cx, cy, rx, ry, ['E', 'E', 'e', 'F'])
    for (cx, cy, rx, ry) in ((11, 5.5, 4, 3), (20, 5, 3.6, 2.6), (6, 11, 2.8, 2.4), (15, 11, 3.4, 2.6)):
        c.ellipse(cx, cy, rx, ry, ['f', 'f', 'E', 'e'])
    canopy_rim(c, 'fEeF')
    # fallen apple at the foot
    c.stamp(["qR", "Rr"], 21, 28)
    # apples with a tiny stem
    for (ax, ay) in ((7, 9), (13, 14), (20, 9), (25, 15), (10, 18), (19, 17), (15, 4), (26, 10)):
        c.stamp(["qR", "Rr"], ax, ay)
        c.put(ax, ay, 'H') if (ax + ay) % 3 == 0 else c.put(ax, ay, 'q')
        c.put(ax + 1, ay - 1, 'O')
    return c.rows()


SPRITES['prop_jtree'] = {'w': 32, 'rows': jungle_tree()}
SPRITES['prop_fruittree'] = {'w': 32, 'rows': fruit_tree()}


# ================================================================ quest board (24x24)

def quest_board():
    c = Canvas(24, 24)
    for px in (3, 18):
        c.rect(px, 3, px + 2, 22, 'O')
        for y in range(3, 23):
            c.put(px, y, 'p'); c.put(px + 2, y, 'o')
    # leafy roof plank
    c.rect(1, 1, 22, 2, 'E')
    for x in range(1, 23):
        c.put(x, 1, 'f' if x % 3 else 'E'); c.put(x, 2, 'e' if x % 4 == 0 else 'E')
    c.rect(2, 4, 21, 16, 'p')
    for y in range(4, 17):
        for x in range(2, 22):
            if y in (8, 12):
                c.put(x, y, 'O')
        c.put(2, y, '<'); c.put(21, y, 'o')
    for x in range(2, 22):
        c.put(x, 16, 'o'); c.put(x, 4, '<')
    notes = ((4, 5, 'R', 'W'), (10, 7, 'B', 'u'), (15, 5, 'E', '$'))
    for (nx, ny, pin, paper) in notes:
        c.rect(nx, ny, nx + 4, ny + 6, paper)
        for y in range(ny, ny + 7):
            c.put(nx + 4, y, 'G' if paper == 'W' else 'm')
        for x in range(nx, nx + 5):
            c.put(x, ny + 6, 'G' if paper == 'W' else 'm')
        for ly in (ny + 3, ny + 5):
            for x in range(nx + 1, nx + 3):
                c.put(x, ly, 'g')
        c.put(nx + 2, ny + 1, pin)
        c.put(nx + 2, ny, {'R': 'q', 'B': 'c', 'E': 'f'}[pin])
    # tiny paw print on the middle note
    c.put(11, 10, 'O'); c.put(13, 10, 'O'); c.put(12, 11, 'O')
    for (x, y, ch) in ((2, 22, 'E'), (6, 22, 'E'), (17, 22, 'E'), (21, 22, 'E'), (2, 21, 'f'), (21, 21, 'f')):
        c.put(x, y, ch)
    return c.rows()


SPRITES['prop_board'] = {'w': 24, 'rows': quest_board()}


# ================================================================ village buildings (32x32)

def hut():
    c = Canvas(32, 32)
    # round-ish walls (cream plaster)
    c.rect(5, 15, 26, 28, 'N')
    for y in range(15, 29):
        c.put(5, y, 'N'); c.put(25, y, 'm'); c.put(26, y, 'M')
    for (x, y) in ((8, 18), (22, 25), (10, 26), (20, 17)):
        c.put(x, y, 'm')
    c.rect(4, 28, 27, 29, '6')
    for x in range(4, 28):
        c.put(x, 29, '5')
        if x % 4 == 1:
            c.put(x, 28, '5')
    # thatched dome roof
    c.ellipse(15.5, 13, 14, 11, ['u', 'Y', 'Y', 'y', 'y', 'U'], mask=lambda x, y: y <= 16)
    for y in range(2, 17):
        for x in range(32):
            if c.get(x, y) in 'uYyU' and (x * 3 + y * 2) % 7 == 0:
                c.put(x, y, 'y' if c.get(x, y) != 'U' else 'U')
    for x in range(2, 30):
        if c.get(x, 16) != '.':
            c.put(x, 16, 'U')
    for x in range(3, 29, 2):
        if c.get(x, 17) == 'N' or c.get(x, 17) == 'm':
            c.put(x, 17, 'y')
    # little chimney with smoke
    c.rect(22, 2, 24, 5, '5'); c.put(22, 2, '6'); c.put(22, 3, '6')
    c.put(23, 0, 'G'); c.put(24, 1, 'W')
    # round door
    c.ellipse(15.5, 23, 3.5, 4, ['O', 'O', 'o', 'o'], mask=lambda x, y: y <= 23)
    c.rect(12, 23, 19, 28, 'O')
    for y in range(20, 29):
        if c.get(12, y) == 'O': c.put(12, y, 'p')
        c.put(19, y, 'o') if c.get(19, y) == 'O' else None
    for y in range(21, 29):
        c.put(15, y, 'o')
    c.put(17, 25, 'Y')
    # round windows
    for wx in (7, 22):
        c.stamp([".pp.", "pccp", "pAcp", ".pp."], wx, 19)
    # flower box under left window, step
    for x in range(6, 12):
        c.put(x, 23, 'O')
    for (x, ch) in ((6, 'i'), (7, 'E'), (8, 'Y'), (9, 'E'), (10, 'i')):
        c.put(x, 22, ch)
    c.rect(11, 29, 20, 30, '8')
    for x in range(11, 21):
        c.put(x, 30, '6')
    return c.rows()


def den():
    c = Canvas(32, 32)
    # log lying sideways: body
    for y in range(10, 28):
        t = (y - 10) / 17
        ch = 'p' if t < 0.15 else 'O' if t < 0.6 else 'o' if t < 0.9 else 'P'
        for x in range(8, 30):
            c.put(x, y, ch)
    # bark grooves
    for y in (13, 17, 21, 25):
        for x in range(9, 30):
            if (x + y) % 5 != 0:
                c.put(x, y, 'o' if y < 22 else 'P')
    # rounded right end
    for (x, y) in ((29, 10), (29, 11), (29, 26), (29, 27)):
        c.put(x, y, '.')
    # left end: cut face with clear growth rings
    c.ellipse(7, 18.5, 5.5, 8.6, ['<', '<', 'p', 'p'])
    for (rx, ry, ch) in ((5.5, 8.6, 'o'), (3.9, 6.2, 'O'), (2.3, 3.8, 'O'), (0.9, 1.6, 'o')):
        for y in range(32):
            for x in range(32):
                dx = (x + 0.5 - 7) / rx; dy = (y + 0.5 - 18.5) / ry
                d = dx * dx + dy * dy
                if (0.7 if rx > 5 else 0.74) < d <= 1.0:
                    c.put(x, y, ch)
    c.put(5, 14, 'N'); c.put(4, 16, 'N')
    # moss + mushrooms on top
    for x in range(9, 30):
        c.put(x, 10, 'E' if x % 3 else 'f')
        if x % 4 == 0:
            c.put(x, 11, 'e')
    c.stamp([".RR.", "RHRR", ".NN."], 24, 7)
    c.stamp(["qR", "N."], 20, 8)
    # stovepipe chimney
    c.rect(14, 5, 15, 9, 'g'); c.put(14, 5, 'G'); c.put(13, 4, 'n'); c.put(14, 4, 'n'); c.put(15, 4, 'n'); c.put(16, 4, 'n')
    c.put(15, 2, 'G'); c.put(16, 1, 'W')
    # round-top door on the side with a light wooden frame
    door = [
        "..pppp..",
        ".pOOOOp.",
        "pOOoOOOp",
        "pOOoOOOp",
        "pOOoOOOp",
        "pOOoOYOp",
        "pOOoOOOp",
        "pOOoOOOp",
        "pOOoOOOp",
    ]
    c.stamp(door, 16, 19)
    for y in range(20, 28):
        c.put(23, y, 'o')
    # window
    c.stamp(["pppp", "pAcp", "pchp", "pppp"], 25, 15)
    # doormat + grass
    c.rect(18, 28, 23, 28, 'R')
    for x in range(3, 30):
        if c.get(x, 29) == '.':
            c.put(x, 29, '%' if x % 3 else '#')
    return c.rows()


def gate():
    c = Canvas(32, 32)
    # posts with caps
    for px in (2, 26):
        c.rect(px, 5, px + 3, 29, 'O')
        for y in range(5, 30):
            c.put(px, y, 'p'); c.put(px + 3, y, 'o')
        c.rect(px - 1, 3, px + 4, 4, 'p')
        for x in range(px - 1, px + 5):
            c.put(x, 3, '<'); c.put(x, 5, 'o')
    # planks
    for x in range(6, 26):
        top = 7 if (x // 3) % 2 == 0 else 8
        for y in range(top, 28):
            k = x % 3
            c.put(x, y, 'p' if k == 0 else 'O' if k == 1 else 'o')
        c.put(x, top, '<' if x % 3 == 0 else 'p')
    # cross bars + z-brace
    for y in (11, 23):
        for x in range(6, 26):
            c.put(x, y, 'p'); c.put(x, y + 1, 'o')
    for i in range(10):
        x = 8 + i * 1.6; y = 22 - i
        for dx in (0, 1):
            c.put(int(x) + dx, int(y), 'O')
            c.put(int(x) + dx, int(y) + 1, 'o')
    # iron chain + padlock in the middle
    for (x, y) in ((12, 16), (13, 17), (18, 17), (19, 16)):
        c.put(x, y, 'g')
    c.stamp(["..nnn..", ".n...n.", ".n...n.", "YYYYYYY", "YuYYYYy", "YuYkYYy", "YYYkYyy", "yyyyyyU"], 13, 14)
    # grass at the base
    for x in range(1, 31):
        if c.get(x, 29) == '.':
            c.put(x, 29, '%' if x % 3 else '#')
    return c.rows()


SPRITES['prop_hut'] = {'w': 32, 'rows': hut()}
SPRITES['prop_den'] = {'w': 32, 'rows': den()}
SPRITES['prop_gate'] = {'w': 32, 'rows': gate()}
