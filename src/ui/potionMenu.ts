import Phaser from 'phaser';
import { sfx } from '../audio/audio';
import { POTIONS, type PotionDef, type PotionId } from '../data/potions';
import { current, derive, saveProfile } from '../state/profile';
import { C, H, W, button, panel, txt } from './widgets';
import { tr } from '../i18n';

/** Drink a potion: returns how much health/mana it actually restored. */
export function drinkPotion(id: PotionId): number {
  const p = current();
  const def = POTIONS.find((x) => x.id === id)!;
  if (!(p.potions[id] ?? 0)) return 0;
  const s = derive(p);
  p.potions[id] = (p.potions[id] ?? 0) - 1;
  let gained: number;
  if (def.kind === 'hp') {
    gained = Math.min(def.amount, s.maxHp - p.hp);
    p.hp += gained;
  } else {
    gained = Math.min(def.amount, s.maxMp - p.mp);
    p.mp += gained;
  }
  saveProfile(p);
  sfx('potion');
  return gained;
}

/** Pick which potion to drink. Calls onDrink after drinking, or nothing if cancelled. */
export function openPotionMenu(scene: Phaser.Scene, onDrink: (def: PotionDef, gained: number) => void, onCancel?: () => void) {
  const p = current();
  const s = derive(p);
  const owned = POTIONS.filter((d) => (p.potions[d.id] ?? 0) > 0);
  const c = scene.add.container(0, 0).setDepth(3500).setScrollFactor(0);
  c.add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
  const ph = Math.max(220, 140 + Math.ceil(owned.length / 2) * 70);
  const py = H / 2 - ph / 2;
  c.add(panel(scene, 130, py, W - 260, ph, 0x1d1730, 0xff6b6b));
  c.add(txt(scene, W / 2, py + 26, tr('Drink a potion'), 26, '#ffd24a').setOrigin(0.5));
  c.add(txt(scene, W / 2, py + 58, tr('Health {hp}/{maxHp}    Mana {mp}/{maxMp}', { hp: p.hp, maxHp: s.maxHp, mp: p.mp, maxMp: s.maxMp }), 17, C.dim).setOrigin(0.5));
  if (!owned.length) c.add(txt(scene, W / 2, py + 110, tr('No potions! Buy some at the camp shop.'), 19, C.bad).setOrigin(0.5));
  owned.forEach((d, i) => {
    const x = W / 2 - 170 + (i % 2) * 340;
    const y = py + 112 + Math.floor(i / 2) * 70;
    const full = d.kind === 'hp' ? p.hp >= s.maxHp : p.mp >= s.maxMp;
    const b = button(scene, x, y, 320, 58, `${tr(d.name)} x${p.potions[d.id]}\n${d.kind === 'hp' ? tr('+{n} health', { n: d.amount }) : tr('+{n} mana', { n: d.amount })}${full ? tr(' (full!)') : ''}`, () => {
      const gained = drinkPotion(d.id);
      c.destroy();
      onDrink(d, gained);
    }, { size: 15, color: d.kind === 'hp' ? 0x8a2a3a : 0x2a4a8a });
    b.add(scene.add.image(-140, 0, d.icon).setScale(2));
    if (full) b.setEnabled(false);
    c.add(b);
  });
  c.add(button(scene, W / 2, py + ph - 36, 160, 46, tr('Cancel'), () => {
    c.destroy();
    onCancel?.();
  }, { size: 19, color: 0x3a3450 }));
}
