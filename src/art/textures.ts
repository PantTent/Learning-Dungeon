import Phaser from 'phaser';
import { SPRITES } from './pixelData';

/** Turn every pixel-string sprite into a Phaser texture (1 texel per pixel). */
export function buildTextures(scene: Phaser.Scene): void {
  for (const [key, sp] of Object.entries(SPRITES)) {
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, sp.w, sp.h);
    if (!tex) continue;
    const ctx = tex.getContext();
    for (let y = 0; y < sp.h; y++) {
      const row = sp.rows[y] ?? '';
      for (let x = 0; x < sp.w; x++) {
        const ch = row[x];
        if (!ch || ch === '.' || ch === ' ') continue;
        const col = sp.palette[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    tex.refresh();
  }

  // Small helper textures for particles and effects.
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
  g.generateTexture('px', 4, 4);
  g.clear();
  for (let r = 8; r > 0; r--) {
    g.fillStyle(0xffffff, (1 - r / 8) * 0.5 + 0.08).fillCircle(8, 8, r);
  }
  g.generateTexture('glow', 16, 16);
  g.clear();
  g.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
  g.generateTexture('dot', 8, 8);
  g.destroy();
}
