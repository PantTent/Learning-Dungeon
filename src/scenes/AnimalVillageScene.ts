import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { tr } from '../i18n';
import { animal, BOSSES, DESERT, DESERT_QUESTS, food, JUNGLE, LANDS, QUESTS, RECIPES, SHOP, type WildDef } from '../animal/data';
import { buy, canCook, canTurnIn, cook, desertOpen, hasCharm, loadAnimals, maxHearts, progress, puppiesFound, questReady, rest, saveAnimals, type AnimalSave } from '../animal/state';
import { ask, dialog, grassTexture, keyVector, questTalk, say, Stick, topBar, tx } from '../animal/ui';
import { jungleState } from './AnimalJungleScene';
import { desertState } from './AnimalDesertScene';
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

  create(data: { fresh?: boolean; from?: 'jungle' | 'desert'; tired?: boolean } = {}) {
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
    const start = data.from === 'jungle' ? { x: W - 80, y: H / 2 + 20 } : data.from === 'desert' ? { x: W / 2, y: H - 60 } : { x: W / 2, y: H / 2 + 60 };
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

    // The villagers who need help (Auntie Camel waits in the Desert).
    for (const q of QUESTS) {
      const sp = NPC_SPOT[q.giver];
      if (!sp) continue;
      const npc = this.add.image(sp.x, sp.y, q.sprite).setScale(3.6).setFlipX(sp.x > W / 2).setInteractive({ useHandCursor: true }).setDepth(sp.y);
      this.tweens.add({ targets: npc, y: sp.y - 4, duration: 700 + sp.x, yoyo: true, repeat: -1 });
      npc.on('pointerup', () => this.walk(sp.x + (sp.x > W / 2 ? -60 : 60), sp.y + 10, () => this.talk(q.giver)));
      this.label(sp.x, sp.y + 34, tx(q.giverName), 14);
    }
    // Rescued puppies play by their mom; calm bosses come to visit.
    for (let i = 0; i < Math.min(5, puppiesFound(s)); i++) {
      const p = this.add.image(690 + (i % 3) * 30, 482 + Math.floor(i / 3) * 24, 'npc_puppy').setScale(2.6).setDepth(500);
      this.tweens.add({ targets: p, y: p.y - 8, duration: 300 + i * 60, yoyo: true, repeat: -1 });
    }
    if (s.gorillaCalm) this.add.image(590, 372, 'boss_gorilla').setScale(2.2).setDepth(372);
    if (s.tortoiseCalm) this.add.image(250, 210, 'boss_tortoise').setScale(2).setDepth(200);

    // The four ways out.
    for (const land of LANDS) {
      const pos = { right: { x: W - 34, y: H / 2 + 24 }, left: { x: 34, y: H / 2 + 24 }, up: { x: W / 2, y: TOP + 14 }, down: { x: W / 2, y: H - 36 } }[land.dir];
      const open = land.open && (land.id !== 'desert' || desertOpen(s));
      if (open && land.dir === 'right') {
        const sign = this.add.image(pos.x - 30, pos.y - 56, 'prop_sign').setScale(3);
        this.tweens.add({ targets: sign, angle: 4, duration: 800, yoyo: true, repeat: -1 });
        this.label(pos.x - 60, pos.y - 100, `${tx(land.name)} →`);
      } else if (open && land.dir === 'down') {
        this.add.image(pos.x + 70, pos.y - 10, 'prop_desertsign').setScale(3);
        this.label(pos.x + 70, pos.y - 70, `${tx(land.name)} ↓`);
      } else {
        const gate = this.add.image(pos.x, pos.y, 'prop_gate').setScale(land.dir === 'up' ? 2.2 : 2.6).setInteractive({ useHandCursor: true }).setDepth(pos.y + 40);
        const msg = land.open ? tr('{land}: opens when the Grumpy Gorilla is calm.', { land: tx(land.name) }) : tr('{land}: coming soon!', { land: tx(land.name) });
        gate.on('pointerup', () => say(this, msg, '#ffe9a0'));
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
    this.marks = QUESTS.filter((q) => NPC_SPOT[q.giver] && s.quests[q.id] !== 'done' && (s.quests[q.id] !== 'new' || questReady(s, q.id)) && this.questOpen(q.id)).map((q) => {
      const sp = NPC_SPOT[q.giver];
      const ready = canTurnIn(s, q.id);
      const mark = s.quests[q.id] === 'new' ? '!' : ready ? '?' : '…';
      const t = txt(this, sp.x, sp.y - 46, mark, 34, ready || mark === '!' ? '#ffd24a' : '#c8c0e0').setOrigin(0.5, 1).setDepth(950).setStroke('#120a1c', 6);
      this.tweens.add({ targets: t, y: t.y - 6, duration: 400, yoyo: true, repeat: -1 });
      return t;
    });
  }

  /** Desert quests start once the Desert is open. */
  private questOpen(id: string) {
    return !['fossils', 'tortoise'].includes(id) || desertOpen(this.s);
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
    // Walking off the edge along a path: into a land.
    if (this.hero.x >= W - 14 && Math.abs(this.hero.y - (H / 2 + 24)) < 70) this.toLand('jungle');
    if (this.hero.y >= H - 14 && Math.abs(this.hero.x - W / 2) < 60) {
      if (desertOpen(this.s)) this.toLand('desert');
      else if (t > this.bumped) {
        this.bumped = t + 3000;
        this.hero.y -= 30;
        say(this, tr('{land}: opens when the Grumpy Gorilla is calm.', { land: tx(LANDS.find((l) => l.id === 'desert')!.name) }), '#ffe9a0');
      }
    }
  }

  private toLand(land: 'jungle' | 'desert') {
    if (this.busy) return;
    this.busy = true;
    saveAnimals(this.s);
    (land === 'jungle' ? jungleState : desertState).fresh = true;
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start(land === 'jungle' ? 'AnimalJungle' : 'AnimalDesert'));
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
    const q = QUESTS.find((x) => x.giver === giver)!;
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
    if (!this.questOpen(q.id)) {
      dialog(this, q.sprite, tx(q.giverName), tr('I will need your help in the Desert one day. It opens when the Grumpy Gorilla is calm!'), [{ label: tr('Okay!'), fn: done }]);
      return;
    }
    questTalk(this, s, q, done);
  }

  private questBoard() {
    const s = this.s;
    this.busy = true;
    const c = this.add.container(0, 0).setDepth(3000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 100, 70, W - 200, H - 100, 0x3a2614, 0xd0a468));
    c.add(txt(this, W / 2, 94, tr('Quest board'), 26, '#ffd24a').setOrigin(0.5));
    QUESTS.forEach((q, i) => {
      const y = 124 + i * 54;
      const st = s.quests[q.id];
      c.add(this.add.image(152, y + 18, q.sprite).setScale(2.4));
      c.add(txt(this, 186, y, `${tx(q.title)}  ·  ${tx(q.giverName)}`, 17, st === 'done' ? C.good : '#ffffff'));
      const where = DESERT_QUESTS.includes(q.id) ? ` ${tr('(at the Desert oasis)')}` : '';
      const line =
        st === 'done'
          ? tr('Done! Thank you!')
          : !this.questOpen(q.id)
            ? tr('Later: after the gorilla is calm.')
            : st === 'new' && !questReady(s, q.id)
              ? tr('Later: when you reach level {lv} or finish the other quests.', { lv: q.boss!.level })
              : st === 'new'
                ? tr('Talk to {who} to start.', { who: tx(q.giverName) }) + where
                : canTurnIn(s, q.id)
                  ? tr('Ready! Go see {who}.', { who: tx(q.giverName) }) + where
                  : tr('{n} of {need}', { n: progress(s, q.id), need: q.need });
      c.add(txt(this, 186, y + 24, line, 14, st === 'done' ? C.good : canTurnIn(s, q.id) ? '#ffd24a' : C.dim));
    });
    c.add(button(this, W / 2, H - 56, 180, 42, tr('Close'), () => {
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
    const fact = this.add.text(W / 2, H - 98, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#9ad0ff', align: 'center', wordWrap: { width: W - 260 } }).setOrigin(0.5);
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
    const all: WildDef[] = [...JUNGLE, ...DESERT, ...Object.values(BOSSES)];
    c.add(txt(this, 110, 160, tr('Animal Book: {n} of {all} animals calmed. Tap one to read about it.', { n: all.filter((a) => s.facts.includes(a.id)).length, all: all.length }), 16, '#ffe9a0'));
    all.forEach((a, i) => {
      const x = 130 + (i % 10) * 78;
      const y = 228 + Math.floor(i / 10) * 86;
      const met = s.facts.includes(a.id);
      const big = !!BOSSES[a.id];
      const img = this.add.image(x, y, a.sprite).setScale(big ? 1.6 : 3).setInteractive({ useHandCursor: true });
      if (!met) img.setTintFill(0x14101e).setAlpha(0.8);
      img.on('pointerup', () => fact.setText(met ? `${tx(a.name)}: ${tx(a.fact)}` : tr('Calm this animal to learn about it!')));
      c.add(img);
      c.add(txt(this, x, y + 32, met ? tx(a.name) : '?', 11, met ? '#ffffff' : C.dim, { align: 'center', wordWrap: { width: 74 } }).setOrigin(0.5, 0));
    });
    c.add(fact);
    c.add(button(this, W / 2, H - 50, 180, 40, tr('Close'), close, { size: 18, color: 0x3a3450 }));
  }
}
