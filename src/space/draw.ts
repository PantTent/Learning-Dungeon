// Pixel-art planets, planet ground and starfields, drawn in code so every
// planet can look like the real one. Drawn small and scaled up (pixelArt).
import Phaser from 'phaser';
import { planet } from './data';

/** Small seeded random numbers, so a planet looks the same every time. */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
const shade = (c: number, t: number) => (t >= 0 ? mix(c, 0xffffff, t) : mix(c, 0x000000, -t));

/**
 * A round planet `size` pixels wide (Saturn gets its rings: the texture is
 * wider). Returns the texture key.
 */
export function planetTexture(scene: Phaser.Scene, id: string, size = 48): string {
  const key = `planet_${id}_${size}`;
  if (scene.textures.exists(key)) return key;
  const def = planet(id);
  const [c1, c2, c3] = def.colors;
  const ringed = id === 'saturn';
  const w = ringed ? Math.round(size * 2.1) : size;
  const tex = scene.textures.createCanvas(key, w, size)!;
  const ctx = tex.getContext();
  const r = size / 2;
  const ox = (w - size) / 2;
  const rand = rng(id);
  // Features: craters, patches and clouds placed in "sphere" space.
  const spots = Array.from({ length: 14 }, () => ({ x: rand() * 2 - 1, y: rand() * 2 - 1, s: 0.08 + rand() * 0.2 }));
  const ringBack = (front: boolean) => {
    if (!ringed) return;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < size; y++) {
        const dx = (x - w / 2) / (w / 2);
        const dy = (y - r) / (size * 0.22);
        const d = Math.hypot(dx, dy);
        if (d < 0.62 || d > 1) continue;
        if ((dy < 0) === front) continue;
        if (d > 0.78 && d < 0.81) continue; // Cassini division
        ctx.fillStyle = hex(d < 0.78 ? mix(c3, c2, (d - 0.62) * 2) : mix(c2, c3, 0.5));
        ctx.fillRect(x, y, 1, 1);
      }
    }
  };
  ringBack(false);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - r) / r;
      const ny = (y + 0.5 - r) / r;
      const d2 = nx * nx + ny * ny;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2);
      let col = c1;
      const near = (sx: number, sy: number, s: number) => Math.hypot(nx - sx, ny - sy) < s;
      switch (id) {
        case 'mercury':
        case 'pluto':
          for (const sp of spots) if (near(sp.x, sp.y, sp.s * 0.7)) col = near(sp.x - 0.03, sp.y - 0.03, sp.s * 0.5) ? c2 : c3;
          if (id === 'pluto' && near(0.15, 0.2, 0.32) && !near(0.15, -0.05, 0.12)) col = c3; // the heart
          break;
        case 'venus':
          col = Math.sin(ny * 9 + Math.sin(nx * 4) * 1.5) > 0.3 ? c3 : Math.sin(ny * 5 + nx * 2) > 0.2 ? c1 : c2;
          break;
        case 'earth':
          for (const sp of spots.slice(0, 7)) if (near(sp.x * 0.8, sp.y * 0.7, sp.s * 1.4)) col = c2;
          if (Math.abs(ny) > 0.82) col = c3; // ice caps
          for (const sp of spots.slice(7)) if (near(sp.y * 0.9, sp.x * 0.8, sp.s * 0.6)) col = mix(c3, col, 0.2); // clouds
          break;
        case 'mars':
          for (const sp of spots.slice(0, 8)) if (near(sp.x, sp.y * 0.6, sp.s)) col = c2;
          if (ny < -0.86) col = 0xf4f6ff; // polar cap
          break;
        case 'jupiter':
        case 'saturn': {
          const band = Math.floor((ny + 1) * (id === 'jupiter' ? 6 : 4.5));
          col = [c1, c3, c2, c1, c3, c1, c2, c3, c1, c2, c1, c3, c1][band] ?? c1;
          if (id === 'jupiter' && near(0.35, 0.32, 0.16) && Math.abs(ny - 0.32) < 0.09) col = 0xc85a3a; // Great Red Spot
          break;
        }
        case 'uranus':
          col = Math.abs(ny) < 0.12 ? c3 : c1;
          break;
        case 'neptune':
          col = Math.sin(ny * 8) > 0.6 ? c3 : c1;
          if (near(-0.3, 0.25, 0.14)) col = c2; // Great Dark Spot
          break;
      }
      // Sunlight from the upper left, and a darker edge.
      const light = nx * -0.45 + ny * -0.45 + nz * 0.8;
      col = shade(col, Math.max(-0.6, Math.min(0.25, (light - 0.45) * 0.9)));
      ctx.fillStyle = hex(col);
      ctx.fillRect(x + ox, y, 1, 1);
    }
  }
  ringBack(true);
  tex.refresh();
  return key;
}

/** How a base looks on each planet: sky, ground and the size of the Sun. */
export interface Surface {
  skyTop: number;
  skyBottom: number;
  ground: [number, number, number];
  /** Sun disc radius in pixels (closer planets see a bigger Sun). */
  sun: number;
  stars: boolean;
}

export const SURFACES: Record<string, Surface> = {
  mercury: { skyTop: 0x05040c, skyBottom: 0x14121e, ground: [0x8a847c, 0x6e6862, 0xa8a298], sun: 46, stars: true },
  venus: { skyTop: 0xc8783a, skyBottom: 0xf0c070, ground: [0xb88a48, 0x94683a, 0xd0a868], sun: 0, stars: false },
  earth: { skyTop: 0x4a90e0, skyBottom: 0xb8e0ff, ground: [0x5aa040, 0x3f8030, 0x7cc050], sun: 20, stars: false },
  mars: { skyTop: 0xc89060, skyBottom: 0xf0c890, ground: [0xb8542a, 0x8a3a1c, 0xd0784a], sun: 14, stars: false },
};

export function surfaceOf(id: string): Surface {
  return SURFACES[id] ?? SURFACES.earth;
}

/** A 32x32 ground tile for a planet's base. */
export function groundTexture(scene: Phaser.Scene, id: string): string {
  const key = `ground_${id}`;
  if (scene.textures.exists(key)) return key;
  const [a, b, c] = surfaceOf(id).ground;
  const tex = scene.textures.createCanvas(key, 32, 32)!;
  const ctx = tex.getContext();
  const rand = rng(`ground-${id}`);
  ctx.fillStyle = hex(a);
  ctx.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = hex(rand() < 0.5 ? b : c);
    ctx.fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 1, 1);
  }
  // A few pebbles (or tufts of grass on Earth).
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(rand() * 30);
    const y = Math.floor(rand() * 30);
    ctx.fillStyle = hex(id === 'earth' ? c : shade(b, -0.2));
    ctx.fillRect(x, y, 2, 1);
    ctx.fillStyle = hex(shade(c, 0.2));
    ctx.fillRect(x, y - 1, 1, 1);
  }
  tex.refresh();
  return key;
}

/** A tiling starfield (black with little stars of different brightness). */
export function starTexture(scene: Phaser.Scene, key = 'stars', density = 60): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, 128, 128)!;
  const ctx = tex.getContext();
  const rand = rng(key);
  for (let i = 0; i < density; i++) {
    const v = 120 + Math.floor(rand() * 135);
    ctx.fillStyle = `rgb(${v},${v},${Math.min(255, v + 20)})`;
    ctx.fillRect(Math.floor(rand() * 128), Math.floor(rand() * 128), 1, 1);
  }
  tex.refresh();
  return key;
}
