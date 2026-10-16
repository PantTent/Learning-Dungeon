import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { ANIMALS, CROPS, FEED_TRIES, LAND_TIERS, STALL_TIERS, animal, crop } from '../farm/data';
import {
  buyAnimal, buyLand, buyStalls, clock, collect, feed, growth, happyLeft, harvest, isHungry, loadFarm, nextLand, nextStalls,
  plant, plotState, saleValue, saveFarm, sell, stallCount, accrue, type FarmAnimal, type FarmSave,
} from '../farm/state';
import { fmtNum, setLang, tr } from '../i18n';
import { QuestionEngine } from '../questions/engine';
import { QuestionPanel } from '../ui/QuestionPanel';
import { C, H, W, button, panel, soundButton, sprite, toast, txt } from '../ui/widgets';
import { grassBackground } from './FarmSetupScene';

const GARDEN = { x: 316, y: 96, cols: 4, cell: 72, size: 64 };
const PEN = { x: 652, y: 92, w: 290, h: 384, cols: 2, cellW: 136, cellH: 122 };

interface PlotView {
  soil: Phaser.GameObjects.TileSprite;
  plant: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  sign?: Phaser.GameObjects.Container;
}

interface AnimalView {
  a: FarmAnimal;
  body: Phaser.GameObjects.Image;
  alert: Phaser.GameObjects.Image;
  coin: Phaser.GameObjects.Image;
  heart: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

/** Learning Farm: grow crops, sell them at the market, feed the animals. */
export class FarmScene extends Phaser.Scene {
  private f!: FarmSave;
  private engine!: QuestionEngine;
  private plots: PlotView[] = [];
  private animals: AnimalView[] = [];
  private coinText!: Phaser.GameObjects.Text;
  private basketText!: Phaser.GameObjects.Text;
  private tip!: Phaser.GameObjects.Text;
  private world!: Phaser.GameObjects.Container;
  private busy = false;

  constructor() {
    super('Farm');
  }

  create() {
    const f = loadFarm();
    if (!f) {
      this.scene.start('FarmSetup', { fresh: true });
      return;
    }
    this.f = f;
    setLang(f.settings.lang);
    this.engine = new QuestionEngine(f.learning, f.settings);
    this.busy = false;
    playMusic('farm');
    grassBackground(this);
    this.drawScenery();
    this.world = this.add.container(0, 0);
    this.buildGarden();
    this.buildPen();
    this.drawHud();
    this.refresh();
    this.time.addEvent({ delay: 500, loop: true, callback: () => this.refresh() });
    // Save now and then so growing and income are never lost.
    this.time.addEvent({ delay: 5000, loop: true, callback: () => saveFarm(this.f) });
    this.events.once('shutdown', () => saveFarm(this.f));
  }

  // ------------------------------------------------------------ scenery

  private drawScenery() {
    // Dirt paths between the parts of the farm.
    this.add.tileSprite(0, 446, W, 48, 'farm_path').setOrigin(0).setTileScale(3);
    this.add.tileSprite(270, 70, 40, 400, 'farm_path').setOrigin(0).setTileScale(3);
    sprite(this, 92, 150, 'farm_house', 3);
    sprite(this, 208, 154, 'farm_barn', 3);
    sprite(this, 40, 300, 'farm_tree', 3);
    sprite(this, 610, 500, 'farm_tree', 2);

    // The market stall: tap to sell the harvest.
    const market = sprite(this, 150, 330, 'farm_market', 3).setInteractive({ useHandCursor: true });
    market.on('pointerup', () => this.openMarket());
    txt(this, 150, 384, tr('Market'), 18, '#ffe9a0').setOrigin(0.5);
    this.basketText = txt(this, 150, 410, '', 15, '#ffffff').setOrigin(0.5);
  }

  private drawHud() {
    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0x1d1730, 0.92).fillRoundedRect(8, 6, 420, 52, 10);
    g.lineStyle(2, 0xffd24a, 1).strokeRoundedRect(8, 6, 420, 52, 10);
    txt(this, 22, 32, tr("{name}'s farm", { name: this.f.farmer }), 20, '#ffd24a').setOrigin(0, 0.5).setDepth(51);
    sprite(this, 270, 32, 'icon_gold', 2.5).setDepth(51);
    this.coinText = txt(this, 290, 32, '', 22).setOrigin(0, 0.5).setDepth(51);
    button(this, W - 400, 32, 120, 44, tr('Shop'), () => this.openShop(), { size: 18, color: 0xb07a10 }).setDepth(51);
    soundButton(this, W - 262, 32, 130, 44).setDepth(51);
    button(this, W - 98, 32, 176, 44, tr('All games'), () => {
      saveFarm(this.f);
      this.scene.start('Hub');
    }, { size: 16, color: 0x2e4a5a }).setDepth(51);
    const bar = this.add.graphics().setDepth(50);
    bar.fillStyle(0x1d1730, 0.85).fillRoundedRect(8, H - 38, W - 16, 32, 8);
    this.tip = txt(this, W / 2, H - 22, '', 16, '#e8e0ff').setOrigin(0.5).setDepth(51);
  }

  // ------------------------------------------------------------- garden

  private plotPos(i: number) {
    const col = i % GARDEN.cols;
    const row = Math.floor(i / GARDEN.cols);
    return { x: GARDEN.x + col * GARDEN.cell, y: GARDEN.y + row * GARDEN.cell };
  }

  private buildGarden() {
    this.plots.forEach((p) => {
      p.soil.destroy();
      p.plant.destroy();
      p.bar.destroy();
      p.sign?.destroy();
    });
    this.plots = [];
    const max = LAND_TIERS[LAND_TIERS.length - 1].plots;
    const owned = this.f.plots.length;
    const next = nextLand(this.f);
    for (let i = 0; i < max; i++) {
      const { x, y } = this.plotPos(i);
      const unlocked = i < owned;
      const soil = this.add.tileSprite(x, y, GARDEN.size, GARDEN.size, 'farm_soil').setOrigin(0).setTileScale(4);
      const plantImg = this.add.image(x + GARDEN.size / 2, y + GARDEN.size / 2 - 4, 'crop_sprout').setScale(4).setVisible(false);
      const bar = this.add.graphics();
      const view: PlotView = { soil, plant: plantImg, bar };
      if (!unlocked) {
        soil.setAlpha(0.25);
        // The first locked plot of the next land size carries the "for sale" sign.
        if (next && i === owned) view.sign = this.saleSign(x + GARDEN.size / 2, y + GARDEN.size / 2, next.cost, () => this.buyLandSign());
      } else {
        soil.setInteractive({ useHandCursor: true }).on('pointerup', () => this.tapPlot(i));
      }
      this.plots.push(view);
    }
  }

  private saleSign(x: number, y: number, cost: number, onTap: () => void) {
    const c = this.add.container(x, y);
    c.add(this.add.image(0, -6, 'farm_sign').setScale(3));
    c.add(txt(this, 0, 26, `${fmtNum(cost)}`, 15, '#ffd24a').setOrigin(0.5));
    c.add(this.add.zone(0, 0, 64, 64).setInteractive({ useHandCursor: true }).on('pointerup', onTap));
    this.tweens.add({ targets: c, y: y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return c;
  }

  private tapPlot(i: number) {
    if (this.busy) return;
    const p = this.f.plots[i];
    const state = plotState(p);
    if (state === 'empty') this.openSeeds(i);
    else if (state === 'ready') {
      const id = harvest(this.f, i)!;
      sfx('coin');
      const { x, y } = this.plotPos(i);
      const pop = this.add.image(x + 32, y + 28, crop(id).item).setScale(4).setDepth(40);
      this.tweens.add({ targets: pop, x: 150, y: 330, scale: 2, duration: 600, ease: 'Quad.In', onComplete: () => pop.destroy() });
      saveFarm(this.f);
      this.refresh();
    } else {
      const left = crop(p.crop!).growMs * (1 - growth(p));
      toast(this, tr('{crop} ready in {time}', { crop: tr(crop(p.crop!).name), time: clock(left) }));
    }
  }

  private openSeeds(i: number) {
    const c = this.overlay(tr('What do you want to plant?'));
    CROPS.forEach((cr, k) => {
      const x = W / 2 - 330 + (k % 3) * 220;
      const y = 118 + Math.floor(k / 3) * 172;
      const g = this.add.graphics();
      g.fillStyle(0x3a2a18, 1).fillRoundedRect(x, y, 200, 158, 10);
      g.lineStyle(2, 0xffd24a, 0.8).strokeRoundedRect(x, y, 200, 158, 10);
      c.add(g);
      c.add(this.add.image(x + 40, y + 46, cr.item).setScale(4));
      c.add(txt(this, x + 80, y + 18, tr(cr.name), 19));
      c.add(txt(this, x + 80, y + 46, tr('Seed: {n}', { n: cr.seedCost }), 15, '#ffd24a'));
      c.add(txt(this, x + 80, y + 66, tr('Sells: {n}', { n: cr.price }), 15, '#9aff9a'));
      c.add(txt(this, x + 80, y + 86, tr('Grows: {time}', { time: clock(cr.growMs) }), 15, C.dim));
      const b = button(this, x + 100, y + 134, 150, 34, tr('Plant'), () => {
        if (plant(this.f, i, cr.id)) {
          sfx('click');
          saveFarm(this.f);
          c.destroy();
          this.busy = false;
          this.refresh();
        }
      }, { size: 15, color: 0x2f9a4a });
      b.setEnabled(this.f.coins >= cr.seedCost);
      c.add(b);
    });
  }

  // --------------------------------------------------------------- pen

  private stallPos(i: number) {
    const col = i % PEN.cols;
    const row = Math.floor(i / PEN.cols);
    return { x: PEN.x + 10 + col * PEN.cellW, y: PEN.y + 14 + row * PEN.cellH };
  }

  private buildPen() {
    this.world.removeAll(true);
    this.animals = [];
    // Fence around the pen.
    const fx = PEN.x - 8;
    const fy = PEN.y - 8;
    this.world.add(this.add.tileSprite(fx, fy, PEN.w + 16, 48, 'farm_fence').setOrigin(0).setTileScale(3));
    this.world.add(this.add.tileSprite(fx, fy + PEN.h - 24, PEN.w + 16, 48, 'farm_fence').setOrigin(0).setTileScale(3));
    this.world.add(this.add.tileSprite(fx - 12, fy, 48, PEN.h + 16, 'farm_fence_v').setOrigin(0).setTileScale(3));
    this.world.add(this.add.tileSprite(fx + PEN.w - 20, fy, 48, PEN.h + 16, 'farm_fence_v').setOrigin(0).setTileScale(3));

    const max = STALL_TIERS[STALL_TIERS.length - 1].stalls;
    const open = stallCount(this.f);
    const next = nextStalls(this.f);
    for (let i = 0; i < max; i++) {
      const { x, y } = this.stallPos(i);
      const w = PEN.cellW - 12;
      const h = PEN.cellH - 14;
      const floor = this.add.tileSprite(x, y + 24, w, h - 24, 'farm_hay_floor').setOrigin(0).setTileScale(3);
      this.world.add(floor);
      if (i >= open) {
        floor.setAlpha(0.3);
        if (next && i === open) this.world.add(this.saleSign(x + w / 2, y + h / 2 + 10, next.cost, () => this.buyStallSign()));
        continue;
      }
      this.world.add(this.add.image(x + w - 22, y + h - 6, 'farm_trough').setScale(2.5));
      const a = this.f.animals[i];
      if (!a) {
        const plus = txt(this, x + w / 2, y + h / 2 + 10, '+', 40, '#ffe9a0').setOrigin(0.5).setInteractive({ useHandCursor: true });
        plus.on('pointerup', () => this.openShop('animals'));
        this.world.add(plus);
        continue;
      }
      const cx = x + w / 2;
      const cy = y + h / 2 + 12;
      const body = this.add.image(cx, cy, animal(a.kind).sprite).setScale(4).setInteractive({ useHandCursor: true });
      body.on('pointerup', () => this.tapAnimal(view));
      // Wander a little inside the stall.
      this.tweens.add({
        targets: body,
        x: cx + Phaser.Math.Between(-22, 22),
        duration: Phaser.Math.Between(1800, 2600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
        delay: i * 300,
        onYoyo: () => body.setFlipX(!body.flipX),
        onRepeat: () => body.setFlipX(!body.flipX),
      });
      const alert = this.add.image(cx, y + 4, 'farm_alert').setScale(3).setInteractive({ useHandCursor: true });
      alert.on('pointerup', () => this.tapAnimal(view));
      this.tweens.add({ targets: alert, y: y - 4, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const coin = this.add.image(cx + 40, y + 10, 'farm_coin').setScale(3).setInteractive({ useHandCursor: true });
      coin.on('pointerup', () => this.collectCoins(view));
      this.tweens.add({ targets: coin, scale: 3.4, duration: 500, yoyo: true, repeat: -1 });
      const heart = this.add.image(cx - 40, y + 10, 'farm_heart').setScale(3);
      const label = txt(this, cx, y + h - 2, a.name, 14, '#ffffff').setOrigin(0.5);
      const view: AnimalView = { a, body, alert, coin, heart, label };
      this.world.add([body, alert, coin, heart, label]);
      this.animals.push(view);
    }
  }

  private tapAnimal(v: AnimalView) {
    if (this.busy) return;
    if (!isHungry(v.a)) {
      this.hearts(v.body, 4);
      sfx('heal');
      toast(this, tr('{name} is happy! Hungry again in {time}', { name: v.a.name, time: clock(happyLeft(v.a)) }), C.good);
      return;
    }
    this.busy = true;
    const q = this.engine.next();
    const lastTry = v.a.wrongs + 1 >= FEED_TRIES;
    new QuestionPanel(this, q, {
      header: tr('Feed {name}', { name: v.a.name }),
      readAloud: this.f.settings.readAloud,
      result: {
        right: tr('Answer: {answer}\n{name} is happy!', { name: v.a.name }),
        wrong: lastTry
          ? tr('You said: {given}\nRight answer: {answer}\n{name} ate anyway and is happy!', { name: v.a.name })
          : tr('You said: {given}\nRight answer: {answer}\n{name} is not happy yet. Try again!', { name: v.a.name }),
        go: tr('Feed!'),
      },
      done: (correct) => {
        this.engine.record(q, correct);
        const happy = feed(v.a, correct);
        saveFarm(this.f);
        this.busy = false;
        if (happy) {
          sfx('heal');
          this.hearts(v.body, 8);
          this.tweens.add({ targets: v.body, y: v.body.y - 14, duration: 160, yoyo: true, repeat: 1 });
        } else {
          toast(this, tr('Not happy yet ({n} of {max} tries)', { n: v.a.wrongs, max: FEED_TRIES }), '#ffb36b');
        }
        this.refresh();
      },
    });
  }

  private collectCoins(v: AnimalView) {
    const coins = collect(this.f, v.a);
    if (coins <= 0) return;
    sfx('coin');
    this.floatText(v.coin.x, v.coin.y, `+${coins}`, '#ffd24a');
    saveFarm(this.f);
    this.refresh();
  }

  private hearts(obj: Phaser.GameObjects.Image, n: number) {
    for (let i = 0; i < n; i++) {
      const h = this.add.image(obj.x + Phaser.Math.Between(-30, 30), obj.y - 10, 'farm_heart').setScale(2.5).setDepth(40);
      this.tweens.add({ targets: h, y: h.y - Phaser.Math.Between(50, 90), alpha: 0, duration: 900, delay: i * 70, onComplete: () => h.destroy() });
    }
  }

  // ------------------------------------------------------------ market

  private openMarket() {
    if (this.busy) return;
    const items = CROPS.filter((cr) => (this.f.basket[cr.id] ?? 0) > 0);
    if (!items.length) {
      toast(this, tr('Nothing to sell yet. Grow some veggies!'));
      return;
    }
    const c = this.overlay(tr('Market: sell your harvest'));
    c.add(txt(this, W / 2, 112, tr('Answer right for the full price. Wrong answers get half.'), 16, C.dim).setOrigin(0.5));
    items.forEach((cr, k) => {
      const n = this.f.basket[cr.id];
      const y = 150 + k * 66;
      const g = this.add.graphics();
      g.fillStyle(0x3a2a18, 1).fillRoundedRect(W / 2 - 300, y, 600, 58, 10);
      c.add(g);
      c.add(this.add.image(W / 2 - 266, y + 29, cr.item).setScale(3));
      c.add(txt(this, W / 2 - 232, y + 29, `${tr(cr.name)} x${n}`, 20).setOrigin(0, 0.5));
      c.add(txt(this, W / 2 + 40, y + 29, tr('{n} coins', { n: fmtNum(saleValue(cr.id, n, true)) }), 18, '#ffd24a').setOrigin(0, 0.5));
      c.add(button(this, W / 2 + 230, y + 29, 120, 42, tr('Sell'), () => {
        c.destroy();
        this.sellCrop(cr.id);
      }, { size: 18, color: 0x2f9a4a }));
    });
  }

  private sellCrop(id: string) {
    const n = this.f.basket[id] ?? 0;
    if (n <= 0) return;
    this.busy = true;
    const q = this.engine.next();
    new QuestionPanel(this, q, {
      header: tr('Sell {crop} x{n}', { crop: tr(crop(id).name), n }),
      readAloud: this.f.settings.readAloud,
      result: {
        right: tr('Answer: {answer}\nFull price: {coins} coins!', { coins: fmtNum(saleValue(id, n, true)) }),
        wrong: tr('You said: {given}\nRight answer: {answer}\nHalf price this time: {coins} coins', { coins: fmtNum(saleValue(id, n, false)) }),
        go: tr('Sell!'),
      },
      done: (correct) => {
        this.engine.record(q, correct);
        const coins = sell(this.f, id, correct);
        saveFarm(this.f);
        this.busy = false;
        sfx('coin');
        this.floatText(150, 300, `+${fmtNum(coins)}`, '#ffd24a');
        this.refresh();
      },
    });
  }

  // -------------------------------------------------------------- shop

  private openShop(tab: 'animals' | 'upgrades' = 'animals') {
    if (this.busy) return;
    const c = this.overlay(tr('Farm Shop'));
    c.add(button(this, W / 2 - 110, 118, 200, 40, tr('Animals'), () => {
      c.destroy();
      this.busy = false;
      this.openShop('animals');
    }, { size: 17, color: tab === 'animals' ? 0x2f9a4a : 0x4b3a78 }));
    c.add(button(this, W / 2 + 110, 118, 200, 40, tr('Upgrades'), () => {
      c.destroy();
      this.busy = false;
      this.openShop('upgrades');
    }, { size: 17, color: tab === 'upgrades' ? 0x2f9a4a : 0x4b3a78 }));
    const reopen = () => {
      c.destroy();
      this.busy = false;
      this.openShop(tab);
    };

    if (tab === 'animals') {
      const free = stallCount(this.f) - this.f.animals.length;
      c.add(txt(this, W / 2, 158, free > 0 ? tr('Free stalls: {n}', { n: free }) : tr('No free stalls. Buy more stalls in Upgrades!'), 16, free > 0 ? C.good : '#ffb36b').setOrigin(0.5));
      ANIMALS.forEach((an, k) => {
        const x = W / 2 - 340 + k * 172;
        const y = 180;
        const g = this.add.graphics();
        g.fillStyle(0x3a2a18, 1).fillRoundedRect(x, y, 160, 250, 10);
        g.lineStyle(2, 0xffd24a, 0.8).strokeRoundedRect(x, y, 160, 250, 10);
        c.add(g);
        c.add(this.add.image(x + 80, y + 60, an.sprite).setScale(4));
        c.add(txt(this, x + 80, y + 116, tr(an.name), 20).setOrigin(0.5));
        c.add(txt(this, x + 80, y + 146, tr('{n} coins', { n: fmtNum(an.cost) }), 16, '#ffd24a').setOrigin(0.5));
        c.add(txt(this, x + 80, y + 170, tr('Earns {n} per minute when happy', { n: an.incomePerMin }), 13, C.dim, { align: 'center', wordWrap: { width: 140 } }).setOrigin(0.5, 0));
        const b = button(this, x + 80, y + 226, 130, 36, tr('Buy'), () => {
          const a = buyAnimal(this.f, an.id);
          if (!a) return;
          sfx('coin');
          saveFarm(this.f);
          c.destroy();
          this.busy = false;
          this.buildPen();
          this.refresh();
          toast(this, tr('Welcome, {name}! Tap it to feed it.', { name: a.name }), C.good);
        }, { size: 16, color: 0x2f9a4a });
        b.setEnabled(free > 0 && this.f.coins >= an.cost);
        c.add(b);
      });
    } else {
      const rows: { icon: string; title: string; desc: string; cost?: number; buy?: () => boolean }[] = [];
      const land = nextLand(this.f);
      rows.push(
        land
          ? { icon: 'farm_soil', title: tr('Bigger garden'), desc: tr('{n} more garden plots', { n: land.plots - this.f.plots.length }), cost: land.cost, buy: () => buyLand(this.f) }
          : { icon: 'farm_soil', title: tr('Bigger garden'), desc: tr('Your garden is as big as it gets!') },
      );
      const st = nextStalls(this.f);
      rows.push(
        st
          ? { icon: 'farm_hay', title: tr('More stalls'), desc: st.stalls - stallCount(this.f) === 1 ? tr('1 more animal stall') : tr('{n} more animal stalls', { n: st.stalls - stallCount(this.f) }), cost: st.cost, buy: () => buyStalls(this.f) }
          : { icon: 'farm_hay', title: tr('More stalls'), desc: tr('Your barn is full size!') },
      );
      rows.push({ icon: 'farm_portal', title: tr('Magic portal'), desc: tr('A door to a magical world... coming soon!') });
      rows.forEach((r, k) => {
        const y = 170 + k * 86;
        const g = this.add.graphics();
        g.fillStyle(0x3a2a18, 1).fillRoundedRect(W / 2 - 330, y, 660, 76, 10);
        c.add(g);
        c.add(this.add.image(W / 2 - 290, y + 38, r.icon).setScale(r.icon === 'farm_portal' ? 1.8 : 3));
        c.add(txt(this, W / 2 - 240, y + 14, r.title, 20));
        c.add(txt(this, W / 2 - 240, y + 44, r.desc, 15, C.dim));
        if (r.buy && r.cost !== undefined) {
          const b = button(this, W / 2 + 240, y + 38, 150, 46, tr('{n} coins', { n: fmtNum(r.cost) }), () => {
            if (!r.buy!()) return;
            sfx('levelup');
            saveFarm(this.f);
            this.buildGarden();
            this.buildPen();
            this.refresh();
            reopen();
          }, { size: 16, color: 0xb07a10 });
          b.setEnabled(this.f.coins >= r.cost);
          c.add(b);
        }
      });
    }
  }

  private buyLandSign() {
    const next = nextLand(this.f);
    if (!next) return;
    if (this.f.coins < next.cost) {
      toast(this, tr('You need {n} coins for more garden.', { n: fmtNum(next.cost) }), '#ffb36b');
      return;
    }
    this.openShop('upgrades');
  }

  private buyStallSign() {
    const next = nextStalls(this.f);
    if (!next) return;
    if (this.f.coins < next.cost) {
      toast(this, tr('You need {n} coins for more stalls.', { n: fmtNum(next.cost) }), '#ffb36b');
      return;
    }
    this.openShop('upgrades');
  }

  // ------------------------------------------------------------ helpers

  /** Dark full-screen panel with a title and a close button. */
  private overlay(title: string): Phaser.GameObjects.Container {
    this.busy = true;
    const c = this.add.container(0, 0).setDepth(1000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.7).setOrigin(0).setInteractive());
    c.add(panel(this, 60, 30, W - 120, H - 60, 0x2a1d10, 0xffd24a));
    c.add(txt(this, W / 2, 66, title, 28, '#ffd24a').setOrigin(0.5));
    c.add(button(this, W - 120, 66, 90, 40, tr('Close'), () => {
      c.destroy();
      this.busy = false;
    }, { size: 16, color: 0x8a3a3a }));
    return c;
  }

  private floatText(x: number, y: number, s: string, color: string) {
    const t = txt(this, x, y, s, 26, color).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  /** Update everything that changes over time. */
  private refresh() {
    const now = Date.now();
    this.coinText.setText(fmtNum(this.f.coins));
    this.f.plots.forEach((p, i) => {
      const v = this.plots[i];
      if (!v) return;
      const state = plotState(p, now);
      v.bar.clear();
      if (state === 'empty') {
        v.plant.setVisible(false);
        return;
      }
      const g = growth(p, now);
      const tex = state === 'ready' ? crop(p.crop!).sprite : g < 0.2 ? 'crop_seeds' : g < 0.55 ? 'crop_sprout' : 'crop_growing';
      v.plant.setTexture(tex).setVisible(true);
      if (state === 'growing') {
        const { x, y } = this.plotPos(i);
        v.bar.fillStyle(0x000000, 0.6).fillRect(x + 6, y + GARDEN.size - 10, GARDEN.size - 12, 6);
        v.bar.fillStyle(0x7dff9a, 1).fillRect(x + 6, y + GARDEN.size - 10, (GARDEN.size - 12) * g, 6);
      }
    });
    for (const v of this.animals) {
      accrue(v.a, now);
      const hungry = isHungry(v.a, now);
      v.alert.setVisible(hungry);
      v.heart.setVisible(!hungry);
      v.coin.setVisible(v.a.pending >= 1);
      v.body.setTint(hungry ? 0xd8d0c8 : 0xffffff);
    }
    const basket = CROPS.map((cr) => this.f.basket[cr.id] ?? 0).reduce((a, b) => a + b, 0);
    this.basketText.setText(basket ? tr('{n} to sell', { n: basket }) : '');
    this.tip.setText(this.currentTip(now));
  }

  private currentTip(now: number): string {
    if (this.animals.some((v) => isHungry(v.a, now))) return tr('An animal is hungry! Tap the red ! to feed it.');
    if (this.f.plots.some((p) => plotState(p, now) === 'ready')) return tr('Something is ready! Tap it to pick it.');
    if (Object.values(this.f.basket).some((n) => n > 0)) return tr('Take your harvest to the Market to sell it.');
    if (this.f.plots.some((p) => plotState(p, now) === 'empty')) return tr('Tap an empty garden plot to plant seeds.');
    if (this.animals.some((v) => v.a.pending >= 1)) return tr('Tap the coins above your animals to collect them.');
    return tr('Your farm is growing! Save up coins for upgrades in the Shop.');
  }
}
