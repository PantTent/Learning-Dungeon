import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { tr } from '../i18n';
import { defaultGrade, gradeLabel, gradesFor, type Grade } from '../questions/curriculum';
import { ANIMALS, animal } from '../animal/data';
import { loadAnimals, newAnimalSave, saveAnimals } from '../animal/state';
import { grassTexture, tx } from '../animal/ui';
import { openKeyboard } from '../ui/keyboard';
import { C, H, W, button, langButton, panel, txt } from '../ui/widgets';

const NAMES = ['Mia', 'Leo', 'Ruby', 'Max', 'Coco', 'Finn', 'Luna', 'Ollie', 'Daisy', 'Milo', 'Pip', 'Zoe'];

/** Start of Animal Kingdom Quest: continue, or pick your animal. */
export class AnimalSetupScene extends Phaser.Scene {
  private hero = '';
  private grade: Grade = 2;
  private pick = 'cat';
  private layer?: Phaser.GameObjects.Container;

  constructor() {
    super('AnimalSetup');
  }

  create(data: { fresh?: boolean }) {
    if (!data.fresh && loadAnimals()) {
      this.scene.start('AnimalVillage');
      return;
    }
    playMusic('farm');
    this.add.tileSprite(0, 0, W, H, grassTexture(this, 'village')).setOrigin(0).setTileScale(3);
    this.hero ||= NAMES[Math.floor(Math.random() * NAMES.length)];
    this.grade = Math.min(defaultGrade(), 2) as Grade;
    langButton(this, 96, 30, 172, 40, () => this.scene.restart({ fresh: true }));
    const title = txt(this, W / 2, 30, tr('Animal Kingdom Quest'), 36, '#ffd24a').setOrigin(0.5);
    title.setStroke('#3a2200', 8);
    this.draw();
  }

  private draw() {
    this.layer?.destroy();
    const c = this.add.container(0, 0);
    this.layer = c;
    c.add(txt(this, W / 2, 66, tr('Which animal do you want to be?'), 20, '#ffffff').setOrigin(0.5).setStroke('#1a3a10', 5));
    const cw = 104;
    const x0 = W / 2 - (ANIMALS.length * cw + (ANIMALS.length - 1) * 8) / 2;
    ANIMALS.forEach((a, i) => {
      const x = x0 + i * (cw + 8);
      const on = this.pick === a.id;
      c.add(panel(this, x, 86, cw, 120, on ? 0x2f5a3a : 0x1d1730, on ? 0xffd24a : 0x3a3054));
      const img = this.add.image(x + cw / 2, 136, a.sprite).setScale(4.4);
      if (on) this.tweens.add({ targets: img, y: 130, duration: 400, yoyo: true, repeat: -1 });
      c.add(img);
      c.add(txt(this, x + cw / 2, 188, tx(a.name), 16, on ? '#ffd24a' : C.text).setOrigin(0.5));
      c.add(this.add.zone(x, 86, cw, 120).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.pick = a.id;
        this.draw();
      }));
    });
    // About the animal you picked.
    const a = animal(this.pick);
    c.add(panel(this, 40, 216, W - 80, 136, 0x1d1730, a.color));
    c.add(this.add.image(100, 284, a.sprite).setScale(5));
    c.add(txt(this, 160, 228, `${tx(a.name)}  ·  ${tr('Special skill: {skill}', { skill: tx(a.skillName) })}`, 20, '#ffd24a'));
    c.add(txt(this, 160, 258, tx(a.skillInfo), 15, C.text, { wordWrap: { width: W - 240 } }));
    c.add(txt(this, 160, 306, tr('Did you know? {fact}', { fact: tx(a.fact) }), 15, '#9ad0ff', { wordWrap: { width: W - 240 } }));

    c.add(txt(this, 60, 392, tr('Your name:'), 20).setOrigin(0, 0.5).setStroke('#1a3a10', 4));
    const box = this.add.graphics();
    box.fillStyle(0x0f0b1a, 1).fillRoundedRect(190, 368, 240, 48, 10);
    box.lineStyle(3, 0x7fd3ff, 1).strokeRoundedRect(190, 368, 240, 48, 10);
    c.add(box);
    c.add(txt(this, 204, 392, this.hero, 22).setOrigin(0, 0.5));
    c.add(this.add.zone(190, 368, 240, 48).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () =>
      openKeyboard(this, tr("What's your name?"), this.hero, true, (v) => {
        this.hero = v.trim().slice(0, 12) || this.hero;
        this.draw();
      }, NAMES),
    ));
    c.add(txt(this, 470, 392, tr('Grade:'), 20).setOrigin(0, 0.5).setStroke('#1a3a10', 4));
    gradesFor().forEach((g, i) =>
      c.add(button(this, 566 + i * 46, 392, 40, 44, gradeLabel(g), () => {
        this.grade = g;
        this.draw();
      }, { size: 20, color: g === this.grade ? 0x2f9a4a : 0x4b3a78 })),
    );
    c.add(button(this, 130, H - 50, 180, 52, tr('Back'), () => this.scene.start('Hub'), { size: 20, color: 0x3a3450 }));
    c.add(button(this, W - 180, H - 56, 280, 64, tr("Let's go!"), () => {
      saveAnimals(newAnimalSave(this.hero, this.pick, this.grade));
      this.scene.start('AnimalVillage', { fresh: true });
    }, { size: 26, color: 0x2f9a4a }));
  }
}
