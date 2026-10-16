import Phaser from 'phaser';
import { cycleSoundMode, sfx, soundModeLabel } from '../audio/audio';
import { LANGS, fmtNum, getLang, setLang, tr } from '../i18n';

export const W = 960;
export const H = 540;

export const C = {
  bg: 0x14101e,
  panel: 0x231c33,
  panelLight: 0x2f2645,
  border: 0x5b4a82,
  gold: 0xffd24a,
  text: '#f2ecff',
  dim: '#a99cc8',
  good: '#5ef07a',
  bad: '#ff6b6b',
  hp: 0xe0404a,
  mp: 0x3f7cf0,
  xp: 0xb26bff,
};

export const FONT = '"Trebuchet MS", "Segoe UI", Roboto, Verdana, sans-serif';

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 20,
  color = C.text,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, s, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      stroke: '#0b0812',
      strokeThickness: Math.max(2, Math.round(size / 7)),
      ...style,
    })
    .setResolution(2);
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = C.panel, border = C.border) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 3, y + 4, w, h, 12);
  g.fillStyle(fill, 0.97).fillRoundedRect(x, y, w, h, 12);
  g.lineStyle(3, border, 1).strokeRoundedRect(x, y, w, h, 12);
  return g;
}

export interface Button extends Phaser.GameObjects.Container {
  setEnabled(on: boolean): Button;
  label: Phaser.GameObjects.Text;
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: { color?: number; size?: number; textColor?: string } = {},
): Button {
  const color = opts.color ?? 0x4b3a78;
  const c = scene.add.container(x, y) as Button;
  const g = scene.add.graphics();
  const draw = (fill: number, alpha = 1) => {
    g.clear();
    g.fillStyle(0x000000, 0.4).fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 10);
    g.fillStyle(fill, alpha).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.fillStyle(0xffffff, 0.12 * alpha).fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h / 2 - 3, 8);
    g.lineStyle(2, 0xffffff, 0.25 * alpha).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
  };
  draw(color);
  const t = txt(scene, 0, 0, label, opts.size ?? 22, opts.textColor ?? C.text).setOrigin(0.5);
  t.setWordWrapWidth(w - 12);
  t.setAlign('center');
  c.add([g, t]);
  c.label = t;
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  let enabled = true;
  c.on('pointerdown', () => enabled && c.setScale(0.95));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => {
    c.setScale(1);
    if (enabled) {
      sfx('click');
      onClick();
    }
  });
  c.setEnabled = (on: boolean) => {
    enabled = on;
    draw(on ? color : 0x3a3448, on ? 1 : 0.8);
    t.setAlpha(on ? 1 : 0.5);
    return c;
  };
  return c;
}

export class Bar {
  private g: Phaser.GameObjects.Graphics;
  private label?: Phaser.GameObjects.Text;
  private shown = 1;

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: number,
    private w: number,
    private h: number,
    private color: number,
    withLabel = true,
  ) {
    this.g = scene.add.graphics();
    if (withLabel) this.label = txt(scene, x + w / 2, y + h / 2, '', Math.max(12, h - 4)).setOrigin(0.5);
  }

  set(value: number, max: number, animate = true) {
    const target = max > 0 ? Phaser.Math.Clamp(value / max, 0, 1) : 0;
    this.label?.setText(`${fmtNum(Math.max(0, Math.round(value)))} / ${fmtNum(Math.round(max))}`);
    if (!animate) {
      this.shown = target;
      this.draw();
      return;
    }
    this.scene.tweens.addCounter({
      from: this.shown,
      to: target,
      duration: 350,
      onUpdate: (tw) => {
        this.shown = tw.getValue() ?? target;
        this.draw();
      },
    });
  }

  private draw() {
    const { g, x, y, w, h } = this;
    g.clear();
    g.fillStyle(0x0b0812, 0.9).fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 5);
    g.fillStyle(0x3a2f50, 1).fillRoundedRect(x, y, w, h, 4);
    if (this.shown > 0) {
      g.fillStyle(this.color, 1).fillRoundedRect(x, y, Math.max(6, w * this.shown), h, 4);
      g.fillStyle(0xffffff, 0.22).fillRect(x + 2, y + 2, Math.max(2, w * this.shown - 4), h / 3);
    }
  }

  pin() {
    this.g.setScrollFactor(0);
    this.label?.setScrollFactor(0);
    return this;
  }

  setDepth(d: number) {
    this.g.setDepth(d);
    this.label?.setDepth(d + 1);
    return this;
  }

  destroy() {
    this.g.destroy();
    this.label?.destroy();
  }
}

/** Quick floating message in the middle of the screen. */
export function toast(scene: Phaser.Scene, message: string, color = C.text) {
  const t = txt(scene, W / 2, H / 2 - 120, message, 26, color).setOrigin(0.5).setDepth(5000).setScrollFactor(0);
  scene.tweens.add({ targets: t, y: t.y - 40, alpha: 0, delay: 1100, duration: 600, onComplete: () => t.destroy() });
}

/** Pixel sprite scaled up, keeping crisp edges. */
export function sprite(scene: Phaser.Scene, x: number, y: number, key: string, scale = 4) {
  return scene.add.image(x, y, key).setScale(scale);
}

/** Button that cycles Sound ON -> Music OFF -> Sound OFF. */
export function soundButton(scene: Phaser.Scene, x: number, y: number, w = 120, h = 50): Button {
  const b = button(scene, x, y, w, h, soundModeLabel(), () => b.label.setText(soundModeLabel(cycleSoundMode())), { size: 15, color: 0x2e4a5a });
  return b;
}

/** "Language: English" / "Langue : Français" toggle. `onChange` re-renders the screen. */
export function langButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onChange: () => void): Button {
  const label = tr('Language: {lang}', { lang: LANGS.find((l) => l.id === getLang())!.label });
  return button(scene, x, y, w, h, label, () => {
    setLang(getLang() === 'fr' ? 'en' : 'fr');
    onChange();
  }, { size: 15, color: 0x2e5a7a });
}
