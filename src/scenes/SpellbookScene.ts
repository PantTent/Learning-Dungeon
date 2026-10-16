import Phaser from 'phaser';
import { sfx } from '../audio/audio';
import { MAX_CHOSEN, chosenSpells } from '../data/spells';
import type { Fx } from '../data/classes';
import { classOf, current, saveProfile } from '../state/profile';
import { C, H, W, button, panel, toast, txt } from '../ui/widgets';

const FX_NAME: Record<Fx, string> = {
  slash: 'Melee', fire: 'Fire', frost: 'Ice', arcane: 'Arcane', arrow: 'Arrow', holy: 'Holy',
  shadow: 'Shadow', nature: 'Nature', fel: 'Fel fire', heal: 'Healing', lightning: 'Lightning',
};
const FX_COLOR: Record<Fx, number> = {
  slash: 0x6a6a7a, fire: 0xa8401a, frost: 0x2a6aa8, arcane: 0x7a3aa8, arrow: 0x6a5a2a, holy: 0xa88a1a,
  shadow: 0x4a2a7a, nature: 0x2f7a3a, fel: 0x2f8a2a, heal: 0x2a8a5a, lightning: 0x2a5ac0,
};

/** Pick which 3 spells to bring into battle. */
export class SpellbookScene extends Phaser.Scene {
  private onClose?: () => void;
  private layer?: Phaser.GameObjects.Container;

  constructor() {
    super('Spells');
  }

  create(data: { onClose?: () => void }) {
    this.onClose = data.onClose;
    this.add.rectangle(0, 0, W, H, 0, 0.75).setOrigin(0).setInteractive();
    this.draw();
  }

  private draw() {
    this.layer?.destroy();
    const p = current();
    const cls = classOf(p);
    const list = cls.skills;
    // Make the saved choice explicit (first time: the newest unlocked spells).
    p.spells = chosenSpells(list, p.level, p.spells).map((s) => s.id);
    const c = this.add.container(0, 0);
    this.layer = c;
    c.add(panel(this, 16, 12, W - 32, H - 24, 0x1d1730, cls.color));
    c.add(txt(this, 36, 22, `${cls.name} Spellbook`, 26, '#ffd24a'));
    c.add(txt(this, 36, 56, `Pick ${MAX_CHOSEN} spells to bring into battle. ${list[0].name} is always ready (free).`, 16, C.dim));
    c.add(button(this, W - 90, 40, 130, 46, 'Done', () => {
      saveProfile(p);
      this.scene.stop();
      this.onClose?.();
    }, { size: 20, color: 0x2f9a4a }));

    // The 3 battle slots
    for (let i = 0; i < MAX_CHOSEN; i++) {
      const sp = list.find((s) => s.id === p.spells![i]);
      const x = 36 + i * 300;
      const g = this.add.graphics();
      g.fillStyle(sp ? FX_COLOR[sp.fx] : 0x0f0b1a, 1).fillRoundedRect(x, 84, 284, 52, 8);
      g.lineStyle(3, 0xffd24a, sp ? 1 : 0.4).strokeRoundedRect(x, 84, 284, 52, 8);
      c.add(g);
      c.add(txt(this, x + 12, 90, sp ? sp.name : `Empty slot ${i + 1}`, 18, sp ? '#ffffff' : C.dim));
      if (sp) {
        c.add(txt(this, x + 12, 113, `${sp.mp} MP  -  tap to remove`, 13, '#ffe9a0'));
        c.add(this.add.zone(x, 84, 284, 52).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => {
          p.spells = p.spells!.filter((id) => id !== sp.id);
          sfx('click');
          this.draw();
        }));
      }
    }

    // All spells: unlocked ones can be added, locked ones show their level
    list.slice(1).forEach((sp, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 36 + col * 300;
      const y = 150 + row * 92;
      const unlocked = sp.unlock <= p.level;
      const picked = p.spells!.includes(sp.id);
      const g = this.add.graphics();
      g.fillStyle(unlocked ? FX_COLOR[sp.fx] : 0x241e30, unlocked ? 0.85 : 1).fillRoundedRect(x, y, 284, 84, 8);
      g.lineStyle(picked ? 4 : 2, picked ? 0xffd24a : 0x5b4a82, 1).strokeRoundedRect(x, y, 284, 84, 8);
      c.add(g);
      c.add(txt(this, x + 10, y + 6, `${picked ? '✔ ' : ''}${sp.name}`, 17, unlocked ? '#ffffff' : C.dim));
      c.add(txt(this, x + 274, y + 8, unlocked ? `${sp.mp} MP` : `Level ${sp.unlock}`, 14, unlocked ? '#ffe9a0' : '#ff9a9a').setOrigin(1, 0));
      c.add(txt(this, x + 10, y + 30, `${FX_NAME[sp.fx]}  -  ${sp.desc}`, 13, unlocked ? '#e8e0ff' : '#6a6080', { wordWrap: { width: 264 } }));
      if (!unlocked) return;
      c.add(this.add.zone(x, y, 284, 84).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (picked) p.spells = p.spells!.filter((id) => id !== sp.id);
        else if (p.spells!.length >= MAX_CHOSEN) return toast(this, 'All 3 slots are full. Tap a slot at the top to remove one.', C.bad);
        else p.spells = [...p.spells!, sp.id];
        sfx('equip');
        this.draw();
      }));
    });
  }
}
