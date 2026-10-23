import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { tr } from '../i18n';
import { mineral, planet, startOf } from '../space/data';
import { planetTexture, starTexture } from '../space/draw';
import {
  addCargo, alienHits, alienReward, cargoCap, cargoTotal, isOuter, loadSpace, loseHalfCargo, mineYield, rollMineral, saveSpace, shieldHits,
  shipSpeed, type SpaceSave,
} from '../space/state';
import { ask, keyVector, mineralCard, mineralRow, say, Stick, tx } from '../space/ui';
import { C, H, W, button, panel, txt } from '../ui/widgets';

/** Size of the open space around the planet. */
const WORLD = { w: 2600, h: 1900 };
const ROCKS = 14;
/** How close the ship must be to mine. */
const REACH = 130;

interface Rock {
  img: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  mineral: string;
  rich: boolean;
}

/** Space around the planet: fly, find asteroids, answer to mine them. */
export class SpaceFlightScene extends Phaser.Scene {
  private s!: SpaceSave;
  private ship!: Phaser.GameObjects.Image;
  private rocks: Rock[] = [];
  private stick!: Stick;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private busy = false;
  private hud?: Phaser.GameObjects.Container;
  private mineBtn?: Phaser.GameObjects.Container;
  private arrow!: Phaser.GameObjects.Triangle;
  private alien?: Phaser.GameObjects.Image;
  private alienArrow!: Phaser.GameObjects.Triangle;
  private stars!: Phaser.GameObjects.TileSprite;
  private stars2!: Phaser.GameObjects.TileSprite;
  private flame!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dragTo: { x: number; y: number } | null = null;
  private flownFor = 0;

  constructor() {
    super('SpaceFlight');
  }

  create() {
    const s = loadSpace();
    if (!s) {
      this.scene.start('SpaceSetup', { fresh: true });
      return;
    }
    this.s = s;
    this.rocks = [];
    this.busy = false;
    this.alien = undefined;
    this.flownFor = 0;
    playMusic('battle');
    this.cameras.main.setBackgroundColor(0x03020a);
    this.cameras.main.fadeIn(400);
    // Two star layers move at different speeds, so space feels deep.
    this.stars = this.add.tileSprite(0, 0, W, H, starTexture(this, 'stars', 50)).setOrigin(0).setScrollFactor(0).setTileScale(3).setDepth(-10);
    this.stars2 = this.add.tileSprite(0, 0, W, H, starTexture(this, 'stars2', 25)).setOrigin(0).setScrollFactor(0).setTileScale(2).setDepth(-9).setAlpha(0.7);
    // The home planet, huge, along the bottom of the screen.
    // (Turned so its sunny side, not a pole, faces up.)
    const home = this.add.image(W / 2, H + 330, planetTexture(this, s.at, 96, false)).setScrollFactor(0).setScale(10).setAngle(70).setDepth(-5);
    this.tweens.add({ targets: home, angle: 76, duration: 60000, yoyo: true, repeat: -1 });
    // A thin glowing line of air above planets that have an atmosphere.
    // Far out, your space station floats nearby.
    if (planet(s.at).site.kind === 'station') {
      const st = this.add.image(WORLD.w / 2 + 260, WORLD.h - 330, 'station_far').setScale(4).setDepth(10);
      this.tweens.add({ targets: st, y: st.y - 12, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    if (s.at !== 'mercury' && s.at !== 'pluto') this.add.circle(W / 2, H + 330, 486).setStrokeStyle(6, planet(s.at).colors[2], 0.35).setScrollFactor(0).setDepth(-4);

    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.ship = this.add.image(WORLD.w / 2, WORLD.h - 200, startOf(s.start).sprite).setScale(3).setAngle(-90).setDepth(50);
    this.cameras.main.startFollow(this.ship, true, 0.1, 0.1);
    this.flame = this.add.particles(0, 0, 'dot', { speed: { min: 20, max: 60 }, lifespan: 300, scale: { start: 1.2, end: 0 }, tint: [0xffe066, 0xff7a2a, 0x7fd3ff], blendMode: 'ADD', frequency: 25, emitting: false }).setDepth(49);

    for (let i = 0; i < ROCKS; i++) this.spawnRock();
    this.arrow = this.add.triangle(0, 0, 0, -14, 12, 10, -12, 10, 0xffe066).setScrollFactor(0).setDepth(800).setVisible(false).setStrokeStyle(2, 0x120a1c);
    this.alienArrow = this.add.triangle(0, 0, 0, -16, 14, 12, -14, 12, 0xff4a6a).setScrollFactor(0).setDepth(800).setVisible(false).setStrokeStyle(2, 0x120a1c);

    this.stick = new Stick(this);
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    // Hold a finger (or mouse) on space to fly that way.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length && !this.stick.owns(p)) this.dragTo = { x: p.x, y: p.y };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dragTo && p.isDown) this.dragTo = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', () => (this.dragTo = null));

    this.buildHud();
    // Now and then an alien ship shows up (not often).
    this.time.addEvent({ delay: 15000, loop: true, callback: () => this.maybeAlien() });
  }

  // ---------------------------------------------------------------- rocks
  private spawnRock() {
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 30; tries++) {
      x = Phaser.Math.Between(120, WORLD.w - 120);
      y = Phaser.Math.Between(120, WORLD.h - 260);
      const near = this.rocks.some((r) => Phaser.Math.Distance.Between(r.img.x, r.img.y, x, y) < 220);
      const onShip = this.ship && Phaser.Math.Distance.Between(this.ship.x, this.ship.y, x, y) < 400;
      if (!near && !onShip) break;
    }
    const m = rollMineral(isOuter(this.s.at));
    // Rare, rich asteroids glow and give three times as much.
    const rich = Math.random() < 0.08;
    const img = this.add.image(x, y, `rock_${m}`).setScale(rich ? 4.6 : 3.6).setDepth(20).setAngle(Math.random() * 360);
    this.tweens.add({ targets: img, angle: img.angle + (Math.random() < 0.5 ? 360 : -360), duration: 20000 + Math.random() * 20000, repeat: -1 });
    img.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      const r = this.rocks.find((k) => k.img === img);
      if (r && this.near(r)) this.mine(r);
    });
    let glow: Phaser.GameObjects.Image | undefined;
    if (rich) {
      glow = this.add.image(x, y, 'glow').setScale(9).setTint(0xffe066).setBlendMode('ADD').setAlpha(0.7).setDepth(19);
      this.tweens.add({ targets: glow, alpha: 0.35, scale: 11, duration: 700, yoyo: true, repeat: -1 });
    }
    this.rocks.push({ img, glow, mineral: m, rich });
  }

  private near(r: Rock): boolean {
    return Phaser.Math.Distance.Between(this.ship.x, this.ship.y, r.img.x, r.img.y) < REACH;
  }

  private nearest(): Rock | undefined {
    let best: Rock | undefined;
    let bd = Infinity;
    for (const r of this.rocks) {
      const d = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, r.img.x, r.img.y);
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    return best;
  }

  private mine(r: Rock) {
    if (this.busy) return;
    const s = this.s;
    if (cargoTotal(s) >= cargoCap(s.ship.cargo)) {
      say(this, tr('Your cargo hold is full! Land to unload it.'), '#ffb36b');
      return;
    }
    this.busy = true;
    const m = mineral(r.mineral);
    const name = `${tx(m.name)} (${m.symbol})`;
    ask(this, s, r.rich ? tr('Rich asteroid! {name}', { name }) : tr('Asteroid: {name}', { name }), {
      right: tr('Answer: {answer}. Full load of minerals!'),
      wrong: tr('You said: {given}\nRight answer: {answer}\n(Half the minerals this time)'),
      go: tr('Mine it!'),
    }, (correct) => {
      const n = mineYield(s, r.mineral, r.rich, correct);
      const got = addCargo(s, r.mineral, n);
      sfx('coin');
      this.burstRock(r);
      this.floatText(r.img.x, r.img.y - 40, `+${got} ${m.symbol}`, '#ffe066');
      this.rocks = this.rocks.filter((k) => k !== r);
      r.img.destroy();
      r.glow?.destroy();
      this.time.delayedCall(6000, () => this.spawnRock());
      saveSpace(s);
      this.buildHud();
      const first = !s.seen.includes(r.mineral);
      const done = () => {
        this.busy = false;
        if (got < n) say(this, tr('Your cargo hold is full! Land to unload it.'), '#ffb36b');
      };
      if (first) {
        s.seen.push(r.mineral);
        saveSpace(s);
        mineralCard(this, r.mineral, done);
      } else done();
    });
  }

  private burstRock(r: Rock) {
    const em = this.add.particles(r.img.x, r.img.y, 'dot', { speed: { min: 80, max: 240 }, lifespan: 600, scale: { start: 1.4, end: 0 }, tint: [mineral(r.mineral).color, 0x9a948c], emitting: false }).setDepth(60);
    em.explode(30);
    this.time.delayedCall(900, () => em.destroy());
  }

  private floatText(x: number, y: number, s: string, color: string) {
    const t = txt(this, x, y, s, 26, color).setOrigin(0.5).setDepth(700).setStroke('#120a1c', 5);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, delay: 600, duration: 700, onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------- aliens
  private maybeAlien() {
    if (this.busy || this.alien) return;
    this.flownFor += 15;
    // Not in the first minute, then about once every few minutes.
    if (this.flownFor < 60 || Math.random() > 0.12) return;
    const a = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.ship.x + Math.cos(a) * 700, 60, WORLD.w - 60);
    const y = Phaser.Math.Clamp(this.ship.y + Math.sin(a) * 500, 60, WORLD.h - 60);
    this.alien = this.add.image(x, y, 'space_alien').setScale(3.4).setDepth(55);
    this.tweens.add({ targets: this.alien, scaleY: 3.1, duration: 300, yoyo: true, repeat: -1 });
    sfx('roar');
    say(this, tr('An alien ship is coming!'), '#ff8a9a');
  }

  /** Fight it off: right answers fire the laser, wrong ones let it hit the shields. */
  private alienFight() {
    this.busy = true;
    const s = this.s;
    let alienHp = alienHits(s);
    let shields = shieldHits(s);
    const c = this.add.container(0, 0).setDepth(2800).setScrollFactor(0);
    const draw = (msg: string) => {
      c.removeAll(true);
      c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0).setInteractive());
      c.add(panel(this, 120, 80, W - 240, H - 160, 0x1d1730, 0xff4a6a));
      c.add(txt(this, W / 2, 112, tr('Alien attack!'), 30, '#ff8a9a').setOrigin(0.5));
      c.add(this.add.image(300, 250, startOf(s.start).sprite).setScale(6));
      c.add(this.add.image(660, 250, 'space_alien').setScale(6));
      c.add(txt(this, 300, 330, tr('Shields: {n}', { n: shields }), 20, '#7fd3ff').setOrigin(0.5));
      c.add(txt(this, 660, 330, tr('Alien: {n}', { n: alienHp }), 20, '#ff8a9a').setOrigin(0.5));
      c.add(txt(this, W / 2, 380, msg, 18, C.text, { align: 'center', wordWrap: { width: W - 300 } }).setOrigin(0.5));
    };
    const round = () => {
      draw(tr('Answer right to fire your laser!'));
      c.add(button(this, W / 2, H - 120, 240, 56, tr('Fire!'), () => {
        c.setVisible(false);
        ask(this, s, tr('Alien attack!'), {
          right: tr('Answer: {answer}. Direct hit!'),
          wrong: tr('You said: {given}\nRight answer: {answer}\n(The alien hits your shields!)'),
          go: tr('Keep going!'),
        }, (correct) => {
          c.setVisible(true);
          if (correct) alienHp--;
          else shields--;
          sfx(correct ? 'hit' : 'hurt');
          if (alienHp <= 0) return win();
          if (shields <= 0) return lose();
          round();
        });
      }, { size: 24, color: 0xb02a4a }));
    };
    const win = () => {
      const reward = alienReward(s);
      let got = 0;
      for (const [m, n] of Object.entries(reward)) got += addCargo(s, m, n);
      saveSpace(s);
      sfx('victory');
      draw(tr('The alien flies away and drops some minerals!'));
      c.add(mineralRow(this, W / 2 - 120, 420, reward, { size: 18 }));
      if (got < Object.values(reward).reduce((a, b) => a + b, 0)) c.add(txt(this, W / 2, 448, tr('(Some did not fit in your cargo hold.)'), 14, C.dim).setOrigin(0.5));
      c.add(button(this, W / 2, H - 120, 200, 52, tr('Great!'), () => end(), { size: 22, color: 0x2f9a4a }));
    };
    const lose = () => {
      loseHalfCargo(s);
      saveSpace(s);
      sfx('defeat');
      draw(tr('Shields down! Your ship hurries home and drops half its cargo.'));
      c.add(button(this, W / 2, H - 120, 200, 52, tr('Go home'), () => this.land(), { size: 22, color: 0x8a5a2a }));
    };
    const end = () => {
      c.destroy();
      this.alien?.destroy();
      this.alien = undefined;
      this.busy = false;
      this.buildHud();
    };
    round();
  }

  // ---------------------------------------------------------------- HUD & flying
  private buildHud() {
    this.hud?.destroy();
    const s = this.s;
    const c = this.add.container(0, 0).setDepth(1000).setScrollFactor(0);
    this.hud = c;
    c.add(panel(this, 8, 8, 560, 56, 0x1d1730, 0x7fd3ff));
    c.add(txt(this, 22, 16, tr('Cargo {n}/{max}', { n: cargoTotal(s), max: cargoCap(s.ship.cargo) }), 17, cargoTotal(s) >= cargoCap(s.ship.cargo) ? '#ffb36b' : '#ffe9a0'));
    c.add(txt(this, 22, 40, tr('Near {planet}', { planet: tx(planet(s.at).name) }), 13, C.dim));
    c.add(mineralRow(this, 190, 36, s.cargo, { size: 15 }));
    c.add(button(this, W - 90, 36, 150, 52, tr('Land'), () => this.land(), { size: 22, color: 0x2f9a4a }));
  }

  private land() {
    if (this.busy && !this.alien) return;
    this.busy = true;
    saveSpace(this.s);
    this.cameras.main.fadeOut(400);
    this.time.delayedCall(420, () => this.scene.start('SpaceBase', { landed: true }));
  }

  update(_t: number, dt: number) {
    if (!this.ship || this.busy) return;
    const s = this.s;
    let { x: vx, y: vy } = this.stick.vec;
    if (!vx && !vy) ({ x: vx, y: vy } = keyVector(this.keys));
    if (!vx && !vy && this.dragTo) {
      const sx = this.ship.x - this.cameras.main.scrollX;
      const sy = this.ship.y - this.cameras.main.scrollY;
      const dx = this.dragTo.x - sx;
      const dy = this.dragTo.y - sy;
      const d = Math.hypot(dx, dy);
      if (d > 20) {
        vx = dx / d;
        vy = dy / d;
      }
    }
    const moving = Math.hypot(vx, vy) > 0.05;
    if (moving) {
      const sp = (shipSpeed(s.ship.engine) * dt) / 1000;
      this.ship.x = Phaser.Math.Clamp(this.ship.x + vx * sp, 40, WORLD.w - 40);
      this.ship.y = Phaser.Math.Clamp(this.ship.y + vy * sp, 40, WORLD.h - 40);
      const want = Phaser.Math.RadToDeg(Math.atan2(vy, vx));
      this.ship.angle = Phaser.Math.Angle.RotateTo(this.ship.rotation, Phaser.Math.DegToRad(want), 0.15) * (180 / Math.PI);
      const back = this.ship.rotation + Math.PI;
      this.flame.setPosition(this.ship.x + Math.cos(back) * 34, this.ship.y + Math.sin(back) * 34);
      this.flame.emitParticle(2);
    }
    // Stars drift slower than the ship (parallax).
    this.stars.tilePositionX = this.cameras.main.scrollX * 0.08;
    this.stars.tilePositionY = this.cameras.main.scrollY * 0.08;
    this.stars2.tilePositionX = this.cameras.main.scrollX * 0.2;
    this.stars2.tilePositionY = this.cameras.main.scrollY * 0.2;

    // The nearest asteroid: a Mine button when close, an arrow when off screen.
    const r = this.nearest();
    const close = r && this.near(r);
    if (close && !this.mineBtn) {
      this.mineBtn = button(this, W - 120, H - 80, 200, 70, tr('Mine!'), () => {
        const k = this.nearest();
        if (k && this.near(k)) this.mine(k);
      }, { size: 28, color: 0xb07a10 }).setScrollFactor(0).setDepth(1001);
    } else if (!close && this.mineBtn) {
      this.mineBtn.destroy();
      this.mineBtn = undefined;
    }
    this.pointAt(this.arrow, r?.img);

    // The alien chases the ship; when it catches up, it's a fight.
    if (this.alien) {
      const a = this.alien;
      const ang = Phaser.Math.Angle.Between(a.x, a.y, this.ship.x, this.ship.y);
      a.x += Math.cos(ang) * 0.14 * dt;
      a.y += Math.sin(ang) * 0.14 * dt;
      if (Phaser.Math.Distance.Between(a.x, a.y, this.ship.x, this.ship.y) < 110) {
        this.mineBtn?.destroy();
        this.mineBtn = undefined;
        this.alienFight();
      }
    }
    this.pointAt(this.alienArrow, this.alien);
  }

  /** Show an arrow at the edge of the screen pointing to something off screen. */
  private pointAt(arrow: Phaser.GameObjects.Triangle, obj?: Phaser.GameObjects.Image) {
    const cam = this.cameras.main;
    if (!obj || cam.worldView.contains(obj.x, obj.y)) {
      arrow.setVisible(false);
      return;
    }
    const cx = W / 2;
    const cy = H / 2;
    const ang = Math.atan2(obj.y - (cam.scrollY + cy), obj.x - (cam.scrollX + cx));
    const m = 34;
    const k = Math.min((W / 2 - m) / Math.abs(Math.cos(ang) || 1e-6), (H / 2 - m) / Math.abs(Math.sin(ang) || 1e-6));
    arrow.setVisible(true).setPosition(cx + Math.cos(ang) * k, cy + Math.sin(ang) * k).setRotation(ang + Math.PI / 2);
  }
}
