import os
"""Build pixelData.ts from sprite sources, then validate + render sheets."""
import sys, re, json, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import src_pal, src_chars, src_creatures, src_tiles, src_icons, src_forest, src_farm, src_magic, src_space

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'art', 'pixelData.ts')
PAL = src_pal.PAL
OUTLINE = 'k'

def prep(name, rows, w, h, outline):
    if len(rows) != h:
        raise SystemExit(f'{name}: {len(rows)} rows, expected {h}')
    out = []
    for i, r in enumerate(rows):
        if len(r) > w:
            raise SystemExit(f'{name}: row {i} too long ({len(r)}): {r!r}')
        out.append(list(r.ljust(w, '.')))
    if outline:
        add = []
        for y in range(h):
            for x in range(w):
                if out[y][x] != '.':
                    continue
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and 0 <= ny < h and out[ny][nx] not in '.':
                        add.append((x, y)); break
        for x, y in add:
            out[y][x] = OUTLINE
    rows = [''.join(r) for r in out]
    used = sorted(set(''.join(rows)) - {'.'})
    for c in used:
        if c not in PAL:
            raise SystemExit(f'{name}: unknown palette char {c!r}')
    return {'w': w, 'h': h, 'palette': {c: PAL[c] for c in used}, 'rows': rows}

ALL = {}
for mod in (src_chars, src_creatures, src_tiles, src_icons, src_forest, src_farm, src_magic, src_space):
    for name, spec in mod.SPRITES.items():
        rows = spec['rows'] if isinstance(spec, dict) else spec
        outline = spec.get('outline', True) if isinstance(spec, dict) else True
        size = len(rows)
        w = spec.get('w', size) if isinstance(spec, dict) else size
        ALL[name] = prep(name, rows, w, size, outline)

lines = [
    '// Pixel-art sprite data. Each sprite is a grid of palette characters.',
    "// '.' = transparent. All characters/creatures face RIGHT.",
    '// Characters, creatures and icons have a 1px dark outline baked in; tiles do not.',
    '',
    'export interface PixelSprite { w: number; h: number; palette: Record<string, string>; rows: string[] }',
    '',
    'export const SPRITES: Record<string, PixelSprite> = {',
]
for name, s in ALL.items():
    lines.append(f'  {name}: {{')
    lines.append(f'    w: {s["w"]}, h: {s["h"]},')
    pal = ', '.join(f"'{k}': '{v}'" for k, v in s['palette'].items())
    lines.append(f'    palette: {{ {pal} }},')
    lines.append('    rows: [')
    for r in s['rows']:
        lines.append(f"      '{r}',")
    lines.append('    ],')
    lines.append('  },')
lines.append('};')
lines.append('')
open(OUT, 'w').write('\n'.join(lines))
json.dump(ALL, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'sprites.json'), 'w'))
print('wrote', len(ALL), 'sprites')
