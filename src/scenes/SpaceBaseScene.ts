import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { tr } from '../i18n';
import { BUILDINGS, MAX_PART, PARTS, planet, startOf, type BuildingDef } from '../space/data';
import { groundTexture, planetTexture, surfaceOf } from '../space/draw';
import {
  adminCost, base, canAfford, fuelCap, fuelBoost, fuelPerMinute, loadSpace, MAX_ADMIN, partCost, plantCost, plantMax, produce,
  saveSpace, unload, upgradeAdmin, upgradePart, upgradePlant, type SpaceSave,
} from '../space/state';
import { costRow, keyVector, mineralRow, say, Stick, tempText, tx } from '../space/ui';
import { C, H, W, button, panel, soundButton, txt } from '../ui/widgets';

/** Where each building stands on the ground (center bottom). */
const SPOTS: Record<BuildingDef['id'], { x: number; y: number }> = {
  admin: { x: 150, y: 330 },
  lox: { x: 330, y: 300 },
  ch4: { x: 500, y: 300 },
  pad: { x: 670, y: 330 },
  launch: { x: 850, y: 310 },
};
/** The astronaut walks on this part of the ground. */
const WALK = { top: 340, bottom: 500, left: 40, right: W - 40 };

/** The base on a planet: walk around with the astronaut and use the buildings. */
export class SpaceBaseScene extends Phaser.Scene {
  private s!: SpaceSave;
  private astro!: Phaser.GameObjects.Image;
  private target: { x: number; y: number; open?: BuildingDef['id'] } | null = null;
  private stick!: Stick;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private hud!: Phaser.GameObjects.Container;
  private popup?: Phaser.GameObjects.Container;

  constructor() {
    super('SpaceBase');
  }

  create(data: { arrived?: boolean; landed?: boolean; back?: boolean } = {}) {
    const s = loadSpace();
    if (!s) {
      this.scene.start('SpaceSetup', { fresh: true });
      return;
    }
    this.s = s;
    this.popup = undefined;
    this.target = null;
    produce(s);
    playMusic('farm');
    this.drawWorld();

    this.astro = this.add.image(480, 430, 'space_astronaut').setScale(3.5).setDepth(400);
    this.tweens.add({ targets: this.astro, scaleY: 3.3, duration: 500, yoyo: true, repeat: -1 });
    this.stick = new Stick(this);
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.popup || over.length || this.stick.owns(p)) return;
      if (p.y > WALK.top - 40) this.target = { x: p.x, y: Phaser.Math.Clamp(p.y, WALK.top, WALK.bottom) };
    });

    this.buildHud();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refresh() });

    if (data.landed) {
      const moved = unload(s);
      saveSpace(s);
      this.refresh();
      const total = Object.values(moved).reduce((a, b) => a + b, 0);
      if (total) say(this, tr('Landed! {n} minerals unloaded.', { n: total }), C.good);
    }
    if (data.arrived) this.arrivalBanner();
    if (data.back) say(this, tr('Back on {planet}!', { planet: tx(planet(s.at).name) }), C.good);
  }

  // ---------------------------------------------------------------- world
  private drawWorld() {
    const id = this.s.at;
    const sf = surfaceOf(id);
    const sky = this.add.graphics();
    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(sf.skyTop), Phaser.Display.Color.ValueToColor(sf.skyBottom), 19, i,
      );
      sky.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1).fillRect(0, t * 250, W, 14);
    }
    if (sf.stars) {
      for (let i = 0; i < 60; i++) this.add.rectangle(Math.random() * W, Math.random() * 230, 2, 2, 0xffffff, 0.4 + Math.random() * 0.6);
    }
    if (sf.sun) {
      const sun = this.add.circle(W - 210, 70, sf.sun, 0xfff4c0);
      this.add.image(sun.x, sun.y, 'glow').setScale(sf.sun / 3).setTint(0xffe080).setBlendMode('ADD').setAlpha(0.6);
    }
    // Venus: thick moving clouds hide the Sun. Earth: a few white clouds.
    if (id === 'venus' || id === 'earth') {
      for (let i = 0; i < (id === 'venus' ? 9 : 4); i++) {
        const cl = this.add.ellipse(Math.random() * W, 30 + Math.random() * 170, 160 + Math.random() * 160, 30 + Math.random() * 20, id === 'venus' ? 0xf4d890 : 0xffffff, id === 'venus' ? 0.55 : 0.8);
        this.tweens.add({ targets: cl, x: cl.x + 200, duration: 30000 + Math.random() * 20000, yoyo: true, repeat: -1 });
      }
    }
    // Earth's Moon, or the other planets as bright dots in the sky.
    if (id === 'earth') this.add.image(560, 150, planetTexture(this, 'mercury', 16)).setScale(2).setAlpha(0.85);
    if (id === 'mars') this.add.circle(180, 60, 3, 0x9ad0ff);
    this.add.tileSprite(0, 240, W, H - 240, groundTexture(this, id)).setOrigin(0).setTileScale(3);
    // Distant hills on the horizon.
    const hills = this.add.graphics();
    hills.fillStyle(surfaceOf(id).ground[1], 1);
    for (let x = -40; x < W + 40; x += 120) hills.fillEllipse(x + ((x * 7) % 50), 246, 220, 40);

    for (const b of BUILDINGS) {
      const sp = SPOTS[b.id];
      const img = this.add.image(sp.x, sp.y, b.sprite).setOrigin(0.5, 1).setScale(4).setDepth(sp.y);
      img.setInteractive({ useHandCursor: true }).on('pointerup', () => this.walkTo(b.id));
      txt(this, sp.x, sp.y + 8, tx(b.name), 15, '#ffffff').setOrigin(0.5, 0).setDepth(sp.y + 1).setStroke('#120a1c', 4);
      if (b.id === 'launch') {
        // The player's ship stands on the launch pad, nose up.
        const ship = this.add.image(sp.x + 22, sp.y - 70, startOf(this.s.start).sprite).setScale(4).setAngle(-90).setDepth(sp.y + 2);
        ship.setInteractive({ useHandCursor: true }).on('pointerup', () => this.walkTo('launch'));
      }
    }
  }

  private walkTo(id: BuildingDef['id']) {
    if (this.popup) return;
    const sp = SPOTS[id];
    this.target = { x: sp.x, y: Math.max(WALK.top, sp.y + 30), open: id };
  }

  update(_t: number, dt: number) {
    if (!this.astro || this.popup) return;
    const speed = 0.24 * dt;
    const stick = this.stick.vec;
    const keys = keyVector(this.keys);
    let vx = stick.x || keys.x;
    let vy = stick.y || keys.y;
    if (vx || vy) this.target = null;
    else if (this.target) {
      const dx = this.target.x - this.astro.x;
      const dy = this.target.y - this.astro.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        const open = this.target.open;
        this.target = null;
        if (open) this.openBuilding(open);
        return;
      }
      vx = dx / d;
      vy = dy / d;
    }
    if (!vx && !vy) return;
    if (vx) this.astro.setFlipX(vx < 0);
    this.astro.x = Phaser.Math.Clamp(this.astro.x + vx * speed, WALK.left, WALK.right);
    this.astro.y = Phaser.Math.Clamp(this.astro.y + vy * speed, WALK.top, WALK.bottom);
    this.astro.setDepth(this.astro.y + 40);
  }

  // ---------------------------------------------------------------- HUD
  private buildHud() {
    this.hud?.destroy();
    const s = this.s;
    const p = planet(s.at);
    const b = base(s);
    const c = this.add.container(0, 0).setDepth(2000);
    this.hud = c;
    c.add(panel(this, 8, 8, 300, 74, 0x1d1730, 0x7fd3ff));
    c.add(this.add.image(38, 45, planetTexture(this, s.at, 16)).setScale(2.6));
    c.add(txt(this, 66, 16, `${tx(p.name)}  ·  ${tr('World {n}', { n: s.world })}`, 18, '#ffd24a'));
    c.add(txt(this, 66, 40, tr('Temperature: {t}', { t: tempText(p.tempC) }), 14, C.text));
    c.add(txt(this, 66, 60, tr('Commander {name}', { name: s.commander }), 13, C.dim));
    c.add(panel(this, 316, 8, W - 324 - 140, 74, 0x1d1730, 0x5a4a7a));
    c.add(mineralRow(this, 328, 30, s.minerals, { all: true, size: 15 }));
    c.add(this.add.image(338, 62, 'fuel_lox').setScale(1.6));
    c.add(txt(this, 352, 62, tr('Oxygen {n}/{max}', { n: Math.floor(b.lox), max: fuelCap(b.adminLv) }), 14, '#9ad0ff').setOrigin(0, 0.5));
    c.add(this.add.image(538, 62, 'fuel_ch4').setScale(1.6));
    c.add(txt(this, 552, 62, tr('Methane {n}/{max}', { n: Math.floor(b.ch4), max: fuelCap(b.adminLv) }), 14, '#ffb36b').setOrigin(0, 0.5));
    c.add(button(this, W - 66, 28, 116, 38, tr('Games'), () => {
      saveSpace(s);
      this.scene.start('Hub');
    }, { size: 15, color: 0x3a3450 }));
    c.add(soundButton(this, W - 66, 66, 116, 30));
  }

  private refresh() {
    if (!this.s) return;
    produce(this.s);
    saveSpace(this.s);
    this.buildHud();
  }

  private arrivalBanner() {
    const p = planet(this.s.at);
    sfx('levelup');
    const t = txt(this, W / 2, 180, tr('World {n}: {planet}!', { n: this.s.world, planet: tx(p.name) }), 44, '#ffd24a').setOrigin(0.5).setDepth(2400);
    t.setStroke('#120a1c', 8);
    this.tweens.add({ targets: t, scale: { from: 0.4, to: 1 }, duration: 400, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 700, onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------- buildings
  private openBuilding(id: BuildingDef['id']) {
    sfx('click');
    this.popup?.destroy();
    const c = this.add.container(0, 0).setDepth(2500);
    this.popup = c;
    const def = BUILDINGS.find((b) => b.id === id)!;
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(this, 40, 96, W - 80, H - 112, 0x1d1730, 0x7fd3ff));
    c.add(this.add.image(100, 160, def.sprite).setScale(2.4));
    c.add(txt(this, 150, 112, tx(def.name), 26, '#ffd24a'));
    c.add(txt(this, 150, 146, tx(def.info), 15, C.dim, { wordWrap: { width: W - 260 } }));
    const close = () => {
      c.destroy();
      this.popup = undefined;
      this.buildHud();
    };
    c.add(button(this, W - 110, H - 50, 150, 48, tr('Close'), close, { size: 20, color: 0x3a3450 }));
    const again = () => {
      close();
      this.openBuilding(id);
    };
    if (id === 'admin') this.adminPanel(c, again);
    else if (id === 'lox' || id === 'ch4') this.plantPanel(c, id, again);
    else if (id === 'pad') this.padPanel(c, again);
    else this.launchPanel(c, close);
  }

  private upgradeButton(c: Phaser.GameObjects.Container, x: number, y: number, ok: boolean, label: string, fn: () => boolean, after: () => void) {
    c.add(button(this, x, y, 170, 42, label, () => {
      if (fn()) {
        sfx('levelup');
        saveSpace(this.s);
        after();
      } else say(this, tr('Not enough minerals yet. Fly to space and mine some!'), '#ffb36b');
    }, { size: 17, color: ok ? 0x2f9a4a : 0x5a4a6a }));
  }

  private adminPanel(c: Phaser.GameObjects.Container, again: () => void) {
    const s = this.s;
    const p = planet(s.at);
    const b = base(s);
    const st = startOf(s.start);
    const young = s.settings.grade <= 2;
    c.add(this.add.image(130, 290, planetTexture(this, s.at, 48)).setScale(2.4));
    let y = 196;
    const line = (text: string, color = C.text, size = 16) => {
      const t = txt(this, 250, y, text, size, color, { wordWrap: { width: W - 340 } });
      c.add(t);
      y += t.height + 8;
    };
    line(tr('Temperature: {t}', { t: tempText(p.tempC) }), '#ffe9a0');
    line(tr('Moons: {n}', { n: p.moons }), '#ffe9a0');
    for (const f of young ? p.young : p.older) line(`• ${tx(f)}`);
    line(tr('Your special skill: {skill}. {info}', { skill: tx(st.skill), info: tx(st.skillInfo) }), '#c98aff', 15);
    c.add(txt(this, 70, H - 104, tr('Base level {n} of {max}: fuel tanks hold {cap}, plants can reach level {plant}.', { n: b.adminLv, max: MAX_ADMIN, cap: fuelCap(b.adminLv), plant: plantMax(b.adminLv) }), 15, C.text));
    if (b.adminLv < MAX_ADMIN) {
      const cost = adminCost(b.adminLv + 1);
      c.add(costRow(this, 70, H - 66, cost, s));
      this.upgradeButton(c, 460, H - 60, canAfford(s, cost), tr('Upgrade base'), () => upgradeAdmin(s), again);
    }
    c.add(button(this, 650, H - 60, 190, 42, tr('Solar system map'), () => {
      saveSpace(s);
      this.scene.start('SpaceMap');
    }, { size: 16, color: 0x2e5a7a }));
  }

  private plantPanel(c: Phaser.GameObjects.Container, kind: 'lox' | 'ch4', again: () => void) {
    const s = this.s;
    const b = base(s);
    const lv = kind === 'lox' ? b.loxLv : b.ch4Lv;
    const have = kind === 'lox' ? b.lox : b.ch4;
    const rate = fuelPerMinute(lv) * fuelBoost(s);
    c.add(this.add.image(130, 280, kind === 'lox' ? 'fuel_lox' : 'fuel_ch4').setScale(8));
    c.add(txt(this, 250, 210, tr('Level {n}', { n: lv }), 24, '#ffd24a'));
    c.add(txt(this, 250, 250, tr('Makes {n} units a minute.', { n: Math.round(rate * 10) / 10 }), 18));
    c.add(txt(this, 250, 280, tr('In the tank: {n} of {max}.', { n: Math.floor(have), max: fuelCap(b.adminLv) }), 18));
    c.add(txt(this, 250, 320, tr('Rockets burn methane with liquid oxygen. Your ship needs both to fly to another planet.'), 15, C.dim, { wordWrap: { width: W - 340 } }));
    if (lv < plantMax(b.adminLv)) {
      const cost = plantCost(kind, lv + 1);
      c.add(txt(this, 70, H - 104, tr('Upgrade to level {n}:', { n: lv + 1 }), 16));
      c.add(costRow(this, 70, H - 66, cost, s));
      this.upgradeButton(c, 520, H - 60, canAfford(s, cost), tr('Upgrade'), () => upgradePlant(s, kind), again);
    } else c.add(txt(this, 70, H - 90, lv >= 10 ? tr('This plant is at the top level!') : tr('Upgrade the Command Center to build this plant higher.'), 16, '#ffb36b'));
  }

  private padPanel(c: Phaser.GameObjects.Container, again: () => void) {
    const s = this.s;
    const st = startOf(s.start);
    c.add(this.add.image(130, 280, st.sprite).setScale(5));
    c.add(txt(this, 130, 340, tx(st.ship), 18, '#ffd24a').setOrigin(0.5));
    PARTS.forEach((part, i) => {
      const y = 196 + i * 58;
      const lv = s.ship[part.id];
      c.add(txt(this, 250, y, `${tx(part.name)}  ${tr('Level {n}', { n: lv })}`, 17, '#ffffff'));
      c.add(txt(this, 250, y + 22, tx(part.info), 12, C.dim));
      if (lv < MAX_PART) {
        const cost = partCost(part.id, lv + 1);
        c.add(costRow(this, 520, y + 6, cost, s));
        c.add(button(this, W - 120, y + 12, 120, 36, tr('Upgrade'), () => {
          if (upgradePart(s, part.id)) {
            sfx('levelup');
            saveSpace(s);
            again();
          } else say(this, tr('Not enough minerals yet. Fly to space and mine some!'), '#ffb36b');
        }, { size: 15, color: canAfford(s, cost) ? 0x2f9a4a : 0x5a4a6a }));
      } else c.add(txt(this, 520, y + 6, tr('Max level!'), 15, C.good));
    });
  }

  private launchPanel(c: Phaser.GameObjects.Container, close: () => void) {
    const s = this.s;
    const st = startOf(s.start);
    c.add(this.add.image(130, 290, st.sprite).setScale(5).setAngle(-90));
    c.add(txt(this, 250, 210, tr('Fly to space to mine asteroids. Land again to unload your minerals.'), 18, C.text, { wordWrap: { width: W - 340 } }));
    c.add(button(this, 420, 330, 300, 70, tr('Launch to space!'), () => {
      close();
      saveSpace(s);
      this.launch();
    }, { size: 24, color: 0x2f9a4a }));
    c.add(button(this, 740, 330, 260, 70, tr('Travel to another planet'), () => {
      saveSpace(s);
      this.scene.start('SpaceMap');
    }, { size: 18, color: 0x2e5a7a }));
  }

  /** Lift-off: the ship rises with fire, then space. */
  private launch() {
    sfx('power');
    this.popup = this.add.container(0, 0);
    const sp = SPOTS.launch;
    const ship = this.add.image(sp.x + 22, sp.y - 70, startOf(this.s.start).sprite).setScale(4).setAngle(-90).setDepth(2600);
    const fire = this.add.particles(0, 0, 'dot', { follow: ship, followOffset: { x: 0, y: 50 }, speedY: { min: 120, max: 260 }, speedX: { min: -40, max: 40 }, lifespan: 500, scale: { start: 1.6, end: 0 }, tint: [0xffe066, 0xff7a2a], blendMode: 'ADD', frequency: 10 }).setDepth(2599);
    this.cameras.main.shake(900, 0.008);
    this.tweens.add({
      targets: ship,
      y: -120,
      duration: 1300,
      ease: 'Quad.In',
      onComplete: () => {
        fire.stop();
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(320, () => this.scene.start('SpaceFlight'));
      },
    });
  }
}
