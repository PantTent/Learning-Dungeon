import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { CLASSES, type ClassDef } from '../data/classes';
import { WEAPON_NAMES } from './shared';
import { isDevCode, makeDeveloper, newProfile, saveProfile, session } from '../state/profile';
import { C, W, button, langButton, panel, sprite, toast, txt, type Button } from '../ui/widgets';
import { defaultGrade, gradeLabel, gradesFor, type Grade } from '../questions/curriculum';
import { getLang, tr } from '../i18n';
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
  private devMode = false;
  private codeButton?: Button;

  constructor() {
    super('Create');
  }

  create(data: { keep?: boolean } = {}) {
    playMusic('title');
    this.cards = [];
    this.gradeButtons = [];
    // A new language means new grades (Quebec 1re-3e vs. Massachusetts 3-5).
    this.grade = defaultGrade();
    menuBackground(this);
    txt(this, W / 2, 30, tr('Choose your hero!'), 34, '#ffd24a').setOrigin(0.5);
    langButton(this, 96, 30, 172, 38, () => this.scene.restart({ keep: true }));

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
      const nm = tr(cls.name);
      txt(this, x + cw / 2, y + 120, nm, nm.length > 11 ? 14 : nm.length > 9 ? 15 : 18).setOrigin(0.5);
      const zone = this.add.zone(x, y, cw, ch).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.select(cls));
    });

    // Name entry: our own on-screen keyboard, so it works on every device.
    txt(this, 40, 450, tr('Hero name:'), 22);
    if (!data.keep || !this.heroName) this.heroName = NAMES[Math.floor(Math.random() * NAMES.length)];
    const box = this.add.graphics();
    box.fillStyle(0x0f0b1a, 1).fillRoundedRect(210, 440, 236, 50, 10);
    box.lineStyle(3, 0x7fd3ff, 1).strokeRoundedRect(210, 440, 236, 50, 10);
    this.nameText = txt(this, 224, 465, this.heroName, 24).setOrigin(0, 0.5);
    txt(this, 432, 465, tr('Edit'), 15, '#7fd3ff').setOrigin(1, 0.5);
    this.add.zone(210, 440, 236, 50).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () =>
      this.openKeyboard(tr("What's your hero's name?"), this.heroName, true, (name) => {
        this.heroName = name.trim() || this.heroName;
        this.nameText?.setText(this.heroName);
      }),
    );

    // Secret code box (for the game's developer).
    if (!data.keep) this.devMode = false;
    const codeLabel = () => (this.devMode ? tr('DEV ON') : tr('Code'));
    this.codeButton = button(this, W - 60, 30, 96, 36, codeLabel(), () =>
      this.openKeyboard(tr('Type a secret code'), '', false, (code) => {
        if (!code.trim()) return;
        this.devMode = isDevCode(code);
        this.codeButton?.label.setText(codeLabel());
        toast(this, this.devMode ? tr('Developer mode ON! Everything is unlocked.') : tr('That code does not work.'), this.devMode ? C.good : C.bad);
      }),
    { size: 16, color: 0x3a3450 });

    // School grade picks how hard the questions are.
    txt(this, 470, 438, tr('Grade:'), 20);
    this.gradeButtons = gradesFor().map((g, i) =>
      button(this, 494 + i * 62, 486, 54, 46, gradeLabel(g), () => this.setGrade(g), { size: 22 }),
    );
    this.setGrade(this.grade);

    button(this, 120, 510, 160, 46, tr('Back'), () => this.scene.start('Title'), { size: 20, color: 0x3a3450 });
    button(this, W - 170, 490, 280, 70, tr('Start Adventure!'), () => this.start(), { color: 0x2f9a4a, size: 26 });

    this.select(data.keep ? this.selected : CLASSES[0]);
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
    d.add(txt(this, 64, 242, `${tr(cls.name)}  -  ${tr(cls.role)}`, 26, '#ffd24a'));
    // Lines flow down so longer (French) blurbs never overlap.
    let ty = 280;
    const line = (t: Phaser.GameObjects.Text, gap = 6) => {
      d.add(t);
      ty += t.height + gap;
    };
    line(txt(this, 64, ty, tr(cls.blurb), 18, C.text, { wordWrap: { width: 540 } }), 8);
    const primaryName = { str: tr('Strength'), int: tr('Intellect'), agi: tr('Dexterity') }[cls.primary];
    line(txt(this, 64, ty, tr('Main stat: {stat}', { stat: primaryName }), 16, C.dim), 4);
    const weapons = tr('Weapons: {list}', { list: cls.weapons.map((w) => tr(WEAPON_NAMES[w])).join(', ') });
    const off = cls.offhands.length ? `  |  ${tr('Off-hand: {list}', { list: cls.offhands.map((o) => tr(WEAPON_NAMES[o])).join(', ') })}` : '';
    line(txt(this, 64, ty, weapons + off, 15, C.dim, { wordWrap: { width: 560 } }));
    // Stat bars
    const stats: [string, number][] = [
      [tr('Health'), cls.base.sta / 12],
      [tr('Melee'), cls.base.str / 12],
      [tr('Magic'), cls.base.int / 12],
      [tr('Dexterity'), cls.base.agi / 12],
    ];
    stats.forEach(([n, v], i) => {
      const y = 246 + i * 26;
      d.add(txt(this, 640, y, n, 16, C.dim));
      const g = this.add.graphics();
      g.fillStyle(0x0b0812, 1).fillRoundedRect(732, y + 3, 170, 14, 4);
      g.fillStyle(cls.color, 1).fillRoundedRect(732, y + 3, 170 * Math.min(1, v), 14, 4);
      d.add(g);
    });
    const sp = txt(this, 640, 352, tr('{n} spells, a new one every 2 levels:', { n: cls.skills.length }), 15, C.dim, { wordWrap: { width: 280 } });
    d.add(sp);
    const first = cls.skills.slice(0, 2).map((s) => tr(s.name)).join(', ');
    d.add(txt(this, 640, 352 + sp.height + 2, tr('{spells}, and more!', { spells: first }), 15, C.text, { wordWrap: { width: 280 } }));
  }

  private setGrade(g: Grade) {
    this.grade = g;
    gradesFor().forEach((x, i) => {
      const b = this.gradeButtons[i];
      const label = b.label.text;
      b.destroy();
      this.gradeButtons[i] = button(this, 494 + i * 62, 486, 54, 46, label, () => this.setGrade(x), { size: 22, color: x === g ? 0x2f9a4a : 0x4b3a78 });
    });
  }

  /** Big friendly on-screen keyboard (hero name or secret code). */
  private openKeyboard(title: string, initial: string, nameCase: boolean, onDone: (value: string) => void) {
    const c = this.add.container(0, 0).setDepth(500);
    c.add(this.add.rectangle(0, 0, W, 540, 0x000000, 0.75).setOrigin(0).setInteractive());
    c.add(panel(this, 40, 20, W - 80, 500, 0x1d1730, 0x7fd3ff));
    c.add(txt(this, W / 2, 50, title, 26, '#ffd24a').setOrigin(0.5));
    const g = this.add.graphics();
    g.fillStyle(0x0f0b1a, 1).fillRoundedRect(W / 2 - 200, 78, 400, 58, 10);
    g.lineStyle(3, 0x7fd3ff, 1).strokeRoundedRect(W / 2 - 200, 78, 400, 58, 10);
    c.add(g);
    const shown = txt(this, W / 2, 107, '', 32).setOrigin(0.5);
    c.add(shown);
    let name = initial;
    const refresh = () => shown.setText(name.length ? name : ' ');
    refresh();
    const type = (k: string) => {
      if (k === 'DEL') name = name.slice(0, -1);
      else if (k === 'SPACE') {
        if (name.length && name.length < 12 && !name.endsWith(' ')) name += ' ';
      } else if (name.length < 12) name += nameCase && (name.length === 0 || name.endsWith(' ')) ? k.toUpperCase() : k.toLowerCase();
      refresh();
    };
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    // French names often have accents (Léa, Zoé, François).
    if (nameCase && getLang() === 'fr') rows.push('ÉÈÊËÀÂÇÏÎÔ');
    const kw = 70;
    const kh = 60;
    rows.forEach((row, r) => {
      const x0 = W / 2 - (row.length * (kw + 8)) / 2 + kw / 2;
      [...row].forEach((ch, i) => c.add(button(this, x0 + i * (kw + 8), 182 + r * (kh + 10), kw, kh, ch, () => type(ch), { size: 26 })));
    });
    c.add(button(this, W / 2 + 4 * 78 + 30, 182 + 2 * 70, 116, kh, tr('Delete'), () => type('DEL'), { size: 20, color: 0x8a3a3a }));
    c.add(button(this, W / 2 - 4 * 78 - 30, 182 + 2 * 70, 116, kh, tr('Space'), () => type('SPACE'), { size: 20, color: 0x3a3450 }));
    if (nameCase) {
      c.add(button(this, W / 2 - 180, 460, 200, 60, tr('Random name'), () => {
        name = NAMES[Math.floor(Math.random() * NAMES.length)];
        refresh();
      }, { size: 20, color: 0x2e5a7a }));
    }
    const onKey = (e: KeyboardEvent) => {
      if (/^\p{L}$/u.test(e.key)) type(e.key);
      else if (e.key === 'Backspace') type('DEL');
      else if (e.key === ' ') type('SPACE');
      else if (e.key === 'Enter') done();
    };
    const done = () => {
      this.input.keyboard?.off('keydown', onKey);
      c.destroy();
      onDone(name);
    };
    this.input.keyboard?.on('keydown', onKey);
    c.add(button(this, W / 2 + 140, 460, 220, 60, tr('Done'), done, { size: 24, color: 0x2f9a4a }));
  }

  private start() {
    const name = this.heroName.trim().slice(0, 12) || tr('Hero');
    const p = newProfile(name, this.selected.id, this.grade);
    if (this.devMode) makeDeveloper(p);
    saveProfile(p);
    session.profile = p;
    this.scene.start('Practice');
  }
}
