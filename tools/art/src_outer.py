"""Outer planets: space-station modules (Uranus/Neptune), deep space telescope (Pluto),
titanium/platinum asteroids + minerals, far-away ring station, end-of-game trophy."""
import math
from draw import Canvas
from src_space import (rock, icon, NUGGET, CRYSTAL, BAR, grid, poly, cyl, font3, inpoly,
                       STEEL, BLUE, RED, GOLD, ORANGE, ICE)
SPRITES = {}

TEAL = ['+', '=', '~', 'C']
HULL = ['W', 'G', 'g', 'n']


# ================================================================ helpers

def plate(c, x0, x1, y=28):
    """Flat riveted mounting plate on the station deck (rows y..y+2)."""
    c.rect(x0, y, x1, y, 'G')
    c.rect(x0, y + 1, x1, y + 1, 'g')
    c.rect(x0 + 1, y + 2, x1 - 1, y + 2, 'n')
    for x in range(x0 + 1, x1, 3):
        c.put(x, y + 1, 'n')
    c.put(x0, y, 'W'); c.put(x0 + 1, y, 'W')
    # teal clamp marks
    c.put(x0 + 2, y + 2, '='); c.put(x1 - 2, y + 2, '=')


def rivets(c, x0, x1, y, step=3, ch='n'):
    for x in range(x0, x1 + 1, step):
        if c.get(x, y) != '.':
            c.put(x, y, ch)


def band(c, x0, x1, y, light='G', dark='g', split=None):
    split = (x0 + x1) // 2 if split is None else split
    for x in range(x0, x1 + 1):
        c.put(x, y, light if x < split else dark)


def porthole(c, x, y, big=False):
    """Round window: 4x4 (or 6x6 big) with a steel rim and a glint."""
    if big:
        c.stamp([".nnnn.",
                 "nAAaan",
                 "nAaahn",
                 "nahhbn",
                 "nahbbn",
                 ".nnnn."], x, y)
        c.put(x + 1, y + 1, 'H')
    else:
        c.stamp([".nn.",
                 "nAan",
                 "nahn",
                 ".nn."], x, y)


def solar(c, x0, y0, w, h):
    """Small blue solar panel with gold frame and grid lines."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            c.put(x, y, 'B' if (y - y0) < h // 2 else 'b')
    for x in range(x0, x0 + w):
        for y in range(y0, y0 + h):
            if (x - x0) % 3 == 2:
                c.put(x, y, 'C')
    c.put(x0, y0, 'c')
    for x in range(x0, x0 + w):
        c.put(x, y0 - 1, 'Y')
        c.put(x, y0 + h, 'y')


def light(c, x, y, col='R'):
    hi = {'R': 'q', '+': 'A', 'Y': 'u', 'l': 'L'}[col]
    c.put(x, y, hi)
    c.put(x, y + 1, col)


def dome(c, cx, cy, rx, ry, ramp):
    c.ellipse(cx, cy, rx, ry, ramp, mask=lambda x, y: y <= cy)


# ================================================================ station modules (32x32)

def station_admin():
    c = Canvas(32, 32)
    # solar wings on struts
    c.rect(1, 16, 7, 16, 'g'); c.rect(24, 16, 30, 16, 'g')
    solar(c, 1, 12, 5, 4)
    solar(c, 26, 12, 5, 4)
    # central hub cylinder with rounded top
    cyl(c, 7, 24, 12, 27, HULL)
    dome(c, 15.5, 12.5, 8.5, 4, ['W', 'W', 'G', 'g'])
    # hull bands + rivets
    for y in (14, 24):
        band(c, 7, 24, y, 'G', 'g', 14)
        rivets(c, 8, 23, y, 3)
    # teal stripe
    band(c, 7, 24, 22, '+', '=', 14)
    # big round command window
    c.stamp(["..nnnnnn..",
             ".nAAAaaan.",
             "nAHAaaahhn",
             "nAAaaahhbn",
             "naaahhhbbn",
             ".nahhbbbn.",
             "..nnnnnn.."], 11, 15)
    # hatch
    c.rect(14, 25, 17, 27, 'n'); c.rect(15, 25, 16, 27, 'D'); c.put(15, 26, '+')
    # mast + dish antenna
    c.rect(15, 5, 15, 9, 'G'); c.rect(16, 5, 16, 9, 'g')
    c.stamp(["....q....",
             "W...g...n",
             "WG..g..gn",
             ".WGGgggn.",
             "..WGggn.."], 11, 1)
    c.put(15, 2, 'R')
    # antenna lights
    light(c, 8, 9, 'R')
    light(c, 23, 9, '+')
    plate(c, 3, 28)
    return c.rows()


def station_lox():
    c = Canvas(32, 32)
    # support frame (truss) on the right
    for y in range(8, 28):
        c.put(25, y, 'G'); c.put(28, y, 'g')
    for y in range(9, 27, 4):
        for i in range(3):
            c.put(26 + i, y + i, 'g')
        c.rect(25, y, 28, y, 'G')
    solar(c, 23, 4, 7, 3)
    c.rect(26, 7, 27, 7, 'n')
    light(c, 29, 1, 'R')
    c.put(29, 3, 'g')
    # main oxygen tank: capsule with domed top & bottom
    cyl(c, 5, 21, 9, 25, ['W', 'A', 'a', 'h'])
    dome(c, 13.5, 9.5, 8.5, 6, ['H', 'W', 'A', 'a'])
    # lower ring/skirt
    cyl(c, 6, 20, 26, 27, HULL)
    # riveted hull bands
    for y in (10, 23):
        band(c, 5, 21, y, 'G', 'g', 13)
        rivets(c, 6, 20, y, 3)
    # O2 badge
    c.rect(8, 13, 18, 20, 'B')
    c.rect(8, 20, 18, 20, 'b')
    c.rect(8, 12, 18, 12, 'c')
    font3(c, 'O2', 10, 14, 'W')
    # portholes
    porthole(c, 15, 4)
    # teal valve + pipe to frame
    c.rect(22, 17, 24, 17, 'G'); c.rect(22, 18, 24, 18, 'g')
    c.put(23, 16, '+')
    c.rect(22, 24, 24, 24, '=')
    # frost
    for (x, y) in ((6, 12), (7, 11), (6, 21), (20, 12), (9, 5), (10, 4)):
        c.put(x, y, 'H')
    plate(c, 2, 30)
    return c.rows()


def station_methane():
    c = Canvas(32, 32)
    # cradle frame
    for x in (3, 26):
        c.rect(x, 6, x, 27, 'G'); c.rect(x + 1, 6, x + 1, 27, 'g')
    c.rect(3, 5, 27, 5, 'G'); c.rect(3, 6, 27, 6, 'g')
    rivets(c, 4, 26, 6, 3)
    # straps
    # orange tank (capsule)
    cyl(c, 7, 22, 11, 23, ['^', '7', 'T', 't'])
    c.ellipse(14.5, 11.5, 7.5, 4, ['u', '^', '7', 'T'], mask=lambda x, y: y <= 11)
    c.ellipse(14.5, 23.5, 7.5, 3, ['7', 'T', 't', 't'], mask=lambda x, y: y >= 24)
    # struts tank -> frame
    for y in (12, 22):
        c.rect(5, y, 6, y, 'n'); c.rect(23, y, 25, y, 'n')
    # tank bands
    for y in (10, 20):
        band(c, 7, 22, y, 'y', 'U', 14)
        rivets(c, 8, 21, y, 3, 'U')
    # CH4 label
    for y in range(13, 19):
        for x in range(8, 22):
            c.put(x, y, 'u' if y == 13 else 'Y')
    font3(c, 'CH4', 9, 13, 't')
    for x in range(8, 22):
        c.put(x, 18, 'y')
    # highlight
    c.put(8, 11, 'u'); c.put(8, 12, 'u')
    # top vent with teal cap + light
    c.rect(14, 3, 15, 4, 'g'); c.put(14, 2, '+'); c.put(15, 2, '=')
    light(c, 4, 2, 'R'); c.put(4, 4, 'g')
    # small solar wings on frame sides
    solar(c, 28, 10, 3, 6)
    solar(c, 0, 10, 3, 6)
    plate(c, 2, 29)
    return c.rows()


def station_pad():
    c = Canvas(32, 32)
    # repair platform (low deck with teal target ring)
    c.rect(9, 24, 30, 24, 'W')
    c.rect(9, 25, 30, 25, 'G')
    c.rect(9, 26, 30, 27, 'g')
    for x in range(10, 30, 4):
        c.put(x, 26, 'n'); c.put(x, 27, 'n')
    for x in range(13, 27):
        c.put(x, 24, '+')
    for x in (12, 27):
        c.put(x, 24, '=')
    c.rect(18, 25, 21, 25, 'a')
    light(c, 10, 22, 'Y'); light(c, 29, 22, 'Y')
    # arm base turret (left)
    cyl(c, 2, 8, 19, 27, HULL)
    dome(c, 5.5, 19.5, 3.5, 2.5, ['W', 'G', 'g', 'n'])
    band(c, 2, 8, 23, '+', '=', 5)
    porthole(c, 3, 24)
    # lower arm: shoulder (5,17) -> elbow (11,6)
    c.line(5, 17, 11, 6, 'G', thick=2)
    c.line(6, 17, 12, 6, 'g')
    # upper arm: elbow (12,6) -> wrist (22,9)
    c.line(12, 5, 22, 8, 'G')
    c.line(12, 6, 22, 9, 'g')
    c.line(12, 7, 22, 10, 'n')
    # joints
    for (x, y) in ((4, 17), (11, 5)):
        c.stamp(["GW", "gn"], x, y)
        c.put(x, y, '+')
    c.stamp([".+.", "+=~", ".~."], 21, 8)
    # claw hanging down
    c.rect(22, 11, 22, 13, 'n')
    c.stamp(["gGGGg",
             "g...g",
             "n...n",
             ".n.n."], 20, 14)
    # warning light on arm
    light(c, 13, 2, 'R')
    c.put(13, 4, 'g')
    # little drone part on the pad
    c.stamp(["cBb", "Bbb"], 19, 22)
    plate(c, 1, 30)
    return c.rows()


def station_launch():
    c = Canvas(32, 32)
    # airlock module tower on the left
    cyl(c, 2, 10, 6, 27, HULL)
    dome(c, 6.5, 6.5, 4.5, 3, ['W', 'W', 'G', 'g'])
    for y in (9, 17, 25):
        band(c, 2, 10, y, 'G', 'g', 6)
        rivets(c, 3, 9, y, 2)
    band(c, 2, 10, 15, '+', '=', 6)
    porthole(c, 4, 10)
    # big round docking hatch facing right
    c.stamp([".nnn.",
             "n=+=n",
             "n+DDn",
             "n=D~n",
             ".nnn."], 4, 19)
    # antenna + beacon
    c.rect(6, 1, 6, 3, 'g'); light(c, 6, 0, 'R')
    # upper docking arm with teal guide light reaching right
    c.rect(11, 8, 17, 8, 'G'); c.rect(11, 9, 17, 9, 'g')
    for x in range(12, 17, 2):
        c.put(x, 9, 'n')
    c.stamp(["Gn", "g+", "gn"], 17, 7)
    # lower docking collar (open ring) where the ship stands
    c.rect(11, 18, 15, 18, 'G'); c.rect(11, 19, 15, 19, 'g')
    c.stamp(["G", "g", "n"], 15, 17)
    c.put(16, 18, '+')
    # small solar wing on the tower
    solar(c, 0, 12, 2, 3)
    # low docking deck
    c.rect(1, 25, 30, 25, 'W')
    c.rect(1, 26, 30, 26, 'G')
    c.rect(1, 27, 30, 27, 'g')
    for x in range(12, 30):
        if x % 4 in (0, 1):
            c.put(x, 26, '=')
    c.put(15, 24, 'g'); c.put(28, 24, 'g'); c.put(15, 23, 'G'); c.put(28, 23, 'G')
    light(c, 29, 22, '+')
    plate(c, 1, 30)
    return c.rows()


for _n, _f in (('station_admin', station_admin), ('station_lox', station_lox),
               ('station_methane', station_methane), ('station_pad', station_pad),
               ('station_launch', station_launch)):
    SPRITES[_n] = {'w': 32, 'rows': _f()}


# ================================================================ deep space telescope (32x32)

def base_scope():
    c = Canvas(32, 32)
    # sturdy concrete/steel base
    poly(c, [(9, 20), (21, 20), (24, 27), (6, 27)], ['G', 'g', 'g', 'n'])
    c.rect(9, 20, 21, 20, 'W')
    c.rect(13, 22, 17, 26, 'n'); c.rect(14, 23, 16, 26, 'D'); c.put(14, 23, 'a')
    # mount yoke
    c.rect(13, 15, 17, 19, 'g'); c.rect(13, 15, 14, 19, 'G')
    c.rect(15, 13, 16, 15, 'n')
    # big dish (tilted up-left), white
    def dmask(x, y):
        dx = (x + 0.5 - 13); dy = (y + 0.5 - 8)
        # tilt: rotate
        a = math.radians(-25)
        u = dx * math.cos(a) - dy * math.sin(a)
        v = dx * math.sin(a) + dy * math.cos(a)
        return (u / 11.5) ** 2 + (v / 5.0) ** 2 <= 1
    for y in range(32):
        for x in range(32):
            if dmask(x, y):
                dx = (x + 0.5 - 13); dy = (y + 0.5 - 8)
                a = math.radians(-25)
                v = dx * math.sin(a) + dy * math.cos(a)
                u = dx * math.cos(a) - dy * math.sin(a)
                r = (u / 11.5) ** 2 + (v / 5.0) ** 2
                if r > 0.75:
                    ch = 'G' if v < 0 else 'g'
                else:
                    ch = 'H' if v < -2 else 'W' if v < 1.5 else 'G'
                c.put(x, y, ch)
    # dish rim underside
    # feed horn struts + receiver
    c.line(9, 7, 13, 1, 'g'); c.line(18, 9, 13, 1, 'g')
    c.stamp(["Gn", "+="], 12, 0)
    # small optical telescope tube on the right
    c.line(21, 18, 28, 11, 'B', thick=2)
    c.line(22, 19, 29, 12, 'b')
    c.stamp(["Wc", "GB"], 28, 10)
    c.put(29, 10, 'A')
    c.rect(22, 19, 22, 26, 'g'); c.rect(23, 20, 23, 26, 'n')
    c.rect(21, 18, 22, 18, 'Y')
    # blinking lights
    light(c, 3, 3, 'R')
    c.put(7, 21, 'q'); c.put(23, 21, 'L')
    c.put(10, 24, '+'); c.put(20, 24, 'Y')
    plate(c, 3, 28)
    return c.rows()


SPRITES['base_scope'] = {'w': 32, 'rows': base_scope()}


# ================================================================ asteroids + minerals

SPRITES['rock_ti'] = rock(29, 7.0, 6.6, ['G', 'h', ';'])
SPRITES['rock_pt'] = rock(37, 7.3, 6.3, ['H', 'W', 'u'], sparkle=[(4, 6), (11, 5), (9, 11)])

SPRITES['min_ti'] = icon(BAR, ['A', 'a', 'h', ';'])
SPRITES['min_pt'] = icon(NUGGET, ['W', 'W', 'G', 'g'])
SPRITES['min_pt']['rows'][3] = SPRITES['min_pt']['rows'][3][:5] + 'u' + SPRITES['min_pt']['rows'][3][6:]
SPRITES['min_pt']['rows'][6] = SPRITES['min_pt']['rows'][6][:7] + 'u' + SPRITES['min_pt']['rows'][6][8:]


# ================================================================ far-away ring station (48x24)

def station_far():
    c = Canvas(48, 24)
    cx, cy = 23.5, 12
    # solar wings on long trusses
    c.rect(2, 12, 45, 12, 'g')
    for (x0, x1) in ((1, 9), (38, 46)):
        for y in range(8, 17):
            for x in range(x0, x1 + 1):
                c.put(x, y, 'B' if y < 12 else 'b')
        for x in range(x0, x1 + 1):
            if (x - x0) % 3 == 2:
                for y in range(8, 17):
                    c.put(x, y, 'C')
        c.rect(x0, 12, x1, 12, 'y')
        c.put(x0, 8, 'c'); c.put(x0 + 1, 8, 'c')
    # ring (torus seen at an angle)
    for y in range(24):
        for x in range(48):
            dx = (x + 0.5 - cx); dy = (y + 0.5 - cy)
            ro = (dx / 13.5) ** 2 + (dy / 9.5) ** 2
            ri = (dx / 9.0) ** 2 + (dy / 5.5) ** 2
            if ro <= 1 and ri > 1:
                ang = math.atan2(dy, dx)
                if dy < -3:
                    ch = 'W'
                elif dy < 1:
                    ch = 'G'
                elif dy < 5:
                    ch = 'g'
                else:
                    ch = 'n'
                # inner wall shadow on far side
                if ri < 1.35 and dy < 0:
                    ch = 'g'
                if ri < 1.35 and dy > 0:
                    ch = 'G'
                c.put(x, y, ch)
            elif ri <= 1:
                c.put(x, y, '.')
    # windows along the ring (teal lit)
    for k in range(16):
        a = k / 16 * 2 * math.pi
        x = round(cx + math.cos(a) * 11.3 - 0.5); y = round(cy + math.sin(a) * 7.6 - 0.5)
        if c.get(x, y) != '.':
            c.put(x, y, 'A' if math.sin(a) < 0 else '+')
    # spokes
    c.line(14, 12, 20, 12, 'g'); c.line(27, 12, 33, 12, 'g')
    c.rect(23, 6, 24, 9, 'g'); c.rect(23, 15, 24, 18, 'n')
    # central hub
    c.ellipse(23.5, 12, 3.5, 3, ['W', 'G', 'g', 'n'])
    c.put(23, 12, 'a'); c.put(24, 12, 'h'); c.put(22, 11, 'H')
    # antenna & lights
    c.rect(23, 0, 23, 2, 'g'); c.put(23, 0, 'R')
    c.put(10, 12, 'R'); c.put(37, 12, 'l')
    c.put(1, 8, 'q'); c.put(46, 16, 'L')
    return c.rows()


SPRITES['station_far'] = {'w': 48, 'rows': station_far()}


# ================================================================ trophy (16x16)

SPRITES['space_trophy'] = grid([
    "................",
    "..uuuuuuuuuuuY..",
    ".Y.uYYYYYYYyU.y.",
    ".Y.uYYYHYYYyU.y.",
    "..YuYYHHHYYyUy..",
    "...uYHHHHHYyU...",
    "...uYYHHHYYyU...",
    "....YHYyYHyU....",
    ".....YYYYyU.....",
    "......YyyU......",
    ".......yU.......",
    ".......yU.......",
    "......YYyU......",
    ".....uYYyyU.....",
    ".....yyyyUU.....",
    "................",
], 16)
