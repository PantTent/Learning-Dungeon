// Lit-dungeon art preview: high-resolution hand-drawn-style tiles and
// characters, torch light in the dark, and gear that shows on the hero.
// Standalone page (preview2d.html) - not part of the game yet.
import Phaser from 'phaser';
import { RARITIES, drawGoblin, drawHero, drawRat, drawSkeleton, drawSlime, type ClassId, type Look, type Rarity } from './characters';
import { T, banner, chest, crate, dirtTile, door, flame, floorTile, goldPile, makeTex, rng, sconce, wallFace, wallTop } from './paint';

// ------------------------------------------------------------------ map layout

type Cell = 'void' | 'floor' | 'grate' | 'dirt' | 'face' | 'top';
const MW = 23;
const MH = 17;
interface Room { x: number; y: number; w: number; h: number }
const ROOMS: Room[] = [
  { x: 2, y: 3, w: 7, h: 4 },
  { x: 13, y: 3, w: 8, h: 4 },
  { x: 2, y: 11, w: 7, h: 4 },
  { x: 13, y: 11, w: 8, h: 4 },
];
const CORRIDORS: [number, number][] = [];
for (let x = 9; x <= 12; x++) CORRIDORS.push([x, 5], [x, 13]);
for (let y = 7; y <= 10; y++) CORRIDORS.push([4, y], [17, y]);

const grid: Cell[][] = Array.from({ length: MH }, () => Array<Cell>(MW).fill('void'));
const R = rng(7);
for (const r of ROOMS) {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[y][x] = R() < 0.12 ? 'grate' : 'floor';
  for (let x = r.x; x < r.x + r.w; x++) grid[r.y - 1][x] = 'face';
}
for (const [x, y] of CORRIDORS) grid[y][x] = 'dirt';
const walkable = (x: number, y: number) => ['floor', 'grate', 'dirt'].includes(grid[y]?.[x] ?? 'void');
for (let y = 0; y < MH; y++) {
  for (let x = 0; x < MW; x++) {
    if (grid[y][x] !== 'void') continue;
    let near = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const c = grid[y + dy]?.[x + dx];
      if (c && c !== 'void' && c !== 'top') near = true;
    }
    if (near) grid[y][x] = 'top';
  }
}

// ------------------------------------------------------------------ hero look + UI

const look: Look = { cls: 'knight', helm: 'common', chest: 'common', gloves: 'common', boots: 'common', weapon: 'common' };
let scene: DungeonPreview;

function drawUi() {
  const ui = document.getElementById('ui')!;
  ui.innerHTML = '';
  const row = (items: [string, string, () => void][]) => {
    const r = document.createElement('div');
    r.className = 'row';
    for (const [label, cls, fn] of items) {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = cls;
      b.onclick = fn;
      r.appendChild(b);
    }
    ui.appendChild(r);
  };
  const set = (patch: Partial<Look>) => {
    Object.assign(look, patch);
    scene.rebuildHero();
    drawUi();
  };
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  row((['knight', 'ranger', 'mage'] as ClassId[]).map((c) => [cap(c), look.cls === c ? 'on' : '', () => set({ cls: c })]));
  row(RARITIES.map((r) => [`${cap(r)} set`, `r-${r}`, () => set({ helm: r, chest: r, gloves: r, boots: r, weapon: r })]));
  const cyc = (k: keyof Omit<Look, 'cls'>) => () => set({ [k]: RARITIES[(RARITIES.indexOf(look[k] as Rarity) + 1) % 5] } as Partial<Look>);
  row([
    [`Helm: ${look.helm}`, `r-${look.helm}`, cyc('helm')],
    [`Armor: ${look.chest}`, `r-${look.chest}`, cyc('chest')],
    [`Gloves: ${look.gloves}`, `r-${look.gloves}`, cyc('gloves')],
    [`Boots: ${look.boots}`, `r-${look.boots}`, cyc('boots')],
    [`Weapon: ${look.weapon}`, `r-${look.weapon}`, cyc('weapon')],
  ]);
}

// ------------------------------------------------------------------ scene

interface Light { x: number; y: number; r: number; flicker: number }

class DungeonPreview extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Image;
  private heroPos = { x: 5, y: 5 };
  private dark!: Phaser.GameObjects.RenderTexture;
  private brush!: Phaser.GameObjects.Image;
  private torchLights: Light[] = [];
  private moving = false;

  constructor() {
    super('preview');
  }

  create() {
    scene = this;
    (window as unknown as { scene: unknown }).scene = this;
    this.makeTextures();
    this.drawMap();
    this.placeThings();

    this.hero = this.add.image(0, 0, 'hero').setOrigin(0.5, 0.92);
    this.placeHero();
    this.tweens.add({ targets: this.hero, scaleY: 0.97, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Darkness with soft holes cut out where the light is.
    this.dark = this.add.renderTexture(0, 0, MW * T, MH * T).setOrigin(0).setDepth(900);
    this.brush = this.make.image({ key: 'light', add: false });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MW * T, MH * T);
    cam.startFollow(this.hero, true, 0.12, 0.12);
    const fit = () => cam.setZoom(Math.max(0.55, Math.min(1.5, window.innerWidth / (13 * T), window.innerHeight / (7.5 * T))));
    fit();
    this.scale.on('resize', fit);

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.walkTo(Math.floor(p.worldX / T), Math.floor(p.worldY / T)));
    drawUi();
  }

  private makeTextures() {
    for (let i = 0; i < 6; i++) makeTex(this, `floor${i}`, T, T, (c) => floorTile(c, i + 1));
    for (let i = 0; i < 3; i++) makeTex(this, `grate${i}`, T, T, (c) => floorTile(c, i + 11, true));
    for (let i = 0; i < 4; i++) makeTex(this, `dirt${i}`, T, T, (c) => dirtTile(c, i + 21));
    for (let i = 0; i < 4; i++) makeTex(this, `face${i}`, T, T, (c) => wallFace(c, i + 31));
    makeTex(this, 'banner', T, T, banner);
    makeTex(this, 'sconce', T, T, sconce);
    makeTex(this, 'flame', 32, 32, flame);
    makeTex(this, 'door', 128, 96, door);
    makeTex(this, 'chest', T, T, chest);
    for (let i = 0; i < 3; i++) makeTex(this, `gold${i}`, T, T, (c) => goldPile(c, i + 41));
    makeTex(this, 'crate', T, T, crate);
    makeTex(this, 'skeleton', 96, 96, drawSkeleton);
    makeTex(this, 'goblin', 96, 96, drawGoblin);
    makeTex(this, 'slime', 96, 96, drawSlime);
    makeTex(this, 'rat', 96, 96, drawRat);
    makeTex(this, 'light', 256, 256, (c) => {
      const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 256);
    });
    makeTex(this, 'glow', 128, 128, (c) => {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    });
    makeTex(this, 'ember', 6, 6, (c) => {
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(3, 3, 3, 0, Math.PI * 2);
      c.fill();
    });
    this.rebuildHero(false);
  }

  rebuildHero(refresh = true) {
    makeTex(this, 'hero', 96, 96, (c) => drawHero(c, look));
    if (refresh && this.hero) {
      this.hero.setTexture('hero');
      // A little sparkle burst when gear changes.
      const p = this.add.particles(this.hero.x, this.hero.y - 40, 'ember', {
        speed: { min: 40, max: 140 },
        lifespan: 600,
        scale: { start: 1, end: 0 },
        tint: [0xffe066, 0xffffff],
        blendMode: 'ADD',
        emitting: false,
      }).setDepth(980);
      p.explode(20);
      this.time.delayedCall(800, () => p.destroy());
    }
  }

  private drawMap() {
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const cell = grid[y][x];
        const px = x * T;
        const py = y * T;
        const v = (x * 7 + y * 13) % 6;
        if (cell === 'floor') this.add.image(px, py, `floor${v}`).setOrigin(0);
        else if (cell === 'grate') this.add.image(px, py, `grate${v % 3}`).setOrigin(0);
        else if (cell === 'dirt') this.add.image(px, py, `dirt${v % 4}`).setOrigin(0);
        else if (cell === 'face') this.add.image(px, py, `face${v % 4}`).setOrigin(0).setDepth(1);
        else if (cell === 'top') {
          const open = (c?: Cell) => !!c && c !== 'void' && c !== 'top';
          const key = `top_${x}_${y}`;
          makeTex(this, key, T, T, (c) =>
            wallTop(c, { n: open(grid[y - 1]?.[x]), s: open(grid[y + 1]?.[x]), e: open(grid[y]?.[x + 1]), w: open(grid[y]?.[x - 1]) }),
          );
          this.add.image(px, py, key).setOrigin(0).setDepth(1);
        } else {
          this.add.rectangle(px, py, T, T, 0x07060b).setOrigin(0);
        }
      }
    }
  }

  private torch(x: number, y: number) {
    const px = x * T + T / 2;
    const py = y * T;
    this.add.image(px, py + T / 2, 'sconce').setDepth(2);
    const f = this.add.image(px, py + 20, 'flame').setDepth(960).setBlendMode('ADD').setScale(1.2);
    this.tweens.add({ targets: f, scaleY: 1.45, scaleX: 1.05, duration: 160 + Math.random() * 120, yoyo: true, repeat: -1 });
    const halo = this.add.image(px, py + 24, 'glow').setTint(0xff9a3a).setAlpha(0.35).setBlendMode('ADD').setScale(2.6).setDepth(950);
    this.tweens.add({ targets: halo, alpha: 0.5, scale: 2.9, duration: 220 + Math.random() * 200, yoyo: true, repeat: -1 });
    this.add.particles(px, py + 14, 'ember', {
      speedY: { min: -60, max: -30 },
      speedX: { min: -12, max: 12 },
      lifespan: 900,
      scale: { start: 0.6, end: 0 },
      tint: [0xffc23a, 0xff6a1a],
      blendMode: 'ADD',
      frequency: 260,
    }).setDepth(961);
    this.torchLights.push({ x: px, y: py + 40, r: 230, flicker: Math.random() * 10 });
    const pool = this.add.image(px, py + 90, 'glow').setTint(0xff8a2a).setAlpha(0.22).setBlendMode('ADD').setScale(4.2, 3.2).setDepth(951);
    this.tweens.add({ targets: pool, alpha: 0.3, duration: 300 + Math.random() * 200, yoyo: true, repeat: -1 });
  }

  private sprite(key: string, x: number, y: number, flip = false, bob = true) {
    const s = this.add.image(x * T + T / 2, y * T + T - 4, key).setOrigin(0.5, 0.92).setFlipX(flip);
    s.setDepth(10 + s.y / 10);
    this.add.ellipse(s.x, s.y - 2, 46, 14, 0x000000, 0.35).setDepth(9);
    if (bob) this.tweens.add({ targets: s, scaleY: 0.94, scaleX: 1.03, duration: 500 + Math.random() * 300, yoyo: true, repeat: -1 });
    return s;
  }

  private placeThings() {
    // Room A: banners and torches on the back wall, crates in the corner
    for (const [x, kind] of [[2, 'banner'], [4, 'torch'], [6, 'banner'], [8, 'torch']] as const) {
      if (kind === 'torch') this.torch(x, 2);
      else this.add.image(x * T + T / 2, 2 * T + T / 2, 'banner').setDepth(2);
    }
    this.add.image(8 * T + T / 2, 6 * T + T / 2, 'crate').setDepth(10 + (6 * T + T) / 10);
    // Room B: the treasure vault behind a chained door
    this.torch(14, 2);
    this.torch(20, 2);
    this.add.image(17 * T, 2 * T + T, 'door').setOrigin(0.5, 1).setDepth(2);
    for (const [x, y, i] of [[14, 4, 0], [15, 6, 1], [19, 4, 2], [20, 6, 0], [16, 4, 1]]) this.add.image(x * T + T / 2, y * T + T / 2, `gold${i}`).setDepth(5);
    // Room C
    for (const [x, kind] of [[3, 'torch'], [5, 'banner'], [7, 'torch']] as const) {
      if (kind === 'torch') this.torch(x, 10);
      else this.add.image(x * T + T / 2, 10 * T + T / 2, 'banner').setDepth(2);
    }
    this.add.image(7 * T + T / 2, 14 * T + T / 2, 'gold1').setDepth(5);
    // Room D
    for (const [x, kind] of [[14, 'banner'], [16, 'torch'], [19, 'banner'], [20, 'torch']] as const) {
      if (kind === 'torch') this.torch(x, 10);
      else this.add.image(x * T + T / 2, 10 * T + T / 2, 'banner').setDepth(2);
    }
    this.add.image(19 * T + T / 2, 14 * T + T / 2, 'chest').setDepth(10 + (14 * T + T) / 10);
    this.add.image(14 * T + T / 2, 14 * T + T / 2, 'crate').setDepth(10 + (14 * T + T) / 10);

    // Monsters
    this.sprite('skeleton', 18, 4, true);
    this.sprite('goblin', 7, 4, true);
    this.sprite('slime', 4, 13);
    this.sprite('rat', 16, 12, true);
    this.sprite('rat', 18, 13);
  }

  private placeHero() {
    this.hero.setPosition(this.heroPos.x * T + T / 2, this.heroPos.y * T + T - 4);
    this.hero.setDepth(10 + this.hero.y / 10);
  }

  walkTo(tx: number, ty: number) {
    if (this.moving || !walkable(tx, ty)) return;
    // Breadth-first search for a path.
    const key = (x: number, y: number) => y * MW + x;
    const prev = new Map<number, number>([[key(this.heroPos.x, this.heroPos.y), -1]]);
    const q = [[this.heroPos.x, this.heroPos.y]];
    while (q.length) {
      const [x, y] = q.shift()!;
      if (x === tx && y === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (!walkable(nx, ny) || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), key(x, y));
        q.push([nx, ny]);
      }
    }
    if (!prev.has(key(tx, ty))) return;
    const path: [number, number][] = [];
    for (let k = key(tx, ty); k !== key(this.heroPos.x, this.heroPos.y); k = prev.get(k)!) path.unshift([k % MW, Math.floor(k / MW)]);
    this.moving = true;
    const step = () => {
      const next = path.shift();
      if (!next) {
        this.moving = false;
        return;
      }
      if (next[0] !== this.heroPos.x) this.hero.setFlipX(next[0] < this.heroPos.x);
      this.heroPos = { x: next[0], y: next[1] };
      this.tweens.add({
        targets: this.hero,
        x: next[0] * T + T / 2,
        y: next[1] * T + T - 4,
        duration: 170,
        onUpdate: () => this.hero.setDepth(10 + this.hero.y / 10),
        onComplete: step,
      });
    };
    step();
  }

  update(time: number) {
    // Redraw the darkness every frame with flickering torch light and a light around the hero.
    this.dark.clear();
    this.dark.fill(0x05040a, 0.9);
    const cut = (x: number, y: number, r: number, a: number) => {
      this.brush.setScale((r * 2) / 256).setAlpha(a);
      this.dark.erase(this.brush, x, y);
    };
    for (const l of this.torchLights) {
      const f = 1 + Math.sin(time / 90 + l.flicker) * 0.04 + Math.sin(time / 37 + l.flicker * 3) * 0.03;
      cut(l.x, l.y, l.r * f, 0.92);
    }
    cut(this.hero.x, this.hero.y - 30, 170, 0.75);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: document.body,
  backgroundColor: '#07060b',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [DungeonPreview],
});
