import Phaser from 'phaser';
import { sfx } from '../audio/audio';
import { openSellMenu } from '../ui/sellMenu';
import { BOSS, FLOORS } from '../data/enemies';
import { current, saveProfile } from '../state/profile';
import { LAIR } from '../state/world';
import { C, H, W, button, panel, toast, txt } from '../ui/widgets';

const HP_COST = 15;
const MP_COST = 12;

export class ShopScene extends Phaser.Scene {
  private onClose?: () => void;
  private goldText?: Phaser.GameObjects.Text;
  private stock?: Phaser.GameObjects.Text;

  constructor() {
    super('Shop');
  }

  create(data: { onClose?: () => void }) {
    this.onClose = data.onClose;
    this.add.rectangle(0, 0, W, H, 0, 0.7).setOrigin(0).setInteractive();
    panel(this, 180, 70, W - 360, H - 140, 0x1d1730, 0xffd24a);
    this.add.image(260, 160, 'npc_merchant').setScale(6);
    txt(this, 320, 100, 'Pip the Merchant', 26, '#ffd24a');
    txt(this, 320, 136, '"Potions! Fresh potions! Sell me your old junk!"', 17, C.dim, { wordWrap: { width: 420 } });
    this.goldText = txt(this, 320, 176, '', 20, '#ffd24a');
    this.stock = txt(this, 320, 204, '', 17, C.text);

    button(this, W / 2 - 120, 290, 220, 64, `Health Potion\n${HP_COST} gold`, () => this.buy('hp', HP_COST), { size: 18, color: 0x8a2a3a });
    button(this, W / 2 + 120, 290, 220, 64, `Mana Potion\n${MP_COST} gold`, () => this.buy('mp', MP_COST), { size: 18, color: 0x2a4a8a });
    button(this, W / 2, 370, 300, 50, 'Sell items...', () => openSellMenu(this, () => this.refresh()), { size: 18, color: 0x6a5a2a });
    button(this, W / 2, H - 110, 180, 50, 'Bye!', () => {
      this.scene.stop();
      this.onClose?.();
    }, { color: 0x3a3450 });
    this.refresh();
  }

  private refresh() {
    const p = current();
    this.goldText?.setText(`Your gold: ${p.gold}`);
    this.stock?.setText(`You have ${p.potions.hp} health and ${p.potions.mp} mana potions.`);
  }

  private buy(kind: 'hp' | 'mp', cost: number) {
    const p = current();
    if (p.gold < cost) return toast(this, 'Not enough gold!', C.bad);
    p.gold -= cost;
    p.potions[kind]++;
    sfx('coin');
    saveProfile(p);
    this.refresh();
  }
}

/** Campfire menu: jump to any floor you've already reached. */
export class TravelScene extends Phaser.Scene {
  constructor() {
    super('Travel');
  }

  create(data: { onClose?: () => void }) {
    const p = current();
    this.add.rectangle(0, 0, W, H, 0, 0.7).setOrigin(0).setInteractive();
    panel(this, 230, 50, W - 460, H - 100, 0x1d1730, 0xff9a40);
    txt(this, W / 2, 80, 'Campfire Travel', 28, '#ffd24a').setOrigin(0.5);
    txt(this, W / 2, 116, 'Jump to any place you have already reached.', 16, C.dim).setOrigin(0.5);
    const places = [...FLOORS.map((f) => f.name.replace('Mossfang Caverns - ', '')), `Throne Room (${BOSS.name.split(' ')[0]})`];
    places.forEach((name, i) => {
      const unlocked = i <= p.maxFloor;
      const b = button(this, W / 2, 170 + i * 66, 360, 54, unlocked ? name : `${name} (locked)`, () => {
        this.scene.stop();
        this.scene.stop('Dungeon');
        this.scene.start('Dungeon', { floor: i === FLOORS.length ? LAIR : i });
      }, { size: 20, color: i === FLOORS.length ? 0x8a3a3a : 0x4b3a78 });
      b.setEnabled(unlocked);
    });
    button(this, W / 2, H - 90, 180, 48, 'Stay here', () => {
      this.scene.stop();
      data.onClose?.();
    }, { color: 0x3a3450 });
  }
}
