import Phaser from 'phaser';
import { sfx } from '../audio/audio';
import { canUse, itemScore, RARITY, slotsFor, type Item, type Rarity } from '../data/items';
import { classOf, current, saveProfile } from '../state/profile';
import { C, H, W, button, panel, toast, txt } from './widgets';

interface SellOption {
  label: string;
  items: Item[];
  /** Ask "are you sure?" first (for valuable items). */
  confirm: boolean;
}

function options(): SellOption[] {
  const p = current();
  const cls = classOf(p);
  const opts: SellOption[] = [];
  const order: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  for (const r of order) {
    const items = p.bag.filter((i) => i.rarity === r);
    if (items.length) opts.push({ label: `All ${RARITY[r].name}`, items, confirm: RARITY[r].rank >= 2 });
  }
  const unusable = p.bag.filter((i) => !canUse(cls, i));
  if (unusable.length) opts.push({ label: `Items a ${cls.name} can't use`, items: unusable, confirm: unusable.some((i) => RARITY[i.rarity].rank >= 2) });
  // Anything worse than what you're already wearing in that slot.
  const worse = p.bag.filter((i) => {
    if (!canUse(cls, i)) return false;
    const worn = slotsFor(i.base).map((s) => p.equipped[s]);
    if (worn.some((w) => !w)) return false;
    return itemScore(i, cls) < Math.min(...worn.map((w) => itemScore(w, cls)));
  });
  if (worse.length) opts.push({ label: 'Worse than what I wear', items: worse, confirm: worse.some((i) => RARITY[i.rarity].rank >= 2) });
  if (p.bag.length) opts.push({ label: 'EVERYTHING in my bag', items: [...p.bag], confirm: true });
  return opts;
}

/** Bulk-sell menu, shared by the bag and the shop. */
export function openSellMenu(scene: Phaser.Scene, onDone: () => void) {
  const c = scene.add.container(0, 0).setDepth(200).setScrollFactor(0);
  const close = () => {
    c.destroy();
    onDone();
  };
  const draw = () => {
    c.removeAll(true);
    c.add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0).setInteractive());
    c.add(panel(scene, 150, 30, W - 300, H - 60, 0x1d1730, 0xffd24a));
    c.add(txt(scene, W / 2, 58, 'What do you want to sell?', 26, '#ffd24a').setOrigin(0.5));
    c.add(txt(scene, W / 2, 90, 'Tip: tap any single item in your bag to sell just that one.', 15, C.dim).setOrigin(0.5));
    const opts = options();
    if (!opts.length) c.add(txt(scene, W / 2, 220, 'Your bag is empty!', 22, C.dim).setOrigin(0.5));
    opts.slice(0, 8).forEach((o, i) => {
      const gold = o.items.reduce((s, it) => s + it.value, 0);
      const col = i % 2;
      const row = Math.floor(i / 2);
      const rarity = o.label.match(/^All (\w+)$/)?.[1].toLowerCase() as Rarity | undefined;
      const color = rarity ? Phaser.Display.Color.ValueToColor(RARITY[rarity].color).darken(55).color : o.label.startsWith('EVERY') ? 0x8a3a3a : 0x6a5a2a;
      c.add(
        button(scene, W / 2 - 160 + col * 320, 140 + row * 70, 300, 58, `${o.label} (${o.items.length})\n+${gold} gold`, () => {
          if (o.confirm) confirm(o, gold);
          else sell(o.items, gold);
        }, { size: 16, color }),
      );
    });
    c.add(button(scene, W / 2, H - 70, 180, 50, 'Done', close, { size: 22, color: 0x2f9a4a }));
  };
  const sell = (items: Item[], gold: number) => {
    const p = current();
    const ids = new Set(items.map((i) => i.id));
    p.bag = p.bag.filter((i) => !ids.has(i.id));
    p.gold += gold;
    saveProfile(p);
    sfx('coin');
    toast(scene, `Sold ${items.length} item${items.length === 1 ? '' : 's'} for ${gold} gold`, '#ffd24a');
    draw();
  };
  const confirm = (o: SellOption, gold: number) => {
    const best = o.items.reduce((a, b) => (RARITY[b.rarity].rank > RARITY[a.rarity].rank ? b : a));
    const d = scene.add.container(0, 0).setDepth(210).setScrollFactor(0);
    d.add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
    d.add(panel(scene, W / 2 - 280, H / 2 - 110, 560, 220, 0x1d1730, 0xff8a6b));
    d.add(txt(scene, W / 2, H / 2 - 70, `Sell ${o.items.length} item${o.items.length === 1 ? '' : 's'} for ${gold} gold?`, 24).setOrigin(0.5));
    d.add(txt(scene, W / 2, H / 2 - 30, `Including: ${best.name}`, 17, RARITY[best.rarity].css).setOrigin(0.5));
    d.add(button(scene, W / 2 - 110, H / 2 + 50, 180, 56, 'Yes, sell', () => {
      d.destroy();
      sell(o.items, gold);
    }, { color: 0xa83a3a }));
    d.add(button(scene, W / 2 + 110, H / 2 + 50, 180, 56, 'Keep them', () => d.destroy()));
  };
  draw();
}
