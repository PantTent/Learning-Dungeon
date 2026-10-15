import Phaser from 'phaser';
import type { StatKey } from '../data/classes';
import {
  canUse, ICON, isTwoHanded, itemScore, RARITY, SLOT_LABEL, slotsFor, STAT_LABEL, weaponLabel,
  type Item, type Slot,
} from '../data/items';
import { BAG_SIZE, classOf, current, derive, equip, saveProfile, unequip } from '../state/profile';
import { C, H, W, button, panel, toast, txt } from '../ui/widgets';

const BOX = 58;

const LEFT: Slot[] = ['head', 'neck', 'chest', 'hands', 'legs'];
const RIGHT: Slot[] = ['feet', 'ring1', 'ring2', 'mainhand', 'offhand'];

const SLOT_ICON: Record<Slot, string> = {
  head: 'icon_head', neck: 'icon_neck', chest: 'icon_chest', hands: 'icon_hands', legs: 'icon_legs',
  feet: 'icon_feet', ring1: 'icon_ring', ring2: 'icon_ring', mainhand: 'icon_sword', offhand: 'icon_shield',
};

export class InventoryScene extends Phaser.Scene {
  private onClose?: () => void;
  private layer?: Phaser.GameObjects.Container;
  private popup?: Phaser.GameObjects.Container;

  constructor() {
    super('Inventory');
  }

  create(data: { onClose?: () => void }) {
    this.onClose = data.onClose;
    this.draw();
  }

  private close() {
    saveProfile(current());
    this.scene.stop();
    this.onClose?.();
  }

  private draw() {
    this.layer?.destroy();
    this.popup?.destroy();
    const p = current();
    const cls = classOf(p);
    const s = derive(p);
    const c = this.add.container(0, 0);
    this.layer = c;
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.75).setOrigin(0).setInteractive());
    c.add(panel(this, 12, 12, W - 24, H - 24, 0x1d1730, cls.color));
    c.add(txt(this, 32, 22, `${p.name}'s Gear`, 24, '#ffd24a'));
    c.add(button(this, W - 80, 42, 110, 44, 'Close', () => this.close(), { size: 20, color: 0x8a3a3a }));

    // Paper doll
    const hero = this.add.image(185, 270, cls.sprite).setScale(8);
    c.add(hero);
    this.tweens.add({ targets: hero, y: 262, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    LEFT.forEach((slot, i) => this.slotBox(c, 48, 70 + i * (BOX + 22), slot));
    RIGHT.forEach((slot, i) => this.slotBox(c, 264, 70 + i * (BOX + 22), slot));

    // Stats
    const sx = 350;
    c.add(txt(this, sx, 66, 'Stats', 20, '#ffd24a'));
    const rows: [string, string][] = [
      ['Health', `${p.hp}/${s.maxHp}`],
      ['Mana', `${p.mp}/${s.maxMp}`],
      ['Power', `${Math.round(s.power)}`],
      ['Weapon', `${s.weaponDmg[0]}-${s.weaponDmg[1]}`],
      ['Strength', `${s.str}`],
      ['Intellect', `${s.int}`],
      ['Agility', `${s.agi}`],
      ['Stamina', `${s.sta}`],
      ['Armor', `${s.armor}`],
      ['Crit', `${s.crit}%`],
    ];
    rows.forEach(([k, v], i) => {
      const main = (k === 'Strength' && cls.primary === 'str') || (k === 'Intellect' && cls.primary === 'int') || (k === 'Agility' && cls.primary === 'agi');
      c.add(txt(this, sx, 96 + i * 30, k, 17, main ? '#ffd24a' : C.dim));
      c.add(txt(this, sx + 170, 96 + i * 30, v, 17, main ? '#ffd24a' : C.text).setOrigin(1, 0));
    });
    c.add(txt(this, sx, 404, `Gold: ${p.gold}`, 18, '#ffd24a'));
    c.add(txt(this, sx, 430, `Gold color = your main stat`, 13, C.dim));

    // Bag
    const bx = 556;
    const cols = 6;
    const cell = 62;
    c.add(txt(this, bx, 66, `Bag ${p.bag.length}/${BAG_SIZE}`, 20, '#ffd24a'));
    for (let i = 0; i < BAG_SIZE; i++) {
      const x = bx + (i % cols) * cell;
      const y = 96 + Math.floor(i / cols) * cell;
      const it = p.bag[i];
      const g = this.add.graphics();
      g.fillStyle(0x0f0b1a, 1).fillRoundedRect(x, y, cell - 6, cell - 6, 6);
      g.lineStyle(2, it ? RARITY[it.rarity].color : 0x3a3054, 1).strokeRoundedRect(x, y, cell - 6, cell - 6, 6);
      c.add(g);
      if (!it) continue;
      const icon = this.add.image(x + (cell - 6) / 2, y + (cell - 6) / 2, ICON[it.base]).setScale(3);
      if (!canUse(cls, it)) icon.setTint(0xff7070);
      c.add(icon);
      if (canUse(cls, it) && itemScore(it, cls) > this.bestEquippedScore(it)) {
        c.add(txt(this, x + cell - 12, y + 2, '^', 18, C.good).setOrigin(1, 0));
      }
      const z = this.add.zone(x, y, cell - 6, cell - 6).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.showItem(it, null));
      c.add(z);
    }
    c.add(button(this, bx + 180, H - 50, 230, 44, 'Sell all Common', () => this.sellCommons(), { size: 17, color: 0x6a5a2a }));
  }

  private bestEquippedScore(it: Item): number {
    const p = current();
    const cls = classOf(p);
    const slots = slotsFor(it.base);
    return Math.min(...slots.map((s) => itemScore(p.equipped[s], cls)));
  }

  private slotBox(c: Phaser.GameObjects.Container, x: number, y: number, slot: Slot) {
    const p = current();
    const it = p.equipped[slot];
    const blocked = slot === 'offhand' && p.equipped.mainhand && isTwoHanded(p.equipped.mainhand.base);
    const g = this.add.graphics();
    g.fillStyle(0x0f0b1a, 1).fillRoundedRect(x, y, BOX, BOX, 8);
    g.lineStyle(3, it ? RARITY[it.rarity].color : 0x4a3e66, 1).strokeRoundedRect(x, y, BOX, BOX, 8);
    c.add(g);
    if (it) c.add(this.add.image(x + BOX / 2, y + BOX / 2, ICON[it.base]).setScale(3));
    else c.add(this.add.image(x + BOX / 2, y + BOX / 2, SLOT_ICON[slot]).setScale(3).setAlpha(blocked ? 0.35 : 0.18));
    c.add(txt(this, x + BOX / 2, y + BOX + 2, blocked ? '2-Hand' : SLOT_LABEL[slot], 12, C.dim).setOrigin(0.5, 0));
    if (it) {
      const z = this.add.zone(x, y, BOX, BOX).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.showItem(it, slot));
      c.add(z);
    }
  }

  private itemLines(it: Item): string[] {
    const lines: string[] = [];
    lines.push(`${RARITY[it.rarity].name} ${weaponLabel(it.base)}   (item level ${it.ilvl})`);
    if (it.dmg) lines.push(`Damage: ${it.dmg[0]} - ${it.dmg[1]}`);
    if (it.armor) lines.push(`Armor: ${it.armor}`);
    for (const [k, v] of Object.entries(it.stats) as [StatKey, number][]) lines.push(`+${v} ${STAT_LABEL[k]}`);
    return lines;
  }

  private showItem(it: Item, equippedSlot: Slot | null) {
    this.popup?.destroy();
    const p = current();
    const cls = classOf(p);
    const c = this.add.container(0, 0).setDepth(100);
    this.popup = c;
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.55).setOrigin(0).setInteractive().on('pointerup', () => c.destroy()));
    const compare = equippedSlot ? null : slotsFor(it.base).map((s) => p.equipped[s]).find(Boolean) ?? null;
    const pw = compare ? 760 : 420;
    const px = W / 2 - pw / 2;
    c.add(panel(this, px, 60, pw, 400, 0x1d1730, RARITY[it.rarity].color));
    c.add(this.add.rectangle(px, 60, pw, 400, 0, 0).setOrigin(0).setInteractive());

    const col = (x: number, item: Item, title: string) => {
      c.add(txt(this, x, 74, title, 15, C.dim));
      c.add(this.add.image(x + 26, 124, ICON[item.base]).setScale(3));
      c.add(txt(this, x + 60, 100, item.name, 21, RARITY[item.rarity].css, { wordWrap: { width: 300 } }));
      this.itemLines(item).forEach((l, i) => c.add(txt(this, x, 168 + i * 26, l, 18, i === 0 ? C.dim : C.text)));
    };
    col(px + 24, it, equippedSlot ? 'Equipped' : 'In your bag');
    if (compare) {
      col(px + pw / 2 + 12, compare, 'Currently wearing');
      const diff = itemScore(it, cls) - itemScore(compare, cls);
      c.add(
        txt(this, W / 2, 390, diff > 0 ? 'This looks like an UPGRADE!' : diff < 0 ? 'Your current item is better.' : 'About the same.', 18, diff > 0 ? C.good : diff < 0 ? '#ffb36b' : C.dim).setOrigin(0.5),
      );
    }
    if (!canUse(cls, it)) c.add(txt(this, px + 24, 350, `A ${cls.name} can't use this.`, 17, C.bad));

    const by = 425;
    if (equippedSlot) {
      c.add(button(this, W / 2 - 90, by, 160, 50, 'Unequip', () => {
        if (!unequip(p, equippedSlot)) toast(this, 'Bag is full!', C.bad);
        this.draw();
      }));
      c.add(button(this, W / 2 + 90, by, 160, 50, 'Close', () => c.destroy(), { color: 0x3a3450 }));
    } else {
      const b = button(this, W / 2 - 180, by, 160, 50, 'Equip', () => {
        if (!equip(p, it)) toast(this, 'Bag is full!', C.bad);
        saveProfile(p);
        this.draw();
      }, { color: 0x2f9a4a });
      b.setEnabled(canUse(cls, it));
      c.add(b);
      c.add(button(this, W / 2, by, 160, 50, `Sell ${it.value}g`, () => {
        p.bag = p.bag.filter((x) => x.id !== it.id);
        p.gold += it.value;
        saveProfile(p);
        this.draw();
      }, { color: 0x6a5a2a }));
      c.add(button(this, W / 2 + 180, by, 160, 50, 'Close', () => c.destroy(), { color: 0x3a3450 }));
    }
  }

  private sellCommons() {
    const p = current();
    const commons = p.bag.filter((i) => i.rarity === 'common');
    if (!commons.length) return toast(this, 'No common items to sell.');
    const gold = commons.reduce((s, i) => s + i.value, 0);
    p.bag = p.bag.filter((i) => i.rarity !== 'common');
    p.gold += gold;
    saveProfile(p);
    this.draw();
    toast(this, `Sold ${commons.length} items for ${gold} gold`, '#ffd24a');
  }
}
