// Picture help for simple math: after a wrong answer, "8 + 2" is shown as
// 8 apples and 2 more apples moving together, with a voice telling the story.
// Only for small numbers (the early grades, or anyone who drops down to them).
import { getLang, tr } from '../i18n';

export type VisualOp = 'add' | 'missing' | 'sub' | 'mul' | 'div';

export interface MathVisual {
  op: VisualOp;
  /** add: a + b = r. missing: a + ? = r (b is the answer). sub: a - b = r. mul: a groups of b = r. div: a shared into b groups = r each. */
  a: number;
  b: number;
  r: number;
}

/** Things to count, with sprite and names (one / many). */
export interface Thing {
  sprite: string;
  en: [string, string];
  fr: [string, string];
}

export const THINGS: Thing[] = [
  { sprite: 'item_apple', en: ['apple', 'apples'], fr: ['pomme', 'pommes'] },
  { sprite: 'item_muffin', en: ['muffin', 'muffins'], fr: ['muffin', 'muffins'] },
  { sprite: 'item_strawberry', en: ['strawberry', 'strawberries'], fr: ['fraise', 'fraises'] },
  { sprite: 'pet_dog', en: ['dog', 'dogs'], fr: ['chien', 'chiens'] },
  { sprite: 'pet_cat', en: ['cat', 'cats'], fr: ['chat', 'chats'] },
  { sprite: 'prop_rock', en: ['rock', 'rocks'], fr: ['roche', 'roches'] },
  { sprite: 'item_carrot', en: ['carrot', 'carrots'], fr: ['carotte', 'carottes'] },
  { sprite: 'item_pumpkin', en: ['pumpkin', 'pumpkins'], fr: ['citrouille', 'citrouilles'] },
  { sprite: 'animal_chicken', en: ['chicken', 'chickens'], fr: ['poule', 'poules'] },
  { sprite: 'animal_pig', en: ['pig', 'pigs'], fr: ['cochon', 'cochons'] },
  { sprite: 'item_tomato', en: ['tomato', 'tomatoes'], fr: ['tomate', 'tomates'] },
  { sprite: 'food_banana', en: ['banana', 'bananas'], fr: ['banane', 'bananes'] },
  { sprite: 'item_cheese', en: ['piece of cheese', 'pieces of cheese'], fr: ['morceau de fromage', 'morceaux de fromage'] },
  { sprite: 'farm_coin', en: ['coin', 'coins'], fr: ['pièce', 'pièces'] },
];

/** Biggest pictures we draw (more than this is too many to count). */
export const MAX_ADD = 20;
export const MAX_GROUPS = 8;
export const MAX_PRODUCT = 30;

const N = String.raw`(\d{1,3})`;

/** Read a simple question like "8 + 2 = ?", "8 + ? = 10", "12 − 5 = ?", "3 x 4 = ?" or "12 / 3 = ?". */
export function mathVisual(prompt: string): MathVisual | null {
  const p = prompt.replace(/ | /g, ' ').trim();
  let m = new RegExp(`^${N}\\s*([+\\-−x×÷/])\\s*${N}\\s*=\\s*\\?$`).exec(p);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[3]);
    const op = m[2];
    if (op === '+') return a + b <= MAX_ADD ? { op: 'add', a, b, r: a + b } : null;
    if (op === '-' || op === '−') return a <= MAX_ADD && b <= a ? { op: 'sub', a, b, r: a - b } : null;
    if (op === 'x' || op === '×') return a >= 1 && a <= MAX_GROUPS && b >= 1 && b <= 10 && a * b <= MAX_PRODUCT ? { op: 'mul', a, b, r: a * b } : null;
    // Division: share a things into b groups.
    return b >= 2 && b <= MAX_GROUPS && a <= MAX_PRODUCT && a % b === 0 ? { op: 'div', a, b, r: a / b } : null;
  }
  // A missing number: "8 + ? = 10" or "? + 8 = 10".
  m = new RegExp(`^${N}\\s*\\+\\s*\\?\\s*=\\s*${N}$`).exec(p) ?? new RegExp(`^\\?\\s*\\+\\s*${N}\\s*=\\s*${N}$`).exec(p);
  if (m) {
    const a = Number(m[1]);
    const r = Number(m[2]);
    return r <= MAX_ADD && a <= r ? { op: 'missing', a, b: r - a, r } : null;
  }
  return null;
}

/** "8 apples" (or "1 apple") in the current language. */
export function count(n: number, t: Thing): string {
  const [one, many] = getLang() === 'fr' ? t.fr : t.en;
  return `${n} ${n === 1 ? one : many}`;
}

/** The written sum, e.g. "8 + 2 = 10". */
export function equation(v: MathVisual): string {
  const times = getLang() === 'fr' ? '×' : 'x';
  const div = getLang() === 'fr' ? '÷' : '/';
  switch (v.op) {
    case 'add':
    case 'missing':
      return `${v.a} + ${v.b} = ${v.r}`;
    case 'sub':
      return `${v.a} − ${v.b} = ${v.r}`;
    case 'mul':
      return `${v.a} ${times} ${v.b} = ${v.r}`;
    case 'div':
      return `${v.a} ${div} ${v.b} = ${v.r}`;
  }
}

/** What the voice says, one step at a time (each step goes with a move in the picture). */
export function story(v: MathVisual, t: Thing): string[] {
  const c = (n: number) => count(n, t);
  const eq = equation(v);
  switch (v.op) {
    case 'add':
      return [
        tr('If you have {x},', { x: c(v.a) }),
        tr('and you add {y} more,', { y: v.b }),
        tr('you have {z}.', { z: c(v.r) }),
        tr('So {eq}.', { eq }),
      ];
    case 'missing':
      return [
        tr('You have {x}.', { x: c(v.a) }),
        tr('To get to {z}, you need {y} more.', { z: v.r, y: v.b }),
        tr('Count on: {list}.', { list: Array.from({ length: v.b }, (_x, i) => v.a + i + 1).join(', ') }),
        tr('So the missing number is {n}, because {eq}.', { n: v.b, eq }),
      ];
    case 'sub':
      return [
        tr('If you have {x},', { x: c(v.a) }),
        tr('and you take away {y},', { y: c(v.b) }),
        tr('you have {z} left.', { z: c(v.r) }),
        tr('So {eq}.', { eq }),
      ];
    case 'mul':
      return [
        tr('Make {a} groups with {y} in each group.', { a: v.a, y: c(v.b) }),
        tr('Count by {b}s: {list}.', { b: v.b, list: Array.from({ length: v.a }, (_x, i) => (i + 1) * v.b).join(', ') }),
        tr('{a} groups of {b} make {z}.', { a: v.a, b: v.b, z: c(v.r) }),
        tr('So {eq}.', { eq }),
      ];
    case 'div':
      return [
        tr('You have {x}.', { x: c(v.a) }),
        tr('Share them into {b} equal groups, one at a time.', { b: v.b }),
        tr('Each group gets {y}.', { y: c(v.r) }),
        tr('So {eq}.', { eq }),
      ];
  }
}
