import Phaser from 'phaser';
import { BOSS, FLOORS } from '../data/enemies';
import { FLOOR, findPath, type Pt } from '../data/mapgen';
import { makeItem, RARITY } from '../data/items';
import { classOf, current, derive, saveProfile, xpToNext, LEVEL_CAP, BAG_SIZE } from '../state/profile';
import { enterFloor, LAIR, respawnOne, worldState, type World, type WorldMonster } from '../state/world';
import { Bar, C, H, W, button, panel, toast, txt } from '../ui/widgets';
import { ri } from '../util/rng';

const T = 16;
const S = 3;
const TS = T * S;

export interface DungeonData {
  floor?: number;
  fromBattle?: { result: 'victory' | 'defeat' | 'fled' | 'bossFail'; monsterId?: number };
}

export class DungeonScene extends Phaser.Scene {
  private world!: World;
  private player!: Phaser.GameObjects.Image;
  private monsterSprites = new Map<number, Phaser.GameObjects.Image>();
  private chestSprites = new Map<string, Phaser.GameObjects.Image>();
  private path: Pt[] = [];
  private moving = false;
  private busy = false;
  private graceUntil = 0;
  private hud!: { hp: Bar; mp: Bar; xp: Bar; xpBig: Bar; xpLeft: Phaser.GameObjects.Text; xpRight: Phaser.GameObjects.Text; info: Phaser.GameObjects.Text; gold: Phaser.GameObjects.Text; pots: Phaser.GameObjects.Text; today: Phaser.GameObjects.Text };
  private marker!: Phaser.GameObjects.Rectangle;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Dungeon');
  }

  create(data: DungeonData) {
    const p = current();
    this.monsterSprites.clear();
    this.chestSprites.clear();
    this.path = [];
    this.moving = false;
    this.busy = false;

    if (data.fromBattle?.result === 'defeat' || !worldState.world) {
      worldState.world = enterFloor(0, p.level);
      if (data.fromBattle?.result === 'defeat') {
        const s = derive(p);
        p.hp = s.maxHp;
        p.mp = s.maxMp;
      }
    } else if (data.floor !== undefined) {
      worldState.world = enterFloor(data.floor, p.level);
    }
    this.world = worldState.world!;
    if (data.fromBattle?.result === 'victory' && data.fromBattle.monsterId) {
      this.world.monsters = this.world.monsters.filter((m) => m.id !== data.fromBattle!.monsterId);
      if (Math.random() < 0.5) respawnOne(this.world, p.level);
    }
    if (data.fromBattle) this.graceUntil = this.time.now + 2000;
    if (this.world.floor > p.maxFloor && this.world.floor <= LAIR) p.maxFloor = this.world.floor;
    saveProfile(p);

    this.cameras.main.setBackgroundColor(0x0d0a14);
    this.drawMap();
    this.drawObjects();

    const cls = classOf(p);
    this.player = this.add.image(this.world.player.x * TS + TS / 2, this.world.player.y * TS + TS / 2, cls.sprite).setScale(S).setDepth(20);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setBounds(-W / 2, -H / 2, this.world.map.w * TS + W, this.world.map.h * TS + H);
    this.cameras.main.fadeIn(300);

    this.marker = this.add.rectangle(0, 0, TS - 6, TS - 6).setStrokeStyle(3, 0xffd24a, 0.8).setVisible(false).setDepth(5);

    this.buildHud();
    this.setupInput();

    this.time.addEvent({ delay: 850, loop: true, callback: () => this.moveMonsters() });
    // Slowly bring monsters back so floors never run dry (bosses and monsters can be farmed).
    this.time.addEvent({ delay: 25000, loop: true, callback: () => {
      if (this.world.monsters.length < (FLOORS[this.world.floor]?.monsters ?? 0)) {
        respawnOne(this.world, current().level);
        this.drawMonsters();
      }
    } });

    if (data.floor !== undefined || !data.fromBattle) this.showFloorBanner();
    if (data.fromBattle?.result === 'defeat') this.dialog(['You were knocked out!', 'You wake up safe at camp, fully healed. Keep trying - every question makes you smarter!']);
    if (data.fromBattle?.result === 'bossFail') this.dialog(['Grukk escaped back to his throne!', 'You need 4 out of 5 right to beat him. Rest up and try again - you can do it!']);
  }

  // ---------------------------------------------------------------- map

  private drawMap() {
    const { map } = this.world;
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = map.tiles[y][x];
        let key: string;
        if (t === FLOOR) key = (x * 7 + y * 13) % 9 === 0 ? 'tile_floor_moss' : 'tile_floor';
        else {
          const below = y + 1 < map.h ? map.tiles[y + 1][x] : 0;
          key = below === FLOOR ? 'tile_wall' : 'tile_wall_top';
        }
        const img = this.add.image(x * TS, y * TS, key).setOrigin(0).setScale(S);
        if (t !== FLOOR && key === 'tile_wall_top') img.setTint(0xbbbbcc);
      }
    }
    // Wall torches for atmosphere.
    for (let y = 1; y < map.h - 1; y++) {
      for (let x = 0; x < map.w; x++) {
        if (map.tiles[y][x] !== FLOOR && map.tiles[y + 1][x] === FLOOR && (x * 31 + y * 17) % 11 === 0) {
          const torch = this.add.image(x * TS + TS / 2, y * TS + TS / 2, 'tile_torch').setScale(S).setDepth(2);
          const glow = this.add.image(torch.x, torch.y, 'glow').setScale(9).setTint(0xffa040).setAlpha(0.25).setDepth(1).setBlendMode('ADD');
          this.tweens.add({ targets: glow, alpha: 0.4, scale: 10, duration: 500 + ((x * y) % 300), yoyo: true, repeat: -1 });
        }
      }
    }
  }

  private drawObjects() {
    const { map } = this.world;
    const at = (pt: Pt, key: string, depth = 4) => this.add.image(pt.x * TS + TS / 2, pt.y * TS + TS / 2, key).setScale(S).setDepth(depth);

    if (this.world.floor < LAIR) {
      const isBossDoor = this.world.floor === LAIR - 1;
      const exit = at(map.exit, isBossDoor ? 'tile_door' : 'tile_stairs_down');
      if (isBossDoor) {
        const g = this.add.image(exit.x, exit.y, 'glow').setScale(8).setTint(0xff4040).setAlpha(0.3).setBlendMode('ADD').setDepth(3);
        this.tweens.add({ targets: g, alpha: 0.6, duration: 800, yoyo: true, repeat: -1 });
      }
    } else {
      at(map.exit, 'tile_stairs_down');
    }

    for (const c of map.chests) {
      const key = `${c.x},${c.y}`;
      const opened = this.world.openedChests.has(key);
      this.chestSprites.set(key, at(c, opened ? 'tile_chest_open' : 'tile_chest'));
    }

    if (map.camp) {
      const fire = at(map.camp.fire, 'tile_campfire');
      const glow = this.add.image(fire.x, fire.y, 'glow').setScale(14).setTint(0xff9a40).setAlpha(0.3).setBlendMode('ADD').setDepth(3);
      this.tweens.add({ targets: glow, alpha: 0.45, scale: 15, duration: 400, yoyo: true, repeat: -1 });
      at(map.camp.fountain, 'tile_fountain');
      const m = at(map.camp.merchant, 'npc_merchant', 10);
      m.setFlipX(true);
      this.tweens.add({ targets: m, y: m.y - 3, duration: 900, yoyo: true, repeat: -1 });
      this.label(map.camp.fountain, 'Heal');
      this.label(map.camp.merchant, 'Shop');
      this.label(map.camp.fire, 'Travel');
    }

    if (map.boss) {
      const b = this.add.image(map.boss.x * TS + TS / 2, map.boss.y * TS + TS / 2, BOSS.sprite).setScale(S).setDepth(15).setFlipX(true);
      this.tweens.add({ targets: b, scaleY: S * 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.label({ x: map.boss.x, y: map.boss.y - 1 }, BOSS.name);
    }
    this.drawMonsters();
  }

  private label(pt: Pt, s: string) {
    txt(this, pt.x * TS + TS / 2, pt.y * TS - 8, s, 14, '#ffe9a0').setOrigin(0.5, 1).setDepth(30);
  }

  private drawMonsters() {
    const alive = new Set(this.world.monsters.map((m) => m.id));
    for (const [id, s] of this.monsterSprites) {
      if (!alive.has(id)) {
        s.destroy();
        this.monsterSprites.delete(id);
      }
    }
    for (const m of this.world.monsters) {
      if (this.monsterSprites.has(m.id)) continue;
      const s = this.add.image(m.pos.x * TS + TS / 2, m.pos.y * TS + TS / 2, m.group[0].def.sprite).setScale(S).setDepth(18);
      this.tweens.add({ targets: s, scaleY: S * 0.92, duration: 400 + (m.id % 5) * 60, yoyo: true, repeat: -1 });
      this.monsterSprites.set(m.id, s);
      if (m.group.length > 1) {
        const badge = txt(this, 0, 0, `x${m.group.length}`, 14, '#ffd24a').setDepth(19);
        s.setData('badge', badge);
      }
    }
    this.syncBadges();
  }

  private syncBadges() {
    for (const s of this.monsterSprites.values()) {
      const b = s.getData('badge') as Phaser.GameObjects.Text | undefined;
      b?.setPosition(s.x + 12, s.y - 30);
    }
  }

  // ---------------------------------------------------------------- HUD

  private buildHud() {
    const p = current();
    const cls = classOf(p);
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);
    hud.add(panel(this, 8, 8, 330, 112, 0x1d1730, cls.color));
    hud.add(this.add.image(46, 52, cls.sprite).setScale(4));
    const info = txt(this, 84, 16, '', 18);
    hud.add(info);
    const hp = new Bar(this, 84, 42, 240, 16, C.hp);
    const mp = new Bar(this, 84, 64, 240, 14, C.mp);
    const xp = new Bar(this, 84, 84, 240, 10, C.xp, false);
    const gold = txt(this, 20, 96, '', 15, '#ffd24a');
    const pots = txt(this, 84, 98, '', 14, C.dim);
    const today = txt(this, W - 16, H - 46, '', 15, C.good).setOrigin(1, 1);
    // Big XP bar along the bottom so progress is always visible.
    hud.add(panel(this, 8, H - 40, W - 16, 32, 0x1d1730, C.xp));
    const xpLeft = txt(this, 22, H - 24, '', 16, '#e0c8ff').setOrigin(0, 0.5);
    const xpRight = txt(this, W - 22, H - 24, '', 15, C.dim).setOrigin(1, 0.5);
    const xpBig = new Bar(this, 130, H - 33, W - 330, 18, C.xp);
    [gold, pots, today, xpLeft, xpRight].forEach((t) => hud.add(t));
    // Bars are drawn outside the container, so pin them to the screen too.
    for (const b of [hp, mp, xp, xpBig]) b.setDepth(1001).pin();

    this.hud = { hp, mp, xp, xpBig, xpLeft, xpRight, info, gold, pots, today };

    const floorName = this.world.floor === LAIR ? "Grukk's Throne Room" : FLOORS[this.world.floor].name;
    txt(this, W / 2, 14, floorName, 18, '#ffe9a0').setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    const bx = W - 70;
    const mk = (y: number, label: string, fn: () => void, color = 0x4b3a78) => button(this, bx, y, 120, 50, label, fn, { size: 19, color }).setScrollFactor(0).setDepth(1000);
    mk(36, 'Bag', () => this.openOverlay('Inventory'));
    mk(94, 'Potion', () => this.drinkPotion(), 0x8a2a3a);
    mk(152, 'Camp', () => this.goCamp(), 0x2e5a7a);
    mk(210, 'Save & Quit', () => {
      saveProfile(current());
      worldState.world = null;
      this.scene.start('Title');
    }, 0x3a3450).label.setFontSize(15);
    this.refreshHud(false);
  }

  refreshHud(animate = true) {
    const p = current();
    const s = derive(p);
    this.hud.info.setText(`${p.name}  Lv ${p.level}${p.level >= LEVEL_CAP ? ' (MAX)' : ''}`);
    this.hud.hp.set(p.hp, s.maxHp, animate);
    this.hud.mp.set(p.mp, s.maxMp, animate);
    const maxed = p.level >= LEVEL_CAP;
    this.hud.xp.set(maxed ? 1 : p.xp, maxed ? 1 : xpToNext(p.level), animate);
    this.hud.xpBig.set(maxed ? 1 : p.xp, maxed ? 1 : xpToNext(p.level), animate);
    this.hud.xpLeft.setText(`Level ${p.level}`);
    this.hud.xpRight.setText(maxed ? 'MAX LEVEL!' : `XP to level ${p.level + 1}`);
    this.hud.gold.setText(`${p.gold}g`);
    this.hud.pots.setText(`Potions: ${p.potions.hp} red, ${p.potions.mp} blue`);
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const day = p.learning.days[key];
    this.hud.today.setText(day ? `Today: ${day.correct} of ${day.asked} questions right!` : 'Find a monster to start learning!');
  }

  private drinkPotion() {
    const p = current();
    const s = derive(p);
    if (p.potions.hp <= 0) return toast(this, 'No health potions! Buy some at the camp shop.', C.bad);
    if (p.hp >= s.maxHp) return toast(this, 'Already at full health!');
    p.potions.hp--;
    p.hp = Math.min(s.maxHp, p.hp + Math.round(s.maxHp * 0.5));
    this.healFx(this.player);
    this.refreshHud();
    saveProfile(p);
  }

  private healFx(target: Phaser.GameObjects.Image) {
    for (let i = 0; i < 12; i++) {
      const d = this.add.image(target.x + ri(-20, 20), target.y + ri(0, 20), 'dot').setTint(0x7dff9a).setDepth(40).setScale(0.8);
      this.tweens.add({ targets: d, y: d.y - ri(40, 70), alpha: 0, duration: ri(600, 900), onComplete: () => d.destroy() });
    }
  }

  private openOverlay(key: 'Inventory' | 'Shop' | 'Travel') {
    if (this.busy) return;
    this.busy = true;
    this.path = [];
    this.scene.pause();
    this.scene.launch(key, { onClose: () => {
      this.busy = false;
      this.scene.resume();
      this.refreshHud();
    } });
  }

  private goCamp() {
    if (this.world.floor === 0) {
      this.path = [];
      const camp = this.world.map.start;
      this.player.setPosition(camp.x * TS + TS / 2, camp.y * TS + TS / 2);
      this.world.player = { ...camp };
      return;
    }
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => this.scene.restart({ floor: 0 }));
  }

  private showFloorBanner() {
    const name = this.world.floor === LAIR ? "Grukk's Throne Room" : FLOORS[this.world.floor].name;
    const sub = this.world.floor === LAIR ? 'The Goblin King awaits...' : `Monsters here: level ${FLOORS[this.world.floor].levels.join(' - ')}`;
    const c = this.add.container(W / 2, H / 2 - 60).setScrollFactor(0).setDepth(2000);
    c.add(txt(this, 0, 0, name, 36, '#ffd24a').setOrigin(0.5));
    c.add(txt(this, 0, 44, sub, 20, C.dim).setOrigin(0.5));
    this.tweens.add({ targets: c, alpha: 0, delay: 1800, duration: 700, onComplete: () => c.destroy() });
  }

  // ---------------------------------------------------------------- input & movement

  private setupInput() {
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.busy || over.length) return;
      const tx = Math.floor(ptr.worldX / TS);
      const ty = Math.floor(ptr.worldY / TS);
      this.tapTile({ x: tx, y: ty });
    });
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private isObstacle(pt: Pt): boolean {
    const c = this.world.map.camp;
    const m = this.world.map;
    if (c && [c.fire, c.fountain, c.merchant].some((o) => o.x === pt.x && o.y === pt.y)) return true;
    if (m.boss && Math.abs(m.boss.x - pt.x) <= 1 && Math.abs(m.boss.y - pt.y) <= 1) return true;
    if (m.chests.some((ch) => ch.x === pt.x && ch.y === pt.y)) return true;
    return false;
  }

  private tapTile(pt: Pt) {
    const m = this.world.map;
    if (pt.x < 0 || pt.y < 0 || pt.x >= m.w || pt.y >= m.h) return;
    const from = this.world.player;
    // Tapping an object (fountain, chest, boss...) walks next to it and uses it.
    if (this.isObstacle(pt)) {
      const near = this.neighborsOf(pt).filter((n) => m.tiles[n.y][n.x] === FLOOR && !this.isObstacle(n));
      let best: Pt[] | null = null;
      for (const n of near) {
        if (n.x === from.x && n.y === from.y) {
          best = [];
          break;
        }
        const path = findPath(m, from, n, (q) => this.isObstacle(q));
        if (path && (!best || path.length < best.length)) best = path;
      }
      if (best) {
        this.path = best;
        this.pendingUse = pt;
        this.showMarker(pt);
        if (!this.moving) this.step();
      }
      return;
    }
    const path = findPath(m, from, pt, (q) => this.isObstacle(q));
    if (path && path.length) {
      this.path = path;
      this.pendingUse = null;
      this.showMarker(pt);
      if (!this.moving) this.step();
    }
  }

  private pendingUse: Pt | null = null;

  private neighborsOf(pt: Pt): Pt[] {
    const m = this.world.map;
    if (m.boss && Math.abs(m.boss.x - pt.x) <= 1 && Math.abs(m.boss.y - pt.y) <= 1) {
      // The boss is big: any tile around his 3x3 area counts.
      const out: Pt[] = [];
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
        if (Math.abs(dx) === 2 || Math.abs(dy) === 2) out.push({ x: m.boss.x + dx, y: m.boss.y + dy });
      }
      return out;
    }
    return [{ x: pt.x + 1, y: pt.y }, { x: pt.x - 1, y: pt.y }, { x: pt.x, y: pt.y + 1 }, { x: pt.x, y: pt.y - 1 }];
  }

  private showMarker(pt: Pt) {
    this.marker.setPosition(pt.x * TS + TS / 2, pt.y * TS + TS / 2).setVisible(true).setAlpha(1);
    this.tweens.add({ targets: this.marker, alpha: 0, duration: 600 });
  }

  update() {
    if (this.busy || this.moving || !this.keys) return;
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (k.LEFT.isDown || k.A.isDown) dx = -1;
    else if (k.RIGHT.isDown || k.D.isDown) dx = 1;
    else if (k.UP.isDown || k.W.isDown) dy = -1;
    else if (k.DOWN.isDown || k.S.isDown) dy = 1;
    if (dx || dy) {
      const n = { x: this.world.player.x + dx, y: this.world.player.y + dy };
      if (this.isObstacle(n)) {
        this.use(n);
        return;
      }
      if (this.world.map.tiles[n.y]?.[n.x] === FLOOR) {
        this.path = [n];
        this.pendingUse = null;
        this.step();
      }
    }
  }

  private step() {
    if (this.busy) return;
    const next = this.path.shift();
    if (!next) {
      this.moving = false;
      if (this.pendingUse) {
        const u = this.pendingUse;
        this.pendingUse = null;
        this.use(u);
      }
      return;
    }
    this.moving = true;
    if (next.x !== this.world.player.x) this.player.setFlipX(next.x < this.world.player.x);
    this.world.player = next;
    this.tweens.add({
      targets: this.player,
      x: next.x * TS + TS / 2,
      y: next.y * TS + TS / 2,
      duration: 130,
      onComplete: () => {
        if (this.arrived()) {
          this.moving = false;
          this.path = [];
          return;
        }
        this.step();
      },
    });
    this.tweens.add({ targets: this.player, scaleY: S * 0.9, duration: 65, yoyo: true });
  }

  /** Called on every tile. Returns true if something interrupted walking. */
  private arrived(): boolean {
    const pos = this.world.player;
    const m = this.world.map;
    if (this.checkMonsterContact()) return true;
    if (pos.x === m.exit.x && pos.y === m.exit.y) {
      this.useExit();
      return true;
    }
    return false;
  }

  private use(pt: Pt) {
    const m = this.world.map;
    const c = m.camp;
    const p = current();
    if (c && pt.x === c.fountain.x && pt.y === c.fountain.y) {
      const s = derive(p);
      p.hp = s.maxHp;
      p.mp = s.maxMp;
      this.healFx(this.player);
      toast(this, 'The fountain heals you completely!', C.good);
      this.refreshHud();
      saveProfile(p);
    } else if (c && pt.x === c.merchant.x && pt.y === c.merchant.y) {
      this.openOverlay('Shop');
    } else if (c && pt.x === c.fire.x && pt.y === c.fire.y) {
      this.openOverlay('Travel');
    } else if (m.boss && Math.abs(m.boss.x - pt.x) <= 1 && Math.abs(m.boss.y - pt.y) <= 1) {
      this.startBoss();
    } else {
      const key = `${pt.x},${pt.y}`;
      if (m.chests.some((ch) => ch.x === pt.x && ch.y === pt.y) && !this.world.openedChests.has(key)) this.openChest(key);
    }
  }

  private openChest(key: string) {
    const p = current();
    if (p.bag.length >= BAG_SIZE) {
      toast(this, 'Your bag is full! Sell something first.', C.bad);
      return;
    }
    this.world.openedChests.add(key);
    this.chestSprites.get(key)?.setTexture('tile_chest_open');
    const fl = this.world.floor;
    const ilvl = Math.min(10, ri(FLOORS[fl].levels[0], FLOORS[fl].levels[1]) + 1);
    const item = makeItem(ilvl, { cls: classOf(p), rarity: Math.random() < 0.5 ? 'uncommon' : Math.random() < 0.7 ? 'rare' : 'epic' });
    const gold = ri(5, 12) * (fl + 1);
    p.bag.push(item);
    p.gold += gold;
    saveProfile(p);
    this.refreshHud();
    toast(this, `Treasure! ${item.name} and ${gold} gold`, RARITY[item.rarity].css);
  }

  private useExit() {
    const p = current();
    const w = this.world;
    if (w.floor === LAIR) {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => this.scene.restart({ floor: LAIR - 1 }));
      return;
    }
    const next = w.floor + 1;
    if (next === LAIR && p.level < 7) {
      this.dialog([
        'A heavy door with a crown carved on it...',
        `You hear a big voice: "Come back when you're stronger, tiny hero!" (Reach level 7 to enter. You are level ${p.level}.)`,
      ]);
      return;
    }
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => this.scene.restart({ floor: next }));
  }

  // ---------------------------------------------------------------- monsters

  private moveMonsters() {
    if (this.busy) return;
    const m = this.world.map;
    const pp = this.world.player;
    for (const mon of this.world.monsters) {
      const dist = Math.abs(mon.pos.x - pp.x) + Math.abs(mon.pos.y - pp.y);
      let next: Pt | null = null;
      if (dist <= 5 && Math.random() < 0.55) {
        const path = findPath(m, mon.pos, pp, (q) => this.isObstacle(q) || this.world.monsters.some((o) => o !== mon && o.pos.x === q.x && o.pos.y === q.y));
        if (path && path.length) next = path[0];
      } else if (Math.random() < 0.5) {
        const opts = this.neighborsOf(mon.pos).filter(
          (n) => m.tiles[n.y]?.[n.x] === FLOOR && !this.isObstacle(n) && !(n.x === m.exit.x && n.y === m.exit.y) &&
            !this.world.monsters.some((o) => o.pos.x === n.x && o.pos.y === n.y) && !(m.camp && Math.abs(n.x - m.start.x) < 6 && Math.abs(n.y - m.start.y) < 5),
        );
        if (opts.length) next = opts[Math.floor(Math.random() * opts.length)];
      }
      if (!next) continue;
      mon.pos = next;
      const s = this.monsterSprites.get(mon.id);
      if (s) {
        s.setFlipX(next.x < s.x / TS - 0.5);
        this.tweens.add({ targets: s, x: next.x * TS + TS / 2, y: next.y * TS + TS / 2, duration: 300, onUpdate: () => this.syncBadges() });
      }
    }
    this.checkMonsterContact();
  }

  private checkMonsterContact(): boolean {
    if (this.busy || this.time.now < this.graceUntil) return false;
    const pp = this.world.player;
    const mon = this.world.monsters.find((mm) => mm.pos.x === pp.x && mm.pos.y === pp.y);
    if (!mon) return false;
    this.startBattle(mon);
    return true;
  }

  private startBattle(mon: WorldMonster) {
    this.busy = true;
    this.path = [];
    this.cameras.main.shake(200, 0.01);
    this.cameras.main.flash(250, 255, 255, 255);
    this.time.delayedCall(350, () => this.scene.start('Battle', { monsterId: mon.id, group: mon.group }));
  }

  private startBoss() {
    this.busy = true;
    this.dialog(BOSS.intro, () => {
      this.cameras.main.shake(400, 0.02);
      this.time.delayedCall(400, () => this.scene.start('Battle', { boss: true }));
    });
  }

  // ---------------------------------------------------------------- dialog

  private dialog(lines: string[], onDone?: () => void) {
    this.busy = true;
    let i = 0;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(4000);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.3).setOrigin(0).setInteractive());
    c.add(panel(this, 60, H - 190, W - 120, 160, 0x1d1730, 0xffd24a));
    const t = txt(this, 90, H - 170, '', 24, C.text, { wordWrap: { width: W - 180 }, lineSpacing: 6 });
    c.add(t);
    const hint = txt(this, W - 90, H - 50, 'tap to continue', 15, C.dim).setOrigin(1, 1);
    c.add(hint);
    const show = () => t.setText(lines[i]);
    show();
    c.setSize(W, H);
    const zone = this.add.zone(0, 0, W, H).setOrigin(0).setScrollFactor(0).setDepth(4001).setInteractive();
    zone.on('pointerup', () => {
      i++;
      if (i >= lines.length) {
        zone.destroy();
        c.destroy();
        this.busy = false;
        onDone?.();
      } else show();
    });
  }
}
