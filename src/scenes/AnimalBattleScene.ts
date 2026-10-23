import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { tr } from '../i18n';
import { animal, BOSSES, food, wild, type MoveDef } from '../animal/data';
import {
  addFood, calmAmount, dropsFor, gainXp, loadAnimals, makeFoe, maxHearts, moves, saveAnimals, setBossCalm, skill, startCalm, swipe, xpFor,
  type AnimalSave, type Foe,
} from '../animal/state';
import { ask, backpack, grassTexture, tx } from '../animal/ui';
import { Bar, C, H, W, button, panel, txt } from '../ui/widgets';

const HERO = { x: 720, y: 300 };

/** Which animal, how strong, and the land to go back to afterwards. */
export interface BattleData {
  foe: string;
  level: number;
  wild?: number;
  land?: 'jungle' | 'desert';
}
const FOE = { x: 250, y: 290 };

/**
 * Calming battle: each move asks a question. Right answers calm the grumpy
 * animal a lot, wrong answers a little. When it's calm, it smiles and goes
 * on its way (sometimes leaving food behind). Grumpy animals swipe back!
 */
export class AnimalBattleScene extends Phaser.Scene {
  private s!: AnimalSave;
  private foe!: Foe;
  private data0!: BattleData;
  /** Turns the animal has had (slow animals swipe every other turn). */
  private turns = 0;
  private heroImg!: Phaser.GameObjects.Image;
  private foeImg!: Phaser.GameObjects.Image;
  private heroBar!: Bar;
  private calmBar!: Bar;
  private menu?: Phaser.GameObjects.Container;
  private log!: Phaser.GameObjects.Text;
  /** Owl: one wrong answer per battle counts as right. */
  private wiseUsed = false;
  private asleep = false;

  constructor() {
    super('AnimalBattle');
  }

  create(data: BattleData) {
    const s = loadAnimals();
    if (!s) {
      this.scene.start('AnimalSetup', { fresh: true });
      return;
    }
    this.s = s;
    this.data0 = data;
    this.wiseUsed = false;
    this.asleep = false;
    this.turns = 0;
    this.menu = undefined;
    this.foe = makeFoe(wild(data.foe), data.level);
    this.foe.calm = startCalm(s, this.foe);
    const big = !!BOSSES[data.foe];
    playMusic(big ? 'boss' : 'battle');

    const desert = data.land === 'desert';
    this.add.tileSprite(0, 0, W, H, grassTexture(this, desert ? 'desert' : 'jungle')).setOrigin(0).setTileScale(3);
    this.add.rectangle(0, 0, W, 150, desert ? 0xc88a40 : 0x1f4a1a, desert ? 0.35 : 0.55).setOrigin(0);
    for (let i = 0; i < 8; i++) {
      if (desert) this.add.image(60 + i * 125, 118, i % 3 ? 'prop_cactus' : 'prop_palm').setScale(i % 3 ? 3 : 3.2).setAlpha(0.95);
      else this.add.image(60 + i * 125, 110, 'prop_jtree').setScale(3.4).setAlpha(0.9);
    }
    this.add.ellipse(FOE.x, FOE.y + 50, 110, 22, 0x000000, 0.3);
    this.add.ellipse(HERO.x, HERO.y + 46, 90, 18, 0x000000, 0.3);
    this.foeImg = this.add.image(FOE.x, FOE.y, this.foe.def.sprite).setScale(big ? 5 : 6);
    this.tweens.add({ targets: this.foeImg, scaleY: this.foeImg.scaleY * 0.94, duration: 500, yoyo: true, repeat: -1 });
    this.heroImg = this.add.image(HERO.x, HERO.y, animal(s.animal).sprite).setScale(6).setFlipX(true);
    this.tweens.add({ targets: this.heroImg, y: HERO.y - 5, duration: 700, yoyo: true, repeat: -1 });

    // The grumpy animal's calm meter.
    this.add.text(FOE.x, FOE.y - 120, `${tx(this.foe.def.name)}  ${tr('Lv {n}', { n: this.foe.level })}`, { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff', stroke: '#1a3a10', strokeThickness: 4 }).setOrigin(0.5);
    this.add.text(FOE.x - 80, FOE.y - 96, tr('Calm'), { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffb8e0', stroke: '#1a3a10', strokeThickness: 3 }).setOrigin(1, 0.5);
    this.calmBar = new Bar(this, FOE.x - 75, FOE.y - 104, 150, 16, 0xff7ab8);
    this.calmBar.set(this.foe.calm, this.foe.grump, false);
    // Your hearts.
    panel(this, W - 300, H - 118, 290, 108, 0x1d1730, animal(s.animal).color);
    txt(this, W - 284, H - 110, `${s.name}  ·  ${tr('Level {n}', { n: s.level })}`, 18);
    this.add.image(W - 272, H - 70, 'prop_heart').setScale(1.8);
    this.heroBar = new Bar(this, W - 254, H - 80, 230, 20, 0xe05a5a);
    this.heroBar.set(s.hearts, maxHearts(s), false);
    this.log = txt(this, W / 2, 14, '', 20, '#ffe9a0', { align: 'center', wordWrap: { width: 640 } }).setOrigin(0.5, 0).setDepth(50).setStroke('#1a3a10', 5);
    const intro =
      data.foe === 'gorilla'
        ? tr('The Grumpy Gorilla beats his chest! Calm him down!')
        : data.foe === 'tortoise'
          ? tr('The Grumpy Old Tortoise snaps and stomps! Calm her down!')
          : tr('A grumpy {name} appears! Calm it down!', { name: tx(this.foe.def.name) });
    this.say(intro);
    if (this.foe.calm) this.time.delayedCall(700, () => this.say(tr('Your friendly roar makes it a little calmer!')));
    this.cameras.main.fadeIn(250);
    this.time.delayedCall(600, () => this.showMenu());
  }

  private say(s: string) {
    this.log.setText(s);
  }

  private showMenu() {
    this.menu?.destroy();
    const c = this.add.container(0, 0).setDepth(100);
    this.menu = c;
    c.add(panel(this, 10, H - 150, 620, 140, 0x1d1730, 0x5a4a7a));
    const list = moves(this.s);
    list.forEach((m, i) => {
      const x = 120 + (i % 2) * 214;
      const y = H - 112 + Math.floor(i / 2) * 64;
      c.add(button(this, x, y, 200, 52, tx(m.name), () => this.useMove(m), { size: 18, color: 0x3d6a3a }));
    });
    const next = animal(this.s.animal).moves.find((m) => m.unlock > this.s.level);
    if (next && list.length < 3) c.add(txt(this, 120 + (list.length % 2) * 214, H - 112 + Math.floor(list.length / 2) * 64, tr('New move at level {n}', { n: next.unlock }), 13, C.dim).setOrigin(0.5));
    c.add(button(this, 548, H - 112, 140, 52, tr('Food'), () => backpack(this, this.s, () => this.heroBar.set(this.s.hearts, maxHearts(this.s))), { size: 18, color: 0x8a5a2a }));
    c.add(button(this, 548, H - 48, 140, 44, tr('Run'), () => this.run(), { size: 16, color: 0x3a3450 }));
  }

  private useMove(m: MoveDef) {
    this.menu?.destroy();
    this.menu = undefined;
    const s = this.s;
    ask(this, s, tx(m.name), {
      right: tr('Answer: {answer}. So calming!'),
      wrong: tr('You said: {given}\nRight answer: {answer}\n(It calms down a little)'),
      go: tr('Go!'),
    }, (correct) => {
      let right = correct;
      if (!correct && skill(s) === 'eyes' && !this.wiseUsed) {
        this.wiseUsed = true;
        right = true;
        this.say(tr('Wise owl! That one counts as right.'));
      }
      const lucky = skill(s) === 'climb' && Math.random() < 0.25;
      const n = calmAmount(s, m.power * (skill(s) === 'sprint' ? 1.1 : 1), right, lucky);
      this.calmFx(n, lucky);
      this.foe.calm = Math.min(this.foe.grump, this.foe.calm + n);
      this.calmBar.set(this.foe.calm, this.foe.grump);
      if (this.foe.calm >= this.foe.grump) {
        this.time.delayedCall(700, () => this.win());
        return;
      }
      // A soft hiss can put it to sleep.
      if (skill(s) === 'sleep' && Math.random() < 0.3) this.asleep = true;
      this.time.delayedCall(800, () => this.foeTurn());
    });
  }

  /** Hearts and sparkles float from the hero to the animal. */
  private calmFx(n: number, lucky: boolean) {
    sfx('heal');
    for (let i = 0; i < 6; i++) {
      const h = this.add.image(this.heroImg.x - 30, this.heroImg.y - 20, 'prop_heart').setScale(2).setDepth(60);
      this.tweens.add({
        targets: h,
        x: FOE.x + Phaser.Math.Between(-40, 40),
        y: FOE.y + Phaser.Math.Between(-40, 30),
        duration: 500,
        delay: i * 60,
        ease: 'Sine.InOut',
        onComplete: () => {
          this.tweens.add({ targets: h, y: h.y - 40, alpha: 0, duration: 400, onComplete: () => h.destroy() });
        },
      });
    }
    this.floatText(FOE.x, FOE.y - 60, lucky ? tr('Lucky! +{n} calm', { n }) : tr('+{n} calm', { n }), lucky ? '#ffd24a' : '#ffb8e0');
  }

  private floatText(x: number, y: number, s: string, color: string) {
    const t = txt(this, x, y, s, 26, color).setOrigin(0.5).setDepth(70).setStroke('#1a1424', 5);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 600, duration: 600, onComplete: () => t.destroy() });
  }

  private foeTurn() {
    const s = this.s;
    this.turns++;
    if (this.foe.def.slow && this.turns % 2 === 0) {
      this.say(tr('The {name} is very slow and is still getting ready...', { name: tx(this.foe.def.name) }));
      return this.time.delayedCall(900, () => this.afterFoe());
    }
    if (this.asleep) {
      this.asleep = false;
      this.say(tr('Zzz... the {name} fell asleep and misses its turn!', { name: tx(this.foe.def.name) }));
      this.floatText(FOE.x, FOE.y - 70, 'Zzz', '#c8e0ff');
      return this.time.delayedCall(900, () => this.afterFoe());
    }
    // The grumpy swipe.
    this.tweens.add({ targets: this.foeImg, x: FOE.x + 120, duration: 180, yoyo: true, ease: 'Quad.Out' });
    this.time.delayedCall(180, () => {
      if (skill(s) === 'squeeze' && Math.random() < 0.35) {
        this.say(tr('You dodge the grumpy swipe!'));
        this.floatText(HERO.x, HERO.y - 60, tr('Dodge!'), '#9ad0ff');
      } else {
        const hit = swipe(this.foe);
        s.hearts = Math.max(0, s.hearts - hit);
        sfx('hurt');
        this.heroImg.setTintFill(0xffffff);
        this.time.delayedCall(90, () => this.heroImg.clearTint());
        this.cameras.main.shake(120, 0.006);
        this.floatText(HERO.x, HERO.y - 60, `-${hit}`, '#ff8a8a');
        this.say(tr('The {name} grumbles and swipes at you!', { name: tx(this.foe.def.name) }));
        this.heroBar.set(s.hearts, maxHearts(s));
      }
      saveAnimals(s);
      this.time.delayedCall(800, () => this.afterFoe());
    });
  }

  private afterFoe() {
    const s = this.s;
    if (s.hearts <= 0) return this.tired();
    // A dog's happy heart: one heart back each turn.
    if (skill(s) === 'sniff' && s.hearts < maxHearts(s)) {
      s.hearts++;
      this.heroBar.set(s.hearts, maxHearts(s));
      this.floatText(HERO.x, HERO.y - 80, '+1', '#7dff9a');
    }
    this.showMenu();
  }

  private win() {
    const s = this.s;
    sfx('victory');
    this.foeImg.clearTint();
    this.tweens.killTweensOf(this.foeImg);
    this.tweens.add({ targets: this.foeImg, y: FOE.y - 30, duration: 250, yoyo: true, repeat: 2 });
    for (let i = 0; i < 12; i++) {
      const h = this.add.image(FOE.x, FOE.y, 'prop_heart').setScale(2.4).setDepth(60);
      const a = (i / 12) * Math.PI * 2;
      this.tweens.add({ targets: h, x: FOE.x + Math.cos(a) * 120, y: FOE.y + Math.sin(a) * 90, alpha: 0, duration: 900, onComplete: () => h.destroy() });
    }
    const drops = dropsFor(this.foe);
    const xp = xpFor(this.foe);
    s.acorns += drops.acorns;
    if (drops.food) addFood(s, drops.food);
    const boss = !!BOSSES[this.data0.foe];
    if (boss) setBossCalm(s, this.data0.foe);
    const firstFact = !s.facts.includes(this.foe.def.id);
    if (firstFact) s.facts.push(this.foe.def.id);
    const levels = gainXp(s, xp);
    saveAnimals(s);

    const c = this.add.container(0, 0).setDepth(200);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.55).setOrigin(0).setInteractive());
    c.add(panel(this, W / 2 - 320, 70, 640, 400, 0x1d1730, 0xff7ab8));
    c.add(txt(this, W / 2, 104, this.data0.foe === 'gorilla' ? tr('The gorilla is smiling again!') : this.data0.foe === 'tortoise' ? tr('The old tortoise is smiling again!') : tr('The {name} is happy now!', { name: tx(this.foe.def.name) }), 28, '#ffb8e0').setOrigin(0.5));
    c.add(this.add.image(W / 2, 180, this.foe.def.sprite).setScale(boss ? 3.4 : 5));
    let y = 240;
    c.add(txt(this, W / 2, y, tr('+{xp} XP   +{a} acorns', { xp, a: drops.acorns }), 20, '#ffe9a0').setOrigin(0.5));
    y += 32;
    if (drops.food) {
      c.add(this.add.image(W / 2 - 90, y + 10, food(drops.food).icon).setScale(3));
      c.add(txt(this, W / 2 - 66, y + 10, tr('It left you: {food}!', { food: tx(food(drops.food).name) }), 18, C.good).setOrigin(0, 0.5));
      y += 36;
    }
    if (levels) {
      sfx('levelup');
      c.add(txt(this, W / 2, y, tr('Level up! You are now level {n}!', { n: s.level }), 22, '#ffd24a').setOrigin(0.5));
      y += 32;
    }
    if (firstFact) {
      c.add(txt(this, W / 2, y + 8, tr('Did you know? {fact}', { fact: tx(this.foe.def.fact) }), 16, '#9ad0ff', { align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5, 0));
    }
    c.add(button(this, W / 2, 424, 220, 54, tr('Continue'), () => this.back('calm'), { size: 22, color: 0x2f9a4a }));
  }

  private tired() {
    sfx('defeat');
    this.say(tr('You are all tired out! Time to go home and rest.'));
    this.tweens.add({ targets: this.heroImg, angle: 90, y: HERO.y + 20, duration: 600 });
    this.time.delayedCall(1600, () => this.back('tired'));
  }

  private run() {
    this.menu?.destroy();
    this.say(tr('You scamper away!'));
    this.tweens.add({ targets: this.heroImg, x: W + 100, duration: 500, ease: 'Quad.In' });
    this.time.delayedCall(600, () => this.back('ran'));
  }

  private back(result: 'calm' | 'tired' | 'ran') {
    saveAnimals(this.s);
    this.cameras.main.fadeOut(250);
    this.time.delayedCall(260, () => this.scene.start(this.data0.land === 'desert' ? 'AnimalDesert' : 'AnimalJungle', { result, wild: this.data0.wild }));
  }
}
