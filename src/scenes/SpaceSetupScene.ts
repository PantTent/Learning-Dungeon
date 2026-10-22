import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { tr } from '../i18n';
import { defaultGrade, gradeLabel, gradesFor, type Grade } from '../questions/curriculum';
import { planet, STARTS } from '../space/data';
import { planetTexture, starTexture } from '../space/draw';
import { loadSpace, newSpace, saveSpace } from '../space/state';
import { tempText, tx } from '../space/ui';
import { openKeyboard } from '../ui/keyboard';
import { C, H, W, button, langButton, panel, txt, type Button } from '../ui/widgets';

const NAMES = ['Nova', 'Orion', 'Luna', 'Vega', 'Rex', 'Zara', 'Leo', 'Skye', 'Kai', 'Milo', 'Stella', 'Max'];

/** Space background shared by the Learning Space screens. */
export function spaceBackground(scene: Phaser.Scene) {
  scene.cameras.main.setBackgroundColor(0x05040c);
  scene.add.tileSprite(0, 0, W, H, starTexture(scene)).setOrigin(0).setTileScale(3).setScrollFactor(0);
}

/** Start of Learning Space: go to your base, or pick a planet to start on. */
export class SpaceSetupScene extends Phaser.Scene {
  private commander = '';
  private grade: Grade = 4;
  private pick = 'earth';
  private layer?: Phaser.GameObjects.Container;
  private gradeButtons: Button[] = [];

  constructor() {
    super('SpaceSetup');
  }

  create(data: { fresh?: boolean }) {
    if (!data.fresh && loadSpace()) {
      this.scene.start('SpaceBase');
      return;
    }
    playMusic('title');
    spaceBackground(this);
    this.commander ||= NAMES[Math.floor(Math.random() * NAMES.length)];
    this.grade = defaultGrade();
    langButton(this, 96, 30, 172, 40, () => this.scene.restart({ fresh: true }));
    const title = txt(this, W / 2, 34, tr('Learning Space'), 40, '#7fd3ff').setOrigin(0.5);
    title.setStroke('#0a1440', 8);
    txt(this, W / 2, 72, tr('Pick the planet where your space base starts!'), 18, C.text).setOrigin(0.5);
    this.draw();
  }

  private draw() {
    this.layer?.destroy();
    const c = this.add.container(0, 0);
    this.layer = c;
    const cw = 218;
    const x0 = W / 2 - (STARTS.length * cw + (STARTS.length - 1) * 12) / 2;
    STARTS.forEach((st, i) => {
      const p = planet(st.planet);
      const x = x0 + i * (cw + 12);
      const on = this.pick === st.planet;
      c.add(panel(this, x, 94, cw, 268, on ? 0x1f2a48 : 0x14101e, on ? 0x7fd3ff : 0x3a3054));
      const img = this.add.image(x + cw / 2, 152, planetTexture(this, st.planet, 32)).setScale(2.4);
      c.add(img);
      c.add(txt(this, x + cw / 2, 208, tx(p.name), 22, '#ffd24a').setOrigin(0.5));
      c.add(txt(this, x + cw / 2, 232, tempText(p.tempC), 14, p.tempC > 100 ? '#ff9a6b' : p.tempC < 0 ? '#9ad0ff' : C.good).setOrigin(0.5));
      c.add(this.add.image(x + 40, 274, st.sprite).setScale(2.4));
      c.add(txt(this, x + 74, 266, tx(st.ship), 15, C.text).setOrigin(0, 0.5));
      c.add(txt(this, x + 74, 286, tx(st.skill), 14, '#c98aff').setOrigin(0, 0.5));
      c.add(txt(this, x + 12, 306, tx(st.skillInfo), 12, C.dim, { wordWrap: { width: cw - 24 } }));
      const z = this.add.zone(x, 94, cw, 268).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        this.pick = st.planet;
        this.draw();
      });
      c.add(z);
      this.tweens.add({ targets: img, angle: 360, duration: 60000, repeat: -1 });
    });

    c.add(txt(this, 70, 392, tr('Commander:'), 20).setOrigin(0, 0.5));
    const box = this.add.graphics();
    box.fillStyle(0x0f0b1a, 1).fillRoundedRect(200, 368, 250, 48, 10);
    box.lineStyle(3, 0x7fd3ff, 1).strokeRoundedRect(200, 368, 250, 48, 10);
    c.add(box);
    c.add(txt(this, 214, 392, this.commander, 22).setOrigin(0, 0.5));
    c.add(this.add.zone(200, 368, 250, 48).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () =>
      openKeyboard(this, tr("What's your name, commander?"), this.commander, true, (v) => {
        this.commander = v.trim().slice(0, 12) || this.commander;
        this.draw();
      }, NAMES),
    ));
    c.add(txt(this, 490, 392, tr('Grade:'), 20).setOrigin(0, 0.5));
    this.gradeButtons = gradesFor().map((g, i) =>
      button(this, 590 + i * 46, 392, 40, 44, gradeLabel(g), () => {
        this.grade = g;
        this.draw();
      }, { size: 20, color: g === this.grade ? 0x2f9a4a : 0x4b3a78 }),
    );
    this.gradeButtons.forEach((b) => c.add(b));
    c.add(button(this, 140, H - 50, 180, 52, tr('Back'), () => this.scene.start('Hub'), { size: 20, color: 0x3a3450 }));
    c.add(button(this, W - 190, H - 56, 300, 64, tr('Blast off!'), () => this.start(), { size: 26, color: 0x2f9a4a }));
  }

  private start() {
    saveSpace(newSpace(this.commander, this.grade, this.pick));
    this.scene.start('SpaceBase', { arrived: true });
  }
}
