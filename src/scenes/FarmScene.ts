import Phaser from 'phaser';
import { FREE_LIMITS } from '../hub/games';
import { fullGame } from '../hub/ownership';
import { fullGamePrompt } from '../ui/unlockPrompt';
import { playMusic, sfx } from '../audio/audio';
import {
  CHAPTERS, CONTEST_QUESTIONS, CONTESTS, FEED_TRIES, GEAR, HATS, MAX_ORDERS, PORTAL_COST, QUESTS, RECIPES, WORLDS, animal, crop, hat, neighbour,
  type ContestDef, type WorldId,
} from '../farm/data';
import {
  buyAnimal, buyGear, buyHat, buyLand, buyStalls, canFill, clock, collect, feed, fillOrder, growTime, growth, happyLeft, harvest, hasGear,
  isHungry, loadFarm, nextLand, nextStalls, parseKey, plant, plotState, refreshOrders, renameAnimal, saleValue, saveFarm, sell, stallCount,
  wearHat, accrue, buyPortal, enterWorld, rootOf, canCook, canEnter, claimQuest, collectProducts, cook, currentQuest, isOpen, judge,
  productsReady, questMet, type FarmAnimal, type FarmSave, type Order,
} from '../farm/state';
import { SPRITES } from '../art/pixelData';
import { openKeyboard } from '../ui/keyboard';
import { fmtNum, setLang, tr } from '../i18n';
import { QuestionEngine } from '../questions/engine';
import { QuestionPanel } from '../ui/QuestionPanel';
import { C, H, W, button, panel, soundButton, sprite, toast, txt } from '../ui/widgets';
import { grassBackground } from './FarmSetupScene';

type ShopTab = 'animals' | 'upgrades' | 'gear' | 'hats';

/** Neighbours who come to cheer at the end. */
const NEIGHBOURS_PARTY = ['moose', 'beaver', 'owl', 'raccoon'];

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
  /** Egg, milk... waiting to be picked up. */
  prod?: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  hat: Phaser.GameObjects.Image;
  /** Top of the head in sprite pixels (sprite faces right). */
  head: { x: number; y: number };
}

/** Where a hat sits: the top of the head, found from the sprite itself. */
function headOf(key: string): { x: number; y: number } {
  const sp = SPRITES[key];
  if (!sp) return { x: 0, y: 0 };
  const from = Math.floor(sp.w * 0.55);
  for (let y = 0; y < sp.h; y++) {
    const xs: number[] = [];
    for (let x = from; x < sp.w; x++) if (sp.rows[y][x] !== '.' && sp.rows[y][x] !== 'k') xs.push(x);
    if (xs.length) return { x: (xs[0] + xs[xs.length - 1]) / 2 + 0.5 - sp.w / 2, y: y - sp.h / 2 };
  }
  return { x: 0, y: -sp.h / 2 };
}

/** Learning Farm: grow crops, sell them at the market, feed the animals. */
export class FarmScene extends Phaser.Scene {
  private f!: FarmSave;
  private engine!: QuestionEngine;
  private plots: PlotView[] = [];
  private animals: AnimalView[] = [];
  private coinText!: Phaser.GameObjects.Text;
  private basketText!: Phaser.GameObjects.Text;
  private boardBadge!: Phaser.GameObjects.Text;
  private journalBadge!: Phaser.GameObjects.Text;
  private tip!: Phaser.GameObjects.Text;
  private world!: Phaser.GameObjects.Container;
  private busy = false;
  /** Which farm we're on: home, or the magic world through the portal. */
  private worldId: WorldId = 'home';

  constructor() {
    super('Farm');
  }

  private get look() {
    return WORLDS[this.worldId].look;
  }

  create(data: { world?: WorldId; journal?: boolean; note?: string } = {}) {
    const root = loadFarm();
    if (!root) {
      this.scene.start('FarmSetup', { fresh: true });
      return;
    }
    this.worldId = data.world === 'magic' && root.portal ? 'magic' : 'home';
    const f = enterWorld(root, this.worldId);
    this.f = f;
    setLang(f.settings.lang);
    this.engine = new QuestionEngine(f.learning, f.settings);
    this.busy = false;
    playMusic(WORLDS[this.worldId].music);
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(400);
    grassBackground(this, this.look.grass);
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
    if (data.journal) this.openJournal();
    if (data.note) toast(this, data.note, '#ffd24a');
  }

  // ------------------------------------------------------------ scenery

  private drawScenery() {
    // Dirt paths between the parts of the farm.
    const L = this.look;
    this.add.tileSprite(0, 446, W, 48, L.path).setOrigin(0).setTileScale(3);
    this.add.tileSprite(270, 70, 40, 400, L.path).setOrigin(0).setTileScale(3);
    sprite(this, 92, 150, L.house, 3);
    sprite(this, 208, 154, L.barn, 3);
    sprite(this, 40, 300, L.tree, 3);
    sprite(this, 610, 500, L.tree, 2);
    if (this.worldId === 'magic') this.sparkles();

    // The magic portal (once it's built): step through to the other farm.
    if (rootOf(this.f).portal) {
      const px = 460;
      const py = 392;
      const glow = this.add.image(px, py, 'glow').setScale(9).setTint(0xb070ff).setAlpha(0.5).setBlendMode('ADD');
      this.tweens.add({ targets: glow, alpha: 0.2, scale: 7, duration: 1200, yoyo: true, repeat: -1 });
      const portal = sprite(this, px, py, 'farm_portal', 2.4).setInteractive({ useHandCursor: true });
      portal.on('pointerup', () => this.travel());
      txt(this, px, py + 46, this.worldId === 'home' ? tr('Magic world') : tr('Home farm'), 16, '#e0c8ff').setOrigin(0.5);
    }

    if (this.worldId === 'home') this.drawStoryPlaces();

    // The market stall: tap to sell the harvest.
    const market = sprite(this, 150, 330, L.market, 3).setInteractive({ useHandCursor: true });
    market.on('pointerup', () => this.openMarket());
    txt(this, 150, 384, tr('Market'), 18, '#ffe9a0').setOrigin(0.5);
    this.basketText = txt(this, 150, 410, '', 15, '#ffffff').setOrigin(0.5);

    // The neighbours' order board.
    const board = sprite(this, 226, 256, L.board, 2.5).setInteractive({ useHandCursor: true });
    board.on('pointerup', () => this.openOrders());
    txt(this, 226, 296, tr('Orders'), 16, '#ffe9a0').setOrigin(0.5);
    this.boardBadge = txt(this, 258, 224, '', 15, '#ffffff', { backgroundColor: '#c0392b', padding: { x: 5, y: 1 } }).setOrigin(0.5).setDepth(5);
  }

  /** Kitchen, County Fair, the path to the orchard and the trophy: they appear as the journal goes on. */
  private drawStoryPlaces() {
    const f = this.f;
    if (isOpen(f, 'kitchen')) {
      const k = sprite(this, 370, 382, 'farm_kitchen', 2.4).setInteractive({ useHandCursor: true });
      k.on('pointerup', () => this.openKitchen());
      txt(this, 370, 428, tr('Kitchen'), 16, '#ffe9a0').setOrigin(0.5);
    }
    if (isOpen(f, 'fair')) {
      const fair = sprite(this, 556, 382, 'farm_fair', 2.4).setInteractive({ useHandCursor: true });
      fair.on('pointerup', () => this.openFair());
      txt(this, 556, 428, tr('County Fair'), 16, '#ffe9a0').setOrigin(0.5);
      for (const [k, c] of CONTESTS.entries()) {
        const r = f.ribbons[c.id];
        if (r) sprite(this, 530 + k * 26, 340, r === 'blue' ? 'ribbon_blue' : 'ribbon_red', 1.6);
      }
    }
    if (isOpen(f, 'orchard')) {
      const sign = this.add.container(46, 462);
      sign.add(this.add.image(0, -4, 'farm_sign').setScale(2.6));
      sign.add(txt(this, 26, -6, tr('Orchard'), 15, '#ffe9a0').setOrigin(0, 0.5).setStroke('#2a1d10', 4));
      sign.add(this.add.zone(10, -6, 120, 48).setInteractive({ useHandCursor: true }).on('pointerup', () => this.goOrchard()));
      this.tweens.add({ targets: sign, x: 40, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    if (f.champion) {
      const cup = sprite(this, 140, 92, 'trophy_gold', 2.2).setInteractive({ useHandCursor: true });
      cup.on('pointerup', () => toast(this, tr('Grand Champion of the County Fair!'), '#ffd24a'));
      this.tweens.add({ targets: cup, y: 88, duration: 800, yoyo: true, repeat: -1 });
    }
  }

  private goOrchard() {
    if (this.busy) return;
    saveFarm(this.f);
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start('FarmOrchard'));
  }

  update() {
    // Hats follow their animal around.
    for (const v of this.animals) {
      const flip = v.body.flipX ? -1 : 1;
      v.hat.setPosition(v.body.x + v.head.x * 4 * flip, v.body.y + v.head.y * 4 - 2).setFlipX(v.body.flipX);
    }
  }

  private drawHud() {
    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0x1d1730, 0.92).fillRoundedRect(8, 6, 362, 52, 10);
    g.lineStyle(2, 0xffd24a, 1).strokeRoundedRect(8, 6, 362, 52, 10);
    const title = txt(this, 22, 32, this.worldId === 'magic' ? tr("{name}'s magic farm", { name: this.f.farmer }) : tr("{name}'s farm", { name: this.f.farmer }), 20, '#ffd24a').setOrigin(0, 0.5).setDepth(51);
    for (let size = 19; title.width > 214 && size >= 13; size--) title.setFontSize(size);
    sprite(this, 254, 32, 'icon_gold', 2.5).setDepth(51);
    this.coinText = txt(this, 272, 32, '', 21).setOrigin(0, 0.5).setDepth(51);
    const jb = button(this, 434, 32, 116, 44, tr('Journal'), () => this.openJournal(), { size: 17, color: 0x6a4a2a }).setDepth(51);
    jb.add(this.add.image(-40, 0, 'farm_journal').setScale(1.6));
    this.journalBadge = txt(this, 484, 12, '!', 15, '#ffffff', { backgroundColor: '#2f9a4a', padding: { x: 6, y: 1 } }).setOrigin(0.5).setDepth(52).setVisible(false);
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
    const tiers = WORLDS[this.worldId].land;
    const max = tiers[tiers.length - 1].plots;
    const owned = this.f.plots.length;
    const next = nextLand(this.f);
    for (let i = 0; i < max; i++) {
      const { x, y } = this.plotPos(i);
      const unlocked = i < owned;
      const soil = this.add.tileSprite(x, y, GARDEN.size, GARDEN.size, this.look.soil).setOrigin(0).setTileScale(4);
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
    const state = plotState(p, Date.now(), this.f);
    if (state === 'empty') this.openSeeds(i);
    else if (state === 'ready') {
      const h = harvest(this.f, i)!;
      sfx(h.golden ? 'levelup' : 'coin');
      const { x, y } = this.plotPos(i);
      const pop = this.add.image(x + 32, y + 28, crop(h.crop).item).setScale(4).setDepth(40);
      if (h.golden) {
        pop.setTint(0xffd24a);
        for (let k = 0; k < 14; k++) {
          const d = this.add.image(x + 32, y + 28, 'dot').setTint(0xfff0a0).setDepth(41).setBlendMode('ADD');
          this.tweens.add({ targets: d, x: d.x + Phaser.Math.Between(-60, 60), y: d.y + Phaser.Math.Between(-60, 30), alpha: 0, duration: 700, onComplete: () => d.destroy() });
        }
        toast(this, tr('A GOLDEN {crop}! It sells for 5 times more!', { crop: tr(crop(h.crop).name) }), '#ffd24a');
      } else if (h.count > 1) this.floatText(x + 32, y, tr('x2 harvest!'), '#9aff9a');
      this.tweens.add({ targets: pop, x: 150, y: 330, scale: 2, duration: 600, delay: h.golden ? 400 : 0, ease: 'Quad.In', onComplete: () => pop.destroy() });
      saveFarm(this.f);
      this.refresh();
    } else {
      const left = growTime(p.crop!, this.f) * (1 - growth(p, Date.now(), this.f));
      toast(this, tr('{crop} ready in {time}', { crop: tr(crop(p.crop!).name), time: clock(left) }));
    }
  }

  private openSeeds(i: number) {
    const c = this.overlay(tr('What do you want to plant?'));
    WORLDS[this.worldId].crops.forEach((cr, k) => {
      const x = W / 2 - 330 + (k % 3) * 220;
      const y = 118 + Math.floor(k / 3) * 172;
      const g = this.add.graphics();
      g.fillStyle(0x3a2a18, 1).fillRoundedRect(x, y, 200, 158, 10);
      g.lineStyle(2, 0xffd24a, 0.8).strokeRoundedRect(x, y, 200, 158, 10);
      c.add(g);
      c.add(this.add.image(x + 40, y + 46, cr.item).setScale(4));
      const name = txt(this, x + 80, y + 18, tr(cr.name), 19);
      // Long names (e.g. "Carotte arc-en-ciel") shrink to fit the card.
      for (let size = 18; name.width > 114 && size >= 12; size--) name.setFontSize(size);
      c.add(name);
      c.add(txt(this, x + 80, y + 46, tr('Seed: {n}', { n: cr.seedCost }), 15, '#ffd24a'));
      c.add(txt(this, x + 80, y + 66, tr('Sells: {n}', { n: cr.price }), 15, '#9aff9a'));
      c.add(txt(this, x + 80, y + 86, tr('Grows: {time}', { time: clock(growTime(cr.id, this.f)) }), 15, C.dim));
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
    this.world.add(this.add.tileSprite(fx, fy, PEN.w + 16, 48, this.look.fence).setOrigin(0).setTileScale(3));
    this.world.add(this.add.tileSprite(fx, fy + PEN.h - 24, PEN.w + 16, 48, this.look.fence).setOrigin(0).setTileScale(3));
    this.world.add(this.add.tileSprite(fx - 12, fy, 48, PEN.h + 16, this.look.fenceV).setOrigin(0).setTileScale(3));
    this.world.add(this.add.tileSprite(fx + PEN.w - 20, fy, 48, PEN.h + 16, this.look.fenceV).setOrigin(0).setTileScale(3));

    const stallTiers = WORLDS[this.worldId].stalls;
    const max = stallTiers[stallTiers.length - 1].stalls;
    const open = stallCount(this.f);
    const next = nextStalls(this.f);
    for (let i = 0; i < max; i++) {
      const { x, y } = this.stallPos(i);
      const w = PEN.cellW - 12;
      const h = PEN.cellH - 14;
      const floor = this.add.tileSprite(x, y + 24, w, h - 24, this.look.floor).setOrigin(0).setTileScale(3);
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
      const product = animal(a.kind).product;
      let prod: Phaser.GameObjects.Image | undefined;
      if (product && this.worldId === 'home') {
        prod = this.add.image(cx - 40, y + 10, crop(product).item).setScale(2.4).setInteractive({ useHandCursor: true }).setVisible(false);
        prod.on('pointerup', () => this.collectGoods(view));
        this.tweens.add({ targets: prod, y: y + 4, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
      const label = txt(this, cx, y + h - 2, a.name, 14, '#ffffff').setOrigin(0.5);
      const hatImg = this.add.image(cx, cy, a.hat ? hat(a.hat)!.sprite : 'farm_heart').setScale(3).setVisible(!!a.hat);
      const view: AnimalView = { a, body, alert, coin, heart, prod, label, hat: hatImg, head: headOf(animal(a.kind).sprite) };
      this.world.add([body, hatImg, alert, coin, heart, label]);
      if (prod) this.world.add(prod);
      this.animals.push(view);
    }
  }

  private tapAnimal(v: AnimalView) {
    if (this.busy) return;
    if (!isHungry(v.a, Date.now(), this.f)) {
      this.hearts(v.body, 4);
      sfx('heal');
      this.petCard(v);
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
        const happy = feed(v.a, correct, Date.now(), this.f);
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

  private collectGoods(v: AnimalView) {
    if (this.busy || !v.prod) return;
    const n = collectProducts(this.f, v.a);
    if (!n) return;
    sfx('coin');
    const item = crop(animal(v.a.kind).product!);
    this.floatText(v.prod.x, v.prod.y - 10, `+${n} ${tr(item.name)}`, '#9aff9a');
    const pop = this.add.image(v.prod.x, v.prod.y, item.item).setScale(3).setDepth(40);
    this.tweens.add({ targets: pop, x: 150, y: 330, scale: 2, duration: 700, ease: 'Quad.In', onComplete: () => pop.destroy() });
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

  private openMarket(page = 0) {
    if (this.busy) return;
    const keys = Object.keys(this.f.basket).filter((k) => this.f.basket[k] > 0);
    if (!keys.length) {
      toast(this, tr('Nothing to sell yet. Grow some veggies!'));
      return;
    }
    // Golden crops first: they are the exciting ones.
    keys.sort((a, b) => Number(parseKey(b).golden) - Number(parseKey(a).golden));
    const c = this.overlay(tr('Market: sell your harvest'));
    c.add(txt(this, W / 2, 112, tr('Answer right for the full price. Wrong answers get half.'), 16, C.dim).setOrigin(0.5));
    // Seven kinds per page; the kitchen and orchard can fill the basket with many.
    const PER = 7;
    const pages = Math.ceil(keys.length / PER);
    page = Math.min(page, pages - 1);
    keys.slice(page * PER, page * PER + PER).forEach((key, k) => {
      const { crop: id, golden } = parseKey(key);
      const n = this.f.basket[key];
      const y = 132 + k * 50;
      const g = this.add.graphics();
      g.fillStyle(golden ? 0x5a4410 : 0x3a2a18, 1).fillRoundedRect(W / 2 - 300, y, 600, 44, 10);
      c.add(g);
      const icon = this.add.image(W / 2 - 270, y + 22, crop(id).item).setScale(2.5);
      if (golden) icon.setTint(0xffd24a);
      c.add(icon);
      const name = golden ? tr('Golden {crop}', { crop: tr(crop(id).name) }) : tr(crop(id).name);
      c.add(txt(this, W / 2 - 236, y + 22, `${name} x${n}`, 18, golden ? '#ffd24a' : '#ffffff').setOrigin(0, 0.5));
      c.add(txt(this, W / 2 + 40, y + 22, tr('{n} coins', { n: fmtNum(saleValue(key, n, true, this.f)) }), 17, '#ffd24a').setOrigin(0, 0.5));
      c.add(button(this, W / 2 + 230, y + 22, 120, 36, tr('Sell'), () => {
        c.destroy();
        this.sellCrop(key);
      }, { size: 17, color: 0x2f9a4a }));
    });
    if (pages > 1) {
      c.add(txt(this, W / 2, H - 52, tr('Page {n} of {max}', { n: page + 1, max: pages }), 15, C.dim).setOrigin(0.5));
      c.add(button(this, W / 2 + 200, H - 52, 150, 36, tr('More'), () => {
        c.destroy();
        this.busy = false;
        this.openMarket((page + 1) % pages);
      }, { size: 16, color: 0x4b3a78 }));
    }
  }

  private sellCrop(key: string) {
    const n = this.f.basket[key] ?? 0;
    if (n <= 0) return;
    this.busy = true;
    const { crop: id, golden } = parseKey(key);
    const name = golden ? tr('Golden {crop}', { crop: tr(crop(id).name) }) : tr(crop(id).name);
    const q = this.engine.next();
    new QuestionPanel(this, q, {
      header: tr('Sell {crop} x{n}', { crop: name, n }),
      readAloud: this.f.settings.readAloud,
      result: {
        right: tr('Answer: {answer}\nFull price: {coins} coins!', { coins: fmtNum(saleValue(key, n, true, this.f)) }),
        wrong: tr('You said: {given}\nRight answer: {answer}\nHalf price this time: {coins} coins', { coins: fmtNum(saleValue(key, n, false, this.f)) }),
        go: tr('Sell!'),
      },
      done: (correct) => {
        this.engine.record(q, correct);
        const coins = sell(this.f, key, correct);
        saveFarm(this.f);
        this.busy = false;
        sfx('coin');
        this.floatText(150, 300, `+${fmtNum(coins)}`, '#ffd24a');
        this.refresh();
      },
    });
  }

  // ------------------------------------------------------------ orders

  private openOrders() {
    if (this.busy) return;
    refreshOrders(this.f);
    const c = this.overlay(tr('Order board'));
    c.add(txt(this, W / 2, 104, tr('Bring the neighbours what they ask for. Orders pay extra!'), 16, C.dim).setOrigin(0.5));
    for (let i = 0; i < MAX_ORDERS; i++) {
      const x = W / 2 - 390 + i * 264;
      const y = 128;
      const g = this.add.graphics();
      g.fillStyle(0xf4ecd4, 1).fillRoundedRect(x, y, 252, 300, 8);
      g.lineStyle(3, 0x8a5a2a, 1).strokeRoundedRect(x, y, 252, 300, 8);
      g.fillStyle(0xc0392b, 1).fillCircle(x + 126, y + 10, 7);
      c.add(g);
      const o = this.f.orders[i];
      if (!o) {
        const wait = Math.max(0, this.f.nextOrderAt - Date.now());
        c.add(txt(this, x + 126, y + 150, tr('A new order comes in {time}', { time: clock(wait) }), 16, '#6a5a3a', { align: 'center', wordWrap: { width: 220 } }).setOrigin(0.5));
        continue;
      }
      this.orderCard(c, o, x, y);
    }
  }

  private orderCard(c: Phaser.GameObjects.Container, o: Order, x: number, y: number) {
    const who = neighbour(o.who);
    c.add(this.add.image(x + 46, y + 60, who.sprite).setScale(4));
    const name = txt(this, x + 90, y + 34, tr(who.name), 16, '#3a2410', { wordWrap: { width: 150 } });
    c.add(name);
    c.add(txt(this, x + 90, name.y + name.height + 2, tr('would like:'), 14, '#6a5a3a'));
    o.items.forEach((it, k) => {
      const yy = y + 124 + k * 44;
      const have = this.f.basket[it.crop] ?? 0;
      c.add(this.add.image(x + 46, yy, crop(it.crop).item).setScale(3));
      c.add(txt(this, x + 76, yy, `${tr(crop(it.crop).name)} x${it.n}`, 15, '#3a2410', { wordWrap: { width: 120 } }).setOrigin(0, 0.5));
      c.add(txt(this, x + 236, yy, `${Math.min(have, it.n)}/${it.n}`, 16, have >= it.n ? '#1e8a3a' : '#b03030').setOrigin(1, 0.5));
    });
    c.add(txt(this, x + 126, y + 226, tr('Reward: {n} coins', { n: fmtNum(o.reward) }), 17, '#8a5410').setOrigin(0.5));
    const b = button(this, x + 126, y + 268, 200, 42, tr('Deliver'), () => {
      c.destroy();
      this.deliver(o);
    }, { size: 18, color: 0x2f9a4a });
    b.setEnabled(canFill(this.f, o));
    c.add(b);
  }

  private deliver(o: Order) {
    this.busy = true;
    const who = neighbour(o.who);
    const q = this.engine.next();
    new QuestionPanel(this, q, {
      header: tr('Order for {name}', { name: tr(who.name) }),
      readAloud: this.f.settings.readAloud,
      result: {
        right: tr('Answer: {answer}\nFull reward: {coins} coins!', { coins: fmtNum(o.reward) }),
        wrong: tr('You said: {given}\nRight answer: {answer}\nHalf reward this time: {coins} coins', { coins: fmtNum(Math.round(o.reward / 2)) }),
        go: tr('Deliver!'),
      },
      done: (correct) => {
        this.engine.record(q, correct);
        const coins = fillOrder(this.f, o.id, correct);
        saveFarm(this.f);
        this.busy = false;
        sfx('levelup');
        this.floatText(226, 230, `+${fmtNum(coins)}`, '#ffd24a');
        toast(this, tr('{name} says thank you!', { name: tr(who.name) }), C.good);
        this.refresh();
      },
    });
  }

  // ---------------------------------------------------------- pet card

  /** Tap a happy animal: see how it's doing, rename it, give it a hat. */
  private petCard(v: AnimalView) {
    const a = v.a;
    const c = this.overlay(a.name);
    c.add(this.add.image(W / 2 - 230, 200, animal(a.kind).sprite).setScale(8));
    if (a.hat) {
      const head = headOf(animal(a.kind).sprite);
      c.add(this.add.image(W / 2 - 230 + head.x * 8, 200 + head.y * 8 - 4, hat(a.hat)!.sprite).setScale(6));
    }
    c.add(txt(this, W / 2 - 230, 290, tr(animal(a.kind).name), 18, C.dim).setOrigin(0.5));
    c.add(txt(this, W / 2 - 60, 140, tr('{name} is happy!', { name: a.name }), 24, C.good));
    c.add(txt(this, W / 2 - 60, 176, tr('Hungry again in {time}', { time: clock(happyLeft(a, Date.now(), this.f)) }), 17, C.text));
    c.add(button(this, W / 2 + 40, 230, 200, 44, tr('Rename'), () => {
      openKeyboard(this, tr('New name for {name}?', { name: a.name }), a.name, true, (name) => {
        renameAnimal(a, name);
        saveFarm(this.f);
        c.destroy();
        this.busy = false;
        this.buildPen();
        this.refresh();
      });
    }, { size: 18, color: 0x2e5a7a }));
    c.add(txt(this, W / 2 - 300, 330, tr('Hats:'), 20, '#ffd24a'));
    const owned = HATS.filter((h) => this.f.hats.includes(h.id));
    if (!owned.length) c.add(txt(this, W / 2 - 220, 334, tr('Buy hats in the Shop!'), 17, C.dim));
    [undefined, ...owned.map((h) => h.id)].forEach((id, k) => {
      const x = W / 2 - 230 + k * 96;
      const y = 400;
      const on = a.hat === id;
      const g = this.add.graphics();
      g.fillStyle(on ? 0x2f9a4a : 0x3a2a18, 1).fillRoundedRect(x - 42, y - 36, 84, 72, 10);
      c.add(g);
      if (id) c.add(this.add.image(x, y, hat(id)!.sprite).setScale(4));
      else c.add(txt(this, x, y, tr('No hat'), 14).setOrigin(0.5));
      c.add(this.add.zone(x - 42, y - 36, 84, 72).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        wearHat(this.f, a, id);
        sfx('equip');
        saveFarm(this.f);
        c.destroy();
        this.busy = false;
        this.buildPen();
        this.refresh();
        const nv = this.animals.find((x2) => x2.a.id === a.id);
        if (nv) this.petCard(nv);
      }));
    });
  }

  // -------------------------------------------------------------- shop

  private openShop(tab: ShopTab = 'animals') {
    if (this.busy) return;
    const c = this.overlay(tr('Farm Shop'));
    const tabs: [ShopTab, string][] = [['animals', tr('Animals')], ['upgrades', tr('Upgrades')], ['gear', tr('Gear')], ['hats', tr('Hats')]];
    tabs.forEach(([id, label], k) => {
      c.add(button(this, W / 2 - 279 + k * 186, 118, 176, 40, label, () => {
        c.destroy();
        this.busy = false;
        this.openShop(id);
      }, { size: 17, color: tab === id ? 0x2f9a4a : 0x4b3a78 }));
    });
    const reopen = () => {
      c.destroy();
      this.busy = false;
      this.openShop(tab);
    };

    if (tab === 'gear') {
      GEAR.forEach((g, k) => {
        const y = 150 + k * 66;
        const owned = hasGear(this.f, g.id);
        const bg = this.add.graphics();
        bg.fillStyle(owned ? 0x1e4a2a : 0x3a2a18, 1).fillRoundedRect(W / 2 - 330, y, 660, 58, 10);
        c.add(bg);
        c.add(this.add.image(W / 2 - 296, y + 29, g.icon).setScale(3));
        c.add(txt(this, W / 2 - 256, y + 8, tr(g.name), 19));
        c.add(txt(this, W / 2 - 256, y + 34, tr(g.desc), 14, C.dim));
        if (owned) c.add(txt(this, W / 2 + 240, y + 29, tr('Owned'), 18, C.good).setOrigin(0.5));
        else {
          const b = button(this, W / 2 + 240, y + 29, 150, 42, tr('{n} coins', { n: fmtNum(g.cost) }), () => {
            if (!buyGear(this.f, g.id)) return;
            sfx('levelup');
            saveFarm(this.f);
            this.refresh();
            reopen();
          }, { size: 16, color: 0xb07a10 });
          b.setEnabled(this.f.coins >= g.cost);
          c.add(b);
        }
      });
      return;
    }
    if (tab === 'hats') {
      c.add(txt(this, W / 2, 158, tr('Tap a happy animal to put a hat on it.'), 16, C.dim).setOrigin(0.5));
      HATS.forEach((h, k) => {
        const x = W / 2 - 330 + (k % 3) * 224;
        const y = 180 + Math.floor(k / 3) * 134;
        const owned = this.f.hats.includes(h.id);
        const bg = this.add.graphics();
        bg.fillStyle(owned ? 0x1e4a2a : 0x3a2a18, 1).fillRoundedRect(x, y, 212, 124, 10);
        c.add(bg);
        c.add(this.add.image(x + 50, y + 46, h.sprite).setScale(5));
        c.add(txt(this, x + 100, y + 30, tr(h.name), 17, '#ffffff', { wordWrap: { width: 106 } }));
        if (owned) c.add(txt(this, x + 106, y + 100, tr('Owned'), 17, C.good).setOrigin(0.5));
        else {
          const b = button(this, x + 106, y + 100, 150, 34, tr('{n} coins', { n: fmtNum(h.cost) }), () => {
            if (!buyHat(this.f, h.id)) return;
            sfx('coin');
            saveFarm(this.f);
            this.refresh();
            reopen();
          }, { size: 15, color: 0xb07a10 });
          b.setEnabled(this.f.coins >= h.cost);
          c.add(b);
        }
      });
      return;
    }
    if (tab === 'animals') {
      const free = stallCount(this.f) - this.f.animals.length;
      c.add(txt(this, W / 2, 158, free > 0 ? tr('Free stalls: {n}', { n: free }) : tr('No free stalls. Buy more stalls in Upgrades!'), 16, free > 0 ? C.good : '#ffb36b').setOrigin(0.5));
      const list = WORLDS[this.worldId].animals;
      const step = Math.min(172, Math.floor(820 / list.length));
      const cw = step - 10;
      list.forEach((an, k) => {
        const x = W / 2 - (step * list.length) / 2 + k * step + 5;
        const y = 180;
        const g = this.add.graphics();
        g.fillStyle(0x3a2a18, 1).fillRoundedRect(x, y, cw, 270, 10);
        g.lineStyle(2, 0xffd24a, 0.8).strokeRoundedRect(x, y, cw, 270, 10);
        c.add(g);
        const mid = x + cw / 2;
        c.add(this.add.image(mid, y + 56, an.sprite).setScale(4));
        c.add(txt(this, mid, y + 108, tr(an.name), 19).setOrigin(0.5));
        c.add(txt(this, mid, y + 134, tr('{n} coins', { n: fmtNum(an.cost) }), 16, '#ffd24a').setOrigin(0.5));
        c.add(txt(this, mid, y + 150, tr('Earns {n} a minute when happy', { n: an.incomePerMin }), 13, C.dim, { align: 'center', wordWrap: { width: cw - 14 } }).setOrigin(0.5, 0));
        if (an.product) {
          c.add(this.add.image(mid, y + 196, crop(an.product).item).setScale(1.8));
          c.add(txt(this, mid, y + 216, tr(crop(an.product).name), 13, '#9aff9a', { align: 'center' }).setOrigin(0.5));
        }
        const b = button(this, mid, y + 248, Math.min(130, cw - 16), 34, tr('Buy'), () => {
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
      const rows: { icon: string; title: string; desc: string; cost?: number; buy?: () => boolean; paid?: boolean }[] = [];
      const land = nextLand(this.f);
      rows.push(
        land
          ? { icon: 'farm_soil', title: tr('Bigger garden'), desc: tr('{n} more garden plots', { n: land.plots - this.f.plots.length }), cost: land.cost, buy: () => buyLand(this.f), paid: this.landIsPaid() }
          : { icon: 'farm_soil', title: tr('Bigger garden'), desc: tr('Your garden is as big as it gets!') },
      );
      const st = nextStalls(this.f);
      rows.push(
        st
          ? { icon: 'farm_hay', title: tr('More stalls'), desc: st.stalls - stallCount(this.f) === 1 ? tr('1 more animal stall') : tr('{n} more animal stalls', { n: st.stalls - stallCount(this.f) }), cost: st.cost, buy: () => buyStalls(this.f), paid: this.stallsArePaid() }
          : { icon: 'farm_hay', title: tr('More stalls'), desc: tr('Your barn is full size!') },
      );
      if (this.worldId === 'home') {
        const root = rootOf(this.f);
        if (root.portal) rows.push({ icon: 'farm_portal', title: tr('Magic portal'), desc: tr('Built! Tap the portal on your farm to visit the magic world.') });
        else if (!fullGame('farm')) rows.push({ icon: 'farm_portal', title: tr('Magic portal'), desc: tr('A door to a magical world with unicorns and dragons!'), paid: true });
        else {
          rows.push({
            icon: 'farm_portal', title: tr('Magic portal'), desc: tr('A door to a magical world with unicorns and dragons!'), cost: PORTAL_COST,
            buy: () => {
              if (!buyPortal(root)) return false;
              // Show the new portal right away (no shop on top).
              saveFarm(this.f);
              sfx('summon');
              this.scene.restart({ world: 'home' });
              return false;
            },
          });
        }
      }
      rows.forEach((r, k) => {
        const y = 170 + k * 86;
        const g = this.add.graphics();
        g.fillStyle(0x3a2a18, 1).fillRoundedRect(W / 2 - 330, y, 660, 76, 10);
        c.add(g);
        c.add(this.add.image(W / 2 - 290, y + 38, r.icon).setScale(r.icon === 'farm_portal' ? 1.8 : 3));
        c.add(txt(this, W / 2 - 240, y + 14, r.title, 20));
        c.add(txt(this, W / 2 - 240, y + 44, r.desc, 15, C.dim));
        if (r.paid) {
          c.add(button(this, W / 2 + 240, y + 38, 150, 46, tr('Full game'), () => {
            fullGamePrompt(this, 'farm', r.icon === 'farm_portal' ? tr('The magic world is part of the full game.') : tr('A bigger farm is part of the full game.'));
          }, { size: 16, color: 0x7a5a2a }));
        } else if (r.buy && r.cost !== undefined) {
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

  /** The free farm goes up to FREE_LIMITS; bigger is the full game. */
  private landIsPaid(): boolean {
    return this.worldId === 'home' && this.f.landTier + 1 > FREE_LIMITS.farmLandTier && !fullGame('farm');
  }

  private stallsArePaid(): boolean {
    return this.worldId === 'home' && this.f.stallTier + 1 > FREE_LIMITS.farmStallTier && !fullGame('farm');
  }

  private buyLandSign() {
    const next = nextLand(this.f);
    if (!next) return;
    if (this.landIsPaid()) {
      fullGamePrompt(this, 'farm', tr('A bigger farm is part of the full game.'));
      return;
    }
    if (this.f.coins < next.cost) {
      toast(this, tr('You need {n} coins for more garden.', { n: fmtNum(next.cost) }), '#ffb36b');
      return;
    }
    this.openShop('upgrades');
  }

  private buyStallSign() {
    const next = nextStalls(this.f);
    if (!next) return;
    if (this.stallsArePaid()) {
      fullGamePrompt(this, 'farm', tr('More animal stalls are part of the full game.'));
      return;
    }
    if (this.f.coins < next.cost) {
      toast(this, tr('You need {n} coins for more stalls.', { n: fmtNum(next.cost) }), '#ffb36b');
      return;
    }
    this.openShop('upgrades');
  }

  // ------------------------------------------------------------- portal

  /** Step through the portal to the other farm. */
  private travel() {
    if (this.busy) return;
    this.busy = true;
    saveFarm(this.f);
    sfx('summon');
    this.cameras.main.flash(500, 200, 150, 255);
    this.cameras.main.fadeOut(500, 40, 10, 80);
    this.time.delayedCall(520, () => this.scene.restart({ world: this.worldId === 'home' ? 'magic' : 'home' }));
  }

  /** Little floating lights in the magic world. */
  private sparkles() {
    for (let i = 0; i < 30; i++) {
      const d = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(60, H - 40), 'dot')
        .setTint(Phaser.Utils.Array.GetRandom([0xfff0a0, 0xb0f0ff, 0xffb0e0]))
        .setAlpha(0.3)
        .setScale(0.5)
        .setBlendMode('ADD')
        .setDepth(30);
      this.tweens.add({
        targets: d,
        y: d.y - Phaser.Math.Between(20, 60),
        alpha: { from: 0.1, to: 0.8 },
        duration: Phaser.Math.Between(1800, 3600),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  // ------------------------------------------------------------ kitchen

  private openKitchen() {
    if (this.busy) return;
    const c = this.overlay(tr('Farm Kitchen'));
    c.add(txt(this, W / 2, 98, tr('Cook food from your basket. A right answer makes 2 dishes!'), 16, C.dim).setOrigin(0.5));
    RECIPES.forEach((r, k) => {
      const x = 80 + (k % 5) * 162;
      const y = 116 + Math.floor(k / 5) * 190;
      const ok = canCook(this.f, r.id);
      const g = this.add.graphics();
      g.fillStyle(ok ? 0x2a4a1e : 0x3a2a18, 1).fillRoundedRect(x, y, 152, 180, 10);
      g.lineStyle(2, ok ? 0x9aff9a : 0x8a6a3a, 0.9).strokeRoundedRect(x, y, 152, 180, 10);
      c.add(g);
      const dish = crop(r.id);
      c.add(this.add.image(x + 76, y + 28, dish.item).setScale(3));
      const name = txt(this, x + 76, y + 62, tr(dish.name), 15, '#ffffff', { align: 'center', wordWrap: { width: 140 } }).setOrigin(0.5);
      c.add(name);
      const parts = Object.entries(r.needs);
      parts.forEach(([id, n], i) => {
        const px = x + 76 + (i - (parts.length - 1) / 2) * 36;
        const have = this.f.basket[id] ?? 0;
        c.add(this.add.image(px, y + 102, crop(id).item).setScale(1.8));
        c.add(txt(this, px, y + 124, `${Math.min(have, n)}/${n}`, 13, have >= n ? '#9aff9a' : '#ff9a8a').setOrigin(0.5));
      });
      const b = button(this, x + 76, y + 156, 120, 34, tr('Cook'), () => {
        c.destroy();
        this.cookDish(r.id);
      }, { size: 16, color: 0x2f9a4a });
      b.setEnabled(ok);
      c.add(b);
    });
  }

  private cookDish(id: string) {
    this.busy = true;
    const name = tr(crop(id).name);
    const q = this.engine.next();
    new QuestionPanel(this, q, {
      header: tr('Cook: {dish}', { dish: name }),
      readAloud: this.f.settings.readAloud,
      result: {
        right: tr('Answer: {answer}\nYou made 2 {dish}!', { dish: name }),
        wrong: tr('You said: {given}\nRight answer: {answer}\nYou made 1 {dish}.', { dish: name }),
        go: tr('Yum!'),
      },
      done: (correct) => {
        this.engine.record(q, correct);
        cook(this.f, id, correct);
        saveFarm(this.f);
        this.busy = false;
        sfx('levelup');
        const pop = this.add.image(370, 370, crop(id).item).setScale(4).setDepth(40);
        this.tweens.add({ targets: pop, x: 150, y: 330, scale: 2, duration: 800, ease: 'Quad.In', onComplete: () => pop.destroy() });
        this.refresh();
        this.openKitchen();
      },
    });
  }

  // ------------------------------------------------------------ journal

  private openJournal() {
    if (this.busy) return;
    const f = this.f;
    const q = currentQuest(f);
    const c = this.overlay(tr('Farm Journal'));
    c.add(this.add.image(130, 66, 'farm_journal').setScale(3));
    if (!q) {
      c.add(this.add.image(W / 2, 190, 'trophy_gold').setScale(7));
      c.add(txt(this, W / 2, 290, tr('The story is done: you are the Grand Champion!'), 24, '#ffd24a', { align: 'center', wordWrap: { width: 700 } }).setOrigin(0.5));
      c.add(txt(this, W / 2, 340, tr('Keep farming, cooking and picking fruit. Your neighbours love you!'), 17, C.text, { align: 'center', wordWrap: { width: 700 } }).setOrigin(0.5));
      return;
    }
    const chapter = CHAPTERS.find((ch) => ch.quests.includes(q))!;
    c.add(txt(this, W / 2, 104, tr(chapter.title), 20, '#c98aff').setOrigin(0.5));
    // Who asks, and what they say.
    const who = neighbour(q.who);
    c.add(this.add.image(150, 186, who.sprite).setScale(5));
    c.add(txt(this, 150, 236, tr(who.name), 15, '#ffe9a0').setOrigin(0.5));
    const g = this.add.graphics();
    g.fillStyle(0xf4ecd4, 1).fillRoundedRect(220, 136, 600, 110, 12);
    g.fillTriangle(220, 180, 220, 204, 200, 192);
    c.add(g);
    const ask = this.f.settings.lang === 'fr' ? `« ${tr(q.ask)} »` : `“${tr(q.ask)}”`;
    c.add(txt(this, 240, 150, ask, 18, '#3a2410', { wordWrap: { width: 560 } }));
    const met = questMet(f, q);
    c.add(txt(this, 240, 214, `${met ? '✔' : '•'} ${tr(q.goal)}`, 18, met ? '#1e8a3a' : '#8a5410', { wordWrap: { width: 560 } }));
    // The jobs in this chapter.
    const done = rootOf(f).questsDone;
    chapter.quests.forEach((x, i) => {
      const y = 274 + i * 30;
      const finished = done.includes(x.id);
      const now = x === q;
      c.add(txt(this, 120, y, `${finished ? '✔' : now ? '➜' : '·'}  ${tr(x.goal)}`, 16, finished ? C.good : now ? '#ffe9a0' : C.dim));
      c.add(txt(this, W - 140, y, tr('{n} coins', { n: x.reward }), 15, finished ? C.dim : '#ffd24a').setOrigin(1, 0));
    });
    // The free farm tells the first part of the story.
    if (this.questLocked(q)) {
      c.add(txt(this, W / 2, H - 92, tr('The rest of the story is part of the full game.'), 17, '#ffb36b').setOrigin(0.5));
      c.add(button(this, W / 2, H - 56, 180, 42, tr('Full game'), () => fullGamePrompt(this, 'farm', tr('The rest of the story is part of the full game.')), { size: 17, color: 0x7a5a2a }));
      return;
    }
    if (met) {
      const b = button(this, W / 2, H - 70, 260, 52, tr('Get {n} coins!', { n: q.reward }), () => {
        const got = claimQuest(f);
        if (!got) return;
        sfx('levelup');
        saveFarm(f);
        c.destroy();
        this.busy = false;
        this.floatText(434, 70, `+${got.reward}`, '#ffd24a');
        if (got.unlocks) {
          // Something new appears on the farm.
          const msg = { kitchen: tr('Mrs. Moose built you a Farm Kitchen!'), orchard: tr('Mr. Beaver opened the path to the Orchard!'), fair: tr('The County Fair has come to town!') }[got.unlocks];
          this.scene.restart({ world: this.worldId, note: msg });
          return;
        }
        this.refresh();
        this.openJournal();
      }, { size: 20, color: 0x2f9a4a });
      this.tweens.add({ targets: b, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
      c.add(b);
    }
  }

  /** The free farm tells the first part of the story; the rest is the full game. */
  private questLocked(q: (typeof QUESTS)[number]): boolean {
    return QUESTS.indexOf(q) >= QUESTS.findIndex((x) => x.id === 'milk3') && !fullGame('farm');
  }

  // ---------------------------------------------------------- county fair

  private openFair() {
    if (this.busy) return;
    const f = this.f;
    const c = this.overlay(tr('County Fair'));
    c.add(txt(this, W / 2, 100, tr('Granny Owl is the judge. Answer 3 questions; 2 right wins a blue ribbon!'), 16, C.dim, { align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5));
    CONTESTS.forEach((ct, k) => {
      const x = 92 + k * 262;
      const y = 130;
      const r = f.ribbons[ct.id];
      const g = this.add.graphics();
      g.fillStyle(r === 'blue' ? 0x1e3a6a : 0x3a2a18, 1).fillRoundedRect(x, y, 250, 330, 12);
      g.lineStyle(2, 0xffd24a, 0.8).strokeRoundedRect(x, y, 250, 330, 12);
      c.add(g);
      c.add(this.add.image(x + 125, y + 56, ct.icon).setScale(4));
      c.add(txt(this, x + 125, y + 110, tr(ct.name), 21, '#ffd24a').setOrigin(0.5));
      c.add(txt(this, x + 125, y + 150, tr(ct.need), 15, C.text, { align: 'center', wordWrap: { width: 220 } }).setOrigin(0.5));
      if (r) {
        c.add(this.add.image(x + 125, y + 214, r === 'blue' ? 'ribbon_blue' : 'ribbon_red').setScale(3.5));
        c.add(txt(this, x + 125, y + 254, r === 'blue' ? tr('Blue ribbon: first prize!') : tr('Red ribbon: try again for blue!'), 14, r === 'blue' ? '#9ad0ff' : '#ff9a8a', { align: 'center', wordWrap: { width: 220 } }).setOrigin(0.5));
      }
      if (r !== 'blue') {
        const ok = canEnter(f, ct.id);
        const b = button(this, x + 125, y + 298, 180, 40, ok ? tr('Enter!') : tr('Not ready yet'), () => {
          c.destroy();
          this.contest(ct, 0, 0);
        }, { size: 17, color: 0x2f9a4a });
        b.setEnabled(ok);
        c.add(b);
      }
    });
  }

  /** Three questions from the judge, one after the other. */
  private contest(ct: ContestDef, asked: number, right: number) {
    this.busy = true;
    if (asked >= CONTEST_QUESTIONS) {
      const champion = judge(this.f, ct.id, right);
      saveFarm(this.f);
      this.busy = false;
      const blue = this.f.ribbons[ct.id] === 'blue';
      sfx(blue ? 'victory' : 'click');
      const c = this.overlay(tr(ct.name));
      c.add(this.add.image(W / 2, 200, blue ? 'ribbon_blue' : 'ribbon_red').setScale(7));
      c.add(txt(this, W / 2, 310, tr('{n} of {max} right!', { n: right, max: CONTEST_QUESTIONS }), 24, C.text).setOrigin(0.5));
      c.add(txt(this, W / 2, 352, blue ? tr('You won a blue ribbon!') : tr('A red ribbon. Practice and try again!'), 22, blue ? '#9ad0ff' : '#ffb36b').setOrigin(0.5));
      c.add(button(this, W / 2, H - 80, 200, 50, tr('OK'), () => {
        c.destroy();
        this.busy = false;
        if (champion) this.championParty();
        else this.scene.restart({ world: this.worldId });
      }, { size: 20, color: 0x2f9a4a }));
      return;
    }
    const q = this.engine.next();
    new QuestionPanel(this, q, {
      header: tr('{contest}: question {n} of {max}', { contest: tr(ct.name), n: asked + 1, max: CONTEST_QUESTIONS }),
      readAloud: this.f.settings.readAloud,
      result: { right: tr('Answer: {answer}\nThe judge nods!'), wrong: tr('You said: {given}\nRight answer: {answer}'), go: tr('Next') },
      done: (correct) => {
        this.engine.record(q, correct);
        saveFarm(this.f);
        this.contest(ct, asked + 1, right + (correct ? 1 : 0));
      },
    });
  }

  /** The end of the story: Grand Champion of the County Fair. */
  private championParty() {
    this.busy = true;
    sfx('victory');
    const c = this.add.container(0, 0).setDepth(2000);
    c.add(this.add.rectangle(0, 0, W, H, 0x1a1030, 0.92).setOrigin(0).setInteractive());
    c.add(this.add.particles(0, 0, 'dot', { x: { min: 0, max: W }, y: -10, speedY: { min: 80, max: 200 }, speedX: { min: -40, max: 40 }, lifespan: 4000, scale: { start: 1.6, end: 1 }, tint: [0xffd24a, 0x5ef07a, 0x7fd3ff, 0xff6a9a], frequency: 35 }));
    const cup = this.add.image(W / 2, 150, 'trophy_gold').setScale(8);
    c.add(cup);
    this.tweens.add({ targets: cup, scale: 8.8, duration: 600, yoyo: true, repeat: -1 });
    CONTESTS.forEach((_ct, k) => c.add(this.add.image(W / 2 - 60 + k * 60, 240, 'ribbon_blue').setScale(3)));
    c.add(txt(this, W / 2, 300, tr('Grand Champion!'), 44, '#ffd24a').setOrigin(0.5).setStroke('#2a1d10', 8));
    c.add(txt(this, W / 2, 356, tr('{name} won all three blue ribbons at the County Fair. The whole town is cheering!', { name: this.f.farmer }), 20, C.text, { align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5));
    NEIGHBOURS_PARTY.forEach((id, k) => {
      const n = this.add.image(140 + k * 226, 440, neighbour(id).sprite).setScale(4);
      c.add(n);
      this.tweens.add({ targets: n, y: 426, duration: 300 + k * 40, yoyo: true, repeat: -1 });
    });
    c.add(button(this, W / 2, H - 40, 220, 48, tr('Hooray!'), () => {
      c.destroy();
      this.busy = false;
      this.scene.restart({ world: this.worldId });
    }, { size: 22, color: 0x2f9a4a }));
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
      const state = plotState(p, now, this.f);
      v.bar.clear();
      if (state === 'empty') {
        v.plant.setVisible(false);
        return;
      }
      const g = growth(p, now, this.f);
      const [seeds, sprout, grown] = this.look.stages;
      const tex = state === 'ready' ? crop(p.crop!).sprite : g < 0.2 ? seeds : g < 0.55 ? sprout : grown;
      v.plant.setTexture(tex).setVisible(true);
      if (state === 'growing') {
        const { x, y } = this.plotPos(i);
        v.bar.fillStyle(0x000000, 0.6).fillRect(x + 6, y + GARDEN.size - 10, GARDEN.size - 12, 6);
        v.bar.fillStyle(0x7dff9a, 1).fillRect(x + 6, y + GARDEN.size - 10, (GARDEN.size - 12) * g, 6);
      }
    });
    for (const v of this.animals) {
      accrue(v.a, now, this.f);
      const hungry = isHungry(v.a, now, this.f);
      v.alert.setVisible(hungry);
      v.heart.setVisible(!hungry);
      v.coin.setVisible(v.a.pending >= 1);
      if (v.prod) {
        const has = productsReady(v.a, now, this.f) > 0;
        v.prod.setVisible(has);
        if (has) v.heart.setVisible(false);
      }
      v.body.setTint(hungry ? 0xd8d0c8 : 0xffffff);
    }
    if (refreshOrders(this.f, now)) saveFarm(this.f);
    const ready = this.f.orders.filter((o) => canFill(this.f, o)).length;
    this.boardBadge.setText(ready ? `${ready}` : `${this.f.orders.length}`).setBackgroundColor(ready ? '#2f9a4a' : '#c0392b').setVisible(this.f.orders.length > 0);
    const basket = Object.values(this.f.basket).reduce((a, b) => a + b, 0);
    this.basketText.setText(basket ? tr('{n} to sell', { n: basket }) : '');
    const q = currentQuest(this.f);
    this.journalBadge.setVisible(!!q && questMet(this.f, q) && !this.questLocked(q));
    this.tip.setText(this.currentTip(now));
  }

  private currentTip(now: number): string {
    if (this.animals.some((v) => isHungry(v.a, now, this.f))) return tr('An animal is hungry! Tap the red ! to feed it.');
    const q = currentQuest(this.f);
    if (q && questMet(this.f, q) && !this.questLocked(q)) return tr('Job done! Open your Journal to get the reward.');
    if (this.animals.some((v) => v.prod?.visible)) return tr('Your animals made something! Tap it to pick it up.');
    if (this.f.plots.some((p) => plotState(p, now, this.f) === 'ready')) return tr('Something is ready! Tap it to pick it.');
    if (this.f.orders.some((o) => canFill(this.f, o))) return tr('You can fill an order! Tap the Orders board.');
    if (Object.values(this.f.basket).some((n) => n > 0)) return tr('Take your harvest to the Market to sell it.');
    if (this.f.plots.some((p) => plotState(p, now, this.f) === 'empty')) return tr('Tap an empty garden plot to plant seeds.');
    if (this.animals.some((v) => v.a.pending >= 1)) return tr('Tap the coins above your animals to collect them.');
    if (q && !this.questLocked(q)) return tr('Next job: {goal}', { goal: tr(q.goal) });
    return tr('Your farm is growing! Save up coins for upgrades in the Shop.');
  }
}
