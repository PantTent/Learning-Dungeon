import Phaser from 'phaser';
import { CLASSES, type ClassDef } from '../data/classes';
import { WEAPON_NAMES } from './shared';
import { newProfile, saveProfile, session } from '../state/profile';
import { C, W, button, panel, sprite, txt } from '../ui/widgets';
import { menuBackground } from './TitleScene';

const NAMES = ['Max', 'Nova', 'Rex', 'Luna', 'Finn', 'Zara', 'Leo', 'Ivy', 'Kai', 'Milo', 'Ash', 'Sky'];

export class CreateScene extends Phaser.Scene {
  private selected: ClassDef = CLASSES[0];
  private detail?: Phaser.GameObjects.Container;
  private cards: Phaser.GameObjects.Graphics[] = [];
  private nameInput?: HTMLInputElement;

  constructor() {
    super('Create');
  }

  create() {
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

    // Name entry (a real text box so the phone keyboard pops up).
    txt(this, 40, 450, 'Hero name:', 22);
    const dom = this.add.dom(330, 465).createFromHTML(
      `<input type="text" maxlength="12" value="${NAMES[Math.floor(Math.random() * NAMES.length)]}"
        style="width:200px;font-size:24px;padding:8px 12px;border-radius:10px;border:3px solid #5b4a82;background:#0f0b1a;color:#fff;font-family:inherit;outline:none" />`,
    );
    this.nameInput = dom.node.querySelector('input') as HTMLInputElement;

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

  private start() {
    const name = (this.nameInput?.value ?? '').trim().slice(0, 12) || 'Hero';
    const p = newProfile(name, this.selected.id);
    saveProfile(p);
    session.profile = p;
    this.scene.start('Dungeon');
  }
}
