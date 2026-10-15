"""Tiny drawing helpers for composing sprite grids."""
import math

class Canvas:
    def __init__(self, w, h, fill='.'):
        self.w, self.h = w, h
        self.g = [[fill]*w for _ in range(h)]

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h and c != ' ':
            self.g[y][x] = c

    def get(self, x, y):
        return self.g[y][x] if 0 <= x < self.w and 0 <= y < self.h else '.'

    def stamp(self, rows, ox, oy, skip='.'):
        for y, r in enumerate(rows):
            for x, c in enumerate(r):
                if c != skip and c != ' ':
                    self.put(ox+x, oy+y, c)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1):
                self.put(x, y, c)

    def ellipse(self, cx, cy, rx, ry, shades, light=(-0.6, -0.8), mask=None):
        """shades: list from lightest to darkest. Shading by surface normal vs light."""
        lx, ly = light
        n = len(shades)
        for y in range(int(cy-ry)-1, int(cy+ry)+2):
            for x in range(int(cx-rx)-1, int(cx+rx)+2):
                dx = (x+0.5-cx)/rx; dy = (y+0.5-cy)/ry
                d = dx*dx + dy*dy
                if d <= 1.0:
                    # pseudo normal
                    dz = math.sqrt(max(0, 1-d))
                    dot = (dx*lx + dy*ly)*0.9 + dz*0.5  # higher = lighter
                    # map dot (-1..1.4) to shade idx
                    t = (1.1 - dot) / 1.6
                    if d > 0.72: t += 0.25  # rim darker
                    i = min(n-1, max(0, int(t*n)))
                    if mask is None or mask(x, y):
                        self.put(x, y, shades[i])

    def line(self, x0, y0, x1, y1, c, thick=1):
        steps = max(abs(x1-x0), abs(y1-y0)) * 2 + 1
        for i in range(steps+1):
            t = i/steps
            x = round(x0 + (x1-x0)*t); y = round(y0 + (y1-y0)*t)
            for ox in range(thick):
                self.put(x+ox, y, c)

    def rows(self):
        return [''.join(r) for r in self.g]
