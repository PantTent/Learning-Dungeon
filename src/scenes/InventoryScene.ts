import Phaser from 'phaser';
import { sfx } from '../audio/audio';
import { openSellMenu } from '../ui/sellMenu';
import type { StatKey } from '../data/classes';
import {
  canUse, ICON, isTwoHanded, itemScore, RARITY, SLOT_LABEL, slotsFor, STAT_LABEL, weaponLabel,
  type Item, type Slot,
} from '../data/items';
import { BAG_SIZE, classOf, current, derive, equip, saveProfile, unequip } from '../state/profile';
import { C, H, W, button, panel, toast, txt } from '../ui/widgets';
import { fmtNum, tr } from '../i18n';
import { itemName } from '../i18n/itemNames';

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
    c.add(txt(this, 32, 22, tr("{name}'s Gear", { name: p.name }), 24, '#ffd24a'));
    c.add(button(this, W - 80, 42, 110, 44, tr('Close'), () => this.close(), { size: 20, color: 0x8a3a3a }));

    // Paper doll
    const hero = this.add.image(185, 270, cls.sprite).setScale(8);
    c.add(hero);
    this.tweens.add({ targets: hero, y: 262, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    LEFT.forEach((slot, i) => this.slotBox(c, 48, 70 + i * (BOX + 22), slot));
    RIGHT.forEach((slot, i) => this.slotBox(c, 264, 70 + i * (BOX + 22), slot));

    // Stats
    const sx = 350;
    c.add(txt(this, sx, 66, tr('Stats'), 20, '#ffd24a'));
    const rows: [string, string, StatKey?][] = [
      [tr('Health'), `${p.hp}/${s.maxHp}`],
      [tr('Mana'), `${p.mp}/${s.maxMp}`],
      [tr('Power'), `${Math.round(s.power)}`],
      [tr('Weapon'), `${s.weaponDmg[0]}-${s.weaponDmg[1]}`],
      [tr(STAT_LABEL.str), `${s.str}`, 'str'],
      [tr(STAT_LABEL.int), `${s.int}`, 'int'],
      [tr(STAT_LABEL.agi), `${s.agi}`, 'agi'],
      [tr(STAT_LABEL.sta), `${s.sta}`, 'sta'],
      [tr(STAT_LABEL.armor), `${s.armor}`],
      [tr('Crit'), `${s.crit}%`],
    ];
    rows.forEach(([k, v, stat], i) => {
      const main = stat !== undefined && stat === cls.primary;
      c.add(txt(this, sx, 96 + i * 30, k, 17, main ? '#ffd24a' : C.dim));
      c.add(txt(this, sx + 170, 96 + i * 30, v, 17, main ? '#ffd24a' : C.text).setOrigin(1, 0));
    });
    c.add(txt(this, sx, 404, tr('Gold: {n}', { n: fmtNum(p.gold) }), 18, '#ffd24a'));
    c.add(txt(this, sx, 430, tr('Gold color = your main stat'), 13, C.dim));

    // Bag
    const bx = 556;
    const cols = 6;
    const cell = 62;
    c.add(txt(this, bx, 66, tr('Bag {n}/{max}', { n: p.bag.length, max: BAG_SIZE }), 20, '#ffd24a'));
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
      // Quick hint right in the bag: green up = upgrade, red down = worse than what you wear.
      if (canUse(cls, it)) {
        const mine = itemScore(it, cls);
        const worn = this.bestEquippedScore(it);
        const slotFilled = slotsFor(it.base).some((sl) => p.equipped[sl]);
        if (mine > worn) c.add(txt(this, x + cell - 10, y + 1, '\u25B2', 14, C.good).setOrigin(1, 0));
        else if (slotFilled && mine < worn) c.add(txt(this, x + cell - 10, y + 1, '\u25BC', 14, C.bad).setOrigin(1, 0));
      }
      const z = this.add.zone(x, y, cell - 6, cell - 6).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.showItem(it, null));
      c.add(z);
    }
    c.add(button(this, bx + 180, H - 50, 230, 44, tr('Sell items...'), () => openSellMenu(this, () => this.draw()), { size: 18, color: 0x6a5a2a }));
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
    c.add(txt(this, x + BOX / 2, y + BOX + 2, blocked ? tr('2-Hand') : tr(SLOT_LABEL[slot]), 12, C.dim).setOrigin(0.5, 0));
    if (it) {
      const z = this.add.zone(x, y, BOX, BOX).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.showItem(it, slot));
      c.add(z);
    }
  }

  /** Comparable numbers on an item: average damage, armor, and each stat. */
  private values(it: Item | null): Record<string, number> {
    const v: Record<string, number> = {};
    if (!it) return v;
    if (it.dmg) v.dmg = (it.dmg[0] + it.dmg[1]) / 2;
    if (it.armor) v.armor = it.armor;
    for (const [k, n] of Object.entries(it.stats) as [StatKey, number][]) v[`stat:${k}`] = n;
    return v;
  }

  private showItem(it: Item, equippedSlot: Slot | null) {
    this.popup?.destroy();
    const p = current();
    const cls = classOf(p);
    const c = this.add.container(0, 0).setDepth(100);
    this.popup = c;
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.55).setOrigin(0).setInteractive().on('pointerup', () => c.destroy()));
    const compare = equippedSlot ? null : slotsFor(it.base).map((s) => p.equipped[s]).find(Boolean) ?? null;
    const pw = compare ? 760 : 460;
    const px = W / 2 - pw / 2;
    const colW = compare ? pw / 2 - 36 : pw - 48;

    // Lay out the content first, then size the window around it.
    const body = this.add.container(0, 0);
    const main = cls.primary;
    const mainLabel = tr(STAT_LABEL[main]);
    /**
     * One column of item info. When `against` is given, each line gets a
     * green up arrow (better) or red down arrow (worse) compared to it.
     */
    const col = (x: number, item: Item, title: string, against: Item | null): number => {
      body.add(txt(this, x, 0, title, 15, C.dim));
      const name = txt(this, x + 60, 24, itemName(item), 21, RARITY[item.rarity].css, { wordWrap: { width: colW - 60 } });
      body.add(name);
      body.add(this.add.image(x + 24, 24 + Math.max(name.height, 44) / 2, ICON[item.base]).setScale(3));
      let y = 24 + Math.max(name.height, 44) + 14;
      body.add(txt(this, x, y, tr('{rarity} {type}   (item level {n})', { rarity: tr(RARITY[item.rarity].name), type: tr(weaponLabel(item.base)), n: item.ilvl }), 17, C.dim));
      y += 28;

      const mine = this.values(item);
      const theirs = this.values(against);
      const keys = Object.keys(against ? { ...mine, ...theirs } : mine);
      const order = (k: string) => (k === 'dmg' ? 0 : k === 'armor' ? 1 : k === `stat:${main}` ? 2 : 3);
      keys.sort((a, b) => order(a) - order(b));
      for (const k of keys) {
        const v = mine[k] ?? 0;
        const isMain = k === `stat:${main}`;
        let label: string;
        if (k === 'dmg') label = item.dmg ? tr('Damage: {from} - {to}', { from: item.dmg[0], to: item.dmg[1] }) : tr('Damage: none');
        else if (k === 'armor') label = v ? tr('Armor: {n}', { n: v }) : tr('Armor: none');
        else {
          const sk = k.slice(5) as StatKey;
          label = v ? `+${v} ${tr(STAT_LABEL[sk])}` : tr('{stat}: none', { stat: tr(STAT_LABEL[sk]) });
        }
        if (isMain) label += tr('  (main)');
        body.add(txt(this, x, y, label, 18, isMain ? '#ffd24a' : v ? C.text : C.dim));
        if (against) {
          const d = Math.round((v - (theirs[k] ?? 0)) * 10) / 10;
          if (d !== 0) {
            const up = d > 0;
            body.add(txt(this, x + colW - 8, y, `${up ? '\u25B2' : '\u25BC'} ${Math.abs(d)}`, 18, up ? C.good : C.bad).setOrigin(1, 0));
          }
        }
        y += 26;
      }
      return y;
    };
    let bottom = col(px + 24, it, equippedSlot ? tr('Equipped') : tr('In your bag'), compare);
    if (compare) bottom = Math.max(bottom, col(px + pw / 2 + 12, compare, tr('Currently wearing'), null));
    bottom += 8;
    // What actually happens to your hero's totals if you put this on.
    if (!equippedSlot && canUse(cls, it)) {
      const sim = JSON.parse(JSON.stringify(p)) as typeof p;
      const simItem = sim.bag.find((b) => b.id === it.id);
      if (simItem && equip(sim, simItem)) {
        const before = derive(p);
        const after = derive(sim);
        const rows: [string, number, string][] = [
          [tr('Damage'), Math.round(after.power) - Math.round(before.power), ''],
          [tr('Armor'), after.armor - before.armor, ''],
          [tr('Health'), after.maxHp - before.maxHp, ''],
          [tr('Mana'), after.maxMp - before.maxMp, ''],
          [tr(STAT_LABEL.str), after.str - before.str, ''],
          [tr(STAT_LABEL.int), after.int - before.int, ''],
          [tr(STAT_LABEL.agi), after.agi - before.agi, ''],
          [tr(STAT_LABEL.sta), after.sta - before.sta, ''],
          [tr('Crit'), after.crit - before.crit, '%'],
        ];
        const changed = rows.filter(([, d]) => d !== 0);
        const head = txt(this, px + 24, bottom, tr('If you equip this:'), 17, '#d7b8ff');
        body.add(head);
        const indent = Math.max(160, head.width + 14);
        let cx = px + 24 + indent;
        let cy = bottom;
        if (!changed.length) body.add(txt(this, cx, cy, tr('no change'), 17, C.dim));
        for (const [label, d, unit] of changed) {
          const up = d > 0;
          const t = txt(this, cx, cy, `${label} ${up ? '\u25B2' : '\u25BC'}${Math.abs(d)}${unit}`, 17, up ? C.good : C.bad);
          if (cx + t.width > px + pw - 24) {
            cx = px + 24 + indent;
            cy += 24;
            t.setPosition(cx, cy);
          }
          body.add(t);
          cx += t.width + 18;
        }
        bottom = cy + 30;
      }
    }
    if (compare && canUse(cls, it)) {
      const diff = itemScore(it, cls) - itemScore(compare, cls);
      body.add(
        txt(this, W / 2, bottom, diff > 0 ? tr('UPGRADE for a {cls}! ({stat} is your main stat)', { cls: tr(cls.name), stat: mainLabel }) : diff < 0 ? tr('Your current item is better for a {cls}.', { cls: tr(cls.name) }) : tr('About the same.'), 18, diff > 0 ? C.good : diff < 0 ? '#ffb36b' : C.dim).setOrigin(0.5, 0),
      );
      bottom += 30;
    }
    if (!canUse(cls, it)) {
      body.add(txt(this, px + 24, bottom, tr("A {cls} can't use this.", { cls: tr(cls.name) }), 17, C.bad));
      bottom += 28;
    }

    const bh = 50;
    const ph = 18 + bottom + 12 + bh + 18;
    const py = Math.max(10, H / 2 - ph / 2);
    c.add(panel(this, px, py, pw, ph, 0x1d1730, RARITY[it.rarity].color));
    c.add(this.add.rectangle(px, py, pw, ph, 0, 0).setOrigin(0).setInteractive());
    body.y = py + 18;
    c.add(body);

    // Buttons always fit inside the window.
    const by = py + ph - 18 - bh / 2;
    const actions: { label: string; color: number; fn: () => void; enabled?: boolean }[] = equippedSlot
      ? [
          { label: tr('Unequip'), color: 0x4b3a78, fn: () => {
            if (!unequip(p, equippedSlot)) toast(this, tr('Bag is full!'), C.bad);
            this.draw();
          } },
          { label: tr('Close'), color: 0x3a3450, fn: () => c.destroy() },
        ]
      : [
          { label: tr('Equip'), color: 0x2f9a4a, enabled: canUse(cls, it), fn: () => {
            if (!equip(p, it)) toast(this, tr('Bag is full!'), C.bad);
            else sfx('equip');
            saveProfile(p);
            this.draw();
          } },
          { label: tr('Sell {n}g', { n: fmtNum(it.value) }), color: 0x6a5a2a, fn: () => {
            p.bag = p.bag.filter((x) => x.id !== it.id);
            p.gold += it.value;
            sfx('coin');
            saveProfile(p);
            this.draw();
          } },
          { label: tr('Close'), color: 0x3a3450, fn: () => c.destroy() },
        ];
    const gap = 12;
    const bw = Math.min(160, (pw - 48 - gap * (actions.length - 1)) / actions.length);
    const total = actions.length * bw + (actions.length - 1) * gap;
    actions.forEach((a, i) => {
      const b = button(this, W / 2 - total / 2 + bw / 2 + i * (bw + gap), by, bw, bh, a.label, a.fn, { color: a.color, size: 20 });
      // Longer (French) labels shrink to stay on one line.
      for (let size = 19; size >= 14 && b.label.getWrappedText().length > 1; size--) b.label.setFontSize(size);
      if (a.enabled === false) b.setEnabled(false);
      c.add(b);
    });
  }
}
