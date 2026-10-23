import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { tr } from '../i18n';
import { animal, quest, type LandId, type QuestDef, type SkillId, type WildDef } from '../animal/data';
import { addFood, bossCalm, canTurnIn, hasCharm, loadAnimals, rest, saveAnimals, skill, warm, type AnimalSave } from '../animal/state';
import { ask, dialog, grassTexture, keyVector, questTalk, say, Stick, topBar, tx } from '../animal/ui';
import { blocked, type LandMap, type Pt } from '../animal/world';
import type { BattleData } from './AnimalBattleScene';
import { C } from '../ui/widgets';

/** A wild animal walking around. */
interface Wild {
  uid: number;
  def: WildDef;
  level: number;
  home: Pt;
  x: number;
  y: number;
  to: Pt;
  img?: Phaser.GameObjects.Image;
}

/** What stays the same while you go into a battle and come back. */
export interface LandState {
  fresh: boolean;
  pos?: Pt;
  wilds: Wild[];
  /** When each fruit tree has fruit again (cats only). */
  fruitAt: Record<string, number>;
  /** Calmed animals come back after a while: [spawn index, time]. */
  back: [number, number][];
  /** Puppies following you, not yet home (Jungle). */
  following: number;
}

export const newLandState = (): LandState => ({ fresh: true, wilds: [], fruitAt: {}, back: [], following: 0 });

/** Everything that makes one land different from another. */
export interface LandConfig {
  key: string;
  land: LandId;
  map: LandMap;
  state: LandState;
  wilds: WildDef[];
  /** Which animals live at each level (further from the village = tougher). */
  byLevel: Record<number, string[]>;
  boss: WildDef;
  bossLevel: number;
  bossQuest: QuestDef['id'];
  /** Which edge the path home is on. */
  exit: 'left' | 'top' | 'right' | 'bottom';
  ground: 'jungle' | 'desert' | 'forest' | 'snow' | 'beach';
  /** Sign by the path home. */
  sign: string;
  /** What the rocks (or mounds, logs, snow piles) hide, and the quest that wants it. */
  hidden: { quest: QuestDef['id']; list?: 'fossils' | 'mushrooms' | 'crystals' | 'turtles'; icon?: string; dust: number[]; toSea?: boolean };
  /** Skills that break a rock with one question (a wrong answer still works). */
  strong: SkillId[];
  /** The rest spot (oasis, spring): water color. */
  spring?: number;
  /** Something next to the boss (the tortoise's well). */
  bossProp?: string;
  /** Too cold without a warm scarf: lose a heart now and then. */
  cold?: boolean;
  decorCount?: number;
  /** Something at the path home (the Seashore's boat). */
  exitProp?: string;
  /** Big things to look at (they do not block the way), next to the rest spot. */
  landmark?: { sprite: string; dx: number; dy: number };
  /** Look of the trees (or cacti and rocks). */
  tree: (i: number) => { sprite: string; scale: number };
  fruitTree: string;
  fruit: string;
  /** A little picture by fruit trees that look like the other trees. */
  fruitBadge?: string;
  /** Rocks (Jungle) or sand mounds (Desert). */
  rock: string;
  rockCracked: string;
  /** Do rocks block the way? (Sand mounds do not.) */
  solidRocks: boolean;
  stump: { sprite: string; scale: number; acorns: number; food: string; n: number };
  decor: string[];
  /** Texts, made when needed so they follow the language. */
  text: () => LandText;
}

export interface LandText {
  welcome: string;
  home: string;
  noClimb: string;
  noFruit: string;
  climbed: string;
  stump: string;
  rockTitle: string;
  rockRight: string;
  rockWrongStrong: string;
  rockWrong: string;
  rockGo: string;
  crackedTitle: string;
  crackedRight: string;
  crackedWrong: string;
  foundHidden: string;
  foundAcorns: string;
  bossRoar: string;
  bossNotYet: string;
  springLabel?: string;
  springRest?: string;
  cold?: string;
}

/** One step toward each edge. */
const DIR = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } };

let uid = 1;
const HERO_R = 16;
const RETURN_MS = 120000;

/** A wild land: calm grumpy animals, find food, and do the land's quests. */
export class AnimalLandScene extends Phaser.Scene {
  protected cfg: LandConfig;
  protected s!: AnimalSave;
  protected hero!: Phaser.GameObjects.Image;
  private stick!: Stick;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private target: { x: number; y: number; then?: () => void } | null = null;
  protected busy = false;
  private graceUntil = 0;
  private bar?: Phaser.GameObjects.Container;
  private rocks = new Map<string, Phaser.GameObjects.Image>();
  private gold = new Map<string, Phaser.GameObjects.Image>();
  private stump?: Phaser.GameObjects.Image;
  private boss?: Phaser.GameObjects.Image;
  private pups: Phaser.GameObjects.Image[] = [];
  private trail: Pt[] = [];
  private paw?: Phaser.GameObjects.Triangle;
  private hinted = new Set<string>();
  private helperMark?: Phaser.GameObjects.Text;
  /** Rested at the oasis since you last walked away from it. */
  private rested = false;
  /** When the cold next nips you (Snowy Mountains, no scarf). */
  private chillAt = 0;

  constructor(cfg: LandConfig) {
    super(cfg.key);
    this.cfg = cfg;
  }

  private get map() {
    return this.cfg.map;
  }

  private newWild(i: number): Wild {
    const sp = this.map.spawns[i];
    const ids = this.cfg.byLevel[sp.level];
    const id = ids[Math.floor(Math.random() * ids.length)];
    const def = this.cfg.wilds.find((w) => w.id === id)!;
    return { uid: uid++, def, level: sp.level, home: { x: sp.x, y: sp.y }, x: sp.x, y: sp.y, to: { x: sp.x, y: sp.y } };
  }

  /** Rocks or mounds that are still there. */
  private isOpen(id: string) {
    return this.cfg.hidden.list ? this.s.dug.includes(id) : this.s.rescued.includes(id);
  }

  create(data: { result?: 'calm' | 'tired' | 'ran'; wild?: number } = {}) {
    const s = loadAnimals();
    if (!s) {
      this.scene.start('AnimalSetup', { fresh: true });
      return;
    }
    this.s = s;
    this.busy = false;
    this.target = null;
    this.rested = false;
    this.chillAt = this.time.now + 20000;
    this.rocks.clear();
    this.gold.clear();
    this.pups = [];
    this.trail = [];
    this.hinted.clear();
    const st = this.cfg.state;
    if (data.result === 'tired') {
      // Too many grumpy swipes: home to rest (puppies are still out there).
      st.fresh = true;
      st.following = 0;
      this.scene.start('AnimalVillage', { tired: true });
      return;
    }
    if (st.fresh || !st.wilds.length) {
      st.wilds = this.map.spawns.map((_, i) => this.newWild(i));
      st.pos = { ...this.map.start };
      st.back = [];
      st.fresh = false;
    }
    if (data.result === 'calm' && data.wild) {
      const i = st.wilds.findIndex((w) => w.uid === data.wild);
      if (i >= 0) {
        const spawn = this.map.spawns.findIndex((p) => p.x === st.wilds[i].home.x && p.y === st.wilds[i].home.y);
        st.wilds.splice(i, 1);
        st.back.push([spawn, Date.now() + RETURN_MS]);
      }
    }
    if (data.result) this.graceUntil = this.time.now + 2000;
    playMusic('battle');
    this.drawLand();

    const pos = st.pos ?? this.map.start;
    this.hero = this.add.image(pos.x, pos.y, animal(s.animal).sprite).setScale(3.4).setDepth(pos.y);
    this.tweens.add({ targets: this.hero, scaleY: 3.2, duration: 450, yoyo: true, repeat: -1 });
    for (let i = 0; i < st.following; i++) this.addPup();
    this.cameras.main.setBounds(0, 0, this.map.w, this.map.h);
    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
    this.cameras.main.fadeIn(300);

    this.stick = new Stick(this);
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.busy || over.length || this.stick.owns(p) || p.y < 90) return;
      this.target = { x: p.worldX, y: p.worldY };
    });
    if (skill(s) === 'sniff') this.paw = this.add.triangle(0, 0, 0, -12, 10, 8, -10, 8, 0xffe066).setStrokeStyle(2, 0x5a3a10).setDepth(5000);
    this.refresh();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.respawn() });
    if (!data.result) say(this, this.cfg.text().welcome, '#ffe9a0');
  }

  // ---------------------------------------------------------------- drawing
  private drawLand() {
    const s = this.s;
    const m = this.map;
    const cfg = this.cfg;
    const text = cfg.text();
    this.add.tileSprite(0, 0, m.w, m.h, grassTexture(this, cfg.ground)).setOrigin(0).setTileScale(3);
    // The path home, with a sign beside it.
    const d = DIR[cfg.exit];
    const pathColor = { jungle: 0xb88a50, desert: 0xc89a60, forest: 0x7a5a3a, snow: 0xc8d8e8, beach: 0x9a7a50 }[cfg.ground];
    // The sea along the bottom, with gentle waves.
    if (m.waterY !== undefined) {
      this.add.rectangle(0, m.waterY, m.w, m.h - m.waterY, 0x3a8ad0).setOrigin(0).setDepth(m.waterY - 5);
      this.add.rectangle(0, m.waterY, m.w, 14, 0xe8f6ff, 0.9).setOrigin(0).setDepth(m.waterY - 4);
      for (let x = 40; x < m.w; x += 160) {
        const wave = this.add.ellipse(x, m.waterY + 50 + ((x / 160) % 3) * 50, 70, 10, 0xbfe4ff, 0.7).setDepth(m.waterY - 3);
        this.tweens.add({ targets: wave, x: x + 40, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    }
    if (d.x) this.add.rectangle(d.x < 0 ? 0 : m.w - 160, m.start.y - 30, 160, 60, pathColor).setOrigin(0, 0);
    else this.add.rectangle(m.start.x - 30, d.y < 0 ? 0 : m.h - 160, 60, 160, pathColor).setOrigin(0, 0);
    const signAt = d.x ? { x: m.start.x - d.x * 30, y: m.start.y - 70 } : { x: m.start.x + 80, y: m.start.y - d.y * 70 };
    this.add.image(signAt.x, signAt.y, cfg.sign).setScale(3).setFlipX(d.x < 0).setDepth(signAt.y);
    this.label(signAt.x, signAt.y - 50, text.home);
    if (cfg.exitProp) this.add.image(m.start.x - 20, m.start.y + 70, cfg.exitProp).setScale(3).setDepth(m.start.y + 70);
    // Ground plants and pebbles (just pretty).
    for (let i = 0; i < (cfg.decorCount ?? 90); i++) {
      const x = (i * 337) % m.w;
      const y = (i * 211) % m.h;
      this.add.image(x, y, cfg.decor[i % cfg.decor.length]).setScale(2.6).setDepth(y - 20).setAlpha(0.95);
    }
    m.trees.forEach((t, i) => {
      if (m.oasis && t.x === m.oasis.x && t.y === m.oasis.y) return;
      const look = cfg.tree(i);
      this.add.image(t.x, t.y, look.sprite).setScale(look.scale).setOrigin(0.5, 0.75).setDepth(t.y + 10);
    });
    for (const f of m.fruit) {
      const img = this.add.image(f.x, f.y, cfg.fruitTree).setScale(3.2).setOrigin(0.5, 0.75).setDepth(f.y + 10).setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.walkNear(f, () => this.climb(f.id)));
      if (cfg.fruitBadge) this.add.image(f.x + 30, f.y + 16, cfg.fruitBadge).setScale(2.4).setDepth(f.y + 12);
    }
    for (const r of m.rocks) {
      if (this.isOpen(r.id)) continue;
      const img = this.add.image(r.x, r.y, cfg.rock).setScale(3).setDepth(r.y + 10).setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.walkNear(r, () => this.rock(r.id)));
      this.rocks.set(r.id, img);
      // A little puppy peeking out from behind the rock.
      if (r.puppy && cfg.land === 'jungle') {
        const peek = this.add.image(r.x + 30, r.y - 18, 'npc_puppy').setScale(2.2).setDepth(r.y + 5);
        this.tweens.add({ targets: peek, y: peek.y - 6, duration: 500, yoyo: true, repeat: -1 });
        img.setData('peek', peek);
      }
    }
    // The secret glade: burrows only the mouse fits through.
    for (const b of [m.burrows.outside, m.burrows.inside]) this.add.image(b.x, b.y, 'prop_burrow').setScale(3).setDepth(b.y - 30);
    if (!s.stumps.includes(m.stump.id)) {
      this.stump = this.add.image(m.stump.x, m.stump.y, cfg.stump.sprite).setScale(cfg.stump.scale).setDepth(m.stump.y);
    }
    // Golden acorns: only the owl can see them.
    if (skill(s) === 'eyes') {
      for (const gd of m.golden) {
        if (s.golden.includes(gd.id)) continue;
        const img = this.add.image(gd.x, gd.y, 'prop_sparkle').setScale(3).setDepth(gd.y);
        this.tweens.add({ targets: img, alpha: 0.4, scale: 3.6, duration: 600, yoyo: true, repeat: -1 });
        this.gold.set(gd.id, img);
      }
    }
    // The rest spot (oasis or spring), and the helper beside it.
    if (m.oasis) {
      const o = m.oasis;
      const water = cfg.spring ?? 0x4a90e0;
      this.add.ellipse(o.x, o.y, o.r * 2.2, o.r * 1.3, water).setStrokeStyle(5, Phaser.Display.Color.ValueToColor(water).darken(25).color).setDepth(o.y - 40);
      this.add.ellipse(o.x - 30, o.y - 16, 60, 16, 0xffffff, 0.45).setDepth(o.y - 39);
      if (cfg.land === 'desert') this.add.image(o.x + o.r + 30, o.y - 30, 'prop_palm').setScale(3.2).setOrigin(0.5, 0.75).setDepth(o.y);
      if (cfg.cold) {
        // Steam rising from the hot spring.
        for (let i = 0; i < 3; i++) {
          const puff = this.add.ellipse(o.x - 40 + i * 40, o.y - 10, 26, 18, 0xffffff, 0.5).setDepth(o.y);
          this.tweens.add({ targets: puff, y: o.y - 70, alpha: 0, duration: 1800, delay: i * 600, repeat: -1 });
        }
      }
      this.label(o.x, o.y + o.r * 0.65 + 10, text.springLabel ?? '');
      if (cfg.landmark) this.add.image(o.x + cfg.landmark.dx, o.y + cfg.landmark.dy, cfg.landmark.sprite).setScale(3).setOrigin(0.5, 1).setDepth(o.y + cfg.landmark.dy);
    }
    if (m.helper) {
      const q = this.helperQuest();
      const h = m.helper;
      const npc = this.add.image(h.x, h.y, q.sprite).setScale(3.6).setDepth(h.y).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: npc, y: h.y - 4, duration: 800, yoyo: true, repeat: -1 });
      npc.on('pointerup', () => this.walkNear(h, () => this.talkHelper()));
      this.label(h.x, h.y + 40, tx(q.giverName));
    }
    // The boss, far from the village.
    if (!bossCalm(s, cfg.boss.id)) {
      if (cfg.bossProp) this.add.image(m.boss.x, m.boss.y + 50, cfg.bossProp).setScale(3).setDepth(m.boss.y - 10);
      // The boss faces the way you come from.
      this.boss = this.add.image(m.boss.x, m.boss.y, cfg.boss.sprite).setScale(3.4).setFlipX(m.start.x < m.boss.x).setDepth(m.boss.y);
      this.tweens.add({ targets: this.boss, scaleY: 3.55, duration: 700, yoyo: true, repeat: -1 });
      this.label(m.boss.x, m.boss.y - 80, tx(cfg.boss.name));
    } else if (cfg.bossProp) this.add.image(m.boss.x, m.boss.y, cfg.bossProp).setScale(3).setDepth(m.boss.y);
  }

  private label(x: number, y: number, s: string) {
    return this.add.text(x, y, s, { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', stroke: '#1a3a10', strokeThickness: 4 }).setOrigin(0.5).setDepth(1900);
  }

  private refresh() {
    this.bar?.destroy();
    this.bar = topBar(this, this.s, () => this.refresh());
    // A mark over Auntie Camel: ! new quest, ? ready to hand in.
    this.helperMark?.destroy();
    this.helperMark = undefined;
    const h = this.map.helper;
    if (h) {
      const q = this.helperQuest();
      const st = this.s.quests[q.id];
      const ready = canTurnIn(this.s, q.id);
      if (st !== 'done' && (st !== 'new' || ready || (st === 'new' && this.helperReady()))) {
        const mark = st === 'new' ? '!' : ready ? '?' : '…';
        this.helperMark = this.add.text(h.x, h.y - 50, mark, { fontFamily: 'sans-serif', fontSize: '34px', color: mark === '…' ? '#c8c0e0' : '#ffd24a', stroke: '#120a1c', strokeThickness: 6 }).setOrigin(0.5, 1).setDepth(1900);
        this.tweens.add({ targets: this.helperMark, y: h.y - 56, duration: 400, yoyo: true, repeat: -1 });
      }
    }
  }

  private helperQuest() {
    return quest(this.cfg.bossQuest);
  }

  private helperReady() {
    const b = this.helperQuest().boss;
    return !b || this.s.level >= b.level || b.after.every((a) => this.s.quests[a] === 'done');
  }

  private talkHelper() {
    this.busy = true;
    questTalk(this, this.s, this.helperQuest(), () => {
      this.busy = false;
      this.refresh();
    });
  }

  private addPup() {
    const x = (this.hero?.x ?? this.map.start.x) - 30 - this.pups.length * 14;
    const y = (this.hero?.y ?? this.map.start.y) + 14;
    const p = this.add.image(x, y, 'npc_puppy').setScale(2.4).setDepth(y);
    this.tweens.add({ targets: p, scaleY: 2.2, duration: 250, yoyo: true, repeat: -1 });
    this.pups.push(p);
  }

  // ---------------------------------------------------------------- moving
  private walkNear(p: Pt, then: () => void) {
    if (this.busy) return;
    const d = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, p.x, p.y);
    if (d < 90) {
      then();
      return;
    }
    const a = Math.atan2(this.hero.y - p.y, this.hero.x - p.x);
    this.target = { x: p.x + Math.cos(a) * 70, y: p.y + Math.sin(a) * 70, then };
  }

  update(t: number, dt: number) {
    if (!this.hero || this.busy) return;
    const fast = skill(this.s) === 'sprint';
    const speed = (fast ? 0.36 : 0.24) * (hasCharm(this.s, 'boot') ? 1.25 : 1) * dt;
    let { x: vx, y: vy } = this.stick.vec;
    if (!vx && !vy) ({ x: vx, y: vy } = keyVector(this.keys));
    if (vx || vy) this.target = null;
    else if (this.target) {
      const dx = this.target.x - this.hero.x;
      const dy = this.target.y - this.hero.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        const then = this.target.then;
        this.target = null;
        then?.();
      } else {
        vx = dx / d;
        vy = dy / d;
      }
    }
    if (vx || vy) this.step(vx * speed, vy * speed);
    this.chill(t);
    this.moveWilds(dt);
    this.checkTouches(t);
    this.followPups();
    this.pointPaw();
  }

  /** Brrr! Without a warm scarf the mountain cold takes a heart now and then (never the last one). */
  private chill(t: number) {
    if (!this.cfg.cold || warm(this.s) || t < this.chillAt) return;
    this.chillAt = t + 20000;
    if (this.s.hearts > 1) {
      this.s.hearts--;
      saveAnimals(this.s);
      this.refresh();
      this.hero.setTint(0x9ad0ff);
      this.time.delayedCall(400, () => this.hero.clearTint());
    }
    say(this, this.cfg.text().cold ?? '', '#9ad0ff');
  }

  private solidRocks(): Set<string> {
    return this.cfg.solidRocks ? new Set(this.rocks.keys()) : new Set();
  }

  /** Move, sliding along trees and rocks instead of stopping dead. */
  private step(dx: number, dy: number) {
    const m = this.map;
    const left = this.solidRocks();
    const p = { x: this.hero.x + dx, y: this.hero.y + dy };
    if (!blocked(m, p, HERO_R, left)) this.hero.setPosition(p.x, p.y);
    else if (!blocked(m, { x: p.x, y: this.hero.y }, HERO_R, left)) this.hero.x = p.x;
    else if (!blocked(m, { x: this.hero.x, y: p.y }, HERO_R, left)) this.hero.y = p.y;
    else this.target = null;
    if (dx) this.hero.setFlipX(dx < 0);
    this.hero.setDepth(this.hero.y);
    this.cfg.state.pos = { x: this.hero.x, y: this.hero.y };
    this.trail.unshift({ x: this.hero.x, y: this.hero.y });
    if (this.trail.length > 80) this.trail.pop();
    // Back to the village along the path.
    const d = DIR[this.cfg.exit];
    const atEdge = d.x ? (d.x < 0 ? this.hero.x < 26 : this.hero.x > m.w - 26) && Math.abs(this.hero.y - m.start.y) < 60 : (d.y < 0 ? this.hero.y < 26 : this.hero.y > m.h - 26) && Math.abs(this.hero.x - m.start.x) < 60;
    if (atEdge) this.home();
  }

  private followPups() {
    this.pups.forEach((p, i) => {
      const spot = this.trail[Math.min(this.trail.length - 1, 12 + i * 10)];
      if (spot) p.setPosition(spot.x, spot.y + 10).setDepth(spot.y);
    });
  }

  private moveWilds(dt: number) {
    const solid = this.solidRocks();
    for (const w of this.cfg.state.wilds) {
      if (!w.img) {
        w.img = this.add.image(w.x, w.y, w.def.sprite).setScale(3.2);
        this.tweens.add({ targets: w.img, scaleY: 3.0, duration: 380 + (w.uid % 5) * 50, yoyo: true, repeat: -1 });
      }
      const dx = w.to.x - w.x;
      const dy = w.to.y - w.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        // Wander a little around home.
        if (Math.random() < 0.01) w.to = { x: w.home.x + Phaser.Math.Between(-110, 110), y: w.home.y + Phaser.Math.Between(-80, 80) };
      } else {
        const sp = 0.05 * dt;
        const nx = w.x + (dx / d) * sp;
        const ny = w.y + (dy / d) * sp;
        if (blocked(this.map, { x: nx, y: ny }, 14, solid)) w.to = { x: w.x, y: w.y };
        else {
          w.x = nx;
          w.y = ny;
          w.img.setFlipX(dx < 0);
        }
      }
      w.img.setPosition(w.x, w.y).setDepth(w.y);
    }
  }

  private respawn() {
    const now = Date.now();
    const st = this.cfg.state;
    const due = st.back.filter(([, at]) => at <= now);
    st.back = st.back.filter(([, at]) => at > now);
    for (const [i] of due) if (i >= 0) st.wilds.push(this.newWild(i));
  }

  /** Touching things: wild animals start a battle; burrows, gold, the stump and the oasis. */
  private checkTouches(t: number) {
    const m = this.map;
    const hx = this.hero.x;
    const hy = this.hero.y;
    const near = (p: Pt, r: number) => Math.hypot(p.x - hx, p.y - hy) < r;
    if (t > this.graceUntil) {
      const w = this.cfg.state.wilds.find((x) => near(x, 46));
      if (w) return this.battle(w);
      if (this.boss && near(m.boss, 90)) return this.bossTalk();
    }
    // Mouse burrows lead in and out of the secret glade.
    const b = m.burrows;
    for (const [from, to] of [[b.outside, b.inside], [b.inside, b.outside]] as [Pt, Pt][]) {
      if (!near(from, 26)) continue;
      if (skill(this.s) === 'squeeze') {
        sfx('click');
        const ax = Math.sign(to.x - from.x) * 40;
        const ay = Math.sign(to.y - from.y) * 40;
        this.hero.setPosition(to.x + ax, to.y + ay);
        this.trail = [];
        say(this, tr('Squeeze! You slip through the burrow.'), '#ffe9a0');
      } else this.hintOnce('burrow', tr('This burrow is too small. Only a mouse could squeeze through!'));
    }
    if (this.stump && near(m.stump, 50)) {
      const st = this.cfg.stump;
      this.stump.destroy();
      this.stump = undefined;
      this.s.stumps.push(m.stump.id);
      this.s.acorns += st.acorns;
      addFood(this.s, st.food, st.n);
      saveAnimals(this.s);
      sfx('chest');
      say(this, this.cfg.text().stump, '#ffd24a');
      this.refresh();
    }
    for (const [id, img] of this.gold) {
      const gd = m.golden.find((g) => g.id === id)!;
      if (!near(gd, 40)) continue;
      img.destroy();
      this.gold.delete(id);
      this.s.golden.push(id);
      this.s.acorns += 10;
      saveAnimals(this.s);
      sfx('coin');
      say(this, tr('Your night eyes found a golden acorn! +10 acorns'), '#ffd24a');
      this.refresh();
    }
    // A cool drink at the oasis: all hearts back (once each visit).
    if (m.oasis) {
      const at = near(m.oasis, m.oasis.r + 40);
      if (at && !this.rested) {
        this.rested = true;
        rest(this.s);
        saveAnimals(this.s);
        sfx('heal');
        this.chillAt = this.time.now + 20000;
        say(this, this.cfg.text().springRest ?? '', C.good);
        this.refresh();
      } else if (!at && !near(m.oasis, m.oasis.r + 160)) this.rested = false;
    }
  }

  private hintOnce(key: string, msg: string) {
    if (this.hinted.has(key)) return;
    this.hinted.add(key);
    say(this, msg, '#ffe9a0');
    this.time.delayedCall(4000, () => this.hinted.delete(key));
  }

  // ---------------------------------------------------------------- things to do
  /** Cats climb fruit trees (once a minute per tree). */
  private climb(id: string) {
    const text = this.cfg.text();
    if (skill(this.s) !== 'climb') {
      say(this, text.noClimb, '#ffe9a0');
      return;
    }
    const at = this.cfg.state.fruitAt[id] ?? 0;
    if (Date.now() < at) {
      say(this, text.noFruit, '#ffe9a0');
      return;
    }
    this.cfg.state.fruitAt[id] = Date.now() + 60000;
    addFood(this.s, this.cfg.fruit);
    saveAnimals(this.s);
    sfx('coin');
    say(this, text.climbed, C.good);
    this.refresh();
  }

  /** A rock (or sand mound): answer a question to push it. Wrong answers crack it; one more question breaks it. */
  private rock(id: string) {
    const r = this.map.rocks.find((k) => k.id === id)!;
    const img = this.rocks.get(id);
    if (!img || this.busy) return;
    this.busy = true;
    const text = this.cfg.text();
    const hid = this.cfg.hidden;
    const jungle = !hid.list;
    // Elephants push rocks; in sand and snow, dogs are great diggers too.
    const strong = this.cfg.strong.includes(skill(this.s));
    const breakIt = () => {
      const peek = img.getData('peek') as Phaser.GameObjects.Image | undefined;
      peek?.destroy();
      img.destroy();
      this.rocks.delete(id);
      if (jungle) this.s.rescued.push(id);
      else {
        this.s.dug.push(id);
        this.add.image(r.x, r.y, this.cfg.rockCracked).setScale(3).setDepth(r.y - 20).setAlpha(0.8);
      }
      this.cameras.main.shake(200, 0.01);
      sfx('chest');
      const em = this.add.particles(r.x, r.y, 'dot', { speed: { min: 60, max: 220 }, lifespan: 600, scale: { start: 1.6, end: 0 }, tint: hid.dust, emitting: false }).setDepth(r.y + 20);
      em.explode(26);
      if (r.puppy) {
        if (jungle) {
          this.cfg.state.following++;
          this.addPup();
        } else {
          this.s[hid.list!].push(id);
          const f = this.add.image(r.x, r.y - 20, hid.icon!).setScale(3).setDepth(r.y + 30);
          if (hid.toSea && this.map.waterY !== undefined) {
            // A baby turtle waddles all the way down to the sea.
            this.tweens.add({ targets: f, angle: { from: -8, to: 8 }, duration: 200, yoyo: true, repeat: -1 });
            this.tweens.add({ targets: f, y: this.map.waterY + 40, duration: Math.max(1200, (this.map.waterY - r.y) * 6), onUpdate: () => f.setDepth(f.y + 10), onComplete: () => this.tweens.add({ targets: f, alpha: 0, duration: 500, onComplete: () => f.destroy() }) });
          } else this.tweens.add({ targets: f, y: r.y - 90, alpha: 0, duration: 1400, onComplete: () => f.destroy() });
        }
        say(this, text.foundHidden, C.good);
      } else {
        this.s.acorns += 8;
        say(this, text.foundAcorns, '#ffd24a');
      }
      saveAnimals(this.s);
      this.refresh();
      this.busy = false;
    };
    ask(this, this.s, text.rockTitle, { right: text.rockRight, wrong: strong ? text.rockWrongStrong : text.rockWrong, go: text.rockGo }, (correct) => {
      if (correct || strong) return breakIt();
      img.setTexture(this.cfg.rockCracked);
      ask(this, this.s, text.crackedTitle, { right: text.crackedRight, wrong: text.crackedWrong, go: text.rockGo }, () => breakIt());
    });
  }

  private battle(w: Wild) {
    this.busy = true;
    this.cfg.state.pos = { x: this.hero.x, y: this.hero.y };
    this.cfg.state.wilds.forEach((x) => (x.img = undefined));
    sfx('encounter');
    this.cameras.main.flash(200, 255, 255, 255);
    const data: BattleData = { foe: w.def.id, level: w.level, wild: w.uid, land: this.cfg.land };
    this.time.delayedCall(250, () => this.scene.start('AnimalBattle', data));
  }

  private bossTalk() {
    this.busy = true;
    const s = this.s;
    const cfg = this.cfg;
    const text = cfg.text();
    const backAway = { label: tr('Back away'), color: 0x3a3450, fn: () => {
      this.busy = false;
      this.graceUntil = this.time.now + 3000;
      const d = DIR[cfg.exit];
      this.hero.x += d.x * 120;
      this.hero.y += d.y * 120;
    } };
    // No fighting a boss by surprise: its quest comes when you are ready.
    if (s.quests[cfg.bossQuest] !== 'active') {
      dialog(this, cfg.boss.sprite, tx(cfg.boss.name), `${text.bossRoar}\n${text.bossNotYet}`, [backAway]);
      return;
    }
    const lv = quest(cfg.bossQuest).boss!.level;
    const warn = s.level < lv ? `\n${tr('Very strong! Suggested level: {lv}. You are level {n}.', { lv, n: s.level })}` : '';
    dialog(this, cfg.boss.sprite, tx(cfg.boss.name), text.bossRoar + warn, [
      backAway,
      { label: tr('Calm it down!'), color: 0xb02a4a, fn: () => {
        const d = DIR[cfg.exit];
        cfg.state.pos = { x: this.hero.x + d.x * 100, y: this.hero.y + d.y * 100 };
        cfg.state.wilds.forEach((x) => (x.img = undefined));
        const data: BattleData = { foe: cfg.boss.id, level: cfg.bossLevel, land: cfg.land };
        this.scene.start('AnimalBattle', data);
      } },
    ]);
  }

  /** The dog's nose: a paw arrow toward what the quests need. */
  private pointPaw() {
    if (!this.paw) return;
    const s = this.s;
    const m = this.map;
    const hiddenQuest = this.cfg.hidden.quest;
    let goal: Pt | undefined;
    const rocks = m.rocks.filter((r) => r.puppy && this.rocks.has(r.id));
    const d = DIR[this.cfg.exit];
    const homeSpot = { x: d.x ? (d.x < 0 ? 0 : m.w) : m.start.x, y: d.y ? (d.y < 0 ? 0 : m.h) : m.start.y };
    const nearest = (list: Pt[]) =>
      list.reduce((a, b) => (Phaser.Math.Distance.Between(this.hero.x, this.hero.y, a.x, a.y) < Phaser.Math.Distance.Between(this.hero.x, this.hero.y, b.x, b.y) ? a : b));
    if (s.quests[hiddenQuest] !== 'done' && rocks.length) goal = nearest(rocks);
    // All found: lead the puppies (or bring the fossils) home to the village.
    else if (this.pups.length || canTurnIn(s, hiddenQuest)) goal = homeSpot;
    // The boss only once its quest has been accepted.
    else if (s.quests[this.cfg.bossQuest] === 'active' && !bossCalm(s, this.cfg.boss.id)) goal = m.boss;
    if (!goal) {
      this.paw.setVisible(false);
      return;
    }
    const a = Math.atan2(goal.y - this.hero.y, goal.x - this.hero.x);
    this.paw.setVisible(true).setPosition(this.hero.x + Math.cos(a) * 60, this.hero.y + Math.sin(a) * 60).setRotation(a + Math.PI / 2);
  }

  private home() {
    if (this.busy) return;
    this.busy = true;
    // Puppies following you are safe now.
    this.cfg.state.following = 0;
    this.cfg.state.fresh = true;
    saveAnimals(this.s);
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start('AnimalVillage', { from: this.cfg.land }));
  }
}
