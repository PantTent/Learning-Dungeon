// Math question generators aligned with the Massachusetts 2017 Mathematics
// Curriculum Framework (grades 3-5: OA, NBT, NF, MD, G), plus grade 6 topics
// (percent, ratios, integers, decimals, mixed numbers, exponents) that also
// cover Quebec 4e-6e annee and the Nova Scotia CSAP program.
// Every question carries a `teach` hint: how to think about THIS problem,
// without giving away the answer.
// All text is picked with L(en, fr) at generation time, so every generator
// works in English and French. Number-pad answers are always plain digits
// (the pad has no decimal point or minus sign), so decimal and negative
// answers are multiple choice.
import { EARLY_GENERATORS, makeEarlyQuestion, mentionsNumber } from './mathEarly';
import type { Difficulty, Question } from './types';
import { pick, ri, shuffle } from '../util/rng';
import { L, fmtDec, fmtNum, getLang, getUnits } from '../i18n';

export const MATH_TOPICS: Record<string, string> = {
  'times-table': 'Times tables (focus practice)',
  'div-table': 'Division facts (focus practice)',
  'mult-facts': 'Multiplication facts',
  'mult-2x1': '2-digit x 1-digit',
  'mult-big': '3- and 4-digit x 1-digit',
  'mult-2x2': '2-digit x 2-digit',
  'mult-3x2': '3-digit x 2-digit',
  'div-facts': 'Division facts',
  'div-remainder': 'Division with remainders',
  'div-long': '4-digit / 1-digit division',
  'div-2digit': 'Dividing by 2-digit numbers',
  'add-sub': 'Adding & subtracting big numbers',
  'place-value': 'Place value',
  'rounding': 'Rounding',
  'compare': 'Comparing numbers',
  'factors': 'Factors, multiples & primes',
  'patterns': 'Number patterns',
  'order-ops': 'Order of operations',
  'fractions-equiv': 'Equivalent fractions',
  'fractions-compare': 'Comparing fractions',
  'fractions-add': 'Adding & subtracting fractions',
  'fractions-unlike': 'Adding unlike fractions',
  'fractions-mult': 'Fraction x whole number',
  'decimals': 'Decimals',
  'decimal-ops': 'Adding & subtracting decimals',
  'measurement': 'Measurement conversions',
  'area-perimeter': 'Area & perimeter',
  'volume': 'Volume',
  'angles': 'Angles',
  'word-problems': 'Word problems',
  'percent': 'Percents',
  'ratio': 'Ratios & rates',
  'integers': 'Negative numbers (integers)',
  'decimal-muldiv': 'Multiplying & dividing decimals',
  'fractions-mixed': 'Mixed numbers & improper fractions',
  'exponents': 'Exponents (squares, cubes, powers of 10)',
};

/** French names for MATH_TOPICS (shown to parents). */
export const MATH_TOPICS_FR: Record<string, string> = {
  'times-table': 'Tables de multiplication (pratique ciblée)',
  'div-table': 'Faits de division (pratique ciblée)',
  'mult-facts': 'Faits de multiplication',
  'mult-2x1': '2 chiffres × 1 chiffre',
  'mult-big': '3 et 4 chiffres × 1 chiffre',
  'mult-2x2': '2 chiffres × 2 chiffres',
  'mult-3x2': '3 chiffres × 2 chiffres',
  'div-facts': 'Faits de division',
  'div-remainder': 'Division avec reste',
  'div-long': 'Division de 4 chiffres ÷ 1 chiffre',
  'div-2digit': 'Diviser par un nombre à 2 chiffres',
  'add-sub': 'Additionner et soustraire de grands nombres',
  'place-value': 'Valeur de position',
  'rounding': 'Arrondir',
  'compare': 'Comparer des nombres',
  'factors': 'Diviseurs, multiples et nombres premiers',
  'patterns': 'Suites de nombres',
  'order-ops': 'Priorité des opérations',
  'fractions-equiv': 'Fractions équivalentes',
  'fractions-compare': 'Comparer des fractions',
  'fractions-add': 'Additionner et soustraire des fractions',
  'fractions-unlike': 'Additionner des fractions de dénominateurs différents',
  'fractions-mult': 'Fraction × nombre entier',
  'decimals': 'Nombres décimaux',
  'decimal-ops': 'Additionner et soustraire des nombres décimaux',
  'measurement': 'Conversions de mesures',
  'area-perimeter': 'Aire et périmètre',
  'volume': 'Volume',
  'angles': 'Angles',
  'word-problems': 'Problèmes écrits',
  'percent': 'Pourcentages',
  'ratio': 'Rapports et taux',
  'integers': 'Nombres négatifs (entiers relatifs)',
  'decimal-muldiv': 'Multiplier et diviser des nombres décimaux',
  'fractions-mixed': 'Nombres fractionnaires',
  'exponents': 'Exposants (carrés, cubes, puissances de 10)',
};

/** Topic name in the current language. */
export function mathTopicName(topic: string): string | undefined {
  return (getLang() === 'fr' ? MATH_TOPICS_FR[topic] : undefined) ?? MATH_TOPICS[topic];
}

/** Format with thousands separators: 12345 -> "12,345" (French: "12 345"). */
export const fmt = (n: number) => fmtNum(n);

type Gen = (d: Difficulty, factors?: number[]) => Omit<Question, 'id' | 'subject' | 'topic' | 'difficulty'>;

const GENERIC_TEACH = () =>
  L(
    'Read the question slowly and find what it asks. Work it out one step at a time, then check your answer.',
    'Lis la question lentement et trouve ce qu’on te demande. Calcule une étape à la fois, puis vérifie ta réponse.',
  );

function num(prompt: string, answer: number, explanation: string, teach: string) {
  const a = String(answer);
  // Safety net: a hint must never say the answer (unless the question already shows it).
  // Small numbers (12 or less) are allowed: they are often part of the method ("like 5 x 10").
  const t = answer > 12 && mentionsNumber(teach, a) && !mentionsNumber(prompt, a) ? GENERIC_TEACH() : teach;
  return { prompt, input: 'number' as const, answer: a, explanation, teach: t };
}

/** How the engine compares answers (commas and spaces don't count). */
const norm = (s: string) => s.trim().toLowerCase().replace(/[,  ]/g, '').replace(/\s+/g, ' ');

function choice(prompt: string, answer: string, wrong: string[], explanation: string, teach: string) {
  // In French "3,45" and "345" look the same to the answer checker, so a wrong
  // option must differ from the answer (and the others) after normalizing.
  const seen = new Set([norm(answer)]);
  const uniqueWrong: string[] = [];
  for (const w of wrong) {
    if (uniqueWrong.length >= 3 || seen.has(norm(w))) continue;
    seen.add(norm(w));
    uniqueWrong.push(w);
  }
  return {
    prompt,
    input: 'choice' as const,
    answer,
    choices: shuffle([answer, ...uniqueWrong]),
    explanation,
    teach,
  };
}

/** Break a number into place-value parts: 347 -> [300, 40, 7] (zeros dropped). */
function expand(n: number): number[] {
  const digits = String(n).split('');
  return digits
    .map((d, i) => Number(d) * 10 ** (digits.length - 1 - i))
    .filter((v) => v !== 0);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** "3/6" -> "1/2"; whole numbers come out as "1". */
function simplify(n: number, d: number): string {
  const g = gcd(n, d);
  return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`;
}

/** Decimal to a clean string: 4.5 -> "4.5", 4.25 -> "4.25" (French: "4,25"). */
function dec(n: number): string {
  return fmtDec(Math.round(n * 100) / 100);
}

/** Any decimal, cleaned of float noise, with thousands separators: 3450 -> "3,450", 0.345 -> "0.345". */
function ds(n: number): string {
  const r = Math.round(n * 1e6) / 1e6;
  const [i, f] = String(r).split('.');
  return f ? `${fmtNum(Number(i))}${L('.', ',')}${f}` : fmtNum(Number(i));
}

/** Signed whole number with a real minus sign: -5 -> "−5". */
const sg = (n: number) => (n < 0 ? `−${fmtNum(-n)}` : fmtNum(n));

const pl = (n: number, one: string, many: string) => (n === 1 ? one : many);
/** French quotes with non-breaking spaces. */
const q = (s: string) => `« ${s} »`;
/** "50%" in English, "50 %" in French. */
const pct = (p: number) => L(`${p}%`, `${p} %`);

const PLACE_NAMES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands'];
const PLACE_NAMES_FR = ['unités', 'dizaines', 'centaines', 'unités de mille', 'dizaines de mille', 'centaines de mille'];

/** Unit names for measurement conversions (French name, French singular, feminine). */
const UNIT_FR: Record<string, [string, string]> = {
  hours: ['heures', 'heure'],
  minutes: ['minutes', 'minute'],
  seconds: ['secondes', 'seconde'],
  feet: ['pieds', 'pied'],
  inches: ['pouces', 'pouce'],
  yards: ['verges', 'verge'],
  weeks: ['semaines', 'semaine'],
  days: ['jours', 'jour'],
  meters: ['mètres', 'mètre'],
  centimeters: ['centimètres', 'centimètre'],
  millimeters: ['millimètres', 'millimètre'],
  pounds: ['livres', 'livre'],
  ounces: ['onces', 'once'],
  gallons: ['gallons', 'gallon'],
  quarts: ['pintes', 'pinte'],
  cups: ['tasses', 'tasse'],
  pints: ['chopines', 'chopine'],
  kilograms: ['kilogrammes', 'kilogramme'],
  grams: ['grammes', 'gramme'],
  liters: ['litres', 'litre'],
  milliliters: ['millilitres', 'millilitre'],
  kilometers: ['kilomètres', 'kilomètre'],
};
/** "de minutes", "d'heures". */
const deFr = (w: string) => (/^[aeiouhéè]/i.test(w) ? `d’${w}` : `de ${w}`);

const SUP: Record<number, string> = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶' };
const pw = (b: number, e: number) => `${b}${SUP[e]}`;

const GENERATORS: Record<string, { levels: Difficulty[]; gen: Gen }> = {
  // Focus practice: only the times tables the parent picked (e.g. just the 5s),
  // asked lots of different ways so it doesn't get boring.
  'times-table': {
    levels: [1, 2, 3],
    gen: (d, factors = [5]) => {
      const f = pick(factors);
      const a = ri(1, 12);
      const p = f * a;
      const forms = d === 1 ? [0, 1, 2] : d === 2 ? [0, 1, 2, 3, 4, 5, 6] : [0, 2, 3, 4, 5, 6, 7, 8];
      const grp = (n: number) => pl(n, 'groupe', 'groupes');
      const TEACH = L(
        `Skip-count by ${f}s and count how many jumps you need. Or start from a ${f}s fact you already know (like ${f} x 10) and add or take away ${f}s until you get there.`,
        `Compte de ${f} en ${f} et compte combien de bonds il te faut. Ou pars d’un fait de la table de ${f} que tu connais déjà (comme ${f} × 10), puis ajoute ou enlève des ${f} jusqu’à y arriver.`,
      );
      switch (pick(forms)) {
        case 0:
          return num(L(`${f} x ${a} = ?`, `${f} × ${a} = ?`), p, L(`${f} groups of ${a} make ${p}.`, `${f} ${grp(f)} de ${a} font ${p}.`), TEACH);
        case 1:
          return num(
            L(`${a} x ${f} = ?`, `${a} × ${f} = ?`),
            p,
            L(`${a} groups of ${f} make ${p}. Order doesn't matter: ${f} x ${a} is the same.`, `${a} ${grp(a)} de ${f} font ${p}. L’ordre ne change rien : ${f} × ${a}, c’est pareil.`),
            TEACH,
          );
        case 2:
          return num(L(`What is ${a} times ${f}?`, `Combien font ${a} × ${f}?`), p, L(`${a} x ${f} = ${p}.`, `${a} × ${f} = ${p}.`), TEACH);
        case 3:
          return num(
            L(`? x ${f} = ${p}`, `? × ${f} = ${p}`),
            a,
            L(`${a} x ${f} = ${p}, so the missing number is ${a}.`, `${a} × ${f} = ${p}, donc le nombre manquant est ${a}.`),
            L(
              `How many ${f}s make ${p}? Skip-count by ${f} and count how many jumps it takes to reach ${p}.`,
              `Combien de fois ${f} pour faire ${p}? Compte de ${f} en ${f} et compte les bonds jusqu’à ${p}.`,
            ),
          );
        case 4: {
          const start = ri(1, 7);
          const seq = [0, 1, 2, 3].map((i) => f * (start + i));
          return num(
            L(`Count by ${f}s. What comes next?\n${seq.join(', ')}, ?`, `Compte de ${f} en ${f}. Quel nombre vient ensuite?\n${seq.join(', ')}, ?`),
            f * (start + 4),
            L(`Add ${f} each time: ${seq[3]} + ${f} = ${f * (start + 4)}.`, `Ajoute ${f} chaque fois : ${seq[3]} + ${f} = ${f * (start + 4)}.`),
            L(`Each number is ${f} more than the one before. Add ${f} to the last number.`, `Chaque nombre a ${f} de plus que le précédent. Ajoute ${f} au dernier nombre.`),
          );
        }
        case 5: {
          const wrong: string[] = [];
          for (let tries = 0; wrong.length < 3 && tries < 200 && f > 1; tries++) {
            const w = p + ri(-2 * f, 2 * f);
            if (w > 0 && w % f !== 0 && !wrong.includes(String(w))) wrong.push(String(w));
          }
          if (f === 1) return num(L(`${f} x ${a} = ?`, `${f} × ${a} = ?`), p, L(`Anything times 1 stays the same: ${p}.`, `Un nombre multiplié par 1 ne change pas : ${p}.`), TEACH);
          return choice(
            L(`Which number is a MULTIPLE of ${f}?`, `Quel nombre est un MULTIPLE de ${f}?`),
            String(p),
            wrong,
            L(`${a} x ${f} = ${p}, so ${p} is a multiple of ${f}.`, `${a} × ${f} = ${p}, donc ${p} est un multiple de ${f}.`),
            L(
              `Multiples of ${f} are the numbers you land on when you skip-count by ${f}. Which choice is on that list?`,
              `Les multiples de ${f} sont les nombres où tu arrives quand tu comptes de ${f} en ${f}. Quel choix est dans cette liste?`,
            ),
          );
        }
        case 6:
          return num(
            pick([
              L(`A knight has ${a} bags with ${f} coins in each. How many coins in all?`, `Un chevalier a ${a} ${pl(a, 'sac', 'sacs')} avec ${f} ${pl(f, 'pièce', 'pièces')} d’or dans chacun. Combien de pièces y a-t-il en tout?`),
              L(`There are ${a} dragons. Each dragon has ${f} gems. How many gems?`, `Il y a ${a} ${pl(a, 'dragon', 'dragons')}. Chaque dragon a ${f} ${pl(f, 'pierre précieuse', 'pierres précieuses')}. Combien de pierres précieuses en tout?`),
              L(`${a} wizards each cast ${f} spells. How many spells in all?`, `${a} ${pl(a, 'magicien lance', 'magiciens lancent chacun')} ${f} ${pl(f, 'sort', 'sorts')}. Combien de sorts en tout?`),
            ]),
            p,
            L(`${a} groups of ${f}: ${a} x ${f} = ${p}.`, `${a} ${grp(a)} de ${f} : ${a} × ${f} = ${p}.`),
            L(
              `Equal groups means multiply: how many groups (${a}) times how many in each group (${f}).`,
              `Des groupes égaux, ça veut dire multiplier : le nombre de groupes (${a}) fois le nombre dans chaque groupe (${f}).`,
            ),
          );
        case 7: {
          const big = ri(13, 49);
          const parts = expand(big);
          return num(
            L(`${big} x ${f} = ?`, `${big} × ${f} = ?`),
            big * f,
            L(
              `${parts.map((x) => `${x} x ${f} = ${x * f}`).join(', ')}. Add them: ${big * f}.`,
              `${parts.map((x) => `${x} × ${f} = ${x * f}`).join(', ')}. Additionne : ${big * f}.`,
            ),
            L(
              `Break ${big} into tens and ones: ${parts.join(' + ')}. Multiply each part by ${f}, then add.`,
              `Sépare ${big} en dizaines et en unités : ${parts.join(' + ')}. Multiplie chaque partie par ${f}, puis additionne.`,
            ),
          );
        }
        default: {
          return num(
            L(`${f} x ${a} x 10 = ?`, `${f} × ${a} × 10 = ?`),
            p * 10,
            L(`${f} x ${a} = ${p}, then times 10 adds a zero: ${p * 10}.`, `${f} × ${a} = ${p}, puis fois 10 ajoute un zéro : ${fmt(p * 10)}.`),
            L(
              `First do ${f} x ${a} using your ${f}s facts. Then multiplying by 10 just adds a zero on the end.`,
              `Calcule d’abord ${f} × ${a} avec ta table de ${f}. Ensuite, multiplier par 10 ajoute simplement un zéro à la fin.`,
            ),
          );
        }
      }
    },
  },

  'div-table': {
    levels: [1, 2, 3],
    gen: (d, factors = [5]) => {
      const f = pick(factors);
      const a = ri(1, 12);
      const p = f * a;
      const forms = d === 1 ? [0, 1] : d === 2 ? [0, 1, 2, 3] : [0, 2, 3, 4];
      const TEACH = L(
        `Division is multiplication backwards. Ask: ${f} times WHAT equals the big number? Skip-count by ${f}s and count the jumps.`,
        `La division, c’est la multiplication à l’envers. Demande-toi : ${f} fois QUOI donne le grand nombre? Compte de ${f} en ${f} et compte les bonds.`,
      );
      switch (pick(forms)) {
        case 0:
          return num(L(`${p} / ${f} = ?`, `${p} ÷ ${f} = ?`), a, L(`${f} x ${a} = ${p}, so ${p} / ${f} = ${a}.`, `${f} × ${a} = ${p}, donc ${p} ÷ ${f} = ${a}.`), TEACH);
        case 1:
          return num(
            L(`How many groups of ${f} are in ${p}?`, `Combien de groupes de ${f} y a-t-il dans ${p}?`),
            a,
            L(`${a} groups of ${f} make ${p}.`, `${a} ${pl(a, 'groupe', 'groupes')} de ${f} font ${p}.`),
            TEACH,
          );
        case 2:
          return num(
            L(`? / ${f} = ${a}`, `? ÷ ${f} = ${a}`),
            p,
            L(`${a} x ${f} = ${p}, so ${p} / ${f} = ${a}.`, `${a} × ${f} = ${p}, donc ${p} ÷ ${f} = ${a}.`),
            L(
              `The missing number is what you split into ${f} equal groups to get ${a} in each. Multiply ${a} by ${f}.`,
              `Le nombre manquant est celui qu’on partage en ${f} groupes égaux pour avoir ${a} dans chaque groupe. Multiplie ${a} par ${f}.`,
            ),
          );
        case 3:
          return num(
            pick([
              L(`${p} gems are shared equally by ${f} goblins. How many gems does each goblin get?`, `On partage ${p} pierres précieuses également entre ${f} ${pl(f, 'gobelin', 'gobelins')}. Combien de pierres chaque gobelin reçoit-il?`),
              L(`${p} arrows go into ${f} quivers equally. How many arrows in each quiver?`, `On place ${p} flèches également dans ${f} carquois. Combien de flèches y a-t-il dans chaque carquois?`),
            ]),
            a,
            L(`${p} / ${f} = ${a} each.`, `${p} ÷ ${f} = ${a} chacun.`),
            L(`"Shared equally" means divide: the total divided by the number of groups.`, `${q('Partager également')} veut dire diviser : le total divisé par le nombre de groupes.`),
          );
        default: {
          const n = ri(13, 40);
          return num(
            L(`${n * f} / ${f} = ?`, `${n * f} ÷ ${f} = ?`),
            n,
            L(`${f} x ${n} = ${n * f}, so the answer is ${n}.`, `${f} × ${n} = ${n * f}, donc la réponse est ${n}.`),
            L(
              `Break ${n * f} into parts you know how to divide by ${f} (like ${f * 10}), divide each part, and add the answers.`,
              `Sépare ${n * f} en parties faciles à diviser par ${f} (comme ${f * 10}), divise chaque partie, puis additionne les réponses.`,
            ),
          );
        }
      }
    },
  },

  'mult-facts': {
    levels: [1],
    gen: () => {
      const a = ri(2, 12);
      const b = ri(2, 12);
      return num(
        L(`${a} x ${b} = ?`, `${a} × ${b} = ?`),
        a * b,
        L(`${a} groups of ${b} make ${a * b}.`, `${a} groupes de ${b} font ${a * b}.`),
        L(
          `"${a} x ${b}" means ${a} groups of ${b}. You can skip-count by ${b}, ${a} times. Or use a fact you know, like ${a} x 10, and adjust.`,
          `${q(`${a} × ${b}`)} veut dire ${a} groupes de ${b}. Tu peux compter de ${b} en ${b}, ${a} fois. Ou utilise un fait que tu connais, comme ${a} × 10, puis ajuste.`,
        ),
      );
    },
  },

  'mult-2x1': {
    levels: [1, 2],
    gen: (d) => {
      const a = d === 1 ? ri(11, 49) : ri(23, 99);
      const b = d === 1 ? ri(2, 5) : ri(3, 9);
      const parts = expand(a);
      const steps = parts.map((p) => L(`${p} x ${b} = ${p * b}`, `${p} × ${b} = ${p * b}`)).join(', ');
      return num(
        L(`${a} x ${b} = ?`, `${a} × ${b} = ?`),
        a * b,
        L(
          `Break it apart: ${steps}. Add them: ${parts.map((p) => p * b).join(' + ')} = ${a * b}.`,
          `Décompose : ${steps}. Additionne : ${parts.map((p) => p * b).join(' + ')} = ${a * b}.`,
        ),
        L(
          `Break ${a} into tens and ones: ${parts.join(' + ')}. Multiply EACH part by ${b}, then add your answers together.`,
          `Sépare ${a} en dizaines et en unités : ${parts.join(' + ')}. Multiplie CHAQUE partie par ${b}, puis additionne tes réponses.`,
        ),
      );
    },
  },

  'mult-big': {
    levels: [2, 3],
    gen: (d) => {
      const a = d === 2 ? ri(102, 899) : ri(1012, 4999);
      const b = ri(2, d === 2 ? 6 : 9);
      const parts = expand(a);
      return num(
        L(`${fmt(a)} x ${b} = ?`, `${fmt(a)} × ${b} = ?`),
        a * b,
        L(
          `Multiply each place: ${parts.map((p) => `${fmt(p)}x${b}=${fmt(p * b)}`).join(', ')}. Total: ${fmt(a * b)}.`,
          `Multiplie chaque position : ${parts.map((p) => `${fmt(p)} × ${b} = ${fmt(p * b)}`).join(', ')}. Total : ${fmt(a * b)}.`,
        ),
        L(
          `Break ${fmt(a)} into its places: ${parts.map(fmt).join(' + ')}. Multiply each part by ${b}, then add all the parts up.`,
          `Sépare ${fmt(a)} selon ses positions : ${parts.map(fmt).join(' + ')}. Multiplie chaque partie par ${b}, puis additionne toutes les parties.`,
        ),
      );
    },
  },

  'mult-2x2': {
    levels: [2, 3],
    gen: (d) => {
      if (d === 2) {
        if (Math.random() < 0.5) {
          const a = ri(2, 9) * 10;
          const b = ri(2, 9) * 10;
          return num(
            L(`${a} x ${b} = ?`, `${a} × ${b} = ?`),
            a * b,
            L(`${a / 10} x ${b / 10} = ${(a / 10) * (b / 10)}, then add two zeros: ${fmt(a * b)}.`, `${a / 10} × ${b / 10} = ${(a / 10) * (b / 10)}, puis ajoute deux zéros : ${fmt(a * b)}.`),
            L(
              `Ignore the zeros first: what is ${a / 10} x ${b / 10}? Then count the zeros in both numbers (two) and put them on the end.`,
              `Oublie les zéros d’abord : combien font ${a / 10} × ${b / 10}? Ensuite, compte les zéros des deux nombres (deux) et ajoute-les à la fin.`,
            ),
          );
        }
        const a = ri(12, 99);
        return num(
          L(`${a} x 10 = ?`, `${a} × 10 = ?`),
          a * 10,
          L(`Times 10 moves every digit one place left: ${a} becomes ${a * 10}.`, `Fois 10, chaque chiffre avance d’une position vers la gauche : ${a} devient ${a * 10}.`),
          L(
            'Multiplying by 10 makes every digit move one place to the left. An easy way: put a zero on the end.',
            'Multiplier par 10 fait avancer chaque chiffre d’une position vers la gauche. Truc facile : ajoute un zéro à la fin.',
          ),
        );
      }
      const a = ri(12, 49);
      const b = ri(12, 29);
      const tens = Math.floor(b / 10) * 10;
      const ones = b % 10;
      return num(
        L(`${a} x ${b} = ?`, `${a} × ${b} = ?`),
        a * b,
        ones === 0
          ? L(`${a} x ${b} = ${fmt(a * b)}.`, `${a} × ${b} = ${fmt(a * b)}.`)
          : L(
              `${a} x ${tens} = ${fmt(a * tens)} and ${a} x ${ones} = ${a * ones}. ${fmt(a * tens)} + ${a * ones} = ${fmt(a * b)}.`,
              `${a} × ${tens} = ${fmt(a * tens)} et ${a} × ${ones} = ${a * ones}. ${fmt(a * tens)} + ${a * ones} = ${fmt(a * b)}.`,
            ),
        ones === 0
          ? L(`Work out ${a} x ${tens / 10} first, then put a zero on the end.`, `Calcule d’abord ${a} × ${tens / 10}, puis ajoute un zéro à la fin.`)
          : L(
              `Split ${b} into ${tens} + ${ones}. Find ${a} x ${tens} (hint: ${a} x ${tens / 10}, then add a zero). Find ${a} x ${ones}. Add the two answers.`,
              `Sépare ${b} en ${tens} + ${ones}. Trouve ${a} × ${tens} (truc : ${a} × ${tens / 10}, puis ajoute un zéro). Trouve ${a} × ${ones}. Additionne les deux réponses.`,
            ),
      );
    },
  },

  'mult-3x2': {
    levels: [3],
    gen: () => {
      const a = ri(102, 499);
      const b = ri(11, 35);
      const tens = Math.floor(b / 10) * 10;
      const ones = b % 10;
      return num(
        L(`${a} x ${b} = ?`, `${a} × ${b} = ?`),
        a * b,
        L(
          `${a} x ${tens} = ${fmt(a * tens)}${ones ? ` and ${a} x ${ones} = ${fmt(a * ones)}. Add them: ${fmt(a * b)}` : ''}.`,
          `${a} × ${tens} = ${fmt(a * tens)}${ones ? ` et ${a} × ${ones} = ${fmt(a * ones)}. Additionne : ${fmt(a * b)}` : ''}.`,
        ),
        L(
          `Split ${b} into ${tens}${ones ? ` + ${ones}` : ''}. Multiply ${a} by each part${ones ? ', then add the two answers' : ''}. Line up the places carefully!`,
          `Sépare ${b} en ${tens}${ones ? ` + ${ones}` : ''}. Multiplie ${a} par chaque partie${ones ? ', puis additionne les deux réponses' : ''}. Aligne bien les positions!`,
        ),
      );
    },
  },

  'div-facts': {
    levels: [1],
    gen: () => {
      const b = ri(2, 12);
      const n = ri(2, 12);
      return num(
        L(`${b * n} / ${b} = ?`, `${b * n} ÷ ${b} = ?`),
        n,
        L(`${b} x ${n} = ${b * n}, so ${b * n} / ${b} = ${n}.`, `${b} × ${n} = ${b * n}, donc ${b * n} ÷ ${b} = ${n}.`),
        L(
          `Division is the opposite of multiplying. Ask yourself: ${b} times WHAT equals ${b * n}? Count up by ${b}s until you reach ${b * n}.`,
          `La division, c’est le contraire de la multiplication. Demande-toi : ${b} fois QUOI donne ${b * n}? Compte de ${b} en ${b} jusqu’à ${b * n}.`,
        ),
      );
    },
  },

  'div-remainder': {
    levels: [2],
    gen: () => {
      const dv = ri(3, 9);
      const n0 = ri(4, 15);
      const r = ri(1, dv - 1);
      const n = dv * n0 + r;
      const R = L('R', 'reste');
      const ans = `${n0} ${R} ${r}`;
      const wrong = [`${n0 + 1} ${R} ${r}`, `${n0 - 1} ${R} ${r}`];
      if (r + 1 < dv) wrong.push(`${n0} ${R} ${r + 1}`);
      if (r - 1 >= 1) wrong.push(`${n0} ${R} ${r - 1}`);
      return choice(
        L(`${n} / ${dv} = ?`, `${n} ÷ ${dv} = ?`),
        ans,
        shuffle(wrong),
        L(
          `${dv} x ${n0} = ${dv * n0}. ${n} - ${dv * n0} = ${r} left over, so the answer is ${n0} R ${r}.`,
          `${dv} × ${n0} = ${dv * n0}. ${n} − ${dv * n0} = ${r} de reste, donc la réponse est ${ans}.`,
        ),
        L(
          `Find the biggest number of ${dv}s that fit into ${n} without going over. Multiply to check. Whatever is left over is the remainder (R). The remainder must be smaller than ${dv}.`,
          `Trouve combien de fois ${dv} entre dans ${n} sans dépasser. Multiplie pour vérifier. Ce qui reste, c’est le reste. Le reste doit être plus petit que ${dv}.`,
        ),
      );
    },
  },

  'div-long': {
    levels: [3],
    gen: () => {
      const dv = ri(2, 9);
      const n0 = ri(Math.ceil(1000 / dv), Math.floor(9999 / dv));
      const n = dv * n0;
      return num(
        L(`${fmt(n)} / ${dv} = ?`, `${fmt(n)} ÷ ${dv} = ?`),
        n0,
        L(
          `Check by multiplying: ${fmt(n0)} x ${dv} = ${fmt(n)}. So ${fmt(n)} / ${dv} = ${fmt(n0)}.`,
          `Vérifie en multipliant : ${fmt(n0)} × ${dv} = ${fmt(n)}. Donc ${fmt(n)} ÷ ${dv} = ${fmt(n0)}.`,
        ),
        L(
          `Divide one place at a time, from the left. How many ${dv}s fit into the first digit (or first two digits)? Write that down, subtract, bring down the next digit, and repeat.`,
          `Divise une position à la fois, à partir de la gauche. Combien de fois ${dv} entre dans le premier chiffre (ou les deux premiers)? Écris-le, soustrais, abaisse le chiffre suivant et recommence.`,
        ),
      );
    },
  },

  'div-2digit': {
    levels: [3],
    gen: () => {
      const dv = ri(11, 25);
      const n0 = ri(12, 60);
      return num(
        L(`${fmt(dv * n0)} / ${dv} = ?`, `${fmt(dv * n0)} ÷ ${dv} = ?`),
        n0,
        L(`${dv} x ${n0} = ${fmt(dv * n0)}, so the answer is ${n0}.`, `${dv} × ${n0} = ${fmt(dv * n0)}, donc la réponse est ${n0}.`),
        L(
          `Estimate first: about how many ${dv}s make ${fmt(dv * n0)}? Start with ${dv} x 10 = ${dv * 10}. Is that too small or too big? Keep trying bigger or smaller numbers until you land exactly on ${fmt(dv * n0)}.`,
          `Estime d’abord : environ combien de fois ${dv} pour faire ${fmt(dv * n0)}? Commence par ${dv} × 10 = ${dv * 10}. Est-ce trop petit ou trop grand? Essaie des nombres plus grands ou plus petits jusqu’à tomber pile sur ${fmt(dv * n0)}.`,
        ),
      );
    },
  },

  'add-sub': {
    levels: [1, 2, 3],
    gen: (d) => {
      const [lo, hi] = d === 1 ? [100, 999] : d === 2 ? [1000, 9999] : [10000, 99999];
      let a = ri(lo, hi);
      let b = ri(lo, hi);
      if (Math.random() < 0.5) {
        return num(
          `${fmt(a)} + ${fmt(b)} = ?`,
          a + b,
          L(
            `Line up the places and add, carrying when a column is 10 or more: ${fmt(a + b)}.`,
            `Aligne les positions et additionne, avec une retenue quand une colonne fait 10 ou plus : ${fmt(a + b)}.`,
          ),
          L(
            'Line the numbers up by place (ones under ones, tens under tens). Add each column starting from the ones. If a column adds up to 10 or more, carry the 1 to the next column.',
            'Place les nombres l’un sous l’autre (unités sous unités, dizaines sous dizaines). Additionne chaque colonne en commençant par les unités. Si une colonne fait 10 ou plus, retiens 1 dans la colonne suivante.',
          ),
        );
      }
      if (b > a) [a, b] = [b, a];
      return num(
        L(`${fmt(a)} - ${fmt(b)} = ?`, `${fmt(a)} − ${fmt(b)} = ?`),
        a - b,
        L(
          `Line up the places and subtract, regrouping when needed. Check: ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}.`,
          `Aligne les positions et soustrais, en empruntant au besoin. Vérifie : ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}.`,
        ),
        L(
          'Line the numbers up by place and subtract each column, starting with the ones. If the top digit is smaller, borrow 1 from the next column (it becomes 10 more). Check by adding your answer back.',
          'Place les nombres l’un sous l’autre et soustrais chaque colonne, en commençant par les unités. Si le chiffre du haut est plus petit, emprunte 1 à la colonne suivante (ça fait 10 de plus). Vérifie en additionnant ta réponse.',
        ),
      );
    },
  },

  'place-value': {
    levels: [1, 2, 3],
    gen: (d) => {
      if (d === 3) {
        const digit = ri(2, 9);
        const bigger = Number(`${digit}${digit}00`);
        return num(
          L(
            `In ${fmt(bigger)}, how many times greater is the first ${digit} than the second ${digit}?`,
            `Dans ${fmt(bigger)}, combien de fois la valeur du premier ${digit} est-elle plus grande que celle du deuxième ${digit}?`,
          ),
          10,
          L(
            `The first ${digit} is worth ${fmt(digit * 1000)} and the second is worth ${fmt(digit * 100)}. Each place is 10 times the place to its right.`,
            `Le premier ${digit} vaut ${fmt(digit * 1000)} et le deuxième vaut ${fmt(digit * 100)}. Chaque position vaut 10 fois la position à sa droite.`,
          ),
          L(
            `Work out what each ${digit} is WORTH. The first is in the thousands place, the second in the hundreds place. How many times bigger is the first value?`,
            `Trouve ce que VAUT chaque ${digit}. Le premier est à la position des unités de mille, le deuxième à celle des centaines. Combien de fois la première valeur est-elle plus grande?`,
          ),
        );
      }
      const len = d === 1 ? 4 : 6;
      const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, len);
      const n = Number(digits.join(''));
      const idx = ri(0, len - 1);
      const digit = digits[idx];
      const place = L(PLACE_NAMES[len - 1 - idx], PLACE_NAMES_FR[len - 1 - idx]);
      const value = digit * 10 ** (len - 1 - idx);
      return num(
        L(`What is the VALUE of the digit ${digit} in ${fmt(n)}?`, `Quelle est la VALEUR du chiffre ${digit} dans ${fmt(n)}?`),
        value,
        L(`The ${digit} is in the ${place} place, so it is worth ${fmt(value)}.`, `Le ${digit} est à la position des ${place}, donc il vaut ${fmt(value)}.`),
        L(
          `Count the places from the RIGHT: ones, tens, hundreds, thousands... Find which place the ${digit} is in. Its value is ${digit} with zeros for every place to its right.`,
          `Compte les positions à partir de la DROITE : unités, dizaines, centaines, unités de mille... Trouve la position du ${digit}. Sa valeur, c’est ${digit} suivi d’un zéro pour chaque position à sa droite.`,
        ),
      );
    },
  },

  'rounding': {
    levels: [1, 2, 3],
    gen: (d) => {
      // [place, English name, lowest, highest, French "to the nearest", French "of the ... place"]
      const options: [number, string, number, number, string, string][] =
        d === 1
          ? [
              [10, 'ten', 11, 999, 'à la dizaine près', 'des dizaines'],
              [100, 'hundred', 101, 9999, 'à la centaine près', 'des centaines'],
            ]
          : d === 2
            ? [[1000, 'thousand', 1001, 99999, 'à l’unité de mille près', 'des unités de mille']]
            : [
                [10000, 'ten thousand', 10001, 999999, 'à la dizaine de mille près', 'des dizaines de mille'],
                [100000, 'hundred thousand', 100001, 999999, 'à la centaine de mille près', 'des centaines de mille'],
              ];
      const [place, name, lo, hi, nearFr, posFr] = pick(options);
      let n = ri(lo, hi);
      if (n % place === 0) n += ri(1, place - 1);
      const rounded = Math.round(n / place) * place;
      const checkDigit = Math.floor((n % place) / (place / 10));
      return num(
        L(`Round ${fmt(n)} to the nearest ${name}.`, `Arrondis ${fmt(n)} ${nearFr}.`),
        rounded,
        L(
          `Look at the digit to the right of the ${name}s place: ${checkDigit}. ${checkDigit >= 5 ? '5 or more rounds up' : 'Less than 5 rounds down'}, so it's ${fmt(rounded)}.`,
          `Regarde le chiffre à droite de la position ${posFr} : ${checkDigit}. ${checkDigit >= 5 ? '5 ou plus, on arrondit vers le haut' : 'Moins de 5, on arrondit vers le bas'}, donc c’est ${fmt(rounded)}.`,
        ),
        L(
          `Find the ${name}s place. Look at the digit just to its RIGHT. If that digit is 5 or more, round up. If it's 4 or less, keep it the same. Then change all the digits after it to zeros.`,
          `Trouve la position ${posFr}. Regarde le chiffre juste à sa DROITE. S’il vaut 5 ou plus, arrondis vers le haut. S’il vaut 4 ou moins, garde le même chiffre. Puis remplace tous les chiffres qui suivent par des zéros.`,
        ),
      );
    },
  },

  'compare': {
    levels: [1, 2],
    gen: (d) => {
      const [lo, hi] = d === 1 ? [1000, 9999] : [100000, 999999];
      const a = ri(lo, hi);
      let b = Math.random() < 0.6 ? a + ri(-999, 999) : ri(lo, hi);
      if (Math.random() < 0.12) b = a;
      const sym = a > b ? '>' : a < b ? '<' : '=';
      const label = {
        '>': L('>   greater than', '>   plus grand que'),
        '<': L('<   less than', '<   plus petit que'),
        '=': L('=   equal to', '=   égal à'),
      };
      const words = { '>': L('greater than', 'plus grand que'), '<': L('less than', 'plus petit que'), '=': L('equal to', 'égal à') }[sym];
      return choice(
        L(`Which symbol goes in the blank?\n${fmt(a)}   ______   ${fmt(b)}`, `Quel signe va sur la ligne?\n${fmt(a)}   ______   ${fmt(b)}`),
        label[sym],
        [label['>'], label['<'], label['=']],
        L(
          `${fmt(a)} ${sym} ${fmt(b)}. Compare from the biggest place first: ${fmt(a)} is ${words} ${fmt(b)}.`,
          `${fmt(a)} ${sym} ${fmt(b)}. Compare à partir de la plus grande position : ${fmt(a)} est ${words} ${fmt(b)}.`,
        ),
        L(
          'Read it from left to right: is the FIRST number greater than, less than, or equal to the SECOND number? Compare the digits from the left. The first place where they are different tells you which is bigger. The open side of > or < always faces the BIGGER number!',
          'Lis de gauche à droite : le PREMIER nombre est-il plus grand, plus petit ou égal au DEUXIÈME? Compare les chiffres à partir de la gauche. La première position où ils sont différents te dit lequel est le plus grand. Le côté ouvert de > ou < est toujours tourné vers le PLUS GRAND nombre!',
        ),
      );
    },
  },

  'factors': {
    levels: [2, 3],
    gen: (d) => {
      if (d === 3) {
        const n = pick([12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48]);
        const fs: number[] = [];
        for (let i = 1; i <= n; i++) if (n % i === 0) fs.push(i);
        return num(
          L(`How many factors does ${n} have?`, `Combien de diviseurs le nombre ${n} a-t-il?`),
          fs.length,
          L(`The factors of ${n} are ${fs.join(', ')}. That's ${fs.length}.`, `Les diviseurs de ${n} sont ${fs.join(', ')}. Ça fait ${fs.length}.`),
          L(
            `Factors are numbers that multiply together to make ${n}. List them in pairs: 1 x ${n}, 2 x ?, 3 x ?... Stop when the pairs start repeating. Count every number you found.`,
            `Les diviseurs de ${n} vont par paires qui se multiplient pour donner ${n}. Fais la liste : 1 × ${n}, 2 × ?, 3 × ?... Arrête quand les paires se répètent. Compte tous les nombres trouvés.`,
          ),
        );
      }
      const kind = ri(0, 2);
      if (kind === 0) {
        const n = pick([12, 18, 20, 24, 30, 36, 40, 42, 48, 56, 60, 72]);
        const fs: number[] = [];
        const notFs: number[] = [];
        for (let i = 2; i < n; i++) (n % i === 0 ? fs : notFs).push(i);
        const ans = pick(fs.filter((f) => f > 2 && f < n));
        const wrong = shuffle(notFs.filter((f) => f > 3 && f < 15)).slice(0, 3);
        return choice(
          L(`Which number is a FACTOR of ${n}?`, `Quel nombre est un DIVISEUR de ${n}?`),
          String(ans),
          wrong.map(String),
          L(`${ans} x ${n / ans} = ${n}, so ${ans} is a factor of ${n}.`, `${ans} × ${n / ans} = ${n}, donc ${ans} est un diviseur de ${n}.`),
          L(
            `A factor divides into ${n} evenly, with nothing left over. Try each choice: does ${n} split into equal groups of that size?`,
            `Un diviseur divise ${n} exactement, sans reste. Essaie chaque choix : peux-tu partager ${n} en groupes égaux de cette taille?`,
          ),
        );
      }
      if (kind === 1) {
        const k = ri(3, 9);
        const m = k * ri(3, 9);
        const wrong: string[] = [];
        while (wrong.length < 3) {
          const w = m + ri(-6, 6);
          if (w > 0 && w % k !== 0 && !wrong.includes(String(w))) wrong.push(String(w));
        }
        return choice(
          L(`Which number is a MULTIPLE of ${k}?`, `Quel nombre est un MULTIPLE de ${k}?`),
          String(m),
          wrong,
          L(`${k} x ${m / k} = ${m}, so ${m} is a multiple of ${k}.`, `${k} × ${m / k} = ${m}, donc ${m} est un multiple de ${k}.`),
          L(
            `Multiples of ${k} are the numbers you say when you skip-count by ${k}: ${k}, ${k * 2}, ${k * 3}... Which choice is on that list?`,
            `Les multiples de ${k} sont les nombres que tu dis en comptant de ${k} en ${k} : ${k}, ${k * 2}... Quel choix est dans cette liste?`,
          ),
        );
      }
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
      const n = Math.random() < 0.5 ? pick(primes.filter((p) => p > 10)) : pick([15, 21, 27, 33, 35, 39, 49, 51, 57, 63, 77, 81, 87, 91]);
      const isPrime = primes.includes(n);
      let f = 0;
      for (let i = 2; i < n; i++)
        if (n % i === 0) {
          f = i;
          break;
        }
      const PRIME = L('Prime', 'Premier');
      const COMPOSITE = L('Composite', 'Composé');
      return choice(
        L(`Is ${n} PRIME or COMPOSITE?`, `Le nombre ${n} est-il PREMIER ou COMPOSÉ?`),
        isPrime ? PRIME : COMPOSITE,
        [isPrime ? COMPOSITE : PRIME],
        isPrime
          ? L(`${n} can only be divided evenly by 1 and ${n}, so it is prime.`, `${n} se divise exactement seulement par 1 et par ${n}, donc il est premier.`)
          : L(`${f} x ${n / f} = ${n}, so ${n} has more than two factors. It is composite.`, `${f} × ${n / f} = ${n}, donc ${n} a plus de deux diviseurs. Il est composé.`),
        L(
          `A PRIME number can only be divided evenly by 1 and itself. A COMPOSITE number has other factors too. Try dividing ${n} by 2, 3, 5 and 7. Does any of them go in evenly?`,
          `Un nombre PREMIER se divise exactement seulement par 1 et par lui-même. Un nombre COMPOSÉ a d’autres diviseurs. Essaie de diviser ${n} par 2, 3, 5 et 7. Est-ce qu’une de ces divisions tombe juste?`,
        ),
      );
    },
  },

  'patterns': {
    levels: [1, 2],
    gen: (d) => {
      if (d === 1) {
        const start = ri(1, 20);
        const step = ri(3, 12);
        const seq = [0, 1, 2, 3].map((i) => start + step * i);
        return num(
          L(`What comes next?\n${seq.join(', ')}, ?`, `Quel nombre vient ensuite?\n${seq.join(', ')}, ?`),
          start + step * 4,
          L(`The rule is "add ${step}". ${seq[3]} + ${step} = ${start + step * 4}.`, `La règle est ${q(`ajoute ${step}`)}. ${seq[3]} + ${step} = ${start + step * 4}.`),
          L(
            'Find the RULE. How much does the number go up from one to the next? Check that it is the same every time, then do it once more to the last number.',
            'Trouve la RÈGLE. De combien le nombre augmente-t-il d’un nombre au suivant? Vérifie que c’est pareil chaque fois, puis fais-le encore une fois avec le dernier nombre.',
          ),
        );
      }
      const start = ri(1, 5);
      const mult = ri(2, 4);
      const seq = [0, 1, 2, 3].map((i) => start * mult ** i);
      const next = start * mult ** 4;
      return num(
        L(`What comes next?\n${seq.join(', ')}, ?`, `Quel nombre vient ensuite?\n${seq.join(', ')}, ?`),
        next,
        L(`The rule is "multiply by ${mult}". ${seq[3]} x ${mult} = ${next}.`, `La règle est ${q(`multiplie par ${mult}`)}. ${seq[3]} × ${mult} = ${fmt(next)}.`),
        L(
          'These numbers grow faster and faster, so the rule is probably MULTIPLY, not add. What do you multiply each number by to get the next one?',
          'Ces nombres grandissent de plus en plus vite : la règle est sûrement de MULTIPLIER, pas d’additionner. Par quoi multiplies-tu chaque nombre pour obtenir le suivant?',
        ),
      );
    },
  },

  'order-ops': {
    levels: [2, 3],
    gen: (d) => {
      const a = ri(2, 9);
      const b = ri(2, 9);
      const c = ri(2, 6);
      if (d === 2 || Math.random() < 0.5) {
        if (Math.random() < 0.5) {
          return num(
            L(`${a} + ${b} x ${c} = ?`, `${a} + ${b} × ${c} = ?`),
            a + b * c,
            L(
              `Multiply first: ${b} x ${c} = ${b * c}. Then add: ${a} + ${b * c} = ${a + b * c}.`,
              `Multiplie d’abord : ${b} × ${c} = ${b * c}. Puis additionne : ${a} + ${b * c} = ${a + b * c}.`,
            ),
            L(
              'Order of operations: do multiplying and dividing BEFORE adding and subtracting, even if they come later in the problem.',
              'Priorité des opérations : fais les multiplications et les divisions AVANT les additions et les soustractions, même si elles viennent plus loin.',
            ),
          );
        }
        return num(
          L(`(${a} + ${b}) x ${c} = ?`, `(${a} + ${b}) × ${c} = ?`),
          (a + b) * c,
          L(
            `Parentheses first: ${a} + ${b} = ${a + b}. Then ${a + b} x ${c} = ${(a + b) * c}.`,
            `Les parenthèses d’abord : ${a} + ${b} = ${a + b}. Puis ${a + b} × ${c} = ${(a + b) * c}.`,
          ),
          L(
            'Order of operations: always do what is inside the (parentheses) FIRST. Then do the rest.',
            'Priorité des opérations : fais toujours ce qui est entre (parenthèses) EN PREMIER. Ensuite, fais le reste.',
          ),
        );
      }
      const e = ri(1, Math.min(9, a + b * c - 1));
      return num(
        L(`${a} + ${b} x ${c} - ${e} = ?`, `${a} + ${b} × ${c} − ${e} = ?`),
        a + b * c - e,
        L(
          `Multiply first: ${b} x ${c} = ${b * c}. Then left to right: ${a} + ${b * c} - ${e} = ${a + b * c - e}.`,
          `Multiplie d’abord : ${b} × ${c} = ${b * c}. Puis de gauche à droite : ${a} + ${b * c} − ${e} = ${a + b * c - e}.`,
        ),
        L(
          'Do the multiplying FIRST. Then do the adding and subtracting from LEFT to RIGHT.',
          'Fais la multiplication EN PREMIER. Ensuite, fais les additions et les soustractions de GAUCHE à DROITE.',
        ),
      );
    },
  },

  'fractions-equiv': {
    levels: [2, 3],
    gen: (d) => {
      const den = pick([2, 3, 4, 5, 6, 8, 10]);
      const nu = ri(1, den - 1);
      const k = d === 2 ? ri(2, 4) : ri(3, 6);
      if (Math.random() < 0.5) {
        return num(
          `${nu}/${den} = ?/${den * k}`,
          nu * k,
          L(
            `${den} x ${k} = ${den * k}, so multiply the top by ${k} too: ${nu} x ${k} = ${nu * k}.`,
            `${den} × ${k} = ${den * k}, donc multiplie aussi le numérateur par ${k} : ${nu} × ${k} = ${nu * k}.`,
          ),
          L(
            `Equivalent fractions are the same amount cut into different size pieces. What did the bottom number get multiplied by to go from ${den} to ${den * k}? Do the SAME to the top number.`,
            `Des fractions équivalentes, c’est la même quantité coupée en morceaux de tailles différentes. Par quoi a-t-on multiplié le dénominateur pour passer de ${den} à ${den * k}? Fais la MÊME chose au numérateur.`,
          ),
        );
      }
      return num(
        `${nu * k}/${den * k} = ${nu}/?`,
        den,
        L(
          `${nu * k} / ${k} = ${nu}, so divide the bottom by ${k} too: ${den * k} / ${k} = ${den}.`,
          `${nu * k} ÷ ${k} = ${nu}, donc divise aussi le dénominateur par ${k} : ${den * k} ÷ ${k} = ${den}.`,
        ),
        L(
          `What did the top number get divided by to go from ${nu * k} to ${nu}? Do the SAME to the bottom number.`,
          `Par quoi a-t-on divisé le numérateur pour passer de ${nu * k} à ${nu}? Fais la MÊME chose au dénominateur.`,
        ),
      );
    },
  },

  'fractions-compare': {
    levels: [3],
    gen: () => {
      let a: [number, number];
      let b: [number, number];
      do {
        const da = pick([2, 3, 4, 5, 6, 8, 10, 12]);
        const db = pick([2, 3, 4, 5, 6, 8, 10, 12].filter((x) => x !== da));
        a = [ri(1, da - 1), da];
        b = [ri(1, db - 1), db];
      } while (a[0] * b[1] === b[0] * a[1] && Math.random() < 0.7);
      const lhs = a[0] * b[1];
      const rhs = b[0] * a[1];
      const fa = `${a[0]}/${a[1]}`;
      const fb = `${b[0]}/${b[1]}`;
      const EQUAL = L('They are equal', 'Elles sont égales');
      const ans = lhs > rhs ? fa : lhs < rhs ? fb : EQUAL;
      const common = (a[1] * b[1]) / gcd(a[1], b[1]);
      const ea = `${(a[0] * common) / a[1]}/${common}`;
      const eb = `${(b[0] * common) / b[1]}/${common}`;
      return choice(
        L(`Which fraction is GREATER?\n${fa}  or  ${fb}`, `Quelle fraction est la plus GRANDE?\n${fa}  ou  ${fb}`),
        ans,
        [fa, fb, EQUAL],
        L(
          `Use a common denominator: ${fa} = ${ea} and ${fb} = ${eb}. ${ans === EQUAL ? 'They are the same size!' : `${ans} is greater.`}`,
          `Utilise un dénominateur commun : ${fa} = ${ea} et ${fb} = ${eb}. ${ans === EQUAL ? 'Elles sont de la même grandeur!' : `${ans} est plus grande.`}`,
        ),
        L(
          `It's hard to compare pieces of different sizes. Rewrite both fractions so they have the SAME bottom number (try ${common}). Then just compare the top numbers. You can also compare each one to 1/2.`,
          `C’est difficile de comparer des morceaux de tailles différentes. Récris les deux fractions avec le MÊME dénominateur (essaie ${common}). Puis compare seulement les numérateurs. Tu peux aussi comparer chacune à 1/2.`,
        ),
      );
    },
  },

  'fractions-add': {
    levels: [2, 3],
    gen: (d) => {
      const den = pick([4, 5, 6, 8, 10, 12]);
      if (d === 2) {
        const a = ri(1, den - 2);
        const b = ri(1, den - 1 - a);
        const teach = L(
          `When the bottom numbers are the same, the pieces are the same size. Just add or subtract the TOP numbers, and keep the bottom number ${den}.`,
          `Quand les dénominateurs sont pareils, les morceaux ont la même taille. Additionne ou soustrais seulement les NUMÉRATEURS, et garde le dénominateur ${den}.`,
        );
        if (Math.random() < 0.5) {
          return num(
            `${a}/${den} + ${b}/${den} = ?/${den}`,
            a + b,
            L(
              `Same bottom number, so just add the tops: ${a} + ${b} = ${a + b}. Answer: ${a + b}/${den}.`,
              `Même dénominateur : additionne seulement les numérateurs, ${a} + ${b} = ${a + b}. Réponse : ${a + b}/${den}.`,
            ),
            teach,
          );
        }
        const big = a + b;
        return num(
          L(`${big}/${den} - ${b}/${den} = ?/${den}`, `${big}/${den} − ${b}/${den} = ?/${den}`),
          a,
          L(
            `Same bottom number, so just subtract the tops: ${big} - ${b} = ${a}. Answer: ${a}/${den}.`,
            `Même dénominateur : soustrais seulement les numérateurs, ${big} − ${b} = ${a}. Réponse : ${a}/${den}.`,
          ),
          teach,
        );
      }
      const w1 = ri(1, 4);
      const w2 = ri(1, 3);
      const n1 = ri(1, den - 2);
      const n2 = ri(1, den - 1 - n1);
      const ans = `${w1 + w2} ${n1 + n2}/${den}`;
      return choice(
        `${w1} ${n1}/${den} + ${w2} ${n2}/${den} = ?`,
        ans,
        [`${w1 + w2} ${n1 + n2}/${den * 2}`, `${w1 + w2 + 1} ${n1 + n2}/${den}`, `${w1 + w2} ${Math.max(1, n1 + n2 - 1)}/${den}`],
        L(
          `Add the wholes: ${w1} + ${w2} = ${w1 + w2}. Add the fractions: ${n1}/${den} + ${n2}/${den} = ${n1 + n2}/${den}. Answer: ${ans}.`,
          `Additionne les entiers : ${w1} + ${w2} = ${w1 + w2}. Additionne les fractions : ${n1}/${den} + ${n2}/${den} = ${n1 + n2}/${den}. Réponse : ${ans}.`,
        ),
        L(
          'Add the whole numbers together. Then add the fractions (same bottom number, so add the tops and keep the bottom). Put the two parts together.',
          'Additionne les nombres entiers. Puis additionne les fractions (même dénominateur : additionne les numérateurs et garde le dénominateur). Mets les deux parties ensemble.',
        ),
      );
    },
  },

  'fractions-unlike': {
    levels: [3],
    gen: () => {
      // a/b + c/d with b != d and a sum less than 1
      let a = 1;
      let b = 2;
      let c = 1;
      let d = 3;
      do {
        b = pick([2, 3, 4, 5, 6, 8]);
        d = pick([2, 3, 4, 5, 6, 8].filter((x) => x !== b));
        a = ri(1, b - 1);
        c = ri(1, d - 1);
      } while (a * d + c * b >= b * d);
      const common = (b * d) / gcd(b, d);
      const top = (a * common) / b + (c * common) / d;
      const ans = simplify(top, common);
      const wrong = [`${a + c}/${b + d}`, `${a + c}/${common}`, simplify(top + 1, common)].filter((w) => w !== ans);
      const tail = ans !== `${top}/${common}` ? ` = ${ans}` : '';
      return choice(
        `${a}/${b} + ${c}/${d} = ?`,
        ans,
        wrong,
        L(
          `Use ${common} as the bottom: ${a}/${b} = ${(a * common) / b}/${common} and ${c}/${d} = ${(c * common) / d}/${common}. Add the tops: ${top}/${common}${tail}.`,
          `Prends ${common} comme dénominateur : ${a}/${b} = ${(a * common) / b}/${common} et ${c}/${d} = ${(c * common) / d}/${common}. Additionne les numérateurs : ${top}/${common}${tail}.`,
        ),
        L(
          `You can't add pieces of different sizes! First rewrite both fractions with the same bottom number (${common} works). Then add the tops. Simplify if you can. Never add the bottom numbers together.`,
          `On ne peut pas additionner des morceaux de tailles différentes! Récris d’abord les deux fractions avec le même dénominateur (${common} fonctionne). Puis additionne les numérateurs. Simplifie si tu peux. N’additionne jamais les dénominateurs.`,
        ),
      );
    },
  },

  'fractions-mult': {
    levels: [3],
    gen: () => {
      const den = pick([3, 4, 5, 6, 8, 10]);
      const nu = ri(1, den - 1);
      const k = ri(2, 6);
      return num(
        L(`${k} x ${nu}/${den} = ?/${den}`, `${k} × ${nu}/${den} = ?/${den}`),
        k * nu,
        L(
          `${k} groups of ${nu}/${den}: multiply the top, ${k} x ${nu} = ${k * nu}. Answer: ${k * nu}/${den}.`,
          `${k} groupes de ${nu}/${den} : multiplie le numérateur, ${k} × ${nu} = ${k * nu}. Réponse : ${k * nu}/${den}.`,
        ),
        L(
          `${k} x ${nu}/${den} means ${k} groups of ${nu}/${den}. The piece size (bottom number) stays ${den}. Multiply only the TOP number by ${k}.`,
          `${k} × ${nu}/${den} veut dire ${k} groupes de ${nu}/${den}. La taille des morceaux (le dénominateur) reste ${den}. Multiplie seulement le NUMÉRATEUR par ${k}.`,
        ),
      );
    },
  },

  'decimals': {
    levels: [2, 3],
    gen: (d) => {
      const kind = d === 2 ? ri(0, 1) : ri(1, 2);
      if (kind === 0) {
        const t = ri(1, 9);
        return num(
          `${t}/10 = ?/100`,
          t * 10,
          L(`${t} tenths is the same as ${t * 10} hundredths, so ${t}/10 = ${t * 10}/100.`, `${t} ${pl(t, 'dixième', 'dixièmes')}, c’est pareil que ${t * 10} centièmes, donc ${t}/10 = ${t * 10}/100.`),
          L(
            'One tenth is the same as 10 hundredths (like 1 dime = 10 pennies). So multiply the top and bottom by 10.',
            'Un dixième, c’est pareil que 10 centièmes (comme une pièce de 10\u00a0¢ vaut 10 cents). Donc multiplie le numérateur et le dénominateur par 10.',
          ),
        );
      }
      if (kind === 1) {
        const h = ri(11, 99);
        const ans = fmtDec(h / 100, 2);
        return choice(
          L(`Write ${h}/100 as a decimal.`, `Écris ${h}/100 en nombre décimal.`),
          ans,
          [fmtDec(h / 10, 1), L(`0.0${h}`, `0,0${h}`), L(`${h}.0`, `${h},0`)],
          L(`Hundredths go two places after the decimal point: ${h}/100 = ${ans}.`, `Les centièmes vont à la deuxième position après la virgule : ${h}/100 = ${ans}.`),
          L(
            'Hundredths means two places after the decimal point. Think of money: 100 cents is one dollar, so how would you write that many cents in dollars?',
            'Les centièmes, c’est deux chiffres après la virgule. Pense à l’argent : 100 cents font un dollar. Comment écrirais-tu ce nombre de cents en dollars?',
          ),
        );
      }
      const t = ri(2, 9);
      let h = ri(10, 99);
      if (h === t * 10) h += 1;
      const a = L(`0.${t}`, `0,${t}`);
      const b = fmtDec(h / 100, 2);
      const ans = t * 10 > h ? a : b;
      return choice(
        L(`Which decimal is GREATER?\n${a}  or  ${b}`, `Quel nombre décimal est le plus GRAND?\n${a}  ou  ${b}`),
        ans,
        [a, b],
        L(
          `${a} = ${fmtDec(t / 10, 2)} (${t * 10} hundredths). Compare ${t * 10} and ${h} hundredths: ${ans} is greater.`,
          `${a} = ${fmtDec(t / 10, 2)} (${t * 10} centièmes). Compare ${t * 10} et ${h} centièmes : ${ans} est plus grand.`,
        ),
        L(
          `Make them the same length first: add a zero to the end of ${a} so it has two decimal places. Then compare them like whole numbers. A longer decimal is NOT always bigger!`,
          `Rends-les de la même longueur d’abord : ajoute un zéro à la fin de ${a} pour avoir deux chiffres après la virgule. Puis compare-les comme des nombres entiers. Un nombre décimal plus long n’est PAS toujours plus grand!`,
        ),
      );
    },
  },

  'decimal-ops': {
    levels: [2, 3],
    gen: (d) => {
      const a = ri(10, d === 2 ? 99 : 999) / 10 + (d === 3 ? ri(0, 9) / 100 : 0);
      const b = ri(10, d === 2 ? 99 : 999) / 10 + (d === 3 ? ri(0, 9) / 100 : 0);
      const add = Math.random() < 0.5;
      const [x, y] = add ? [a, b] : [Math.max(a, b), Math.min(a, b)];
      const exact = add ? x + y : x - y;
      const ans = dec(exact);
      const wrong = [dec(exact + 1), dec(exact - 0.1 > 0 ? exact - 0.1 : exact + 0.2), dec(exact + 0.01 * (d === 3 ? 1 : 10))];
      const op = add ? '+' : L('-', '−');
      return choice(
        `${dec(x)} ${op} ${dec(y)} = ?`,
        ans,
        wrong,
        L(
          `Line up the decimal points and ${add ? 'add' : 'subtract'} each column: ${dec(x)} ${op} ${dec(y)} = ${ans}.`,
          `Aligne les virgules et ${add ? 'additionne' : 'soustrais'} chaque colonne : ${dec(x)} ${op} ${dec(y)} = ${ans}.`,
        ),
        L(
          `Write the numbers one above the other with the DECIMAL POINTS lined up. Fill empty spots with zeros. Then ${add ? 'add' : 'subtract'} like normal, and keep the decimal point in the same place.`,
          `Écris les nombres l’un sous l’autre avec les VIRGULES alignées. Remplis les places vides avec des zéros. Puis ${add ? 'additionne' : 'soustrais'} comme d’habitude, et garde la virgule à la même place.`,
        ),
      );
    },
  },

  'measurement': {
    levels: [1, 2],
    gen: (d) => {
      // Time works everywhere; lengths, weights and volumes follow the chosen units.
      const us = getUnits() === 'imperial';
      const conv: [string, string, number][] =
        d === 1
          ? [
              ['hours', 'minutes', 60],
              ['minutes', 'seconds', 60],
              ...((us
                ? [['feet', 'inches', 12], ['yards', 'feet', 3], ['weeks', 'days', 7]]
                : [['meters', 'centimeters', 100], ['centimeters', 'millimeters', 10], ['weeks', 'days', 7]]) as [string, string, number][]),
            ]
          : [
              ['days', 'hours', 24],
              ...((us
                ? [['pounds', 'ounces', 16], ['gallons', 'quarts', 4], ['quarts', 'cups', 4], ['yards', 'inches', 36], ['gallons', 'pints', 8]]
                : [['kilograms', 'grams', 1000], ['liters', 'milliliters', 1000], ['kilometers', 'meters', 1000], ['meters', 'millimeters', 1000]]) as [string, string, number][]),
            ];
      const [big, small, f] = pick(conv);
      const n = ri(2, d === 1 ? 6 : 9);
      if (getLang() === 'fr') {
        const [bigFr, oneFr] = UNIT_FR[big];
        const smallFr = UNIT_FR[small][0];
        return num(
          `${n} ${bigFr} = ? ${smallFr}`,
          n * f,
          `1 ${oneFr} = ${fmt(f)} ${smallFr}, donc ${n} × ${fmt(f)} = ${fmt(n * f)} ${smallFr}.`,
          `Rappelle-toi d’abord combien ${deFr(smallFr)} il y a dans 1 ${oneFr} (c’est ${fmt(f)}). Tu as ${n} ${bigFr} : il te faut donc ${n} groupes de ce nombre. D’une grande unité à une petite, on multiplie.`,
        );
      }
      const one = big === 'feet' ? 'foot' : big === 'inches' ? 'inch' : big.replace(/s$/, '');
      return num(
        `${n} ${big} = ? ${small}`,
        n * f,
        `1 ${one} = ${f} ${small}, so ${n} x ${f} = ${fmt(n * f)} ${small}.`,
        `First remember how many ${small} are in ONE ${one} (it's ${f}). You have ${n} ${big}, so you need ${n} groups of that. Big unit to small unit means multiply.`,
      );
    },
  },

  'area-perimeter': {
    levels: [1, 2, 3],
    gen: (d) => {
      const l = ri(3, d === 1 ? 9 : 15);
      const w = ri(2, d === 1 ? 8 : 12);
      const [u, units, sq] =
        getUnits() === 'imperial'
          ? [L('ft', 'pi'), L('feet', 'pieds'), L('square feet', 'pieds carrés')]
          : ['m', L('meters', 'mètres'), L('square meters', 'mètres carrés')];
      if (d === 3) {
        const area = l * w;
        return num(
          L(
            `A rectangle has an area of ${area} ${sq}. One side is ${w} ${units}. How long is the other side?`,
            `L’aire d’un rectangle est de ${area} ${sq}. Un côté mesure ${w} ${units}. Combien mesure l’autre côté?`,
          ),
          l,
          L(`Area = length x width, so ${area} / ${w} = ${l} ${units}.`, `Aire = longueur × largeur, donc ${area} ÷ ${w} = ${l} ${units}.`),
          L(
            `Area = length x width. You know the area and one side, so ask: ${w} times WHAT equals ${area}? That's a division problem.`,
            `Aire = longueur × largeur. Tu connais l’aire et un côté, alors demande-toi : ${w} fois QUOI donne ${area}? C’est une division.`,
          ),
        );
      }
      if (Math.random() < 0.5) {
        return num(
          L(`A rectangle is ${l} ${u} long and ${w} ${u} wide. What is its AREA in ${sq}?`, `Un rectangle mesure ${l} ${u} de long et ${w} ${u} de large. Quelle est son AIRE en ${sq}?`),
          l * w,
          L(`Area = length x width = ${l} x ${w} = ${l * w} ${sq}.`, `Aire = longueur × largeur = ${l} × ${w} = ${l * w} ${sq}.`),
          L(
            'AREA is how many squares cover the inside of the shape. For a rectangle, multiply the length by the width.',
            'L’AIRE, c’est le nombre de carrés qui couvrent l’intérieur de la figure. Pour un rectangle, multiplie la longueur par la largeur.',
          ),
        );
      }
      return num(
        L(`A rectangle is ${l} ${u} long and ${w} ${u} wide. What is its PERIMETER in ${units}?`, `Un rectangle mesure ${l} ${u} de long et ${w} ${u} de large. Quel est son PÉRIMÈTRE en ${units}?`),
        2 * (l + w),
        L(
          `Perimeter = all the sides added: ${l} + ${w} + ${l} + ${w} = ${2 * (l + w)} ${units}.`,
          `Périmètre = tous les côtés additionnés : ${l} + ${w} + ${l} + ${w} = ${2 * (l + w)} ${units}.`,
        ),
        L(
          'PERIMETER is the distance all the way AROUND the outside. A rectangle has 4 sides: two long ones and two short ones. Add all four.',
          'Le PÉRIMÈTRE, c’est la distance tout AUTOUR de la figure. Un rectangle a 4 côtés : deux longs et deux courts. Additionne les quatre.',
        ),
      );
    },
  },

  'volume': {
    levels: [2, 3],
    gen: (d) => {
      const l = ri(2, d === 2 ? 6 : 12);
      const w = ri(2, d === 2 ? 5 : 9);
      const h = ri(2, d === 2 ? 4 : 8);
      const [u, cubic] = getUnits() === 'imperial' ? [L('in.', 'po'), L('cubic inches', 'pouces cubes')] : ['cm', L('cubic cm', 'centimètres cubes')];
      return num(
        L(
          `A box is ${l} ${u} long, ${w} ${u} wide and ${h} ${u} tall. What is its VOLUME in ${cubic}?`,
          `Une boîte mesure ${l} ${u} de long, ${w} ${u} de large et ${h} ${u} de haut. Quel est son VOLUME en ${cubic}?`,
        ),
        l * w * h,
        L(
          `Volume = length x width x height = ${l} x ${w} x ${h} = ${l * w * h} ${cubic}.`,
          `Volume = longueur × largeur × hauteur = ${l} × ${w} × ${h} = ${l * w * h} ${cubic}.`,
        ),
        L(
          `Volume is how many little cubes fit inside. Find how many cubes cover the bottom (${l} x ${w}), then multiply by how many layers tall it is (${h}).`,
          `Le volume, c’est le nombre de petits cubes qui entrent dedans. Trouve combien de cubes couvrent le fond (${l} × ${w}), puis multiplie par le nombre d’étages (${h}).`,
        ),
      );
    },
  },

  'angles': {
    levels: [2, 3],
    gen: (d) => {
      if (d === 2) {
        const kind = pick(['acute', 'right', 'obtuse'] as const);
        const deg = kind === 'acute' ? ri(2, 17) * 5 : kind === 'right' ? 90 : ri(19, 35) * 5;
        const FR_KIND = { acute: 'aigu', right: 'droit', obtuse: 'obtus' } as const;
        const name = (k: 'acute' | 'right' | 'obtuse') => L(k[0].toUpperCase() + k.slice(1), FR_KIND[k][0].toUpperCase() + FR_KIND[k].slice(1));
        return choice(
          L(`An angle measures ${deg} degrees. What kind of angle is it?`, `Un angle mesure ${deg} degrés. Quelle sorte d’angle est-ce?`),
          name(kind),
          [name('acute'), name('right'), name('obtuse')],
          L(
            `Acute is less than 90 degrees, right is exactly 90, obtuse is between 90 and 180. ${deg} is ${kind}.`,
            `Un angle aigu mesure moins de 90 degrés, un angle droit mesure exactement 90 degrés, un angle obtus est entre 90 et 180 degrés. ${deg} degrés : c’est un angle ${FR_KIND[kind]}.`,
          ),
          L(
            'Compare the angle to 90 degrees (a square corner). Smaller than 90 is ACUTE ("a cute little angle"). Exactly 90 is RIGHT. Bigger than 90 is OBTUSE.',
            'Compare l’angle à 90 degrés (un coin carré). Plus petit que 90, c’est AIGU (pointu comme une aiguille). Exactement 90, c’est DROIT. Plus grand que 90, c’est OBTUS.',
          ),
        );
      }
      if (Math.random() < 0.5) {
        const a = ri(5, 34) * 5;
        return num(
          L(
            `A straight line is 180 degrees. It is split into two angles. One is ${a} degrees. What is the other?`,
            `Une ligne droite fait un angle de 180 degrés. On la sépare en deux angles. L’un mesure ${a} degrés. Combien mesure l’autre?`,
          ),
          180 - a,
          L(`180 - ${a} = ${180 - a} degrees.`, `180 − ${a} = ${180 - a} degrés.`),
          L(
            'The two angles together make the whole straight line, 180 degrees. So take away the part you know from 180.',
            'Les deux angles ensemble forment toute la ligne droite : 180 degrés. Enlève de 180 la partie que tu connais.',
          ),
        );
      }
      const a = ri(2, 16) * 5;
      return num(
        L(
          `A right angle (90 degrees) is split into two angles. One is ${a} degrees. What is the other?`,
          `On sépare un angle droit (90 degrés) en deux angles. L’un mesure ${a} degrés. Combien mesure l’autre?`,
        ),
        90 - a,
        L(`90 - ${a} = ${90 - a} degrees.`, `90 − ${a} = ${90 - a} degrés.`),
        L('The two angles together make 90 degrees. Take away the part you know from 90.', 'Les deux angles ensemble font 90 degrés. Enlève de 90 la partie que tu connais.'),
      );
    },
  },

  'word-problems': {
    levels: [1, 2, 3],
    gen: (d) => {
      const MULT_TEACH = L(
        'Look for clue words. "Each", "every" and "times as many" usually mean MULTIPLY: equal groups put together.',
        `Cherche les mots clés. ${q('Chaque')}, ${q('chacun')} et ${q('fois plus')} veulent souvent dire MULTIPLIER : des groupes égaux mis ensemble.`,
      );
      if (d === 1) {
        const a = ri(12, 60);
        const b = ri(5, 30);
        if (Math.random() < 0.5) {
          return num(
            L(`A knight has ${a} coins. He finds ${b} more. How many coins does he have now?`, `Un chevalier a ${a} pièces d’or. Il en trouve ${b} autres. Combien de pièces a-t-il maintenant?`),
            a + b,
            L(`${a} + ${b} = ${a + b} coins.`, `${a} + ${b} = ${a + b} pièces.`),
            L(
              '"Finds more" means the amount gets BIGGER, so you add the two numbers together.',
              `${q('En trouve d’autres')} veut dire que la quantité devient plus GRANDE : additionne les deux nombres.`,
            ),
          );
        }
        return num(
          L(`A wizard has ${a + b} potions. She gives away ${b}. How many are left?`, `Une magicienne a ${a + b} potions. Elle en donne ${b}. Combien lui en reste-t-il?`),
          a,
          L(`${a + b} - ${b} = ${a} potions.`, `${a + b} − ${b} = ${a} potions.`),
          L(
            '"Gives away" and "left" mean the amount gets SMALLER, so you subtract.',
            `${q('Donne')} et ${q('reste')} veulent dire que la quantité devient plus PETITE : soustrais.`,
          ),
        );
      }
      if (d === 2) {
        const t = ri(0, 3);
        if (t === 0) {
          const piles = ri(3, 8);
          const each = ri(12, 125);
          return num(
            L(`A dragon has ${piles} piles of gold. Each pile has ${each} coins. How many coins in all?`, `Un dragon a ${piles} tas d’or. Chaque tas contient ${each} pièces. Combien de pièces y a-t-il en tout?`),
            piles * each,
            L(`${piles} x ${each} = ${fmt(piles * each)} coins.`, `${piles} × ${each} = ${fmt(piles * each)} pièces.`),
            MULT_TEACH,
          );
        }
        if (t === 1) {
          const n = ri(4, 9);
          const each = ri(6, 15);
          return num(
            L(`${n * each} arrows are shared equally into ${n} quivers. How many arrows in each quiver?`, `On partage ${n * each} flèches également dans ${n} carquois. Combien de flèches y a-t-il dans chaque carquois?`),
            each,
            L(`${n * each} / ${n} = ${each} arrows each.`, `${n * each} ÷ ${n} = ${each} flèches dans chaque carquois.`),
            L(
              '"Shared equally" means split into equal groups. That is DIVISION: total divided by the number of groups.',
              `${q('Partager également')} veut dire séparer en groupes égaux. C’est une DIVISION : le total divisé par le nombre de groupes.`,
            ),
          );
        }
        if (t === 2) {
          const a = ri(3, 9);
          const b = ri(2, 6);
          return num(
            L(`A goblin has ${a} gems. A troll has ${b} times as many. How many gems does the troll have?`, `Un gobelin a ${a} pierres précieuses. Un troll en a ${b} fois plus. Combien de pierres précieuses le troll a-t-il?`),
            a * b,
            L(`"${b} times as many" means multiply: ${a} x ${b} = ${a * b}.`, `${q(`${b} fois plus`)} veut dire multiplier : ${a} × ${b} = ${a * b}.`),
            MULT_TEACH,
          );
        }
        const have = ri(120, 600);
        const spend = ri(40, have - 20);
        return num(
          L(`You have ${have} gold and spend ${spend} on a new sword. How much gold is left?`, `Tu as ${have} pièces d’or et tu en dépenses ${spend} pour une nouvelle épée. Combien de pièces d’or te reste-t-il?`),
          have - spend,
          L(`${have} - ${spend} = ${have - spend} gold.`, `${have} − ${spend} = ${have - spend} pièces d’or.`),
          L(
            '"Spend" and "left" mean the amount goes DOWN, so subtract what you spent from what you had.',
            `${q('Dépenser')} et ${q('reste')} veulent dire que la quantité DIMINUE : soustrais ce que tu as dépensé de ce que tu avais.`,
          ),
        );
      }
      const t = ri(0, 2);
      if (t === 0) {
        const n = ri(2, 5);
        const cost = ri(6, 18);
        const pay = Math.ceil((n * cost + 1) / 10) * 10 + pick([0, 10, 20]);
        return num(
          L(
            `You buy ${n} potions for ${cost} gold each. You pay with ${pay} gold. How much change do you get?`,
            `Tu achètes ${n} potions à ${cost} pièces d’or chacune. Tu paies avec ${pay} pièces d’or. Combien de pièces te rend-on?`,
          ),
          pay - n * cost,
          L(
            `${n} x ${cost} = ${n * cost} gold. ${pay} - ${n * cost} = ${pay - n * cost} gold change.`,
            `${n} × ${cost} = ${n * cost} pièces d’or. ${pay} − ${n * cost} = ${pay - n * cost} pièces de monnaie.`,
          ),
          L(
            'This one has TWO steps. Step 1: find the total cost (how many potions times the price of each). Step 2: change is what you paid minus the total cost.',
            'Ce problème a DEUX étapes. Étape 1 : trouve le coût total (le nombre de potions fois le prix de chacune). Étape 2 : la monnaie, c’est ce que tu as payé moins le coût total.',
          ),
        );
      }
      if (t === 1) {
        const per = ri(4, 8);
        const kids = ri(20, 60);
        const boats = Math.ceil(kids / per);
        const rest = kids % per;
        return num(
          L(
            `${kids} adventurers need to cross a lake. Each boat holds ${per}. How many boats are needed so everyone gets across?`,
            `${kids} aventuriers doivent traverser un lac. Chaque bateau peut transporter ${per} personnes. Combien de bateaux faut-il pour que tout le monde traverse?`,
          ),
          boats,
          L(
            `${kids} / ${per} = ${Math.floor(kids / per)}${rest ? ` R ${rest}. The ${rest} left over need one more boat, so ${boats}` : ''} boats.`,
            `${kids} ÷ ${per} = ${Math.floor(kids / per)}${rest ? ` reste ${rest}. ${rest === 1 ? 'La personne qui reste a' : `Les ${rest} personnes qui restent ont`} besoin d’un bateau de plus, donc ${boats}` : ''} bateaux.`,
          ),
          L(
            `Divide the people by how many fit in each boat. Careful! If anyone is left over (a remainder), they still need a boat. Nobody gets left behind!`,
            `Divise le nombre de personnes par le nombre de places dans un bateau. Attention! S’il reste des personnes (un reste), elles ont aussi besoin d’un bateau. Personne ne reste sur la rive!`,
          ),
        );
      }
      const rows = ri(3, 7);
      const cols = ri(4, 9);
      const lost = ri(2, rows * cols - 5);
      return num(
        L(
          `A wizard plants ${rows} rows of ${cols} magic beans. Then ${lost} beans are eaten by a mouse. How many beans are left?`,
          `Un magicien plante ${rows} rangées de ${cols} haricots magiques. Puis une souris mange ${lost} haricots. Combien de haricots reste-t-il?`,
        ),
        rows * cols - lost,
        L(
          `${rows} x ${cols} = ${rows * cols} beans. ${rows * cols} - ${lost} = ${rows * cols - lost}.`,
          `${rows} × ${cols} = ${rows * cols} haricots. ${rows * cols} − ${lost} = ${rows * cols - lost}.`,
        ),
        L(
          'TWO steps. Step 1: rows of beans is equal groups, so multiply to find how many were planted. Step 2: some were eaten, so subtract.',
          'DEUX étapes. Étape 1 : des rangées de haricots, ce sont des groupes égaux, donc multiplie pour savoir combien ont été plantés. Étape 2 : certains ont été mangés, donc soustrais.',
        ),
      );
    },
  },

  // ------------------------------------------------------------ grade 6
  'percent': {
    levels: [1, 2, 3],
    gen: (d) => {
      const FRAC: Record<number, [number, number]> = { 10: [1, 10], 20: [1, 5], 25: [1, 4], 50: [1, 2], 75: [3, 4] };
      const kind = d === 1 ? pick(['of', 'of', 'grid']) : d === 2 ? pick(['of', 'frac', 'dec']) : pick(['of3', 'off', 'what']);
      if (kind === 'grid') {
        const k = ri(5, 95);
        return num(
          L(`A grid has 100 squares. ${k} squares are colored. What percent of the grid is colored?`, `Une grille a 100 carrés. ${k} carrés sont coloriés. Quel pourcentage de la grille est colorié?`),
          k,
          L(`${k} out of 100 is ${k}%.`, `${k} sur 100, c’est ${pct(k)}.`),
          L(
            'Percent means "out of 100". This grid has exactly 100 squares, so count how many are colored.',
            `Pourcentage veut dire ${q('sur 100')}. Cette grille a exactement 100 carrés : compte combien sont coloriés.`,
          ),
        );
      }
      if (kind === 'of') {
        const p = pick(d === 1 ? [50, 10, 25] : [20, 75, 10, 25, 50]);
        const [nu, de] = FRAC[p];
        let n = de * ri(2, d === 1 ? 20 : 30);
        // The hint names the fraction, so keep the answer different from its numbers.
        while ((n / de) * nu === de || (n / de) * nu === nu) n += de;
        const part = n / de;
        const ans = part * nu;
        return num(
          L(`What is ${p}% of ${fmt(n)}?`, `Combien font ${pct(p)} de ${fmt(n)}?`),
          ans,
          L(
            `${p}% = ${nu}/${de}. ${fmt(n)} ÷ ${de} = ${fmt(part)}${nu > 1 ? `, and ${fmt(part)} × ${nu} = ${fmt(ans)}` : ''}.`,
            `${pct(p)} = ${nu}/${de}. ${fmt(n)} ÷ ${de} = ${fmt(part)}${nu > 1 ? `, et ${fmt(part)} × ${nu} = ${fmt(ans)}` : ''}.`,
          ),
          L(
            `${p}% is the same as ${nu}/${de}. Split ${fmt(n)} into ${de} equal parts${nu > 1 ? `, then take ${nu} of them` : ' and take one part'}.`,
            `${pct(p)}, c’est pareil que ${nu}/${de}. Partage ${fmt(n)} en ${de} parts égales${nu > 1 ? `, puis prends-en ${nu}` : ', puis prends une part'}.`,
          ),
        );
      }
      if (kind === 'frac') {
        const p = pick([50, 25, 75, 20, 10]);
        const [nu, de] = FRAC[p];
        const others = Object.values(FRAC).filter(([a, b]) => a * de !== nu * b).map(([a, b]) => `${a}/${b}`);
        return choice(
          L(`Which fraction is the same as ${p}%?`, `Quelle fraction est égale à ${pct(p)}?`),
          `${nu}/${de}`,
          shuffle([...others, '1/3', '2/3']),
          L(`${p}% means ${p}/100, and ${p}/100 = ${nu}/${de}.`, `${pct(p)} veut dire ${p}/100, et ${p}/100 = ${nu}/${de}.`),
          L(
            `Write ${p}% as a fraction out of 100: ${p}/100. Then simplify it: divide the top and the bottom by the same number.`,
            `Écris ${pct(p)} comme une fraction sur 100 : ${p}/100. Puis simplifie : divise le numérateur et le dénominateur par le même nombre.`,
          ),
        );
      }
      if (kind === 'dec') {
        const p = ri(1, 99);
        const ans = ds(p / 100);
        return choice(
          L(`Write ${p}% as a decimal.`, `Écris ${pct(p)} en nombre décimal.`),
          ans,
          shuffle([ds(p / 10), ds(p / 1000), ds(p), ds(p / 10000)]),
          L(`${p}% = ${p}/100 = ${ans}.`, `${pct(p)} = ${p}/100 = ${ans}.`),
          L(
            'Percent means "out of 100", so it is hundredths. Hundredths go two places after the decimal point.',
            `Pourcentage veut dire ${q('sur 100')} : ce sont des centièmes. Les centièmes vont à la deuxième position après la virgule.`,
          ),
        );
      }
      if (kind === 'of3') {
        const p = pick([5, 15, 30, 40, 60, 75]);
        let n = 20 * ri(2, 15);
        if ((p * n) / 100 === 10) n += 20; // the hint talks about 10%
        const BUILD_EN: Record<number, string> = { 5: '5% is half of 10%', 15: '15% is 10% plus half of 10%', 30: 'take 10% three times', 40: 'take 10% four times', 60: 'take 10% six times', 75: '75% is 50% plus 25%' };
        const BUILD_FR: Record<number, string> = { 5: '5 % est la moitié de 10 %', 15: '15 %, c’est 10 % plus la moitié de 10 %', 30: 'prends 10 % trois fois', 40: 'prends 10 % quatre fois', 60: 'prends 10 % six fois', 75: '75 %, c’est 50 % plus 25 %' };
        const ans = (p * n) / 100;
        return num(
          L(`What is ${p}% of ${n}?`, `Combien font ${pct(p)} de ${n}?`),
          ans,
          L(`10% of ${n} is ${n / 10}. ${p}% of ${n} = ${p} × ${n} ÷ 100 = ${ans}.`, `10 % de ${n}, c’est ${n / 10}. ${pct(p)} de ${n} = ${p} × ${n} ÷ 100 = ${ans}.`),
          L(
            `Find 10% first: divide ${n} by 10. Then build ${p}% from it: ${BUILD_EN[p]}.`,
            `Trouve d’abord 10 % : divise ${n} par 10. Puis construis ${pct(p)} à partir de là : ${BUILD_FR[p]}.`,
          ),
        );
      }
      if (kind === 'off') {
        const p = pick([10, 20, 25, 50]);
        const n = 20 * ri(2, 10);
        const off = (p * n) / 100;
        return num(
          L(
            `A shield costs ${n} gold. The shop takes ${p}% off. What is the new price, in gold?`,
            `Un bouclier coûte ${n} pièces d’or. La boutique fait un rabais de ${pct(p)}. Quel est le nouveau prix, en pièces d’or?`,
          ),
          n - off,
          L(`${p}% of ${n} is ${off}. ${n} − ${off} = ${n - off} gold.`, `${pct(p)} de ${n}, c’est ${off}. ${n} − ${off} = ${n - off} pièces d’or.`),
          L(
            `Two steps. First find ${p}% of ${n}: that is how much you save. Then take it away from the price.`,
            `Deux étapes. Trouve d’abord ${pct(p)} de ${n} : c’est le rabais. Puis enlève-le du prix.`,
          ),
        );
      }
      const b = pick([4, 5, 10, 20, 25, 50]);
      const a = ri(1, b - 1);
      const ans = (a * 100) / b;
      return num(
        L(
          `A team has ${b} knights. ${a} of them wear helmets. What percent of the knights wear helmets?`,
          `Une équipe a ${b} chevaliers. ${a} d’entre eux ${pl(a, 'porte', 'portent')} un casque. Quel pourcentage des chevaliers porte un casque?`,
        ),
        ans,
        L(`${a}/${b} = ${ans}/100 = ${ans}%.`, `${a}/${b} = ${ans}/100 = ${pct(ans)}.`),
        L(
          `Make it a fraction out of 100: what do you multiply ${b} by to get 100? Multiply ${a} by the same number.`,
          `Fais une fraction sur 100 : par quoi multiplies-tu ${b} pour obtenir 100? Multiplie ${a} par le même nombre.`,
        ),
      );
    },
  },

  'ratio': {
    levels: [1, 2, 3],
    gen: (d) => {
      const R = (a: number, b: number) => L(`${a}:${b}`, `${a} : ${b}`);
      // [English one, English many, French one, French many]
      type W = [string, string, string, string];
      const PAIRS: [W, W][] = [
        [['red gem', 'red gems', 'pierre rouge', 'pierres rouges'], ['blue gem', 'blue gems', 'pierre bleue', 'pierres bleues']],
        [['cat', 'cats', 'chat', 'chats'], ['dog', 'dogs', 'chien', 'chiens']],
        [['knight', 'knights', 'chevalier', 'chevaliers'], ['dragon', 'dragons', 'dragon', 'dragons']],
        [['apple', 'apples', 'pomme', 'pommes'], ['pear', 'pears', 'poire', 'poires']],
      ];
      const [A, B] = pick(PAIRS);
      const w = (x: W, n: number) => L(n === 1 ? x[0] : x[1], n === 1 ? x[2] : x[3]);
      const many = (x: W) => L(x[1], x[3]);
      if (d === 1) {
        let a = ri(2, 9);
        const b = ri(2, 9);
        if (a === b) a = b === 9 ? 8 : b + 1;
        if (Math.random() < 0.5) {
          return choice(
            L(`There are ${a} ${many(A)} and ${b} ${many(B)}. What is the ratio of ${many(A)} to ${many(B)}?`, `Il y a ${a} ${many(A)} et ${b} ${many(B)}. Quel est le rapport des ${many(A)} aux ${many(B)}?`),
            R(a, b),
            [R(b, a), R(a, a + b), R(a + b, b)],
            L(`${many(A)} first, then ${many(B)}: ${R(a, b)}.`, `Les ${many(A)} d’abord, puis les ${many(B)} : ${R(a, b)}.`),
            L(
              `A ratio compares two amounts, in order. Write the number of ${many(A)} first, then the number of ${many(B)}.`,
              `Un rapport compare deux quantités, dans l’ordre. Écris d’abord le nombre de ${many(A)}, puis le nombre de ${many(B)}.`,
            ),
          );
        }
        const a1 = ri(2, 5);
        let b1 = ri(2, 6);
        if (b1 === a1) b1 += 1;
        const k = ri(2, 6);
        return num(
          L(
            `For every ${a1} ${w(A, a1)} there are ${b1} ${w(B, b1)}. There are ${a1 * k} ${many(A)}. How many ${many(B)} are there?`,
            `Pour ${a1} ${w(A, a1)}, il y a ${b1} ${w(B, b1)}. Il y a ${a1 * k} ${many(A)}. Combien y a-t-il de ${many(B)}?`,
          ),
          b1 * k,
          L(
            `${a1 * k} ÷ ${a1} = ${k} groups. ${k} × ${b1} = ${b1 * k} ${many(B)}.`,
            `${a1 * k} ÷ ${a1} = ${k} groupes. ${k} × ${b1} = ${b1 * k} ${many(B)}.`,
          ),
          L(
            `Find how many groups of ${a1} ${w(A, a1)} there are. Each group comes with ${b1} ${w(B, b1)}.`,
            `Trouve combien de groupes de ${a1} ${w(A, a1)} il y a. Chaque groupe vient avec ${b1} ${w(B, b1)}.`,
          ),
        );
      }
      if (d === 2) {
        let a = ri(1, 6);
        let b = ri(2, 9);
        if (a === b) b += 1;
        const g = gcd(a, b);
        a /= g;
        b /= g;
        const k = ri(2, 6);
        const t = ri(0, 2);
        if (t === 0)
          return num(
            L(`${R(a, b)} = ?:${b * k}`, `${R(a, b)} = ? : ${b * k}`),
            a * k,
            L(`${b} × ${k} = ${b * k}, so ${a} × ${k} = ${a * k}.`, `${b} × ${k} = ${b * k}, donc ${a} × ${k} = ${a * k}.`),
            L(
              `Equivalent ratios work like equivalent fractions: multiply both parts by the same number. What turns ${b} into ${b * k}?`,
              `Les rapports équivalents marchent comme les fractions équivalentes : multiplie les deux parties par le même nombre. Qu’est-ce qui change ${b} en ${b * k}?`,
            ),
          );
        if (t === 1)
          return num(
            L(`${R(a, b)} = ${a * k}:?`, `${R(a, b)} = ${a * k} : ?`),
            b * k,
            L(`${a} × ${k} = ${a * k}, so ${b} × ${k} = ${b * k}.`, `${a} × ${k} = ${a * k}, donc ${b} × ${k} = ${b * k}.`),
            L(
              `Equivalent ratios work like equivalent fractions: multiply both parts by the same number. What turns ${a} into ${a * k}?`,
              `Les rapports équivalents marchent comme les fractions équivalentes : multiplie les deux parties par le même nombre. Qu’est-ce qui change ${a} en ${a * k}?`,
            ),
          );
        const cands: [number, number][] = [[a + k, b + k], [b * k, a * k], [a * k, b * k + 1], [a * k + 1, b * k], [a + 1, b + 1]];
        const wrong = cands.filter(([x, y]) => x * b !== y * a).map(([x, y]) => R(x, y));
        return choice(
          L(`Which ratio is equivalent to ${R(a, b)}?`, `Quel rapport est équivalent à ${R(a, b)}?`),
          R(a * k, b * k),
          wrong,
          L(`Multiply both parts by ${k}: ${R(a, b)} = ${R(a * k, b * k)}.`, `Multiplie les deux parties par ${k} : ${R(a, b)} = ${R(a * k, b * k)}.`),
          L(
            `Multiply BOTH numbers of ${R(a, b)} by the same number. Adding the same number to both does not work!`,
            `Multiplie les DEUX nombres de ${R(a, b)} par le même nombre. Additionner le même nombre aux deux ne marche pas!`,
          ),
        );
      }
      const n = ri(3, 8);
      const each = ri(3, 15);
      const total = n * each;
      const t = ri(0, 2);
      if (t === 0)
        return num(
          L(`${n} potions cost ${total} gold. How much does 1 potion cost, in gold?`, `${n} potions coûtent ${total} pièces d’or. Combien coûte 1 potion, en pièces d’or?`),
          each,
          L(`${total} ÷ ${n} = ${each} gold for each potion.`, `${total} ÷ ${n} = ${each} pièces d’or pour chaque potion.`),
          L(
            `This is a unit rate: the price of ONE. Share the total cost equally among the ${n} potions.`,
            `C’est un taux unitaire : le prix pour UNE potion. Partage le coût total également entre les ${n} potions.`,
          ),
        );
      if (t === 1) {
        let m = ri(2, 12);
        if (m === n) m += 1;
        return num(
          L(`${n} potions cost ${total} gold. How much do ${m} potions cost, in gold?`, `${n} potions coûtent ${total} pièces d’or. Combien coûtent ${m} potions, en pièces d’or?`),
          each * m,
          L(`1 potion costs ${total} ÷ ${n} = ${each}. ${m} × ${each} = ${each * m} gold.`, `1 potion coûte ${total} ÷ ${n} = ${each}. ${m} × ${each} = ${each * m} pièces d’or.`),
          L(
            `Two steps: first find the price of ONE potion, then multiply by ${m}.`,
            `Deux étapes : trouve d’abord le prix d’UNE potion, puis multiplie par ${m}.`,
          ),
        );
      }
      const [dist, distLong] = getUnits() === 'imperial' ? [L('miles', 'milles'), L('miles', 'milles')] : ['km', L('kilometers', 'kilomètres')];
      return num(
        L(
          `A dragon flies ${total} ${dist} in ${n} hours. How many ${distLong} does it fly in 1 hour?`,
          `Un dragon vole ${total} ${dist} en ${n} heures. Combien ${deFr(String(distLong))} vole-t-il en 1 heure?`,
        ),
        each,
        L(`${total} ÷ ${n} = ${each} ${dist} each hour.`, `${total} ÷ ${n} = ${each} ${dist} chaque heure.`),
        L(
          `The dragon flies the same distance every hour. Share the ${total} ${dist} equally among the ${n} hours.`,
          `Le dragon vole la même distance chaque heure. Partage les ${total} ${dist} également entre les ${n} heures.`,
        ),
      );
    },
  },

  'integers': {
    levels: [1, 2, 3],
    gen: (d) => {
      const U = getUnits() === 'imperial' ? 'F' : 'C';
      const tmp = (n: number) => L(`${sg(n)}°${U}`, `${sg(n)} °${U}`);
      /** n different whole numbers in [lo, hi], at least one below zero. */
      const distinct = (count: number, lo: number, hi: number) => {
        const s = new Set<number>([ri(lo, -1)]);
        while (s.size < count) s.add(ri(lo, hi));
        return shuffle([...s]);
      };
      if (d === 1) {
        const t = ri(0, 2);
        if (t === 0) {
          const [a, b] = distinct(2, -15, 10);
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          return choice(
            L('Which temperature is COLDER?', 'Quelle température est la plus FROIDE?'),
            tmp(lo),
            [tmp(hi)],
            L(`${tmp(lo)} is colder: it is lower on a thermometer than ${tmp(hi)}.`, `${tmp(lo)}, c’est plus froid : c’est plus bas que ${tmp(hi)} sur un thermomètre.`),
            L(
              'Picture a thermometer. The colder temperature is LOWER. Below zero, the farther a number is from zero, the colder it is.',
              'Imagine un thermomètre. La température la plus froide est la plus BASSE. Sous zéro, plus un nombre est loin de zéro, plus il fait froid.',
            ),
          );
        }
        if (t === 1) {
          const nums = distinct(3, -12, 12);
          const least = Math.random() < 0.6;
          const ans = least ? Math.min(...nums) : Math.max(...nums);
          return choice(
            least ? L('Which number is the LEAST?', 'Quel nombre est le plus PETIT?') : L('Which number is the GREATEST?', 'Quel nombre est le plus GRAND?'),
            sg(ans),
            nums.filter((x) => x !== ans).map(sg),
            L(`On a number line, ${sg(ans)} is farthest to the ${least ? 'left' : 'right'}.`, `Sur une droite numérique, ${sg(ans)} est le plus à ${least ? 'gauche' : 'droite'}.`),
            L(
              'On a number line, numbers get smaller as you go LEFT. Negative numbers are to the left of zero, so they are less than every positive number.',
              'Sur une droite numérique, les nombres deviennent plus petits vers la GAUCHE. Les nombres négatifs sont à gauche de zéro : ils sont plus petits que tous les nombres positifs.',
            ),
          );
        }
        const s = ri(-5, 5);
        const k = ri(2, 8);
        const left = Math.random() < 0.6;
        const ans = left ? s - k : s + k;
        return choice(
          L(
            `Start at ${sg(s)} on a number line. Move ${k} steps to the ${left ? 'left' : 'right'}. Where do you land?`,
            `Pars de ${sg(s)} sur une droite numérique. Fais ${k} bonds vers la ${left ? 'gauche' : 'droite'}. Où arrives-tu?`,
          ),
          sg(ans),
          shuffle([sg(left ? s + k : s - k), sg(-ans), sg(ans + 1), sg(ans - 1)]),
          L(`${sg(s)} ${left ? '−' : '+'} ${k} = ${sg(ans)}.`, `${sg(s)} ${left ? '−' : '+'} ${k} = ${sg(ans)}.`),
          L(
            'Moving right adds, moving left takes away. Count each step out loud, and do not skip zero: it is a step too.',
            'Aller à droite, c’est ajouter. Aller à gauche, c’est enlever. Compte chaque bond à voix haute, sans sauter le zéro.',
          ),
        );
      }
      if (d === 2) {
        const t = ri(0, 2);
        if (t === 0) {
          const nums = distinct(4, -15, 15);
          const asc = [...nums].sort((x, y) => x - y);
          const byAbs = [...nums].sort((x, y) => Math.abs(x) - Math.abs(y) || x - y);
          const noSign = [...nums].sort((x, y) => Math.abs(x) - Math.abs(y) || y - x);
          // Common mistake: negatives ordered as if they were positive (−1 before −6).
          const negWrong = [...nums.filter((x) => x < 0).sort((x, y) => y - x), ...nums.filter((x) => x >= 0).sort((x, y) => x - y)];
          const join = (a: number[]) => a.map(sg).join(', ');
          return choice(
            L(`Put these numbers in order from LEAST to GREATEST:\n${join(nums)}`, `Place ces nombres du plus PETIT au plus GRAND :\n${join(nums)}`),
            join(asc),
            shuffle([join(negWrong), join([...asc].reverse()), join(byAbs), join(noSign)]),
            L(`Left to right on a number line: ${join(asc)}.`, `De gauche à droite sur une droite numérique : ${join(asc)}.`),
            L(
              'Start with the negative number that is farthest from zero: it is the smallest. Then go up toward zero, and then the positive numbers.',
              'Commence par le nombre négatif le plus loin de zéro : c’est le plus petit. Puis monte vers zéro, et finis avec les nombres positifs.',
            ),
          );
        }
        if (t === 1) {
          const t0 = ri(1, 9);
          const k = ri(t0 + 1, t0 + 10);
          const ans = t0 - k;
          return choice(
            L(
              `It is ${tmp(t0)} outside. The temperature drops ${k} degrees. What is the temperature now?`,
              `Il fait ${tmp(t0)} dehors. La température baisse de ${k} degrés. Quelle température fait-il maintenant?`,
            ),
            tmp(ans),
            shuffle([tmp(-ans), tmp(t0 + k), tmp(ans - 1), tmp(ans + 1)]),
            L(
              `${t0} degrees down takes you to 0. The other ${k - t0} go below zero: ${tmp(ans)}.`,
              `En baissant de ${t0} degrés, on arrive à 0. Les ${k - t0} autres degrés vont sous zéro : ${tmp(ans)}.`,
            ),
            L(
              'Count down to zero first. Then keep counting down the degrees that are left. Below zero, the temperature has a minus sign.',
              'Descends d’abord jusqu’à zéro. Puis continue de descendre avec les degrés qui restent. Sous zéro, la température a un signe moins.',
            ),
          );
        }
        const a = ri(-12, -1);
        const b = ri(1, 12);
        return num(
          L(
            `At night it was ${tmp(a)}. At noon it was ${tmp(b)}. How many degrees warmer was it at noon?`,
            `La nuit, il faisait ${tmp(a)}. À midi, il faisait ${tmp(b)}. De combien de degrés faisait-il plus chaud à midi?`,
          ),
          b - a,
          L(`From ${sg(a)} up to 0 is ${-a} degrees, and from 0 up to ${b} is ${b} more: ${-a} + ${b} = ${b - a}.`, `De ${sg(a)} à 0, il y a ${-a} degrés, et de 0 à ${b}, ${b} de plus : ${-a} + ${b} = ${b - a}.`),
          L(
            'Count up in two parts: from the night temperature up to zero, then from zero up to the noon temperature. Add the two parts.',
            'Compte en deux parties : de la température de la nuit jusqu’à zéro, puis de zéro jusqu’à la température de midi. Additionne les deux parties.',
          ),
        );
      }
      // d === 3: adding and subtracting across zero
      const t = ri(0, 2);
      let a: number;
      let b: number;
      let ans: number;
      let prompt: string;
      let how: string;
      if (t === 0) {
        a = ri(-12, -1);
        b = ri(2, 15);
        ans = a + b;
        prompt = `${sg(a)} + ${b} = ?`;
        how = L(`Start at ${sg(a)} and move ${b} to the right`, `Pars de ${sg(a)} et avance de ${b} vers la droite`);
      } else if (t === 1) {
        a = ri(1, 9);
        b = ri(a + 1, a + 10);
        ans = a - b;
        prompt = `${a} − ${b} = ?`;
        how = L(`Start at ${a} and move ${b} to the left`, `Pars de ${a} et recule de ${b} vers la gauche`);
      } else {
        a = ri(-9, -1);
        b = ri(1, 9);
        ans = a - b;
        prompt = `${sg(a)} − ${b} = ?`;
        how = L(`Start at ${sg(a)} and move ${b} more to the left`, `Pars de ${sg(a)} et recule encore de ${b} vers la gauche`);
      }
      return choice(
        prompt,
        sg(ans),
        shuffle([sg(-ans), sg(ans + 1), sg(ans - 1), sg(t === 0 ? -(Math.abs(a) + b) : Math.abs(a) + b)]),
        L(`${how}: you land on ${sg(ans)}.`, `${how} : tu arrives à ${sg(ans)}.`),
        L(
          'Use a number line. Start at the first number. Adding moves RIGHT, subtracting moves LEFT. Count the steps to zero first, then the rest.',
          'Utilise une droite numérique. Pars du premier nombre. Additionner, c’est aller à DROITE. Soustraire, c’est aller à GAUCHE. Compte d’abord les bonds jusqu’à zéro, puis le reste.',
        ),
      );
    },
  },

  'decimal-muldiv': {
    levels: [1, 2, 3],
    gen: (d) => {
      /** A number answer when it is whole (the keypad has no decimal point), else multiple choice. */
      const ask = (prompt: string, ans: number, wrong: number[], explanation: string, teach: string) => {
        const r = Math.round(ans * 1e6) / 1e6;
        if (Number.isInteger(r)) return num(prompt, r, explanation, teach);
        return choice(prompt, ds(r), shuffle(wrong.filter((w) => w > 0 && Math.abs(w - r) > 1e-9)).map(ds), explanation, teach);
      };
      /** Any whole number from lo to hi that doesn't end in 0. */
      const nz = (lo: number, hi: number) => {
        let k = ri(lo, hi);
        if (k % 10 === 0) k += 1;
        return k;
      };
      if (d === 1) {
        const m = pick([10, 100, 1000]);
        const z = Math.log10(m);
        const zeros = L(`${z} ${pl(z, 'zero', 'zeros')}`, `${z} ${pl(z, 'zéro', 'zéros')}`);
        const places = L(`${z} ${pl(z, 'place', 'places')}`, `${z} ${pl(z, 'position', 'positions')}`);
        if (Math.random() < 0.5) {
          const x = nz(11, 999) / pick([10, 100]);
          const ans = x * m;
          return ask(
            `${ds(x)} × ${fmt(m)} = ?`,
            ans,
            [ans * 10, ans / 10, ans * 100, ans / 100, ans / 1000],
            L(`Times ${fmt(m)} moves every digit ${places} to the left: ${ds(x)} × ${fmt(m)} = ${ds(ans)}.`, `Fois ${fmt(m)}, chaque chiffre avance de ${places} vers la gauche : ${ds(x)} × ${fmt(m)} = ${ds(ans)}.`),
            L(
              `${fmt(m)} has ${zeros}. Multiplying by ${fmt(m)} moves every digit ${places} to the LEFT, so the number gets bigger.`,
              `${fmt(m)} a ${zeros}. Multiplier par ${fmt(m)} fait avancer chaque chiffre de ${places} vers la GAUCHE : le nombre devient plus grand.`,
            ),
          );
        }
        const n = nz(2, 999);
        const ans = n / m;
        return ask(
          `${fmt(n)} ÷ ${fmt(m)} = ?`,
          ans,
          [ans * 10, ans / 10, ans * 100, ans / 100, ans * 1000],
          L(`Divided by ${fmt(m)}, every digit moves ${places} to the right: ${fmt(n)} ÷ ${fmt(m)} = ${ds(ans)}.`, `Divisé par ${fmt(m)}, chaque chiffre recule de ${places} vers la droite : ${fmt(n)} ÷ ${fmt(m)} = ${ds(ans)}.`),
          L(
            `${fmt(m)} has ${zeros}. Dividing by ${fmt(m)} moves every digit ${places} to the RIGHT, so the number gets smaller. Add zeros in front if you need them.`,
            `${fmt(m)} a ${zeros}. Diviser par ${fmt(m)} fait reculer chaque chiffre de ${places} vers la DROITE : le nombre devient plus petit. Ajoute des zéros devant au besoin.`,
          ),
        );
      }
      const tenths = d === 2;
      const unit = tenths ? 10 : 100;
      let k = tenths ? nz(11, 99) : nz(101, 999);
      const m = ri(2, 9);
      const t = d === 2 ? ri(0, 1) : ri(0, 2);
      // For division, keep the number being divided a real decimal (not 28 ÷ 5).
      while (t > 0 && (k * m) % unit === 0) k = tenths ? nz(11, 99) : nz(101, 999);
      const x = k / unit;
      const after = L(tenths ? '1 digit' : '2 digits', tenths ? '1 chiffre' : '2 chiffres');
      if (t === 0) {
        const ans = (k * m) / unit;
        return ask(
          `${ds(x)} × ${m} = ?`,
          ans,
          [ans + 1, ans - 1, ans / 10, ans + m / unit, ans - 1 / unit],
          L(
            `${fmt(k)} × ${m} = ${fmt(k * m)}, and the answer has ${after} after the decimal point: ${ds(ans)}.`,
            `${fmt(k)} × ${m} = ${fmt(k * m)}, et la réponse a ${after} après la virgule : ${ds(ans)}.`,
          ),
          L(
            `Multiply as if there were no decimal point: ${fmt(k)} × ${m}. Then put the decimal point back so the answer has ${after} after it, like ${ds(x)}.`,
            `Multiplie comme s’il n’y avait pas de virgule : ${fmt(k)} × ${m}. Puis remets la virgule pour avoir ${after} après, comme dans ${ds(x)}.`,
          ),
        );
      }
      // Division: (x × m) ÷ m = x, always exact.
      const big = (k * m) / unit;
      const wrong = [x + 1, x - 1, x * 10, x / 10, x + 1 / unit];
      const explanation = L(`Check: ${ds(x)} × ${m} = ${ds(big)}. So ${ds(big)} ÷ ${m} = ${ds(x)}.`, `Vérifie : ${ds(x)} × ${m} = ${ds(big)}. Donc ${ds(big)} ÷ ${m} = ${ds(x)}.`);
      const teach = L(
        `Divide as if there were no decimal point: ${fmt(k * m)} ÷ ${m}. Then put the decimal point back in the same place as in ${ds(big)}.`,
        `Divise comme s’il n’y avait pas de virgule : ${fmt(k * m)} ÷ ${m}. Puis remets la virgule à la même place que dans ${ds(big)}.`,
      );
      if (t === 1) return ask(`${ds(big)} ÷ ${m} = ?`, x, wrong, explanation, teach);
      const [u, uLong] = getUnits() === 'imperial' ? [L('ft', 'pi'), L('feet', 'pieds')] : ['m', L('meters', 'mètres')];
      const withU = (v: number) => `${ds(v)} ${u}`;
      const r = Math.round(x * 1e6) / 1e6;
      return choice(
        L(
          `A rope is ${withU(big)} long. It is cut into ${m} equal pieces. How long is each piece, in ${uLong}?`,
          `Une corde mesure ${withU(big)}. On la coupe en ${m} morceaux égaux. Combien mesure chaque morceau, en ${uLong}?`,
        ),
        withU(r),
        shuffle(wrong.filter((w) => w > 0 && Math.abs(w - r) > 1e-9)).map(withU),
        explanation,
        teach,
      );
    },
  },

  'fractions-mixed': {
    levels: [1, 2, 3],
    gen: (d) => {
      const mixed = (w: number, n: number, den: number) => (n === 0 ? String(w) : `${w} ${n}/${den}`);
      const toMixed = (top: number, den: number) => mixed(Math.floor(top / den), top % den, den);
      const wholes = (w: number) => L(pl(w, 'whole', 'wholes'), pl(w, 'entier', 'entiers'));
      /** Improper fraction -> mixed number, as multiple choice. */
      const improperToMixed = (maxW: number, dens: number[]) => {
        const den = pick(dens);
        const w = ri(1, maxW);
        const r = ri(1, den - 1);
        const top = w * den + r;
        const value = top / den;
        const cands: [number, number, number][] = [[r, w, den], [w + 1, r, den], [w, den - r, den], [w - 1, r, den], [w, r, top], [w, r + 1, den]];
        const wrong = cands
          .filter(([cw, cn, cd]) => cw >= 1 && cn >= 1 && cn < cd && Math.abs(cw + cn / cd - value) > 1e-9)
          .map(([cw, cn, cd]) => mixed(cw, cn, cd));
        const ans = mixed(w, r, den);
        return choice(
          L(`Write ${top}/${den} as a mixed number.`, `Écris ${top}/${den} sous forme de nombre fractionnaire.`),
          ans,
          shuffle(wrong),
          L(
            `${top} ÷ ${den} = ${w} R ${r}. So ${top}/${den} is ${w} ${wholes(w)} and ${r}/${den}: ${ans}.`,
            `${top} ÷ ${den} = ${w} reste ${r}. Donc ${top}/${den}, c’est ${w} ${wholes(w)} et ${r}/${den} : ${ans}.`,
          ),
          L(
            `How many groups of ${den} fit in ${top}? That is the whole number. The pieces left over go on top of the fraction, and the bottom stays ${den}.`,
            `Combien de groupes de ${den} entrent dans ${top}? C’est le nombre entier. Les morceaux qui restent vont au numérateur, et le dénominateur reste ${den}.`,
          ),
        );
      };
      if (d === 1) {
        if (Math.random() < 0.6) return improperToMixed(3, [2, 3, 4, 5]);
        const den = pick([2, 3, 4, 5, 6, 8]);
        const w = ri(2, 6);
        return num(
          L(`${w * den}/${den} makes how many wholes?`, `${w * den}/${den}, ça fait combien d’entiers?`),
          w,
          L(`${den}/${den} is 1 whole. ${w * den} ÷ ${den} = ${w}, so ${w * den}/${den} = ${w}.`, `${den}/${den}, c’est 1 entier. ${w * den} ÷ ${den} = ${w}, donc ${w * den}/${den} = ${w}.`),
          L(
            `Every ${den} pieces make one whole (${den}/${den} = 1). How many groups of ${den} pieces can you make?`,
            `Chaque groupe de ${den} morceaux fait un entier (${den}/${den} = 1). Combien de groupes de ${den} morceaux peux-tu faire?`,
          ),
        );
      }
      if (d === 2) {
        if (Math.random() < 0.4) return improperToMixed(6, [3, 4, 5, 6, 8, 10]);
        const den = pick([2, 3, 4, 5, 6, 8, 10]);
        const w = ri(1, 6);
        const r = ri(1, den - 1);
        const top = w * den + r;
        return num(
          `${w} ${r}/${den} = ?/${den}`,
          top,
          L(
            `${w} × ${den} = ${w * den}, plus ${r} more = ${top}. So ${w} ${r}/${den} = ${top}/${den}.`,
            `${w} × ${den} = ${w * den}, plus ${r} = ${top}. Donc ${w} ${r}/${den} = ${top}/${den}.`,
          ),
          L(
            `Each whole is ${den}/${den}. Multiply the whole number by ${den} to count its pieces, then add ${r === 1 ? 'the 1 extra piece' : `the ${r} extra pieces`}.`,
            `Chaque entier vaut ${den}/${den}. Multiplie le nombre entier par ${den} pour compter ses morceaux, puis ajoute ${r === 1 ? 'le morceau de plus' : `les ${r} morceaux de plus`}.`,
          ),
        );
      }
      // Compare a mixed number with an improper fraction.
      const d1 = pick([2, 3, 4, 5, 6, 8]);
      const w1 = ri(1, 4);
      const n1 = ri(1, d1 - 1);
      const d2 = pick([2, 3, 4, 5, 6, 8]);
      let top2 = ri(d2 + 1, d2 * 5 - 1);
      if (Math.random() < 0.15) top2 = Math.round((w1 + n1 / d1) * d2) || top2;
      const A = mixed(w1, n1, d1);
      const B = `${top2}/${d2}`;
      const va = (w1 * d1 + n1) * d2;
      const vb = top2 * d1;
      const EQUAL = L('They are equal', 'Ils sont égaux');
      const ans = va > vb ? A : va < vb ? B : EQUAL;
      return choice(
        L(`Which is GREATER?\n${A}  or  ${B}`, `Lequel est le plus GRAND?\n${A}  ou  ${B}`),
        ans,
        [A, B, EQUAL],
        L(
          `${B} = ${toMixed(top2, d2)}. ${ans === EQUAL ? 'They are the same amount!' : `${ans} is greater.`}`,
          `${B} = ${toMixed(top2, d2)}. ${ans === EQUAL ? 'C’est la même quantité!' : `${ans} est plus grand.`}`,
        ),
        L(
          'Change the improper fraction into a mixed number first. Compare the whole numbers. If they are the same, compare the fractions.',
          'Transforme d’abord la fraction en nombre fractionnaire. Compare les nombres entiers. S’ils sont pareils, compare les fractions.',
        ),
      );
    },
  },

  'exponents': {
    levels: [1, 2, 3],
    gen: (d) => {
      const times = (b: number, e: number) => Array(e).fill(b).join(' × ');
      if (d === 1) {
        const b = ri(2, 12);
        if (Math.random() < 0.25) {
          // (Not 2⁴ for 4 × 4: it is 16 too.)
          const wrong = [`${b}³`, `${b} × 2`, ...(b === 3 || b === 5 || b === 6 ? [`2${SUP[b]}`] : [])];
          return choice(
            L(`Which is the same as ${b} × ${b}?`, `Qu’est-ce qui est égal à ${b} × ${b}?`),
            `${b}²`,
            wrong,
            L(`${b} × ${b} is ${b} multiplied by itself: ${b}² (“${b} squared”).`, `${b} × ${b}, c’est ${b} multiplié par lui-même : ${b}² (${q(`${b} au carré`)}).`),
            L(
              'The small number up high (the exponent) tells how many times the big number is multiplied by itself.',
              'Le petit nombre en haut (l’exposant) dit combien de fois on multiplie le grand nombre par lui-même.',
            ),
          );
        }
        return num(
          Math.random() < 0.5 ? `${b}² = ?` : L(`What is ${b} squared (${b}²)?`, `Combien fait ${b} au carré (${b}²)?`),
          b * b,
          L(`${b}² = ${b} × ${b} = ${b * b}.`, `${b}² = ${b} × ${b} = ${b * b}.`),
          L(
            `The small ² means multiply the number by ITSELF: ${b} × ${b}. It is NOT ${b} × 2!`,
            `Le petit ² veut dire multiplier le nombre par LUI-MÊME : ${b} × ${b}. Ce n’est PAS ${b} × 2!`,
          ),
        );
      }
      if (d === 2) {
        const t = ri(0, 2);
        if (t === 0) {
          const b = ri(2, 6);
          return num(
            `${b}³ = ?`,
            b ** 3,
            `${b}³ = ${times(b, 3)} = ${b * b} × ${b} = ${b ** 3}.`,
            L(
              `${b}³ means ${times(b, 3)}: ${b} written three times and multiplied. Do it in two steps: first ${b} × ${b}, then times ${b} again.`,
              `${b}³ veut dire ${times(b, 3)} : ${b} écrit trois fois et multiplié. Fais-le en deux étapes : d’abord ${b} × ${b}, puis encore × ${b}.`,
            ),
          );
        }
        if (t === 1) {
          const e = ri(2, 6);
          return num(
            `10${SUP[e]} = ?`,
            10 ** e,
            L(`10${SUP[e]} = ${times(10, e)} = ${fmt(10 ** e)}: a 1 with ${e} zeros.`, `10${SUP[e]} = ${times(10, e)} = ${fmt(10 ** e)} : un 1 suivi de ${e} zéros.`),
            L(
              `10${SUP[e]} means 10 written ${e} times and multiplied. Each × 10 adds one zero, so count the zeros.`,
              `10${SUP[e]} veut dire 10 écrit ${e} fois et multiplié. Chaque × 10 ajoute un zéro : compte les zéros.`,
            ),
          );
        }
        let b = ri(2, 5);
        let e = ri(2, 5);
        if (b === e) e = e === 5 ? 4 : e + 1;
        if (b * e === 8 && b !== e) b = 3; // 2⁴ = 4² = 16 would make two right answers
        return choice(
          L(`Which is the same as ${pw(b, e)}?`, `Qu’est-ce qui est égal à ${pw(b, e)}?`),
          times(b, e),
          [`${b} × ${e}`, times(e, b), Array(e).fill(b).join(' + ')],
          L(`${pw(b, e)} means ${b} written ${e} times and multiplied: ${times(b, e)}.`, `${pw(b, e)} veut dire ${b} écrit ${e} fois et multiplié : ${times(b, e)}.`),
          L(
            'The big number is what gets multiplied. The small number up high (the exponent) tells how many times to write it.',
            'Le grand nombre est celui qu’on multiplie. Le petit nombre en haut (l’exposant) dit combien de fois l’écrire.',
          ),
        );
      }
      const t = ri(0, 2);
      if (t === 0) {
        const base = pick([2, 3, 10]);
        const e = base === 3 ? ri(2, 4) : ri(2, 6);
        const v = base ** e;
        return num(
          L(`${base}ⁿ = ${fmt(v)}. What is n?`, `${base}ⁿ = ${fmt(v)}. Que vaut n?`),
          e,
          L(`${times(base, e)} = ${fmt(v)}. ${base} is written ${e} times, so n = ${e}.`, `${times(base, e)} = ${fmt(v)}. ${base} est écrit ${e} fois, donc n = ${e}.`),
          L(
            `Multiply ${base} by itself again and again: ${base} × ${base}, then × ${base} again, and so on. Count how many times you write ${base} to reach ${fmt(v)}.`,
            `Multiplie ${base} par lui-même encore et encore : ${base} × ${base}, puis encore × ${base}, et ainsi de suite. Compte combien de fois tu écris ${base} pour arriver à ${fmt(v)}.`,
          ),
        );
      }
      if (t === 1) {
        const [[b1, e1], [b2, e2]] = shuffle([...pick([[[2, 5], [5, 2]], [[3, 4], [4, 3]], [[2, 3], [3, 2]], [[2, 4], [4, 2]], [[10, 2], [2, 6]], [[3, 3], [5, 2]]] as [number, number][][])]);
        const v1 = b1 ** e1;
        const v2 = b2 ** e2;
        const EQUAL = L('They are equal', 'Ils sont égaux');
        const A = pw(b1, e1);
        const B = pw(b2, e2);
        const ans = v1 > v2 ? A : v1 < v2 ? B : EQUAL;
        return choice(
          L(`Which is GREATER?\n${A}  or  ${B}`, `Lequel est le plus GRAND?\n${A}  ou  ${B}`),
          ans,
          [A, B, EQUAL],
          L(`${A} = ${v1} and ${B} = ${v2}. ${ans === EQUAL ? 'They are the same!' : `${ans} is greater.`}`, `${A} = ${v1} et ${B} = ${v2}. ${ans === EQUAL ? 'C’est pareil!' : `${ans} est plus grand.`}`),
          L(
            'Work out each one as a multiplication (the exponent says how many times). Then compare the two numbers.',
            'Calcule chacun comme une multiplication (l’exposant dit combien de fois). Puis compare les deux nombres.',
          ),
        );
      }
      const a = ri(2, 9);
      const b = ri(2, 9);
      return num(
        `${a}² + ${b}² = ?`,
        a * a + b * b,
        L(`${a}² = ${a * a} and ${b}² = ${b * b}. ${a * a} + ${b * b} = ${a * a + b * b}.`, `${a}² = ${a * a} et ${b}² = ${b * b}. ${a * a} + ${b * b} = ${a * a + b * b}.`),
        L(
          'Exponents come first! Find each square (a number times itself), then add the two answers.',
          'Les exposants passent en premier! Calcule chaque carré (un nombre multiplié par lui-même), puis additionne les deux réponses.',
        ),
      );
    },
  },
};

/** Topics that have a generator for the given difficulty. */
export function mathTopicsFor(d: Difficulty): string[] {
  return Object.keys(GENERATORS).filter((k) => GENERATORS[k].levels.includes(d));
}

export function mathTopicLevels(topic: string): Difficulty[] {
  return GENERATORS[topic]?.levels ?? EARLY_GENERATORS[topic]?.levels ?? [];
}

/** Quebec typography: a non-breaking space before ":" (the text uses a plain space). */
const frTypo = (s: string) => s.replace(/ :/g, ' :');

export function makeMathQuestion(topic: string, d: Difficulty, factors?: number[]): Question {
  // Early-grade topics (1re-3e annee / grades 1-3) are bilingual and live in mathEarly.ts.
  if (EARLY_GENERATORS[topic]) return makeEarlyQuestion(topic, d);
  const g = GENERATORS[topic];
  const level = g.levels.includes(d) ? d : g.levels.reduce((best, l) => (Math.abs(l - d) < Math.abs(best - d) ? l : best), g.levels[0]);
  let q = g.gen(level, factors && factors.length ? factors : undefined);
  if (getLang() === 'fr') {
    q = {
      ...q,
      prompt: frTypo(q.prompt),
      answer: frTypo(q.answer),
      explanation: frTypo(q.explanation),
      teach: q.teach && frTypo(q.teach),
      ...(q.choices ? { choices: q.choices.map(frTypo) } : {}),
    };
  }
  return { ...q, id: `m:${topic}:${q.prompt}`, subject: 'math', topic, difficulty: level };
}
