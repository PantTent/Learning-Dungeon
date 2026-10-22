// Shared bits for the Learning Space screens.
import Phaser from 'phaser';
import { getLang, getUnits, tr } from '../i18n';
import { QuestionEngine } from '../questions/engine';
import { QuestionPanel } from '../ui/QuestionPanel';
import { C, H, W, button, panel, txt } from '../ui/widgets';
import { MINERALS, mineral, toF, type Text } from './data';
import { saveSpace, type Cost, type SpaceSave } from './state';

/** A data text in the current language. */
export const tx = (t: Text) => (getLang() === 'fr' ? t.fr : t.en);

/** "59 °F (15 °C)" for US units, "15 °C (59 °F)" for metric: both, to learn from. */
export function tempText(c: number): string {
  const f = toF(c);
  return getUnits() === 'imperial' ? `${f} °F (${c} °C)` : `${c} °C (${f} °F)`;
}

/** "150 million km (93 million miles)" in the chosen units first. */
export function distText(km: number, mi: number): string {
  const k = tr('{n} million km', { n: km.toLocaleString(getLang() === 'fr' ? 'fr-CA' : 'en-US') });
  const m = tr('{n} million miles', { n: mi.toLocaleString(getLang() === 'fr' ? 'fr-CA' : 'en-US') });
  return getUnits() === 'imperial' ? `${m} (${k})` : `${k} (${m})`;
}

/** Ask one question. Right answer = full reward, wrong = half. */
export function ask(scene: Phaser.Scene, s: SpaceSave, header: string, result: { right: string; wrong: string; go: string }, done: (correct: boolean) => void) {
  const engine = new QuestionEngine(s.learning, s.settings);
  const q = engine.next();
  new QuestionPanel(scene, q, {
    header,
    readAloud: s.settings.readAloud,
    result,
    done: (correct) => {
      engine.record(q, correct);
      saveSpace(s);
      done(correct);
    },
  });
}

/** A row of mineral icons with how many (for the HUD and for costs). */
export function mineralRow(scene: Phaser.Scene, x: number, y: number, counts: Record<string, number>, opts: { size?: number; have?: Record<string, number>; all?: boolean } = {}): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const size = opts.size ?? 16;
  let cx = 0;
  for (const m of MINERALS) {
    const n = counts[m.id] ?? 0;
    if (!n && !opts.all) continue;
    c.add(scene.add.image(cx + 9, 0, `min_${m.id}`).setScale(size / 10));
    const short = opts.have && (opts.have[m.id] ?? 0) < n;
    const label = txt(scene, cx + 20, 0, `${Math.floor(n)} ${m.symbol}`, size, short ? '#ff8a6b' : C.text).setOrigin(0, 0.5);
    c.add(label);
    cx += 30 + label.width;
  }
  c.setSize(cx, size);
  return c;
}

/** Can the cost be paid? Shows a red number for anything short. */
export function costRow(scene: Phaser.Scene, x: number, y: number, cost: Cost, s: SpaceSave): Phaser.GameObjects.Container {
  return mineralRow(scene, x, y, cost, { size: 15, have: s.minerals });
}

/** A big friendly card about a mineral: name, symbol, where the symbol comes from. */
export function mineralCard(scene: Phaser.Scene, id: string, onClose: () => void) {
  const m = mineral(id);
  const c = scene.add.container(0, 0).setDepth(3500).setScrollFactor(0);
  c.add(scene.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
  c.add(panel(scene, W / 2 - 300, 80, 600, 380, 0x1d1730, m.color));
  c.add(txt(scene, W / 2, 120, tr('New mineral found!'), 24, '#ffd24a').setOrigin(0.5));
  c.add(scene.add.image(W / 2 - 170, 230, `min_${m.id}`).setScale(8));
  // A periodic-table style box: symbol big, name under.
  const g = scene.add.graphics();
  g.fillStyle(0xf4f0e0, 1).fillRect(W / 2 + 60, 160, 150, 150);
  g.lineStyle(4, 0x1a1424, 1).strokeRect(W / 2 + 60, 160, 150, 150);
  c.add(g);
  c.add(txt(scene, W / 2 + 135, 222, m.symbol, 64, '#1a1424').setOrigin(0.5));
  c.add(txt(scene, W / 2 + 135, 284, tx(m.name), 20, '#1a1424').setOrigin(0.5));
  c.add(txt(scene, W / 2, 334, tx(m.why), 18, '#ffe9a0', { align: 'center', wordWrap: { width: 540 } }).setOrigin(0.5));
  c.add(txt(scene, W / 2, 372, tx(m.use), 16, C.text, { align: 'center', wordWrap: { width: 540 } }).setOrigin(0.5));
  c.add(button(scene, W / 2, 420, 180, 44, tr('Cool!'), () => {
    c.destroy();
    onClose();
  }, { size: 20, color: 0x2f9a4a }));
}

/**
 * An on-screen joystick (bottom left). `vec` is how far it is pushed, from
 * -1 to 1 on each axis.
 */
export class Stick {
  vec = { x: 0, y: 0 };
  private held: number | null = null;
  private zoneRef: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, cx = 100, cy = H - 110, R = 62) {
    scene.add.circle(cx, cy, R, 0x1d1730, 0.5).setStrokeStyle(4, 0xffffff, 0.45).setScrollFactor(0).setDepth(900);
    const knob = scene.add.circle(cx, cy, 26, 0x7fd3ff, 0.85).setStrokeStyle(3, 0xffffff).setScrollFactor(0).setDepth(901);
    const zone = scene.add.zone(cx, cy, R * 2 + 40, R * 2 + 40).setScrollFactor(0).setDepth(902).setInteractive();
    const move = (p: Phaser.Input.Pointer) => {
      if (this.held !== p.id) return;
      let x = p.x - cx;
      let y = p.y - cy;
      const d = Math.hypot(x, y);
      if (d > R) {
        x = (x / d) * R;
        y = (y / d) * R;
      }
      knob.setPosition(cx + x, cy + y);
      this.vec = d < 10 ? { x: 0, y: 0 } : { x: x / R, y: y / R };
    };
    const up = (p: Phaser.Input.Pointer) => {
      if (this.held !== p.id) return;
      this.held = null;
      this.vec = { x: 0, y: 0 };
      knob.setPosition(cx, cy);
    };
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.held = p.id;
      move(p);
    });
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', up);
    scene.input.on('pointerupoutside', up);
    this.zoneRef = zone;
  }

  /** Did this pointer start on the stick? (Then it isn't a tap on the world.) */
  owns(p: Phaser.Input.Pointer): boolean {
    return this.zoneRef.getBounds().contains(p.downX, p.downY);
  }

  get active(): boolean {
    return this.held !== null;
  }
}

/** Arrow keys and WASD as a direction (-1..1). */
export function keyVector(keys: Record<string, Phaser.Input.Keyboard.Key> | undefined): { x: number; y: number } {
  if (!keys) return { x: 0, y: 0 };
  const x = (keys.RIGHT.isDown || keys.D.isDown ? 1 : 0) - (keys.LEFT.isDown || keys.A.isDown ? 1 : 0);
  const y = (keys.DOWN.isDown || keys.S.isDown ? 1 : 0) - (keys.UP.isDown || keys.W.isDown ? 1 : 0);
  const d = Math.hypot(x, y) || 1;
  return { x: x / d, y: y / d };
}

/** Short toast-like message in the middle of the screen. */
export function say(scene: Phaser.Scene, msg: string, color = C.text, y = H / 2 - 120) {
  const t = txt(scene, W / 2, y, msg, 24, color, { align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5).setDepth(5000).setScrollFactor(0);
  t.setStroke('#120a1c', 6);
  scene.tweens.add({ targets: t, y: y - 40, alpha: 0, delay: 1400, duration: 600, onComplete: () => t.destroy() });
}
