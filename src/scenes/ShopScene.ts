import Phaser from 'phaser';
import { sfx } from '../audio/audio';
import { openSellMenu } from '../ui/sellMenu';
import { AREAS, PLACES } from '../data/areas';
import { POTIONS, countPotions, type PotionDef } from '../data/potions';
import { current, saveProfile } from '../state/profile';
import { C, H, W, button, panel, toast, txt } from '../ui/widgets';

export class ShopScene extends Phaser.Scene {
  private onClose?: () => void;
  private layer?: Phaser.GameObjects.Container;

  constructor() {
    super('Shop');
  }

  create(data: { onClose?: () => void }) {
    this.onClose = data.onClose;
    this.add.rectangle(0, 0, W, H, 0, 0.7).setOrigin(0).setInteractive();
    panel(this, 120, 30, W - 240, H - 60, 0x1d1730, 0xffd24a);
    this.add.image(190, 100, 'npc_merchant').setScale(6);
    txt(this, 250, 54, 'Pip the Merchant', 26, '#ffd24a');
    txt(this, 250, 88, '"Potions! Fresh potions! Sell me your old junk!"', 17, C.dim, { wordWrap: { width: 460 } });
    this.draw();
  }

  private draw() {
    this.layer?.destroy();
    const p = current();
    const c = this.add.container(0, 0);
    this.layer = c;
    c.add(txt(this, 250, 120, `Your gold: ${p.gold}     Potions: ${countPotions(p.potions, 'hp')} health, ${countPotions(p.potions, 'mp')} mana`, 17, '#ffd24a'));
    // Stronger potions appear in the shop as the hero levels up.
    const forSale = POTIONS.filter((d) => d.shopLevel <= p.level);
    forSale.forEach((d, i) => {
      const col = d.kind === 'hp' ? 0 : 1;
      const row = d.tier - 1;
      const b = button(this, W / 2 - 165 + col * 330, 180 + row * 62, 310, 54, `${d.name}\n+${d.amount}  -  ${d.price} gold`, () => this.buy(d), {
        size: 15,
        color: d.kind === 'hp' ? 0x8a2a3a : 0x2a4a8a,
      });
      b.add(this.add.image(-132, 0, d.icon).setScale(2));
      b.setEnabled(p.gold >= d.price);
      c.add(b);
    });
    const next = POTIONS.find((d) => d.shopLevel > p.level);
    if (next) c.add(txt(this, W / 2, 180 + 4 * 62 - 22, `Stronger potions unlock at level ${next.shopLevel}!`, 15, C.dim).setOrigin(0.5));
    c.add(button(this, W / 2 - 110, H - 72, 200, 50, 'Sell items...', () => openSellMenu(this, () => this.draw()), { size: 18, color: 0x6a5a2a }));
    c.add(button(this, W / 2 + 110, H - 72, 180, 50, 'Bye!', () => {
      this.scene.stop();
      this.onClose?.();
    }, { color: 0x3a3450 }));
  }

  private buy(d: PotionDef) {
    const p = current();
    if (p.gold < d.price) return toast(this, 'Not enough gold!', C.bad);
    p.gold -= d.price;
    p.potions[d.id] = (p.potions[d.id] ?? 0) + 1;
    sfx('coin');
    saveProfile(p);
    this.draw();
  }
}

/** Campfire menu: jump to any place you've already reached, in any area. */
export class TravelScene extends Phaser.Scene {
  constructor() {
    super('Travel');
  }

  create(data: { onClose?: () => void }) {
    const p = current();
    this.add.rectangle(0, 0, W, H, 0, 0.7).setOrigin(0).setInteractive();
    panel(this, 60, 30, W - 120, H - 60, 0x1d1730, 0xff9a40);
    txt(this, W / 2, 58, 'Campfire Travel', 28, '#ffd24a').setOrigin(0.5);
    txt(this, W / 2, 92, 'Jump to any place you have already reached.', 16, C.dim).setOrigin(0.5);
    AREAS.forEach((area, ai) => {
      const x = W / 2 - 205 + ai * 410;
      txt(this, x, 128, area.name, 20, area.theme.outdoor ? '#8aff6a' : '#c8b8ff').setOrigin(0.5);
      PLACES.filter((pl) => pl.area === ai).forEach((pl, i) => {
        const unlocked = pl.index <= p.maxFloor;
        const label = pl.kind === 'lair' ? pl.name : pl.name.replace(`${area.name} - `, '');
        const b = button(this, x, 172 + i * 62, 360, 52, unlocked ? label : `${label} (locked)`, () => {
          this.scene.stop();
          this.scene.stop('Dungeon');
          this.scene.start('Dungeon', { floor: pl.index });
        }, { size: 18, color: pl.kind === 'lair' ? 0x8a3a3a : area.theme.outdoor ? 0x2f6a3a : 0x4b3a78 });
        b.setEnabled(unlocked);
      });
    });
    button(this, W / 2, H - 72, 180, 48, 'Stay here', () => {
      this.scene.stop();
      data.onClose?.();
    }, { color: 0x3a3450 });
  }
}
