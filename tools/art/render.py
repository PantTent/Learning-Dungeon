import os
"""Validate pixelData (parsed from the TS file itself) and render contact sheet + tile patch."""
import re, sys, json
from PIL import Image, ImageDraw, ImageFont
SP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
ts = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'art', 'pixelData.ts')).read()

# --- parse TS independently of the generator ---
sprites = {}
for m in re.finditer(r"\n  (\w+): \{\n    w: (\d+), h: (\d+),\n    palette: \{([^}]*)\},\n    rows: \[\n(.*?)\n    \],", ts, re.S):
    name, w, h, pal, rows = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4), m.group(5)
    palette = dict(re.findall(r"'(.)': '([^']*)'", pal))
    rows = re.findall(r"'([^']*)'", rows)
    sprites[name] = dict(w=w, h=h, palette=palette, rows=rows)

REQUIRED = ('hero_warrior hero_mage hero_ranger hero_paladin hero_necromancer hero_druid hero_demonologist '
            'enemy_slime enemy_bat enemy_rat enemy_mushroom enemy_spider enemy_goblin enemy_skeleton enemy_wolf '
            'minion_imp minion_skeleton boss_goblin_king tile_floor tile_floor_moss tile_wall tile_wall_top '
            'tile_stairs_down tile_door tile_chest tile_chest_open tile_fountain tile_campfire tile_torch npc_merchant '
            'icon_head icon_chest icon_legs icon_hands icon_feet icon_ring icon_neck icon_sword icon_axe icon_mace '
            'icon_dagger icon_wand icon_greatsword icon_greataxe icon_staff icon_bow icon_shield icon_tome icon_potion '
            'icon_mana icon_gold '
            # Area 2: Whisperwood Forest
            'tile_grass tile_grass_flowers tile_tree tile_tree_top tile_forest_exit tile_forest_gate tile_spring '
            'tile_portal deco_bush deco_mushrooms deco_log deco_flowers enemy_boar enemy_pixie enemy_beetle '
            'enemy_sapling enemy_snapper enemy_owlbear enemy_bandit enemy_mossgolem boss_treant icon_potion_2 '
            'icon_potion_3 icon_potion_4 icon_mana_2 icon_mana_3 icon_mana_4').split()
errs = []
for n, s in sprites.items():
    if len(s['rows']) != s['h']: errs.append(f'{n}: h mismatch')
    for i, r in enumerate(s['rows']):
        if len(r) != s['w']: errs.append(f'{n}: row {i} len {len(r)}')
        for c in r:
            if c != '.' and c not in s['palette']: errs.append(f'{n}: char {c!r} not in palette')
    for k, v in s['palette'].items():
        if not re.fullmatch(r'#[0-9a-f]{6}', v): errs.append(f'{n}: bad color {v}')
missing = [r for r in REQUIRED if r not in sprites]
present = [r for r in REQUIRED if r in sprites]
print(f'{len(sprites)} sprites parsed; missing {len(missing)}: {missing}')
print('errors:', errs or 'none')

def img(s, scale):
    im = Image.new('RGBA', (s['w'], s['h']), (0,0,0,0))
    for y, r in enumerate(s['rows']):
        for x, c in enumerate(r):
            if c != '.':
                v = s['palette'][c]
                im.putpixel((x, y), (int(v[1:3],16), int(v[3:5],16), int(v[5:7],16), 255))
    return im.resize((s['w']*scale, s['h']*scale), Image.NEAREST)

font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 11)
BG = (0x14, 0x10, 0x1e)
only = sys.argv[1:]  # optional name prefixes
names = [n for n in sprites if not only or any(n.startswith(p) for p in only)]
import os; S = int(os.environ.get("SCALE", 4))
cell_w, cell_h = 16*S*2 + 16, 16*S*2 + 30
cols = 6
small = [n for n in names if sprites[n]['w'] <= 16]
big = [n for n in names if sprites[n]['w'] > 16]
rows_n = (len(small) + cols - 1)//cols
W = cols*(16*S+40)
cw = 16*S + 40; ch = 16*S + 26
H = rows_n*ch + (big and (32*S + 40) or 0) + 10
sheet = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(sheet)
for i, n in enumerate(small):
    x = (i % cols)*cw + 20; y = (i//cols)*ch + 6
    sheet.paste(img(sprites[n], S), (x, y), img(sprites[n], S))
    d.text(((i % cols)*cw + 4, y + 16*S + 4), n.replace('hero_','').replace('enemy_','e_')[:18], fill=(220,210,240), font=font)
by = rows_n*ch + 6
for j, n in enumerate(big):
    im = img(sprites[n], S)
    sheet.paste(im, (20 + j*(32*S+30), by), im)
    d.text((20 + j*(32*S+30), by + 32*S + 2), n, fill=(220,210,240), font=font)
out = SP + ('/sprites_sheet.png' if not only else '/preview.png')
sheet.save(out); print('saved', out, sheet.size)

# --- tile patch 10x8 ---
if all(t in sprites for t in ('tile_floor','tile_floor_moss','tile_wall','tile_wall_top')):
    M = [
        "TTTTTTTTTT",
        "WWWWWWWWWW",
        "..m...m..W",
        ".m...TTT.W",
        "....mWWW.W",
        "..m......W",
        "m....m...W",
        "..m......W",
    ]
    key = {'T':'tile_wall_top','W':'tile_wall','.':'tile_floor','m':'tile_floor_moss'}
    S2 = 4
    patch = Image.new('RGB', (10*16*S2, 8*16*S2), BG)
    for y, r in enumerate(M):
        for x, c in enumerate(r):
            im = img(sprites[key[c]], S2)
            patch.paste(im, (x*16*S2, y*16*S2), im)
    # props on top
    for (n, x, y) in (('tile_torch',3,1),('tile_chest',7,6),('tile_campfire',2,5),('enemy_slime',5,3),('hero_warrior',6,5),('tile_stairs_down',8,2)):
        if n in sprites:
            if n == 'tile_stairs_down':
                im = img(sprites[n], S2); patch.paste(im, (x*16*S2, y*16*S2), im); continue
            im = img(sprites[n], S2); patch.paste(im, (x*16*S2, y*16*S2), im)
    patch.save(SP + '/tiles_patch.png'); print('saved tiles_patch.png')
