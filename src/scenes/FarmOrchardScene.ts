import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { ORCHARD, crop, orchardDef } from '../farm/data';
import { clock, isOpen, loadFarm, pickTree, plantTree, saveFarm, treeLeft, type FarmSave } from '../farm/state';
import { fullGame } from '../hub/ownership';
import { fmtNum, setLang, tr } from '../i18n';
import { QuestionEngine } from '../questions/engine';
import { QuestionPanel } from '../ui/QuestionPanel';
import { fullGamePrompt } from '../ui/unlockPrompt';
import { C, H, W, button, panel, soundButton, sprite, toast, txt } from '../ui/widgets';
import { grassBackground } from './FarmSetupScene';

/** The free farm can plant the first two spots. */
const FREE_SPOTS = 2;

interface SpotView {
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Graphics;
}

/** The orchard, next to the farm: trees and a beehive that give fruit again and again. */
export class FarmOrchardScene extends Phaser.Scene {
  private f!: FarmSave;
  private engine!: QuestionEngine;
  private spots: SpotView[] = [];
  private coinText!: Phaser.GameObjects.Text;
  private tip!: Phaser.GameObjects.Text;
  private busy = false;

  constructor() {
    super('FarmOrchard');
  }

  create() {
    const f = loadFarm();
    if (!f || !isOpen(f, 'orchard')) {
      this.scene.start(f ? 'Farm' : 'FarmSetup');
      return;
    }
    this.f = f;
    setLang(f.settings.lang);
    this.engine = new QuestionEngine(f.learning, f.settings);
    this.busy = false;
    this.spots = [];
    playMusic('farm');
    this.cameras.main.fadeIn(300);
    grassBackground(this);
    // A path back to the farm, and a few wild trees around the edges.
    this.add.tileSprite(W - 60, 70, 60, H - 110, 'farm_path').setOrigin(0).setTileScale(3);
    for (const [x, y] of [[40, 120], [36, 330], [40, 460], [860, 100]]) sprite(this, x, y, 'farm_tree', 2.4);
    this.drawHud();
    this.f.orchard.forEach((_s, i) => this.buildSpot(i));
    this.refresh();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refresh() });
    this.events.once('shutdown', () => saveFarm(this.f));
  }

  private spotPos(i: number) {
    return { x: 190 + (i % 3) * 250, y: 196 + Math.floor(i / 3) * 176 };
  }

  private locked(i: number): boolean {
    return i >= FREE_SPOTS && !fullGame('farm');
  }

  private drawHud() {
    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0x1d1730, 0.92).fillRoundedRect(8, 6, 362, 52, 10);
    g.lineStyle(2, 0xffd24a, 1).strokeRoundedRect(8, 6, 362, 52, 10);
    txt(this, 22, 32, tr('The Orchard'), 22, '#ffd24a').setOrigin(0, 0.5).setDepth(51);
    sprite(this, 254, 32, 'icon_gold', 2.5).setDepth(51);
    this.coinText = txt(this, 272, 32, '', 21).setOrigin(0, 0.5).setDepth(51);
    soundButton(this, W - 330, 32, 130, 44).setDepth(51);
    button(this, W - 128, 32, 236, 44, tr('Back to the farm'), () => {
      saveFarm(this.f);
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(320, () => this.scene.start('Farm'));
    }, { size: 17, color: 0x2e4a5a }).setDepth(51);
    const bar = this.add.graphics().setDepth(50);
    bar.fillStyle(0x1d1730, 0.85).fillRoundedRect(8, H - 38, W - 16, 32, 8);
    this.tip = txt(this, W / 2, H - 22, '', 16, '#e8e0ff').setOrigin(0.5).setDepth(51);
  }

  private buildSpot(i: number) {
    const { x, y } = this.spotPos(i);
    const spot = this.f.orchard[i];
    const key = spot.kind ? orchardDef(spot.kind).sprite : 'orchard_plot';
    const img = this.add.image(x, y + 50, key).setOrigin(0.5, 1).setScale(spot.kind ? 3.6 : 2.6).setInteractive({ useHandCursor: true });
    img.on('pointerup', () => this.tapSpot(i));
    if (this.locked(i) && !spot.kind) img.setAlpha(0.45);
    const label = txt(this, x, y + 60, '', 15, '#ffffff', { align: 'center' }).setOrigin(0.5, 0).setStroke('#2a1d10', 4);
    const bar = this.add.graphics();
    this.spots[i] = { img, label, bar };
  }

  private tapSpot(i: number) {
    if (this.busy) return;
    const spot = this.f.orchard[i];
    if (!spot.kind) {
      if (this.locked(i)) fullGamePrompt(this, 'farm', tr('A bigger orchard is part of the full game.'));
      else this.openPlanting(i);
      return;
    }
    const def = orchardDef(spot.kind);
    const left = treeLeft(spot, Date.now(), this.f);
    if (left > 0) {
      toast(this, tr('Ready in {time}', { time: clock(left) }));
      this.showFact(def.fact);
      return;
    }
    this.busy = true;
    const fruit = tr(crop(def.fruit).name);
    const q = this.engine.next();
    new QuestionPanel(this, q, {
      header: tr('Pick: {fruit}', { fruit }),
      readAloud: this.f.settings.readAloud,
      result: {
        right: tr('Answer: {answer}\nYou picked {n} {fruit}!', { n: def.count, fruit }),
        wrong: tr('You said: {given}\nRight answer: {answer}\nYou picked {n} {fruit}.', { n: Math.ceil(def.count / 2), fruit }),
        go: tr('Pick!'),
      },
      done: (correct) => {
        this.engine.record(q, correct);
        const n = pickTree(this.f, i, correct);
        saveFarm(this.f);
        this.busy = false;
        sfx('coin');
        const { x, y } = this.spotPos(i);
        for (let k = 0; k < Math.min(n, 5); k++) {
          const pop = this.add.image(x + Phaser.Math.Between(-40, 40), y - 20, crop(def.fruit).item).setScale(3).setDepth(40);
          this.tweens.add({ targets: pop, y: y + 40, alpha: 0, duration: 700, delay: k * 90, ease: 'Bounce.Out', onComplete: () => pop.destroy() });
        }
        this.refresh();
      },
    });
  }

  private showFact(fact: string) {
    const t = txt(this, W / 2, 96, `💡 ${tr(fact)}`, 17, '#3a2410', { align: 'center', wordWrap: { width: 700 }, backgroundColor: '#f4ecd4', padding: { x: 12, y: 8 } }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, alpha: 0, delay: 3500, duration: 600, onComplete: () => t.destroy() });
  }

  private openPlanting(i: number) {
    this.busy = true;
    const c = this.add.container(0, 0).setDepth(1000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.7).setOrigin(0).setInteractive());
    c.add(panel(this, 60, 30, W - 120, H - 60, 0x2a1d10, 0xffd24a));
    c.add(txt(this, W / 2, 66, tr('What do you want to plant?'), 28, '#ffd24a').setOrigin(0.5));
    c.add(button(this, W - 120, 66, 90, 40, tr('Close'), () => {
      c.destroy();
      this.busy = false;
    }, { size: 16, color: 0x8a3a3a }));
    c.add(txt(this, W / 2, 102, tr('Plant it once, then pick it again and again!'), 16, C.dim).setOrigin(0.5));
    ORCHARD.forEach((o, k) => {
      const y = 124 + k * 72;
      const g = this.add.graphics();
      g.fillStyle(0x3a2a18, 1).fillRoundedRect(90, y, W - 180, 64, 10);
      c.add(g);
      c.add(this.add.image(130, y + 60, o.ready).setOrigin(0.5, 1).setScale(1.8));
      c.add(txt(this, 176, y + 8, tr(o.name), 19));
      c.add(this.add.image(186, y + 46, crop(o.fruit).item).setScale(1.6));
      c.add(txt(this, 204, y + 46, tr('Gives {n} {fruit} every {time}', { n: o.count, fruit: tr(crop(o.fruit).name), time: clock(o.everyMs) }), 14, '#9aff9a').setOrigin(0, 0.5));
      const b = button(this, W - 190, y + 32, 150, 42, tr('{n} coins', { n: fmtNum(o.cost) }), () => {
        if (!plantTree(this.f, i, o.id)) return;
        sfx('levelup');
        saveFarm(this.f);
        c.destroy();
        this.busy = false;
        this.scene.restart();
      }, { size: 16, color: 0xb07a10 });
      b.setEnabled(this.f.coins >= o.cost);
      c.add(b);
    });
  }

  private refresh() {
    const now = Date.now();
    this.coinText.setText(fmtNum(this.f.coins));
    let ready = false;
    this.f.orchard.forEach((spot, i) => {
      const v = this.spots[i];
      if (!v) return;
      v.bar.clear();
      const { x, y } = this.spotPos(i);
      if (!spot.kind) {
        v.label.setText(this.locked(i) ? tr('Full game') : tr('Tap to plant'));
        return;
      }
      const def = orchardDef(spot.kind);
      const left = treeLeft(spot, now, this.f);
      v.img.setTexture(left > 0 ? def.sprite : def.ready);
      if (left > 0) {
        const total = def.everyMs / (this.f.gear.includes('can') ? 1 / 0.7 : 1);
        const t = Phaser.Math.Clamp(1 - left / total, 0, 1);
        v.bar.fillStyle(0x000000, 0.6).fillRect(x - 50, y + 84, 100, 8);
        v.bar.fillStyle(0x7dff9a, 1).fillRect(x - 50, y + 84, 100 * t, 8);
        v.label.setText(tr(def.name));
      } else {
        ready = true;
        v.label.setText(tr('{name}: ready!', { name: tr(def.name) }));
      }
    });
    const basket = Object.values(this.f.basket).reduce((a, b) => a + b, 0);
    this.tip.setText(
      ready ? tr('Something is ready! Tap it to pick it.')
        : this.f.orchard.some((o, i) => !o.kind && !this.locked(i)) ? tr('Tap an empty spot to plant a tree, a bush, a bog or a beehive.')
          : basket ? tr('Take your fruit to the Market on the farm, or cook with it in the Kitchen.')
            : tr('Your orchard is growing. Come back soon!'),
    );
  }
}
