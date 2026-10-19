import Phaser from 'phaser';
import { FREE_LIMITS } from '../hub/games';
import { fullGame } from '../hub/ownership';
import { fullGamePrompt } from '../ui/unlockPrompt';
import { AREAS, areaOf, campPlace, placeOf, type AreaDef, type Place } from '../data/areas';
import { FLOOR, findPath, type Pt } from '../data/mapgen';
import { makeEnemy } from '../data/enemies';
import { makeItem, RARITY } from '../data/items';
import { classOf, current, derive, saveProfile, xpToNext, LEVEL_CAP, BAG_SIZE } from '../state/profile';
import { enterFloor, respawnOne, worldState, type World, type WorldMonster } from '../state/world';
import { Bar, C, H, W, button, panel, soundButton, toast, txt } from '../ui/widgets';
import { playMusic, sfx } from '../audio/audio';
import { POTIONS, countPotions, tierForLevel } from '../data/potions';
import { openPotionMenu } from '../ui/potionMenu';
import { ri } from '../util/rng';
import { fmtNum, getLang, tr } from '../i18n';
import { itemName } from '../i18n/itemNames';

const T = 16;
const S = 3;
const TS = T * S;

export interface DungeonData {
  floor?: number;
  fromBattle?: { result: 'victory' | 'defeat' | 'fled' | 'bossFail'; monsterId?: number };
}

const STICK_KEY = 'ld_joystick';
/** Where the on-screen joystick sits (screen pixels). */
const STICK = { x: 110, y: H - 150, r: 66 };

/** Is the on-screen joystick shown? (On unless turned off.) */
function stickOn(): boolean {
  try {
    return localStorage.getItem(STICK_KEY) !== 'off';
  } catch {
    return true;
  }
}

function setStickOn(on: boolean) {
  try {
    localStorage.setItem(STICK_KEY, on ? 'on' : 'off');
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

const stickLabel = () => (stickOn() ? tr('Joystick: ON') : tr('Joystick: OFF'));

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
  /** Direction held on the on-screen joystick (0, 0 = not pushed). */
  private stick = { dx: 0, dy: 0 };
  private stickParts: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Dungeon');
  }

  create(data: DungeonData) {
    const p = current();
    this.monsterSprites.clear();
    this.chestSprites.clear();
    this.glowSpots = [];
    this.path = [];
    this.moving = false;
    this.busy = false;

    if (data.floor !== undefined && data.fromBattle?.result !== 'defeat') {
      worldState.world = enterFloor(data.floor, p.level);
    } else if (data.fromBattle?.result === 'defeat' || !worldState.world) {
      // Knocked out (or just starting): wake up at the camp of the current area.
      // Developer heroes have every place unlocked but still start in Area 1.
      const area = worldState.world ? placeOf(worldState.world.floor).area : p.dev ? 0 : placeOf(p.maxFloor).area;
      worldState.world = enterFloor(campPlace(area), p.level);
      if (data.fromBattle?.result === 'defeat') {
        const s = derive(p);
        p.hp = s.maxHp;
        p.mp = s.maxMp;
      }
    }
    this.world = worldState.world!;
    if (data.fromBattle?.result === 'victory' && data.fromBattle.monsterId) {
      this.world.monsters = this.world.monsters.filter((m) => m.id !== data.fromBattle!.monsterId);
      if (Math.random() < 0.5) respawnOne(this.world, p.level);
    }
    if (data.fromBattle) this.graceUntil = this.time.now + 2000;
    if (this.world.floor > p.maxFloor) p.maxFloor = this.world.floor;
    saveProfile(p);

    this.cameras.main.setBackgroundColor(this.area().theme.bg);
    playMusic(this.area().theme.music);
    this.drawMap();
    this.drawObjects();

    const cls = classOf(p);
    this.player = this.add.image(this.world.player.x * TS + TS / 2, this.world.player.y * TS + TS / 2, cls.sprite).setScale(S).setDepth(20);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setBounds(-W / 2, -H / 2, this.world.map.w * TS + W, this.world.map.h * TS + H);
    this.cameras.main.fadeIn(300);

    // The hero's pet trots along one step behind.
    // It starts on the hero's tile (the tile beside might be a wall). The
    // container moves; only the image inside bobs, so the two never fight.
    this.petSprite = undefined;
    this.petBody = undefined;
    if (p.pet) {
      this.petSprite = this.add.container(this.player.x, this.player.y).setDepth(19);
      this.petBody = this.add.image(0, 0, p.pet.sprite).setScale(S * 0.85);
      this.petSprite.add(this.petBody);
      this.tweens.add({ targets: this.petBody, y: -4, duration: 450, yoyo: true, repeat: -1 });
    }

    // Caves are dark: torches, the camp and the hero carry their own light.
    this.dark = undefined;
    if (!this.area().theme.outdoor) {
      this.makeLightTexture();
      this.dark = this.add.renderTexture(0, 0, W, H).setOrigin(0).setScrollFactor(0).setDepth(900);
      this.brush = this.make.image({ key: 'softlight', add: false });
      const m = this.world.map;
      const add = (pt: Pt | undefined, r: number) => pt && this.glowSpots.push({ x: pt.x * TS + TS / 2, y: pt.y * TS + TS / 2, r, flicker: pt.x + pt.y });
      add(m.camp?.fire, 320);
      add(m.camp?.fountain, 150);
      add(m.camp?.merchant, 130);
      add(m.exit, 170);
      add(m.portal, 200);
      add(m.boss, 260);
      m.chests.forEach((c) => add(c, 90));
    }

    this.marker = this.add.rectangle(0, 0, TS - 6, TS - 6).setStrokeStyle(3, 0xffd24a, 0.8).setVisible(false).setDepth(5);

    this.buildHud();
    this.setupInput();

    this.time.addEvent({ delay: 850, loop: true, callback: () => this.moveMonsters() });
    // Slowly bring monsters back so floors never run dry (bosses and monsters can be farmed).
    this.time.addEvent({ delay: 25000, loop: true, callback: () => {
      if (this.world.monsters.length < (this.place().floor?.monsters ?? 0)) {
        respawnOne(this.world, current().level);
        this.drawMonsters();
      }
    } });

    if (data.floor !== undefined || !data.fromBattle) this.showFloorBanner();
    if (data.fromBattle?.result === 'defeat') this.dialog([tr('You were knocked out!'), tr('You wake up safe at camp, fully healed. Keep trying - every question makes you smarter!')]);
    if (data.fromBattle?.result === 'bossFail') this.dialog([tr('{boss} escaped!', { boss: tr(this.area().boss.shortName) }), tr('You need 4 out of 5 right to beat him. Rest up and try again - you can do it!')]);
  }

  private glowSpots: { x: number; y: number; r: number; flicker: number }[] = [];
  private dark?: Phaser.GameObjects.RenderTexture;
  private brush?: Phaser.GameObjects.Image;
  private petSprite?: Phaser.GameObjects.Container;
  private petBody?: Phaser.GameObjects.Image;

  private makeLightTexture() {
    if (this.textures.exists('softlight')) return;
    const tex = this.textures.createCanvas('softlight', 256, 256)!;
    const c = tex.getContext();
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    tex.refresh();
  }

  /** Redraw the darkness each frame, cutting soft flickering holes for each light. */
  private drawDarkness(time: number) {
    if (!this.dark || !this.brush) return;
    const view = this.cameras.main.worldView;
    this.dark.clear();
    this.dark.fill(0x030206, 0.84);
    const cut = (x: number, y: number, r: number) => {
      if (x + r < view.x || x - r > view.right || y + r < view.y || y - r > view.bottom) return;
      this.brush!.setScale((r * 2) / 256);
      this.dark!.erase(this.brush!, x - view.x, y - view.y);
    };
    for (const l of this.glowSpots) cut(l.x, l.y, l.r * (1 + Math.sin(time / 90 + l.flicker) * 0.04 + Math.sin(time / 37 + l.flicker * 3) * 0.03));
    cut(this.player.x, this.player.y, 250);
  }

  private place(): Place {
    return placeOf(this.world.floor);
  }

  private area(): AreaDef {
    return areaOf(this.world.floor);
  }

  // ---------------------------------------------------------------- map

  private drawMap() {
    const { map } = this.world;
    const th = this.area().theme;
    // Only walls right next to a room or path are drawn; everything else is empty darkness.
    const nearFloor = (x: number, y: number) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (map.tiles[y + dy]?.[x + dx] === FLOOR) return true;
      return false;
    };
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = map.tiles[y][x];
        if (t !== FLOOR && !nearFloor(x, y)) continue;
        let key: string;
        if (t === FLOOR) key = (x * 7 + y * 13) % 9 === 0 ? th.floorAlt : th.floor;
        else {
          const below = y + 1 < map.h ? map.tiles[y + 1][x] : 0;
          key = below === FLOOR ? th.wall : th.wallTop;
        }
        if (th.outdoor && t !== FLOOR) {
          // Trees stand on grass.
          this.add.image(x * TS, y * TS, th.floor).setOrigin(0).setScale(S);
          const tree = this.add.image(x * TS + TS / 2, y * TS + TS / 2, key).setScale(S).setDepth(key === th.wall ? 3 : 0);
          if (key === th.wallTop) tree.setTint(0xb8d8b0);
          continue;
        }
        const img = this.add.image(x * TS, y * TS, key).setOrigin(0).setScale(S);
        if (t !== FLOOR && key === th.wallTop) img.setTint(0xbbbbcc);
        // Little flowers, bushes and logs scattered on the forest floor.
        if (t === FLOOR && th.deco.length && (x * 37 + y * 53) % 23 === 0 && !this.isObstacle({ x, y })) {
          this.add.image(x * TS + TS / 2, y * TS + TS / 2, th.deco[(x + y) % th.deco.length]).setScale(S).setDepth(1);
        }
      }
    }
    if (th.outdoor) {
      // Fireflies drifting through the trees.
      for (let i = 0; i < 40; i++) {
        const f = this.add.image(Phaser.Math.Between(0, map.w * TS), Phaser.Math.Between(0, map.h * TS), 'dot').setTint(0xfff27a).setScale(0.5).setBlendMode('ADD').setDepth(25);
        this.tweens.add({ targets: f, x: f.x + Phaser.Math.Between(-60, 60), y: f.y + Phaser.Math.Between(-60, 60), alpha: { from: 0.1, to: 0.9 }, duration: Phaser.Math.Between(1500, 3500), yoyo: true, repeat: -1 });
      }
      return;
    }
    // Wall torches for atmosphere.
    for (let y = 1; y < map.h - 1; y++) {
      for (let x = 0; x < map.w; x++) {
        if (map.tiles[y][x] !== FLOOR && map.tiles[y + 1][x] === FLOOR && (x * 31 + y * 17) % 6 === 0) {
          const torch = this.add.image(x * TS + TS / 2, y * TS + TS / 2, 'tile_torch').setScale(S).setDepth(2);
          this.glowSpots.push({ x: torch.x, y: torch.y + 20, r: 230, flicker: x * 3.1 + y });
          const glow = this.add.image(torch.x, torch.y, 'glow').setScale(9).setTint(0xffa040).setAlpha(0.25).setDepth(1).setBlendMode('ADD');
          this.tweens.add({ targets: glow, alpha: 0.4, scale: 10, duration: 500 + ((x * y) % 300), yoyo: true, repeat: -1 });
        }
      }
    }
  }

  private drawObjects() {
    const { map } = this.world;
    const at = (pt: Pt, key: string, depth = 4) => this.add.image(pt.x * TS + TS / 2, pt.y * TS + TS / 2, key).setScale(S).setDepth(depth);

    const th = this.area().theme;
    if (this.place().kind === 'floor') {
      const isBossDoor = placeOf(this.world.floor + 1).kind === 'lair';
      const exit = at(map.exit, isBossDoor ? th.bossDoor : th.exit);
      if (isBossDoor) {
        const g = this.add.image(exit.x, exit.y, 'glow').setScale(8).setTint(th.outdoor ? 0x6aff4a : 0xff4040).setAlpha(0.3).setBlendMode('ADD').setDepth(3);
        this.tweens.add({ targets: g, alpha: 0.6, duration: 800, yoyo: true, repeat: -1 });
      }
    } else {
      at(map.exit, th.exit);
      // After beating the boss, a portal opens to the next area.
      const next = AREAS[this.place().area + 1];
      if (map.portal && next && current().bossesBeaten?.includes(this.area().boss.id)) {
        const portal = at(map.portal, 'tile_portal', 5);
        this.tweens.add({ targets: portal, angle: 360, duration: 4000, repeat: -1 });
        const g = this.add.image(portal.x, portal.y, 'glow').setScale(10).setTint(0x9a6aff).setAlpha(0.4).setBlendMode('ADD').setDepth(4);
        this.tweens.add({ targets: g, alpha: 0.7, scale: 11, duration: 700, yoyo: true, repeat: -1 });
        this.label({ x: map.portal.x, y: map.portal.y - 1 }, tr('To {place}', { place: tr(next.name) }));
      }
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
      at(map.camp.fountain, th.spring);
      const m = at(map.camp.merchant, 'npc_merchant', 10);
      m.setFlipX(true);
      this.tweens.add({ targets: m, y: m.y - 3, duration: 900, yoyo: true, repeat: -1 });
      this.label(map.camp.fountain, tr('Heal'));
      this.label(map.camp.merchant, tr('Shop'));
      this.label(map.camp.fire, tr('Travel'));
      if (this.hasDummy()) {
        const d = at(map.camp.dummy, 'enemy_dummy', 10);
        this.tweens.add({ targets: d, angle: { from: -3, to: 3 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        this.label(map.camp.dummy, tr('Training Dummy'));
      }
    }

    if (map.boss) {
      const boss = this.area().boss;
      const b = this.add.image(map.boss.x * TS + TS / 2, map.boss.y * TS + TS / 2, boss.sprite).setScale(S).setDepth(15).setFlipX(true);
      this.tweens.add({ targets: b, scaleY: S * 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.label({ x: map.boss.x, y: map.boss.y - 1 }, tr(boss.name));
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

    const floorName = tr(this.place().name);
    txt(this, W / 2, 14, floorName, 18, '#ffe9a0').setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    const bx = W - 70;
    const mk = (y: number, label: string, fn: () => void, color = 0x4b3a78) => button(this, bx, y, 120, 50, label, fn, { size: 19, color }).setScrollFactor(0).setDepth(1000);
    mk(36, tr('Bag'), () => this.openOverlay('Inventory'));
    mk(94, tr('Spells'), () => this.openOverlay('Spells'), 0x5a3a8a);
    mk(152, tr('Potion'), () => this.drinkPotion(), 0x8a2a3a);
    mk(210, tr('Camp'), () => this.goCamp(), 0x2e5a7a);
    mk(268, tr('Save & Quit'), () => {
      saveProfile(current());
      worldState.world = null;
      this.scene.start('Title');
    }, 0x3a3450).label.setFontSize(getLang() === 'fr' ? 13 : 15);
    soundButton(this, bx, 326).setScrollFactor(0).setDepth(1000);
    const stickBtn = mk(384, '', () => {
      setStickOn(!stickOn());
      stickBtn.label.setText(stickLabel());
      this.buildStick();
    }, 0x2e4a5a);
    stickBtn.label.setText(stickLabel()).setFontSize(15);
    this.buildStick();
    this.refreshHud(false);
  }

  /** On-screen joystick (bottom left): drag the knob to walk, like the arrow keys. */
  private buildStick() {
    this.stickParts.forEach((o) => o.destroy());
    this.stickParts = [];
    this.stick = { dx: 0, dy: 0 };
    if (!stickOn()) return;
    const cx = STICK.x;
    const cy = STICK.y;
    const R = STICK.r;
    const base = this.add.circle(cx, cy, R, 0x1d1730, 0.55).setStrokeStyle(4, 0xffffff, 0.5);
    const arrows = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([x, y]) =>
      this.add.triangle(cx + x * (R - 16), cy + y * (R - 16), 0, 10, 8, 0, 16, 10, 0xffffff, 0.6).setRotation(Math.atan2(y, x) + Math.PI / 2),
    );
    const knob = this.add.circle(cx, cy, 28, 0x7fd3ff, 0.85).setStrokeStyle(3, 0xffffff);
    const zone = this.add.zone(cx, cy, R * 2 + 40, R * 2 + 40).setInteractive();
    this.stickParts = [base, ...arrows, knob, zone];
    this.stickParts.forEach((o) => (o as Phaser.GameObjects.Shape).setScrollFactor(0).setDepth(1000));
    let held: number | null = null;
    const move = (ptr: Phaser.Input.Pointer) => {
      if (held !== ptr.id) return;
      let x = ptr.x - cx;
      let y = ptr.y - cy;
      const d = Math.hypot(x, y);
      if (d > R) {
        x = (x / d) * R;
        y = (y / d) * R;
      }
      knob.setPosition(cx + x, cy + y);
      // Walking is on a grid, so pick the stronger direction.
      this.stick = d < 18 ? { dx: 0, dy: 0 } : Math.abs(x) > Math.abs(y) ? { dx: Math.sign(x), dy: 0 } : { dx: 0, dy: Math.sign(y) };
    };
    const release = (ptr: Phaser.Input.Pointer) => {
      if (held !== ptr.id) return;
      held = null;
      this.stick = { dx: 0, dy: 0 };
      knob.setPosition(cx, cy);
    };
    zone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      held = ptr.id;
      this.path = [];
      move(ptr);
    });
    this.input.on('pointermove', move);
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    zone.once('destroy', () => {
      this.input.off('pointermove', move);
      this.input.off('pointerup', release);
      this.input.off('pointerupoutside', release);
    });
  }

  refreshHud(animate = true) {
    const p = current();
    const s = derive(p);
    this.hud.info.setText(p.level >= LEVEL_CAP ? tr('{name}  Lv {n} (MAX)', { name: p.name, n: p.level }) : tr('{name}  Lv {n}', { name: p.name, n: p.level }));
    this.hud.hp.set(p.hp, s.maxHp, animate);
    this.hud.mp.set(p.mp, s.maxMp, animate);
    const maxed = p.level >= LEVEL_CAP;
    this.hud.xp.set(maxed ? 1 : p.xp, maxed ? 1 : xpToNext(p.level), animate);
    this.hud.xpBig.set(maxed ? 1 : p.xp, maxed ? 1 : xpToNext(p.level), animate);
    this.hud.xpLeft.setText(tr('Level {n}', { n: p.level }));
    this.hud.xpRight.setText(maxed ? tr('MAX LEVEL!') : tr('XP to level {n}', { n: p.level + 1 }));
    this.hud.gold.setText(tr('{n}g', { n: fmtNum(p.gold) }));
    this.hud.pots.setX(Math.max(84, this.hud.gold.x + this.hud.gold.width + 10));
    this.hud.pots.setText(tr('Potions: {hp} health, {mp} mana', { hp: countPotions(p.potions, 'hp'), mp: countPotions(p.potions, 'mp') }));
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const day = p.learning.days[key];
    this.hud.today.setText(day ? tr('Today: {right} of {asked} questions right!', { right: day.correct, asked: day.asked }) : tr('Find a monster to start learning!'));
  }

  private drinkPotion() {
    if (this.busy) return;
    this.busy = true;
    this.path = [];
    openPotionMenu(
      this,
      (d, gained) => {
        this.busy = false;
        this.healFx(this.player);
        toast(this, d.kind === 'hp' ? tr('+{n} health', { n: gained }) : tr('+{n} mana', { n: gained }), C.good);
        this.refreshHud();
      },
      () => (this.busy = false),
    );
  }

  private healFx(target: Phaser.GameObjects.Image) {
    for (let i = 0; i < 12; i++) {
      const d = this.add.image(target.x + ri(-20, 20), target.y + ri(0, 20), 'dot').setTint(0x7dff9a).setDepth(40).setScale(0.8);
      this.tweens.add({ targets: d, y: d.y - ri(40, 70), alpha: 0, duration: ri(600, 900), onComplete: () => d.destroy() });
    }
  }

  private openOverlay(key: 'Inventory' | 'Shop' | 'Travel' | 'Spells') {
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
    const camp = campPlace(this.place().area);
    if (this.world.floor === camp) {
      this.path = [];
      const camp = this.world.map.start;
      this.player.setPosition(camp.x * TS + TS / 2, camp.y * TS + TS / 2);
      this.world.player = { ...camp };
      return;
    }
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => this.scene.restart({ floor: camp }));
  }

  private showFloorBanner() {
    const pl = this.place();
    const name = tr(pl.name);
    const sub = pl.floor ? tr('Monsters here: level {from} - {to}', { from: pl.floor.levels[0], to: pl.floor.levels[1] }) : tr(this.area().boss.lairSub);
    const c = this.add.container(W / 2, H / 2 - 60).setScrollFactor(0).setDepth(2000);
    c.add(txt(this, 0, 0, name, 36, '#ffd24a').setOrigin(0.5));
    c.add(txt(this, 0, 44, sub, 20, C.dim).setOrigin(0.5));
    this.tweens.add({ targets: c, alpha: 0, delay: 1800, duration: 700, onComplete: () => c.destroy() });
  }

  // ---------------------------------------------------------------- input & movement

  private setupInput() {
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.busy || over.length) return;
      // A drag that started on the joystick isn't a tap on the map.
      if (stickOn() && Math.hypot(ptr.downX - STICK.x, ptr.downY - STICK.y) < STICK.r + 20) return;
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
    if (c && this.hasDummy() && c.dummy.x === pt.x && c.dummy.y === pt.y) return true;
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

  update(time: number) {
    this.drawDarkness(time);
    if (this.busy || this.moving) return;
    const up = { isDown: false } as Phaser.Input.Keyboard.Key;
    const k = this.keys ?? { LEFT: up, A: up, RIGHT: up, D: up, UP: up, W: up, DOWN: up, S: up };
    let dx = 0;
    let dy = 0;
    if (k.LEFT.isDown || k.A.isDown) dx = -1;
    else if (k.RIGHT.isDown || k.D.isDown) dx = 1;
    else if (k.UP.isDown || k.W.isDown) dy = -1;
    else if (k.DOWN.isDown || k.S.isDown) dy = 1;
    else ({ dx, dy } = this.stick);
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
    const prev = this.world.player;
    this.world.player = next;
    if (this.petSprite) {
      if (next.x !== prev.x) this.petBody?.setFlipX(next.x < prev.x);
      this.tweens.killTweensOf(this.petSprite);
      this.tweens.add({ targets: this.petSprite, x: prev.x * TS + TS / 2, y: prev.y * TS + TS / 2, duration: 130 });
    }
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
    const nextArea = this.place().area + 1;
    if (m.portal && pos.x === m.portal.x && pos.y === m.portal.y && AREAS[nextArea] && current().bossesBeaten?.includes(this.area().boss.id)) {
      // Later areas are part of the full game.
      if (nextArea >= FREE_LIMITS.dungeonAreas && !fullGame('dungeon')) {
        fullGamePrompt(this, 'dungeon', tr('{place} is waiting on the other side of the portal!', { place: tr(AREAS[nextArea].name) }));
        return true;
      }
      sfx('summon');
      this.cameras.main.flash(400, 160, 110, 255);
      this.time.delayedCall(400, () => this.scene.restart({ floor: campPlace(nextArea) }));
      return true;
    }
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
      if (p.pet) p.pet.hp = p.pet.maxHp;
      this.healFx(this.player);
      toast(this, p.pet ? tr('The water heals you and your {pet}!', { pet: tr(p.pet.name) }) : tr('The water heals you completely!'), C.good);
      sfx('heal');
      this.refreshHud();
      saveProfile(p);
    } else if (c && pt.x === c.merchant.x && pt.y === c.merchant.y) {
      this.openOverlay('Shop');
    } else if (c && pt.x === c.fire.x && pt.y === c.fire.y) {
      this.openOverlay('Travel');
    } else if (c && this.hasDummy() && pt.x === c.dummy.x && pt.y === c.dummy.y) {
      this.busy = true;
      this.path = [];
      this.time.delayedCall(150, () => this.scene.start('Battle', { dummy: true, group: [makeEnemy('dummy', p.level)] }));
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
      toast(this, tr('Your bag is full! Sell something first.'), C.bad);
      return;
    }
    this.world.openedChests.add(key);
    sfx('chest');
    this.chestSprites.get(key)?.setTexture('tile_chest_open');
    const levels = this.place().floor?.levels ?? [1, 3];
    const ilvl = Math.min(20, ri(levels[0], levels[1]) + 1);
    const item = makeItem(ilvl, { cls: classOf(p), rarity: Math.random() < 0.5 ? 'uncommon' : Math.random() < 0.7 ? 'rare' : 'epic' });
    const gold = ri(5, 12) * Math.ceil(ilvl / 3);
    // Chests often hold a potion too.
    if (Math.random() < 0.5) {
      const d = POTIONS.find((x) => x.kind === (Math.random() < 0.7 ? 'hp' : 'mp') && x.tier === tierForLevel(ilvl))!;
      p.potions[d.id] = (p.potions[d.id] ?? 0) + 1;
      this.time.delayedCall(1300, () => toast(this, tr('+1 {potion}', { potion: tr(d.name) }), '#ff8a8a'));
    }
    p.bag.push(item);
    p.gold += gold;
    saveProfile(p);
    this.refreshHud();
    toast(this, tr('Treasure! {item} and {gold} gold', { item: itemName(item), gold }), RARITY[item.rarity].css);
  }

  private useExit() {
    const p = current();
    const w = this.world;
    const boss = this.area().boss;
    const next = w.floor + 1;
    const nextIsLair = this.place().kind === 'floor' && placeOf(next).kind === 'lair';
    if (this.place().kind === 'lair') {
      // Leave the lair back to the last floor of the area.
      sfx('stairs');
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => this.scene.restart({ floor: w.floor - 1 }));
      return;
    }
    if (nextIsLair && p.level < boss.minLevel) {
      this.dialog([
        this.area().theme.outdoor ? tr('A huge gate made of twisted roots, glowing green...') : tr('A heavy door with a crown carved on it...'),
        tr('A deep voice rumbles: "Come back when you\'re stronger, little hero!" (Reach level {need} to enter. You are level {level}.)', { need: boss.minLevel, level: p.level }),
      ]);
      return;
    }
    sfx('stairs');
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

  /** Developer heroes get a training dummy in the very first camp. */
  private hasDummy(): boolean {
    return !!current().dev && this.world.floor === campPlace(0);
  }

  private startBattle(mon: WorldMonster) {
    this.busy = true;
    this.path = [];
    sfx('encounter');
    this.cameras.main.shake(200, 0.01);
    this.cameras.main.flash(250, 255, 255, 255);
    this.time.delayedCall(350, () => this.scene.start('Battle', { monsterId: mon.id, group: mon.group }));
  }

  private startBoss() {
    this.busy = true;
    this.dialog(this.area().boss.intro.map((l) => tr(l)), () => {
      this.cameras.main.shake(400, 0.02);
      this.time.delayedCall(400, () => this.scene.start('Battle', { boss: true, bossArea: this.place().area, lair: this.world.floor }));
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
    const hint = txt(this, W - 90, H - 50, tr('tap to continue'), 15, C.dim).setOrigin(1, 1);
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
