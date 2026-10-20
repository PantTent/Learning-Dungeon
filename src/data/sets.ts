// Item sets: wear 3, 4 or all 5 pieces of the same set for growing bonuses.
// Set pieces only drop from Legendary rare spawns, so they are special.
import type { ClassDef } from './classes';
import { BASE_NAME, makeItem, type ArmorType, type Item } from './items';
import { pick } from '../util/rng';

export interface SetBonus {
  hpPct?: number;
  mpPct?: number;
  powerPct?: number;
  armorPct?: number;
  /** Flat crit chance, in %. */
  crit?: number;
}

export interface SetDef {
  id: string;
  name: string;
  /** French "de ..." phrase that follows the item noun, e.g. "Heaume du Cœur sauvage". */
  fr: string;
  pieces: ArmorType[];
  /** Bonuses for wearing 3, 4 and 5 pieces (they add up). */
  bonuses: [SetBonus, SetBonus, SetBonus];
}

/** Pieces needed for each bonus. */
export const SET_STEPS = [3, 4, 5];

const ARMOR: ArmorType[] = ['head', 'chest', 'hands', 'legs', 'feet'];

export const SETS: SetDef[] = [
  { id: 'ember', name: 'Emberguard', fr: 'de la Garde de braise', pieces: ARMOR, bonuses: [{ armorPct: 10 }, { powerPct: 8 }, { crit: 6 }] },
  { id: 'frost', name: 'Frostweave', fr: 'du Tissage de givre', pieces: ARMOR, bonuses: [{ mpPct: 12 }, { hpPct: 10 }, { powerPct: 12 }] },
  { id: 'wild', name: 'Wildheart', fr: 'du Cœur sauvage', pieces: ARMOR, bonuses: [{ hpPct: 10 }, { armorPct: 10 }, { hpPct: 15 }] },
  { id: 'night', name: 'Nightstalker', fr: 'du Rôdeur nocturne', pieces: ARMOR, bonuses: [{ crit: 4 }, { powerPct: 8 }, { crit: 4, powerPct: 8 }] },
  { id: 'star', name: 'Starcaller', fr: "de l'Appel des étoiles", pieces: ARMOR, bonuses: [{ mpPct: 8 }, { powerPct: 6 }, { powerPct: 15 }] },
];

export function setOf(item: Item | null | undefined): SetDef | undefined {
  return item?.set ? SETS.find((s) => s.id === item.set) : undefined;
}

/** A random piece of a random set, as strong as an Epic item of this level. */
export function makeSetItem(ilvl: number, cls?: ClassDef, set: SetDef = pick(SETS)): Item {
  const base = pick(set.pieces);
  const item = makeItem(ilvl, { rarity: 'epic', base, cls });
  item.set = set.id;
  item.name = `${set.name} ${BASE_NAME[base]}`;
  item.value = Math.round(item.value * 1.5);
  return item;
}

/** How many pieces of each set are being worn. */
export function setCounts(equipped: Partial<Record<string, Item | null>>): Map<string, number> {
  const out = new Map<string, number>();
  for (const it of Object.values(equipped)) if (it?.set) out.set(it.set, (out.get(it.set) ?? 0) + 1);
  return out;
}

/** All bonuses that are switched on by the worn pieces, added together. */
export function activeSetBonus(equipped: Partial<Record<string, Item | null>>): Required<SetBonus> {
  const total = { hpPct: 0, mpPct: 0, powerPct: 0, armorPct: 0, crit: 0 };
  for (const [id, n] of setCounts(equipped)) {
    const set = SETS.find((s) => s.id === id);
    if (!set) continue;
    set.bonuses.forEach((b, i) => {
      if (n < SET_STEPS[i]) return;
      for (const k of Object.keys(total) as (keyof SetBonus)[]) total[k] += b[k] ?? 0;
    });
  }
  return total;
}
