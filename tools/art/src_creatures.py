from draw import Canvas
SPRITES = {}

SPRITES['enemy_slime'] = [
    "................",
    "................",
    "................",
    "................",
    "......eee.......",
    ".....eEEEe......",
    "....eEfEEEe.....",
    "...eEfHEEEEe....",
    "..eEfHfEEEEEe...",
    ".eEEfEEEEHEEHEe.",
    ".eEEEEEEEkEEkEe.",
    ".eEEEEEEEEEEEEe.",
    ".eEEEEEEEEFFEEe.",
    ".eeEEEEEEEEEEee.",
    "..FeeeeeeeeeeF..",
    "................",
]

SPRITES['enemy_bat'] = [
    "................",
    "................",
    "................",
    "......v..v......",
    ".x....vVVv....x.",
    ".vx..vVVVVv..xv.",
    ".wvx.vVYVYv.xvw.",
    ".wVvxvVVVVvxvVw.",
    ".wVVvVVHVHVVvVw.",
    ".wvVVvvVVvvVVvw.",
    ".v.v.v.vv.v.v.v.",
    "................",
    "................",
    "................",
    "................",
    "................",
]

SPRITES['enemy_rat'] = [
    "................",
    "................",
    "................",
    "................",
    "........iI......",
    ".......iIOO.....",
    ".....OOOOpOOO...",
    "...OOpppOOOkOO..",
    "..OppOOOOOOOOOI.",
    "..OpOOOOOOOOOH..",
    "..OOOOOOOOOoo...",
    ".IoOOOOOoooo....",
    ".I.oooooo.......",
    "..I.Po..Po......",
    "................",
    "................",
]

SPRITES['enemy_mushroom'] = [
    "................",
    "................",
    "......rRRRr.....",
    "....rRRHHRRRr...",
    "...rRHHRRRRHRr..",
    "..rRRHRRRHHRRRr.",
    "..rRRRRRRHHRRRr.",
    "..QrrRRRRRRRrrQ.",
    "...QQrrrrrrrQQ..",
    "....mNNNNNNNm...",
    "....mkNNNNNkm...",
    "....mNkkNkkNm...",
    "....mNNNNNNNm...",
    "....mNNQQQNNm...",
    ".....PP...PP....",
    "................",
]

SPRITES['enemy_spider'] = [
    "................",
    "................",
    "................",
    "....d......d....",
    "...d.d....d.d...",
    "..d...dDDd...d..",
    "..d..dDgVDd..d..",
    ".d..dDgVVDDd..d.",
    ".d.d.DgVVDD.d.d.",
    ".d.d.DDDDDD.d.d.",
    "...d.DqRDqR.d...",
    "..d.dDDRRDDd.d..",
    "....d.DDDD.d....",
    "......N..N......",
    "................",
    "................",
]

SPRITES['enemy_goblin'] = [
    "................",
    "................",
    ".....eeee.......",
    "....eEfEEe......",
    ".e.eEfEEEEe.e...",
    ".eeEEEEEEEEee...",
    "..eEEEEYkEYke...",
    "...eEEEEEEEEe...",
    "...eEEEHkHkHeW..",
    "....eeeEEEee.G..",
    "....oOpOOOo.yUy.",
    "...EoOpOOOoEEE..",
    "...eoPYPPPoe....",
    "....oOOoOOo.....",
    "....eE..eE......",
    "................",
]

SPRITES['enemy_skeleton'] = [
    "................",
    "................",
    ".....NNNN....T..",
    "....NNNNNN...T..",
    "...mNNNNkkN..T..",
    "...mNNNNkkNN.T..",
    "...mmNNNNNkN.T..",
    "....mNNkNkNm.t..",
    ".....mmNNNm.MMM.",
    "......mNm....M..",
    "....NNNNNNNNNN..",
    "....m.NkNkN.....",
    "....m.mNNNm.....",
    "......N...N.....",
    ".....NN...NN....",
    "................",
]

SPRITES['enemy_wolf'] = [
    "................",
    "................",
    ".........nG.....",
    "........nGGg....",
    ".g......gGGGGg..",
    ".Gg.....gGkGGGG.",
    ".gGg....nGGGGGk.",
    "..gGnnnnnGGGWW..",
    "...ngggggGGGWW..",
    "...gGGGGGGGGW...",
    "...gWWWWWWGGg...",
    "...nG.ng...gGn..",
    "...n..n....n.n..",
    "..nn.nn...nn.nn.",
    "................",
    "................",
]

SPRITES['minion_imp'] = [
    "................",
    "................",
    "....m....m......",
    "....NrRRRN......",
    ".....RqRRRR.....",
    ".Q..RqRRYkR.....",
    ".rQ.RRRRRRR.....",
    ".rrQrRRHkHr.....",
    ".rrrQrRRRr......",
    "..rrQRqRRRR.....",
    "...Q.RRRRr......",
    "...r.rRr.rRr....",
    "..r..rr...rr....",
    ".Q..............",
    "................",
    "................",
]

SPRITES['minion_skeleton'] = [
    "................",
    "................",
    ".....NNNN....W..",
    "....NNNNNN...G..",
    "...mNNNNaaN..G..",
    "...mNNNNaAN..G..",
    "...mmNNNNNkN.G..",
    "....mNkNNNkm.g..",
    ".....BBBBBB.nYn.",
    "..hh.BcNmB...n..",
    ".hcBh.NNNNNNNN..",
    ".hBAh.NkNkN.....",
    ".hcBh.mNNNm.....",
    "..hh..N...N.....",
    ".....NN...NN....",
    "................",
]


def boss():
    c = Canvas(32, 32)
    # club (behind everything)
    c.line(23, 24, 26, 12, 'O', thick=2)
    c.line(24, 24, 27, 12, 'o')
    c.ellipse(26.5, 7.5, 4.2, 6.2, ['p', 'O', 'o', 'P'])
    for (x, y) in ((25, 4), (28, 6), (24, 9), (27, 10), (29, 9)):
        c.put(x, y, 'G'); c.put(x, y+1, 'n')
    c.put(26, 1, 'G'); c.put(30, 4, 'G'); c.put(31, 8, 'G')
    # cape
    c.ellipse(14, 22, 12, 8, ['q', 'R', 'r', 'Q'])
    # body + belly
    c.ellipse(14, 21, 9, 8, ['f', 'E', 'e', 'F'])
    c.ellipse(15.5, 22, 6, 5.5, ['J', 'J', 'f', 'E'])
    c.put(16, 23, 'e')  # belly button
    # belt
    for x in range(6, 23):
        if c.get(x, 26) in 'fEeFJ':
            c.put(x, 26, 'P')
            if c.get(x, 25) in 'fEeFJ': c.put(x, 25, 'o')
    c.stamp(["yYy", "YuY", "yYy"], 14, 25)
    # legs + boots (toes to the right)
    c.rect(9, 28, 12, 29, 'e'); c.rect(16, 28, 19, 29, 'e')
    c.stamp(["OOOOp", "oOOOOO", "PPPPPP"], 8, 28)
    c.stamp(["OOOOp", "oOOOOO", "PPPPPP"], 16, 28)
    # ermine collar
    for x in range(6, 22):
        c.put(x, 16, 'W'); c.put(x, 17, 'G' if x % 2 else 'W')
    for x in (8, 12, 16, 20):
        c.put(x, 17, 'K')
    # head
    c.ellipse(13.5, 9.5, 8.5, 6.4, ['f', 'E', 'e', 'F'])
    # ears
    c.stamp([
        "fe....",
        ".fEe..",
        ".eEEEe",
        "..eEEE",
        "...eEE",
        "....eE",
    ], 0, 5)
    c.stamp([
        "....fe",
        "..EEe.",
        "EEEe..",
        "EEe...",
    ], 20, 6)
    # crown (slightly small and tilted = goofy)
    c.stamp([
        "u...u...u",
        "Yy.yYy.yY",
        "YYYYYYYYY",
        "YRuYBuYRY",
        "yyyyyyyyy",
    ], 9, 0)
    # brows
    for x in (12, 13, 14, 15): c.put(x, 7, 'F')
    for x in (17, 18, 19, 20): c.put(x, 7, 'F')
    # eyes
    c.stamp(["HHH", "HHk", "Hkk"], 12, 8)
    c.stamp(["HHH", "HHk", "Hkk"], 17, 8)
    # nose (big bulbous, points right)
    c.ellipse(21, 11.5, 1.8, 1.4, ['E', 'E', 'e', 'F'])
    # blush
    c.put(10, 12, 'i'); c.put(11, 12, 'i')
    # grin with tusks
    c.stamp([
        "F.........F",
        ".NQQQQQQQN.",
        "..QQiiiQQ..",
    ], 10, 12)
    c.put(11, 12, 'i')
    c.put(10, 11, 'i')
    # right arm + hand gripping club
    c.line(20, 17, 23, 20, 'E', thick=2)
    c.ellipse(24.5, 21, 2.2, 2.2, ['E', 'E', 'e', 'F'])
    c.put(23, 21, 'e'); c.put(24, 22, 'e')
    # left arm resting on belly
    c.ellipse(6.5, 20, 2.2, 3.2, ['f', 'E', 'e', 'F'])
    c.ellipse(8.5, 23, 1.8, 1.6, ['E', 'E', 'e', 'F'])
    # cape clasp
    c.put(7, 16, 'Y'); c.put(7, 17, 'y')
    return c.rows()

SPRITES['boss_goblin_king'] = boss()

# Training dummy for developer mode: a straw sack on a post with a target.
SPRITES['enemy_dummy'] = [
    ".....pppppp.....",
    "....pOkpOkpp....",
    "....ppOppOpp....",
    "....pppppppp....",
    ".....pkkkkp.....",
    "..oo..oOOo..oo..",
    ".oOOOOOOOOOOOOo.",
    ".YyYy.YYYY.yYyY.",
    ".....YqqqqY.....",
    "....YqHHHHqY....",
    "....YqHRRHqY....",
    "....YqHRRHqY....",
    "....YqHHHHqY....",
    ".....YqqqqY.....",
    ".......oO.......",
    ".....OOOOOO.....",
]
