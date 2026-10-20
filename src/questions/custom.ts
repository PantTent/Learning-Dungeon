// Grown-up choices for a math group: which number sizes to practice (and
// which times tables / operations). When sizes are picked, questions come
// only from those sizes, so they never get harder than what was chosen.
import type { Question } from './types';
import { fmtNum, getLang, L } from '../i18n';
import { pick, ri } from '../util/rng';
import { mentionsNumber } from './mathEarly';

/** Per-group choices, saved with the hero's settings. */
export interface GroupOptions {
  /** Question types to use (topic keys); empty = all of the group's types. */
  topics?: string[];
  /** Number sizes (see SIZES); empty = automatic levels. */
  sizes?: string[];
  /** Adding and/or subtracting (add-sub groups). */
  ops?: ('add' | 'sub')[];
}

export type SizeKind = 'mul' | 'div' | 'addsub';

export interface SizeDef {
  id: string;
  en: string;
  fr: string;
}

/** Number sizes a parent can pick, per kind of math. */
export const SIZES: Record<SizeKind, SizeDef[]> = {
  mul: [
    { id: '1x1', en: '1 digit x 1 digit (7 x 8)', fr: '1 chiffre × 1 chiffre (7 × 8)' },
    { id: '1x2', en: '1 digit x 2 digits (6 x 45)', fr: '1 chiffre × 2 chiffres (6 × 45)' },
    { id: '2x2', en: '2 digits x 2 digits (23 x 41)', fr: '2 chiffres × 2 chiffres (23 × 41)' },
    { id: '1x3', en: '1 digit x 3 digits (4 x 312)', fr: '1 chiffre × 3 chiffres (4 × 312)' },
    { id: '2x3', en: '2 digits x 3 digits (12 x 215)', fr: '2 chiffres × 3 chiffres (12 × 215)' },
  ],
  div: [
    { id: 'facts', en: 'Division facts (56 / 7)', fr: 'Tables de division (56 ÷ 7)' },
    { id: '2by1', en: '2 digits / 1 digit (84 / 4)', fr: '2 chiffres ÷ 1 chiffre (84 ÷ 4)' },
    { id: '3by1', en: '3 digits / 1 digit (624 / 3)', fr: '3 chiffres ÷ 1 chiffre (624 ÷ 3)' },
    { id: '3by2', en: '3 digits / 2 digits (672 / 12)', fr: '3 chiffres ÷ 2 chiffres (672 ÷ 12)' },
  ],
  addsub: [
    { id: '1', en: '1-digit numbers (7 + 5)', fr: 'Nombres à 1 chiffre (7 + 5)' },
    { id: '2', en: '2-digit numbers (47 + 35)', fr: 'Nombres à 2 chiffres (47 + 35)' },
    { id: '3', en: '3-digit numbers (358 + 267)', fr: 'Nombres à 3 chiffres (358 + 267)' },
    { id: '4', en: '4-digit numbers (4,821 + 1,356)', fr: 'Nombres à 4 chiffres (4 821 + 1 356)' },
  ],
};

/** Which groups have number sizes (others only have question types). */
export function sizeKind(groupId: string): SizeKind | undefined {
  if (groupId === 'multiply' || groupId === 'fr-mult') return 'mul';
  if (groupId === 'divide') return 'div';
  if (groupId === 'add-sub' || groupId === 'fr-add-sub') return 'addsub';
  return undefined;
}

/** A random number with this many digits (1 digit = 0-9). */
function digits(n: number): number {
  return n === 1 ? ri(0, 9) : ri(10 ** (n - 1), 10 ** n - 1);
}

const X = () => (getLang() === 'fr' ? '×' : 'x');
const DIV = () => (getLang() === 'fr' ? '÷' : '/');
const MINUS = () => (getLang() === 'fr' ? '−' : '-');

type Made = Omit<Question, 'id' | 'subject' | 'difficulty'>;

/** The teacher hint must never give the answer away. */
function num(topic: string, prompt: string, answer: number, explanation: string, teach: string): Made {
  const a = String(answer);
  const safe = mentionsNumber(teach, a)
    ? L('Read it slowly. Use the paper, draw dots or groups, then check your answer.', 'Lis lentement. Utilise la feuille, dessine des points ou des groupes, puis vérifie ta réponse.')
    : teach;
  return { topic, prompt, input: 'number', answer: a, explanation, teach: safe };
}

/** Times tables apply to the 1-digit number in a question. */
function multiply(size: string, tables: number[]): Made {
  const [da, db] = size.split('x').map(Number);
  const small = () => (tables.length ? pick(tables) : digits(1));
  const a = da === 1 ? small() : digits(da);
  const b = digits(db);
  // Put the bigger number first, like it is written in columns.
  const [top, bottom] = b >= a ? [b, a] : [a, b];
  const p = top * bottom;
  const fr = getLang() === 'fr';
  const topic = fr ? 'e-mult' : { '1x1': 'mult-facts', '1x2': 'mult-2x1', '2x2': 'mult-2x2', '1x3': 'mult-big', '2x3': 'mult-3x2' }[size] ?? 'mult-facts';
  let why = `${fmtNum(top)} ${X()} ${fmtNum(bottom)} = ${fmtNum(p)}.`;
  if (bottom >= 10) {
    const tens = Math.floor(bottom / 10) * 10;
    const ones = bottom % 10;
    why = L(
      `${fmtNum(top)} x ${tens} = ${fmtNum(top * tens)} and ${fmtNum(top)} x ${ones} = ${fmtNum(top * ones)}. Add them: ${fmtNum(p)}.`,
      `${fmtNum(top)} × ${tens} = ${fmtNum(top * tens)} et ${fmtNum(top)} × ${ones} = ${fmtNum(top * ones)}. On additionne : ${fmtNum(p)}.`,
    );
  } else if (top >= 10) {
    const parts = String(top).split('').map((d, i, all) => Number(d) * 10 ** (all.length - 1 - i)).filter((x) => x > 0);
    if (parts.length > 1) {
      why = L(
        `${parts.map((x) => `${fmtNum(x)} x ${bottom} = ${fmtNum(x * bottom)}`).join(', ')}. Add them: ${fmtNum(p)}.`,
        `${parts.map((x) => `${fmtNum(x)} × ${bottom} = ${fmtNum(x * bottom)}`).join(', ')}. On additionne : ${fmtNum(p)}.`,
      );
    }
  }
  const teach =
    top < 10 && bottom < 10
      ? L(`Think of ${top} groups of ${bottom}. Skip-count by ${bottom}, or start from a fact you know and add or take away one group.`, `Pense à ${top} groupes de ${bottom}. Compte par bonds de ${bottom}, ou pars d'un fait que tu connais et ajoute ou enlève un groupe.`)
      : L('Break the numbers into tens and ones. Multiply each part, then add the parts together. The paper can help!', 'Sépare les nombres en dizaines et en unités. Multiplie chaque partie, puis additionne les parties. La feuille peut t’aider!');
  return num(topic, `${fmtNum(top)} ${X()} ${fmtNum(bottom)} = ?`, p, why, teach);
}

/** Division with no remainder: the answer is always a whole number. */
function divide(size: string, tables: number[]): Made {
  const one = () => (tables.length ? pick(tables) : ri(2, 9));
  let divisor: number;
  let quotient: number;
  if (size === 'facts') {
    divisor = one();
    quotient = ri(1, 10);
  } else if (size === '2by1') {
    divisor = one();
    quotient = ri(Math.ceil(10 / divisor), Math.floor(99 / divisor));
  } else if (size === '3by1') {
    divisor = one();
    quotient = ri(Math.ceil(100 / divisor), Math.floor(999 / divisor));
  } else {
    divisor = ri(11, 49);
    quotient = ri(Math.ceil(100 / divisor), Math.floor(999 / divisor));
  }
  const total = divisor * quotient;
  const topic = { facts: 'div-facts', '2by1': 'div-long', '3by1': 'div-long', '3by2': 'div-2digit' }[size] ?? 'div-facts';
  return num(
    topic,
    `${fmtNum(total)} ${DIV()} ${divisor} = ?`,
    quotient,
    L(`${divisor} x ${fmtNum(quotient)} = ${fmtNum(total)}, so ${fmtNum(total)} / ${divisor} = ${fmtNum(quotient)}.`, `${divisor} × ${fmtNum(quotient)} = ${fmtNum(total)}, donc ${fmtNum(total)} ÷ ${divisor} = ${fmtNum(quotient)}.`),
    size === 'facts'
      ? L(`Ask yourself: ${divisor} times what makes ${total}? Use the times table for ${divisor}.`, `Demande-toi : ${divisor} fois combien donne ${total}? Utilise la table de ${divisor}.`)
      : L(`Divide one place at a time, starting on the left. How many ${divisor}s fit? Write it down, take it away, and bring down the next digit.`, `Divise une position à la fois, en partant de la gauche. Combien de fois ${divisor} entre-t-il? Écris-le, soustrais, puis descends le chiffre suivant.`),
  );
}

function addSub(size: string, ops: ('add' | 'sub')[]): Made {
  const n = Number(size);
  const op = pick(ops.length ? ops : (['add', 'sub'] as const));
  let a = digits(n);
  let b = digits(n);
  const fr = getLang() === 'fr';
  if (op === 'sub') {
    if (b > a) [a, b] = [b, a];
    const topic = fr || n === 1 ? 'e-sub' : 'add-sub';
    return num(
      topic,
      `${fmtNum(a)} ${MINUS()} ${fmtNum(b)} = ?`,
      a - b,
      `${fmtNum(a)} ${MINUS()} ${fmtNum(b)} = ${fmtNum(a - b)}.`,
      n === 1
        ? L('Start at the bigger number and count back. Or think: what do you add to the small number to get the big one?', 'Pars du plus grand nombre et recule. Ou pense : combien faut-il ajouter au petit nombre pour arriver au grand?')
        : L('Line up the ones, tens and hundreds. Subtract the ones first. If the top digit is too small, borrow 1 ten from the next column.', 'Aligne les unités, les dizaines et les centaines. Soustrais les unités d’abord. Si le chiffre du haut est trop petit, emprunte une dizaine à la colonne suivante.'),
    );
  }
  const topic = fr || n === 1 ? 'e-add' : 'add-sub';
  return num(
    topic,
    `${fmtNum(a)} + ${fmtNum(b)} = ?`,
    a + b,
    `${fmtNum(a)} + ${fmtNum(b)} = ${fmtNum(a + b)}.`,
    n === 1
      ? L('Start at the bigger number and count up. Or use a double you know, like 5 + 5, and adjust.', 'Pars du plus grand nombre et avance. Ou utilise un double que tu connais, comme 5 + 5, puis ajuste.')
      : L('Line up the ones, tens and hundreds. Add the ones first. If they make 10 or more, carry 1 to the next column.', 'Aligne les unités, les dizaines et les centaines. Additionne les unités d’abord. Si ça fait 10 ou plus, retiens 1 dans la colonne suivante.'),
  );
}

/** A question for a group with picked number sizes (undefined = use the normal levels). */
export function sizedQuestion(groupId: string, opts: GroupOptions | undefined, tables: number[]): Made | undefined {
  const kind = sizeKind(groupId);
  const sizes = (opts?.sizes ?? []).filter((s) => kind && SIZES[kind].some((d) => d.id === s));
  if (!kind || !sizes.length) return undefined;
  const size = pick(sizes);
  if (kind === 'mul') return multiply(size, tables);
  if (kind === 'div') return divide(size, tables);
  return addSub(size, opts?.ops ?? []);
}
