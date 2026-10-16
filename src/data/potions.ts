// Potions come in four strengths. Stronger ones drop from higher-level
// monsters and unlock in the shop as the hero levels up.

export type PotionKind = 'hp' | 'mp';
export type PotionId = 'hp1' | 'hp2' | 'hp3' | 'hp4' | 'mp1' | 'mp2' | 'mp3' | 'mp4';

export interface PotionDef {
  id: PotionId;
  kind: PotionKind;
  tier: 1 | 2 | 3 | 4;
  name: string;
  /** Health or mana restored. */
  amount: number;
  icon: string;
  price: number;
  /** Hero level needed to buy it in the shop. */
  shopLevel: number;
}

const TIER_NAMES = ['Minor', 'Medium', 'Major', 'Superior'];
const HP = [40, 90, 160, 260];
const MP = [15, 30, 50, 80];
const HP_PRICE = [15, 35, 70, 120];
const MP_PRICE = [12, 28, 55, 95];
const SHOP_LEVEL = [1, 6, 11, 16];

export const POTIONS: PotionDef[] = (['hp', 'mp'] as const).flatMap((kind) =>
  [1, 2, 3, 4].map((t) => ({
    id: `${kind}${t}` as PotionId,
    kind,
    tier: t as 1 | 2 | 3 | 4,
    name: `${TIER_NAMES[t - 1]} ${kind === 'hp' ? 'Healing' : 'Mana'} Potion`,
    amount: (kind === 'hp' ? HP : MP)[t - 1],
    icon: kind === 'hp' ? (t === 1 ? 'icon_potion' : `icon_potion_${t}`) : t === 1 ? 'icon_mana' : `icon_mana_${t}`,
    price: (kind === 'hp' ? HP_PRICE : MP_PRICE)[t - 1],
    shopLevel: SHOP_LEVEL[t - 1],
  })),
);

export function potion(id: PotionId): PotionDef {
  return POTIONS.find((p) => p.id === id)!;
}

/** Strength of potion a monster of this level drops. */
export function tierForLevel(level: number): 1 | 2 | 3 | 4 {
  return level <= 5 ? 1 : level <= 10 ? 2 : level <= 15 ? 3 : 4;
}

export type PotionBag = Partial<Record<PotionId, number>>;

/** Older saves stored { hp, mp } counts of a single potion type. */
export function upgradePotions(old: unknown): PotionBag {
  const o = (old ?? {}) as Record<string, number>;
  if ('hp' in o || 'mp' in o) return { hp1: o.hp ?? 0, mp1: o.mp ?? 0 };
  return o as PotionBag;
}

export function countPotions(bag: PotionBag, kind?: PotionKind): number {
  return POTIONS.filter((p) => !kind || p.kind === kind).reduce((s, p) => s + (bag[p.id] ?? 0), 0);
}
