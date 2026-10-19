import Phaser from 'phaser';
import { CLASSES, type Fx, type PowerDef, type SkillDef } from '../data/classes';
import { makeEnemy, xpFor, type EnemyInstance } from '../data/enemies';
import { AREAS, areaOf, type AreaDef } from '../data/areas';
import { POTIONS, tierForLevel, type PotionDef } from '../data/potions';
import { openPotionMenu } from '../ui/potionMenu';
import { MAX_CHOSEN, activePower, chosenFamilies, chosenSpells, familyOf, petHealthShare } from '../data/spells';
import { spellLabel } from '../ui/spellText';
import { ICON, makeItem, RARITY, STAT_LABEL, type Item } from '../data/items';
import { QuestionEngine } from '../questions/engine';
import { BAG_SIZE, classOf, current, derive, gainXp, LEVEL_CAP, manaRegen, saveProfile } from '../state/profile';
import { worldState } from '../state/world';
import { QuestionPanel } from '../ui/QuestionPanel';
import { playMusic, sfx, stopMusic, type Sfx } from '../audio/audio';
import { Bar, C, H, W, button, panel, txt } from '../ui/widgets';
import { chance, rf, ri } from '../util/rng';
import { fmtNum, getLang, tr } from '../i18n';
import { itemName } from '../i18n/itemNames';

/** A spell's name in the current language (the power skill's name is already translated). */
function skName(sk: SkillDef): string {
  return sk.id === 'power' ? sk.name : spellLabel(spellOwner(sk), sk);
}

/** The class spell list a spell belongs to (for its rank label). */
function spellOwner(sk: SkillDef): SkillDef[] {
  return CLASSES.find((c) => c.skills.includes(sk))?.skills ?? [sk];
}

/** A newly unlocked rank of a spell the hero already had? */
function isUpgrade(list: SkillDef[], sk: SkillDef): boolean {
  return list.some((x) => x !== sk && familyOf(x.id) === familyOf(sk.id) && x.unlock < sk.unlock);
}

/** Shrink a button's label until it fits inside the button (long French spell names). */
function fitLabel(b: { label: Phaser.GameObjects.Text }, w: number, h: number, size: number) {
  let sz = size;
  while (sz > 11 && (b.label.width > w - 8 || b.label.height > h - 2)) {
    sz--;
    b.label.setFontSize(sz);
  }
}

interface BattleData {
  monsterId?: number;
  group?: EnemyInstance[];
  boss?: boolean;
  bossArea?: number;
  /** Place index of the boss lair, to return to after the fight. */
  lair?: number;
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
  holy: 0xffe680, shadow: 0x9a4aff, nature: 0x7ad04a, fel: 0x6aff4a, heal: 0x7dff9a, lightning: 0xbfe8ff,
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
  /** The hero's pet (lives in the profile so it follows between fights). */
  private petSprite?: Phaser.GameObjects.Image;
  private petBar?: Bar;
  private isBoss = false;
  private bossAsked = 0;
  private bossRight = 0;
  private bossUnit = 0;
  private pips: Phaser.GameObjects.Arc[] = [];
  private earnedXp = 0;
  private earnedGold = 0;
  private lowLevelXp = false;
  private potionLoot: PotionDef[] = [];
  private powerStars: Phaser.GameObjects.Star[] = [];
  private powerLabel?: Phaser.GameObjects.Text;
  private questionsRight = 0;
  private questionsAsked = 0;
  private manaBack = 0;

  constructor() {
    super('Battle');
  }

  create(data: BattleData) {
    this.data0 = data;
    this.foes = [];
    this.pips = [];
    this.petSprite = undefined;
    this.petBar = undefined;
    this.menu = undefined;
    this.isBoss = !!data.boss;
    this.bossAsked = 0;
    this.bossRight = 0;
    this.earnedXp = 0;
    this.earnedGold = 0;
    this.lowLevelXp = false;
    this.potionLoot = [];
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
    txt(this, W - 284, H - 120, tr('{name}  Lv {level}', { name: p.name, level: p.level }), 19);
    this.heroHp = new Bar(this, W - 284, H - 90, 258, 20, C.hp);
    this.heroMp = new Bar(this, W - 284, H - 62, 258, 16, C.mp);
    const s = derive(p);
    this.heroHp.set(p.hp, s.maxHp, false);
    this.heroMp.set(p.mp, s.maxMp, false);
    this.heroHp.setDepth(5);
    this.heroMp.setDepth(5);

    // Power meter: 3 right answers in a row charges the class power attack.
    this.powerStars = [];
    this.powerLabel = txt(this, W - 284, H - 156, tr('POWER'), 15, '#ffe9a0').setDepth(6);
    for (let i = 0; i < 3; i++) {
      this.powerStars.push(this.add.star(W - 110 + i * 34, H - 147, 5, 6, 13, 0x3a2f50).setStrokeStyle(2, 0xffd24a).setDepth(6));
    }
    if (current().dev) {
      current().streak = 3;
      current().mp = derive(current()).maxMp;
      this.heroMp.set(current().mp, derive(current()).maxMp, false);
    }
    this.refreshPower();
    this.showPet(false);

    this.log = txt(this, W / 2, 16, '', 20, '#ffe9a0', { align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5, 0).setDepth(50);

    if (this.isBoss) this.setupBoss();
    else this.setupFoes(data.group ?? [makeEnemy('slime', 1)]);

    this.cameras.main.fadeIn(300);
    this.time.delayedCall(500, () => this.playerTurn());
  }

  // ------------------------------------------------------------ setup

  /** The area this fight happens in (for the boss, its own area). */
  private area(): AreaDef {
    if (this.isBoss && this.data0.bossArea !== undefined) return AREAS[this.data0.bossArea];
    return areaOf(worldState.world?.floor ?? 0);
  }

  private drawBackground() {
    const th = this.area().theme;
    if (th.outdoor) return this.drawForestBackground();
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

  /** Sunny forest clearing: sky, a line of trees, grass, light beams and fireflies. */
  private drawForestBackground() {
    const th = this.area().theme;
    this.cameras.main.setBackgroundColor(0x2a5a2a);
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0x8fd8ff, 0x8fd8ff, 0xc8f0d0, 0xc8f0d0, 1).fillRect(0, 0, W, 200);
    for (let x = -24; x < W; x += 40) {
      this.add.image(x, 150 + ((x * 7) % 20), th.wallTop).setOrigin(0).setScale(3).setTint(0x9ac89a);
    }
    for (let x = -10; x < W; x += 44) this.add.image(x + 24, 230 + ((x * 13) % 16), th.wall).setScale(3.4);
    for (let x = 0; x < W; x += 48) {
      for (let y = 266; y < H; y += 48) this.add.image(x, y, (x + y) % 5 === 0 ? th.floorAlt : th.floor).setOrigin(0).setScale(3);
    }
    th.deco.forEach((d, i) => this.add.image(90 + i * 230, 470 - (i % 2) * 150, d).setScale(3).setAlpha(0.95));
    for (const bx of [120, 460, 800]) {
      const beam = this.add.rectangle(bx, 0, 70, 360, 0xfff6c0, 0.1).setOrigin(0.5, 0).setAngle(-12).setBlendMode('ADD');
      this.tweens.add({ targets: beam, fillAlpha: 0.2, duration: 1800, yoyo: true, repeat: -1, delay: bx });
    }
    for (let i = 0; i < 18; i++) {
      const f = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(180, H - 140), 'dot').setTint(0xfff27a).setScale(0.45).setBlendMode('ADD');
      this.tweens.add({ targets: f, x: f.x + Phaser.Math.Between(-50, 50), y: f.y - Phaser.Math.Between(20, 60), alpha: { from: 0.1, to: 0.8 }, duration: Phaser.Math.Between(1500, 3000), yoyo: true, repeat: -1 });
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
      const name = txt(this, x, y - 66, tr('{name} Lv{level}', { name: tr(e.def.name), level: e.level }), 15).setOrigin(0.5).setDepth(20);
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
    const BOSS = this.area().boss;
    const e = makeEnemy('goblin', BOSS.level);
    e.def = { ...e.def, id: BOSS.id, name: BOSS.name, sprite: BOSS.sprite, verb: BOSS.verb };
    e.maxHp = (this.bossUnit * 9) / 2;
    e.hp = e.maxHp;
    e.xp = 22 * BOSS.level;
    e.gold = ri(5, 9) * BOSS.level;
    const x = 230;
    const y = 280;
    this.add.ellipse(x, y + 90, 150, 26, 0x000000, 0.4).setDepth(1);
    const sprite = this.add.image(x, y, BOSS.sprite).setScale(6).setDepth(10);
    this.tweens.add({ targets: sprite, scaleY: 6 * 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const name = txt(this, x, y - 120, tr(BOSS.name), 20, '#ffb36b').setOrigin(0.5).setDepth(20);
    const bar = new Bar(this, x - 120, y - 104, 240, 16, C.hp).setDepth(20);
    bar.set(e.hp, e.maxHp, false);
    this.foes.push({ e, sprite, bar, name, home: { x, y } });

    // Question tracker: 5 pips, need 4 green.
    txt(this, W / 2, 62, tr('Get {need} of {total} right to win!', { need: BOSS_NEEDED, total: BOSS_QUESTIONS }), 18, C.dim).setOrigin(0.5);
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
    this.say(this.isBoss ? tr('Question {n} of {total}', { n: this.bossAsked + 1, total: BOSS_QUESTIONS }) : tr('Your turn! Pick an action.'));
    const c = this.add.container(0, 0).setDepth(100);
    this.menu = c;
    c.add(panel(this, 10, H - 128, W - 320, 118, 0x1d1730));

    // The free basic attack plus the 3 spells chosen in the Spellbook.
    const skills = this.isBoss ? [cls.skills[0]] : [cls.skills[0], ...chosenSpells(cls.skills, p.level, p.spells)];
    const bw = 200;
    const bh = 48;
    skills.forEach((sk, i) => {
      const x = 30 + bw / 2 + (i % 2) * (bw + 10);
      const y = H - 98 + Math.floor(i / 2) * (bh + 8);
      const label = sk.mp ? `${skName(sk)}\n${tr('{n} MP', { n: sk.mp })}` : skName(sk);
      const b = button(this, x, y, bw, bh, label, () => this.chooseSkill(sk), { size: sk.mp ? 15 : 19, color: 0x4b3a78 });
      fitLabel(b, bw, bh, sk.mp ? 15 : 19);
      if (sk.mp > p.mp) b.setEnabled(false);
      c.add(b);
    });
    // Charged power attack!
    if ((p.streak ?? 0) >= 3) {
      if (this.isBoss && !p.dev) {
        c.add(txt(this, 320, H - 150, tr('Your power is saved for after the boss!'), 15, '#ffe9a0').setOrigin(0.5));
      } else {
        const pb = button(this, 320, H - 152, 360, 46, `\u2605 ${tr(this.ultimate().name)}! \u2605`, () => this.chooseSkill(this.powerSkill()), { size: 22, color: 0xb07a10 });
        fitLabel(pb, 360, 46, 22);
        c.add(pb);
        this.tweens.add({ targets: pb, scale: 1.06, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    }
    // Locked skill hints so kids know what's coming.
    const nextLocked = cls.skills.find((s) => s.unlock > p.level);
    if (nextLocked && !this.isBoss && skills.length < 4) {
      const n = skills.length;
      c.add(txt(this, 34 + (n % 2) * (bw + 10), H - 116 + Math.floor(n / 2) * (bh + 8), tr('New spell at level {level}: {spell}', { level: nextLocked.unlock, spell: skName(nextLocked) }), 14, C.dim, { wordWrap: { width: bw - 8 } }));
    }
    if (!this.isBoss) {
      const pots = POTIONS.reduce((n, d) => n + (p.potions[d.id] ?? 0), 0);
      c.add(button(this, 530, H - 98, 110, bh, tr('Potions ({n})', { n: pots }), () => this.usePotion(), { size: 16, color: 0x8a2a3a }).setEnabled(pots > 0));
      c.add(button(this, 530, H - 44, 110, 40, tr('Run'), () => this.run(), { size: 17, color: 0x3a3450 }));
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
    this.say(tr('{spell}: tap a monster to target it!', { spell: skName(sk) }));
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
    const back = button(this, 120, H - 60, 160, 50, tr('Back'), () => {
      cleanup();
      this.playerTurn();
    }, { color: 0x3a3450 });
  }

  private ask(sk: SkillDef, target: Foe) {
    const p = current();
    // Developer heroes skip the question: every attack counts as right.
    const q = p.dev ? undefined : this.engine.next();
    const done = (correct: boolean) => {
      if (q) this.engine.record(q, correct);
      this.updateStreak(sk, correct);
      this.questionsAsked++;
      if (correct) this.questionsRight++;
      saveProfile(p);
      if (this.isBoss) {
        this.pips[this.bossAsked].setFillStyle(correct ? 0x3ed34a : 0xe0404a);
        this.bossAsked++;
        if (correct) this.bossRight++;
      }
      if (!p.dev) p.mp -= sk.mp; // developer heroes have unlimited mana
      this.heroMp.set(p.mp, derive(p).maxMp);
      this.perform(sk, target, correct);
    };
    if (!q) {
      done(true);
      return;
    }
    new QuestionPanel(this, q, {
      header: this.isBoss ? tr('BOSS question {n} of {total}', { n: this.bossAsked + 1, total: BOSS_QUESTIONS }) : skName(sk),
      readAloud: p.settings.readAloud,
      done,
    });
  }

  // ------------------------------------------------------------ power attack

  /** This hero's ultimate: it matches the school most of their chosen spells use. */
  private ultimate(): PowerDef {
    const p = current();
    return activePower(classOf(p), p.level, p.spells);
  }

  private powerSkill(): SkillDef {
    const cls = classOf(current());
    const pw = this.ultimate();
    return { id: 'power', name: `\u2605 ${tr(pw.name)}`, desc: 'Super attack!', unlock: 1, mp: 0, kind: 'damage', power: 3, fx: pw.fx ?? cls.skills[0].fx };
  }

  /** 3 right in a row charges the power; using it (right or wrong) spends it. */
  private updateStreak(sk: SkillDef, correct: boolean) {
    const p = current();
    const before = p.streak ?? 0;
    if (sk.id === 'power') p.streak = 0;
    else if (before < 3) p.streak = correct ? before + 1 : 0;
    if (p.dev) p.streak = 3; // developer heroes always have their power ready
    this.refreshPower();
    if (before < 3 && (p.streak ?? 0) >= 3) {
      this.time.delayedCall(200, () => {
        sfx('ready');
        this.floatText(this.hero.x, this.hero.y - 120, tr('POWER READY!'), '#ffd24a', 30);
        this.sparkle(this.hero, 0xffd24a, 24);
      });
    }
  }

  private refreshPower() {
    const n = Math.min(3, current().streak ?? 0);
    const color = this.ultimate().color;
    this.powerStars.forEach((st, i) => {
      this.tweens.killTweensOf(st);
      st.setScale(1).setFillStyle(i < n ? (n >= 3 ? color : 0xffd24a) : 0x3a2f50);
      if (n >= 3) this.tweens.add({ targets: st, scale: 1.35, angle: 72, duration: 500, yoyo: true, repeat: -1, delay: i * 120 });
    });
    this.powerLabel?.setText(n >= 3 ? tr('POWER READY!') : tr('POWER')).setColor(n >= 3 ? '#ffd24a' : '#ffe9a0');
  }

  /** Cinematic super attack: darken, name banner, charge-up, then a class-specific finisher. */
  private powerAnim(pw: PowerDef, target: Foe, onImpact: () => void) {
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(140);
    this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 300 });
    const banner = txt(this, -300, 120, tr(pw.name).toUpperCase() + '!', getLang() === 'fr' && tr(pw.name).length > 16 ? 46 : 58, pw.css).setOrigin(0.5).setDepth(400);
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
        // The ranger leaps up and fires into the sky; a storm of glowing arrows
        // rains on every enemy and leaves the ground bristling with arrows.
        const hy = this.hero.y;
        this.tweens.add({ targets: this.hero, y: hy - 110, duration: 260, ease: 'Quad.Out', yoyo: true, hold: 520 });
        for (let k = 0; k < 3; k++) {
          this.time.delayedCall(120 + k * 90, () => {
            const p = this.bowTip();
            this.shot(p.x, p.y, p.x - 60 - k * 50, -60, () => {}, { glow: pw.color, trail: pw.color, scale: 1.4, ms: 240 });
          });
        }
        const foes = this.alive();
        const n = 48;
        let landed = 0;
        const stuck: Phaser.GameObjects.Rectangle[] = [];
        for (let i = 0; i < n; i++) {
          const f = foes[i % foes.length];
          const x = f.sprite.x + Phaser.Math.Between(-90, 90);
          const y = f.sprite.y + Phaser.Math.Between(-40, 50);
          this.time.delayedCall(480 + i * 24, () =>
            this.shot(x + 110, -60, x, y, () => {
              this.burst(x, y, pw.color, 4, D);
              if (i % 3 === 0) {
                const a = this.add.rectangle(x, y + 30, 4, 26, 0xe8d8a0).setRotation(-0.6).setDepth(D - 5);
                stuck.push(a);
              }
              if (++landed === n) {
                foes.forEach((g) => this.ring(g.sprite.x, g.sprite.y, pw.color, 180, 8, 520));
                impact();
                this.tweens.add({ targets: stuck, alpha: 0, duration: 500, delay: 700, onComplete: () => stuck.forEach((s) => s.destroy()) });
              }
            }, { glow: pw.color, trail: i % 2 ? pw.color : 0xffffff, ms: 300, ease: 'Quad.In' }),
          );
        }
        break;
      }
      case 'wild': {
        // A howl calls spirit wolves that charge through the enemy, then a spirit
        // bear swipes with giant claws and vines burst from the ground.
        for (let k = 0; k < 3; k++) this.time.delayedCall(k * 140, () => this.ring(this.hero.x, this.hero.y, pw.color, 240, 6, 600));
        const wolves = 5;
        for (let i = 0; i < wolves; i++) {
          this.time.delayedCall(200 + i * 110, () => {
            const y = ty + (i - 2) * 34;
            const w = this.add.image(this.hero.x + 40, y, 'enemy_wolf').setScale(5.5).setFlipX(true).setTint(pw.color).setAlpha(0.85).setBlendMode('ADD').setDepth(D);
            const trail = this.add.particles(0, 0, 'dot', { follow: w, speed: 30, lifespan: 400, scale: { start: 1.2, end: 0 }, tint: [pw.color, 0xffffff], blendMode: 'ADD', frequency: 12 }).setDepth(D - 1);
            this.tweens.add({ targets: w, y: y - 18, duration: 90, yoyo: true, repeat: 3 });
            this.tweens.add({
              targets: w,
              x: tx - 260,
              duration: 620,
              ease: 'Quad.In',
              onUpdate: () => {
                if (!w.getData('hit') && w.x < tx + 20) {
                  w.setData('hit', true);
                  this.slash(tx, y, pw.color);
                  this.burst(tx, y, pw.color, 8, D);
                }
              },
              onComplete: () => {
                trail.stop();
                this.time.delayedCall(420, () => trail.destroy());
                this.tweens.add({ targets: w, alpha: 0, duration: 200, onComplete: () => w.destroy() });
              },
            });
          });
        }
        this.time.delayedCall(1050, () => {
          const bear = this.add.image(tx + 60, ty - 30, 'enemy_owlbear').setScale(9).setFlipX(true).setTint(pw.color).setAlpha(0).setBlendMode('ADD').setDepth(D);
          this.tweens.add({ targets: bear, alpha: 0.75, y: ty - 50, duration: 260, ease: 'Quad.Out' });
          this.time.delayedCall(300, () => {
            const claws = this.add.graphics({ x: tx, y: ty }).setDepth(D + 2).setRotation(0.5);
            for (let k = 0; k < 3; k++) {
              claws.lineStyle(14, pw.color, 0.6).lineBetween(-30 + k * 30, -110, -30 + k * 30, 110);
              claws.lineStyle(5, 0xffffff, 1).lineBetween(-30 + k * 30, -100, -30 + k * 30, 100);
            }
            claws.setScale(1, 0);
            this.tweens.add({ targets: claws, scaleY: 1, duration: 120, ease: 'Quad.Out' });
            this.tweens.add({ targets: claws, alpha: 0, duration: 400, delay: 300, onComplete: () => claws.destroy() });
            this.tweens.add({ targets: bear, alpha: 0, duration: 400, delay: 200, onComplete: () => bear.destroy() });
            const spikes: Phaser.GameObjects.Triangle[] = [];
            for (let i = 0; i < 9; i++) {
              const h = 70 + Math.random() * 60;
              const sp = this.add.triangle(tx - 100 + i * 25, ty + 50, 0, h, 12, 0, 24, h, i % 2 ? 0x3a8a2a : 0x6ad04a).setOrigin(0.5, 1).setScale(1, 0).setDepth(D);
              spikes.push(sp);
              this.tweens.add({ targets: sp, scaleY: 1, duration: 160, delay: i * 30, ease: 'Back.Out' });
            }
            this.tweens.add({ targets: spikes, scaleY: 0, alpha: 0, duration: 400, delay: 800, onComplete: () => spikes.forEach((x) => x.destroy()) });
            impact();
          });
        });
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
                // A storm of blades: slashes all around, a spinning tornado, shockwaves.
                for (let i = 0; i < 12; i++) {
                  this.time.delayedCall(i * 45, () => {
                    const ang = (i / 12) * Math.PI * 2;
                    this.slash(tx + Math.cos(ang) * 50, ty + Math.sin(ang) * 30, i % 2 ? 0xffffff : pw.color);
                  });
                }
                const tornado = this.add.graphics({ x: tx, y: ty }).setDepth(D + 1).setBlendMode('ADD');
                const spin = { a: 0 };
                this.tweens.add({
                  targets: spin,
                  a: Math.PI * 6,
                  duration: 900,
                  onUpdate: () => {
                    tornado.clear();
                    for (let k = 0; k < 5; k++) {
                      const r = 40 + k * 26;
                      tornado.lineStyle(6 - k, k % 2 ? 0xffffff : pw.color, 0.7);
                      tornado.beginPath().arc(0, -k * 22, r, spin.a + k, spin.a + k + Math.PI * 1.2, false).strokePath();
                    }
                  },
                  onComplete: () => this.tweens.add({ targets: tornado, alpha: 0, duration: 250, onComplete: () => tornado.destroy() }),
                });
                for (let k = 0; k < 4; k++) this.time.delayedCall(k * 150, () => this.ring(tx, ty, k % 2 ? 0xffffff : pw.color, 220 + k * 40, 8, 520));
                this.tweens.add({ targets: this.hero, angle: 1080 + 720, duration: 600 });
                impact();
                this.tweens.add({ targets: this.hero, x: hx, y: hy, angle: 0, duration: 400, delay: 650 });
              },
            }),
        });
        break;
      }
      case 'hammer': {
        const pillar = this.add.rectangle(tx, ty + 40, 110, 900, 0xffe066, 0).setOrigin(0.5, 1).setDepth(D - 1).setBlendMode('ADD');
        this.tweens.add({ targets: pillar, fillAlpha: 0.45, duration: 250 });
        // Heavenly beams fan down around the enemy while the hammer falls.
        for (let i = 0; i < 6; i++) {
          const bx = tx - 250 + i * 100;
          const beam = this.add.rectangle(bx, ty + 60, 30, 900, 0xfff0a0, 0).setOrigin(0.5, 1).setDepth(D - 2).setBlendMode('ADD').setRotation((bx - tx) / 1400);
          this.tweens.add({ targets: beam, fillAlpha: 0.35, duration: 200, delay: i * 60, yoyo: true, hold: 500, onComplete: () => beam.destroy() });
        }
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
            this.holyCross(tx, ty, 260);
            // Rays of light burst outwards.
            for (let i = 0; i < 12; i++) {
              const a = (i / 12) * Math.PI * 2;
              const ray = this.add.rectangle(tx, ty, 260, 8, 0xfff0a0, 0.9).setOrigin(0, 0.5).setRotation(a).setDepth(D + 1).setBlendMode('ADD').setScale(0.2, 1);
              this.tweens.add({ targets: ray, scaleX: 1.2, alpha: 0, duration: 600, onComplete: () => ray.destroy() });
            }
            this.tweens.add({ targets: [hammer, pillar], alpha: 0, duration: 500, delay: 200, onComplete: () => { hammer.destroy(); pillar.destroy(); } });
          },
        });
        break;
      }
      case 'bones': {
        // A giant ghost skull rises behind the enemies, a ring of skeletons
        // climbs out of the ground, and they all charge together.
        const big = this.skull(tx - 40, ty - 40, 150, pw.color).setDepth(D - 3).setAlpha(0).setScale(0.4);
        this.tweens.add({ targets: big, alpha: 0.55, scale: 1, y: ty - 90, duration: 500, ease: 'Back.Out' });
        this.tweens.add({ targets: big, angle: { from: -4, to: 4 }, duration: 160, yoyo: true, repeat: 4, delay: 500 });
        const bones: Phaser.GameObjects.Image[] = [];
        const n = 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const x = tx + Math.cos(a) * 140;
          const y = ty + Math.sin(a) * 70 + 20;
          const b = this.add.image(x, y + 60, 'minion_skeleton').setScale(4).setAlpha(0).setDepth(D).setFlipX(Math.cos(a) > 0);
          bones.push(b);
          this.time.delayedCall(200 + i * 70, () => {
            this.burst(x, y + 30, 0xe8e0d0, 8, D);
            const flame = this.add.image(x, y + 30, 'glow').setScale(3, 5).setTint(i % 2 ? pw.color : 0x7aff9a).setBlendMode('ADD').setDepth(D - 1);
            this.tweens.add({ targets: flame, scaleY: 0, alpha: 0, y: y - 40, duration: 600, onComplete: () => flame.destroy() });
          });
          this.tweens.add({ targets: b, y, alpha: 1, duration: 300, delay: 200 + i * 70, ease: 'Back.Out' });
        }
        this.time.delayedCall(200 + n * 70 + 380, () => {
          this.tweens.add({ targets: big, y: ty, scale: 1.4, alpha: 0, duration: 260, ease: 'Quad.In', onComplete: () => big.destroy() });
          this.tweens.add({
            targets: bones,
            x: tx,
            y: ty,
            duration: 220,
            ease: 'Quad.In',
            onComplete: () => {
              for (let k = 0; k < 10; k++) {
                const bone = this.add.rectangle(tx, ty, 22, 6, 0xe8e0d0).setDepth(D + 1);
                this.tweens.add({ targets: bone, x: tx + Phaser.Math.Between(-160, 160), y: ty + Phaser.Math.Between(-120, 80), angle: 720, alpha: 0, duration: 700, ease: 'Quad.Out', onComplete: () => bone.destroy() });
              }
              impact();
              this.tweens.add({ targets: bones, alpha: 0, scale: 2, duration: 400, onComplete: () => bones.forEach((b) => b.destroy()) });
            },
          });
        });
        break;
      }
      case 'tomb': {
        // Ice grows into a big tombstone around the enemy, then shatters.
        const tomb = this.add.container(tx, ty).setDepth(D).setScale(1, 0);
        const body = this.add.graphics();
        body.fillStyle(0x8fd8ff, 0.55).fillRoundedRect(-75, -100, 150, 170, { tl: 70, tr: 70, bl: 6, br: 6 });
        body.lineStyle(5, 0xffffff, 1).strokeRoundedRect(-75, -100, 150, 170, { tl: 70, tr: 70, bl: 6, br: 6 });
        body.lineStyle(6, 0xdff4ff, 0.9).lineBetween(0, -70, 0, -20).lineBetween(-20, -52, 20, -52);
        body.fillStyle(0xffffff, 0.5).fillRect(-55, -40, 10, 80);
        tomb.add(body);
        this.tweens.add({ targets: tomb, scaleY: 1, duration: 420, ease: 'Back.Out' });
        target.sprite.setTint(0x8fd8ff);
        for (let i = 0; i < 20; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = this.add.image(tx + Math.cos(a) * 180, ty + Math.sin(a) * 120, 'dot').setTint(0xdff4ff).setBlendMode('ADD').setDepth(D + 1);
          this.tweens.add({ targets: d, x: tx, y: ty, alpha: 0.2, duration: 450, delay: i * 15, onComplete: () => d.destroy() });
        }
        const ghost = this.skull(tx, ty - 170, 60, 0xdff4ff).setDepth(D + 2).setAlpha(0);
        this.tweens.add({ targets: ghost, alpha: 0.85, y: ty - 150, duration: 300, delay: 300 });
        this.time.delayedCall(950, () => {
          this.tweens.add({ targets: ghost, alpha: 0, scale: 1.5, duration: 300, onComplete: () => ghost.destroy() });
          tomb.destroy();
          target.sprite.clearTint();
          for (let i = 0; i < 16; i++) {
            const h = Phaser.Math.Between(20, 44);
            const sh = this.add.triangle(tx, ty - 20, 0, 0, h / 2, h, h, 0, i % 2 ? 0xbfe8ff : 0x7ac8ff).setStrokeStyle(2, 0xffffff).setDepth(D + 1);
            const a = (i / 16) * Math.PI * 2;
            this.tweens.add({ targets: sh, x: tx + Math.cos(a) * 220, y: ty + Math.sin(a) * 160, angle: 540, alpha: 0, duration: 700, ease: 'Quad.Out', onComplete: () => sh.destroy() });
          }
          impact();
        });
        break;
      }
      case 'ice': {
        // Giant icicles crash down on the target.
        const shards: Phaser.GameObjects.Triangle[] = [];
        const n = 7;
        for (let i = 0; i < n; i++) {
          const x = tx - 90 + i * 30 + Phaser.Math.Between(-8, 8);
          const h = 90 + Math.random() * 70;
          const sh = this.add.triangle(x, -h, 0, 0, 30, 0, 15, h, i % 2 ? 0xbfe8ff : 0x7ac8ff).setOrigin(0.5, 1).setStrokeStyle(2, 0xffffff).setDepth(D);
          shards.push(sh);
          this.tweens.add({
            targets: sh,
            y: ty + 40,
            duration: 300,
            delay: i * 70,
            ease: 'Quad.In',
            onComplete: () => {
              this.burst(sh.x, ty + 30, 0xdff4ff, 8, D);
              if (i === n - 1) {
                const frost = this.add.image(tx, ty, 'glow').setScale(12).setTint(0x8fd8ff).setBlendMode('ADD').setDepth(D - 1);
                this.tweens.add({ targets: frost, alpha: 0, duration: 800, onComplete: () => frost.destroy() });
                impact();
                this.tweens.add({ targets: shards, alpha: 0, duration: 500, delay: 300, onComplete: () => shards.forEach((x) => x.destroy()) });
              }
            },
          });
        }
        break;
      }
      case 'nova': {
        // Orbs of magic gather around the target, then implode.
        const orbs: Phaser.GameObjects.Image[] = [];
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const o = this.add.image(tx + Math.cos(a) * 170, ty + Math.sin(a) * 120, 'glow').setScale(0).setTint(pw.color).setBlendMode('ADD').setDepth(D);
          orbs.push(o);
          this.tweens.add({ targets: o, scale: 3.5, duration: 220, delay: i * 40, ease: 'Back.Out' });
        }
        this.time.delayedCall(10 * 40 + 300, () => {
          this.tweens.add({
            targets: orbs,
            x: tx,
            y: ty,
            scale: 1.5,
            duration: 260,
            ease: 'Quad.In',
            onComplete: () => {
              orbs.forEach((o) => o.destroy());
              const big = this.add.image(tx, ty, 'glow').setScale(2).setTint(pw.color).setBlendMode('ADD').setDepth(D);
              this.tweens.add({ targets: big, scale: 16, alpha: 0, duration: 600, onComplete: () => big.destroy() });
              impact();
            },
          });
        });
        break;
      }
      case 'thunder': {
        // Storm clouds, then bolts from the sky.
        const cloud = this.add.rectangle(W / 2, 0, W, 120, 0x1a1a2e, 0).setOrigin(0.5, 0).setDepth(D - 1);
        this.tweens.add({ targets: cloud, fillAlpha: 0.9, duration: 250 });
        const sky = this.add.image(tx, -30, 'dot').setVisible(false);
        const bolts = 5;
        for (let i = 0; i < bolts; i++) {
          this.time.delayedCall(250 + i * 130, () => {
            sky.setPosition(tx + Phaser.Math.Between(-160, 160), -30);
            const spot = this.add.image(tx + Phaser.Math.Between(-30, 30), ty + Phaser.Math.Between(-20, 20), 'dot').setVisible(false);
            sfx('lightning');
            this.lightning(sky, spot, () => {
              this.burst(spot.x, spot.y, 0xbfe8ff, 10, D);
              spot.destroy();
              if (i === bolts - 1) {
                impact();
                sky.destroy();
                this.tweens.add({ targets: cloud, alpha: 0, duration: 500, delay: 200, onComplete: () => cloud.destroy() });
              }
            });
          });
        }
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
      this.powerAnim(this.ultimate(), target, () => {
        const r = this.calcDamage(sk, target, correct);
        this.hit(target, r, correct, sk.fx);
        this.floatText(target.sprite.x, target.sprite.y - 140, correct ? tr('x3 POWER!') : tr('x1.5 (half power)'), correct ? this.ultimate().css : '#ffb36b', 26);
        this.time.delayedCall(500, after);
      });
      return;
    }
    this.say(
      correct
        ? tr('{name} uses {spell}!', { name: p.name, spell: skName(sk) })
        : tr('{name} uses {spell}! (half power)', { name: p.name, spell: skName(sk) }),
    );

    switch (sk.kind) {
      case 'heal': {
        const s = derive(p);
        const amt = Math.round(s.maxHp * sk.power * (correct ? 1 : 0.5));
        const pose = sk.anim === 'holylight' ? (done: () => void) => this.holyLight(done) : (done: () => void) => this.castPose(done);
        pose(() => {
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
        const pose = sk.anim === 'raise' ? (done: () => void) => this.raiseDead(done) : (done: () => void) => this.castPose(done);
        pose(() => {
          const had = !!p.pet;
          // Pets have about a third of the hero's health (more at higher ranks).
          const maxHp = Math.round(derive(p).maxHp * petHealthShare(sk));
          p.pet = { name: cls.summon!.name, sprite: cls.summon!.sprite, maxHp, hp: correct ? maxHp : Math.round(maxHp * 0.6), power: sk.power };
          this.showPet(true);
          sfx('summon');
          const pet = tr(cls.summon!.name);
          this.say(had ? tr('Your {pet} is healed and powered up!', { pet }) : tr('Your {pet} will follow you into every fight!', { pet }));
          saveProfile(p);
          after();
        });
        return;
      }
      case 'aoe': {
        const targets = this.alive();
        this.attackAnim(sk, null, () => {
          targets.forEach((f, i) =>
            this.time.delayedCall(i * 120, () => {
              this.hit(f, this.calcDamage(sk, f, correct), correct, sk.fx);
              if (correct && sk.stunChance && f.e.hp > 0 && chance(sk.stunChance)) {
                f.e.stunned = true;
                this.floatText(f.sprite.x, f.sprite.y - 90, sk.fx === 'frost' ? tr('FROZEN!') : tr('STUNNED!'), sk.fx === 'frost' ? '#8fd8ff' : '#ffe066', 20);
              }
            }),
          );
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
            this.floatText(target.sprite.x, target.sprite.y - 90, tr('STUNNED!'), '#ffd24a', 22);
          }
          if (sk.kind === 'drain') {
            const s = derive(p);
            const heal = Math.round(r.dmg * 0.6);
            p.hp = Math.min(s.maxHp, p.hp + heal);
            this.heroHp.set(p.hp, s.maxHp);
            const healText = () => this.floatText(this.hero.x, this.hero.y - 60, `+${heal}`, '#7dff9a', 30);
            // The drain animation already pulls life back to the hero.
            if (sk.anim === 'drain') this.time.delayedCall(560, healText);
            else this.projectile(target.sprite, this.hero, 0x7dff9a, healText);
          }
          after();
        });
      }
    }
  }

  private afterPlayerAction() {
    if (this.checkWin()) return;
    // The pet attacks a random living foe (pets just cheer during boss fights).
    const pet = current().pet;
    if (pet && this.petSprite && !this.isBoss) {
      const sp = this.petSprite;
      const t = Phaser.Utils.Array.GetRandom(this.alive());
      const home = { x: sp.x, y: sp.y };
      this.tweens.add({
        targets: sp,
        x: t.sprite.x + 70,
        y: t.sprite.y,
        duration: 220,
        ease: 'Quad.In',
        onComplete: () => {
          const dmg = Math.max(1, Math.round(derive(current()).power * pet.power * rf(0.9, 1.1) - t.e.armor * 0.4));
          this.hit(t, { dmg, crit: false }, true, 'slash');
          this.tweens.add({ targets: sp, x: home.x, y: home.y, duration: 260, delay: 120 });
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
        // Mana comes back slowly (5% a round), so big spells need planning or potions.
        const s = derive(p);
        p.mp = Math.min(s.maxMp, p.mp + Math.max(1, Math.round(s.maxMp * 0.02)));
        this.heroMp.set(p.mp, s.maxMp);
        saveProfile(p);
        if (this.isBoss && this.bossAsked >= BOSS_QUESTIONS) return this.bossFail();
        return this.time.delayedCall(250, () => this.playerTurn());
      }
      const f = foes[i++];
      if (f.e.stunned) {
        f.e.stunned = false;
        this.say(tr("{name} is stunned and can't attack!", { name: tr(f.e.def.name) }));
        return this.time.delayedCall(700, next);
      }
      // Monsters sometimes go after the pet instead of the hero.
      if (p.pet && this.petSprite && !this.isBoss && chance(0.35)) this.enemyAttackPet(f, next);
      else this.enemyAttack(f, next);
    };
    next();
  }

  private enemyAttackPet(f: Foe, done: () => void) {
    const p = current();
    const pet = p.pet!;
    const sp = this.petSprite!;
    const dmg = Math.max(1, Math.round(f.e.atk * rf(0.85, 1.15) * 0.8));
    this.say(tr('{name} {verb} your {pet}!', { name: tr(f.e.def.name), verb: tr(f.e.def.verb), pet: tr(pet.name) }));
    this.tweens.add({
      targets: f.sprite,
      x: sp.x - 90,
      y: sp.y,
      duration: 220,
      ease: 'Quad.In',
      onComplete: () => {
        pet.hp = Math.max(0, pet.hp - dmg);
        this.petBar?.set(pet.hp, pet.maxHp);
        this.flash(sp, 0xff4040);
        sfx('hurt');
        this.floatText(sp.x, sp.y - 50, `-${dmg}`, '#ff6b6b', 24);
        if (pet.hp <= 0) {
          this.say(tr('Your {pet} was defeated! Cast the summon spell to bring it back.', { pet: tr(pet.name) }));
          this.puff(sp.x, sp.y, 0x9a4aff);
          sp.destroy();
          this.petBar?.destroy();
          this.petSprite = undefined;
          this.petBar = undefined;
          p.pet = undefined;
        }
        saveProfile(p);
        this.tweens.add({ targets: f.sprite, x: f.home.x, y: f.home.y, duration: 300, delay: 100, onComplete: () => this.time.delayedCall(200, done) });
      },
    });
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
    // French puts "te" before the verb, so French names the hero instead of saying "you".
    this.say(
      getLang() === 'fr'
        ? tr('{name} {verb} {hero}!', { name: tr(f.e.def.name), verb: tr(f.e.def.verb), hero: p.name })
        : `${f.e.def.name} ${f.e.def.verb} you!`,
    );
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

  /** Pick a potion to drink; drinking uses your turn. */
  private usePotion() {
    this.closeMenu();
    openPotionMenu(
      this,
      (d, gained) => {
        const p = current();
        const s = derive(p);
        this.heroHp.set(p.hp, s.maxHp);
        this.heroMp.set(p.mp, s.maxMp);
        this.sparkle(this.hero, d.kind === 'hp' ? 0xff6b6b : 0x5a9aff);
        this.floatText(this.hero.x, this.hero.y - 60, `+${gained}`, d.kind === 'hp' ? '#7dff9a' : '#7fb8ff', 32);
        this.say(tr('You drink a {potion}.', { potion: tr(d.name) }));
        this.time.delayedCall(700, () => this.enemyTurn());
      },
      () => this.playerTurn(),
    );
  }

  private run() {
    this.closeMenu();
    this.say(tr('You ran away safely!'));
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
      if (!this.isBoss && chance(0.35)) loot.push(makeItem(Math.min(20, f.e.level), { cls }));
      // Potions drop too: stronger ones from higher-level monsters.
      if (!this.isBoss && chance(0.22)) this.potionLoot.push(this.randomPotion(f.e.level));
    }
    if (this.isBoss) {
      const boss = this.area().boss;
      loot.push(makeItem(boss.level, { cls, boss: true, lootName: boss.lootName }), makeItem(boss.level, { cls, boss: true, lootName: boss.lootName }));
      p.bossKills++;
      p.bossesBeaten = [...new Set([...(p.bossesBeaten ?? []), boss.id])];
      this.potionLoot.push(this.randomPotion(boss.level, 'hp'), this.randomPotion(boss.level));
    }
    for (const d of this.potionLoot) p.potions[d.id] = (p.potions[d.id] ?? 0) + 1;
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
    // Mana comes back after a win, more with more Intellect.
    this.manaBack = Math.max(0, manaRegen(p));
    p.mp += this.manaBack;
    const before = derive(p);
    const fromLevel = p.level;
    const levels = gainXp(p, this.earnedXp);
    // New spells drop straight into an empty battle slot.
    if (levels > 0) {
      // (A higher rank of a chosen spell is used automatically.)
      const cur = chosenFamilies(cls.skills, p.level - levels, p.spells);
      for (const sp of cls.skills.filter((x) => x.unlock > p.level - levels && x.unlock <= p.level && x.unlock > 1)) {
        const fam = familyOf(sp.id);
        if (!cur.includes(fam) && cur.length < MAX_CHOSEN) cur.push(fam);
      }
      p.spells = cur;
    }
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

    const title = txt(this, W / 2, 150, tr('LEVEL UP!'), getLang() === 'fr' ? 62 : 84, '#ffd24a').setOrigin(0.5);
    title.setStroke('#7a3a00', 12);
    c.add(title);
    this.tweens.add({ targets: title, scale: { from: 0.2, to: 1 }, duration: 600, ease: 'Elastic.Out' });
    this.tweens.add({ targets: title, scale: 1.08, duration: 700, yoyo: true, repeat: -1, delay: 700, ease: 'Sine.InOut' });
    c.add(txt(this, W / 2, 222, tr('Level {from}  ->  Level {to}', { from: fromLevel, to: p.level }), 28, '#ffffff').setOrigin(0.5));

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
      const line = `+${v}${unit} ${tr(label)}`;
      const t = txt(this, x, y, main ? tr('{stat}   (your main stat!)', { stat: line }) : line, main ? 28 : 22, main ? '#ffd24a' : '#7dff9a').setAlpha(0);
      c.add(t);
      this.tweens.add({ targets: t, alpha: 1, x: { from: x - 30, to: x }, scale: { from: 1.5, to: 1 }, duration: 300, delay: 700 + i * 220, ease: 'Back.Out' });
      this.time.delayedCall(700 + i * 220, () => this.burst(x + 10, y + 14, main ? 0xffd24a : 0x7dff9a, 10, 5100));
    });

    const unlocked = cls.skills.find((sk) => sk.unlock > fromLevel && sk.unlock <= p.level);
    const after1 = 700 + shown.length * 220 + 200;
    if (unlocked) {
      const t = txt(this, W / 2 + 40, 478, isUpgrade(cls.skills, unlocked) ? tr('SPELL UPGRADE: {spell}!', { spell: skName(unlocked) }) : tr('NEW SPELL: {spell}!', { spell: skName(unlocked) }), 28, '#ff9af0').setOrigin(0.5).setAlpha(0);
      c.add(t);
      this.tweens.add({ targets: t, alpha: 1, scale: { from: 2, to: 1 }, duration: 400, delay: after1, ease: 'Back.Out' });
    }
    const go = button(this, W - 120, H - 50, 190, 56, tr('Awesome!'), () => {
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

  private randomPotion(level: number, kind?: 'hp' | 'mp'): PotionDef {
    const k = kind ?? (chance(0.7) ? 'hp' : 'mp');
    return POTIONS.find((d) => d.kind === k && d.tier === tierForLevel(level))!;
  }

  private victoryPanel(loot: Item[], dropped: number, levels: number, perfect: boolean) {
    const p = current();
    this.say('');
    const c = this.add.container(0, 0).setDepth(4000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 150, 50, W - 300, H - 100, 0x1d1730, 0xffd24a));
    const title = txt(this, W / 2, 90, this.isBoss ? tr('BOSS DEFEATED!') : tr('VICTORY!'), 46, '#ffd24a').setOrigin(0.5);
    c.add(title);
    this.tweens.add({ targets: title, scale: { from: 0.4, to: 1 }, duration: 400, ease: 'Back.Out' });
    let y = 140;
    c.add(txt(this, W / 2, y, tr('Questions: {right} / {total} right', { right: this.questionsRight, total: this.questionsAsked }) + (perfect ? tr('  -  PERFECT! +25% XP') : ''), 20, perfect ? C.good : C.text).setOrigin(0.5));
    y += 34;
    const mana = this.manaBack > 0 ? tr('    +{n} mana', { n: this.manaBack }) : '';
    c.add(txt(this, W / 2, y, (p.level >= LEVEL_CAP && levels === 0
        ? tr('+{gold} gold (max level!)', { gold: fmtNum(this.earnedGold) })
        : tr('+{xp} XP    +{gold} gold', { xp: fmtNum(this.earnedXp), gold: fmtNum(this.earnedGold) })) + mana, 22).setOrigin(0.5));
    if (this.lowLevelXp && p.level < LEVEL_CAP) {
      y += 26;
      c.add(txt(this, W / 2, y, tr('Easy monsters give less XP. Try a deeper floor!'), 16, '#ffb36b').setOrigin(0.5));
    }
    y += 40;
    if (levels > 0) {
      const lv = txt(this, W / 2, y, tr('LEVEL UP! You are now level {level}!', { level: p.level }), 28, '#7dff9a').setOrigin(0.5);
      c.add(lv);
      this.tweens.add({ targets: lv, scale: 1.1, duration: 400, yoyo: true, repeat: -1 });
      this.burst(this.hero.x, this.hero.y, 0xffd24a, 40);
      const unlocked = classOf(p).skills.find((s) => s.unlock === p.level);
      if (unlocked) {
        y += 34;
        const upgrade = isUpgrade(classOf(p).skills, unlocked);
        c.add(txt(this, W / 2, y, upgrade ? tr('{spell} is stronger now!', { spell: skName(unlocked) }) : tr('New spell: {spell}! Open your Spellbook to use it.', { spell: skName(unlocked) }), 18, '#ffe9a0').setOrigin(0.5));
      }
      y += 40;
    }
    if (loot.length || this.potionLoot.length) {
      c.add(txt(this, W / 2, y, tr('Loot:'), 20, C.dim).setOrigin(0.5));
      y += 30;
    }
    if (loot.length) {
      loot.forEach((it, i) => {
        const r = RARITY[it.rarity];
        const iy = y + i * 46;
        const g = this.add.graphics();
        g.fillStyle(0x0f0b1a, 1).fillRoundedRect(W / 2 - 220, iy, 40, 40, 6);
        g.lineStyle(3, r.color, 1).strokeRoundedRect(W / 2 - 220, iy, 40, 40, 6);
        c.add(g);
        c.add(this.add.image(W / 2 - 200, iy + 20, ICON[it.base]).setScale(2));
        c.add(txt(this, W / 2 - 168, iy + 8, `${itemName(it)}  (${tr(r.name)})`, 19, r.css));
        if (r.rank >= 3) this.burst(W / 2 - 200, iy + 20, r.color, 20, 4100);
      });
      y += loot.length * 46;
    }
    if (this.potionLoot.length) {
      this.potionLoot.forEach((d, i) => {
        const px = W / 2 - 200 + i * 205;
        c.add(this.add.image(px, y + 16, d.icon).setScale(2));
        c.add(txt(this, px + 22, y + 6, getLang() === 'fr' ? tr(d.name) : d.name.replace(' Potion', ''), 15, d.kind === 'hp' ? '#ff9a9a' : '#9ac0ff'));
      });
      y += 36;
    }
    if (dropped) c.add(txt(this, W / 2, y + 4, tr('Your bag was full! {n} item(s) left behind.', { n: dropped }), 16, C.bad).setOrigin(0.5));
    if (this.isBoss) {
      const next = AREAS[(this.data0.bossArea ?? 0) + 1];
      const boss = tr(this.area().boss.shortName);
      const msg = next
        ? tr('A magic portal to {area} has opened! ({boss} will be back for more loot.)', { area: tr(next.name), boss })
        : tr('{boss} will be back... fight again for more loot!', { boss });
      c.add(txt(this, W / 2, H - 140, msg, 15, next ? '#c8a8ff' : C.dim, { align: 'center', wordWrap: { width: W - 340 } }).setOrigin(0.5));
    }
    c.add(button(this, W / 2, H - 92, 240, 60, tr('Continue'), () => this.exit('victory'), { color: 0x2f9a4a, size: 26 }));
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
    c.add(txt(this, W / 2, 160, tr('{boss} escaped!', { boss: tr(this.area().boss.shortName) }), 40, '#ffb36b').setOrigin(0.5));
    c.add(txt(this, W / 2, 220, tr('You got {right} of {total} right. You need {need}.', { right: this.bossRight, total: BOSS_QUESTIONS, need: BOSS_NEEDED }), 22).setOrigin(0.5));
    c.add(txt(this, W / 2, 262, tr('So close! Practice on some monsters and try again.'), 18, C.dim).setOrigin(0.5));
    c.add(button(this, W / 2, 360, 240, 60, tr('OK'), () => this.exit('bossFail'), { size: 26 }));
  }

  private lose() {
    stopMusic();
    sfx('defeat');
    this.say('');
    this.tweens.add({ targets: this.hero, angle: 90, alpha: 0.4, y: this.heroHome.y + 30, duration: 600 });
    const c = this.add.container(0, 0).setDepth(4000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 170, 120, W - 340, 300, 0x1d1730, 0xff6b6b));
    c.add(txt(this, W / 2, 165, tr('Knocked out!'), 40, '#ff8a8a').setOrigin(0.5));
    c.add(txt(this, W / 2, 230, tr("Don't worry - you keep all your loot and XP."), 20).setOrigin(0.5));
    c.add(txt(this, W / 2, 265, tr('Tip: drink potions and heal at the camp fountain.'), 18, C.dim).setOrigin(0.5));
    c.add(button(this, W / 2, 360, 260, 60, tr('Back to camp'), () => this.exit('defeat'), { size: 24 }));
  }

  private exit(result: 'victory' | 'defeat' | 'fled' | 'bossFail') {
    saveProfile(current());
    this.cameras.main.fadeOut(250);
    this.time.delayedCall(260, () => {
      if (this.isBoss && result !== 'defeat') this.scene.start('Dungeon', { floor: this.data0.lair, fromBattle: { result } });
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
    // Warrior skills each have their own move.
    if (sk.anim === 'cleave' || sk.anim === 'bash' || sk.anim === 'heroic' || sk.anim === 'execute' || sk.anim === 'storm' || sk.anim === 'thunderclap') {
      this.warriorMove(sk.anim, aim, target, onHit);
      return;
    }
    if (sk.anim === 'crusader' || sk.anim === 'judge' || sk.anim === 'consecrate' || sk.anim === 'sunfire' || sk.anim === 'flamestrike' || sk.anim === 'hammerthrow') {
      this.paladinMove(sk.anim, aim, target, onHit);
      return;
    }
    if (sk.anim === 'aimed' || sk.anim === 'multishot' || sk.anim === 'concuss' || sk.anim === 'venom' || sk.anim === 'rapid' || sk.anim === 'thornvolley') {
      this.rangerMove(sk.anim, aim, target, onHit);
      return;
    }
    if (sk.anim === 'drain' || sk.anim === 'bonespikes' || sk.anim === 'chill' || sk.anim === 'gravefrost' || sk.anim === 'lance') {
      this.necroMove(sk.anim, aim, target, onHit);
      return;
    }
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
        if (sk.anim === 'snow') {
          this.snowstorm(list, onHit);
          return;
        }
        if (sk.anim === 'orb') {
          this.bigOrb(list[0].sprite, sk.fx === 'arcane' ? 0x9a3aff : color, onHit);
          return;
        }
        let landed = 0;
        list.forEach((f, i) =>
          this.time.delayedCall(i * 90, () =>
            sk.fx === 'arrow'
              ? this.arrow(this.hero, f.sprite, () => ++landed === list.length && onHit())
              : sk.fx === 'lightning'
                ? this.lightning(this.hero, f.sprite, () => ++landed === list.length && onHit())
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
      this.floatText(f.sprite.x, f.sprite.y - 110, tr('CRITICAL!'), '#ffd24a', 24);
    }
    this.floatText(f.sprite.x, f.sprite.y - 70, `${r.dmg}`, r.crit ? '#ffd24a' : correct ? '#ffffff' : '#ffb36b', r.crit ? 46 : correct ? 38 : 30);
    if (!correct) this.floatText(f.sprite.x, f.sprite.y - 30, tr('half'), '#ffb36b', 18);
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

  /** Show the hero's pet (with its own health bar) beside the hero. */
  private showPet(pop: boolean) {
    const pet = current().pet;
    if (!pet) return;
    const x = this.heroHome.x - 150;
    const y = this.heroHome.y + 45;
    if (this.petSprite) {
      this.petBar?.set(pet.hp, pet.maxHp);
      this.sparkle(this.petSprite, 0x9a4aff, 12);
      return;
    }
    if (pop) this.puff(x, y, 0x9a4aff);
    const sp = this.add.image(x, y, pet.sprite).setScale(pop ? 0 : 4.5).setFlipX(true).setDepth(11);
    if (pop) this.tweens.add({ targets: sp, scale: 4.5, duration: 350, ease: 'Back.Out' });
    this.tweens.add({ targets: sp, y: y - 6, duration: 600, yoyo: true, repeat: -1, delay: 400 });
    this.petSprite = sp;
    this.petBar = new Bar(this, x - 40, y - 50, 80, 9, C.hp, false).setDepth(20);
    this.petBar.set(pet.hp, pet.maxHp, false);
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

  // ------------------------------------------------------------ paladin moves

  /** Holy Light: a beam from the sky onto the hero, golden rings rising. */
  private holyLight(onDone: () => void) {
    const { x, y } = this.hero;
    sfx('holy');
    const beam = this.add.rectangle(x, y + 50, 90, 700, 0xfff0a0, 0).setOrigin(0.5, 1).setDepth(9).setBlendMode('ADD');
    this.tweens.add({ targets: beam, fillAlpha: 0.5, duration: 200, yoyo: true, hold: 300, onComplete: () => beam.destroy() });
    for (let i = 0; i < 4; i++) {
      const r = this.add.ellipse(x, y + 40, 120, 30).setStrokeStyle(4, 0xffe066).setDepth(11);
      this.tweens.add({ targets: r, y: y - 80, alpha: 0, scaleX: 0.5, duration: 700, delay: i * 120, onComplete: () => r.destroy() });
    }
    this.sparkle(this.hero, 0xfff0a0, 24);
    this.tweens.add({ targets: this.hero, y: this.heroHome.y - 14, duration: 300, yoyo: true, ease: 'Sine.InOut', onComplete: onDone });
  }

  /** A golden cross of light. */
  private holyCross(x: number, y: number, size = 120) {
    for (const [w, h] of [[16, size], [size * 0.75, 16]]) {
      const bar = this.add.rectangle(x, y - size * 0.1, w, h, 0xfff0a0).setDepth(172).setBlendMode('ADD');
      this.tweens.add({ targets: bar, scale: 1.3, alpha: 0, duration: 450, onComplete: () => bar.destroy() });
    }
  }

  private paladinMove(kind: 'crusader' | 'judge' | 'consecrate' | 'sunfire' | 'flamestrike' | 'hammerthrow', aim: Foe, target: Foe | null, onHit: () => void) {
    const foes = this.alive();
    const t = target ?? aim;
    switch (kind) {
      case 'crusader': {
        // A blessed strike: gold slash and a cross of light.
        this.dashTo(t, () => {
          this.slash(t.sprite.x, t.sprite.y, 0xffe066);
          this.holyCross(t.sprite.x, t.sprite.y, 110);
          this.burst(t.sprite.x, t.sprite.y, 0xfff0a0, 14);
          onHit();
          this.goHome(160);
        });
        break;
      }
      case 'judge': {
        // A golden sigil locks onto the enemy, then a beam of judgement slams down.
        sfx('holy');
        this.castPose(() => {});
        const { x, y } = t.sprite;
        const sigil = this.add.container(x, y).setDepth(168);
        const g = this.add.graphics();
        g.lineStyle(4, 0xffe066, 1).strokeCircle(0, 0, 70).strokeCircle(0, 0, 52);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineBetween(Math.cos(a) * 52, Math.sin(a) * 52, Math.cos(a) * 70, Math.sin(a) * 70);
        }
        g.lineStyle(3, 0xfff0a0, 1).lineBetween(-40, 0, 40, 0).lineBetween(0, -40, 0, 40);
        sigil.add(g);
        sigil.setScale(0.2).setAlpha(0);
        this.tweens.add({ targets: sigil, scale: 1, alpha: 1, angle: 180, duration: 380, ease: 'Back.Out' });
        this.time.delayedCall(420, () => {
          const beam = this.add.rectangle(x, y + 30, 70, 700, 0xfff0a0, 0.75).setOrigin(0.5, 1).setDepth(169).setBlendMode('ADD');
          this.tweens.add({ targets: beam, scaleX: 0, alpha: 0, duration: 420, onComplete: () => beam.destroy() });
          this.ring(x, y, 0xffe066, 150, 8);
          this.cameras.main.flash(100, 255, 240, 170);
          this.cameras.main.shake(140, 0.01);
          this.tweens.add({ targets: sigil, scale: 0.6, alpha: 0, duration: 500, delay: 200, onComplete: () => sigil.destroy() });
          onHit();
        });
        break;
      }
      case 'consecrate': {
        // Holy ground spreads under every enemy and light rises from it.
        sfx('holy');
        this.castPose(() => {});
        foes.forEach((f, i) => {
          const { x, y } = f.sprite;
          const ground = this.add.ellipse(x, y + 46, 20, 8, 0xffe066, 0.55).setDepth(5).setBlendMode('ADD');
          ground.setStrokeStyle(3, 0xfff6c0);
          this.tweens.add({ targets: ground, width: 170, height: 46, duration: 300, delay: i * 80, ease: 'Quad.Out' });
          this.tweens.add({ targets: ground, alpha: 0, duration: 400, delay: 900 + i * 80, onComplete: () => ground.destroy() });
          this.time.delayedCall(250 + i * 80, () => {
            for (let k = 0; k < 4; k++) {
              const col = this.add.rectangle(x - 50 + k * 33, y + 46, 12, 10, 0xfff0a0, 0.8).setOrigin(0.5, 1).setDepth(167).setBlendMode('ADD');
              this.tweens.add({ targets: col, height: 130 + Math.random() * 60, alpha: 0, duration: 520, delay: k * 50, onComplete: () => col.destroy() });
            }
            this.burst(x, y + 30, 0xffe066, 10);
          });
        });
        this.time.delayedCall(320, onHit);
        break;
      }
      case 'sunfire': {
        // A little sun forms above the paladin and shoots a sunbeam.
        const sx = this.hero.x - 20;
        const sy = this.hero.y - 120;
        const sun = this.add.container(sx, sy).setDepth(168).setScale(0.2);
        const rays = this.add.graphics();
        rays.lineStyle(5, 0xffb030, 1);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          rays.lineBetween(Math.cos(a) * 30, Math.sin(a) * 30, Math.cos(a) * 46, Math.sin(a) * 46);
        }
        sun.add([this.add.image(0, 0, 'glow').setScale(7).setTint(0xff9a20).setBlendMode('ADD'), rays, this.add.circle(0, 0, 24, 0xffd24a), this.add.circle(-6, -6, 9, 0xfff6c0)]);
        this.tweens.add({ targets: sun, scale: 1, duration: 280, ease: 'Back.Out' });
        this.tweens.add({ targets: rays, angle: 360, duration: 900 });
        this.time.delayedCall(360, () => {
          const g = this.add.graphics().setDepth(167).setBlendMode('ADD');
          const draw = (w: number) => {
            g.clear();
            g.lineStyle(w, 0xff9a20, 0.6).lineBetween(sx, sy, t.sprite.x, t.sprite.y);
            g.lineStyle(w / 3, 0xfff6c0, 1).lineBetween(sx, sy, t.sprite.x, t.sprite.y);
          };
          draw(26);
          this.time.addEvent({ delay: 50, repeat: 4, callback: () => draw(Phaser.Math.Between(18, 30)) });
          this.time.delayedCall(260, () => g.destroy());
          this.burst(t.sprite.x, t.sprite.y, 0xff7a2a, 30);
          this.ring(t.sprite.x, t.sprite.y, 0xffb030, 120, 6);
          this.cameras.main.shake(120, 0.008);
          this.tweens.add({ targets: sun, scale: 0, alpha: 0, duration: 300, delay: 150, onComplete: () => sun.destroy() });
          onHit();
        });
        break;
      }
      case 'flamestrike': {
        // A circle marks each enemy, then a column of fire crashes down on it.
        sfx('fire');
        this.castPose(() => {});
        foes.forEach((f, i) => {
          const { x, y } = f.sprite;
          const mark = this.add.ellipse(x, y + 46, 150, 40).setStrokeStyle(4, 0xff5a20).setDepth(5);
          this.tweens.add({ targets: mark, alpha: 0.3, duration: 120, yoyo: true, repeat: 1 });
          this.time.delayedCall(260 + i * 110, () => {
            const col = this.add.rectangle(x, -20, 110, 10, 0xff7a20, 0.85).setOrigin(0.5, 0).setDepth(169).setBlendMode('ADD');
            const core = this.add.rectangle(x, -20, 40, 10, 0xfff0a0, 1).setOrigin(0.5, 0).setDepth(170).setBlendMode('ADD');
            this.tweens.add({
              targets: [col, core],
              height: y + 66,
              duration: 140,
              ease: 'Quad.In',
              onComplete: () => {
                this.burst(x, y + 30, 0xff5a20, 22);
                this.burst(x, y, 0xffd24a, 10);
                this.cameras.main.shake(100, 0.008);
                this.tweens.add({ targets: [col, core, mark], alpha: 0, scaleX: 0.2, duration: 380, onComplete: () => { col.destroy(); core.destroy(); mark.destroy(); } });
              },
            });
          });
        });
        this.time.delayedCall(420, onHit);
        break;
      }
      case 'hammerthrow': {
        // Throw a spinning golden hammer; it smashes the enemy and flies back.
        const hammer = this.add.container(this.hero.x - 30, this.hero.y - 10).setDepth(168);
        hammer.add(this.add.image(0, 0, 'glow').setScale(5).setTint(0xfff0a0).setBlendMode('ADD'));
        hammer.add(this.add.rectangle(0, 18, 10, 52, 0x8a5a2a).setStrokeStyle(2, 0x3a2410));
        hammer.add(this.add.rectangle(0, -10, 56, 30, 0xffd24a).setStrokeStyle(3, 0x7a5a10));
        const trail = this.add.particles(0, 0, 'dot', { follow: hammer, speed: 20, lifespan: 300, scale: { start: 1.2, end: 0 }, tint: [0xffe066, 0xffffff], blendMode: 'ADD', frequency: 14 }).setDepth(167);
        this.tweens.add({ targets: hammer, angle: -720, duration: 420 });
        this.tweens.add({
          targets: hammer,
          x: t.sprite.x,
          y: t.sprite.y,
          duration: 420,
          ease: 'Quad.In',
          onComplete: () => {
            sfx('boom');
            this.holyCross(t.sprite.x, t.sprite.y, 150);
            this.ring(t.sprite.x, t.sprite.y, 0xffe066, 170, 8);
            this.burst(t.sprite.x, t.sprite.y, 0xffe066, 26);
            this.cameras.main.shake(180, 0.014);
            onHit();
            this.tweens.add({ targets: hammer, angle: -1440, duration: 420 });
            this.tweens.add({
              targets: hammer,
              x: this.hero.x - 30,
              y: this.hero.y - 10,
              duration: 420,
              ease: 'Quad.Out',
              onComplete: () => {
                hammer.destroy();
                trail.stop();
                this.time.delayedCall(320, () => trail.destroy());
              },
            });
          },
        });
        break;
      }
    }
  }

  // ------------------------------------------------------------ warrior moves

  /** Run up to a foe; `then` is called on arrival. */
  private dashTo(f: Foe, then: () => void, duration = 220, dy = 0) {
    this.tweens.add({ targets: this.hero, x: f.sprite.x + (this.isBoss ? 170 : 110), y: f.sprite.y + dy, duration, ease: 'Quad.In', onComplete: then });
  }

  private goHome(delay = 160) {
    this.tweens.add({ targets: this.hero, x: this.heroHome.x, y: this.heroHome.y, angle: 0, scale: 6, duration: 340, delay, ease: 'Quad.Out' });
  }

  /** A jagged lightning line from (x1, y1) to (x2, y2) that flickers, then fades. */
  private zap(x1: number, y1: number, x2: number, y2: number, ms = 220, color = 0x9ad0ff) {
    const g = this.add.graphics().setDepth(170).setBlendMode('ADD');
    const draw = () => {
      g.clear();
      for (const [w, col, al] of [[9, color, 0.5], [3, 0xffffff, 1]] as const) {
        g.lineStyle(w, col, al);
        g.beginPath();
        g.moveTo(x1, y1);
        const n = 8;
        for (let i = 1; i < n; i++) {
          const t = i / n;
          const nx = -(y2 - y1);
          const ny = x2 - x1;
          const len = Math.hypot(nx, ny) || 1;
          const off = Phaser.Math.Between(-18, 18);
          g.lineTo(x1 + (x2 - x1) * t + (nx / len) * off, y1 + (y2 - y1) * t + (ny / len) * off);
        }
        g.lineTo(x2, y2);
        g.strokePath();
      }
    };
    draw();
    this.time.addEvent({ delay: 45, repeat: Math.max(1, Math.floor(ms / 45) - 1), callback: draw });
    this.time.delayedCall(ms, () => g.destroy());
  }

  /** Lightning crackling outwards from a point (on a hit, not a flying bolt). */
  private crackle(x: number, y: number, n = 6, reach = 90, color = 0x9ad0ff) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const r = reach * (0.6 + Math.random() * 0.5);
      this.zap(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, 340 + i * 30, color);
    }
    const glow = this.add.image(x, y, 'glow').setScale(8).setTint(color).setBlendMode('ADD').setDepth(165);
    this.tweens.add({ targets: glow, scale: 12, alpha: 0, duration: 560, onComplete: () => glow.destroy() });
  }

  private ring(x: number, y: number, color: number, to = 160, width = 6, ms = 420) {
    const r = this.add.circle(x, y, 10).setStrokeStyle(width, color).setDepth(165);
    this.tweens.add({ targets: r, radius: to, alpha: 0, duration: ms, onComplete: () => r.destroy() });
  }

  private warriorMove(kind: 'cleave' | 'bash' | 'heroic' | 'execute' | 'storm' | 'thunderclap', aim: Foe, target: Foe | null, onHit: () => void) {
    const foes = this.alive();
    switch (kind) {
      case 'cleave': {
        // One long, thick sweep through every enemy.
        const top = Math.min(...foes.map((f) => f.sprite.y));
        const bottom = Math.max(...foes.map((f) => f.sprite.y));
        const midY = (top + bottom) / 2;
        const x = aim.sprite.x;
        this.dashTo(aim, () => {
          const g = this.add.graphics({ x: x + 40, y: midY }).setDepth(170);
          const radius = Math.max(150, (bottom - top) / 2 + 110);
          const sweep = { t: 0 };
          this.tweens.add({
            targets: sweep,
            t: 1,
            duration: 230,
            ease: 'Quad.Out',
            onUpdate: () => {
              g.clear();
              const a0 = Phaser.Math.DegToRad(-80);
              const a1 = a0 + Phaser.Math.DegToRad(160) * sweep.t;
              g.lineStyle(22, 0xb0b8d0, 0.55).beginPath().arc(0, 0, radius, a0, a1, false).strokePath();
              g.lineStyle(10, 0xffffff, 1).beginPath().arc(0, 0, radius - 6, a0, a1, false).strokePath();
            },
            onComplete: () => this.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() }),
          });
          foes.forEach((f, i) => this.time.delayedCall(60 + i * 50, () => this.slash(f.sprite.x, f.sprite.y, 0xffffff)));
          this.cameras.main.shake(160, 0.006);
          onHit();
          this.goHome(260);
        }, 220, midY - aim.sprite.y);
        break;
      }
      case 'bash': {
        // A giant shield slams into them, grows and fades; they see stars.
        const t = target ?? aim;
        this.dashTo(t, () => {
          const sh = this.add.image(t.sprite.x + 30, t.sprite.y, 'icon_shield').setScale(3).setDepth(170);
          this.tweens.add({ targets: sh, scale: 11, alpha: 0, duration: 420, ease: 'Quad.Out', onComplete: () => sh.destroy() });
          this.ring(t.sprite.x, t.sprite.y, 0xffe066, 130, 8);
          this.cameras.main.shake(140, 0.01);
          this.tweens.add({ targets: t.sprite, x: t.sprite.x - 24, duration: 90, yoyo: true });
          // Dizzy stars circling overhead.
          for (let i = 0; i < 3; i++) {
            const star = this.add.star(t.sprite.x, t.sprite.y - 70, 5, 5, 11, 0xffe066).setDepth(171);
            const o = { a: (i / 3) * Math.PI * 2 };
            this.tweens.add({
              targets: o,
              a: o.a + Math.PI * 4,
              duration: 1100,
              onUpdate: () => star.setPosition(t.sprite.x + Math.cos(o.a) * 34, t.sprite.y - 70 + Math.sin(o.a) * 10),
              onComplete: () => star.destroy(),
            });
          }
          onHit();
          this.goHome(200);
        });
        break;
      }
      case 'heroic': {
        // Leap high, sword blazing gold, then crash down with a golden X.
        const t = target ?? aim;
        const glow = this.add.image(this.hero.x, this.hero.y, 'glow').setScale(6).setTint(0xffd24a).setBlendMode('ADD').setDepth(9);
        const follow = this.time.addEvent({ delay: 16, loop: true, callback: () => glow.setPosition(this.hero.x, this.hero.y) });
        const trail = this.add.particles(0, 0, 'dot', { follow: this.hero, speed: 40, lifespan: 420, scale: { start: 1.6, end: 0 }, tint: [0xffd24a, 0xffffff], blendMode: 'ADD', frequency: 12 }).setDepth(8);
        this.tweens.add({
          targets: this.hero,
          x: t.sprite.x + 150,
          y: t.sprite.y - 230,
          scale: 7,
          duration: 330,
          ease: 'Quad.Out',
          onComplete: () =>
            this.tweens.add({
              targets: this.hero,
              x: t.sprite.x + 90,
              y: t.sprite.y,
              angle: -20,
              duration: 170,
              ease: 'Quad.In',
              onComplete: () => {
                const { x, y } = t.sprite;
                for (const rot of [0.75, -0.75]) {
                  const bar = this.add.rectangle(x, y, 240, 20, 0xffd24a).setRotation(rot).setDepth(172).setStrokeStyle(3, 0xfff6c0);
                  const core = this.add.rectangle(x, y, 230, 6, 0xffffff).setRotation(rot).setDepth(173);
                  this.tweens.add({ targets: [bar, core], scaleX: 1.3, alpha: 0, duration: 420, delay: 80, onComplete: () => { bar.destroy(); core.destroy(); } });
                }
                const pillar = this.add.rectangle(x, y + 50, 120, 700, 0xffe066, 0.4).setOrigin(0.5, 1).setDepth(160).setBlendMode('ADD');
                this.tweens.add({ targets: pillar, scaleX: 0, alpha: 0, duration: 500, onComplete: () => pillar.destroy() });
                this.ring(x, y, 0xffd24a, 180, 8);
                this.burst(x, y, 0xffd24a, 30);
                this.cameras.main.flash(120, 255, 230, 140);
                this.cameras.main.shake(220, 0.014);
                follow.remove();
                glow.destroy();
                trail.stop();
                this.time.delayedCall(500, () => trail.destroy());
                onHit();
                this.goHome(240);
              },
            }),
        });
        break;
      }
      case 'execute': {
        // The screen darkens; a huge red blade falls like a guillotine.
        const t = target ?? aim;
        const dim = this.add.rectangle(0, 0, W, H, 0x2a0008, 0).setOrigin(0).setDepth(140);
        this.tweens.add({ targets: dim, fillAlpha: 0.45, duration: 200 });
        this.dashTo(t, () => {
          const { x, y } = t.sprite;
          const blade = this.add.container(x, -120).setDepth(172);
          blade.add(this.add.rectangle(0, 0, 34, 220, 0xd8dce8).setStrokeStyle(3, 0x5a0010));
          blade.add(this.add.triangle(0, 120, -17, 0, 17, 0, 0, 40, 0xd8dce8).setStrokeStyle(3, 0x5a0010));
          blade.add(this.add.rectangle(0, -110, 90, 18, 0x8a1020));
          blade.add(this.add.image(0, 0, 'glow').setScale(9).setTint(0xff3040).setBlendMode('ADD'));
          this.tweens.add({
            targets: blade,
            y: y - 60,
            duration: 220,
            ease: 'Quad.In',
            onComplete: () => {
              for (const rot of [0.8, -0.8]) {
                const cut = this.add.rectangle(x, y, 200, 12, 0xff3040).setRotation(rot).setDepth(173).setBlendMode('ADD');
                this.tweens.add({ targets: cut, scaleX: 1.4, alpha: 0, duration: 450, onComplete: () => cut.destroy() });
              }
              this.burst(x, y, 0xff3040, 34);
              this.ring(x, y, 0xff3040, 170, 8);
              this.cameras.main.shake(260, 0.02);
              this.tweens.add({ targets: [blade, dim], alpha: 0, duration: 400, delay: 150, onComplete: () => { blade.destroy(); dim.destroy(); } });
              onHit();
              this.goHome(260);
            },
          });
        }, 260);
        break;
      }
      case 'storm': {
        // Lightning strikes the warrior first (charging up), then the hit crackles.
        const t = target ?? aim;
        sfx('lightning');
        for (let i = 0; i < 2; i++) this.time.delayedCall(i * 140, () => this.zap(this.hero.x + Phaser.Math.Between(-30, 30), -20, this.hero.x, this.hero.y - 10, 200, 0xffe066));
        this.hero.setTint(0x9ad0ff);
        const aura = this.add.image(this.hero.x, this.hero.y, 'glow').setScale(7).setTint(0x6ab8ff).setBlendMode('ADD').setDepth(9);
        this.tweens.add({ targets: aura, alpha: 0.4, scale: 8.5, duration: 160, yoyo: true, repeat: 2 });
        this.time.delayedCall(420, () => {
          const follow = this.time.addEvent({ delay: 16, loop: true, callback: () => aura.setPosition(this.hero.x, this.hero.y) });
          this.dashTo(t, () => {
            sfx('lightning');
            this.slash(t.sprite.x, t.sprite.y, 0xffe066);
            this.crackle(t.sprite.x, t.sprite.y, 7, 100, 0x9ad0ff);
            this.cameras.main.flash(90, 200, 230, 255);
            follow.remove();
            aura.destroy();
            this.hero.clearTint();
            onHit();
            this.goHome(220);
          }, 180);
        });
        break;
      }
      case 'thunderclap': {
        // Jump above them, slam down: a shockwave, then lightning zaps out of each enemy.
        const top = Math.min(...foes.map((f) => f.sprite.y));
        const bottom = Math.max(...foes.map((f) => f.sprite.y));
        const midY = (top + bottom) / 2;
        const x = aim.sprite.x + 70;
        this.tweens.add({
          targets: this.hero,
          x,
          y: top - 200,
          duration: 300,
          ease: 'Quad.Out',
          onComplete: () =>
            this.tweens.add({
              targets: this.hero,
              y: midY,
              duration: 160,
              ease: 'Quad.In',
              onComplete: () => {
                sfx('boom');
                this.cameras.main.shake(260, 0.016);
                this.ring(x, midY + 40, 0x9ad0ff, 260, 10, 500);
                this.ring(x, midY + 40, 0xffffff, 200, 4, 400);
                this.burst(x, midY + 50, 0xb0a080, 24);
                foes.forEach((f, i) =>
                  this.time.delayedCall(80 + i * 90, () => {
                    sfx('lightning');
                    this.crackle(f.sprite.x, f.sprite.y, 5, 80);
                    this.zap(f.sprite.x, f.sprite.y, f.sprite.x + Phaser.Math.Between(-20, 20), f.sprite.y - 160, 260);
                  }),
                );
                onHit();
                this.goHome(320);
              },
            }),
        });
        break;
      }
    }
  }

  // ------------------------------------------------------------ necromancer moves

  /** A cartoon skull drawn with shapes (for ghosts and big shadow magic). */
  private skull(x: number, y: number, size: number, color: number) {
    const c = this.add.container(x, y);
    const r = size / 2;
    c.add(this.add.image(0, 0, 'glow').setScale(size / 12).setTint(color).setBlendMode('ADD'));
    c.add(this.add.circle(0, -r * 0.15, r, color));
    c.add(this.add.rectangle(0, r * 0.75, r * 1.1, r * 0.55, color));
    c.add(this.add.circle(-r * 0.4, -r * 0.1, r * 0.28, 0x120a1c));
    c.add(this.add.circle(r * 0.4, -r * 0.1, r * 0.28, 0x120a1c));
    c.add(this.add.triangle(0, r * 0.35, 0, r * 0.22, r * 0.12, 0, r * 0.24, r * 0.22, 0x120a1c));
    for (let k = -1; k <= 1; k++) c.add(this.add.rectangle(k * r * 0.3, r * 0.82, 3, r * 0.4, 0x120a1c));
    return c;
  }

  /** Raise Skeleton: a glowing rune circle, ghost flames, and bones bursting out of the ground. */
  private raiseDead(onDone: () => void) {
    const x = this.heroHome.x - 150;
    const y = this.heroHome.y + 45;
    sfx('shadow');
    this.castPose(() => {});
    const circle = this.add.container(x, y + 40).setDepth(6).setScale(0.1, 0.03);
    const g = this.add.graphics();
    g.lineStyle(4, 0xb070ff, 1).strokeCircle(0, 0, 80).strokeCircle(0, 0, 64);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const b = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
      g.lineBetween(Math.cos(a) * 64, Math.sin(a) * 64, Math.cos(b) * 64, Math.sin(b) * 64);
    }
    circle.add([this.add.image(0, 0, 'glow').setScale(14).setTint(0x9a4aff).setBlendMode('ADD').setAlpha(0.6), g]);
    this.tweens.add({ targets: circle, scaleX: 1, scaleY: 0.32, duration: 320, ease: 'Back.Out' });
    this.tweens.add({ targets: g, angle: 180, duration: 1100 });
    for (let i = 0; i < 16; i++) {
      const f = this.add.image(x + Phaser.Math.Between(-70, 70), y + 40, 'dot').setScale(1.6).setTint(i % 3 ? 0x9a4aff : 0x7aff9a).setBlendMode('ADD').setDepth(12);
      this.tweens.add({ targets: f, y: y - Phaser.Math.Between(40, 120), alpha: 0, scale: 0.3, duration: 700, delay: 150 + i * 30, onComplete: () => f.destroy() });
    }
    this.time.delayedCall(500, () => {
      this.burst(x, y + 30, 0xe8e0d0, 18);
      this.cameras.main.shake(120, 0.008);
      for (let i = 0; i < 6; i++) {
        const bone = this.add.rectangle(x, y + 30, 18, 5, 0xe8e0d0).setDepth(13);
        this.tweens.add({ targets: bone, x: x + Phaser.Math.Between(-80, 80), y: y - Phaser.Math.Between(20, 90), angle: 540, alpha: 0, duration: 600, ease: 'Quad.Out', onComplete: () => bone.destroy() });
      }
      onDone();
    });
    this.tweens.add({ targets: circle, alpha: 0, duration: 400, delay: 1000, onComplete: () => circle.destroy() });
  }

  private necroMove(kind: 'drain' | 'bonespikes' | 'chill' | 'gravefrost' | 'lance', aim: Foe, target: Foe | null, onHit: () => void) {
    const foes = this.alive();
    const t = target ?? aim;
    const { x: tx, y: ty } = t.sprite;
    const hx = this.hero.x - 30;
    const hy = this.hero.y - 10;
    switch (kind) {
      case 'drain': {
        // A dark wavy tendril grabs the enemy and pulls red life orbs back to the hero.
        this.castPose(() => {});
        const g = this.add.graphics().setDepth(160).setBlendMode('ADD');
        const wave = { p: 0, len: 0 };
        const draw = () => {
          g.clear();
          for (const [w, col, al] of [[12, 0x6a2aaa, 0.6], [4, 0xd0a0ff, 1]] as const) {
            g.lineStyle(w, col, al).beginPath();
            const n = 24;
            for (let i = 0; i <= n * wave.len; i++) {
              const k = i / n;
              const px = hx + (tx - hx) * k;
              const py = hy + (ty - hy) * k + Math.sin(k * Math.PI * 4 + wave.p) * 18 * Math.sin(k * Math.PI);
              if (i === 0) g.moveTo(px, py);
              else g.lineTo(px, py);
            }
            g.strokePath();
          }
        };
        this.tweens.add({ targets: wave, len: 1, duration: 260, onUpdate: draw });
        this.tweens.add({ targets: wave, p: Math.PI * 8, duration: 1100, onUpdate: draw, onComplete: () => this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() }) });
        this.time.delayedCall(280, () => {
          this.burst(tx, ty, 0xb070ff, 16);
          onHit();
          for (let i = 0; i < 10; i++) {
            const o = this.add.image(tx, ty, 'glow').setScale(1.3).setTint(i % 2 ? 0xff4a6a : 0x7dff9a).setBlendMode('ADD').setDepth(162);
            const cur = { k: 0 };
            this.tweens.add({
              targets: cur,
              k: 1,
              duration: 520,
              delay: i * 55,
              ease: 'Sine.In',
              onUpdate: () => o.setPosition(tx + (hx - tx) * cur.k, ty + (hy - ty) * cur.k - Math.sin(cur.k * Math.PI) * 50),
              onComplete: () => o.destroy(),
            });
          }
          this.time.delayedCall(600, () => this.sparkle(this.hero, 0x7dff9a, 14));
        });
        break;
      }
      case 'bonespikes': {
        // The ground cracks and sharp bones burst up under every enemy.
        this.castPose(() => {});
        foes.forEach((f, i) => {
          const { x, y } = f.sprite;
          const crack = this.add.graphics({ x, y: y + 46 }).setDepth(5);
          crack.lineStyle(3, 0x120a1c, 1);
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            crack.lineBetween(0, 0, Math.cos(a) * 60, Math.sin(a) * 16);
          }
          crack.setScale(0);
          this.tweens.add({ targets: crack, scale: 1, duration: 200, delay: i * 90 });
          this.tweens.add({ targets: crack, alpha: 0, duration: 400, delay: 1000, onComplete: () => crack.destroy() });
          this.time.delayedCall(220 + i * 90, () => {
            const spikes: Phaser.GameObjects.Triangle[] = [];
            for (let k = 0; k < 7; k++) {
              const h = 60 + Math.random() * 50 + (k === 3 ? 40 : 0);
              const sp = this.add.triangle(x - 60 + k * 20, y + 50, 0, h, 9, 0, 18, h, k % 2 ? 0xe8e0d0 : 0xcfc4b0).setOrigin(0.5, 1).setStrokeStyle(2, 0x6a5a4a).setScale(1, 0).setDepth(f.sprite.depth + 1);
              spikes.push(sp);
              this.tweens.add({ targets: sp, scaleY: 1, duration: 130, delay: k * 25, ease: 'Back.Out' });
            }
            this.burst(x, y + 40, 0xb070ff, 12);
            this.cameras.main.shake(100, 0.008);
            this.tweens.add({ targets: spikes, scaleY: 0, alpha: 0, duration: 300, delay: 600, onComplete: () => spikes.forEach((s) => s.destroy()) });
          });
        });
        this.time.delayedCall(300, onHit);
        break;
      }
      case 'chill': {
        // A ghost skull flies over, breathes frost and freezes the enemy in ice.
        const sk = this.skull(hx, hy - 30, 40, 0xbfe8ff).setDepth(165).setAlpha(0);
        this.tweens.add({ targets: sk, alpha: 0.9, duration: 150 });
        this.tweens.add({
          targets: sk,
          x: tx + 20,
          y: ty - 40,
          duration: 420,
          ease: 'Sine.InOut',
          onUpdate: () => sk.setY(sk.y + Math.sin(sk.x / 30) * 1.5),
          onComplete: () => {
            this.burst(tx, ty, 0xdff4ff, 26);
            const ice = this.add.rectangle(tx, ty, 100, 110, 0x8fd8ff, 0.45).setStrokeStyle(4, 0xffffff).setDepth(t.sprite.depth + 1).setScale(0.3);
            const shine = this.add.rectangle(tx - 26, ty - 20, 10, 60, 0xffffff, 0.6).setDepth(t.sprite.depth + 2).setAngle(20).setScale(0.3);
            this.tweens.add({ targets: [ice, shine], scale: 1, duration: 200, ease: 'Back.Out' });
            this.ring(tx, ty, 0x8fd8ff, 120, 6);
            t.sprite.setTint(0x8fd8ff);
            this.time.delayedCall(900, () => t.sprite.clearTint());
            this.tweens.add({ targets: [ice, shine], alpha: 0, duration: 400, delay: 700, onComplete: () => { ice.destroy(); shine.destroy(); } });
            this.tweens.add({ targets: sk, alpha: 0, scale: 1.6, duration: 300, onComplete: () => sk.destroy() });
            onHit();
          },
        });
        break;
      }
      case 'gravefrost': {
        // Icy grave fog rolls over the enemies, ghost faces swirl and ice shards stab up.
        this.castPose(() => {});
        this.cameras.main.flash(140, 160, 200, 255, false);
        const fog: Phaser.GameObjects.Image[] = [];
        for (let i = 0; i < 14; i++) {
          const f = this.add.image(this.hero.x - 40, this.hero.y + Phaser.Math.Between(-60, 80), 'glow').setScale(Phaser.Math.FloatBetween(4, 7)).setTint(i % 3 ? 0x7ab8ff : 0xb070ff).setBlendMode('ADD').setAlpha(0.5).setDepth(158);
          fog.push(f);
          const goal = foes[i % foes.length].sprite;
          this.tweens.add({ targets: f, x: goal.x + Phaser.Math.Between(-60, 60), y: goal.y + Phaser.Math.Between(-30, 40), duration: 520, delay: i * 20, ease: 'Sine.Out' });
        }
        foes.forEach((f, i) => {
          const ghost = this.skull(f.sprite.x + 50, f.sprite.y - 40, 26, 0xdff4ff).setDepth(166).setAlpha(0);
          this.tweens.add({ targets: ghost, alpha: 0.8, x: f.sprite.x - 40, y: f.sprite.y - 70, duration: 700, delay: 200 + i * 80, onComplete: () => this.tweens.add({ targets: ghost, alpha: 0, duration: 200, onComplete: () => ghost.destroy() }) });
          this.time.delayedCall(480 + i * 90, () => {
            for (let k = 0; k < 5; k++) {
              const h = 50 + Math.random() * 40;
              const sh = this.add.triangle(f.sprite.x - 48 + k * 24, f.sprite.y + 48, 0, h, 10, 0, 20, h, k % 2 ? 0xbfe8ff : 0x7ac8ff).setOrigin(0.5, 1).setStrokeStyle(2, 0xffffff).setScale(1, 0).setDepth(f.sprite.depth + 1);
              this.tweens.add({ targets: sh, scaleY: 1, duration: 120, delay: k * 30, ease: 'Back.Out' });
              this.tweens.add({ targets: sh, alpha: 0, duration: 300, delay: 700, onComplete: () => sh.destroy() });
            }
            this.burst(f.sprite.x, f.sprite.y, 0xdff4ff, 12);
          });
        });
        this.tweens.add({ targets: fog, alpha: 0, duration: 500, delay: 900, onComplete: () => fog.forEach((f) => f.destroy()) });
        this.time.delayedCall(520, onHit);
        break;
      }
      case 'lance': {
        // A huge spear of darkness forms over the hero and is hurled through the enemy.
        const lx = this.hero.x;
        const ly = this.hero.y - 110;
        const lance = this.add.container(lx, ly).setDepth(166).setScale(0.2).setAlpha(0);
        lance.add([
          this.add.image(0, 0, 'glow').setScale(9, 2.4).setTint(0x9a4aff).setBlendMode('ADD'),
          this.add.rectangle(10, 0, 130, 10, 0x2a0a4a).setStrokeStyle(2, 0xd0a0ff),
          this.add.triangle(-72, 0, 0, 12, 34, 0, 34, 24, 0xd0a0ff).setStrokeStyle(2, 0xffffff),
          this.add.triangle(76, 0, 0, 0, 20, 10, 0, 20, 0x6a2aaa),
        ]);
        this.castPose(() => {});
        this.tweens.add({ targets: lance, scale: 1.2, alpha: 1, duration: 360, ease: 'Back.Out' });
        for (let i = 0; i < 18; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = this.add.image(lx + Math.cos(a) * 120, ly + Math.sin(a) * 70, 'dot').setTint(0xb070ff).setBlendMode('ADD').setDepth(165);
          this.tweens.add({ targets: d, x: lx, y: ly, alpha: 0.2, duration: 360, delay: i * 12, onComplete: () => d.destroy() });
        }
        this.time.delayedCall(440, () => {
          lance.setRotation(Phaser.Math.Angle.Between(tx, ty, lx, ly));
          const trail = this.add.particles(0, 0, 'dot', { follow: lance, speed: 40, lifespan: 400, scale: { start: 1.4, end: 0 }, tint: [0x9a4aff, 0x2a0a4a], blendMode: 'ADD', frequency: 8 }).setDepth(164);
          this.tweens.add({
            targets: lance,
            x: tx,
            y: ty,
            duration: 170,
            ease: 'Quad.In',
            onComplete: () => {
              trail.stop();
              this.time.delayedCall(420, () => trail.destroy());
              this.cameras.main.shake(200, 0.016);
              this.burst(tx, ty, 0x9a4aff, 34);
              this.burst(tx, ty, 0x120a1c, 14);
              for (let k = 0; k < 3; k++) this.time.delayedCall(k * 90, () => this.ring(tx, ty, k % 2 ? 0xd0a0ff : 0x6a2aaa, 140 + k * 30, 7));
              this.tweens.add({ targets: lance, x: tx - 180, y: ty + (ty - ly) * 0.3, alpha: 0, duration: 260, onComplete: () => lance.destroy() });
              onHit();
            },
          });
        });
        break;
      }
    }
  }

  // ------------------------------------------------------------ ranger moves

  /** Where arrows leave the ranger's bow. */
  private bowTip() {
    return { x: this.hero.x - 34, y: this.hero.y - 6 };
  }

  /** A flying arrow (shaft, head, feathers) from (x0, y0) to (x1, y1). */
  private shot(
    x0: number, y0: number, x1: number, y1: number, onDone: () => void,
    o: { shaft?: number; head?: number; glow?: number; trail?: number; scale?: number; ms?: number; ease?: string; thorns?: boolean } = {},
  ) {
    const c = this.add.container(x0, y0).setDepth(162).setRotation(Phaser.Math.Angle.Between(x0, y0, x1, y1)).setScale(1.4 * (o.scale ?? 1));
    if (o.glow !== undefined) c.add(this.add.image(0, 0, 'glow').setScale(3, 1.4).setTint(o.glow).setBlendMode('ADD'));
    c.add(this.add.rectangle(-4, 0, 36, 4, o.shaft ?? 0xe8d8a0));
    c.add(this.add.triangle(20, 0, 0, 0, 12, 6, 0, 12, o.head ?? 0xd0d0e0));
    c.add(this.add.triangle(-20, -4, 0, 0, 10, 4, 0, 4, 0xd04a4a));
    c.add(this.add.triangle(-20, 4, 0, 0, 10, 0, 0, 4, 0xd04a4a));
    if (o.thorns) for (let k = 0; k < 3; k++) c.add(this.add.triangle(-12 + k * 9, -4, 0, 4, 3, 0, 6, 4, 0x3a8a2a));
    const trail = o.trail === undefined ? null : this.add.particles(0, 0, 'dot', {
      follow: c, speed: 20, lifespan: 320, scale: { start: 0.8, end: 0 }, tint: o.trail, blendMode: 'ADD', frequency: 14,
    }).setDepth(161);
    this.tweens.add({
      targets: c,
      x: x1,
      y: y1,
      duration: o.ms ?? 200,
      ease: o.ease ?? 'Linear',
      onComplete: () => {
        c.destroy();
        trail?.stop();
        if (trail) this.time.delayedCall(360, () => trail.destroy());
        onDone();
      },
    });
  }

  /** Pull the bowstring back, then let go. */
  private drawBow(hold: number, then: () => void) {
    this.tweens.add({ targets: this.hero, x: this.heroHome.x + 18, duration: hold, ease: 'Sine.Out', onComplete: () => {
      then();
      this.tweens.add({ targets: this.hero, x: this.heroHome.x, duration: 120, ease: 'Back.Out' });
    } });
  }

  /** Little stars circling a stunned enemy's head. */
  private dizzy(f: Foe) {
    const stars = [0, 1, 2].map(() => this.add.star(f.sprite.x, f.sprite.y - 60, 5, 7, 16, 0xffe066).setStrokeStyle(2, 0xffffff).setDepth(171));
    const spin = { a: 0 };
    this.tweens.add({
      targets: spin,
      a: Math.PI * 4,
      duration: 1100,
      onUpdate: () => stars.forEach((s, i) => {
        const a = spin.a + (i / 3) * Math.PI * 2;
        s.setPosition(f.sprite.x + Math.cos(a) * 40, f.sprite.y - 42 + Math.sin(a) * 12).setAngle(spin.a * 60);
      }),
      onComplete: () => this.tweens.add({ targets: stars, alpha: 0, duration: 200, onComplete: () => stars.forEach((s) => s.destroy()) }),
    });
  }

  private rangerMove(kind: 'aimed' | 'multishot' | 'concuss' | 'venom' | 'rapid' | 'thornvolley', aim: Foe, target: Foe | null, onHit: () => void) {
    const foes = this.alive();
    const t = target ?? aim;
    const { x: tx, y: ty } = t.sprite;
    switch (kind) {
      case 'aimed': {
        // A red target locks on, the bow glows, then one perfect glowing arrow.
        const ret = this.add.container(tx, ty).setDepth(168).setScale(2.2).setAlpha(0);
        const g = this.add.graphics();
        g.lineStyle(4, 0xff4a4a, 1).strokeCircle(0, 0, 56).strokeCircle(0, 0, 8);
        g.lineBetween(-76, 0, -30, 0).lineBetween(30, 0, 76, 0).lineBetween(0, -76, 0, -30).lineBetween(0, 30, 0, 76);
        ret.add(g);
        this.tweens.add({ targets: ret, scale: 1, alpha: 1, angle: 90, duration: 420, ease: 'Quad.Out' });
        const b = this.bowTip();
        const gleam = this.add.image(b.x, b.y, 'glow').setScale(0.5).setTint(0xffe066).setBlendMode('ADD').setDepth(163);
        this.tweens.add({ targets: gleam, scale: 3, duration: 420 });
        this.drawBow(440, () => {
          gleam.destroy();
          const p = this.bowTip();
          const streak = this.add.graphics().setDepth(160).setBlendMode('ADD');
          streak.lineStyle(10, 0xffe066, 0.5).lineBetween(p.x, p.y, tx, ty);
          streak.lineStyle(3, 0xffffff, 1).lineBetween(p.x, p.y, tx, ty);
          this.tweens.add({ targets: streak, alpha: 0, duration: 320, onComplete: () => streak.destroy() });
          this.shot(p.x, p.y, tx, ty, () => {
            this.ring(tx, ty, 0xffe066, 130, 7);
            this.burst(tx, ty, 0xfff0a0, 24);
            this.cameras.main.shake(140, 0.01);
            this.tweens.add({ targets: ret, scale: 0.4, alpha: 0, duration: 300, onComplete: () => ret.destroy() });
            onHit();
          }, { glow: 0xffe066, trail: 0xfff0a0, scale: 1.4, ms: 110 });
        });
        break;
      }
      case 'multishot': {
        // A fan of arrows: three for every enemy.
        this.drawBow(200, () => {
          const p = this.bowTip();
          const total = foes.length * 3;
          let landed = 0;
          foes.forEach((f, i) => {
            for (let k = 0; k < 3; k++) {
              this.time.delayedCall(i * 50 + k * 45, () =>
                this.shot(p.x, p.y + (k - 1) * 10, f.sprite.x + Phaser.Math.Between(-10, 10), f.sprite.y + (k - 1) * 22, () => {
                  this.burst(f.sprite.x, f.sprite.y + (k - 1) * 22, 0xe8d8a0, 5);
                  if (++landed === total) onHit();
                }, { trail: 0xfff0c0, ms: 220 }),
              );
            }
          });
        });
        break;
      }
      case 'concuss': {
        // A heavy blue arrow that thuds in with a shockwave and dizzy stars.
        this.drawBow(300, () => {
          const p = this.bowTip();
          this.shot(p.x, p.y, tx, ty, () => {
            this.cameras.main.shake(200, 0.016);
            this.ring(tx, ty, 0x8fd8ff, 150, 9);
            this.time.delayedCall(90, () => this.ring(tx, ty, 0xffffff, 110, 5));
            this.burst(tx, ty, 0x8fd8ff, 22);
            this.dizzy(t);
            onHit();
          }, { shaft: 0x6a7a9a, head: 0x8fd8ff, glow: 0x6ab8ff, trail: 0x8fd8ff, scale: 1.7, ms: 240, ease: 'Quad.In' });
        });
        break;
      }
      case 'venom': {
        // A dripping green arrow, then a bubbling poison cloud.
        this.drawBow(220, () => {
          const p = this.bowTip();
          this.shot(p.x, p.y, tx, ty, () => {
            for (let i = 0; i < 9; i++) {
              const c = this.add.circle(tx + Phaser.Math.Between(-40, 40), ty + Phaser.Math.Between(-30, 30), Phaser.Math.Between(14, 26), i % 2 ? 0x5aa040 : 0x9ae04a, 0.55).setDepth(166);
              this.tweens.add({ targets: c, scale: 2, y: c.y - 40, alpha: 0, duration: 800, delay: i * 40, onComplete: () => c.destroy() });
            }
            for (let i = 0; i < 12; i++) {
              const d = this.add.circle(tx + Phaser.Math.Between(-50, 50), ty + 30, 4, 0xb8ff6a).setDepth(167);
              this.tweens.add({ targets: d, y: ty - Phaser.Math.Between(60, 120), alpha: 0, duration: 700, delay: 100 + i * 50, onComplete: () => d.destroy() });
            }
            this.time.delayedCall(120, () => t.sprite.setTint(0x8ae04a));
            this.time.delayedCall(800, () => t.sprite.clearTint());
            onHit();
          }, { shaft: 0x4a7a2a, head: 0x9ae04a, glow: 0x5ad04a, trail: 0x7ad04a, scale: 1.2, ms: 230 });
        });
        break;
      }
      case 'rapid': {
        // Seven quick arrows, one after another.
        const n = 7;
        let landed = 0;
        for (let i = 0; i < n; i++) {
          this.time.delayedCall(i * 75, () => {
            sfx('arrow');
            this.tweens.add({ targets: this.hero, x: this.heroHome.x + 10, duration: 30, yoyo: true });
            const p = this.bowTip();
            this.shot(p.x, p.y + Phaser.Math.Between(-6, 6), tx + Phaser.Math.Between(-8, 8), ty + Phaser.Math.Between(-24, 24), () => {
              this.burst(tx, ty, 0xfff0c0, 5);
              this.tweens.add({ targets: t.sprite, x: t.home.x - 6, duration: 30, yoyo: true });
              if (++landed === n) {
                this.ring(tx, ty, 0xfff0c0, 110, 5);
                onHit();
              }
            }, { trail: 0xfff0c0, ms: 150 });
          });
        }
        break;
      }
      case 'thornvolley': {
        // One glowing arrow into the sky, then thorny arrows rain down and vines sprout.
        this.drawBow(220, () => {
          const p = this.bowTip();
          this.shot(p.x, p.y, p.x - 120, -40, () => {}, { glow: 0x7ad04a, trail: 0x9aff6a, scale: 1.3, ms: 260 });
        });
        const per = 6;
        let landed = 0;
        foes.forEach((f, i) => {
          for (let k = 0; k < per; k++) {
            this.time.delayedCall(520 + i * 70 + k * 55, () => {
              const x = f.sprite.x + Phaser.Math.Between(-55, 55);
              const y = f.sprite.y + Phaser.Math.Between(-30, 36);
              this.shot(x + 70, -40, x, y, () => {
                this.burst(x, y, 0x9aff6a, 5);
                if (++landed === foes.length * per) onHit();
              }, { shaft: 0x4a7a2a, head: 0x9ae04a, trail: 0x7ad04a, thorns: true, ms: 260, ease: 'Quad.In' });
            });
          }
          this.time.delayedCall(780 + i * 70, () => {
            for (let k = 0; k < 6; k++) {
              const h = 40 + Math.random() * 40;
              const sp = this.add.triangle(f.sprite.x - 50 + k * 20, f.sprite.y + 48, 0, h, 8, 0, 16, h, k % 2 ? 0x3a8a2a : 0x6ad04a).setOrigin(0.5, 1).setScale(1, 0).setDepth(12);
              this.tweens.add({ targets: sp, scaleY: 1, duration: 160, delay: k * 40, ease: 'Back.Out' });
              this.tweens.add({ targets: sp, scaleY: 0, alpha: 0, duration: 300, delay: 700, onComplete: () => sp.destroy() });
            }
          });
        });
        break;
      }
    }
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

  /** A big glowing ball (Fireball, Arcane Blast) that explodes on impact. */
  private bigOrb(to: Phaser.GameObjects.Image, color: number, onHit: () => void) {
    const x0 = this.hero.x - 40;
    const y0 = this.hero.y - 20;
    const orb = this.add.image(x0, y0, 'glow').setScale(0.5).setTint(color).setBlendMode('ADD').setDepth(160);
    const core = this.add.circle(x0, y0, 4, color).setDepth(161);
    const shine = this.add.circle(x0, y0, 2, 0xffffff).setDepth(162);
    const trail = this.add.particles(0, 0, 'dot', {
      follow: orb, speed: 50, lifespan: 420, scale: { start: 1.6, end: 0 }, tint: [color, 0xffffff], blendMode: 'ADD', frequency: 10,
    }).setDepth(159);
    // Charge up, then fly.
    this.tweens.add({ targets: orb, scale: 7, duration: 300, ease: 'Back.Out' });
    this.tweens.add({ targets: core, radius: 22, duration: 300 });
    this.tweens.add({ targets: shine, radius: 9, duration: 300 });
    this.time.delayedCall(320, () =>
      this.tweens.add({
        targets: [orb, core, shine],
        x: to.x,
        y: to.y,
        duration: 420,
        ease: 'Quad.In',
        onComplete: () => {
          orb.destroy();
          core.destroy();
          shine.destroy();
          trail.stop();
          this.time.delayedCall(450, () => trail.destroy());
          this.burst(to.x, to.y, color, 34);
          this.burst(to.x, to.y, 0xffffff, 12);
          const ring = this.add.circle(to.x, to.y, 10).setStrokeStyle(5, color).setDepth(165);
          this.tweens.add({ targets: ring, radius: 90, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
          this.cameras.main.shake(160, 0.008);
          onHit();
        },
      }),
    );
  }

  /** Blizzard: a swirl of white snowflakes blows across into every target. */
  private snowstorm(list: Foe[], onHit: () => void) {
    this.cameras.main.flash(140, 200, 230, 255, false);
    const n = 70;
    let done = false;
    for (let i = 0; i < n; i++) {
      const f = list[i % list.length];
      const flake = this.add.image(this.hero.x - 30 + Phaser.Math.Between(-30, 30), this.hero.y - 60 + Phaser.Math.Between(-90, 50), 'dot')
        .setScale(Phaser.Math.FloatBetween(0.8, 1.8))
        .setTint(i % 4 ? 0xffffff : 0xbfe8ff)
        .setDepth(160);
      this.tweens.add({
        targets: flake,
        x: f.sprite.x + Phaser.Math.Between(-45, 45),
        y: f.sprite.y + Phaser.Math.Between(-45, 35),
        angle: 360,
        duration: Phaser.Math.Between(420, 620),
        delay: i * 9,
        ease: 'Sine.In',
        onComplete: () => {
          flake.destroy();
          if (!done && i >= n * 0.6) {
            done = true;
            list.forEach((x) => this.burst(x.sprite.x, x.sprite.y, 0xdff4ff, 14));
            onHit();
          }
        },
      });
    }
  }

  /** A crackling zig-zag lightning bolt. */
  private lightning(from: Phaser.GameObjects.Image, to: Phaser.GameObjects.Image, onHit: () => void) {
    const g = this.add.graphics().setDepth(160).setBlendMode('ADD');
    const draw = () => {
      g.clear();
      for (const [w, col, a] of [[8, 0x6ab8ff, 0.5], [3, 0xffffff, 1]] as const) {
        g.lineStyle(w, col, a);
        g.beginPath();
        g.moveTo(from.x - 30, from.y - 10);
        const n = 7;
        for (let i = 1; i < n; i++) {
          const t = i / n;
          g.lineTo(from.x - 30 + (to.x - from.x + 30) * t + Phaser.Math.Between(-10, 10), from.y - 10 + (to.y - from.y + 10) * t + Phaser.Math.Between(-22, 22));
        }
        g.lineTo(to.x, to.y);
        g.strokePath();
      }
    };
    draw();
    this.cameras.main.flash(80, 180, 220, 255, false);
    this.time.addEvent({ delay: 50, repeat: 3, callback: draw });
    this.time.delayedCall(220, () => {
      g.destroy();
      onHit();
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
