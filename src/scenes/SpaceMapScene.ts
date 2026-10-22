import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { fullGame } from '../hub/ownership';
import { FREE_LIMITS } from '../hub/games';
import { getLang, getUnits, tr } from '../i18n';
import { PLANETS, planet, startOf, type PlanetDef } from '../space/data';
import { planetTexture } from '../space/draw';
import { distanceAU, heliocentric } from '../space/orbits';
import { base, loadSpace, saveSpace, travel, tripCheck, type SpaceSave } from '../space/state';
import { distText, tempText, tx } from '../space/ui';
import { fullGamePrompt } from '../ui/unlockPrompt';
import { C, H, W, button, panel, txt } from '../ui/widgets';
import { spaceBackground } from './SpaceSetupScene';

/** Center of the map and the orbit sizes (not to scale: the real ones would not fit). */
const CX = 300;
const CY = 282;
const orbit = (i: number) => 34 + i * 27;

/**
 * The solar system with every planet where it really is today (it changes a
 * little every day). Tap a planet to learn about it and travel there.
 */
export class SpaceMapScene extends Phaser.Scene {
  private s!: SpaceSave;
  private info?: Phaser.GameObjects.Container;
  private dots = new Map<string, Phaser.GameObjects.Image>();

  constructor() {
    super('SpaceMap');
  }

  create() {
    const s = loadSpace();
    if (!s) {
      this.scene.start('SpaceSetup', { fresh: true });
      return;
    }
    this.s = s;
    this.dots.clear();
    this.info = undefined;
    playMusic('title');
    spaceBackground(this);
    const today = new Date();
    const date = today.toLocaleDateString(getLang() === 'fr' ? 'fr-CA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    txt(this, 16, 10, tr('The solar system today'), 24, '#7fd3ff');
    txt(this, 16, 40, tr('Real planet positions on {date}. Come back tomorrow: they move every day!', { date }), 13, C.dim, { wordWrap: { width: 560 } });

    // The Sun in the middle.
    this.add.image(CX, CY, 'glow').setScale(3.4).setTint(0xffd24a).setBlendMode('ADD');
    this.add.circle(CX, CY, 13, 0xfff0a0);
    txt(this, CX, CY + 18, tr('Sun'), 12, '#ffe9a0').setOrigin(0.5, 0);
    const g = this.add.graphics();
    PLANETS.forEach((p, i) => {
      g.lineStyle(1, 0x5a5a8a, p.id === 'pluto' ? 0.35 : 0.6).strokeCircle(CX, CY, orbit(i));
    });
    PLANETS.forEach((p, i) => {
      // Counter-clockwise, seen from above the Sun's north pole.
      const lon = Phaser.Math.DegToRad(heliocentric(p.id, today).lon);
      const x = CX + Math.cos(lon) * orbit(i);
      const y = CY - Math.sin(lon) * orbit(i);
      const size = Math.round(12 + p.size * 6);
      const dot = this.add.image(x, y, planetTexture(this, p.id, 24)).setScale(size / 24).setInteractive({ useHandCursor: true });
      dot.on('pointerup', () => this.showInfo(p));
      this.dots.set(p.id, dot);
      if (s.visited.includes(p.id)) this.add.circle(x, y, size / 2 + 4).setStrokeStyle(2, s.at === p.id ? 0x5ef07a : 0x7fd3ff);
      if (s.at === p.id) {
        const here = txt(this, x, y - size / 2 - 6, tr('You'), 12, '#5ef07a').setOrigin(0.5, 1).setStroke('#120a1c', 4);
        this.tweens.add({ targets: here, y: here.y - 4, duration: 600, yoyo: true, repeat: -1 });
      }
    });
    button(this, 90, H - 32, 150, 44, tr('Back to base'), () => this.scene.start('SpaceBase'), { size: 16, color: 0x3a3450 });
    this.showInfo(planet(s.at));
  }

  private showInfo(p: PlanetDef) {
    sfx('click');
    this.info?.destroy();
    const s = this.s;
    const c = this.add.container(0, 0);
    this.info = c;
    const x0 = 600;
    c.add(panel(this, x0, 10, W - x0 - 10, H - 20, 0x1d1730, 0x7fd3ff));
    c.add(this.add.image(x0 + 64, 76, planetTexture(this, p.id, 48)).setScale(p.id === 'saturn' ? 1 : 1.9));
    c.add(txt(this, x0 + 130, 30, tx(p.name), 26, '#ffd24a'));
    const kind = { rocky: tr('Rocky planet'), giant: tr('Gas giant'), ice: tr('Ice giant'), dwarf: tr('Dwarf planet') }[p.kind];
    c.add(txt(this, x0 + 130, 62, kind, 15, '#c98aff'));
    c.add(txt(this, x0 + 130, 84, tr('Temperature: {t}', { t: tempText(p.tempC) }), 13, C.text, { wordWrap: { width: 210 } }));
    let y = 136;
    const line = (text: string, color = C.text, size = 14) => {
      const t = txt(this, x0 + 16, y, text, size, color, { wordWrap: { width: W - x0 - 42 } });
      c.add(t);
      y += t.height + 6;
    };
    line(tr('From the Sun: {d}', { d: distText(p.distKm, p.distMi) }), '#ffe9a0', 13);
    if (p.id !== s.at) {
      const au = distanceAU(s.at, p.id);
      const km = Math.round(au * 149.6);
      const mi = Math.round(au * 93);
      line(tr('From you today: {d}', { d: getUnits() === 'imperial' ? tr('{n} million miles', { n: mi }) : tr('{n} million km', { n: km }) }), '#ffe9a0', 13);
    }
    line(tr('Moons: {n}', { n: p.moons }), '#ffe9a0', 13);
    for (const f of s.settings.grade <= 2 ? p.young : p.older) line(`• ${tx(f)}`);

    // Travel.
    y = Math.max(y + 6, H - 150);
    if (p.id === s.at) {
      c.add(txt(this, x0 + 16, y, tr('Your base is here.'), 16, C.good));
      return;
    }
    const t = tripCheck(s, p.id);
    if (t.closed) {
      const later = p.kind === 'giant' ? tr('Coming in a later update: build a base on one of its moons!') : p.kind === 'ice' ? tr('Coming in a later update: build a space station here!') : tr('Coming in a later update: a base on this dwarf planet!');
      c.add(txt(this, x0 + 16, y, later, 15, '#ffb36b', { wordWrap: { width: W - x0 - 42 } }));
      return;
    }
    const b = base(s);
    const ok = (good: boolean) => (good ? '✔' : '✘');
    const need = [
      `${ok(b.lox >= t.lox)} ${tr('Oxygen {n}/{max}', { n: Math.floor(b.lox), max: t.lox })}`,
      `${ok(b.ch4 >= t.ch4)} ${tr('Methane {n}/{max}', { n: Math.floor(b.ch4), max: t.ch4 })}`,
      `${ok(s.ship.engine >= t.engine)} ${tr('Engine level {n}', { n: t.engine })}`,
      `${ok(s.ship.tank >= t.tank)} ${tr('Fuel tank level {n}', { n: t.tank })}`,
    ];
    c.add(txt(this, x0 + 16, y, t.isNew ? tr('Trip to World {n} needs:', { n: t.world }) : tr('Trip back needs:'), 14, '#ffe9a0'));
    need.forEach((n, i) => c.add(txt(this, x0 + 16 + (i % 2) * 170, y + 22 + Math.floor(i / 2) * 20, n, 13, n.startsWith('✔') ? C.good : '#ff8a6b')));
    c.add(button(this, (x0 + W - 10) / 2, H - 40, 220, 48, tr('Travel to {planet}', { planet: tx(p.name) }), () => this.go(p), { size: 16, color: t.ok ? 0x2f9a4a : 0x5a4a6a }));
  }

  private go(p: PlanetDef) {
    const s = this.s;
    const t = tripCheck(s, p.id);
    if (!t.ok) {
      sfx('wrong');
      return;
    }
    // Free to try: the first planet. Moving on is part of the full game.
    if (t.isNew && s.world >= FREE_LIMITS.spaceWorlds && !fullGame('space')) {
      fullGamePrompt(this, 'space', tr('{planet} is waiting for you!', { planet: tx(p.name) }));
      return;
    }
    const fromId = s.at;
    if (!travel(s, p.id)) return;
    saveSpace(s);
    sfx('power');
    // Fly across the map.
    const from = this.dots.get(fromId)!;
    const to = this.dots.get(p.id)!;
    const ship = this.add.image(from.x, from.y, startOf(s.start).sprite).setScale(1.6).setDepth(50);
    ship.setRotation(Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y));
    this.tweens.add({
      targets: ship,
      x: to.x,
      y: to.y,
      duration: 1600,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.cameras.main.fadeOut(400);
        this.time.delayedCall(420, () => this.scene.start('SpaceBase', t.isNew ? { arrived: true } : { back: true }));
      },
    });
  }
}
