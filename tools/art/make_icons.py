"""App icons (Android launcher + web/home-screen icons) drawn from the game's own sprites.
Run after gen.py:  python3 tools/art/make_icons.py"""
import json, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
SPRITES = json.load(open(os.path.join(HERE, 'out', 'sprites.json')))
BG = (42, 29, 74, 255)        # deep purple
BG2 = (68, 46, 120, 255)      # lighter ring


def sprite(name):
    s = SPRITES[name]
    im = Image.new('RGBA', (s['w'], s['h']), (0, 0, 0, 0))
    for y, row in enumerate(s['rows']):
        for x, c in enumerate(row):
            if c != '.':
                col = s['palette'][c].lstrip('#')
                im.putpixel((x, y), tuple(int(col[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
    return im


def art(size, scale_frac):
    """Mage + slime + gold sparkle on a transparent square, scaled with hard pixels."""
    base = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    base.alpha_composite(sprite('hero_mage'), (6, 6))
    slime = sprite('enemy_slime').transpose(Image.FLIP_LEFT_RIGHT)
    base.alpha_composite(slime.resize((12, 12), Image.NEAREST), (19, 17))
    d = ImageDraw.Draw(base)
    for (x, y) in ((4, 5), (26, 7), (24, 4)):
        d.point((x, y), fill=(255, 220, 80, 255))
    px = int(size * scale_frac)
    return base.resize((px, px), Image.NEAREST)


def icon(size, shape='square', content=0.9):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shape == 'circle':
        d.ellipse((0, 0, size - 1, size - 1), fill=BG)
        d.ellipse((size * 0.06, size * 0.06, size * 0.94, size * 0.94), outline=BG2, width=max(1, size // 40))
    elif shape == 'rounded':
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 5, fill=BG)
    else:
        d.rectangle((0, 0, size, size), fill=BG)
    a = art(size, content)
    im.alpha_composite(a, ((size - a.width) // 2, (size - a.height) // 2))
    return im


res = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
for folder, legacy, fg in (('mdpi', 48, 108), ('hdpi', 72, 162), ('xhdpi', 96, 216), ('xxhdpi', 144, 324), ('xxxhdpi', 192, 432)):
    out = os.path.join(res, f'mipmap-{folder}')
    icon(legacy, 'rounded').save(os.path.join(out, 'ic_launcher.png'))
    icon(legacy, 'circle', 0.8).save(os.path.join(out, 'ic_launcher_round.png'))
    # Adaptive icon foreground: the art must sit in the middle ~60% (the rest may be cropped).
    f = Image.new('RGBA', (fg, fg), (0, 0, 0, 0))
    a = art(fg, 0.6)
    f.alpha_composite(a, ((fg - a.width) // 2, (fg - a.height) // 2))
    f.save(os.path.join(out, 'ic_launcher_foreground.png'))

pub = os.path.join(ROOT, 'public', 'icons')
os.makedirs(pub, exist_ok=True)
icon(192, 'rounded').save(os.path.join(pub, 'icon-192.png'))
icon(512, 'rounded').save(os.path.join(pub, 'icon-512.png'))
icon(512, 'square', 0.7).save(os.path.join(pub, 'icon-maskable-512.png'))
icon(180, 'square').save(os.path.join(pub, 'apple-touch-icon.png'))
icon(64, 'rounded').save(os.path.join(pub, 'favicon.png'))
print('icons written')
