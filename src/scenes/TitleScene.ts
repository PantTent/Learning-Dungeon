import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { AREAS } from '../data/areas';
import { getClass } from '../data/classes';
import { setLang, tr } from '../i18n';
import { deleteProfile, loadProfiles, session, type Profile } from '../state/profile';
import { C, H, W, button, langButton, unitsButton, panel, soundButton, sprite, txt } from '../ui/widgets';
import { parentGate } from '../ui/parentGate';

export const MAX_PROFILES = 3;

/** Shared animated cave background used by menu screens. */
export function menuBackground(scene: Phaser.Scene) {
  scene.cameras.main.setBackgroundColor(C.bg);
  const g = scene.add.graphics();
  for (let i = 0; i < 18; i++) {
    g.fillStyle(0x221a33, 1).fillRect(i * 56, 0, 52, 24 + ((i * 37) % 50));
    g.fillStyle(0x1c1529, 1).fillRect(i * 56 + 20, H - 30 - ((i * 23) % 40), 44, 80);
  }
  for (let i = 0; i < 40; i++) {
    const d = scene.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 'dot').setTint(0x7fffb0).setAlpha(0.25).setScale(0.4);
    scene.tweens.add({
      targets: d,
      y: d.y - Phaser.Math.Between(30, 90),
      alpha: { from: 0.05, to: 0.45 },
      duration: Phaser.Math.Between(2500, 5000),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 2000),
    });
  }
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    playMusic('title');
    menuBackground(this);
    soundButton(this, W - 76, 30, 130, 40);
    langButton(this, 96, 30, 172, 40, () => this.scene.restart());
    unitsButton(this, 96, 76, 172, 36);
    const title = txt(this, W / 2, 62, 'LEARNING DUNGEON', 56, '#ffd24a').setOrigin(0.5);
    title.setStroke('#5a2a00', 10);
    this.tweens.add({ targets: title, y: 70, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    txt(this, W / 2, 118, tr('Answer questions. Defeat monsters. Grab loot!'), 20, C.dim).setOrigin(0.5);

    const profiles = loadProfiles().sort((a, b) => b.lastPlayed - a.lastPlayed);
    const slotW = 260;
    const gap = 26;
    const x0 = W / 2 - (MAX_PROFILES * slotW + (MAX_PROFILES - 1) * gap) / 2;
    for (let i = 0; i < MAX_PROFILES; i++) {
      const x = x0 + i * (slotW + gap);
      const p = profiles[i];
      if (p) this.profileCard(x, 160, slotW, p);
      else this.emptyCard(x, 160, slotW);
    }

    // Parents: grown-ups only, so kids don't wander in by accident.
    button(this, W - 110, H - 40, 190, 50, tr('Parents'), () => parentGate(this, () => this.scene.start('Parent')), { size: 18, color: 0x3a3450 });
    button(this, 96, H - 40, 160, 50, tr('All games'), () => this.scene.start('Hub'), { size: 18, color: 0x2e4a5a });

    txt(this, W / 2, H - 26, tr('v0.1 - Area 1: {area}', { area: tr(AREAS[0].name) }), 14, C.dim).setOrigin(0.5);
  }

  private profileCard(x: number, y: number, w: number, p: Profile) {
    const cls = getClass(p.classId);
    panel(this, x, y, w, 300, C.panel, cls.color);
    const s = sprite(this, x + w / 2, y + 90, cls.sprite, 6);
    this.tweens.add({ targets: s, y: s.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    txt(this, x + w / 2, y + 160, p.name, 28).setOrigin(0.5);
    txt(this, x + w / 2, y + 194, tr('Level {n} {cls}', { n: p.level, cls: tr(cls.name) }), 18, C.dim).setOrigin(0.5);
    const tag = this.add.graphics();
    tag.fillStyle(0x0b0812, 0.9).fillRoundedRect(x + 10, y + 10, 44, 28, 8);
    tag.lineStyle(2, 0x7fd3ff, 1).strokeRoundedRect(x + 10, y + 10, 44, 28, 8);
    txt(this, x + 32, y + 24, p.settings.lang === 'fr' ? 'FR' : 'EN', 15, '#7fd3ff').setOrigin(0.5);
    button(this, x + w / 2, y + 250, w - 40, 56, tr('Play'), () => {
      // Each hero plays in their own language.
      setLang(p.settings.lang);
      session.profile = p;
      this.scene.start('Practice');
    }, { color: 0x2f9a4a, size: 26 });
    button(this, x + w - 46, y + 24, 76, 32, tr('Delete'), () => this.confirmDelete(p), { size: 14, color: 0x8a3a3a });
  }

  private emptyCard(x: number, y: number, w: number) {
    panel(this, x, y, w, 300, 0x1a1526, 0x3a3054);
    txt(this, x + w / 2, y + 110, '+', 72, C.dim).setOrigin(0.5);
    button(this, x + w / 2, y + 250, w - 40, 56, tr('New Hero'), () => this.scene.start('Create'), { size: 24 });
  }

  private confirmDelete(p: Profile) {
    const c = this.add.container(0, 0).setDepth(100);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.7).setOrigin(0).setInteractive());
    c.add(panel(this, W / 2 - 260, H / 2 - 110, 520, 220, C.panel, 0xff6b6b));
    c.add(txt(this, W / 2, H / 2 - 60, tr('Delete {name} forever?', { name: p.name }), 28).setOrigin(0.5));
    c.add(button(this, W / 2 - 110, H / 2 + 40, 180, 60, tr('Delete'), () => {
      deleteProfile(p.id);
      this.scene.restart();
    }, { color: 0xa83a3a }));
    c.add(button(this, W / 2 + 110, H / 2 + 40, 180, 60, tr('Keep'), () => c.destroy()));
  }
}
