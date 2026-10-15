// Grade 4 math question generators, aligned with the Massachusetts 2017
// Mathematics Curriculum Framework (4.OA, 4.NBT, 4.NF, 4.MD, 4.G).
import type { Difficulty, Question } from './types';
import { pick, ri, shuffle } from '../util/rng';

export const MATH_TOPICS: Record<string, string> = {
  'mult-facts': 'Multiplication facts',
  'mult-2x1': '2-digit x 1-digit',
  'mult-big': '3- and 4-digit x 1-digit',
  'mult-2x2': '2-digit x 2-digit',
  'div-facts': 'Division facts',
  'div-remainder': 'Division with remainders',
  'div-long': '4-digit / 1-digit division',
  'add-sub': 'Adding & subtracting big numbers',
  'place-value': 'Place value',
  'rounding': 'Rounding',
  'compare': 'Comparing numbers',
  'factors': 'Factors, multiples & primes',
  'patterns': 'Number patterns',
  'fractions-equiv': 'Equivalent fractions',
  'fractions-compare': 'Comparing fractions',
  'fractions-add': 'Adding & subtracting fractions',
  'fractions-mult': 'Fraction x whole number',
  'decimals': 'Decimals',
  'measurement': 'Measurement conversions',
  'area-perimeter': 'Area & perimeter',
  'angles': 'Angles',
  'word-problems': 'Word problems',
};

/** Format with thousands commas: 12345 -> "12,345". */
export const fmt = (n: number) => n.toLocaleString('en-US');

type Gen = (d: Difficulty) => Omit<Question, 'id' | 'subject' | 'topic' | 'difficulty'>;

function num(prompt: string, answer: number, explanation: string) {
  return { prompt, input: 'number' as const, answer: String(answer), explanation };
}

function choice(prompt: string, answer: string, wrong: string[], explanation: string) {
  const uniqueWrong = [...new Set(wrong.filter((w) => w !== answer))].slice(0, 3);
  return {
    prompt,
    input: 'choice' as const,
    answer,
    choices: shuffle([answer, ...uniqueWrong]),
    explanation,
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

const GENERATORS: Record<string, { levels: Difficulty[]; gen: Gen }> = {
  'mult-facts': {
    levels: [1],
    gen: () => {
      const a = ri(3, 12);
      const b = ri(3, 12);
      return num(`${a} x ${b} = ?`, a * b, `${a} groups of ${b} make ${a * b}.`);
    },
  },

  'mult-2x1': {
    levels: [1, 2],
    gen: (d) => {
      const a = d === 1 ? ri(11, 49) : ri(23, 99);
      const b = d === 1 ? ri(2, 5) : ri(3, 9);
      const parts = expand(a);
      const steps = parts.map((p) => `${p} x ${b} = ${p * b}`).join(', ');
      return num(
        `${a} x ${b} = ?`,
        a * b,
        `Break it apart: ${steps}. Add them: ${parts.map((p) => p * b).join(' + ')} = ${a * b}.`,
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
        `${fmt(a)} x ${b} = ?`,
        a * b,
        `Multiply each place: ${parts.map((p) => `${fmt(p)}x${b}=${fmt(p * b)}`).join(', ')}. Total: ${fmt(a * b)}.`,
      );
    },
  },

  'mult-2x2': {
    levels: [2, 3],
    gen: (d) => {
      if (d === 2) {
        // Multiples of ten, e.g. 30 x 40 or 23 x 10
        if (Math.random() < 0.5) {
          const a = ri(2, 9) * 10;
          const b = ri(2, 9) * 10;
          return num(
            `${a} x ${b} = ?`,
            a * b,
            `${a / 10} x ${b / 10} = ${(a / 10) * (b / 10)}, then add two zeros: ${fmt(a * b)}.`,
          );
        }
        const a = ri(12, 99);
        return num(`${a} x 10 = ?`, a * 10, `Times 10 moves every digit one place left: ${a} becomes ${a * 10}.`);
      }
      const a = ri(12, 49);
      const b = ri(12, 29);
      const tens = Math.floor(b / 10) * 10;
      const ones = b % 10;
      return num(
        `${a} x ${b} = ?`,
        a * b,
        ones === 0
          ? `${a} x ${b} = ${fmt(a * b)}.`
          : `${a} x ${tens} = ${fmt(a * tens)} and ${a} x ${ones} = ${a * ones}. ${fmt(a * tens)} + ${a * ones} = ${fmt(a * b)}.`,
      );
    },
  },

  'div-facts': {
    levels: [1],
    gen: () => {
      const b = ri(2, 12);
      const q = ri(2, 12);
      return num(`${b * q} / ${b} = ?`, q, `${b} x ${q} = ${b * q}, so ${b * q} / ${b} = ${q}.`);
    },
  },

  'div-remainder': {
    levels: [2],
    gen: () => {
      const dv = ri(3, 9);
      const q = ri(4, 15);
      const r = ri(1, dv - 1);
      const n = dv * q + r;
      const ans = `${q} R ${r}`;
      const wrong = [`${q + 1} R ${r}`, `${q - 1} R ${r}`];
      if (r + 1 < dv) wrong.push(`${q} R ${r + 1}`);
      if (r - 1 >= 1) wrong.push(`${q} R ${r - 1}`);
      return choice(
        `${n} / ${dv} = ?`,
        ans,
        shuffle(wrong),
        `${dv} x ${q} = ${dv * q}. ${n} - ${dv * q} = ${r} left over, so the answer is ${q} R ${r}.`,
      );
    },
  },

  'div-long': {
    levels: [3],
    gen: () => {
      const dv = ri(2, 9);
      const q = ri(Math.ceil(1000 / dv), Math.floor(9999 / dv));
      const n = dv * q;
      return num(
        `${fmt(n)} / ${dv} = ?`,
        q,
        `Check by multiplying: ${fmt(q)} x ${dv} = ${fmt(n)}. So ${fmt(n)} / ${dv} = ${fmt(q)}.`,
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
        return num(`${fmt(a)} + ${fmt(b)} = ?`, a + b, `Line up the places and add, carrying when a column is 10 or more: ${fmt(a + b)}.`);
      }
      if (b > a) [a, b] = [b, a];
      return num(
        `${fmt(a)} - ${fmt(b)} = ?`,
        a - b,
        `Line up the places and subtract, regrouping when needed. Check: ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}.`,
      );
    },
  },

  'place-value': {
    levels: [1, 2, 3],
    gen: (d) => {
      if (d === 3) {
        const digit = ri(2, 9);
        const big = Number(`${digit}${digit}0`); // e.g. 440
        const bigger = big * 10; // 4,400
        return num(
          `In ${fmt(bigger)}, how many times greater is the first ${digit} than the second ${digit}?`,
          10,
          `The first ${digit} is worth ${fmt(digit * 1000)} and the second is worth ${fmt(digit * 100)}. Each place is 10 times the place to its right.`,
        );
      }
      // Build a number with all-distinct digits so the target digit appears once.
      const len = d === 1 ? 4 : 6;
      const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, len);
      const n = Number(digits.join(''));
      const idx = ri(0, len - 1);
      const digit = digits[idx];
      const value = digit * 10 ** (len - 1 - idx);
      return num(
        `What is the VALUE of the digit ${digit} in ${fmt(n)}?`,
        value,
        `The ${digit} is in the ${['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands'][len - 1 - idx]} place, so it is worth ${fmt(value)}.`,
      );
    },
  },

  'rounding': {
    levels: [1, 2, 3],
    gen: (d) => {
      const options: [number, string, number, number][] =
        d === 1
          ? [
              [10, 'ten', 11, 999],
              [100, 'hundred', 101, 9999],
            ]
          : d === 2
            ? [[1000, 'thousand', 1001, 99999]]
            : [
                [10000, 'ten thousand', 10001, 999999],
                [100000, 'hundred thousand', 100001, 999999],
              ];
      const [place, name, lo, hi] = pick(options);
      let n = ri(lo, hi);
      if (n % place === 0) n += ri(1, place - 1);
      const rounded = Math.round(n / place) * place;
      const checkDigit = Math.floor((n % place) / (place / 10));
      return num(
        `Round ${fmt(n)} to the nearest ${name}.`,
        rounded,
        `Look at the digit to the right of the ${name}s place: ${checkDigit}. ${checkDigit >= 5 ? '5 or more rounds up' : 'Less than 5 rounds down'}, so it's ${fmt(rounded)}.`,
      );
    },
  },

  'compare': {
    levels: [1, 2],
    gen: (d) => {
      const [lo, hi] = d === 1 ? [1000, 9999] : [100000, 999999];
      const a = ri(lo, hi);
      // Often make them share leading digits so the child must look carefully.
      let b = Math.random() < 0.6 ? a + ri(-999, 999) : ri(lo, hi);
      if (Math.random() < 0.12) b = a;
      const sym = a > b ? '>' : a < b ? '<' : '=';
      const words = { '>': 'greater than', '<': 'less than', '=': 'equal to' }[sym];
      return choice(
        `Which symbol makes this true?\n${fmt(a)}  ?  ${fmt(b)}`,
        sym,
        ['>', '<', '='],
        `Compare from the biggest place first. ${fmt(a)} is ${words} ${fmt(b)}.`,
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
        return num(`How many factors does ${n} have?`, fs.length, `The factors of ${n} are ${fs.join(', ')}. That's ${fs.length}.`);
      }
      const kind = ri(0, 2);
      if (kind === 0) {
        const n = pick([12, 18, 20, 24, 30, 36, 40, 42, 48, 56, 60, 72]);
        const fs: number[] = [];
        const notFs: number[] = [];
        for (let i = 2; i < n; i++) (n % i === 0 ? fs : notFs).push(i);
        const ans = pick(fs.filter((f) => f > 2 && f < n));
        const wrong = shuffle(notFs.filter((f) => f > 3 && f < 15)).slice(0, 3);
        return choice(`Which number is a FACTOR of ${n}?`, String(ans), wrong.map(String), `${ans} x ${n / ans} = ${n}, so ${ans} is a factor of ${n}.`);
      }
      if (kind === 1) {
        const k = ri(3, 9);
        const m = k * ri(3, 9);
        const wrong: string[] = [];
        while (wrong.length < 3) {
          const w = m + ri(-6, 6);
          if (w > 0 && w % k !== 0 && !wrong.includes(String(w))) wrong.push(String(w));
        }
        return choice(`Which number is a MULTIPLE of ${k}?`, String(m), wrong, `${k} x ${m / k} = ${m}, so ${m} is a multiple of ${k}.`);
      }
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
      const n = Math.random() < 0.5 ? pick(primes.filter((p) => p > 10)) : pick([15, 21, 27, 33, 35, 39, 49, 51, 57, 63, 77, 81, 87, 91]);
      const isPrime = primes.includes(n);
      let f = 0;
      for (let i = 2; i < n; i++) if (n % i === 0) { f = i; break; }
      return choice(
        `Is ${n} PRIME or COMPOSITE?`,
        isPrime ? 'Prime' : 'Composite',
        [isPrime ? 'Composite' : 'Prime'],
        isPrime
          ? `${n} can only be divided evenly by 1 and ${n}, so it is prime.`
          : `${f} x ${n / f} = ${n}, so ${n} has more than two factors. It is composite.`,
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
        return num(`What comes next?\n${seq.join(', ')}, ?`, start + step * 4, `The rule is "add ${step}". ${seq[3]} + ${step} = ${start + step * 4}.`);
      }
      const start = ri(1, 5);
      const mult = ri(2, 4);
      const seq = [0, 1, 2, 3].map((i) => start * mult ** i);
      const next = start * mult ** 4;
      return num(`What comes next?\n${seq.join(', ')}, ?`, next, `The rule is "multiply by ${mult}". ${seq[3]} x ${mult} = ${next}.`);
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
          `${den} x ${k} = ${den * k}, so multiply the top by ${k} too: ${nu} x ${k} = ${nu * k}.`,
        );
      }
      return num(
        `${nu * k}/${den * k} = ${nu}/?`,
        den,
        `${nu * k} / ${k} = ${nu}, so divide the bottom by ${k} too: ${den * k} / ${k} = ${den}.`,
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
      const ans = lhs > rhs ? fa : lhs < rhs ? fb : 'They are equal';
      const common = (a[1] * b[1]) / gcd(a[1], b[1]);
      const ea = `${(a[0] * common) / a[1]}/${common}`;
      const eb = `${(b[0] * common) / b[1]}/${common}`;
      return choice(
        `Which fraction is GREATER?\n${fa}  or  ${fb}`,
        ans,
        [fa, fb, 'They are equal'],
        `Use a common denominator: ${fa} = ${ea} and ${fb} = ${eb}. ${ans === 'They are equal' ? 'They are the same size!' : `${ans} is greater.`}`,
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
        if (Math.random() < 0.5) {
          return num(`${a}/${den} + ${b}/${den} = ?/${den}`, a + b, `Same bottom number, so just add the tops: ${a} + ${b} = ${a + b}. Answer: ${a + b}/${den}.`);
        }
        const big = a + b;
        return num(`${big}/${den} - ${b}/${den} = ?/${den}`, a, `Same bottom number, so just subtract the tops: ${big} - ${b} = ${a}. Answer: ${a}/${den}.`);
      }
      // Mixed numbers without regrouping
      const w1 = ri(1, 4);
      const w2 = ri(1, 3);
      const n1 = ri(1, den - 2);
      const n2 = ri(1, den - 1 - n1);
      const ans = `${w1 + w2} ${n1 + n2}/${den}`;
      return choice(
        `${w1} ${n1}/${den} + ${w2} ${n2}/${den} = ?`,
        ans,
        [`${w1 + w2} ${n1 + n2}/${den * 2}`, `${w1 + w2 + 1} ${n1 + n2}/${den}`, `${w1 + w2} ${Math.max(1, n1 + n2 - 1)}/${den}`],
        `Add the wholes: ${w1} + ${w2} = ${w1 + w2}. Add the fractions: ${n1}/${den} + ${n2}/${den} = ${n1 + n2}/${den}. Answer: ${ans}.`,
      );
    },
  },

  'fractions-mult': {
    levels: [3],
    gen: () => {
      const den = pick([3, 4, 5, 6, 8, 10]);
      const nu = ri(1, den - 1);
      const k = ri(2, 6);
      return num(`${k} x ${nu}/${den} = ?/${den}`, k * nu, `${k} groups of ${nu}/${den}: multiply the top, ${k} x ${nu} = ${k * nu}. Answer: ${k * nu}/${den}.`);
    },
  },

  'decimals': {
    levels: [2, 3],
    gen: (d) => {
      const kind = d === 2 ? ri(0, 1) : ri(1, 2);
      if (kind === 0) {
        const t = ri(1, 9);
        return num(`${t}/10 = ?/100`, t * 10, `${t} tenths is the same as ${t * 10} hundredths, so ${t}/10 = ${t * 10}/100.`);
      }
      if (kind === 1) {
        const h = ri(11, 99);
        const ans = (h / 100).toFixed(2);
        return choice(
          `Write ${h}/100 as a decimal.`,
          ans,
          [(h / 10).toFixed(1), `0.0${h}`, `${h}.0`],
          `Hundredths go two places after the decimal point: ${h}/100 = ${ans}.`,
        );
      }
      // compare tenths vs hundredths, e.g. 0.5 vs 0.45
      const t = ri(2, 9);
      let h = ri(10, 99);
      if (h === t * 10) h += 1;
      const a = `0.${t}`;
      const b = (h / 100).toFixed(2);
      const ans = t * 10 > h ? a : b;
      return choice(
        `Which decimal is GREATER?\n${a}  or  ${b}`,
        ans,
        [a, b],
        `${a} = ${(t / 10).toFixed(2)} (${t * 10} hundredths). Compare ${t * 10} and ${h} hundredths: ${ans} is greater.`,
      );
    },
  },

  'measurement': {
    levels: [1, 2],
    gen: (d) => {
      const conv: [string, string, number][] =
        d === 1
          ? [
              ['feet', 'inches', 12],
              ['yards', 'feet', 3],
              ['hours', 'minutes', 60],
              ['minutes', 'seconds', 60],
              ['meters', 'centimeters', 100],
            ]
          : [
              ['kilograms', 'grams', 1000],
              ['liters', 'milliliters', 1000],
              ['pounds', 'ounces', 16],
              ['gallons', 'quarts', 4],
              ['kilometers', 'meters', 1000],
              ['days', 'hours', 24],
              ['yards', 'inches', 36],
            ];
      const [big, small, f] = pick(conv);
      const n = ri(2, d === 1 ? 6 : 9);
      const one = big === 'feet' ? 'foot' : big.replace(/s$/, '');
      return num(`${n} ${big} = ? ${small}`, n * f, `1 ${one} = ${f} ${small}, so ${n} x ${f} = ${fmt(n * f)} ${small}.`);
    },
  },

  'area-perimeter': {
    levels: [1, 2, 3],
    gen: (d) => {
      const l = ri(3, d === 1 ? 9 : 15);
      const w = ri(2, d === 1 ? 8 : 12);
      if (d === 3) {
        const area = l * w;
        return num(
          `A rectangle has an area of ${area} square feet. One side is ${w} feet. How long is the other side?`,
          l,
          `Area = length x width, so ${area} / ${w} = ${l} feet.`,
        );
      }
      if (Math.random() < 0.5) {
        return num(`A rectangle is ${l} m long and ${w} m wide. What is its AREA in square meters?`, l * w, `Area = length x width = ${l} x ${w} = ${l * w} square meters.`);
      }
      return num(
        `A rectangle is ${l} m long and ${w} m wide. What is its PERIMETER in meters?`,
        2 * (l + w),
        `Perimeter = all the sides added: ${l} + ${w} + ${l} + ${w} = ${2 * (l + w)} meters.`,
      );
    },
  },

  'angles': {
    levels: [2, 3],
    gen: (d) => {
      if (d === 2) {
        const kind = pick(['acute', 'right', 'obtuse'] as const);
        const deg = kind === 'acute' ? ri(2, 17) * 5 : kind === 'right' ? 90 : ri(19, 35) * 5;
        return choice(
          `An angle measures ${deg} degrees. What kind of angle is it?`,
          kind[0].toUpperCase() + kind.slice(1),
          ['Acute', 'Right', 'Obtuse'],
          `Acute is less than 90 degrees, right is exactly 90, obtuse is between 90 and 180. ${deg} is ${kind}.`,
        );
      }
      if (Math.random() < 0.5) {
        const a = ri(5, 34) * 5;
        return num(`A straight line is 180 degrees. It is split into two angles. One is ${a} degrees. What is the other?`, 180 - a, `180 - ${a} = ${180 - a} degrees.`);
      }
      const a = ri(2, 16) * 5;
      return num(`A right angle (90 degrees) is split into two angles. One is ${a} degrees. What is the other?`, 90 - a, `90 - ${a} = ${90 - a} degrees.`);
    },
  },

  'word-problems': {
    levels: [2, 3],
    gen: (d) => {
      if (d === 2) {
        const t = ri(0, 3);
        if (t === 0) {
          const piles = ri(3, 8);
          const each = ri(12, 125);
          return num(`A dragon has ${piles} piles of gold. Each pile has ${each} coins. How many coins in all?`, piles * each, `${piles} x ${each} = ${fmt(piles * each)} coins.`);
        }
        if (t === 1) {
          const q = ri(4, 9);
          const each = ri(6, 15);
          return num(`${q * each} arrows are shared equally into ${q} quivers. How many arrows in each quiver?`, each, `${q * each} / ${q} = ${each} arrows each.`);
        }
        if (t === 2) {
          const a = ri(3, 9);
          const b = ri(2, 6);
          return num(`A goblin has ${a} gems. A troll has ${b} times as many. How many gems does the troll have?`, a * b, `"${b} times as many" means multiply: ${a} x ${b} = ${a * b}.`);
        }
        const have = ri(120, 600);
        const spend = ri(40, have - 20);
        return num(`You have ${have} gold and spend ${spend} on a new sword. How much gold is left?`, have - spend, `${have} - ${spend} = ${have - spend} gold.`);
      }
      const t = ri(0, 2);
      if (t === 0) {
        const n = ri(2, 5);
        const cost = ri(6, 18);
        const pay = Math.ceil((n * cost + 1) / 10) * 10 + pick([0, 10, 20]);
        return num(
          `You buy ${n} potions for ${cost} gold each. You pay with ${pay} gold. How much change do you get?`,
          pay - n * cost,
          `${n} x ${cost} = ${n * cost} gold. ${pay} - ${n * cost} = ${pay - n * cost} gold change.`,
        );
      }
      if (t === 1) {
        const per = ri(4, 8);
        const kids = ri(20, 60);
        const boats = Math.ceil(kids / per);
        return num(
          `${kids} adventurers need to cross a lake. Each boat holds ${per}. How many boats are needed so everyone gets across?`,
          boats,
          `${kids} / ${per} = ${Math.floor(kids / per)}${kids % per ? ` R ${kids % per}. The ${kids % per} left over need one more boat, so ${boats}` : ''} boats.`,
        );
      }
      const rows = ri(3, 7);
      const cols = ri(4, 9);
      const lost = ri(2, rows * cols - 5);
      return num(
        `A wizard plants ${rows} rows of ${cols} magic beans. Then ${lost} beans are eaten by a mouse. How many beans are left?`,
        rows * cols - lost,
        `${rows} x ${cols} = ${rows * cols} beans. ${rows * cols} - ${lost} = ${rows * cols - lost}.`,
      );
    },
  },
};

/** Topics that have a generator for the given difficulty. */
export function mathTopicsFor(d: Difficulty): string[] {
  return Object.keys(GENERATORS).filter((k) => GENERATORS[k].levels.includes(d));
}

export function makeMathQuestion(topic: string, d: Difficulty): Question {
  const g = GENERATORS[topic];
  const level = g.levels.includes(d) ? d : g.levels[0];
  const q = g.gen(level);
  return { ...q, id: `m:${topic}:${q.prompt}`, subject: 'math', topic, difficulty: level };
}
