import Phaser from 'phaser';
import type { Fx, PowerDef, SkillDef } from '../data/classes';
import { BOSS, makeEnemy, xpFor, type EnemyInstance } from '../data/enemies';
import { ICON, makeItem, RARITY, STAT_LABEL, type Item } from '../data/items';
import { QuestionEngine } from '../questions/engine';
import { BAG_SIZE, classOf, current, derive, gainXp, LEVEL_CAP, saveProfile } from '../state/profile';
import { LAIR } from '../state/world';
import { QuestionPanel } from '../ui/QuestionPanel';
import { playMusic, sfx, stopMusic, type Sfx } from '../audio/audio';
import { Bar, C, H, W, button, panel, txt } from '../ui/widgets';
import { chance, rf, ri } from '../util/rng';

interface BattleData {
  monsterId?: number;
  group?: EnemyInstance[];
  boss?: boolean;
}

interface Foe {
  e: EnemyInstance;
  sprite: Phaser.GameObjects.Image;
  bar: Bar;
  name: Phaser.GameObjects.Text;
  home: { x: number; y: number };
}

const FX_COLOR: Record<Fx, number> = {
  slash: 0xffffff, fire: 0xff7a2a, frost: 0x8fd8ff, arcane: 0xd07aff, arrow: 0xe8d8a0,
  holy: 0xffe680, shadow: 0x9a4aff, nature: 0x7ad04a, fel: 0x6aff4a, heal: 0x7dff9a,
};

const BOSS_QUESTIONS = 5;
const BOSS_NEEDED = 4;

export class BattleScene extends Phaser.Scene {
  private data0!: BattleData;
  private foes: Foe[] = [];
  private hero!: Phaser.GameObjects.Image;
  private heroHome = { x: 770, y: 290 };
  private heroHp!: Bar;
  private heroMp!: Bar;
  private menu?: Phaser.GameObjects.Container;
  private log!: Phaser.GameObjects.Text;
  private engine!: QuestionEngine;
  private minion?: { sprite: Phaser.GameObjects.Image; turns: number; power: number };
  private isBoss = false;
  private bossAsked = 0;
  private bossRight = 0;
  private bossUnit = 0;
  private pips: Phaser.GameObjects.Arc[] = [];
  private earnedXp = 0;
  private earnedGold = 0;
  private lowLevelXp = false;
  private powerStars: Phaser.GameObjects.Star[] = [];
  private powerLabel?: Phaser.GameObjects.Text;
  private questionsRight = 0;
  private questionsAsked = 0;

  constructor() {
    super('Battle');
  }

  create(data: BattleData) {
    this.data0 = data;
    this.foes = [];
    this.pips = [];
    this.minion = undefined;
    this.menu = undefined;
    this.isBoss = !!data.boss;
    this.bossAsked = 0;
    this.bossRight = 0;
    this.earnedXp = 0;
    this.earnedGold = 0;
    this.lowLevelXp = false;
    this.questionsRight = 0;
    this.questionsAsked = 0;

    const p = current();
    this.engine = new QuestionEngine(p.learning, p.settings);
    this.drawBackground();
    playMusic(this.isBoss ? 'boss' : 'battle');
    if (this.isBoss) this.time.delayedCall(300, () => sfx('roar'));

    const cls = classOf(p);
    this.hero = this.add.image(this.heroHome.x, this.heroHome.y, cls.sprite).setScale(6).setFlipX(true).setDepth(10);
    this.tweens.add({ targets: this.hero, y: this.heroHome.y - 5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.ellipse(this.heroHome.x, this.heroHome.y + 48, 70, 16, 0x000000, 0.35).setDepth(1);

    panel(this, W - 300, H - 128, 290, 118, 0x1d1730, cls.color);
    txt(this, W - 284, H - 120, `${p.name}  Lv ${p.level}`, 19);
    this.heroHp = new Bar(this, W - 284, H - 90, 258, 20, C.hp);
    this.heroMp = new Bar(this, W - 284, H - 62, 258, 16, C.mp);
    const s = derive(p);
    this.heroHp.set(p.hp, s.maxHp, false);
    this.heroMp.set(p.mp, s.maxMp, false);
    this.heroHp.setDepth(5);
    this.heroMp.setDepth(5);

    // Power meter: 3 right answers in a row charges the class power attack.
    this.powerStars = [];
    this.powerLabel = txt(this, W - 284, H - 156, 'POWER', 15, '#ffe9a0').setDepth(6);
    for (let i = 0; i < 3; i++) {
      this.powerStars.push(this.add.star(W - 110 + i * 34, H - 147, 5, 6, 13, 0x3a2f50).setStrokeStyle(2, 0xffd24a).setDepth(6));
    }
    this.refreshPower();

    this.log = txt(this, W / 2, 16, '', 20, '#ffe9a0', { align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5, 0).setDepth(50);

    if (this.isBoss) this.setupBoss();
    else this.setupFoes(data.group ?? [makeEnemy('slime', 1)]);

    this.cameras.main.fadeIn(300);
    this.time.delayedCall(500, () => this.playerTurn());
  }

  // ------------------------------------------------------------ setup

  private drawBackground() {
    this.cameras.main.setBackgroundColor(0x120e1c);
    const g = this.add.graphics().setDepth(0);
    // Back wall
    for (let x = 0; x < W; x += 48) {
      for (let y = 0; y < 230; y += 48) {
        this.add.image(x, y, 'tile_wall_top').setOrigin(0).setScale(3).setTint(0x8a80a0).setAlpha(0.9);
      }
      this.add.image(x, 230, 'tile_wall').setOrigin(0).setScale(3).setTint(0xa098b8);
    }
    // Floor
    for (let x = 0; x < W; x += 48) {
      for (let y = 278; y < H; y += 48) {
        this.add.image(x, y, (x + y) % 5 === 0 ? 'tile_floor_moss' : 'tile_floor').setOrigin(0).setScale(3);
      }
    }
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0).fillRect(0, 0, W, 120);
    // Torches
    for (const tx of [150, 480, 810]) {
      this.add.image(tx, 250, 'tile_torch').setScale(3);
      const glow = this.add.image(tx, 250, 'glow').setScale(12).setTint(0xffa040).setAlpha(0.3).setBlendMode('ADD');
      this.tweens.add({ targets: glow, alpha: 0.45, duration: 450, yoyo: true, repeat: -1 });
    }
  }

  private setupFoes(group: EnemyInstance[]) {
    const ys = group.length === 1 ? [300] : group.length === 2 ? [250, 370] : [200, 310, 420];
    const xs = group.length === 3 ? [250, 170, 250] : [220, 220];
    group.forEach((e, i) => {
      e.hp = e.maxHp;
      e.stunned = false;
      const x = xs[i] ?? 220;
      const y = ys[i];
      this.add.ellipse(x, y + 40, 64, 14, 0x000000, 0.35).setDepth(1);
      const sprite = this.add.image(x, y, e.def.sprite).setScale(5).setDepth(10 + i);
      this.tweens.add({ targets: sprite, scaleY: 5 * 0.93, scaleX: 5 * 1.04, duration: 450 + i * 70, yoyo: true, repeat: -1 });
      const name = txt(this, x, y - 66, `${e.def.name} Lv${e.level}`, 15).setOrigin(0.5).setDepth(20);
      const bar = new Bar(this, x - 55, y - 54, 110, 10, C.hp, false).setDepth(20);
      bar.set(e.hp, e.maxHp, false);
      const foe: Foe = { e, sprite, bar, name, home: { x, y } };
      sprite.setInteractive({ useHandCursor: true });
      this.foes.push(foe);
    });
  }

  private setupBoss() {
    const p = current();
    const s = derive(p);
    // The boss's health is exactly 4.5 full hits: 4 right + 1 wrong (half) is
    // just enough, 3 right is not. That makes "80% to win" happen naturally.
    this.bossUnit = Math.max(2, Math.round(s.power / 2) * 2);
    const e = makeEnemy('goblin', BOSS.level);
    e.def = { ...e.def, id: BOSS.id, name: BOSS.name, sprite: BOSS.sprite, verb: 'smashes' };
    e.maxHp = (this.bossUnit * 9) / 2;
    e.hp = e.maxHp;
    e.xp = 220;
    e.gold = ri(50, 90);
    const x = 230;
    const y = 280;
    this.add.ellipse(x, y + 90, 150, 26, 0x000000, 0.4).setDepth(1);
    const sprite = this.add.image(x, y, BOSS.sprite).setScale(6).setDepth(10);
    this.tweens.add({ targets: sprite, scaleY: 6 * 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const name = txt(this, x, y - 120, BOSS.name, 20, '#ffb36b').setOrigin(0.5).setDepth(20);
    const bar = new Bar(this, x - 120, y - 104, 240, 16, C.hp).setDepth(20);
    bar.set(e.hp, e.maxHp, false);
    this.foes.push({ e, sprite, bar, name, home: { x, y } });

    // Question tracker: 5 pips, need 4 green.
    txt(this, W / 2, 62, `Get ${BOSS_NEEDED} of ${BOSS_QUESTIONS} right to win!`, 18, C.dim).setOrigin(0.5);
    for (let i = 0; i < BOSS_QUESTIONS; i++) {
      this.pips.push(this.add.circle(W / 2 - 80 + i * 40, 98, 13, 0x3a2f50).setStrokeStyle(3, 0xffd24a));
    }
  }

  // ------------------------------------------------------------ player turn

  private alive(): Foe[] {
    return this.foes.filter((f) => f.e.hp > 0);
  }

  private playerTurn() {
    const p = current();
    const cls = classOf(p);
    this.say(this.isBoss ? `Question ${this.bossAsked + 1} of ${BOSS_QUESTIONS}` : 'Your turn! Pick an action.');
    const c = this.add.container(0, 0).setDepth(100);
    this.menu = c;
    c.add(panel(this, 10, H - 128, W - 320, 118, 0x1d1730));

    const skills = this.isBoss ? [cls.skills[0]] : cls.skills.filter((s) => s.unlock <= p.level);
    const bw = 150;
    const bh = 48;
    skills.forEach((sk, i) => {
      const x = 30 + bw / 2 + (i % 3) * (bw + 10);
      const y = H - 98 + Math.floor(i / 3) * (bh + 8);
      const label = sk.mp ? `${sk.name}\n${sk.mp} MP` : sk.name;
      const b = button(this, x, y, bw, bh, label, () => this.chooseSkill(sk), { size: sk.mp ? 15 : 19, color: 0x4b3a78 });
      if (sk.mp > p.mp) b.setEnabled(false);
      c.add(b);
    });
    // Charged power attack!
    if ((p.streak ?? 0) >= 3) {
      if (this.isBoss) {
        c.add(txt(this, 320, H - 150, 'Your power is saved for after the boss!', 15, '#ffe9a0').setOrigin(0.5));
      } else {
        const pb = button(this, 320, H - 152, 360, 46, `\u2605 ${cls.power.name}! \u2605`, () => this.chooseSkill(this.powerSkill()), { size: 22, color: 0xb07a10 });
        c.add(pb);
        this.tweens.add({ targets: pb, scale: 1.06, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    }
    // Locked skill hints so kids know what's coming.
    const nextLocked = cls.skills.find((s) => s.unlock > p.level);
    if (nextLocked && !this.isBoss) {
      c.add(txt(this, 30, H - 40, `New skill at level ${nextLocked.unlock}: ${nextLocked.name}`, 14, C.dim));
    }
    if (!this.isBoss) {
      c.add(button(this, 530, H - 98, 110, bh, `Potion (${p.potions.hp})`, () => this.usePotion(), { size: 16, color: 0x8a2a3a }).setEnabled(p.potions.hp > 0));
      c.add(button(this, 530, H - 44, 110, 40, 'Run', () => this.run(), { size: 17, color: 0x3a3450 }));
      if (p.potions.mp > 0) c.add(button(this, 410, H - 44, 110, 40, `Mana (${p.potions.mp})`, () => this.useManaPotion(), { size: 15, color: 0x2a4a8a }));
    }
  }

  private closeMenu() {
    this.menu?.destroy();
    this.menu = undefined;
  }

  private chooseSkill(sk: SkillDef) {
    const targets = this.alive();
    const needsTarget = (sk.kind === 'damage' || sk.kind === 'stun' || sk.kind === 'drain') && targets.length > 1;
    if (!needsTarget) {
      this.closeMenu();
      this.ask(sk, targets[0]);
      return;
    }
    this.closeMenu();
    this.say(`${sk.name}: tap a monster to target it!`);
    const arrows: Phaser.GameObjects.Text[] = [];
    const cleanup = () => {
      arrows.forEach((a) => a.destroy());
      targets.forEach((f) => f.sprite.off('pointerup'));
      back.destroy();
    };
    for (const f of targets) {
      const a = txt(this, f.sprite.x + 60, f.sprite.y - 10, '<', 40, '#ffd24a').setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: a, x: a.x + 10, duration: 300, yoyo: true, repeat: -1 });
      arrows.push(a);
      f.sprite.once('pointerup', () => {
        cleanup();
        this.ask(sk, f);
      });
    }
    const back = button(this, 120, H - 60, 160, 50, 'Back', () => {
      cleanup();
      this.playerTurn();
    }, { color: 0x3a3450 });
  }

  private ask(sk: SkillDef, target: Foe) {
    const p = current();
    const q = this.engine.next();
    new QuestionPanel(this, q, {
      header: this.isBoss ? `BOSS question ${this.bossAsked + 1} of ${BOSS_QUESTIONS}` : sk.name,
      readAloud: p.settings.readAloud,
      done: (correct) => {
        this.engine.record(q, correct);
        this.updateStreak(sk, correct);
        this.questionsAsked++;
        if (correct) this.questionsRight++;
        saveProfile(p);
        if (this.isBoss) {
          this.pips[this.bossAsked].setFillStyle(correct ? 0x3ed34a : 0xe0404a);
          this.bossAsked++;
          if (correct) this.bossRight++;
        }
        p.mp -= sk.mp;
        this.heroMp.set(p.mp, derive(p).maxMp);
        this.perform(sk, target, correct);
      },
    });
  }

  // ------------------------------------------------------------ power attack

  private powerSkill(): SkillDef {
    const cls = classOf(current());
    return { id: 'power', name: `\u2605 ${cls.power.name}`, desc: 'Super attack!', unlock: 1, mp: 0, kind: 'damage', power: 3, fx: cls.skills[0].fx };
  }

  /** 3 right in a row charges the power; using it (right or wrong) spends it. */
  private updateStreak(sk: SkillDef, correct: boolean) {
    const p = current();
    const before = p.streak ?? 0;
    if (sk.id === 'power') p.streak = 0;
    else if (before < 3) p.streak = correct ? before + 1 : 0;
    this.refreshPower();
    if (before < 3 && (p.streak ?? 0) >= 3) {
      this.time.delayedCall(200, () => {
        sfx('ready');
        this.floatText(this.hero.x, this.hero.y - 120, 'POWER READY!', '#ffd24a', 30);
        this.sparkle(this.hero, 0xffd24a, 24);
      });
    }
  }

  private refreshPower() {
    const n = Math.min(3, current().streak ?? 0);
    const color = classOf(current()).power.color;
    this.powerStars.forEach((st, i) => {
      this.tweens.killTweensOf(st);
      st.setScale(1).setFillStyle(i < n ? (n >= 3 ? color : 0xffd24a) : 0x3a2f50);
      if (n >= 3) this.tweens.add({ targets: st, scale: 1.35, angle: 72, duration: 500, yoyo: true, repeat: -1, delay: i * 120 });
    });
    this.powerLabel?.setText(n >= 3 ? 'POWER READY!' : 'POWER').setColor(n >= 3 ? '#ffd24a' : '#ffe9a0');
  }

  /** Cinematic super attack: darken, name banner, charge-up, then a class-specific finisher. */
  private powerAnim(pw: PowerDef, target: Foe, onImpact: () => void) {
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(140);
    this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 300 });
    const banner = txt(this, -300, 120, pw.name.toUpperCase() + '!', 58, pw.css).setOrigin(0.5).setDepth(400);
    banner.setStroke('#120a1c', 10);
    this.tweens.add({ targets: banner, x: W / 2, duration: 380, ease: 'Back.Out' });
    sfx('power');
    this.hero.setDepth(150).setTint(pw.color);
    this.tweens.add({ targets: this.hero, scale: 7.2, duration: 300, yoyo: true, repeat: 1 });
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = this.add.image(this.hero.x + Math.cos(a) * 160, this.hero.y + Math.sin(a) * 160, 'dot').setTint(pw.color).setBlendMode('ADD').setDepth(160);
      this.tweens.add({ targets: d, x: this.hero.x, y: this.hero.y, alpha: 0.2, duration: 600, delay: i * 15, onComplete: () => d.destroy() });
    }
    const impact = () => {
      sfx('boom');
      this.cameras.main.shake(450, 0.03);
      this.cameras.main.flash(250, 255, 255, 255);
      this.burst(target.sprite.x, target.sprite.y, pw.color, 60, 300);
      this.burst(target.sprite.x, target.sprite.y, 0xffffff, 30, 300);
      for (let i = 0; i < 3; i++) {
        const ring = this.add.circle(target.sprite.x, target.sprite.y, 10).setStrokeStyle(6 - i, pw.color).setDepth(300);
        this.tweens.add({ targets: ring, radius: 140 + i * 50, alpha: 0, duration: 500 + i * 150, delay: i * 90, onComplete: () => ring.destroy() });
      }
      this.tweens.add({ targets: [dim, banner], alpha: 0, duration: 500, delay: 500, onComplete: () => { dim.destroy(); banner.destroy(); } });
      this.hero.clearTint().setDepth(10);
      onImpact();
    };
    this.time.delayedCall(950, () => this.powerFinisher(pw, target, impact));
  }

  private powerFinisher(pw: PowerDef, target: Foe, impact: () => void) {
    const tx = target.sprite.x;
    const ty = target.sprite.y;
    const D = 200;
    switch (pw.style) {
      case 'meteor':
      case 'infernal': {
        const col = pw.style === 'meteor' ? 0xff7a2a : 0x5aff4a;
        const rock = this.add.circle(tx + 420, -120, 30, pw.style === 'meteor' ? 0x5a2a10 : 0x1a4a1a).setDepth(D);
        const glow = this.add.image(rock.x, rock.y, 'glow').setScale(9).setTint(col).setBlendMode('ADD').setDepth(D - 1);
        const trail = this.add.particles(0, 0, 'dot', { follow: rock, speed: 60, lifespan: 500, scale: { start: 2, end: 0 }, tint: [col, 0xffe066], blendMode: 'ADD', frequency: 8 }).setDepth(D - 2);
        this.tweens.add({
          targets: [rock, glow],
          x: tx,
          y: ty,
          duration: 650,
          ease: 'Quad.In',
          onComplete: () => {
            rock.destroy();
            glow.destroy();
            trail.stop();
            this.time.delayedCall(500, () => trail.destroy());
            if (pw.style === 'infernal') {
              const pillar = this.add.rectangle(tx, ty, 120, 900, col, 0.5).setOrigin(0.5, 1).setDepth(D).setBlendMode('ADD');
              this.tweens.add({ targets: pillar, scaleX: 0, alpha: 0, duration: 700, onComplete: () => pillar.destroy() });
            }
            impact();
          },
        });
        break;
      }
      case 'arrowstorm': {
        const n = 26;
        let landed = 0;
        for (let i = 0; i < n; i++) {
          const x = tx + Phaser.Math.Between(-80, 80);
          const a = this.add.rectangle(x + 60, -40, 4, 34, 0xe8d8a0).setDepth(D).setRotation(-0.25);
          this.tweens.add({
            targets: a,
            x,
            y: ty + Phaser.Math.Between(-30, 30),
            duration: 260,
            delay: i * 28,
            ease: 'Quad.In',
            onComplete: () => {
              this.burst(a.x, a.y, 0x9aff6a, 4, D);
              a.destroy();
              if (++landed === n) impact();
            },
          });
        }
        break;
      }
      case 'whirlwind': {
        const hx = this.hero.x;
        const hy = this.hero.y;
        this.tweens.add({
          targets: this.hero,
          x: tx + 40,
          y: ty - 190,
          angle: 360,
          duration: 380,
          ease: 'Quad.Out',
          onComplete: () =>
            this.tweens.add({
              targets: this.hero,
              y: ty - 10,
              angle: 1080,
              duration: 240,
              ease: 'Quad.In',
              onComplete: () => {
                for (let i = 0; i < 4; i++) this.time.delayedCall(i * 60, () => this.slash(tx, ty, i % 2 ? 0xffffff : pw.color));
                impact();
                this.tweens.add({ targets: this.hero, x: hx, y: hy, angle: 0, duration: 400, delay: 350 });
              },
            }),
        });
        break;
      }
      case 'hammer': {
        const pillar = this.add.rectangle(tx, ty + 40, 110, 900, 0xffe066, 0).setOrigin(0.5, 1).setDepth(D - 1).setBlendMode('ADD');
        this.tweens.add({ targets: pillar, fillAlpha: 0.45, duration: 250 });
        const hammer = this.add.container(tx, -150).setDepth(D);
        hammer.add(this.add.rectangle(0, -40, 16, 120, 0x8a5a2a).setStrokeStyle(3, 0x3a2410));
        hammer.add(this.add.rectangle(0, 30, 110, 60, 0xffd24a).setStrokeStyle(4, 0x7a5a10));
        hammer.add(this.add.image(0, 30, 'glow').setScale(8).setTint(0xfff0a0).setBlendMode('ADD'));
        this.tweens.add({
          targets: hammer,
          y: ty - 40,
          angle: 15,
          duration: 450,
          delay: 250,
          ease: 'Quad.In',
          onComplete: () => {
            impact();
            this.tweens.add({ targets: [hammer, pillar], alpha: 0, duration: 500, delay: 200, onComplete: () => { hammer.destroy(); pillar.destroy(); } });
          },
        });
        break;
      }
      case 'bones': {
        const bones: Phaser.GameObjects.Image[] = [];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const b = this.add.image(tx + Math.cos(a) * 110, ty + Math.sin(a) * 60 + 20, 'minion_skeleton').setScale(0).setDepth(D).setFlipX(Math.cos(a) > 0);
          bones.push(b);
          this.puff(b.x, b.y, 0xb070ff);
          this.tweens.add({ targets: b, scale: 4, duration: 260, delay: i * 90, ease: 'Back.Out' });
        }
        this.time.delayedCall(5 * 90 + 350, () => {
          this.tweens.add({
            targets: bones,
            x: tx,
            y: ty,
            duration: 200,
            ease: 'Quad.In',
            onComplete: () => {
              impact();
              this.tweens.add({ targets: bones, alpha: 0, scale: 2, duration: 400, onComplete: () => bones.forEach((b) => b.destroy()) });
            },
          });
        });
        break;
      }
      case 'vines': {
        const spikes: Phaser.GameObjects.Triangle[] = [];
        for (let i = 0; i < 9; i++) {
          const x = tx - 100 + i * 25;
          const h = 70 + Math.random() * 60;
          const sp = this.add.triangle(x, ty + 50, 0, h, 12, 0, 24, h, i % 2 ? 0x3a8a2a : 0x6ad04a).setOrigin(0.5, 1).setScale(1, 0).setDepth(D);
          spikes.push(sp);
          this.tweens.add({ targets: sp, scaleY: 1, duration: 160, delay: i * 50, ease: 'Back.Out' });
        }
        this.burst(tx, ty, 0x9aff6a, 30, D);
        this.time.delayedCall(9 * 50 + 220, () => {
          impact();
          this.tweens.add({ targets: spikes, scaleY: 0, alpha: 0, duration: 400, delay: 300, onComplete: () => spikes.forEach((x) => x.destroy()) });
        });
        break;
      }
    }
  }

  // ------------------------------------------------------------ actions

  private calcDamage(sk: SkillDef, foe: Foe, correct: boolean): { dmg: number; crit: boolean } {
    if (this.isBoss) return { dmg: correct ? this.bossUnit : this.bossUnit / 2, crit: false };
    const s = derive(current());
    let dmg = s.power * sk.power * rf(0.9, 1.1);
    const crit = correct && chance(s.crit / 100);
    if (crit) dmg *= 1.5;
    if (!correct) dmg *= 0.5;
    dmg -= foe.e.armor * 0.4;
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }

  private perform(sk: SkillDef, target: Foe, correct: boolean) {
    const p = current();
    const after = () => this.time.delayedCall(350, () => this.afterPlayerAction());
    if (sk.id === 'power') {
      this.powerAnim(classOf(p).power, target, () => {
        const r = this.calcDamage(sk, target, correct);
        this.hit(target, r, correct, sk.fx);
        this.floatText(target.sprite.x, target.sprite.y - 140, correct ? 'x3 POWER!' : 'x1.5 (half power)', correct ? classOf(p).power.css : '#ffb36b', 26);
        this.time.delayedCall(500, after);
      });
      return;
    }
    this.say(`${p.name} uses ${sk.name}!${correct ? '' : ' (half power)'}`);

    switch (sk.kind) {
      case 'heal': {
        const s = derive(p);
        const amt = Math.round(s.maxHp * sk.power * (correct ? 1 : 0.5));
        this.castPose(() => {
          p.hp = Math.min(s.maxHp, p.hp + amt);
          this.heroHp.set(p.hp, s.maxHp);
          this.sparkle(this.hero, FX_COLOR.heal);
          sfx('heal');
          this.floatText(this.hero.x, this.hero.y - 60, `+${amt}`, '#7dff9a', 34);
          after();
        });
        return;
      }
      case 'summon': {
        const cls = classOf(p);
        this.castPose(() => {
          this.summon(cls.summon!.sprite, correct ? 4 : 2, sk.power);
          sfx('summon');
          this.say(`${cls.summon!.name} joins the fight for ${correct ? 4 : 2} turns!`);
          after();
        });
        return;
      }
      case 'aoe': {
        const targets = this.alive();
        this.attackAnim(sk, null, () => {
          targets.forEach((f, i) => this.time.delayedCall(i * 120, () => this.hit(f, this.calcDamage(sk, f, correct), correct, sk.fx)));
          this.time.delayedCall(targets.length * 120 + 200, after);
        });
        return;
      }
      default: {
        this.attackAnim(sk, target, () => {
          const r = this.calcDamage(sk, target, correct);
          this.hit(target, r, correct, sk.fx);
          if (sk.kind === 'stun' && target.e.hp > 0 && correct) {
            target.e.stunned = true;
            this.floatText(target.sprite.x, target.sprite.y - 90, 'STUNNED!', '#ffd24a', 22);
          }
          if (sk.kind === 'drain') {
            const s = derive(p);
            const heal = Math.round(r.dmg * 0.6);
            p.hp = Math.min(s.maxHp, p.hp + heal);
            this.heroHp.set(p.hp, s.maxHp);
            this.projectile(target.sprite, this.hero, 0x7dff9a, () => this.floatText(this.hero.x, this.hero.y - 60, `+${heal}`, '#7dff9a', 30));
          }
          after();
        });
      }
    }
  }

  private afterPlayerAction() {
    if (this.checkWin()) return;
    // Summoned helper attacks a random living foe.
    if (this.minion && this.minion.turns > 0) {
      const m = this.minion;
      const t = Phaser.Utils.Array.GetRandom(this.alive());
      m.turns--;
      const home = { x: m.sprite.x, y: m.sprite.y };
      this.tweens.add({
        targets: m.sprite,
        x: t.sprite.x + 70,
        y: t.sprite.y,
        duration: 220,
        ease: 'Quad.In',
        onComplete: () => {
          const dmg = Math.max(1, Math.round(derive(current()).power * m.power * rf(0.9, 1.1) - t.e.armor * 0.4));
          this.hit(t, { dmg, crit: false }, true, 'slash');
          this.tweens.add({ targets: m.sprite, x: home.x, y: home.y, duration: 260, delay: 120 });
          if (m.turns <= 0) {
            this.time.delayedCall(500, () => {
              this.puff(m.sprite.x, m.sprite.y, 0x9a4aff);
              m.sprite.destroy();
              this.minion = undefined;
            });
          }
          this.time.delayedCall(600, () => (this.checkWin() ? undefined : this.enemyTurn()));
        },
      });
      return;
    }
    this.enemyTurn();
  }

  private enemyTurn() {
    const p = current();
    const foes = this.alive();
    let i = 0;
    const next = () => {
      if (p.hp <= 0) return this.lose();
      if (i >= foes.length) {
        // Small mana regen each round.
        const s = derive(p);
        p.mp = Math.min(s.maxMp, p.mp + 2);
        this.heroMp.set(p.mp, s.maxMp);
        saveProfile(p);
        if (this.isBoss && this.bossAsked >= BOSS_QUESTIONS) return this.bossFail();
        return this.time.delayedCall(250, () => this.playerTurn());
      }
      const f = foes[i++];
      if (f.e.stunned) {
        f.e.stunned = false;
        this.say(`${f.e.def.name} is stunned and can't attack!`);
        return this.time.delayedCall(700, next);
      }
      this.enemyAttack(f, next);
    };
    next();
  }

  private enemyAttack(f: Foe, done: () => void) {
    const p = current();
    const s = derive(p);
    let dmg: number;
    if (this.isBoss) {
      dmg = Math.round(s.maxHp * 0.11 * rf(0.9, 1.1));
    } else {
      const mitigation = s.armor / (s.armor + 40 + f.e.level * 8);
      dmg = Math.max(1, Math.round(f.e.atk * rf(0.85, 1.15) * (1 - mitigation)));
    }
    this.say(`${f.e.def.name} ${f.e.def.verb} you!`);
    this.tweens.add({
      targets: f.sprite,
      x: this.hero.x - (this.isBoss ? 160 : 100),
      y: this.heroHome.y,
      duration: 220,
      ease: 'Quad.In',
      onComplete: () => {
        p.hp = Math.max(this.isBoss ? 1 : 0, p.hp - dmg);
        this.heroHp.set(p.hp, s.maxHp);
        this.flash(this.hero, 0xff4040);
        sfx('hurt');
        this.cameras.main.shake(140, 0.008);
        this.floatText(this.hero.x, this.hero.y - 60, `-${dmg}`, '#ff6b6b', 30);
        this.burst(this.hero.x - 10, this.hero.y, 0xff6060, 10);
        this.tweens.add({ targets: f.sprite, x: f.home.x, y: f.home.y, duration: 300, delay: 100, onComplete: () => this.time.delayedCall(200, done) });
      },
    });
  }

  private usePotion() {
    const p = current();
    const s = derive(p);
    if (p.potions.hp <= 0) return;
    this.closeMenu();
    p.potions.hp--;
    sfx('potion');
    const amt = Math.round(s.maxHp * 0.5);
    p.hp = Math.min(s.maxHp, p.hp + amt);
    this.heroHp.set(p.hp, s.maxHp);
    this.sparkle(this.hero, 0xff6b6b);
    this.floatText(this.hero.x, this.hero.y - 60, `+${amt}`, '#7dff9a', 32);
    this.say('You drink a health potion.');
    this.time.delayedCall(700, () => this.enemyTurn());
  }

  private useManaPotion() {
    const p = current();
    const s = derive(p);
    if (p.potions.mp <= 0) return;
    this.closeMenu();
    p.potions.mp--;
    sfx('potion');
    p.mp = s.maxMp;
    this.heroMp.set(p.mp, s.maxMp);
    this.sparkle(this.hero, 0x5a9aff);
    this.say('You drink a mana potion. MP full!');
    this.time.delayedCall(700, () => this.enemyTurn());
  }

  private run() {
    this.closeMenu();
    this.say('You ran away safely!');
    this.tweens.add({ targets: this.hero, x: W + 100, duration: 500, ease: 'Quad.In' });
    this.time.delayedCall(700, () => this.exit('fled'));
  }

  // ------------------------------------------------------------ outcomes

  private checkWin(): boolean {
    if (this.alive().length > 0) return false;
    this.win();
    return true;
  }

  private win() {
    stopMusic();
    this.time.delayedCall(250, () => sfx('victory'));
    const p = current();
    const cls = classOf(p);
    const loot: Item[] = [];
    for (const f of this.foes) {
      this.earnedXp += this.isBoss ? f.e.xp : xpFor(f.e, p.level);
      if (!this.isBoss && f.e.level < p.level - 1) this.lowLevelXp = true;
      this.earnedGold += f.e.gold;
      if (!this.isBoss && chance(0.35)) loot.push(makeItem(Math.min(10, f.e.level), { cls }));
    }
    if (this.isBoss) {
      loot.push(makeItem(10, { cls, boss: true }), makeItem(10, { cls, boss: true }));
      p.bossKills++;
      if (chance(0.5)) p.potions.hp++;
    }
    // Bonus XP for a perfect battle.
    const perfect = this.questionsAsked > 0 && this.questionsRight === this.questionsAsked;
    if (perfect) this.earnedXp = Math.round(this.earnedXp * 1.25);
    const kept: Item[] = [];
    for (const it of loot) {
      if (p.bag.length < BAG_SIZE) {
        p.bag.push(it);
        kept.push(it);
      }
    }
    p.gold += this.earnedGold;
    const before = derive(p);
    const fromLevel = p.level;
    const levels = gainXp(p, this.earnedXp);
    saveProfile(p);
    const showVictory = () => this.victoryPanel(kept, loot.length - kept.length, levels, perfect);
    if (levels > 0) this.time.delayedCall(600, () => this.levelUpCelebration(fromLevel, before, showVictory));
    else this.time.delayedCall(500, showVictory);
  }

  /** Big, sparkly level-up screen showing exactly which stats went up. */
  private levelUpCelebration(fromLevel: number, before: ReturnType<typeof derive>, onDone: () => void) {
    sfx('levelup');
    const p = current();
    const cls = classOf(p);
    const after = derive(p);
    const c = this.add.container(0, 0).setDepth(5000);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.78).setOrigin(0).setInteractive());

    // Rotating golden light rays behind everything.
    const rays = this.add.graphics({ x: W / 2, y: 150 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      rays.fillStyle(i % 2 ? 0xffd24a : 0xfff0a0, 0.13);
      rays.fillTriangle(0, 0, Math.cos(a - 0.09) * 700, Math.sin(a - 0.09) * 700, Math.cos(a + 0.09) * 700, Math.sin(a + 0.09) * 700);
    }
    c.add(rays);
    this.tweens.add({ targets: rays, angle: 360, duration: 14000, repeat: -1 });

    // Stars bursting out from the title, then a gentle shower of falling stars.
    const starColors = [0xffd24a, 0xffffff, 0x7dff9a, 0x7fd3ff, 0xff9af0];
    const star = (x: number, y: number, size: number) =>
      this.add.star(x, y, 5, size * 0.45, size, Phaser.Utils.Array.GetRandom(starColors)).setStrokeStyle(2, 0x5a2a00, 0.6);
    for (let i = 0; i < 36; i++) {
      const s = star(W / 2, 150, ri(8, 18));
      c.add(s);
      const a = Math.random() * Math.PI * 2;
      const d = ri(180, 520);
      this.tweens.add({
        targets: s,
        x: W / 2 + Math.cos(a) * d,
        y: 150 + Math.sin(a) * d,
        angle: ri(-360, 360),
        alpha: 0,
        scale: 0.3,
        duration: ri(900, 1600),
        ease: 'Cubic.Out',
      });
    }
    this.time.addEvent({
      delay: 140,
      repeat: 40,
      callback: () => {
        const s = star(ri(0, W), -20, ri(6, 12));
        c.add(s);
        this.tweens.add({ targets: s, y: H + 30, angle: ri(180, 540), duration: ri(2200, 3400), onComplete: () => s.destroy() });
      },
    });
    this.cameras.main.flash(300, 255, 230, 120);

    const title = txt(this, W / 2, 150, 'LEVEL UP!', 84, '#ffd24a').setOrigin(0.5);
    title.setStroke('#7a3a00', 12);
    c.add(title);
    this.tweens.add({ targets: title, scale: { from: 0.2, to: 1 }, duration: 600, ease: 'Elastic.Out' });
    this.tweens.add({ targets: title, scale: 1.08, duration: 700, yoyo: true, repeat: -1, delay: 700, ease: 'Sine.InOut' });
    c.add(txt(this, W / 2, 222, `Level ${fromLevel}  ->  Level ${p.level}`, 28, '#ffffff').setOrigin(0.5));

    const hero = this.add.image(170, 360, cls.sprite).setScale(9);
    c.add(hero);
    this.tweens.add({ targets: hero, y: 340, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.Out' });

    // Stat gains pop in one at a time.
    const gains: [string, number, string][] = [
      ['Health', after.maxHp - before.maxHp, ''],
      ['Mana', after.maxMp - before.maxMp, ''],
      [STAT_LABEL.str, after.str - before.str, ''],
      [STAT_LABEL.int, after.int - before.int, ''],
      [STAT_LABEL.agi, after.agi - before.agi, ''],
      [STAT_LABEL.sta, after.sta - before.sta, ''],
      ['Crit chance', after.crit - before.crit, '%'],
    ];
    const mainLabel = STAT_LABEL[cls.primary];
    // Main stat gets its own big row first, the rest go in two columns below.
    const shown = gains.filter(([, v]) => v > 0).sort((a, b) => Number(b[0] === mainLabel) - Number(a[0] === mainLabel));
    shown.forEach(([label, v, unit], i) => {
      const main = label === mainLabel;
      const j = i - 1;
      const x = main ? 330 : 330 + (j % 2) * 290;
      const y = main ? 268 : 316 + Math.floor(j / 2) * 40;
      const t = txt(this, x, y, `+${v}${unit} ${label}${main ? '   (your main stat!)' : ''}`, main ? 28 : 22, main ? '#ffd24a' : '#7dff9a').setAlpha(0);
      c.add(t);
      this.tweens.add({ targets: t, alpha: 1, x: { from: x - 30, to: x }, scale: { from: 1.5, to: 1 }, duration: 300, delay: 700 + i * 220, ease: 'Back.Out' });
      this.time.delayedCall(700 + i * 220, () => this.burst(x + 10, y + 14, main ? 0xffd24a : 0x7dff9a, 10, 5100));
    });

    const unlocked = cls.skills.find((sk) => sk.unlock > fromLevel && sk.unlock <= p.level);
    const after1 = 700 + shown.length * 220 + 200;
    if (unlocked) {
      const t = txt(this, W / 2 + 40, 478, `NEW SKILL: ${unlocked.name}!`, 28, '#ff9af0').setOrigin(0.5).setAlpha(0);
      c.add(t);
      this.tweens.add({ targets: t, alpha: 1, scale: { from: 2, to: 1 }, duration: 400, delay: after1, ease: 'Back.Out' });
    }
    const go = button(this, W - 120, H - 50, 190, 56, 'Awesome!', () => {
      c.destroy();
      onDone();
    }, { color: 0x2f9a4a, size: 24 });
    go.setAlpha(0).disableInteractive();
    c.add(go);
    this.time.delayedCall(after1 + 300, () => {
      go.setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: go, alpha: 1, duration: 250 });
    });
  }

  private victoryPanel(loot: Item[], dropped: number, levels: number, perfect: boolean) {
    const p = current();
    this.say('');
    const c = this.add.container(0, 0).setDepth(4000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 150, 50, W - 300, H - 100, 0x1d1730, 0xffd24a));
    const title = txt(this, W / 2, 90, this.isBoss ? 'BOSS DEFEATED!' : 'VICTORY!', 46, '#ffd24a').setOrigin(0.5);
    c.add(title);
    this.tweens.add({ targets: title, scale: { from: 0.4, to: 1 }, duration: 400, ease: 'Back.Out' });
    let y = 140;
    c.add(txt(this, W / 2, y, `Questions: ${this.questionsRight} / ${this.questionsAsked} right${perfect ? '  -  PERFECT! +25% XP' : ''}`, 20, perfect ? C.good : C.text).setOrigin(0.5));
    y += 34;
    c.add(txt(this, W / 2, y, p.level >= LEVEL_CAP && levels === 0 ? `+${this.earnedGold} gold (max level!)` : `+${this.earnedXp} XP    +${this.earnedGold} gold`, 22).setOrigin(0.5));
    if (this.lowLevelXp && p.level < LEVEL_CAP) {
      y += 26;
      c.add(txt(this, W / 2, y, 'Easy monsters give less XP. Try a deeper floor!', 16, '#ffb36b').setOrigin(0.5));
    }
    y += 40;
    if (levels > 0) {
      const lv = txt(this, W / 2, y, `LEVEL UP! You are now level ${p.level}!`, 28, '#7dff9a').setOrigin(0.5);
      c.add(lv);
      this.tweens.add({ targets: lv, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });
      this.burst(this.hero.x, this.hero.y, 0xffd24a, 40);
      const unlocked = classOf(p).skills.find((s) => s.unlock === p.level);
      if (unlocked) {
        y += 34;
        c.add(txt(this, W / 2, y, `New skill: ${unlocked.name} - ${unlocked.desc}`, 18, '#ffe9a0').setOrigin(0.5));
      }
      y += 40;
    }
    if (loot.length) {
      c.add(txt(this, W / 2, y, 'Loot:', 20, C.dim).setOrigin(0.5));
      y += 30;
      loot.forEach((it, i) => {
        const r = RARITY[it.rarity];
        const iy = y + i * 46;
        const g = this.add.graphics();
        g.fillStyle(0x0f0b1a, 1).fillRoundedRect(W / 2 - 220, iy, 40, 40, 6);
        g.lineStyle(3, r.color, 1).strokeRoundedRect(W / 2 - 220, iy, 40, 40, 6);
        c.add(g);
        c.add(this.add.image(W / 2 - 200, iy + 20, ICON[it.base]).setScale(2));
        c.add(txt(this, W / 2 - 168, iy + 8, `${it.name}  (${r.name})`, 19, r.css));
        if (r.rank >= 3) this.burst(W / 2 - 200, iy + 20, r.color, 20, 4100);
      });
      y += loot.length * 46;
    }
    if (dropped) c.add(txt(this, W / 2, y + 4, `Your bag was full! ${dropped} item(s) left behind.`, 16, C.bad).setOrigin(0.5));
    if (this.isBoss) c.add(txt(this, W / 2, H - 140, 'Grukk will be back on his throne... fight him again for more loot!', 16, C.dim).setOrigin(0.5));
    c.add(button(this, W / 2, H - 92, 240, 60, 'Continue', () => this.exit('victory'), { color: 0x2f9a4a, size: 26 }));
  }

  private bossFail() {
    stopMusic();
    sfx('defeat');
    this.say('');
    const boss = this.foes[0];
    this.tweens.add({ targets: boss.sprite, x: -200, duration: 800, ease: 'Quad.In' });
    const c = this.add.container(0, 0).setDepth(4000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 170, 120, W - 340, 300, 0x1d1730, 0xff8a6b));
    c.add(txt(this, W / 2, 160, 'Grukk escaped!', 40, '#ffb36b').setOrigin(0.5));
    c.add(txt(this, W / 2, 220, `You got ${this.bossRight} of ${BOSS_QUESTIONS} right. You need ${BOSS_NEEDED}.`, 22).setOrigin(0.5));
    c.add(txt(this, W / 2, 262, 'So close! Practice on some monsters and try again.', 18, C.dim).setOrigin(0.5));
    c.add(button(this, W / 2, 360, 240, 60, 'OK', () => this.exit('bossFail'), { size: 26 }));
  }

  private lose() {
    stopMusic();
    sfx('defeat');
    this.say('');
    this.tweens.add({ targets: this.hero, angle: 90, alpha: 0.4, y: this.heroHome.y + 30, duration: 600 });
    const c = this.add.container(0, 0).setDepth(4000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 170, 120, W - 340, 300, 0x1d1730, 0xff6b6b));
    c.add(txt(this, W / 2, 165, 'Knocked out!', 40, '#ff8a8a').setOrigin(0.5));
    c.add(txt(this, W / 2, 230, "Don't worry - you keep all your loot and XP.", 20).setOrigin(0.5));
    c.add(txt(this, W / 2, 265, 'Tip: drink potions and heal at the camp fountain.', 18, C.dim).setOrigin(0.5));
    c.add(button(this, W / 2, 360, 260, 60, 'Back to camp', () => this.exit('defeat'), { size: 24 }));
  }

  private exit(result: 'victory' | 'defeat' | 'fled' | 'bossFail') {
    saveProfile(current());
    this.cameras.main.fadeOut(250);
    this.time.delayedCall(260, () => {
      if (this.isBoss && result !== 'defeat') this.scene.start('Dungeon', { floor: LAIR, fromBattle: { result } });
      else this.scene.start('Dungeon', { fromBattle: { result, monsterId: this.data0.monsterId } });
    });
  }

  // ------------------------------------------------------------ animation helpers

  private say(s: string) {
    this.log.setText(s);
  }

  private castPose(onDone: () => void) {
    this.tweens.add({ targets: this.hero, y: this.heroHome.y - 24, duration: 180, yoyo: true, ease: 'Quad.Out', onComplete: onDone });
    this.sparkle(this.hero, 0xffffff, 6);
  }

  private attackAnim(sk: SkillDef, target: Foe | null, onHit: () => void) {
    sfx(sk.fx as Sfx);
    const color = FX_COLOR[sk.fx];
    const aim = target ?? this.alive()[Math.floor(this.alive().length / 2)];
    if (sk.melee) {
      this.tweens.add({
        targets: this.hero,
        x: aim.sprite.x + (this.isBoss ? 170 : 110),
        y: aim.sprite.y,
        duration: 220,
        ease: 'Quad.In',
        onComplete: () => {
          if (target) this.slash(target.sprite.x, target.sprite.y, color);
          else this.alive().forEach((f) => this.slash(f.sprite.x, f.sprite.y, color));
          onHit();
          this.tweens.add({ targets: this.hero, x: this.heroHome.x, y: this.heroHome.y, duration: 320, delay: 140, ease: 'Quad.Out' });
        },
      });
      return;
    }
    // Ranged: wind up, then fire a projectile at each target.
    this.tweens.add({
      targets: this.hero,
      x: this.heroHome.x + 14,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        const list = target ? [target] : this.alive();
        let landed = 0;
        list.forEach((f, i) =>
          this.time.delayedCall(i * 90, () =>
            sk.fx === 'arrow'
              ? this.arrow(this.hero, f.sprite, () => ++landed === list.length && onHit())
              : this.projectile(this.hero, f.sprite, color, () => ++landed === list.length && onHit()),
          ),
        );
        if (sk.fx === 'frost' || sk.fx === 'nature' || sk.fx === 'fel') this.cameras.main.flash(120, (color >> 16) & 255, (color >> 8) & 255, color & 255, false);
      },
    });
  }

  private hit(f: Foe, r: { dmg: number; crit: boolean }, correct: boolean, fx: Fx) {
    sfx(r.crit ? 'crit' : 'hit');
    f.e.hp = Math.max(0, f.e.hp - r.dmg);
    f.bar.set(f.e.hp, f.e.maxHp);
    this.flash(f.sprite, 0xffffff);
    this.burst(f.sprite.x, f.sprite.y, FX_COLOR[fx], r.crit ? 26 : 14);
    this.tweens.add({ targets: f.sprite, x: f.home.x - 12, duration: 50, yoyo: true, repeat: 2 });
    if (r.crit) {
      this.cameras.main.shake(220, 0.014);
      this.floatText(f.sprite.x, f.sprite.y - 110, 'CRITICAL!', '#ffd24a', 24);
    }
    this.floatText(f.sprite.x, f.sprite.y - 70, `${r.dmg}`, r.crit ? '#ffd24a' : correct ? '#ffffff' : '#ffb36b', r.crit ? 46 : correct ? 38 : 30);
    if (!correct) this.floatText(f.sprite.x, f.sprite.y - 30, 'half', '#ffb36b', 18);
    if (f.e.hp <= 0) this.die(f);
  }

  private die(f: Foe) {
    this.time.delayedCall(120, () => sfx('die'));
    this.tweens.killTweensOf(f.sprite);
    f.sprite.disableInteractive();
    f.sprite.setTint(0xff6060);
    this.burst(f.sprite.x, f.sprite.y, 0xffffff, 24);
    this.tweens.add({
      targets: f.sprite,
      alpha: 0,
      scaleX: f.sprite.scaleX * 1.3,
      scaleY: 0.2,
      y: f.sprite.y + 20,
      duration: 500,
      delay: 150,
    });
    this.tweens.add({ targets: [f.name], alpha: 0, duration: 400 });
    f.bar.destroy();
  }

  private summon(key: string, turns: number, power: number) {
    if (this.minion) {
      this.minion.turns = turns;
      return;
    }
    const x = this.heroHome.x - 110;
    const y = this.heroHome.y + 80;
    this.puff(x, y, 0x9a4aff);
    const sp = this.add.image(x, y, key).setScale(0).setFlipX(true).setDepth(11);
    this.tweens.add({ targets: sp, scale: 4.5, duration: 350, ease: 'Back.Out' });
    this.tweens.add({ targets: sp, y: y - 6, duration: 600, yoyo: true, repeat: -1, delay: 400 });
    this.minion = { sprite: sp, turns, power };
  }

  private flash(obj: Phaser.GameObjects.Image, color: number) {
    obj.setTintFill(color);
    this.time.delayedCall(90, () => obj.clearTint());
  }

  private floatText(x: number, y: number, s: string, color: string, size: number) {
    const t = txt(this, x, y, s, size, color).setOrigin(0.5).setDepth(200);
    t.setScale(0.5);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 650, duration: 500, onComplete: () => t.destroy() });
  }

  private burst(x: number, y: number, color: number, n: number, depth = 150) {
    const em = this.add.particles(x, y, 'dot', {
      speed: { min: 80, max: 260 },
      lifespan: { min: 300, max: 650 },
      scale: { start: 0.9, end: 0 },
      tint: color,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(depth);
    em.explode(n);
    this.time.delayedCall(900, () => em.destroy());
  }

  private sparkle(obj: Phaser.GameObjects.Image, color: number, n = 16) {
    for (let i = 0; i < n; i++) {
      const d = this.add.image(obj.x + ri(-40, 40), obj.y + ri(-10, 40), 'dot').setTint(color).setDepth(150).setBlendMode('ADD');
      this.tweens.add({ targets: d, y: d.y - ri(50, 100), alpha: 0, scale: 0.2, duration: ri(500, 900), delay: ri(0, 200), onComplete: () => d.destroy() });
    }
  }

  private puff(x: number, y: number, color: number) {
    this.burst(x, y, color, 24);
    const ring = this.add.circle(x, y, 10).setStrokeStyle(4, color).setDepth(150);
    this.tweens.add({ targets: ring, radius: 60, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
  }

  private slash(x: number, y: number, color: number) {
    const g = this.add.graphics({ x, y }).setDepth(160);
    g.lineStyle(8, color, 1);
    g.beginPath();
    g.arc(0, 0, 48, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(330), false);
    g.strokePath();
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.arc(0, 0, 44, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(325), false);
    g.strokePath();
    g.setRotation(Phaser.Math.FloatBetween(-0.5, 0.5));
    this.tweens.add({ targets: g, alpha: 0, scale: 1.25, duration: 260, onComplete: () => g.destroy() });
  }

  private projectile(from: Phaser.GameObjects.Image, to: Phaser.GameObjects.Image, color: number, onHit: () => void) {
    const orb = this.add.image(from.x - 30, from.y - 10, 'glow').setScale(3).setTint(color).setBlendMode('ADD').setDepth(160);
    const core = this.add.image(orb.x, orb.y, 'dot').setScale(1.2).setDepth(161);
    const trail = this.add.particles(0, 0, 'dot', {
      follow: orb,
      speed: 20,
      lifespan: 300,
      scale: { start: 0.7, end: 0 },
      tint: color,
      blendMode: 'ADD',
      frequency: 16,
    }).setDepth(159);
    this.tweens.add({
      targets: [orb, core],
      x: to.x,
      y: to.y,
      duration: 380,
      ease: 'Quad.In',
      onComplete: () => {
        orb.destroy();
        core.destroy();
        trail.stop();
        this.time.delayedCall(320, () => trail.destroy());
        onHit();
      },
    });
  }

  private arrow(from: Phaser.GameObjects.Image, to: Phaser.GameObjects.Image, onHit: () => void) {
    const a = this.add.rectangle(from.x - 30, from.y, 34, 4, 0xe8d8a0).setDepth(160);
    const tip = this.add.triangle(0, 0, 0, 0, 10, 5, 0, 10, 0xd0d0e0).setDepth(161);
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
    a.setRotation(angle);
    tip.setRotation(angle);
    const upd = () => tip.setPosition(a.x + Math.cos(angle) * 18, a.y + Math.sin(angle) * 18 - 5);
    upd();
    this.tweens.add({
      targets: a,
      x: to.x,
      y: to.y,
      duration: 200,
      onUpdate: upd,
      onComplete: () => {
        a.destroy();
        tip.destroy();
        onHit();
      },
    });
  }
}
