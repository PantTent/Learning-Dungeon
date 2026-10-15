from draw import Canvas
SPRITES = {}

SPRITES['icon_head'] = [
    "................",
    "................",
    "......gGGg......",
    "....gGWWGGGg....",
    "...gGWWGGGGgn...",
    "...GWGGGGGGgn...",
    "...GWGGGGGGgn...",
    "...gKKKKKKKKn...",
    "...GGGGgGGGgn...",
    "...GWGGgGGGgn...",
    "...gGGGgGGggn...",
    "....gggggggn....",
    "................",
    "................",
    "................",
    "................",
]

SPRITES['icon_chest'] = [
    "................",
    "................",
    "..gGGg....gGgn..",
    ".gGWWGg..gGGGgn.",
    ".GWGGGGggGGGGgn.",
    ".GWGGGGGGGGGGgn.",
    "..GWGGGgGGGGgn..",
    "..GWGGGgGGGGgn..",
    "..gGGGGgGGGGgn..",
    "...GGGGgGGGgn...",
    "...oOOOyOOOOo...",
    "...gGGGGGGGgn...",
    "...gGGGgGGGgn...",
    "....ggggggnn....",
    "................",
    "................",
]

SPRITES['icon_legs'] = [
    "................",
    "................",
    "...oOOOyOOOOo...",
    "...GWGGGGGGGg...",
    "...GWGGggGGGg...",
    "...GWGg..gGGg...",
    "...GWGg..gGGg...",
    "...GWGg..gGGg...",
    "...WGGg..WGGg...",
    "...GWGg..gWGg...",
    "...GWGg..gGGg...",
    "...GWGg..gGGg...",
    "..GGGgg..GGGgg..",
    "..nnnnn..nnnnn..",
    "................",
    "................",
]

SPRITES['icon_hands'] = [
    "................",
    "................",
    "......Gg.Gg.....",
    "....GgGgGgGg....",
    "....GgGgGgGg....",
    "....GgGgGgGg.Gg.",
    "....WWGWGWGg.Gg.",
    "....GWGGGGGGGGg.",
    "....GWGGGGGGGg..",
    "....GGGGGGGGg...",
    ".....GGGGGGg....",
    ".....oOOOOOo....",
    ".....oOpOOOo....",
    ".....oOOOOOo....",
    "................",
    "................",
]

SPRITES['icon_feet'] = [
    "................",
    "................",
    ".....pOOOOo.....",
    ".....oOOOOo.....",
    "......OpOo......",
    "......OpOo......",
    "......OpOo......",
    "......nGGn......",
    "......OpOo......",
    "......OpOOOo....",
    "......OpOOOOOo..",
    ".....oOOOOOOOOo.",
    ".....PPPPPPPPPP.",
    "................",
    "................",
    "................",
]


def ring():
    c = Canvas(16, 16)
    c.ellipse(7.5, 10, 5, 4.2, ['u', 'Y', 'y', 'U'])
    c.ellipse(7.5, 10.2, 2.8, 2.2, ['.', '.', '.', '.'])
    for (x, y) in ((5, 8), (6, 8), (10, 12), (9, 12)):
        pass
    c.stamp([
        ".AcB.",
        "AcBBb",
        "cBBbC",
        ".bbC.",
    ], 5, 2)
    c.put(5, 6, 'y'); c.put(9, 6, 'y')
    return c.rows()


SPRITES['icon_ring'] = ring()


def neck():
    c = Canvas(16, 16)
    chain = [(3, 1), (3, 2), (4, 3), (4, 4), (5, 5), (5, 6), (6, 7)]
    for i, (x, y) in enumerate(chain):
        c.put(x, y, 'G' if i % 2 == 0 else 'g')
        c.put(15-x, y, 'G' if i % 2 == 0 else 'g')
    c.ellipse(7.5, 10.5, 3.5, 3.5, ['u', 'Y', 'y', 'U'])
    c.stamp([
        "qR",
        "Rr",
    ], 7, 10)
    c.put(7, 7, 'Y'); c.put(8, 7, 'y')
    c.put(7, 14, 'y'); c.put(8, 14, 'U')
    return c.rows()


SPRITES['icon_neck'] = neck()


def blade(c, x0, y0, x1, y1, width=2):
    """Diagonal blade from hilt (x0,y0) to tip (x1,y1) going up-right."""
    c.line(x0, y0, x1, y1, 'G')
    c.line(x0, y0-1, x1-1, y1, 'W')
    if width >= 2:
        c.line(x0+1, y0, x1, y1+1, 'g')
    if width >= 3:
        c.line(x0+1, y0+1, x1, y1+2, 'n')
        c.line(x0, y0-2, x1-2, y1, 'W')


def sword():
    c = Canvas(16, 16)
    blade(c, 6, 9, 13, 2)
    c.put(14, 1, 'W')
    c.line(3, 7, 7, 11, 'Y'); c.put(4, 8, 'u'); c.put(6, 10, 'y'); c.put(7, 11, 'y')
    c.line(4, 11, 2, 13, 'O'); c.put(3, 12, 'o')
    c.put(1, 14, 'Y'); c.put(2, 14, 'y'); c.put(1, 13, 'u')
    return c.rows()


SPRITES['icon_sword'] = sword()


def greatsword():
    c = Canvas(16, 16)
    blade(c, 5, 10, 13, 2, width=3)
    c.put(14, 1, 'W'); c.put(13, 1, 'W'); c.put(14, 2, 'G')
    c.line(1, 8, 7, 14, 'Y'); c.put(2, 9, 'u'); c.put(6, 13, 'y'); c.put(7, 14, 'y'); c.put(1, 8, 'y')
    c.line(3, 12, 1, 14, 'O'); c.put(2, 12, 'O')
    c.put(4, 11, 'Y'); c.put(5, 12, 'Y')
    c.put(0, 15, 'Y')
    # fuller groove
    c.line(7, 7, 11, 3, 'g')
    return c.rows()


SPRITES['icon_greatsword'] = greatsword()


def dagger():
    c = Canvas(16, 16)
    blade(c, 8, 8, 12, 4)
    c.put(13, 3, 'W')
    c.line(6, 7, 9, 10, 'Y'); c.put(6, 7, 'u'); c.put(9, 10, 'y')
    c.line(6, 10, 4, 12, 'P'); c.put(5, 10, 'o'); c.put(5, 11, 'O')
    c.put(3, 13, 'Y'); c.put(4, 13, 'y')
    return c.rows()


SPRITES['icon_dagger'] = dagger()


def handle(c, x0, y0, x1, y1):
    c.line(x0, y0, x1, y1, 'O')
    c.line(x0+1, y0, x1+1, y1, 'o')
    c.line(x0, y0-1, x1, y1-1, 'p')


def axe_head(c, cx, sides, top, ext):
    """Vertical-handle axe head. cx = handle left column, ext[y] = blade length."""
    for i, e in enumerate(ext):
        y = top + i
        for side in sides:
            for k in range(1, e+1):
                x = cx + 1 + k if side > 0 else cx - k
                last = (k == e)
                if last:
                    ch = 'W' if i < len(ext)-2 else 'G'
                elif i >= len(ext) - 2 or (side > 0 and k == 1):
                    ch = 'g'
                else:
                    ch = 'G'
                c.put(x, y, ch)


def vhandle(c, cx, y0, y1):
    for y in range(y0, y1+1):
        c.put(cx, y, 'O'); c.put(cx+1, y, 'o')
    c.put(cx, y1, 'P'); c.put(cx+1, y1, 'P')
    for y in (y1-3, y1-1):
        c.put(cx, y, 'P'); c.put(cx+1, y, 'P')


def axe():
    c = Canvas(16, 16)
    vhandle(c, 5, 2, 14)
    axe_head(c, 5, (1,), 1, [1, 3, 4, 5, 5, 5, 4, 3, 1])
    c.rect(4, 3, 7, 6, 'g'); c.put(4, 3, 'G'); c.put(5, 3, 'G'); c.put(4, 4, 'G')
    c.put(5, 1, 'p'); c.put(6, 1, 'O')
    return c.rows()


SPRITES['icon_axe'] = axe()


def greataxe3():
    c = Canvas(16, 16)
    vhandle(c, 7, 2, 15)
    ext = [2, 4, 5, 6, 6, 6, 5, 4, 2]
    axe_head(c, 7, (1, -1), 1, ext)
    c.rect(6, 3, 9, 7, 'g'); c.put(6, 3, 'G'); c.put(7, 3, 'G'); c.put(6, 4, 'G')
    c.put(7, 0, 'G'); c.put(8, 0, 'g'); c.put(7, 1, 'W'); c.put(8, 1, 'G')
    c.put(7, 5, 'Y'); c.put(8, 5, 'y')
    return c.rows()


SPRITES['icon_greataxe'] = greataxe3()


def mace():
    c = Canvas(16, 16)
    handle(c, 3, 13, 9, 7)
    for (x, y) in ((11, 1), (12, 1), (15, 5), (15, 6), (7, 5), (7, 6), (11, 10), (12, 10),
                   (8, 2), (14, 2), (14, 9), (8, 9)):
        c.put(x, y, 'g' if y > 6 or x > 12 else 'G')
    c.ellipse(11.5, 5.5, 3.6, 3.6, ['W', 'G', 'g', 'n'])
    c.put(2, 14, 'n')
    return c.rows()


SPRITES['icon_mace'] = mace()


def wand():
    c = Canvas(16, 16)
    c.line(3, 13, 10, 6, 'O')
    c.line(4, 13, 11, 6, 'o')
    c.put(3, 13, 'Y'); c.put(4, 13, 'y'); c.put(10, 6, 'Y'); c.put(11, 6, 'y')
    c.stamp([
        "..A..",
        ".AcA.",
        "AccaA",
        ".Aah.",
        "..h..",
    ], 10, 1)
    c.put(14, 6, 'A'); c.put(9, 2, 'A'); c.put(14, 1, 'a')
    return c.rows()


SPRITES['icon_wand'] = wand()


def staff():
    c = Canvas(16, 16)
    c.line(2, 14, 10, 6, 'O')
    c.line(3, 14, 11, 6, 'o')
    c.line(2, 13, 10, 5, 'p')
    # curled top holding a gem
    c.stamp([
        ".pOOo.",
        "pO..Oo",
        "O.AB.o",
        "O.Bb.o",
        ".o..o.",
    ], 9, 1)
    c.put(11, 3, 'c'); c.put(12, 3, 'B'); c.put(11, 4, 'B'); c.put(12, 4, 'b')
    return c.rows()


SPRITES['icon_staff'] = staff()

SPRITES['icon_bow'] = [
    "................",
    "....pO..........",
    "....mpOo........",
    "....m..Oo.......",
    "....m...Oo......",
    "....m....O......",
    "....m....Oo.....",
    "....m....PP.....",
    "....m....PP.....",
    "....m....Oo.....",
    "....m....O......",
    "....m...Oo......",
    "....m..Oo.......",
    "....mpOo........",
    "....pO..........",
    "................",
]


def shield():
    c = Canvas(16, 16)
    rows = [
        "GWWWWWWWWWWg",
        "WOpppppppOOn",
        "WpOOOOOOOOon",
        "WpOOOOOOOOon",
        "WpOOOOOOOOon",
        "WpOOOOOOOOon",
        "GpOOOOOOOOog",
        ".GpOOOOOOog.",
        ".gOOOOOOOon.",
        "..gOOOOOon..",
        "...gOOOon...",
        "....gnnn....",
    ]
    c.stamp(rows, 2, 2)
    # steel cross band
    for y in range(3, 13):
        c.put(7, y, 'G'); c.put(8, y, 'g')
    for x in range(3, 13):
        c.put(x, 6, 'G'); c.put(x, 7, 'g')
    c.put(7, 6, 'W'); c.put(8, 6, 'G'); c.put(7, 7, 'G'); c.put(8, 7, 'n')
    return c.rows()


SPRITES['icon_shield'] = shield()

SPRITES['icon_tome'] = [
    "................",
    "................",
    "...ooooooooooo..",
    "..oOpOOOOOOOOoN.",
    "..OpYOOOOOOYOoN.",
    "..OpOOOyyOOOOoN.",
    "..OpOOyRqyOOOoN.",
    "..OpOOyRRyOOOoN.",
    "..OpOOOyyOOOOoN.",
    "..OpOOOOOOOOOoN.",
    "..OpYOOOOOOYOom.",
    "..OpOOOOOOOOOom.",
    "..oooooooooooNm.",
    "...PmNNNNNNNNm..",
    "................",
    "................",
]


def potion(liq):
    hi, mid, dark, deep = liq
    c = Canvas(16, 16)
    c.ellipse(7.5, 10, 5, 4.6, ['A', 'A', 'G', 'g'])  # glass
    c.ellipse(7.5, 10.4, 4.1, 3.8, [hi, mid, dark, deep])
    for x in range(4, 12):
        if c.get(x, 7) in (hi, mid, dark, deep):
            c.put(x, 7, 'A' if x < 7 else 'G')
    c.rect(6, 3, 9, 6, 'G')
    c.put(6, 4, 'A'); c.put(6, 5, 'A'); c.put(9, 4, 'g'); c.put(9, 5, 'g')
    c.rect(6, 1, 9, 2, 'O'); c.put(6, 1, 'p'); c.put(9, 2, 'o'); c.put(9, 1, 'o')
    c.put(5, 3, 'G'); c.put(10, 3, 'g')
    # glass shine
    c.put(4, 9, 'H'); c.put(4, 10, 'H'); c.put(5, 8, 'H')
    return c.rows()


SPRITES['icon_potion'] = potion(['q', 'R', 'r', 'Q'])
SPRITES['icon_mana'] = potion(['c', 'B', 'b', 'C'])


def gold():
    c = Canvas(16, 16)

    def coin(x, y):
        c.stamp([
            ".uYYYy.",
            "uYYYYYy",
            "yYYYYyU",
            ".UUUUU.",
        ], x, y)
    for i in range(4):
        coin(1, 11 - i*2)
    for i in range(2):
        coin(8, 11 - i*2)
    # standing coin face
    c.stamp([
        ".uYYy.",
        "uYuyYy",
        "YuyYYy",
        "YyYYyU",
        ".yyUU.",
    ], 9, 2)
    return c.rows()


SPRITES['icon_gold'] = gold()
