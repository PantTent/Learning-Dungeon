import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { CLASSES, type ClassDef } from '../data/classes';
import { WEAPON_NAMES } from './shared';
import { newProfile, saveProfile, session } from '../state/profile';
import { C, W, button, panel, sprite, txt, type Button } from '../ui/widgets';
import { GRADES, type Grade } from '../questions/curriculum';
import { menuBackground } from './TitleScene';

const NAMES = ['Max', 'Nova', 'Rex', 'Luna', 'Finn', 'Zara', 'Leo', 'Ivy', 'Kai', 'Milo', 'Ash', 'Sky'];

export class CreateScene extends Phaser.Scene {
  private selected: ClassDef = CLASSES[0];
  private detail?: Phaser.GameObjects.Container;
  private cards: Phaser.GameObjects.Graphics[] = [];
  private heroName = '';
  private nameText?: Phaser.GameObjects.Text;
  private grade: Grade = 4;
  private gradeButtons: Button[] = [];

  constructor() {
    super('Create');
  }

  create() {
    playMusic('title');
    this.cards = [];
    menuBackground(this);
    txt(this, W / 2, 30, 'Choose your hero!', 34, '#ffd24a').setOrigin(0.5);

    const cw = 124;
    const ch = 150;
    const gap = 10;
    const x0 = W / 2 - (CLASSES.length * cw + (CLASSES.length - 1) * gap) / 2;
    CLASSES.forEach((cls, i) => {
      const x = x0 + i * (cw + gap);
      const y = 62;
      const g = this.add.graphics();
      this.cards.push(g);
      const s = sprite(this, x + cw / 2, y + 62, cls.sprite, 5);
      this.tweens.add({ targets: s, y: s.y - 4, duration: 700 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      txt(this, x + cw / 2, y + 120, cls.name, cls.name.length > 9 ? 15 : 18).setOrigin(0.5);
      const zone = this.add.zone(x, y, cw, ch).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.select(cls));
    });

    // Name entry: our own on-screen keyboard, so it works on every device.
    txt(this, 40, 450, 'Hero name:', 22);
    this.heroName = NAMES[Math.floor(Math.random() * NAMES.length)];
    const box = this.add.graphics();
    box.fillStyle(0x0f0b1a, 1).fillRoundedRect(210, 440, 236, 50, 10);
    box.lineStyle(3, 0x7fd3ff, 1).strokeRoundedRect(210, 440, 236, 50, 10);
    this.nameText = txt(this, 224, 465, this.heroName, 24).setOrigin(0, 0.5);
    txt(this, 432, 465, 'Edit', 15, '#7fd3ff').setOrigin(1, 0.5);
    this.add.zone(210, 440, 236, 50).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => this.openKeyboard());

    // School grade picks how hard the questions are.
    txt(this, 470, 438, 'Grade:', 20);
    this.gradeButtons = GRADES.map((g, i) =>
      button(this, 494 + i * 62, 486, 54, 46, `${g}`, () => this.setGrade(g), { size: 22 }),
    );
    this.setGrade(this.grade);

    button(this, 120, 510, 160, 46, 'Back', () => this.scene.start('Title'), { size: 20, color: 0x3a3450 });
    button(this, W - 170, 490, 280, 70, 'Start Adventure!', () => this.start(), { color: 0x2f9a4a, size: 26 });

    this.select(CLASSES[0]);
  }

  private select(cls: ClassDef) {
    this.selected = cls;
    const cw = 124;
    const ch = 150;
    const gap = 10;
    const x0 = W / 2 - (CLASSES.length * cw + (CLASSES.length - 1) * gap) / 2;
    CLASSES.forEach((c, i) => {
      const g = this.cards[i];
      g.clear();
      const x = x0 + i * (cw + gap);
      const on = c === cls;
      g.fillStyle(on ? 0x3a2f5a : C.panel, 1).fillRoundedRect(x, 62, cw, ch, 10);
      g.lineStyle(on ? 4 : 2, on ? c.color : C.border, 1).strokeRoundedRect(x, 62, cw, ch, 10);
    });

    this.detail?.destroy();
    const d = this.add.container(0, 0);
    this.detail = d;
    d.add(panel(this, 40, 228, W - 80, 196, C.panel, cls.color));
    d.add(txt(this, 64, 242, `${cls.name}  -  ${cls.role}`, 26, '#ffd24a'));
    d.add(txt(this, 64, 280, cls.blurb, 19, C.text, { wordWrap: { width: 520 } }));
    const primaryName = { str: 'Strength', int: 'Intellect', agi: 'Dexterity' }[cls.primary];
    d.add(txt(this, 64, 320, `Main stat: ${primaryName}`, 17, C.dim));
    d.add(
      txt(this, 64, 344, `Weapons: ${cls.weapons.map((w) => WEAPON_NAMES[w]).join(', ')}${cls.offhands.length ? `  |  Off-hand: ${cls.offhands.map((o) => WEAPON_NAMES[o]).join(', ')}` : ''}`, 16, C.dim, {
        wordWrap: { width: 560 },
      }),
    );
    // Stat bars
    const stats: [string, number][] = [
      ['Health', cls.base.sta / 12],
      ['Melee', cls.base.str / 12],
      ['Magic', cls.base.int / 12],
      ['Dexterity', cls.base.agi / 12],
    ];
    stats.forEach(([n, v], i) => {
      const y = 250 + i * 28;
      d.add(txt(this, 640, y, n, 16, C.dim));
      const g = this.add.graphics();
      g.fillStyle(0x0b0812, 1).fillRoundedRect(732, y + 3, 170, 14, 4);
      g.fillStyle(cls.color, 1).fillRoundedRect(732, y + 3, 170 * Math.min(1, v), 14, 4);
      d.add(g);
    });
    d.add(txt(this, 640, 368, 'Skills:', 16, C.dim));
    d.add(txt(this, 640, 390, cls.skills.map((s) => s.name).join(' / '), 15, C.text, { wordWrap: { width: 280 } }));
  }

  private setGrade(g: Grade) {
    this.grade = g;
    GRADES.forEach((x, i) => {
      const b = this.gradeButtons[i];
      const label = b.label.text;
      b.destroy();
      this.gradeButtons[i] = button(this, 494 + i * 62, 486, 54, 46, label, () => this.setGrade(x), { size: 22, color: x === g ? 0x2f9a4a : 0x4b3a78 });
    });
  }

  /** Big friendly keyboard for typing the hero's name. */
  private openKeyboard() {
    const c = this.add.container(0, 0).setDepth(500);
    c.add(this.add.rectangle(0, 0, W, 540, 0x000000, 0.75).setOrigin(0).setInteractive());
    c.add(panel(this, 40, 20, W - 80, 500, 0x1d1730, 0x7fd3ff));
    c.add(txt(this, W / 2, 50, "What's your hero's name?", 26, '#ffd24a').setOrigin(0.5));
    const g = this.add.graphics();
    g.fillStyle(0x0f0b1a, 1).fillRoundedRect(W / 2 - 200, 78, 400, 58, 10);
    g.lineStyle(3, 0x7fd3ff, 1).strokeRoundedRect(W / 2 - 200, 78, 400, 58, 10);
    c.add(g);
    const shown = txt(this, W / 2, 107, '', 32).setOrigin(0.5);
    c.add(shown);
    let name = this.heroName;
    const refresh = () => shown.setText(name.length ? name : ' ');
    refresh();
    const type = (k: string) => {
      if (k === 'DEL') name = name.slice(0, -1);
      else if (k === 'SPACE') {
        if (name.length && name.length < 12 && !name.endsWith(' ')) name += ' ';
      } else if (name.length < 12) name += name.length === 0 || name.endsWith(' ') ? k.toUpperCase() : k.toLowerCase();
      refresh();
    };
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    const kw = 70;
    const kh = 60;
    rows.forEach((row, r) => {
      const x0 = W / 2 - (row.length * (kw + 8)) / 2 + kw / 2;
      [...row].forEach((ch, i) => c.add(button(this, x0 + i * (kw + 8), 182 + r * (kh + 10), kw, kh, ch, () => type(ch), { size: 26 })));
    });
    c.add(button(this, W / 2 + 4 * 78 + 30, 182 + 2 * 70, 116, kh, 'Delete', () => type('DEL'), { size: 20, color: 0x8a3a3a }));
    c.add(button(this, W / 2 - 4 * 78 - 30, 182 + 2 * 70, 116, kh, 'Space', () => type('SPACE'), { size: 20, color: 0x3a3450 }));
    c.add(button(this, W / 2 - 180, 460, 200, 60, 'Random name', () => {
      name = NAMES[Math.floor(Math.random() * NAMES.length)];
      refresh();
    }, { size: 20, color: 0x2e5a7a }));
    const onKey = (e: KeyboardEvent) => {
      if (/^[a-zA-Z]$/.test(e.key)) type(e.key);
      else if (e.key === 'Backspace') type('DEL');
      else if (e.key === ' ') type('SPACE');
      else if (e.key === 'Enter') done();
    };
    const done = () => {
      this.input.keyboard?.off('keydown', onKey);
      this.heroName = name.trim() || this.heroName;
      this.nameText?.setText(this.heroName);
      c.destroy();
    };
    this.input.keyboard?.on('keydown', onKey);
    c.add(button(this, W / 2 + 140, 460, 220, 60, 'Done', done, { size: 24, color: 0x2f9a4a }));
  }

  private start() {
    const name = this.heroName.trim().slice(0, 12) || 'Hero';
    const p = newProfile(name, this.selected.id, this.grade);
    saveProfile(p);
    session.profile = p;
    this.scene.start('Practice');
  }
}
