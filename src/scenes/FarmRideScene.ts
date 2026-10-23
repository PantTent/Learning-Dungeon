import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { animal, crop, hat } from '../farm/data';
import { finishRide, horseLevel, levelProgress, MAX_HORSE_LEVEL, STOP_XP, TRAILS, type RideResult, type TrailDef } from '../farm/ride';
import { isHungry, loadFarm, saveFarm, type FarmAnimal, type FarmSave } from '../farm/state';
import { fmtNum, setLang, tr } from '../i18n';
import { QuestionEngine } from '../questions/engine';
import { QuestionPanel } from '../ui/QuestionPanel';
import { C, H, W, button, panel, txt } from '../ui/widgets';
import { headOf } from './FarmScene';

/** Top of the trail (the horse's feet). */
const GROUND = 436;
const HORSE_X = 220;
const GRAVITY = 2600;
const JUMP = 920;

interface Thing {
  img: Phaser.GameObjects.Image;
  kind: 'block' | 'item' | 'sign' | 'water' | 'finish';
  /** Item id for things to pick up. */
  id?: string;
  done?: boolean;
}

/** Look of each trail: sky, trees and little extras. */
const LOOKS: Record<TrailDef['id'], { top: number; bottom: number; hills: number; trees: string[]; extra: 'flowers' | 'leaves' | 'fireflies' }> = {
  meadow: { top: 0x7ac4ff, bottom: 0xd8f0ff, hills: 0x6ab84a, trees: ['farm_tree', 'prop_fruittree'], extra: 'flowers' },
  maple: { top: 0xf0a060, bottom: 0xffe4b8, hills: 0xb87a3a, trees: ['orchard_maple_ready', 'farm_tree', 'orchard_maple_ready'], extra: 'leaves' },
  deep: { top: 0x1e3a34, bottom: 0x5a7a62, hills: 0x2e5a3a, trees: ['prop_pine', 'prop_pine', 'prop_jtree'], extra: 'fireflies' },
};

/** A trail ride: the horse gallops on its own; tap to jump. */
export class FarmRideScene extends Phaser.Scene {
  private f!: FarmSave;
  private a!: FarmAnimal;
  private trail!: TrailDef;
  private engine!: QuestionEngine;
  private horse!: Phaser.GameObjects.Image;
  private hatImg?: Phaser.GameObjects.Image;
  private head = { x: 0, y: 0 };
  private vy = 0;
  private y = GROUND;
  private dist = 0;
  private nextSpawn = 0;
  private forksLeft: number[] = [];
  /** Where the water stop is (between the first two forks), and XP from the stops. */
  private waterAt = 0;
  private waterPlaced = false;
  private stopXp = 0;
  private things: Thing[] = [];
  private scenery: { img: Phaser.GameObjects.Image; k: number }[] = [];
  private ground!: Phaser.GameObjects.TileSprite;
  private grass!: Phaser.GameObjects.TileSprite;
  private paused = false;
  private over = false;
  private slowUntil = 0;
  private safeUntil = 0;
  private found: Record<string, number> = {};
  private right = 0;
  private bumps = 0;
  private finishPlaced = false;
  private hud!: Phaser.GameObjects.Container;
  private marker!: Phaser.GameObjects.Image;
  private frame = 0;
  private frameTime = 0;
  private running = false;

  constructor() {
    super('FarmRide');
  }

  create(data: { animal?: string; trail?: string } = {}) {
    const f = loadFarm();
    const a = f?.animals.find((x) => x.id === data.animal);
    const trail = TRAILS.find((t) => t.id === data.trail);
    if (!f || !a || !trail || isHungry(a, Date.now(), f)) {
      this.scene.start(f ? 'Farm' : 'FarmSetup');
      return;
    }
    this.f = f;
    this.a = a;
    this.trail = trail;
    setLang(f.settings.lang);
    this.engine = new QuestionEngine(f.learning, f.settings);
    Object.assign(this, { vy: 0, y: GROUND, dist: 0, nextSpawn: 700, things: [], scenery: [], paused: false, over: false, slowUntil: 0, safeUntil: 0, found: {}, right: 0, bumps: 0, finishPlaced: false, frame: 0, frameTime: 0 });
    this.forksLeft = Array.from({ length: trail.forks }, (_x, i) => Math.round((trail.length * (i + 1)) / (trail.forks + 1)));
    this.waterAt = this.forksLeft.length >= 2 ? (this.forksLeft[0] + this.forksLeft[1]) / 2 : trail.length / 2;
    this.waterPlaced = false;
    this.stopXp = 0;
    playMusic('farm');
    this.cameras.main.fadeIn(400);
    this.drawWorld();

    // The horse (gallop frames when we have them).
    this.running = this.textures.exists('animal_horse_run1') && this.textures.exists('animal_horse_run2');
    const base = animal(a.kind).sprite;
    this.horse = this.add.image(HORSE_X, GROUND, this.running ? 'animal_horse_run1' : base).setOrigin(0.5, 1).setScale(5).setDepth(500);
    this.head = headOf(this.running ? 'animal_horse_run1' : base);
    if (a.hat) this.hatImg = this.add.image(0, 0, hat(a.hat)!.sprite).setScale(4).setDepth(501);
    if (!this.running) this.tweens.add({ targets: this.horse, scaleY: 4.6, duration: 140, yoyo: true, repeat: -1 });

    this.buildHud();
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length) this.jump();
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) this.jump();
    });
    this.say(tr('Tap to jump!'), '#ffffff');
  }

  // ---------------------------------------------------------------- world
  private drawWorld() {
    const L = LOOKS[this.trail.id];
    const sky = this.add.graphics().setDepth(-100);
    for (let i = 0; i < 24; i++) {
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(L.top), Phaser.Display.Color.ValueToColor(L.bottom), 23, i);
      sky.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1).fillRect(0, (i * GROUND) / 24, W, GROUND / 24 + 1);
    }
    // Far hills (slow) and trees (a bit faster) give depth.
    const hills = this.add.graphics().setDepth(-90);
    hills.fillStyle(L.hills, 1);
    for (let x = -60; x < W + 120; x += 150) hills.fillEllipse(x, GROUND - 10, 260, 150 + ((x * 13) % 60));
    for (let x = 0; x < W + 200; x += 110 + Math.random() * 60) this.addTree(x, Math.random() < 0.5);
    this.grass = this.add.tileSprite(0, GROUND - 6, W, 24, this.trail.id === 'deep' ? 'tile_grass' : 'tile_grass_flowers').setOrigin(0).setTileScale(2).setDepth(-20);
    this.ground = this.add.tileSprite(0, GROUND + 10, W, H - GROUND - 10, 'farm_path').setOrigin(0).setTileScale(3).setDepth(-19);
    if (this.trail.id === 'deep') this.grass.setTint(0x8aa890);
    // A little life in the air.
    if (L.extra === 'leaves') {
      this.add.particles(0, 0, 'dot', { x: { min: 0, max: W + 200 }, y: -10, speedY: { min: 40, max: 90 }, speedX: { min: -160, max: -60 }, lifespan: 7000, scale: { start: 1.2, end: 1 }, tint: [0xe0602a, 0xf0a030, 0xc83a1a], frequency: 220 }).setDepth(600);
    } else if (L.extra === 'fireflies') {
      this.add.particles(0, 0, 'dot', { x: { min: 0, max: W }, y: { min: 120, max: GROUND - 20 }, speedX: { min: -30, max: 30 }, speedY: { min: -20, max: 20 }, lifespan: 2600, alpha: { start: 0, end: 1, ease: 'Sine.InOut' }, scale: 0.7, tint: 0xfff08a, blendMode: 'ADD', frequency: 180 }).setDepth(-15);
    }
  }

  private addTree(x: number, far: boolean) {
    const L = LOOKS[this.trail.id];
    const key = Phaser.Utils.Array.GetRandom(L.trees);
    const img = this.add.image(x, GROUND - (far ? 18 : 4), key).setOrigin(0.5, 1).setScale((far ? 2.2 : 3) + Math.random() * 0.8).setDepth(far ? -80 : -30);
    if (far) img.setTint(this.trail.id === 'deep' ? 0x5a7a6a : 0xc8d8c8);
    this.scenery.push({ img, k: far ? 0.35 : 0.7 });
    // Now and then a deer or squirrel watches you go by.
    if (!far && Math.random() < 0.12) {
      const critter = this.add.image(x + 50, GROUND - 2, Phaser.Utils.Array.GetRandom(['wild_deer', 'wild_squirrel', 'wild_jackrabbit'])).setOrigin(0.5, 1).setScale(3).setDepth(-29).setFlipX(true);
      this.scenery.push({ img: critter, k: 0.7 });
    }
  }

  // ---------------------------------------------------------------- spawning
  private spawn() {
    const x = W + 80;
    const r = Math.random();
    if (r < 0.38) {
      this.block(x);
    } else if (r < 0.62) {
      // A log with treats above it: jump to grab them.
      this.block(x);
      this.arc(x - 60, 3, 150);
    } else if (r < 0.82) {
      this.arc(x, 4, 40);
    } else {
      this.arc(x, 4, 150);
    }
    this.nextSpawn = this.dist + Phaser.Math.Between(430, 640);
  }

  private block(x: number) {
    const key = Phaser.Utils.Array.GetRandom(['prop_hollowlog', 'prop_rock', 'prop_stump', this.trail.id === 'deep' ? 'prop_hollowlog' : 'prop_bush']);
    const scale = key === 'prop_stump' || key === 'prop_bush' ? 3.2 : 2.4;
    const img = this.add.image(x, GROUND + 6, key).setOrigin(0.5, 1).setScale(scale).setDepth(400);
    this.things.push({ img, kind: 'block' });
  }

  /** A curve of things to pick up, `lift` pixels above the trail. */
  private arc(x: number, n: number, lift: number) {
    for (let i = 0; i < n; i++) {
      const id = Phaser.Utils.Array.GetRandom(this.trail.finds);
      const yy = GROUND - lift - Math.sin((i / Math.max(1, n - 1)) * Math.PI) * 40 - 26;
      const img = this.add.image(x + i * 56, yy, id === 'coin' ? 'farm_coin' : crop(id).item).setScale(id === 'coin' ? 3.2 : 2.6).setDepth(450);
      this.tweens.add({ targets: img, y: yy - 6, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.things.push({ img, kind: 'item', id });
    }
  }

  // ---------------------------------------------------------------- control
  private jump() {
    if (this.paused || this.over || this.y < GROUND) return;
    this.vy = -JUMP;
    sfx('click');
  }

  update(_t: number, dtMs: number) {
    if (!this.horse || this.paused) return;
    const dt = Math.min(0.05, dtMs / 1000);
    const now = this.time.now;
    const speed = this.over ? 0 : this.trail.speed * (now < this.slowUntil ? 0.45 : 1);
    const dx = speed * dt;
    this.dist += dx;

    // Jumping.
    this.vy += GRAVITY * dt;
    this.y = Math.min(GROUND, this.y + this.vy * dt);
    if (this.y >= GROUND) this.vy = 0;
    this.horse.y = this.y;
    this.horse.setAngle(this.y < GROUND ? Phaser.Math.Clamp(this.vy / 60, -14, 14) : 0);
    if (this.running && speed > 0) {
      this.frameTime += dtMs;
      if (this.frameTime > (this.y < GROUND ? 1e9 : 110)) {
        this.frameTime = 0;
        this.frame = 1 - this.frame;
        this.horse.setTexture(this.frame ? 'animal_horse_run2' : 'animal_horse_run1');
      }
    }
    if (this.hatImg) {
      const rad = Phaser.Math.DegToRad(this.horse.angle);
      const hx = this.head.x * 5;
      const hy = (this.head.y - 8) * 5;
      this.hatImg.setPosition(this.horse.x + hx * Math.cos(rad) - hy * Math.sin(rad), this.horse.y + hx * Math.sin(rad) + hy * Math.cos(rad) + 2).setAngle(this.horse.angle);
    }

    // Move the world past the horse.
    this.ground.tilePositionX += dx / 3;
    this.grass.tilePositionX += dx / 2;
    for (const s of this.scenery) s.img.x -= dx * s.k;
    const gone = this.scenery.filter((s) => s.img.x < -120);
    for (const s of gone) s.img.destroy();
    this.scenery = this.scenery.filter((s) => s.img.x >= -120);
    const lastTree = Math.max(0, ...this.scenery.filter((s) => s.k === 0.7).map((s) => s.img.x));
    if (lastTree < W + 40) this.addTree(W + 120 + Math.random() * 60, false);
    const lastFar = Math.max(0, ...this.scenery.filter((s) => s.k === 0.35).map((s) => s.img.x));
    if (lastFar < W + 40) this.addTree(W + 100 + Math.random() * 80, true);

    // New things on the trail, the forks, and the end.
    const end = this.trail.length;
    if (!this.waterPlaced && this.dist >= this.waterAt) {
      // A water trough beside the trail: time for a drink.
      this.waterPlaced = true;
      const img = this.add.image(W + 80, GROUND + 4, 'farm_trough').setOrigin(0.5, 1).setScale(4.4).setDepth(420);
      this.things.push({ img, kind: 'water' });
      this.nextSpawn = this.dist + 700;
    } else if (!this.finishPlaced && this.forksLeft.length && this.dist >= this.forksLeft[0]) {
      this.forksLeft.shift();
      const img = this.add.image(W + 80, GROUND + 4, 'prop_forestsign').setOrigin(0.5, 1).setScale(4.4).setDepth(420);
      this.things.push({ img, kind: 'sign' });
      this.nextSpawn = this.dist + 700;
    } else if (!this.finishPlaced && this.dist >= end) {
      this.finishPlaced = true;
      const flag = this.add.image(W + 120, GROUND + 4, this.textures.exists('ride_flag') ? 'ride_flag' : 'farm_sign').setOrigin(0.5, 1).setScale(5).setDepth(420);
      this.things.push({ img: flag, kind: 'finish' });
      const chest = this.add.image(W + 220, GROUND + 4, 'prop_chest').setOrigin(0.5, 1).setScale(4).setDepth(410);
      this.things.push({ img: chest, kind: 'block', done: true });
    } else if (!this.finishPlaced && this.dist >= this.nextSpawn && this.dist < end - 600) this.spawn();

    const hb = new Phaser.Geom.Rectangle(HORSE_X - 34, this.y - 66, 68, 60);
    for (const t of this.things) {
      t.img.x -= dx;
      if (t.done) continue;
      const b = t.img.getBounds();
      if (t.kind === 'item') {
        if (Phaser.Geom.Intersects.RectangleToRectangle(hb, b)) this.collect(t);
      } else if (t.kind === 'block') {
        const inner = new Phaser.Geom.Rectangle(b.x + b.width * 0.22, b.y + b.height * 0.3, b.width * 0.56, b.height * 0.7);
        if (now > this.safeUntil && Phaser.Geom.Intersects.RectangleToRectangle(hb, inner)) this.bump(t);
      } else if (t.kind === 'sign' && t.img.x <= HORSE_X + 90) {
        t.done = true;
        this.fork();
      } else if (t.kind === 'water' && t.img.x <= HORSE_X + 90) {
        t.done = true;
        this.waterStop();
      } else if (t.kind === 'finish' && t.img.x <= HORSE_X + 60) {
        t.done = true;
        this.finish(true);
      }
    }
    for (const t of this.things.filter((x) => x.img.x < -100)) t.img.destroy();
    this.things = this.things.filter((x) => x.img.x >= -100);
    this.marker.x = 330 + 300 * Math.min(1, this.dist / end);
  }

  private collect(t: Thing) {
    t.done = true;
    this.found[t.id!] = (this.found[t.id!] ?? 0) + 1;
    sfx('coin');
    this.tweens.killTweensOf(t.img);
    this.tweens.add({ targets: t.img, x: 760, y: 40, scale: 1.4, duration: 450, ease: 'Quad.In', onComplete: () => t.img.setVisible(false) });
    this.buildHud();
  }

  private bump(t: Thing) {
    t.done = true;
    this.bumps++;
    sfx('hurt');
    this.slowUntil = this.time.now + 700;
    this.safeUntil = this.time.now + 1300;
    this.tweens.add({ targets: this.horse, alpha: 0.4, duration: 120, yoyo: true, repeat: 4 });
    this.cameras.main.shake(200, 0.006);
    // Something falls out of the saddlebag.
    const ids = Object.keys(this.found).filter((k) => this.found[k] > 0);
    if (ids.length) {
      const id = Phaser.Utils.Array.GetRandom(ids);
      this.found[id]--;
      const lost = this.add.image(HORSE_X, this.y - 60, id === 'coin' ? 'farm_coin' : crop(id).item).setScale(2.6).setDepth(600);
      this.tweens.add({ targets: lost, x: HORSE_X - 140, y: GROUND, alpha: 0, duration: 700, onComplete: () => lost.destroy() });
      this.buildHud();
    }
    this.say(tr('Oops! Jump over it next time.'), '#ffb36b');
  }

  /** A fork in the trail: a right answer finds a secret path full of treats. */
  private fork() {
    this.paused = true;
    const q = this.engine.next();
    new QuestionPanel(this, q, {
      header: tr('A fork in the trail!'),
      readAloud: this.f.settings.readAloud,
      result: {
        right: tr('Answer: {answer}\nYou found a secret path!'),
        wrong: tr('You said: {given}\nRight answer: {answer}\nYou take the main trail.'),
        go: tr('Giddy-up!'),
      },
      done: (correct) => {
        this.engine.record(q, correct);
        saveFarm(this.f);
        this.paused = false;
        if (correct) {
          this.right++;
          sfx('levelup');
          this.say(tr('Secret path!'), '#9aff9a');
          // A row of treats right ahead, easy to grab.
          this.arc(W + 60, 6, 30);
        }
      },
    });
  }

  /** Half way: the horse stops for a drink. A right answer gives a little XP. */
  private waterStop() {
    this.paused = true;
    const q = this.engine.next();
    new QuestionPanel(this, q, {
      header: tr('Water stop! {name} is thirsty.', { name: this.a.name }),
      readAloud: this.f.settings.readAloud,
      result: {
        right: tr('Answer: {answer}\n{name} drinks and feels great! +{n} XP', { name: this.a.name, n: STOP_XP }),
        wrong: tr('You said: {given}\nRight answer: {answer}\n{name} has a drink. Off we go!', { name: this.a.name }),
        go: tr('Giddy-up!'),
      },
      done: (correct) => {
        this.engine.record(q, correct);
        saveFarm(this.f);
        this.paused = false;
        if (correct) this.gainStopXp();
      },
    });
  }

  private gainStopXp() {
    this.stopXp += STOP_XP;
    sfx('heal');
    const t = txt(this, HORSE_X, this.y - 110, `+${STOP_XP} XP`, 26, '#7fd3ff').setOrigin(0.5).setDepth(2600).setStroke('#120a1c', 6);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  private finish(reached: boolean) {
    if (this.over) return;
    this.over = true;
    if (!reached) return this.endRide(false);
    // The treasure chest has a lock: one last question.
    this.time.delayedCall(400, () => {
      const q = this.engine.next();
      new QuestionPanel(this, q, {
        header: tr('The treasure chest is locked!'),
        readAloud: this.f.settings.readAloud,
        result: {
          right: tr('Answer: {answer}\nClick! The chest opens. +{n} XP', { n: STOP_XP }),
          wrong: tr('You said: {given}\nRight answer: {answer}\nThe key was under a rock. The chest opens!'),
          go: tr('Open it!'),
        },
        done: (correct) => {
          this.engine.record(q, correct);
          if (correct) this.gainStopXp();
          this.endRide(true);
        },
      });
    });
  }

  private endRide(reached: boolean) {
    const res = finishRide(this.f, this.a, this.trail, this.found, this.right, this.bumps, reached, Date.now(), Math.random, this.stopXp);
    saveFarm(this.f);
    if (reached) {
      sfx('chest');
      const chest = this.things.find((t) => t.img.texture.key === 'prop_chest');
      chest?.img.setTexture('prop_chest');
      this.tweens.add({ targets: chest?.img, scale: 4.6, duration: 200, yoyo: true });
    }
    this.time.delayedCall(reached ? 700 : 100, () => this.summary(res, reached));
  }

  private summary(res: RideResult, reached: boolean) {
    sfx(reached ? 'victory' : 'click');
    const c = this.add.container(0, 0).setDepth(3000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, W / 2 - 330, 40, 660, H - 80, 0x2a1d10, 0xffd24a));
    c.add(txt(this, W / 2, 78, reached ? tr('Great ride, {name}!', { name: this.a.name }) : tr('Ride over'), 30, '#ffd24a').setOrigin(0.5));
    c.add(txt(this, W / 2, 116, reached ? tr('You found a treasure chest at the end of the trail!') : tr('You keep what you found so far.'), 16, C.dim).setOrigin(0.5));
    const items = Object.entries(res.items);
    const all: [string, string][] = [['farm_coin', `+${fmtNum(res.coins)}`], ...items.map(([id, n]): [string, string] => [crop(id).item, `x${n}`])];
    all.forEach(([icon, label], i) => {
      const x = W / 2 + (i - (all.length - 1) / 2) * 92;
      c.add(this.add.image(x, 176, icon).setScale(3.2));
      c.add(txt(this, x, 214, label, 18, '#ffe9a0').setOrigin(0.5));
    });
    c.add(txt(this, W / 2, 262, tr('+{n} XP for {name}', { n: res.xp, name: this.a.name }), 22, '#7fd3ff').setOrigin(0.5));
    let y = 300;
    if (res.to > res.from) {
      sfx('levelup');
      c.add(txt(this, W / 2, y, tr('Level up! {name} is now rider level {n}!', { name: this.a.name, n: res.to }), 21, C.good).setOrigin(0.5));
      y += 30;
      const opened = TRAILS.find((t) => t.level > res.from && t.level <= res.to);
      if (opened) {
        c.add(txt(this, W / 2, y, tr('New trail: {trail}!', { trail: tr(opened.name) }), 18, '#ffd24a').setOrigin(0.5));
        y += 28;
      }
    } else {
      const p = levelProgress(this.a.xp);
      const lv = horseLevel(this.a.xp);
      c.add(txt(this, W / 2, y, lv >= MAX_HORSE_LEVEL ? tr('Rider level {n} (top level!)', { n: lv }) : tr('Rider level {n}: {have} / {need} XP', { n: lv, have: p.have, need: p.need }), 17, C.text).setOrigin(0.5));
      y += 30;
    }
    if (res.hat) {
      c.add(this.add.image(W / 2 - 150, y + 20, hat(res.hat)!.sprite).setScale(4));
      c.add(txt(this, W / 2 - 110, y + 20, tr('You found a {hat} in the chest!', { hat: tr(hat(res.hat)!.name) }), 18, '#ffd24a').setOrigin(0, 0.5));
      y += 44;
    }
    c.add(txt(this, W / 2, Math.max(y + 8, 392), tr('{name} is tired and hungry now. Feed {name} on the farm!', { name: this.a.name }), 16, '#ffb36b', { align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5));
    c.add(button(this, W / 2, H - 80, 240, 50, tr('Back to the farm'), () => this.leave(), { size: 20, color: 0x2f9a4a }));
  }

  private leave() {
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start('Farm'));
  }

  // ---------------------------------------------------------------- HUD
  private buildHud() {
    this.hud?.destroy();
    const c = this.add.container(0, 0).setDepth(2000);
    this.hud = c;
    const lv = horseLevel(this.a.xp);
    const p = levelProgress(this.a.xp);
    c.add(panel(this, 8, 8, 300, 60, 0x1d1730, 0xffd24a));
    c.add(txt(this, 20, 16, `${this.a.name}  ·  ${tr('Rider level {n}', { n: lv })}`, 16, '#ffd24a'));
    const g = this.add.graphics();
    g.fillStyle(0x0b0812, 1).fillRoundedRect(20, 44, 270, 12, 4);
    g.fillStyle(0x7fd3ff, 1).fillRoundedRect(20, 44, Math.max(6, (270 * p.have) / p.need), 12, 4);
    c.add(g);
    // How far along the trail.
    const line = this.add.graphics();
    line.lineStyle(4, 0xffffff, 0.7).lineBetween(330, 38, 630, 38);
    c.add(line);
    c.add(this.add.image(646, 38, this.textures.exists('ride_flag') ? 'ride_flag' : 'farm_sign').setScale(2));
    const keep = this.marker?.x ?? 330;
    this.marker = this.add.image(keep, 34, 'animal_horse').setScale(1.6);
    c.add(this.marker);
    // What we have found.
    const ids = Object.keys(this.found).filter((k) => this.found[k] > 0);
    ids.slice(0, 4).forEach((id, i) => {
      const x = 690 + i * 58;
      c.add(this.add.image(x, 30, id === 'coin' ? 'farm_coin' : crop(id).item).setScale(id === 'coin' ? 2.4 : 2));
      c.add(txt(this, x + 14, 30, `${this.found[id]}`, 15, '#ffffff').setOrigin(0, 0.5).setStroke('#120a1c', 4));
    });
    c.add(button(this, W - 60, H - 34, 100, 40, tr('Stop'), () => {
      if (this.paused || this.over) return;
      this.finish(false);
    }, { size: 16, color: 0x8a3a3a }));
  }

  private say(msg: string, color: string) {
    const t = txt(this, W / 2, 140, msg, 26, color).setOrigin(0.5).setDepth(2500).setStroke('#120a1c', 6);
    this.tweens.add({ targets: t, y: 110, alpha: 0, delay: 900, duration: 600, onComplete: () => t.destroy() });
  }
}
