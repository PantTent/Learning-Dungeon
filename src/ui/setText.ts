// Text for item sets in the current language.
import { SET_STEPS, type SetBonus, type SetDef } from '../data/sets';
import { getLang, tr } from '../i18n';

export function setName(set: SetDef): string {
  // French set names read best as "Ensemble du Cœur sauvage".
  return getLang() === 'fr' ? `Ensemble ${set.fr}` : set.name;
}

export function bonusText(b: SetBonus): string {
  const parts: string[] = [];
  if (b.hpPct) parts.push(tr('+{n}% health', { n: b.hpPct }));
  if (b.mpPct) parts.push(tr('+{n}% mana', { n: b.mpPct }));
  if (b.powerPct) parts.push(tr('+{n}% damage', { n: b.powerPct }));
  if (b.armorPct) parts.push(tr('+{n}% armor', { n: b.armorPct }));
  if (b.crit) parts.push(tr('+{n}% crit', { n: b.crit }));
  return parts.join(', ');
}

/** "(3) +10% armor" lines, one per bonus step. */
export function setBonusLines(set: SetDef): { pieces: number; text: string }[] {
  return set.bonuses.map((b, i) => ({ pieces: SET_STEPS[i], text: tr('({n}) {bonus}', { n: SET_STEPS[i], bonus: bonusText(b) }) }));
}
