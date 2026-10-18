// How a spell's name is shown: "Cleave III" for spells with ranks, and just
// "Shield Bash" when there's only one rank.
import type { SkillDef } from '../data/classes';
import { familyName, isRanked } from '../data/spells';
import { tr } from '../i18n';

export function spellLabel(list: SkillDef[], sk: SkillDef): string {
  const name = tr(sk.name);
  return isRanked(list, sk) ? name : familyName(name);
}
