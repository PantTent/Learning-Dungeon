import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { tr } from '../i18n';
import { animal, BOSSES, DESERT, FOREST, food, JUNGLE, LANDS, MOUNTAINS, QUESTS, RECIPES, SHOP, wild, type LandId, type WildDef } from '../animal/data';
import { buy, canCook, canTurnIn, cook, currentQuest, hasCharm, landOpen, questOpen, loadAnimals, maxHearts, progress, puppiesFound, questReady, rest, saveAnimals, type AnimalSave } from '../animal/state';
import { ask, dialog, grassTexture, keyVector, questTalk, say, Stick, topBar, tx } from '../animal/ui';
import { jungleState } from './AnimalJungleScene';
import { desertState } from './AnimalDesertScene';
import { forestState } from './AnimalForestScene';
import { mountainsState } from './AnimalMountainsScene';
import type { LandState } from './AnimalLandScene';

/** Each land's screen, and what it remembers between battles. */
const LAND_SCENES: Record<LandId, { key: string; state: LandState }> = {
  jungle: { key: 'AnimalJungle', state: jungleState },
  desert: { key: 'AnimalDesert', state: desertState },
  forest: { key: 'AnimalForest', state: forestState },
  mountains: { key: 'AnimalMountains', state: mountainsState },
};
import { C, H, W, button, panel, txt } from '../ui/widgets';

/** The village helpers stand here. */
const NPC_SPOT: Record<string, { x: number; y: number }> = {
  badger: { x: 220, y: 230 },
  beaver: { x: 380, y: 220 },
  raccoon: { x: 700, y: 232 },
  dogmom: { x: 650, y: 430 },
  mole: { x: 410, y: 470 },
};
const BOARD = { x: 580, y: 190 };
const POND = { x: 160, y: 440 };
const KITCHEN = { x: 700, y: 160 };
const MUSEUM = { x: 320, y: 440 };
const SHOP_AT = { x: 880, y: 420 };
const SHOPKEEPER = { x: 800, y: 470 };
const TOP = 110;

/** Meadowbrook Village: the start area, with quest givers, shops and the paths to each land. */
export class AnimalVillageScene extends Phaser.Scene {
  private s!: AnimalSave;
  private hero!: Phaser.GameObjects.Image;
  private stick!: Stick;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private target: { x: number; y: number; then?: () => void } | null = null;
  private bar?: Phaser.GameObjects.Container;
  private marks: Phaser.GameObjects.Text[] = [];
  private busy = false;
  private bumped = 0;

  constructor() {
    super('AnimalVillage');
  }

  create(data: { fresh?: boolean; from?: LandId; tired?: boolean } = {}) {
    const s = loadAnimals();
    if (!s) {
      this.scene.start('AnimalSetup', { fresh: true });
      return;
    }
    this.s = s;
    this.busy = false;
    this.target = null;
    playMusic('farm');
    this.drawVillage();
    const start = {
      jungle: { x: W - 80, y: H / 2 + 20 },
      desert: { x: W / 2, y: H - 60 },
      forest: { x: 80, y: H / 2 + 20 },
      mountains: { x: W / 2, y: TOP + 40 },
    }[data.from ?? ('' as LandId)] ?? { x: W / 2, y: H / 2 + 60 };
    this.hero = this.add.image(start.x, start.y, animal(s.animal).sprite).setScale(3.6).setDepth(start.y);
    if (data.from === 'jungle') this.hero.setFlipX(true);
    this.tweens.add({ targets: this.hero, scaleY: 3.4, duration: 450, yoyo: true, repeat: -1 });
    this.stick = new Stick(this);
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.busy || over.length || this.stick.owns(p) || p.y < TOP - 20) return;
      this.target = { x: p.x, y: p.y };
    });
    this.refresh();
    if (data.tired) {
      rest(s);
      saveAnimals(s);
      this.refresh();
      say(this, tr('You got tired and came home to rest. All hearts back!'), C.good);
    } else if (data.fresh) {
      this.time.delayedCall(400, () => this.talk('beaver'));
    } else if (s.quests.leopard === 'done' && !s.festival) {
      this.time.delayedCall(600, () => this.festival());
    }
  }

  private drawVillage() {
    const s = this.s;
    this.add.tileSprite(0, 0, W, H, grassTexture(this, 'village')).setOrigin(0).setTileScale(3);
    // Dirt paths to the four lands.
    const g = this.add.graphics();
    g.fillStyle(0xd0a468, 1).fillRect(0, H / 2 - 4, W, 56).fillRect(W / 2 - 28, TOP - 10, 56, H - TOP + 10);
    g.fillStyle(0xb88a50, 1).fillRect(0, H / 2 + 48, W, 4).fillRect(W / 2 + 24, TOP - 10, 4, H - TOP + 10);
    // Homes and decorations.
    this.add.image(110, 170, 'prop_hut').setScale(3.2);
    this.add.image(860, 170, 'prop_den').setScale(3.2);
    this.add.ellipse(POND.x, POND.y, 170, 80, 0x4a90e0).setStrokeStyle(4, 0x2a6ab0);
    this.add.ellipse(POND.x - 30, POND.y - 12, 50, 14, 0xb8e0ff, 0.6);
    this.label(POND.x, POND.y + 48, tr('Rest'));
    this.add.zone(POND.x, POND.y, 170, 80).setInteractive({ useHandCursor: true }).on('pointerup', () => this.walk(POND.x + 100, POND.y, () => this.restHere()));
    for (const [x, y] of [[60, 330], [920, 320], [250, 520]]) this.add.image(x, y, 'prop_flowers').setScale(3);
    const board = this.add.image(BOARD.x, BOARD.y, 'prop_board').setScale(3).setInteractive({ useHandCursor: true });
    board.on('pointerup', () => this.walk(BOARD.x, BOARD.y + 60, () => this.questBoard()));
    this.label(BOARD.x, BOARD.y + 40, tr('Quest board'));
    // The kitchen, the museum and the shop.
    const place = (at: { x: number; y: number }, sprite: string, name: string, walkTo: { x: number; y: number }, open: () => void) => {
      const img = this.add.image(at.x, at.y, sprite).setScale(3).setInteractive({ useHandCursor: true }).setDepth(at.y - 40);
      img.on('pointerup', () => this.walk(walkTo.x, walkTo.y, open));
      this.label(at.x, at.y - 66, name, 14);
    };
    place(KITCHEN, 'prop_kitchen', tr('Kitchen'), { x: KITCHEN.x, y: KITCHEN.y + 70 }, () => this.kitchen());
    place(MUSEUM, 'prop_museum', tr('Museum'), { x: MUSEUM.x + 60, y: MUSEUM.y + 40 }, () => this.museum());
    place(SHOP_AT, 'prop_shop', tr('Shop'), { x: SHOP_AT.x - 70, y: SHOP_AT.y + 30 }, () => this.shop());
    const keeper = this.add.image(SHOPKEEPER.x, SHOPKEEPER.y, 'npc_hedgehog').setScale(3.4).setInteractive({ useHandCursor: true }).setDepth(SHOPKEEPER.y);
    keeper.on('pointerup', () => this.walk(SHOPKEEPER.x - 50, SHOPKEEPER.y, () => this.shop()));
    this.label(SHOPKEEPER.x, SHOPKEEPER.y + 32, tr('Hazel Hedgehog'), 13);

    // The villagers who need help (some helpers live out in the lands).
    for (const [giver, sp] of Object.entries(NPC_SPOT)) {
      const q = QUESTS.find((x) => x.giver === giver)!;
      const npc = this.add.image(sp.x, sp.y, q.sprite).setScale(3.6).setFlipX(sp.x > W / 2).setInteractive({ useHandCursor: true }).setDepth(sp.y);
      this.tweens.add({ targets: npc, y: sp.y - 4, duration: 700 + sp.x, yoyo: true, repeat: -1 });
      npc.on('pointerup', () => this.walk(sp.x + (sp.x > W / 2 ? -60 : 60), sp.y + 10, () => this.talk(giver)));
      this.label(sp.x, sp.y + 34, tx(q.giverName), 14);
    }
    // Rescued puppies play by their mom; calm bosses come to visit.
    for (let i = 0; i < Math.min(5, puppiesFound(s)); i++) {
      const p = this.add.image(690 + (i % 3) * 30, 482 + Math.floor(i / 3) * 24, 'npc_puppy').setScale(2.6).setDepth(500);
      this.tweens.add({ targets: p, y: p.y - 8, duration: 300 + i * 60, yoyo: true, repeat: -1 });
    }
    if (s.gorillaCalm) this.add.image(590, 372, 'boss_gorilla').setScale(2.2).setDepth(372);
    if (s.tortoiseCalm) this.add.image(250, 210, 'boss_tortoise').setScale(2).setDepth(200);
    if (s.mooseCalm) this.add.image(140, 352, 'boss_moose').setScale(2).setDepth(352);
    // The Winter Festival: flags, a snowman and the snow leopard visiting.
    if (s.leopardCalm) {
      for (const x of [250, 700]) this.add.image(x, 346, 'prop_bunting').setScale(3).setDepth(346);
      this.add.image(790, 340, 'prop_snowman').setScale(3).setDepth(340);
      this.add.image(420, 350, 'boss_snowleopard').setScale(2).setDepth(350);
    }

    // The four ways out: open lands get a sign, closed ones a locked gate.
    for (const land of LANDS) {
      const pos = { right: { x: W - 34, y: H / 2 + 24 }, left: { x: 34, y: H / 2 + 24 }, up: { x: W / 2, y: TOP + 14 }, down: { x: W / 2, y: H - 36 } }[land.dir];
      if (landOpen(s, land.id)) {
        const look = {
          right: { sign: 'prop_sign', x: pos.x - 30, y: pos.y - 56, ly: pos.y - 100, arrow: '→' },
          down: { sign: 'prop_desertsign', x: pos.x + 70, y: pos.y - 10, ly: pos.y - 70, arrow: '↓' },
          left: { sign: 'prop_forestsign', x: pos.x + 30, y: pos.y - 56, ly: pos.y - 100, arrow: '←' },
          up: { sign: 'prop_snowsign', x: pos.x + 70, y: pos.y + 10, ly: pos.y - 26, arrow: '↑' },
        }[land.dir];
        const sign = this.add.image(look.x, look.y, look.sign).setScale(3).setDepth(look.y);
        if (land.dir === 'right') this.tweens.add({ targets: sign, angle: 4, duration: 800, yoyo: true, repeat: -1 });
        this.label(look.x + (land.dir === 'right' ? -30 : land.dir === 'left' ? 30 : 0), look.ly, land.dir === 'left' ? `${look.arrow} ${tx(land.name)}` : `${tx(land.name)} ${look.arrow}`);
      } else {
        const gate = this.add.image(pos.x, pos.y, 'prop_gate').setScale(land.dir === 'up' ? 2.2 : 2.6).setInteractive({ useHandCursor: true }).setDepth(pos.y + 40);
        gate.on('pointerup', () => say(this, this.lockedText(land.id), '#ffe9a0'));
        this.label(pos.x + (land.dir === 'left' ? 30 : 0), pos.y + (land.dir === 'down' ? -54 : 40), tx(land.name), 13);
      }
    }
  }

  private label(x: number, y: number, s: string, size = 15) {
    txt(this, x, y, s, size, '#ffffff').setOrigin(0.5, 0).setStroke('#1a3a10', 4).setDepth(900);
  }

  private refresh() {
    this.bar?.destroy();
    this.bar = topBar(this, this.s, () => this.refresh());
    // Quest marks over the villagers: ! new, ? ready to hand in, ... in progress.
    this.marks.forEach((m) => m.destroy());
    const s = this.s;
    const now = Object.keys(NPC_SPOT).map((giver) => currentQuest(s, giver)!);
    this.marks = now.filter((q) => s.quests[q.id] !== 'done' && (s.quests[q.id] !== 'new' || questReady(s, q.id)) && questOpen(s, q.id)).map((q) => {
      const sp = NPC_SPOT[q.giver];
      const ready = canTurnIn(s, q.id);
      const mark = s.quests[q.id] === 'new' ? '!' : ready ? '?' : '…';
      const t = txt(this, sp.x, sp.y - 46, mark, 34, ready || mark === '!' ? '#ffd24a' : '#c8c0e0').setOrigin(0.5, 1).setDepth(950).setStroke('#120a1c', 6);
      this.tweens.add({ targets: t, y: t.y - 6, duration: 400, yoyo: true, repeat: -1 });
      return t;
    });
  }

  /** Why a land's gate is still locked. */
  private lockedText(id: LandId) {
    const land = LANDS.find((l) => l.id === id)!;
    return tr('{land}: opens when the {boss} is calm.', { land: tx(land.name), boss: tx(wild(land.after!).name) });
  }

  private walk(x: number, y: number, then?: () => void) {
    if (this.busy) return;
    this.target = { x, y: Math.max(TOP, y), then };
  }

  update(t: number, dt: number) {
    if (!this.hero || this.busy) return;
    const speed = (animal(this.s.animal).skill === 'sprint' ? 0.36 : 0.24) * (hasCharm(this.s, 'boot') ? 1.25 : 1) * dt;
    let { x: vx, y: vy } = this.stick.vec;
    if (!vx && !vy) ({ x: vx, y: vy } = keyVector(this.keys));
    if (vx || vy) this.target = null;
    else if (this.target) {
      const dx = this.target.x - this.hero.x;
      const dy = this.target.y - this.hero.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        const then = this.target.then;
        this.target = null;
        then?.();
        return;
      }
      vx = dx / d;
      vy = dy / d;
    }
    if (!vx && !vy) return;
    if (vx) this.hero.setFlipX(vx < 0);
    this.hero.x = Phaser.Math.Clamp(this.hero.x + vx * speed, 20, W - 10);
    this.hero.y = Phaser.Math.Clamp(this.hero.y + vy * speed, TOP, H - 10);
    this.hero.setDepth(this.hero.y);
    // Walking off an edge along a path: into a land (or bump into its locked gate).
    const onPathX = Math.abs(this.hero.y - (H / 2 + 24)) < 70;
    const onPathY = Math.abs(this.hero.x - W / 2) < 60;
    if (this.hero.x >= W - 14 && onPathX) this.toLand('jungle', t);
    if (this.hero.y >= H - 14 && onPathY) this.toLand('desert', t);
    if (this.hero.x <= 24 && onPathX) this.toLand('forest', t);
    if (this.hero.y <= TOP + 2 && onPathY) this.toLand('mountains', t);
  }

  private toLand(land: LandId, t: number) {
    if (this.busy) return;
    if (!landOpen(this.s, land)) {
      if (t > this.bumped) {
        this.bumped = t + 3000;
        say(this, this.lockedText(land), '#ffe9a0');
      }
      // Step back from the gate.
      const back = { jungle: [-30, 0], desert: [0, -30], forest: [30, 0], mountains: [0, 30] }[land];
      this.hero.x += back[0];
      this.hero.y += back[1];
      return;
    }
    this.busy = true;
    saveAnimals(this.s);
    const to = LAND_SCENES[land];
    to.state.fresh = true;
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start(to.key));
  }

  /** The Winter Festival: the happy ending (for now!). */
  private festival() {
    const s = this.s;
    s.festival = true;
    saveAnimals(s);
    this.busy = true;
    sfx('victory');
    const c = this.add.container(0, 0).setDepth(3000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 90, 60, W - 180, H - 100, 0x1d1730, 0x9ad0ff));
    c.add(txt(this, W / 2, 96, tr('The Winter Festival!'), 32, '#ffd24a').setOrigin(0.5));
    ['boss_gorilla', 'boss_tortoise', 'boss_moose', 'boss_snowleopard'].forEach((b, i) => {
      const img = this.add.image(220 + i * 175, 210, b).setScale(2.6);
      this.tweens.add({ targets: img, y: 196, duration: 400 + i * 80, yoyo: true, repeat: -1 });
      c.add(img);
    });
    c.add(this.add.image(W / 2, 300, animal(s.animal).sprite).setScale(4.4));
    c.add(txt(this, W / 2, 360, tr('Every grumpy animal in the kingdom is happy again, thanks to you, {name}! The whole village is dancing in the snow.', { name: s.name }), 18, C.text, { align: 'center', wordWrap: { width: W - 260 } }).setOrigin(0.5, 0));
    c.add(txt(this, W / 2, 428, tr('You can keep playing: calm more animals, cook, and fill the Animal Book!'), 15, '#9ad0ff', { align: 'center', wordWrap: { width: W - 260 } }).setOrigin(0.5, 0));
    c.add(button(this, W / 2, H - 70, 220, 46, tr('Hooray!'), () => {
      c.destroy();
      this.busy = false;
    }, { size: 20, color: 0x2f9a4a }));
  }

  private restHere() {
    rest(this.s);
    saveAnimals(this.s);
    sfx('heal');
    this.refresh();
    say(this, tr('A cool drink and a nap. All {n} hearts back!', { n: maxHearts(this.s) }), C.good);
  }

  /** A villager: offer their quest, cheer you on, or take the finished quest. */
  private talk(giver: string) {
    const q = currentQuest(this.s, giver)!;
    const s = this.s;
    this.busy = true;
    const done = () => {
      this.busy = false;
      this.refresh();
    };
    // The mayor says hello the first time.
    if (giver === 'beaver' && !s.welcomed) {
      s.welcomed = true;
      saveAnimals(s);
      dialog(this, q.sprite, tx(q.giverName), tr('Welcome to Meadowbrook Village, {name}! The animals of the wild lands are grumpy, and we need a helper like you. Talk to villagers with a yellow mark over their heads to get a quest.', { name: s.name }), [
        { label: tr('I will help!'), fn: done },
      ]);
      return;
    }
    if (!questOpen(s, q.id)) {
      const land = LANDS.find((l) => l.id === q.land)!;
      dialog(this, q.sprite, tx(q.giverName), tr('I will need your help in the {land} one day. It opens when the {boss} is calm!', { land: tx(land.name), boss: tx(wild(land.after!).name) }), [{ label: tr('Okay!'), fn: done }]);
      return;
    }
    questTalk(this, s, q, done);
  }

  /** All the quests, in two columns. */
  private questBoard() {
    const s = this.s;
    this.busy = true;
    const c = this.add.container(0, 0).setDepth(3000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 40, 64, W - 80, H - 84, 0x3a2614, 0xd0a468));
    c.add(txt(this, W / 2, 88, tr('Quest board'), 26, '#ffd24a').setOrigin(0.5));
    const where: Partial<Record<LandId, string>> = { desert: tr('(at the Desert oasis)'), forest: tr('(in the Enchanted Forest)'), mountains: tr('(in the Snowy Mountains)') };
    QUESTS.forEach((q, i) => {
      const x = 70 + Math.floor(i / 5) * 445;
      const y = 116 + (i % 5) * 64;
      const st = s.quests[q.id];
      const at = q.where ? ` ${where[q.where]}` : '';
      c.add(this.add.image(x + 20, y + 20, q.sprite).setScale(2.2));
      c.add(txt(this, x + 48, y, tx(q.title), 15, st === 'done' ? C.good : '#ffffff', { wordWrap: { width: 380 } }));
      const line =
        st === 'done'
          ? tr('Done! Thank you!')
          : !questOpen(s, q.id)
            ? tr('Later: when the {land} opens.', { land: tx(LANDS.find((l) => l.id === q.land)!.name) })
            : st === 'new' && !questReady(s, q.id)
              ? tr('Later: when you reach level {lv} or finish the other quests.', { lv: q.boss!.level })
              : st === 'new'
                ? tr('Talk to {who} to start.', { who: tx(q.giverName) }) + at
                : canTurnIn(s, q.id)
                  ? tr('Ready! Go see {who}.', { who: tx(q.giverName) }) + at
                  : `${tx(q.giverName)}: ${tr('{n} of {need}', { n: progress(s, q.id), need: q.need })}`;
      c.add(txt(this, x + 48, y + 22, line, 12, st === 'done' ? C.good : canTurnIn(s, q.id) ? '#ffd24a' : C.dim, { wordWrap: { width: 380 } }));
    });
    c.add(button(this, W / 2, H - 46, 180, 40, tr('Close'), () => {
      c.destroy();
      this.busy = false;
    }, { size: 18, color: 0x3a3450 }));
  }

  // ---------------------------------------------------------------- kitchen
  /** Chef Raccoon's kitchen: mix foods into better ones. */
  private kitchen() {
    const s = this.s;
    this.busy = true;
    const c = this.add.container(0, 0).setDepth(3000);
    const close = () => {
      c.destroy();
      this.busy = false;
      this.refresh();
    };
    const draw = () => {
      c.removeAll(true);
      c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
      c.add(panel(this, 90, 70, W - 180, H - 100, 0x1d1730, 0xff9a5a));
      c.add(this.add.image(150, 112, 'npc_chef_raccoon').setScale(3));
      c.add(txt(this, W / 2, 96, tr('Kitchen'), 28, '#ffd24a').setOrigin(0.5));
      c.add(txt(this, W / 2, 128, tr('Pick a dish. Answer right and you make two!'), 16, C.text).setOrigin(0.5));
      RECIPES.forEach((r, i) => {
        const y = 190 + i * 96;
        const made = food(r.makes);
        c.add(this.add.image(170, y, made.icon).setScale(4.4));
        c.add(txt(this, 210, y - 26, tx(made.name), 19, '#ffffff'));
        c.add(txt(this, 210, y + 2, made.heal >= 99 ? tr('All hearts') : tr('+{n} hearts', { n: made.heal }), 14, '#ff9a9a'));
        // The ingredients, with how many you have.
        Object.entries(r.needs).forEach(([id, n], j) => {
          const x = 440 + j * 110;
          const have = s.foods[id] ?? 0;
          c.add(this.add.image(x, y - 6, food(id).icon).setScale(3.4).setAlpha(have >= n ? 1 : 0.4));
          c.add(txt(this, x, y + 28, `${have}/${n}`, 15, have >= n ? C.good : '#ff8a8a').setOrigin(0.5));
        });
        const b = button(this, W - 190, y, 150, 50, tr('Cook!'), () => {
          ask(this, s, tr('Cook!'), { right: tr('Answer: {answer}. Yum, a double batch!'), wrong: tr('You said: {given}\nRight answer: {answer}\n(It still tastes good!)'), go: tr('Go!') }, (correct) => {
            const n = cook(s, r, correct);
            saveAnimals(s);
            sfx(correct ? 'levelup' : 'coin');
            say(this, tr('You made {n} {food}!', { n, food: tx(made.name) }), C.good);
            draw();
          });
        }, { size: 20, color: 0x2f9a4a });
        b.setEnabled(canCook(s, r));
        c.add(b);
      });
      c.add(txt(this, W / 2, H - 92, tr('Dishes cooked: {n}', { n: s.cooked }), 15, C.dim).setOrigin(0.5));
      c.add(button(this, W / 2, H - 56, 180, 42, tr('Close'), close, { size: 18, color: 0x3a3450 }));
    };
    draw();
  }

  // ---------------------------------------------------------------- shop
  /** Hazel Hedgehog's shop: spend acorns on food and charms. */
  private shop() {
    const s = this.s;
    this.busy = true;
    const c = this.add.container(0, 0).setDepth(3000);
    const close = () => {
      c.destroy();
      this.busy = false;
      this.refresh();
    };
    const draw = () => {
      c.removeAll(true);
      c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
      c.add(panel(this, 70, 60, W - 140, H - 84, 0x1d1730, 0x7fd3ff));
      c.add(this.add.image(130, 100, 'npc_hedgehog').setScale(3));
      c.add(txt(this, W / 2, 86, tr('Shop'), 28, '#ffd24a').setOrigin(0.5));
      c.add(this.add.image(W / 2 - 60, 120, 'item_acorn').setScale(2));
      c.add(txt(this, W / 2 - 44, 120, tr('You have {n} acorns', { n: s.acorns }), 16, '#ffe9a0').setOrigin(0, 0.5));
      SHOP.forEach((it, i) => {
        const x = 170 + (i % 4) * 207;
        const y = 210 + Math.floor(i / 4) * 150;
        const owned = it.kind === 'charm' && hasCharm(s, it.id);
        c.add(panel(this, x - 95, y - 60, 190, 140, 0x2a2244, it.kind === 'charm' ? 0xb98aff : 0x5a4a7a));
        c.add(this.add.image(x, y - 26, it.icon).setScale(3.6));
        c.add(txt(this, x, y + 8, tx(it.name), 15, '#ffffff').setOrigin(0.5));
        c.add(txt(this, x, y + 28, tx(it.info), 12, C.dim, { align: 'center', wordWrap: { width: 176 } }).setOrigin(0.5));
        const b = button(this, x, y + 58, 150, 30, owned ? tr('You have it!') : tr('{n} acorns', { n: it.price }), () => {
          if (buy(s, it)) {
            saveAnimals(s);
            sfx('coin');
            say(this, tr('Thank you! Enjoy your {item}!', { item: tx(it.name) }), C.good);
          }
          draw();
        }, { size: 14, color: owned ? 0x2f5a3a : 0xb07a10 });
        b.setEnabled(!owned && s.acorns >= it.price);
        c.add(b);
      });
      c.add(button(this, W / 2, H - 50, 180, 40, tr('Close'), close, { size: 18, color: 0x3a3450 }));
    };
    draw();
  }

  // ---------------------------------------------------------------- museum
  /** Professor Mole's museum: the fossils found, and the Animal Book of every animal calmed. */
  private museum() {
    const s = this.s;
    this.busy = true;
    const c = this.add.container(0, 0).setDepth(3000);
    const close = () => {
      c.destroy();
      this.busy = false;
    };
    const fact = this.add.text(W / 2, H - 82, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#9ad0ff', align: 'center', wordWrap: { width: W - 260 } }).setOrigin(0.5);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 70, 60, W - 140, H - 84, 0x2a2430, 0xc8c8d8));
    c.add(txt(this, W / 2, 86, tr('Museum'), 28, '#ffd24a').setOrigin(0.5));
    c.add(txt(this, 110, 116, tr('Fossils: {n} of 5', { n: s.fossils.length }), 16, '#ffe9a0'));
    for (let i = 0; i < 5; i++) {
      const x = 330 + i * 62;
      c.add(this.add.rectangle(x, 124, 52, 40, 0x1a1420).setStrokeStyle(2, 0x6a5a7a));
      if (i < s.fossils.length) c.add(this.add.image(x, 124, 'item_fossil').setScale(2.8));
      else c.add(txt(this, x, 124, '?', 20, C.dim).setOrigin(0.5));
    }
    const all: WildDef[] = [...JUNGLE, ...DESERT, ...FOREST, ...MOUNTAINS, ...Object.values(BOSSES)];
    c.add(txt(this, 110, 160, tr('Animal Book: {n} of {all} animals calmed. Tap one to read about it.', { n: all.filter((a) => s.facts.includes(a.id)).length, all: all.length }), 16, '#ffe9a0'));
    // Twelve to a row; tap one to read its name and fact.
    all.forEach((a, i) => {
      const x = 118 + (i % 12) * 66;
      const y = 206 + Math.floor(i / 12) * 64;
      const met = s.facts.includes(a.id);
      const big = !!BOSSES[a.id];
      c.add(this.add.rectangle(x, y, 58, 56, met ? 0x3a3450 : 0x1a1420).setStrokeStyle(2, met ? 0x9a8ac8 : 0x4a3a5a));
      const img = this.add.image(x, y, a.sprite).setScale(big ? 1.4 : 2.6).setInteractive({ useHandCursor: true });
      if (!met) img.setTintFill(0x14101e).setAlpha(0.8);
      img.on('pointerup', () => fact.setText(met ? `${tx(a.name)}: ${tx(a.fact)}` : tr('Calm this animal to learn about it!')));
      c.add(img);
    });
    c.add(fact);
    c.add(button(this, W / 2, H - 44, 180, 38, tr('Close'), close, { size: 18, color: 0x3a3450 }));
  }
}
