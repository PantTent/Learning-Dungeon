import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { tr } from '../i18n';
import { animal, LANDS, QUESTS, quest, type QuestDef } from '../animal/data';
import { accept, canTurnIn, loadAnimals, maxHearts, progress, rest, saveAnimals, turnIn, type AnimalSave } from '../animal/state';
import { dialog, grassTexture, keyVector, say, Stick, topBar, tx } from '../animal/ui';
import { jungleState } from './AnimalJungleScene';
import { C, H, W, button, panel, txt } from '../ui/widgets';

/** The village helpers stand here. */
const NPC_SPOT: Record<string, { x: number; y: number }> = {
  badger: { x: 220, y: 230 },
  dogmom: { x: 700, y: 420 },
  beaver: { x: 380, y: 220 },
};
const BOARD = { x: 580, y: 190 };
const POND = { x: 260, y: 430 };
const TOP = 110;

/** Meadowbrook Village: the start area, with quest givers and the paths to each land. */
export class AnimalVillageScene extends Phaser.Scene {
  private s!: AnimalSave;
  private hero!: Phaser.GameObjects.Image;
  private stick!: Stick;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private target: { x: number; y: number; then?: () => void } | null = null;
  private bar?: Phaser.GameObjects.Container;
  private marks: Phaser.GameObjects.Text[] = [];
  private busy = false;

  constructor() {
    super('AnimalVillage');
  }

  create(data: { fresh?: boolean; from?: 'jungle'; tired?: boolean } = {}) {
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
    const start = data.from === 'jungle' ? { x: W - 80, y: H / 2 + 20 } : { x: W / 2, y: H / 2 + 60 };
    this.hero = this.add.image(start.x, start.y, animal(s.animal).sprite).setScale(3.6);
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
    this.add.tileSprite(0, 0, W, H, grassTexture(this, 'village')).setOrigin(0).setTileScale(3);
    // Dirt paths to the four lands.
    const g = this.add.graphics();
    g.fillStyle(0xd0a468, 1).fillRect(0, H / 2 - 4, W, 56).fillRect(W / 2 - 28, TOP - 10, 56, H - TOP + 10);
    g.fillStyle(0xb88a50, 1).fillRect(0, H / 2 + 48, W, 4).fillRect(W / 2 + 24, TOP - 10, 4, H - TOP + 10);
    // Homes and decorations.
    this.add.image(110, 170, 'prop_hut').setScale(3.2);
    this.add.image(860, 170, 'prop_den').setScale(3.2);
    this.add.image(120, 520, 'prop_hut').setScale(3.2).setOrigin(0.5, 1);
    this.add.ellipse(POND.x, POND.y, 170, 80, 0x4a90e0).setStrokeStyle(4, 0x2a6ab0);
    this.add.ellipse(POND.x - 30, POND.y - 12, 50, 14, 0xb8e0ff, 0.6);
    this.label(POND.x, POND.y + 48, tr('Rest'));
    this.add.zone(POND.x, POND.y, 170, 80).setInteractive({ useHandCursor: true }).on('pointerup', () => this.walk(POND.x + 100, POND.y, () => this.restHere()));
    for (const [x, y] of [[380, 330], [640, 300], [820, 470], [60, 300], [900, 320]]) this.add.image(x, y, 'prop_flowers').setScale(3);
    const board = this.add.image(BOARD.x, BOARD.y, 'prop_board').setScale(3).setInteractive({ useHandCursor: true });
    board.on('pointerup', () => this.walk(BOARD.x, BOARD.y + 60, () => this.questBoard()));
    this.label(BOARD.x, BOARD.y + 40, tr('Quest board'));

    // The villagers who need help.
    for (const q of QUESTS) {
      const sp = NPC_SPOT[q.giver];
      const npc = this.add.image(sp.x, sp.y, q.sprite).setScale(3.6).setFlipX(sp.x > W / 2).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: npc, y: sp.y - 4, duration: 700 + sp.x, yoyo: true, repeat: -1 });
      npc.on('pointerup', () => this.walk(sp.x + (sp.x > W / 2 ? -60 : 60), sp.y + 10, () => this.talk(q.giver)));
      this.label(sp.x, sp.y + 34, tx(q.giverName));
    }
    // Rescued puppies play by their mom; a calm gorilla visits.
    for (let i = 0; i < Math.min(5, this.s.rescued.length); i++) {
      const p = this.add.image(740 + (i % 3) * 30, 470 + Math.floor(i / 3) * 24, 'npc_puppy').setScale(2.6);
      this.tweens.add({ targets: p, y: p.y - 8, duration: 300 + i * 60, yoyo: true, repeat: -1 });
    }
    if (this.s.gorillaCalm) this.add.image(580, 380, 'boss_gorilla').setScale(2.4);

    // The four ways out: the Jungle is open, the others come later.
    for (const land of LANDS) {
      const pos = { right: { x: W - 34, y: H / 2 + 24 }, left: { x: 34, y: H / 2 + 24 }, up: { x: W / 2, y: TOP + 14 }, down: { x: W / 2, y: H - 36 } }[land.dir];
      if (land.open) {
        const sign = this.add.image(pos.x - 30, pos.y - 56, 'prop_sign').setScale(3);
        this.tweens.add({ targets: sign, angle: 4, duration: 800, yoyo: true, repeat: -1 });
        this.label(pos.x - 60, pos.y - 100, `${tx(land.name)} →`);
      } else {
        const gate = this.add.image(pos.x, pos.y, 'prop_gate').setScale(land.dir === 'up' ? 2.2 : 2.6).setInteractive({ useHandCursor: true });
        gate.on('pointerup', () => say(this, tr('{land}: coming soon!', { land: tx(land.name) }), '#ffe9a0'));
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
    this.marks = QUESTS.filter((q) => this.s.quests[q.id] !== 'done').map((q) => {
      const sp = NPC_SPOT[q.giver];
      const ready = canTurnIn(this.s, q.id);
      const mark = this.s.quests[q.id] === 'new' ? '!' : ready ? '?' : '…';
      const t = txt(this, sp.x, sp.y - 46, mark, 34, ready || mark === '!' ? '#ffd24a' : '#c8c0e0').setOrigin(0.5, 1).setDepth(950).setStroke('#120a1c', 6);
      this.tweens.add({ targets: t, y: t.y - 6, duration: 400, yoyo: true, repeat: -1 });
      return t;
    });
  }

  private walk(x: number, y: number, then?: () => void) {
    if (this.busy) return;
    this.target = { x, y: Math.max(TOP, y), then };
  }

  update(_t: number, dt: number) {
    if (!this.hero || this.busy) return;
    const speed = (animal(this.s.animal).skill === 'sprint' ? 0.36 : 0.24) * dt;
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
    this.hero.y = Phaser.Math.Clamp(this.hero.y + vy * speed, TOP, H - 20);
    this.hero.setDepth(this.hero.y);
    // Walking off the right edge along the path: into the Jungle.
    if (this.hero.x >= W - 14 && Math.abs(this.hero.y - (H / 2 + 24)) < 70) this.toJungle();
  }

  private toJungle() {
    if (this.busy) return;
    this.busy = true;
    saveAnimals(this.s);
    jungleState.fresh = true;
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start('AnimalJungle'));
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
    const name = tx(q.giverName);
    this.busy = true;
    const done = () => {
      this.busy = false;
      this.refresh();
    };
    const state = s.quests[q.id];
    // The mayor says hello the first time.
    if (giver === 'beaver' && state === 'new' && s.quests.pie === 'new' && s.quests.puppies === 'new') {
      dialog(this, q.sprite, name, tr('Welcome to Meadowbrook Village, {name}! The animals of the wild lands are grumpy, and we need a helper like you. Talk to villagers with a yellow mark over their heads to get a quest.', { name: s.name }), [
        { label: tr('I will help!'), fn: () => this.offer(q, done) },
      ]);
      return;
    }
    if (state === 'new') this.offer(q, done);
    else if (canTurnIn(s, q.id)) {
      const r = turnIn(s, q.id)!;
      saveAnimals(s);
      sfx('levelup');
      const extra = r.levels ? ` ${tr('You are now level {n}!', { n: s.level })}` : '';
      dialog(this, q.sprite, name, `${tx(q.thanks)}\n${tr('+{a} acorns, +{x} XP.', { a: r.acorns, x: r.xp })}${extra}`, [{ label: tr('Yay!'), fn: done }]);
    } else if (state === 'active') {
      dialog(this, q.sprite, name, tr('{task} So far: {n} of {need}.', { task: tx(q.title), n: progress(s, q.id), need: quest(q.id).need }), [{ label: tr('On my way!'), fn: done }]);
    } else {
      dialog(this, q.sprite, name, tr('Thank you again for your help, {name}!', { name: s.name }), [{ label: tr('Bye!'), fn: done }]);
    }
  }

  private offer(q: QuestDef, done: () => void) {
    dialog(this, q.sprite, tx(q.giverName), tx(q.ask), [
      { label: tr('Not now'), color: 0x3a3450, fn: done },
      { label: tr('Yes, I will!'), fn: () => {
        accept(this.s, q.id);
        saveAnimals(this.s);
        sfx('click');
        say(this, tr('New quest: {q}', { q: tx(q.title) }), '#ffd24a');
        done();
      } },
    ]);
  }

  private questBoard() {
    const s = this.s;
    this.busy = true;
    const c = this.add.container(0, 0).setDepth(3000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 120, 90, W - 240, H - 150, 0x3a2614, 0xd0a468));
    c.add(txt(this, W / 2, 112, tr('Quest board'), 28, '#ffd24a').setOrigin(0.5));
    QUESTS.forEach((q, i) => {
      const y = 170 + i * 80;
      const st = s.quests[q.id];
      c.add(this.add.image(180, y + 20, q.sprite).setScale(3));
      c.add(txt(this, 220, y, `${tx(q.title)}  ·  ${tx(q.giverName)}`, 18, st === 'done' ? C.good : '#ffffff'));
      const line = st === 'done' ? tr('Done! Thank you!') : st === 'new' ? tr('Talk to {who} to start.', { who: tx(q.giverName) }) : canTurnIn(s, q.id) ? tr('Ready! Go see {who}.', { who: tx(q.giverName) }) : tr('{n} of {need}', { n: progress(s, q.id), need: q.need });
      c.add(txt(this, 220, y + 26, line, 15, st === 'done' ? C.good : canTurnIn(s, q.id) ? '#ffd24a' : C.dim));
    });
    c.add(button(this, W / 2, H - 90, 180, 46, tr('Close'), () => {
      c.destroy();
      this.busy = false;
    }, { size: 18, color: 0x3a3450 }));
  }
}
