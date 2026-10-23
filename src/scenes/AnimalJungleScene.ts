import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { tr } from '../i18n';
import { animal, GORILLA, JUNGLE, quest, type WildDef } from '../animal/data';
import { addFood, canTurnIn, loadAnimals, saveAnimals, skill, type AnimalSave } from '../animal/state';
import { ask, dialog, grassTexture, keyVector, say, Stick, topBar, tx } from '../animal/ui';
import { blocked, buildJungle, type Pt } from '../animal/world';
import { C } from '../ui/widgets';

/** A wild animal walking around the jungle. */
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
export const jungleState: {
  fresh: boolean;
  pos?: Pt;
  wilds: Wild[];
  /** When each fruit tree has apples again (cats only). */
  fruitAt: Record<string, number>;
  /** Calmed animals come back after a while: [spawn index, time]. */
  back: [number, number][];
  /** Puppies following you, not yet home. */
  following: number;
} = { fresh: true, wilds: [], fruitAt: {}, back: [], following: 0 };

let uid = 1;
const MAP = buildJungle();
/** Which animals live at each level of the jungle (deeper = tougher). */
const BY_LEVEL: Record<number, string[]> = { 1: ['frog', 'parrot'], 2: ['monkey', 'toucan'], 3: ['sloth', 'tapir'], 4: ['croc', 'tiger'] };
const HERO_R = 16;
const RETURN_MS = 120000;

function newWild(i: number): Wild {
  const sp = MAP.spawns[i];
  const ids = BY_LEVEL[sp.level];
  const id = ids[Math.floor(Math.random() * ids.length)];
  const def = JUNGLE.find((w) => w.id === id)!;
  return { uid: uid++, def, level: sp.level, home: { x: sp.x, y: sp.y }, x: sp.x, y: sp.y, to: { x: sp.x, y: sp.y } };
}

/** The Jungle: calm grumpy animals, find apples, rescue the puppies. */
export class AnimalJungleScene extends Phaser.Scene {
  private s!: AnimalSave;
  private hero!: Phaser.GameObjects.Image;
  private stick!: Stick;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private target: { x: number; y: number; then?: () => void } | null = null;
  private busy = false;
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

  constructor() {
    super('AnimalJungle');
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
    this.rocks.clear();
    this.gold.clear();
    this.pups = [];
    this.trail = [];
    this.hinted.clear();
    const st = jungleState;
    if (data.result === 'tired') {
      // Fainted from too many grumpy swipes: home to rest (puppies still out there).
      st.fresh = true;
      st.following = 0;
      this.scene.start('AnimalVillage', { tired: true });
      return;
    }
    if (st.fresh || !st.wilds.length) {
      st.wilds = MAP.spawns.map((_, i) => newWild(i));
      st.pos = { ...MAP.start };
      st.back = [];
      st.fresh = false;
    }
    if (data.result === 'calm' && data.wild) {
      const i = st.wilds.findIndex((w) => w.uid === data.wild);
      if (i >= 0) {
        const spawn = MAP.spawns.findIndex((p) => p.x === st.wilds[i].home.x && p.y === st.wilds[i].home.y);
        st.wilds.splice(i, 1);
        st.back.push([spawn, Date.now() + RETURN_MS]);
      }
    }
    if (data.result) this.graceUntil = this.time.now + 2000;
    playMusic('battle');
    this.drawJungle();

    const pos = st.pos ?? MAP.start;
    this.hero = this.add.image(pos.x, pos.y, animal(s.animal).sprite).setScale(3.4).setDepth(pos.y);
    this.tweens.add({ targets: this.hero, scaleY: 3.2, duration: 450, yoyo: true, repeat: -1 });
    for (let i = 0; i < st.following; i++) this.addPup();
    this.cameras.main.setBounds(0, 0, MAP.w, MAP.h);
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
    if (!data.result) say(this, tr('The Jungle! Walk into grumpy animals to calm them down.'), '#ffe9a0');
  }

  // ---------------------------------------------------------------- drawing
  private drawJungle() {
    const s = this.s;
    this.add.tileSprite(0, 0, MAP.w, MAP.h, grassTexture(this, 'jungle')).setOrigin(0).setTileScale(3);
    // A path home on the left.
    this.add.rectangle(0, MAP.start.y - 30, 160, 60, 0xb88a50).setOrigin(0, 0);
    this.add.image(60, MAP.start.y - 70, 'prop_sign').setScale(3).setFlipX(true).setDepth(MAP.start.y);
    this.label(70, MAP.start.y - 120, tr('← Village'));
    // Some ground plants (just pretty).
    for (let i = 0; i < 90; i++) {
      const x = (i * 337) % MAP.w;
      const y = (i * 211) % MAP.h;
      this.add.image(x, y, i % 3 ? 'prop_bush' : 'prop_flowers').setScale(2.6).setDepth(y - 20).setAlpha(0.95);
    }
    for (const t of MAP.trees) this.add.image(t.x, t.y, 'prop_jtree').setScale(3.2).setOrigin(0.5, 0.75).setDepth(t.y + 10);
    for (const f of MAP.fruit) {
      const img = this.add.image(f.x, f.y, 'prop_fruittree').setScale(3.2).setOrigin(0.5, 0.75).setDepth(f.y + 10).setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.walkNear(f, () => this.climb(f.id)));
    }
    for (const r of MAP.rocks) {
      if (s.rescued.includes(r.id)) continue;
      const img = this.add.image(r.x, r.y, 'prop_rock').setScale(3).setDepth(r.y + 10).setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.walkNear(r, () => this.rock(r.id)));
      this.rocks.set(r.id, img);
      // A little puppy peeking out from behind the rock.
      if (r.puppy) {
        const peek = this.add.image(r.x + 30, r.y - 18, 'npc_puppy').setScale(2.2).setDepth(r.y + 5);
        this.tweens.add({ targets: peek, y: peek.y - 6, duration: 500, yoyo: true, repeat: -1 });
        img.setData('peek', peek);
      }
    }
    // The secret glade: burrows only the mouse fits through.
    for (const b of [MAP.burrows.outside, MAP.burrows.inside]) this.add.image(b.x, b.y, 'prop_burrow').setScale(3).setDepth(b.y - 30);
    if (!s.stumps.includes(MAP.stump.id)) {
      this.stump = this.add.image(MAP.stump.x, MAP.stump.y, 'prop_stump').setScale(3).setDepth(MAP.stump.y);
    }
    // Golden acorns: only the owl can see them.
    if (skill(s) === 'eyes') {
      for (const gd of MAP.golden) {
        if (s.golden.includes(gd.id)) continue;
        const img = this.add.image(gd.x, gd.y, 'prop_sparkle').setScale(3).setDepth(gd.y);
        this.tweens.add({ targets: img, alpha: 0.4, scale: 3.6, duration: 600, yoyo: true, repeat: -1 });
        this.gold.set(gd.id, img);
      }
    }
    // The grumpy gorilla at the far end.
    if (!s.gorillaCalm) {
      this.boss = this.add.image(MAP.boss.x, MAP.boss.y, 'boss_gorilla').setScale(3.4).setFlipX(true).setDepth(MAP.boss.y);
      this.tweens.add({ targets: this.boss, scaleY: 3.55, duration: 700, yoyo: true, repeat: -1 });
      this.label(MAP.boss.x, MAP.boss.y - 80, tx(GORILLA.name));
    }
  }

  private label(x: number, y: number, s: string) {
    return this.add.text(x, y, s, { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', stroke: '#1a3a10', strokeThickness: 4 }).setOrigin(0.5).setDepth(4000);
  }

  private refresh() {
    this.bar?.destroy();
    this.bar = topBar(this, this.s, () => this.refresh());
  }

  private addPup() {
    const x = (this.hero?.x ?? MAP.start.x) - 30 - this.pups.length * 14;
    const y = (this.hero?.y ?? MAP.start.y) + 14;
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
    const speed = (fast ? 0.36 : 0.24) * dt;
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
    this.moveWilds(dt);
    this.checkTouches(t);
    this.followPups();
    this.pointPaw();
  }

  /** Move, sliding along trees and rocks instead of stopping dead. */
  private step(dx: number, dy: number) {
    const left = new Set([...this.rocks.keys()]);
    const p = { x: this.hero.x + dx, y: this.hero.y + dy };
    if (!blocked(MAP, p, HERO_R, left)) this.hero.setPosition(p.x, p.y);
    else if (!blocked(MAP, { x: p.x, y: this.hero.y }, HERO_R, left)) this.hero.x = p.x;
    else if (!blocked(MAP, { x: this.hero.x, y: p.y }, HERO_R, left)) this.hero.y = p.y;
    else this.target = null;
    if (dx) this.hero.setFlipX(dx < 0);
    this.hero.setDepth(this.hero.y);
    jungleState.pos = { x: this.hero.x, y: this.hero.y };
    this.trail.unshift({ x: this.hero.x, y: this.hero.y });
    if (this.trail.length > 80) this.trail.pop();
    // Back to the village on the path to the left.
    if (this.hero.x < 26 && Math.abs(this.hero.y - MAP.start.y) < 60) this.home();
  }

  private followPups() {
    this.pups.forEach((p, i) => {
      const spot = this.trail[Math.min(this.trail.length - 1, 12 + i * 10)];
      if (spot) p.setPosition(spot.x, spot.y + 10).setDepth(spot.y);
    });
  }

  private moveWilds(dt: number) {
    for (const w of jungleState.wilds) {
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
        if (blocked(MAP, { x: nx, y: ny }, 14, new Set(this.rocks.keys()))) w.to = { x: w.x, y: w.y };
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
    const st = jungleState;
    const due = st.back.filter(([, at]) => at <= now);
    st.back = st.back.filter(([, at]) => at > now);
    for (const [i] of due) if (i >= 0) st.wilds.push(newWild(i));
  }

  /** Touching things: wild animals start a battle; burrows, gold and the stump. */
  private checkTouches(t: number) {
    const hx = this.hero.x;
    const hy = this.hero.y;
    const near = (p: Pt, r: number) => Math.hypot(p.x - hx, p.y - hy) < r;
    if (t > this.graceUntil) {
      const w = jungleState.wilds.find((x) => near(x, 46));
      if (w) return this.battle(w);
      if (this.boss && near(MAP.boss, 90)) return this.bossTalk();
    }
    // Mouse burrows lead in and out of the secret glade.
    const b = MAP.burrows;
    for (const [from, to] of [[b.outside, b.inside], [b.inside, b.outside]] as [Pt, Pt][]) {
      if (!near(from, 26)) continue;
      if (skill(this.s) === 'squeeze') {
        sfx('click');
        this.hero.setPosition(to.x, to.y + (to === b.inside ? -40 : 40));
        this.trail = [];
        say(this, tr('Squeeze! You slip through the burrow.'), '#ffe9a0');
      } else this.hintOnce('burrow', tr('This burrow is too small. Only a mouse could squeeze through!'));
    }
    if (this.stump && near(MAP.stump, 50)) {
      this.stump.destroy();
      this.stump = undefined;
      this.s.stumps.push(MAP.stump.id);
      this.s.acorns += 25;
      addFood(this.s, 'banana', 2);
      saveAnimals(this.s);
      sfx('chest');
      say(this, tr('A secret stump! 25 acorns and 2 bananas!'), '#ffd24a');
      this.refresh();
    }
    for (const [id, img] of this.gold) {
      const gd = MAP.golden.find((g) => g.id === id)!;
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
  }

  private hintOnce(key: string, msg: string) {
    if (this.hinted.has(key)) return;
    this.hinted.add(key);
    say(this, msg, '#ffe9a0');
    this.time.delayedCall(4000, () => this.hinted.delete(key));
  }

  // ---------------------------------------------------------------- things to do
  /** Cats climb fruit trees for apples (once a minute per tree). */
  private climb(id: string) {
    if (skill(this.s) !== 'climb') {
      say(this, tr('The apples are way up high. A cat could climb up there!'), '#ffe9a0');
      return;
    }
    const at = jungleState.fruitAt[id] ?? 0;
    if (Date.now() < at) {
      say(this, tr('No ripe apples yet. Come back soon!'), '#ffe9a0');
      return;
    }
    jungleState.fruitAt[id] = Date.now() + 60000;
    addFood(this.s, 'apple');
    saveAnimals(this.s);
    sfx('coin');
    say(this, tr('You climb up and pick an apple!'), C.good);
    this.refresh();
  }

  /** A rock: answer a question to push it. Wrong answers crack it; one more question breaks it. */
  private rock(id: string) {
    const r = MAP.rocks.find((k) => k.id === id)!;
    const img = this.rocks.get(id);
    if (!img || this.busy) return;
    this.busy = true;
    const strong = skill(this.s) === 'push';
    const breakIt = () => {
      const peek = img.getData('peek') as Phaser.GameObjects.Image | undefined;
      peek?.destroy();
      img.destroy();
      this.rocks.delete(id);
      this.s.rescued.push(id);
      this.cameras.main.shake(200, 0.01);
      sfx('chest');
      const em = this.add.particles(r.x, r.y, 'dot', { speed: { min: 60, max: 220 }, lifespan: 600, scale: { start: 1.6, end: 0 }, tint: [0x9a948c, 0x6e6862], emitting: false }).setDepth(r.y + 20);
      em.explode(26);
      if (r.puppy) {
        jungleState.following++;
        this.addPup();
        say(this, tr('You found a puppy! It will follow you home.'), C.good);
      } else {
        this.s.acorns += 8;
        say(this, tr('No puppy here, but you found 8 acorns!'), '#ffd24a');
      }
      saveAnimals(this.s);
      this.refresh();
      this.busy = false;
    };
    ask(this, this.s, tr('Push the rock!'), {
      right: tr('Answer: {answer}. The rock rolls away!'),
      wrong: strong ? tr('You said: {given}\nRight answer: {answer}\n(Your elephant strength pushes it anyway!)') : tr('You said: {given}\nRight answer: {answer}\n(The rock cracks! One more question.)'),
      go: tr('Push!'),
    }, (correct) => {
      if (correct || strong) return breakIt();
      img.setTexture('prop_rock_cracked');
      ask(this, this.s, tr('The rock is cracked!'), {
        right: tr('Answer: {answer}. Crack! The rock breaks!'),
        wrong: tr('You said: {given}\nRight answer: {answer}\n(Good try! The cracked rock breaks anyway!)'),
        go: tr('Push!'),
      }, () => breakIt());
    });
  }

  private battle(w: Wild) {
    this.busy = true;
    jungleState.pos = { x: this.hero.x, y: this.hero.y };
    jungleState.wilds.forEach((x) => (x.img = undefined));
    sfx('encounter');
    this.cameras.main.flash(200, 255, 255, 255);
    this.time.delayedCall(250, () => this.scene.start('AnimalBattle', { foe: w.def.id, level: w.level, wild: w.uid }));
  }

  private bossTalk() {
    this.busy = true;
    const s = this.s;
    const backAway = { label: tr('Back away'), color: 0x3a3450, fn: () => {
      this.busy = false;
      this.graceUntil = this.time.now + 3000;
      this.hero.x -= 120;
    } };
    // No fighting the boss by surprise: Mayor Beaver gives that quest when you are ready.
    if (s.quests.gorilla !== 'active') {
      dialog(this, 'boss_gorilla', tx(GORILLA.name), `${tr('GRRR! This is MY jungle! Nobody gets past me!')}\n${tr('(This gorilla is too grumpy for now. Talk to Mayor Beaver in the village first.)')}`, [backAway]);
      return;
    }
    const lv = quest('gorilla').boss!.level;
    const warn = s.level < lv ? `\n${tr('He is very strong. Suggested level: {lv}. You are level {n}.', { lv, n: s.level })}` : '';
    dialog(this, 'boss_gorilla', tx(GORILLA.name), tr('GRRR! This is MY jungle! Nobody gets past me!') + warn, [
      backAway,
      { label: tr('Calm him down!'), color: 0xb02a4a, fn: () => {
        jungleState.pos = { x: this.hero.x - 100, y: this.hero.y };
        jungleState.wilds.forEach((x) => (x.img = undefined));
        this.scene.start('AnimalBattle', { foe: 'gorilla', level: 3 });
      } },
    ]);
  }

  /** The dog's nose: a paw arrow toward what the quests need. */
  private pointPaw() {
    if (!this.paw) return;
    const s = this.s;
    let goal: Pt | undefined;
    const rocks = MAP.rocks.filter((r) => r.puppy && this.rocks.has(r.id));
    if (s.quests.puppies !== 'done' && rocks.length) goal = rocks.reduce((a, b) => (Phaser.Math.Distance.Between(this.hero.x, this.hero.y, a.x, a.y) < Phaser.Math.Distance.Between(this.hero.x, this.hero.y, b.x, b.y) ? a : b));
    // All found: lead the puppies home to the village.
    else if (this.pups.length || canTurnIn(s, 'puppies')) goal = { x: 0, y: MAP.start.y };
    // The boss only once Mayor Beaver has asked for help.
    else if (s.quests.gorilla === 'active' && !s.gorillaCalm) goal = MAP.boss;
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
    jungleState.following = 0;
    jungleState.fresh = true;
    saveAnimals(this.s);
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start('AnimalVillage', { from: 'jungle' }));
  }
}
