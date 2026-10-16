// Hand-drawn-style art painted with the Canvas 2D API: smooth shapes,
// shading gradients and dark outlines, at high resolution (64px tiles).
import Phaser from 'phaser';

export type Ctx = CanvasRenderingContext2D;
export const T = 64;

/** Seeded random so every tile variant looks the same each time. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function makeTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  const c = tex.getContext();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  draw(c);
  tex.refresh();
}

export function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Fill the current path with a top-to-bottom shaded gradient, then outline it. */
export function shade(c: Ctx, top: string, bottom: string, y0: number, y1: number, outline = '#14101c', lw = 3) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.fillStyle = g;
  c.fill();
  if (outline) {
    c.strokeStyle = outline;
    c.lineWidth = lw;
    c.stroke();
  }
}

export function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb color. */
export function tint(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('')}`;
}

// ------------------------------------------------------------------ dungeon tiles

export function floorTile(c: Ctx, seed: number, grate = false) {
  const r = rng(seed);
  c.fillStyle = '#1b1f27';
  c.fillRect(0, 0, T, T);
  // One big stone slab with a bevel.
  rr(c, 2, 2, T - 4, T - 4, 6);
  const base = ['#3a4452', '#37414e', '#3d4756'][seed % 3];
  shade(c, tint(base, 0.08), tint(base, -0.18), 0, T, '', 0);
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(5, T - 6);
  c.lineTo(5, 5);
  c.lineTo(T - 6, 5);
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.moveTo(T - 4, 6);
  c.lineTo(T - 4, T - 4);
  c.lineTo(6, T - 4);
  c.stroke();
  // Speckles and a crack or two.
  for (let i = 0; i < 18; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.05)';
    c.fillRect(6 + r() * (T - 12), 6 + r() * (T - 12), 2, 2);
  }
  if (r() < 0.6) {
    c.strokeStyle = 'rgba(10,10,16,0.55)';
    c.lineWidth = 1.5;
    c.beginPath();
    let x = 10 + r() * 40;
    let y = 8 + r() * 20;
    c.moveTo(x, y);
    for (let i = 0; i < 4; i++) {
      x += (r() - 0.3) * 14;
      y += 6 + r() * 8;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  if (grate) {
    rr(c, 14, 14, T - 28, T - 28, 3);
    c.fillStyle = '#0c0d12';
    c.fill();
    c.strokeStyle = '#5a5f6a';
    c.lineWidth = 3;
    c.stroke();
    c.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      c.beginPath();
      c.moveTo(14 + i * 7.2, 16);
      c.lineTo(14 + i * 7.2, T - 16);
      c.moveTo(16, 14 + i * 7.2);
      c.lineTo(T - 16, 14 + i * 7.2);
      c.stroke();
    }
  }
}

export function dirtTile(c: Ctx, seed: number) {
  const r = rng(seed);
  c.fillStyle = '#3b3122';
  c.fillRect(0, 0, T, T);
  for (let i = 0; i < 60; i++) {
    c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,220,160,0.06)';
    const s = 1 + r() * 3;
    c.fillRect(r() * T, r() * T, s, s);
  }
}

/** Brick wall face (the front of a wall you see from slightly above). */
export function wallFace(c: Ctx, seed: number) {
  const r = rng(seed);
  c.fillStyle = '#231c12';
  c.fillRect(0, 0, T, T);
  const rows = 4;
  const bh = T / rows;
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? -16 : 0;
    for (let x = off; x < T; x += 32) {
      const b = ['#7d6a37', '#857140', '#74622f'][Math.floor(r() * 3)];
      rr(c, x + 1.5, row * bh + 1.5, 29, bh - 3, 2);
      shade(c, tint(b, 0.12), tint(b, -0.2), row * bh, row * bh + bh, '', 0);
      c.fillStyle = 'rgba(255,240,190,0.18)';
      c.fillRect(x + 3, row * bh + 2, 25, 2);
    }
  }
  // Darker toward the floor (ambient occlusion).
  const g = c.createLinearGradient(0, 0, 0, T);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = g;
  c.fillRect(0, 0, T, T);
}

/** Top of a wall seen from above: dark core with a light stone rim on the sides that face rooms. */
export function wallTop(c: Ctx, sides: { n: boolean; s: boolean; e: boolean; w: boolean }) {
  c.fillStyle = '#121218';
  c.fillRect(0, 0, T, T);
  const band = 14;
  const stone = (x: number, y: number, w: number, h: number, horiz: boolean) => {
    const n = Math.ceil((horiz ? w : h) / 16);
    for (let i = 0; i < n; i++) {
      const bx = horiz ? x + i * 16 : x;
      const by = horiz ? y : y + i * 16;
      rr(c, bx + 1, by + 1, horiz ? 14 : w - 2, horiz ? h - 2 : 14, 2);
      shade(c, '#c9c6bd', '#8f8c86', by, by + (horiz ? h : 16), '#2a2830', 1.5);
    }
  };
  if (sides.s) stone(0, T - band, T, band, true);
  if (sides.n) stone(0, 0, T, band, true);
  if (sides.w) stone(0, 0, band, T, false);
  if (sides.e) stone(T - band, 0, band, T, false);
}

export function banner(c: Ctx) {
  // Hanging cloth with a golden star emblem.
  c.fillStyle = '#5a4a2a';
  c.fillRect(10, 6, 44, 4);
  c.beginPath();
  c.moveTo(14, 9);
  c.lineTo(50, 9);
  c.lineTo(50, 52);
  c.lineTo(32, 44);
  c.lineTo(14, 52);
  c.closePath();
  shade(c, '#1d3a5e', '#0f2038', 9, 52, '#0a0812', 2.5);
  c.strokeStyle = '#d4a63a';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(17, 12);
  c.lineTo(47, 12);
  c.lineTo(47, 48);
  c.lineTo(32, 41);
  c.lineTo(17, 48);
  c.closePath();
  c.stroke();
  c.fillStyle = '#e8bc4a';
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? 4 : 10;
    c.lineTo(32 + Math.cos(a) * rad, 27 + Math.sin(a) * rad);
  }
  c.closePath();
  c.fill();
}

export function sconce(c: Ctx) {
  c.beginPath();
  c.moveTo(24, 30);
  c.lineTo(40, 30);
  c.lineTo(36, 44);
  c.lineTo(28, 44);
  c.closePath();
  shade(c, '#6a5a4a', '#2a2018', 30, 44, '#0a0812', 2);
  rr(c, 30, 44, 4, 12, 1);
  shade(c, '#5a4a3a', '#2a2018', 44, 56, '#0a0812', 1.5);
}

export function flame(c: Ctx) {
  const g = c.createRadialGradient(16, 22, 2, 16, 18, 16);
  g.addColorStop(0, '#fff6c0');
  g.addColorStop(0.35, '#ffc23a');
  g.addColorStop(0.75, '#ff6a1a');
  g.addColorStop(1, 'rgba(255,60,10,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(16, 0);
  c.bezierCurveTo(26, 12, 28, 22, 16, 30);
  c.bezierCurveTo(4, 22, 6, 12, 16, 0);
  c.fill();
}

export function door(c: Ctx) {
  // Big arched wooden double door with iron bands and chains (128 x 96).
  c.beginPath();
  c.moveTo(8, 96);
  c.lineTo(8, 40);
  c.arc(64, 44, 56, Math.PI, 0);
  c.lineTo(120, 96);
  c.closePath();
  shade(c, '#3a2a20', '#1a120c', 0, 96, '#0a0812', 4);
  c.beginPath();
  c.moveTo(16, 96);
  c.lineTo(16, 44);
  c.arc(64, 46, 48, Math.PI, 0);
  c.lineTo(112, 96);
  c.closePath();
  shade(c, '#9a4a28', '#5a2414', 0, 96, '#2a120a', 2);
  c.strokeStyle = 'rgba(30,10,4,0.7)';
  c.lineWidth = 2;
  for (const x of [32, 48, 80, 96]) {
    c.beginPath();
    c.moveTo(x, 12 + Math.abs(64 - x) * 0.3);
    c.lineTo(x, 96);
    c.stroke();
  }
  c.fillStyle = '#1a1210';
  c.fillRect(62, 4, 4, 92);
  for (const y of [34, 70]) {
    c.fillStyle = '#4a4a52';
    c.fillRect(16, y, 96, 6);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(16, y, 96, 2);
  }
  // Chains in an X
  c.strokeStyle = '#c08a2a';
  c.lineWidth = 4;
  for (const [x0, x1] of [[22, 106], [106, 22]]) {
    c.beginPath();
    c.moveTo(x0, 16);
    c.lineTo(x1, 86);
    c.stroke();
  }
  rr(c, 54, 44, 20, 22, 4);
  shade(c, '#e8b84a', '#9a6a1a', 44, 66, '#3a2208', 2);
  c.fillStyle = '#2a1808';
  c.fillRect(62, 52, 4, 8);
}

export function chest(c: Ctx) {
  rr(c, 8, 26, 48, 30, 4);
  shade(c, '#a0602a', '#5a3214', 26, 56);
  c.beginPath();
  c.moveTo(8, 30);
  c.quadraticCurveTo(32, 6, 56, 30);
  c.closePath();
  shade(c, '#b8743a', '#7a4418', 12, 30);
  c.fillStyle = '#d8a83a';
  c.fillRect(8, 29, 48, 4);
  for (const x of [14, 46]) {
    c.fillRect(x, 16, 4, 40);
  }
  rr(c, 27, 30, 10, 12, 2);
  shade(c, '#f8d870', '#b8862a', 30, 42, '#3a2208', 1.5);
}

export function goldPile(c: Ctx, seed: number) {
  const r = rng(seed);
  ellipse(c, 32, 46, 22, 9);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fill();
  for (let i = 0; i < 22; i++) {
    const x = 14 + r() * 36;
    const y = 30 + r() * 16 - Math.max(0, 10 - Math.abs(x - 32) * 0.5);
    ellipse(c, x, y, 5, 3);
    shade(c, '#ffe27a', '#c8901a', y - 3, y + 3, '#6a4a0a', 1);
  }
}

export function crate(c: Ctx) {
  rr(c, 8, 12, 48, 44, 3);
  shade(c, '#7a4a2a', '#4a2a16', 12, 56);
  c.strokeStyle = '#2a160a';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(12, 16);
  c.lineTo(52, 52);
  c.moveTo(52, 16);
  c.lineTo(12, 52);
  c.stroke();
  c.strokeStyle = 'rgba(255,220,170,0.25)';
  c.lineWidth = 2;
  c.strokeRect(12, 16, 40, 36);
}
