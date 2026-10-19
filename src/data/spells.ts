// Every class's spell list. A new spell (or a stronger rank of one) unlocks
// every 2 levels; the hero picks 3 to bring into battle (plus the free basic
// attack). Stronger spells cost much more mana.
import type { ClassDef, Fx, PowerDef, SkillDef } from './classes';

type Kind = SkillDef['kind'];

/** Mana cost grows with power, area effect and the level the spell unlocks at. */
export function manaCost(kind: Kind, power: number, unlock: number): number {
  if (unlock <= 1) return 0;
  const base = kind === 'aoe' ? power * 7 : kind === 'heal' ? power * 22 : kind === 'summon' ? 10 : power * 5;
  return Math.round(base + unlock * 0.8);
}

function s(
  id: string,
  name: string,
  unlock: number,
  kind: Kind,
  power: number,
  fx: Fx,
  desc: string,
  extra: Partial<SkillDef> = {},
): SkillDef {
  return { id, name, unlock, kind, power, fx, desc, mp: manaCost(kind, power, unlock), ...extra };
}

export const SPELL_LISTS: Record<string, SkillDef[]> = {
  warrior: [
    s('strike', 'Strike', 1, 'damage', 1, 'slash', 'A strong sword swing.', { melee: true }),
    s('bash1', 'Shield Bash I', 3, 'stun', 1.2, 'slash', 'Bash and stun an enemy for a turn.', { melee: true, anim: 'bash' }),
    s('cleave1', 'Cleave I', 5, 'aoe', 0.75, 'slash', 'Swing through ALL enemies.', { melee: true, anim: 'cleave' }),
    s('heroic1', 'Heroic Strike I', 7, 'damage', 1.7, 'slash', 'A mighty overhead strike.', { melee: true, anim: 'heroic' }),
    s('cleave2', 'Cleave II', 9, 'aoe', 0.9, 'slash', 'A wider, harder cleave.', { melee: true, anim: 'cleave' }),
    s('thunderclap', 'Thunder Clap', 11, 'aoe', 1.0, 'lightning', 'Slam the ground: thunder hits ALL enemies.', { melee: true, anim: 'thunderclap' }),
    s('execute1', 'Execute I', 13, 'damage', 2.2, 'slash', 'A huge finishing blow.', { melee: true, anim: 'execute' }),
    s('cleave3', 'Cleave III', 15, 'aoe', 1.05, 'slash', 'A whirlwind cleave.', { melee: true, anim: 'cleave' }),
    s('stormstrike', 'Storm Strike', 17, 'damage', 2.4, 'lightning', 'A sword strike charged with lightning.', { melee: true, anim: 'storm' }),
    s('execute2', 'Execute II', 19, 'damage', 2.8, 'slash', 'The biggest hit a warrior can land.', { melee: true, anim: 'execute' }),
  ],
  mage: [
    s('firebolt', 'Firebolt', 1, 'damage', 1, 'fire', 'Throw a bolt of fire.'),
    s('frostbolt1', 'Frost Bolt I', 3, 'stun', 1.2, 'frost', 'Ice that freezes an enemy for a turn.'),
    s('missiles1', 'Arcane Missiles I', 5, 'damage', 1.5, 'arcane', 'A burst of magic missiles.'),
    s('chain1', 'Chain Lightning', 7, 'aoe', 0.85, 'lightning', 'Lightning jumps between ALL enemies.'),
    s('fireball', 'Fireball', 9, 'damage', 2.0, 'fire', 'A big exploding ball of fire.', { anim: 'orb' }),
    s('blizzard1', 'Blizzard I', 11, 'aoe', 1.05, 'frost', 'Ice storm on ALL enemies. Might freeze them!', { stunChance: 0.3, anim: 'snow' }),
    s('flamewave', 'Flame Wave', 13, 'aoe', 1.15, 'fire', 'A wave of fire hits ALL enemies.'),
    s('thunderbolt', 'Thunderbolt', 15, 'damage', 2.1, 'lightning', 'A huge bolt of lightning from the sky.'),
    s('arcaneblast', 'Arcane Blast', 17, 'damage', 2.6, 'arcane', 'A massive blast of pure magic.', { anim: 'orb' }),
    s('blizzard2', 'Blizzard II', 19, 'aoe', 1.45, 'frost', 'A huge blizzard. Might freeze them!', { stunChance: 0.4, anim: 'snow' }),
  ],
  ranger: [
    s('shoot', 'Shoot', 1, 'damage', 1, 'arrow', 'Fire an arrow.'),
    s('aimed1', 'Aimed Shot I', 3, 'damage', 1.4, 'arrow', 'Take careful aim.', { anim: 'aimed' }),
    s('multi1', 'Multi-Shot I', 5, 'aoe', 0.8, 'arrow', 'Arrows hit ALL enemies.', { anim: 'multishot' }),
    s('concuss1', 'Concussive Shot I', 7, 'stun', 1.2, 'arrow', 'A shot that stuns for a turn.', { anim: 'concuss' }),
    s('venom', 'Venom Shot', 9, 'damage', 1.9, 'nature', 'A poison arrow that hits hard.', { anim: 'venom' }),
    s('multi2', 'Multi-Shot II', 11, 'aoe', 1.0, 'arrow', 'More arrows for ALL enemies.', { anim: 'multishot' }),
    s('rapid', 'Rapid Fire', 13, 'damage', 2.2, 'arrow', 'A super-fast volley.', { anim: 'rapid' }),
    s('concuss2', 'Concussive Shot II', 15, 'stun', 1.7, 'arrow', 'A heavy stunning shot.', { anim: 'concuss' }),
    s('thornvolley', 'Thorn Volley', 17, 'aoe', 1.3, 'nature', 'Thorny arrows rain on ALL enemies.', { anim: 'thornvolley' }),
    s('aimed3', 'Aimed Shot II', 19, 'damage', 2.8, 'arrow', 'The perfect shot.', { anim: 'aimed' }),
  ],
  paladin: [
    s('crusader', 'Crusader Strike', 1, 'damage', 1, 'holy', 'A strike blessed with light.', { melee: true, anim: 'crusader' }),
    s('holylight1', 'Holy Light I', 3, 'heal', 0.35, 'heal', 'Heal yourself.', { anim: 'holylight' }),
    s('judge1', 'Judgement I', 5, 'stun', 1.3, 'holy', 'Holy hit that stuns for a turn.', { anim: 'judge' }),
    s('consecrate1', 'Consecration I', 7, 'aoe', 0.85, 'holy', 'Holy ground burns ALL enemies.', { anim: 'consecrate' }),
    s('holylight2', 'Holy Light II', 9, 'heal', 0.5, 'heal', 'A stronger heal.', { anim: 'holylight' }),
    s('sunfire', 'Sunfire', 11, 'damage', 2.0, 'fire', "Burn an enemy with the sun's fire.", { anim: 'sunfire' }),
    s('judge2', 'Judgement II', 13, 'stun', 1.8, 'holy', 'A bigger stunning judgement.', { anim: 'judge' }),
    s('flamestrike', 'Flame Strike', 15, 'aoe', 1.15, 'fire', 'A pillar of fire hits ALL enemies.', { anim: 'flamestrike' }),
    s('holylight3', 'Holy Light III', 17, 'heal', 0.7, 'heal', 'A huge heal.', { anim: 'holylight' }),
    s('hammer2', 'Hammer of Wrath', 19, 'damage', 2.7, 'holy', 'A giant glowing holy hammer.', { anim: 'hammerthrow' }),
  ],
  necromancer: [
    s('shadowbolt', 'Shadow Bolt', 1, 'damage', 1, 'shadow', 'A bolt of shadow.'),
    s('raise1', 'Raise Skeleton I', 3, 'summon', 0.6, 'shadow', 'A skeleton joins you and follows you into every fight.', { anim: 'raise' }),
    s('drain1', 'Drain Life I', 5, 'drain', 1.2, 'shadow', 'Steal health from an enemy.', { anim: 'drain' }),
    s('spikes1', 'Bone Spikes I', 7, 'aoe', 0.85, 'shadow', 'Spikes of bone hit ALL enemies.', { anim: 'bonespikes' }),
    s('chill', 'Chilling Touch', 9, 'stun', 1.7, 'frost', 'Icy grave-cold that freezes an enemy.', { anim: 'chill' }),
    s('raise2', 'Raise Skeleton II', 11, 'summon', 0.85, 'shadow', 'A tougher skeleton warrior.', { anim: 'raise' }),
    s('drain2', 'Drain Life II', 13, 'drain', 1.7, 'shadow', 'Steal lots of health.', { anim: 'drain' }),
    s('gravefrost', 'Grave Frost', 15, 'aoe', 1.15, 'frost', 'A freezing storm on ALL enemies. Might freeze them!', { stunChance: 0.3, anim: 'gravefrost' }),
    s('lance2', 'Shadow Lance', 17, 'damage', 2.4, 'shadow', 'A huge spear of darkness.', { anim: 'lance' }),
    s('raise3', 'Raise Skeleton III', 19, 'summon', 1.1, 'shadow', 'A skeleton champion.', { anim: 'raise' }),
  ],
  druid: [
    s('wrath', 'Wrath', 1, 'damage', 1, 'nature', 'A blast of nature energy.'),
    s('rejuv1', 'Rejuvenate I', 3, 'heal', 0.35, 'heal', 'Heal yourself with nature.', { anim: 'rejuv' }),
    s('entangle1', 'Entangle I', 5, 'stun', 1.2, 'nature', 'Vines hold an enemy for a turn.', { anim: 'entangle' }),
    s('thorns1', 'Thorn Storm I', 7, 'aoe', 0.9, 'nature', 'Thorns hit ALL enemies.', { anim: 'thornstorm' }),
    s('moonfire1', 'Moonfire', 9, 'damage', 1.8, 'arcane', 'A beam of moonlight.', { anim: 'moonfire' }),
    s('rejuv2', 'Rejuvenate II', 11, 'heal', 0.55, 'heal', 'A stronger heal.', { anim: 'rejuv' }),
    s('thorns2', 'Thorn Storm II', 13, 'aoe', 1.15, 'nature', 'A bigger thorn storm.', { anim: 'thornstorm' }),
    s('entangle2', 'Entangle II', 15, 'stun', 1.7, 'nature', 'Huge vines that crush and hold.', { anim: 'entangle' }),
    s('starsurge', 'Starsurge', 17, 'aoe', 1.3, 'arcane', 'Falling stars hit ALL enemies.', { anim: 'starsurge' }),
    s('rejuv3', 'Rejuvenate III', 19, 'heal', 0.75, 'heal', 'A huge heal from the forest.', { anim: 'rejuv' }),
  ],
  demonologist: [
    s('felbolt', 'Fel Bolt', 1, 'damage', 1, 'fel', 'A bolt of green fire.'),
    s('imp1', 'Summon Imp I', 3, 'summon', 0.65, 'fel', 'An imp joins you and follows you into every fight.'),
    s('hellfire1', 'Hellfire I', 5, 'aoe', 0.85, 'fel', 'Green fire hits ALL enemies.'),
    s('soul1', 'Drain Soul', 7, 'drain', 1.3, 'shadow', 'Steal health from an enemy.'),
    s('chaos1', 'Chaos Bolt', 9, 'damage', 1.9, 'fel', 'A wild bolt of chaos.'),
    s('imp2', 'Summon Imp II', 11, 'summon', 0.9, 'fel', 'A bigger, tougher imp.'),
    s('hellfire2', 'Hellfire II', 13, 'aoe', 1.1, 'fel', 'Hotter green fire.'),
    s('shadowfury', 'Shadowfury', 15, 'aoe', 1.2, 'shadow', 'Shadows blast ALL enemies. Might stun them!', { stunChance: 0.25 }),
    s('hellfire3', 'Hellfire III', 17, 'aoe', 1.4, 'fel', 'A firestorm on ALL enemies.'),
    s('imp3', 'Summon Imp III', 19, 'summon', 1.15, 'fel', 'An imp lord!'),
  ],
};

/** The 3 spells a hero brings into battle (not counting the free basic attack). */
export const MAX_CHOSEN = 3;

export function unlockedSpells(list: SkillDef[], level: number): SkillDef[] {
  return list.filter((s) => s.unlock <= level);
}

// ---------------------------------------------------------------- families
// Ranks of the same spell (Cleave I, II, III) form one family. The hero picks
// the family, and always casts its highest rank they have unlocked.

/** "cleave2" -> "cleave". */
export function familyOf(id: string): string {
  return id.replace(/\d+$/, '');
}

/** "Cleave III" -> "Cleave". */
export function familyName(name: string): string {
  return name.replace(/\s+(I|II|III|IV|V)$/, '');
}

export interface SpellFamily {
  id: string;
  /** Ranks, weakest first. */
  ranks: SkillDef[];
}

/** The class's spell families (without the free basic attack), in unlock order. */
export function families(list: SkillDef[]): SpellFamily[] {
  const out: SpellFamily[] = [];
  for (const sk of list.slice(1)) {
    const id = familyOf(sk.id);
    const fam = out.find((f) => f.id === id);
    if (fam) fam.ranks.push(sk);
    else out.push({ id, ranks: [sk] });
  }
  for (const f of out) f.ranks.sort((a, b) => a.unlock - b.unlock);
  return out;
}

/** The strongest rank unlocked at this level (undefined = not unlocked yet). */
export function bestRank(fam: SpellFamily, level: number): SkillDef | undefined {
  return [...fam.ranks].reverse().find((r) => r.unlock <= level);
}

/** The next rank still to unlock, if any. */
export function nextRank(fam: SpellFamily, level: number): SkillDef | undefined {
  return fam.ranks.find((r) => r.unlock > level);
}

/**
 * The spells brought into battle, each at its best unlocked rank. `chosen`
 * holds family ids (older saves may hold spell ids like "cleave1"; they
 * count as their family). If the hero never chose, use the 3 newest.
 */
export function chosenSpells(list: SkillDef[], level: number, chosen: string[] | undefined): SkillDef[] {
  const fams = families(list);
  const ready = fams.map((f) => ({ f, best: bestRank(f, level) })).filter((x): x is { f: SpellFamily; best: SkillDef } => !!x.best);
  if (!chosen) {
    return ready
      .sort((a, b) => b.best.unlock - a.best.unlock)
      .slice(0, MAX_CHOSEN)
      .sort((a, b) => fams.indexOf(a.f) - fams.indexOf(b.f))
      .map((x) => x.best);
  }
  const ids = [...new Set(chosen.map(familyOf))];
  return ids.map((id) => ready.find((x) => x.f.id === id)?.best).filter((s): s is SkillDef => !!s).slice(0, MAX_CHOSEN);
}

/** A summoned pet's share of the hero's health (about 1/3, more at higher ranks). */
export function petHealthShare(sk: SkillDef): number {
  const rank = Number(/(\d)$/.exec(sk.id)?.[1] ?? 1);
  return 0.28 + rank * 0.04;
}

/** True when the spell has more than one rank (so "I / II / III" means something). */
export function isRanked(list: SkillDef[], sk: SkillDef): boolean {
  return list.filter((x) => familyOf(x.id) === familyOf(sk.id)).length > 1;
}

/** Saved choice as family ids (for older saves that stored spell ids). */
export function chosenFamilies(list: SkillDef[], level: number, chosen: string[] | undefined): string[] {
  return chosenSpells(list, level, chosen).map((s) => familyOf(s.id));
}

/** Ultimate (power attack) for each spell school. */
export const SCHOOL_POWERS: Partial<Record<Fx, PowerDef>> = {
  slash: { fx: 'slash', name: 'Whirlwind Slam', style: 'whirlwind', color: 0xff6040, css: '#ff7a5a' },
  fire: { fx: 'fire', name: 'Meteor', style: 'meteor', color: 0xff8a2a, css: '#ffa040' },
  frost: { fx: 'frost', name: 'Glacier Crash', style: 'ice', color: 0x8fd8ff, css: '#9fe0ff' },
  arcane: { fx: 'arcane', name: 'Arcane Nova', style: 'nova', color: 0xc060ff, css: '#d08aff' },
  lightning: { fx: 'lightning', name: 'Thunderstorm', style: 'thunder', color: 0x9ad0ff, css: '#bfe8ff' },
  arrow: { fx: 'arrow', name: 'Arrow Storm', style: 'arrowstorm', color: 0x9aff6a, css: '#a8ff7a' },
  holy: { fx: 'holy', name: 'Divine Hammer', style: 'hammer', color: 0xffe066, css: '#ffe066' },
  shadow: { fx: 'shadow', name: 'Shadow Nova', style: 'nova', color: 0x9a4aff, css: '#b88aff' },
  nature: { fx: 'nature', name: 'Wrath of the Wild', style: 'vines', color: 0x6ad04a, css: '#8aff6a' },
  fel: { fx: 'fel', name: 'Infernal', style: 'infernal', color: 0x5aff4a, css: '#7aff6a' },
};

/** A few class-flavored names for the same school. */
const CLASS_POWER_NAMES: Record<string, Partial<Record<Fx, string>>> = {
  druid: { arcane: 'Starfall' },
  warrior: { lightning: 'Thunder Crash' },
  ranger: { nature: 'Call of the Wild' },
  paladin: { fire: 'Wrath of the Sun' },
  necromancer: { frost: 'Frozen Tomb' },
  demonologist: { shadow: 'Void Rift' },
};

/**
 * The ultimate depends on the hero's chosen spells: the school most of them
 * use wins (healing doesn't count). Ties and no spells fall back to the
 * class's own ultimate.
 */
export function activePower(cls: ClassDef, level: number, chosen: string[] | undefined): PowerDef {
  const counts = new Map<Fx, number>();
  for (const sp of chosenSpells(cls.skills, level, chosen)) {
    if (sp.fx === 'heal' || !SCHOOL_POWERS[sp.fx]) continue;
    counts.set(sp.fx, (counts.get(sp.fx) ?? 0) + 1);
  }
  const best = Math.max(0, ...counts.values());
  if (best === 0) return cls.power;
  const top = [...counts.entries()].filter(([, n]) => n === best).map(([fx]) => fx);
  if (cls.power.fx && top.includes(cls.power.fx)) return cls.power;
  if (top.length > 1) return cls.power;
  const fx = top[0];
  // Necromancers raise an army for shadow magic.
  if (fx === 'shadow' && cls.id === 'necromancer') return cls.power;
  const pw = SCHOOL_POWERS[fx]!;
  const name = CLASS_POWER_NAMES[cls.id]?.[fx];
  // Rangers call spirit animals instead of plain vines.
  if (cls.id === 'ranger' && fx === 'nature') return { ...pw, name: name!, style: 'wild' };
  // Druids call down a night sky full of stars.
  if (cls.id === 'druid' && fx === 'arcane') return { ...pw, name: name!, style: 'starfall' };
  // Necromancers lock the enemy in a tomb of ice.
  if (cls.id === 'necromancer' && fx === 'frost') return { ...pw, name: name!, style: 'tomb' };
  return name ? { ...pw, name } : pw;
}
