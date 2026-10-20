// Item names in the current language. English names are stored on the item;
// French names are built from the item's parts so they read naturally
// (word order and gender agreement), e.g. "Épée puissante en fer de l'Ours".
import type { StatKey } from '../data/classes';
import { BASE_NAME, materialTier, PREFIX, RARITY, SUFFIX, type BaseType, type Item } from '../data/items';
import { getLang } from './index';
import { SETS } from '../data/sets';

type Gender = 'm' | 'f';
interface Noun {
  word: string;
  g: Gender;
  plural?: boolean;
  /** Starts with a vowel sound (for "Vieil arc"). */
  vowel?: boolean;
}

/** Adjective forms: masculine, feminine, masculine plural, feminine plural. */
type Adj = [string, string, string, string];

function adj(m: string, f = m, mpl?: string, fpl?: string): Adj {
  return [m, f, mpl ?? (/[sx]$/.test(m) ? m : m + 's'), fpl ?? f + 's'];
}

function agree(a: Adj, n: Noun): string {
  return a[(n.g === 'f' ? 1 : 0) + (n.plural ? 2 : 0)];
}

const NOUN: Record<BaseType, Noun> = {
  head: { word: 'Heaume', g: 'm' },
  chest: { word: 'Plastron', g: 'm' },
  legs: { word: 'Pantalon', g: 'm' },
  hands: { word: 'Gants', g: 'm', plural: true },
  feet: { word: 'Bottes', g: 'f', plural: true },
  ring: { word: 'Anneau', g: 'm', vowel: true },
  neck: { word: 'Amulette', g: 'f', vowel: true },
  sword: { word: 'Épée', g: 'f', vowel: true },
  axe: { word: 'Hache', g: 'f' },
  mace: { word: 'Masse', g: 'f' },
  dagger: { word: 'Dague', g: 'f' },
  wand: { word: 'Baguette', g: 'f' },
  greatsword: { word: 'Grande épée', g: 'f' },
  greataxe: { word: 'Grande hache', g: 'f' },
  staff: { word: 'Bâton', g: 'm' },
  bow: { word: 'Arc', g: 'm', vowel: true },
  shield: { word: 'Bouclier', g: 'm' },
  tome: { word: 'Grimoire', g: 'm' },
};

/** A material is either a phrase ("en fer") or an adjective ("elfique"). */
type Material = string | Adj;

const ASTRAL = adj('astral', 'astrale', 'astraux', 'astrales');
const RUNED = adj('runique');

const MATERIALS: Record<'jewelry' | 'wood' | 'tome' | 'metal', Material[]> = {
  jewelry: ['en cuivre', 'en argent', 'en or', adj('lunaire'), "d'émeraude", 'de saphir', adj('étoilé', 'étoilée')],
  wood: ['de chêne', 'de frêne', "d'if", 'de sureau', 'des Murmures', 'de séquoia', ASTRAL],
  tome: [adj('poussiéreux', 'poussiéreuse'), adj('lumineux', 'lumineuse'), RUNED, adj('ancien', 'ancienne'),
    adj('feuillu', 'feuillue'), adj('mystique'), adj('céleste')],
  metal: ['en cuivre', 'en fer', 'en acier', 'en mithril', adj('elfique'), RUNED, ASTRAL],
};

function materialFor(base: BaseType, ilvl: number): Material {
  const tier = materialTier(ilvl);
  if (base === 'ring' || base === 'neck') return MATERIALS.jewelry[tier];
  if (base === 'staff' || base === 'wand' || base === 'bow') return MATERIALS.wood[tier];
  if (base === 'tome') return MATERIALS.tome[tier];
  return MATERIALS.metal[tier];
}

/** French for each English prefix word in items.ts PREFIX. */
const PREFIX_FR: Record<string, Adj> = {
  Mighty: adj('puissant', 'puissante'),
  Brutal: adj('brutal', 'brutale', 'brutaux', 'brutales'),
  Strong: adj('fort', 'forte'),
  Wise: adj('sage'),
  Arcane: adj('magique'),
  Clever: adj('futé', 'futée'),
  Swift: adj('rapide'),
  Nimble: adj('agile'),
  Quick: adj('vif', 'vive'),
  Sturdy: adj('solide'),
  Hearty: adj('vaillant', 'vaillante'),
  Tough: adj('coriace'),
  Reinforced: adj('renforcé', 'renforcée'),
  Guarding: adj('gardien', 'gardienne'),
  Plated: adj('blindé', 'blindée'),
  Keen: adj('affûté', 'affûtée'),
  Lucky: adj('chanceux', 'chanceuse', 'chanceux', 'chanceuses'),
  Sharp: adj('tranchant', 'tranchante'),
};

const SUFFIX_FR: Record<StatKey, string> = {
  str: "de l'Ours", int: 'du Hibou', agi: 'du Renard', sta: 'de la Tortue', armor: 'du Rempart', crit: 'du Tigre',
};

const LEGENDARY_FR: Record<string, Adj> = {
  Royal: adj('royal', 'royale', 'royaux', 'royales'),
  Golden: adj('doré', 'dorée'),
  Mighty: adj('puissant', 'puissante'),
  Crowned: adj('couronné', 'couronnée'),
};

const MYTHIC_FR: Record<string, Material> = {
  Starforged: adj('stellaire'),
  Eternal: adj('éternel', 'éternelle'),
  Dragonbone: 'en os de dragon',
};

/** Shorter stand-in for "en os de dragon" on long nouns. */
const DRACONIC = adj('draconique');

const MAX_LEN = 40;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pickBy<T>(list: T[], seed: string): T {
  return list[hash(seed) % list.length];
}

function de(name: string): string {
  return /^[aeiouyhéèêàâîôûAEIOUYHÉÈÊ]/.test(name) ? `d'${name}` : `de ${name}`;
}

function lower(word: string): string {
  return word.charAt(0).toLowerCase() + word.slice(1);
}

function matText(m: Material, n: Noun): string {
  return typeof m === 'string' ? m : agree(m, n);
}

/** Stats sorted from biggest to smallest, as makeItem() does. */
function topStats(item: Item): StatKey[] {
  return (Object.entries(item.stats ?? {}) as [StatKey, number][]).sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

function frenchName(item: Item): string {
  const base = item.base;
  const n = NOUN[base] ?? { word: BASE_NAME[base] ?? '?', g: 'm' };
  const en = item.name ?? '';
  const set = item.set ? SETS.find((s) => s.id === item.set) : undefined;
  if (set) return `${n.word} ${set.fr}`;

  // Starter gear: "Old Sword" -> "Vieille épée".
  if (en === `Old ${BASE_NAME[base]}`) {
    const old = n.g === 'f' ? (n.plural ? 'Vieilles' : 'Vieille') : n.plural ? 'Vieux' : n.vowel ? 'Vieil' : 'Vieux';
    return `${old} ${lower(n.word)}`;
  }

  if (item.rarity === 'legendary') {
    // "Grukk's Golden Helm" -> "Heaume doré de Grukk"
    const m = /^(.+?)'s (\w+) /.exec(en);
    const owner = m?.[1] ?? 'Grukk';
    const a = LEGENDARY_FR[m?.[2] ?? ''] ?? pickBy(Object.values(LEGENDARY_FR), item.id);
    return `${n.word} ${agree(a, n)} ${de(owner)}`;
  }

  if (item.rarity === 'mythic') {
    // "Eternal Axe of Gnarlroot" -> "Hache éternelle de Gnarlroot"
    const owner = / of (.+)$/.exec(en)?.[1] ?? 'Grukk';
    const mat = MYTHIC_FR[en.split(' ')[0]] ?? pickBy(Object.values(MYTHIC_FR), item.id);
    const name = `${n.word} ${matText(mat, n)} ${de(owner)}`;
    return name.length > MAX_LEN ? `${n.word} ${agree(DRACONIC, n)} ${de(owner)}` : name;
  }

  // Common to epic: [noun] [prefix] [material] [suffix]
  const rank = RARITY[item.rarity]?.rank ?? 0;
  const top = topStats(item);
  let prefix: Adj | undefined;
  if (rank >= 1) {
    const first = en.split(' ')[0];
    prefix = PREFIX_FR[first];
    if (!prefix && top[0]) prefix = PREFIX_FR[pickBy(PREFIX[top[0]], item.id)];
  }
  let suffixKey = (Object.keys(SUFFIX) as StatKey[]).find((k) => en.endsWith(' ' + SUFFIX[k]));
  if (!suffixKey && rank >= 2 && top[1] && !en) suffixKey = top[1];
  const suffix = suffixKey ? SUFFIX_FR[suffixKey] : '';

  const mat = materialFor(base, item.ilvl ?? 1);
  const build = (withPrefix: boolean, withMat: boolean): string => {
    const words = [n.word];
    const p = withPrefix && prefix ? agree(prefix, n) : '';
    const m = withMat ? matText(mat, n) : '';
    // Adjective materials go right after the noun ("Épée elfique rapide"),
    // phrases go after the adjective ("Épée rapide en fer").
    if (typeof mat === 'string') words.push(p, m);
    else words.push(m, p);
    if (suffix) words.push(suffix);
    return words.filter(Boolean).join(' ');
  };
  let name = build(true, true);
  if (name.length > MAX_LEN) name = build(false, true);
  if (name.length > MAX_LEN) name = build(false, false);
  return name;
}

export function itemName(item: Item): string {
  if (getLang() !== 'fr') return item.name;
  return frenchName(item);
}
