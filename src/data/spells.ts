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
    s('bash1', 'Shield Bash I', 3, 'stun', 1.2, 'slash', 'Bash and stun an enemy for a turn.', { melee: true }),
    s('cleave1', 'Cleave I', 5, 'aoe', 0.8, 'slash', 'Swing through ALL enemies.', { melee: true }),
    s('heroic1', 'Heroic Strike I', 7, 'damage', 1.7, 'slash', 'A mighty overhead strike.', { melee: true }),
    s('cleave2', 'Cleave II', 9, 'aoe', 1.0, 'slash', 'A wider, harder cleave.', { melee: true }),
    s('bash2', 'Shield Bash II', 11, 'stun', 1.6, 'slash', 'A crushing bash that stuns.', { melee: true }),
    s('execute1', 'Execute I', 13, 'damage', 2.2, 'slash', 'A huge finishing blow.', { melee: true }),
    s('cleave3', 'Cleave III', 15, 'aoe', 1.25, 'slash', 'A whirlwind cleave.', { melee: true }),
    s('heroic2', 'Heroic Strike II', 17, 'damage', 2.4, 'slash', 'A legendary strike.', { melee: true }),
    s('execute2', 'Execute II', 19, 'damage', 2.8, 'slash', 'The biggest hit a warrior can land.', { melee: true }),
  ],
  mage: [
    s('firebolt', 'Firebolt', 1, 'damage', 1, 'fire', 'Throw a bolt of fire.'),
    s('frostbolt1', 'Frost Bolt I', 3, 'stun', 1.2, 'frost', 'Ice that freezes an enemy for a turn.'),
    s('missiles1', 'Arcane Missiles I', 5, 'damage', 1.5, 'arcane', 'A burst of magic missiles.'),
    s('chain1', 'Chain Lightning I', 7, 'aoe', 0.85, 'lightning', 'Lightning jumps between ALL enemies.'),
    s('fireball', 'Fireball', 9, 'damage', 2.0, 'fire', 'A big exploding ball of fire.', { anim: 'orb' }),
    s('blizzard1', 'Blizzard I', 11, 'aoe', 1.05, 'frost', 'Ice storm on ALL enemies. Might freeze them!', { stunChance: 0.3, anim: 'snow' }),
    s('flamewave', 'Flame Wave', 13, 'aoe', 1.15, 'fire', 'A wave of fire hits ALL enemies.'),
    s('chain2', 'Chain Lightning II', 15, 'aoe', 1.2, 'lightning', 'Stronger chain lightning.'),
    s('arcaneblast', 'Arcane Blast', 17, 'damage', 2.6, 'arcane', 'A massive blast of pure magic.', { anim: 'orb' }),
    s('blizzard2', 'Blizzard II', 19, 'aoe', 1.45, 'frost', 'A huge blizzard. Might freeze them!', { stunChance: 0.4, anim: 'snow' }),
  ],
  ranger: [
    s('shoot', 'Shoot', 1, 'damage', 1, 'arrow', 'Fire an arrow.'),
    s('aimed1', 'Aimed Shot I', 3, 'damage', 1.4, 'arrow', 'Take careful aim.'),
    s('multi1', 'Multi-Shot I', 5, 'aoe', 0.8, 'arrow', 'Arrows hit ALL enemies.'),
    s('concuss1', 'Concussive Shot I', 7, 'stun', 1.2, 'arrow', 'A shot that stuns for a turn.'),
    s('aimed2', 'Aimed Shot II', 9, 'damage', 1.9, 'arrow', 'An even more careful shot.'),
    s('multi2', 'Multi-Shot II', 11, 'aoe', 1.0, 'arrow', 'More arrows for ALL enemies.'),
    s('rapid', 'Rapid Fire', 13, 'damage', 2.2, 'arrow', 'A super-fast volley.'),
    s('concuss2', 'Concussive Shot II', 15, 'stun', 1.7, 'arrow', 'A heavy stunning shot.'),
    s('multi3', 'Multi-Shot III', 17, 'aoe', 1.3, 'arrow', 'A storm of arrows on ALL enemies.'),
    s('aimed3', 'Aimed Shot III', 19, 'damage', 2.8, 'arrow', 'The perfect shot.'),
  ],
  paladin: [
    s('crusader', 'Crusader Strike', 1, 'damage', 1, 'holy', 'A strike blessed with light.', { melee: true }),
    s('holylight1', 'Holy Light I', 3, 'heal', 0.35, 'heal', 'Heal yourself.'),
    s('judge1', 'Judgement I', 5, 'stun', 1.3, 'holy', 'Holy hit that stuns for a turn.'),
    s('consecrate1', 'Consecration I', 7, 'aoe', 0.85, 'holy', 'Holy ground burns ALL enemies.'),
    s('holylight2', 'Holy Light II', 9, 'heal', 0.5, 'heal', 'A stronger heal.'),
    s('hammer1', 'Hammer of Wrath I', 11, 'damage', 2.0, 'holy', 'Throw a glowing hammer.'),
    s('judge2', 'Judgement II', 13, 'stun', 1.8, 'holy', 'A bigger stunning judgement.'),
    s('consecrate2', 'Consecration II', 15, 'aoe', 1.15, 'holy', 'Blazing holy ground.'),
    s('holylight3', 'Holy Light III', 17, 'heal', 0.7, 'heal', 'A huge heal.'),
    s('hammer2', 'Hammer of Wrath II', 19, 'damage', 2.7, 'holy', 'A giant holy hammer.'),
  ],
  necromancer: [
    s('shadowbolt', 'Shadow Bolt', 1, 'damage', 1, 'shadow', 'A bolt of shadow.'),
    s('raise1', 'Raise Skeleton I', 3, 'summon', 0.6, 'shadow', 'A skeleton joins you and follows you into every fight.'),
    s('drain1', 'Drain Life I', 5, 'drain', 1.2, 'shadow', 'Steal health from an enemy.'),
    s('spikes1', 'Bone Spikes I', 7, 'aoe', 0.85, 'shadow', 'Spikes of bone hit ALL enemies.'),
    s('lance1', 'Shadow Lance I', 9, 'damage', 1.8, 'shadow', 'A spear of darkness.'),
    s('raise2', 'Raise Skeleton II', 11, 'summon', 0.85, 'shadow', 'A tougher skeleton warrior.'),
    s('drain2', 'Drain Life II', 13, 'drain', 1.7, 'shadow', 'Steal lots of health.'),
    s('spikes2', 'Bone Spikes II', 15, 'aoe', 1.15, 'shadow', 'Bigger bone spikes.'),
    s('lance2', 'Shadow Lance II', 17, 'damage', 2.4, 'shadow', 'A huge spear of darkness.'),
    s('raise3', 'Raise Skeleton III', 19, 'summon', 1.1, 'shadow', 'A skeleton champion.'),
  ],
  druid: [
    s('wrath', 'Wrath', 1, 'damage', 1, 'nature', 'A blast of nature energy.'),
    s('rejuv1', 'Rejuvenate I', 3, 'heal', 0.35, 'heal', 'Heal yourself with nature.'),
    s('entangle1', 'Entangle I', 5, 'stun', 1.2, 'nature', 'Vines hold an enemy for a turn.'),
    s('thorns1', 'Thorn Storm I', 7, 'aoe', 0.9, 'nature', 'Thorns hit ALL enemies.'),
    s('moonfire1', 'Moonfire I', 9, 'damage', 1.8, 'arcane', 'A beam of moonlight.'),
    s('rejuv2', 'Rejuvenate II', 11, 'heal', 0.55, 'heal', 'A stronger heal.'),
    s('thorns2', 'Thorn Storm II', 13, 'aoe', 1.15, 'nature', 'A bigger thorn storm.'),
    s('entangle2', 'Entangle II', 15, 'stun', 1.7, 'nature', 'Huge vines that crush and hold.'),
    s('moonfire2', 'Moonfire II', 17, 'damage', 2.4, 'arcane', 'A blazing moonbeam.'),
    s('rejuv3', 'Rejuvenate III', 19, 'heal', 0.75, 'heal', 'A huge heal from the forest.'),
  ],
  demonologist: [
    s('felbolt', 'Fel Bolt', 1, 'damage', 1, 'fel', 'A bolt of green fire.'),
    s('imp1', 'Summon Imp I', 3, 'summon', 0.65, 'fel', 'An imp joins you and follows you into every fight.'),
    s('hellfire1', 'Hellfire I', 5, 'aoe', 0.85, 'fel', 'Green fire hits ALL enemies.'),
    s('soul1', 'Drain Soul I', 7, 'drain', 1.3, 'shadow', 'Steal health from an enemy.'),
    s('chaos1', 'Chaos Bolt I', 9, 'damage', 1.9, 'fel', 'A wild bolt of chaos.'),
    s('imp2', 'Summon Imp II', 11, 'summon', 0.9, 'fel', 'A bigger, tougher imp.'),
    s('hellfire2', 'Hellfire II', 13, 'aoe', 1.1, 'fel', 'Hotter green fire.'),
    s('chaos2', 'Chaos Bolt II', 15, 'damage', 2.4, 'fel', 'A huge chaos bolt.'),
    s('hellfire3', 'Hellfire III', 17, 'aoe', 1.4, 'fel', 'A firestorm on ALL enemies.'),
    s('imp3', 'Summon Imp III', 19, 'summon', 1.15, 'fel', 'An imp lord!'),
  ],
};

/** The 3 spells a hero brings into battle (not counting the free basic attack). */
export const MAX_CHOSEN = 3;

export function unlockedSpells(list: SkillDef[], level: number): SkillDef[] {
  return list.filter((s) => s.unlock <= level);
}

/**
 * Chosen spells that are unlocked, in order. If the hero has never chosen,
 * default to the 3 newest unlocked spells.
 */
export function chosenSpells(list: SkillDef[], level: number, chosen: string[] | undefined): SkillDef[] {
  const unlocked = unlockedSpells(list, level).slice(1);
  if (!chosen) return unlocked.slice(-MAX_CHOSEN);
  return chosen.map((id) => unlocked.find((s) => s.id === id)).filter((s): s is SkillDef => !!s).slice(0, MAX_CHOSEN);
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
  return name ? { ...pw, name } : pw;
}
