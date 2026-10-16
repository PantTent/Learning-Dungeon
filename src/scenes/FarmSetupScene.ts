import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { newFarm, loadFarm, saveFarm } from '../farm/state';
import { tr } from '../i18n';
import { defaultGrade, gradeLabel, gradesFor, type Grade } from '../questions/curriculum';
import { openKeyboard } from '../ui/keyboard';
import { C, H, W, button, langButton, panel, sprite, txt, type Button } from '../ui/widgets';

const NAMES = ['Max', 'Nova', 'Rex', 'Luna', 'Finn', 'Zara', 'Leo', 'Ivy', 'Kai', 'Milo', 'Ash', 'Sky'];

/** Grass background shared by the farm screens. */
export function grassBackground(scene: Phaser.Scene, tex = 'tile_grass') {
  scene.cameras.main.setBackgroundColor(0x7ccb4c);
  scene.add.tileSprite(0, 0, W, H, tex).setOrigin(0).setTileScale(3);
}

/** Start of Learning Farm: go to the farm, or make a new one. */
export class FarmSetupScene extends Phaser.Scene {
  private farmer = '';
  private grade: Grade = 4;
  private gradeButtons: Button[] = [];

  constructor() {
    super('FarmSetup');
  }

  create(data: { fresh?: boolean }) {
    if (!data.fresh && loadFarm()) {
      this.scene.start('Farm');
      return;
    }
    playMusic('farm');
    grassBackground(this);
    this.farmer ||= NAMES[Math.floor(Math.random() * NAMES.length)];
    this.grade = defaultGrade();

    langButton(this, 96, 30, 172, 40, () => this.scene.restart({ fresh: true }));
    panel(this, 120, 60, W - 240, H - 100, 0x2a1d10, 0xffd24a);
    const title = txt(this, W / 2, 104, tr('Learning Farm'), 44, '#ffd24a').setOrigin(0.5);
    title.setStroke('#5a2a00', 8);
    txt(this, W / 2, 148, tr('Grow veggies, care for animals and build your farm!'), 18, C.text).setOrigin(0.5);
    sprite(this, W / 2 - 150, 220, 'farm_barn', 3);
    sprite(this, W / 2 + 10, 236, 'animal_horse', 4);
    sprite(this, W / 2 + 130, 240, 'crop_carrot', 4);

    txt(this, 180, 312, tr("Farmer's name:"), 22);
    const box = this.add.graphics();
    box.fillStyle(0x0f0b1a, 1).fillRoundedRect(400, 290, 300, 50, 10);
    box.lineStyle(3, 0x7fd3ff, 1).strokeRoundedRect(400, 290, 300, 50, 10);
    const name = txt(this, 414, 315, this.farmer, 24).setOrigin(0, 0.5);
    txt(this, 688, 315, tr('Edit'), 15, '#7fd3ff').setOrigin(1, 0.5);
    this.add.zone(400, 290, 300, 50).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () =>
      openKeyboard(this, tr("What's your name, farmer?"), this.farmer, true, (v) => {
        this.farmer = v.trim().slice(0, 12) || this.farmer;
        name.setText(this.farmer);
      }, NAMES),
    );

    txt(this, 180, 378, tr('Grade:'), 22);
    this.gradeButtons = [];
    this.drawGrades();

    button(this, 230, H - 70, 180, 54, tr('Back'), () => this.scene.start('Hub'), { size: 20, color: 0x3a3450 });
    button(this, W - 260, H - 70, 300, 64, tr('Start farming!'), () => this.start(), { size: 26, color: 0x2f9a4a });
  }

  private drawGrades() {
    this.gradeButtons.forEach((b) => b.destroy());
    this.gradeButtons = gradesFor().map((g, i) =>
      button(this, 430 + i * 74, 380, 64, 48, gradeLabel(g), () => {
        this.grade = g;
        this.drawGrades();
      }, { size: 20, color: g === this.grade ? 0x2f9a4a : 0x4b3a78 }),
    );
  }

  private start() {
    saveFarm(newFarm(this.farmer, this.grade));
    this.scene.start('Farm');
  }
}
