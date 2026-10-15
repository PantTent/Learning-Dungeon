// Math question generators aligned with the Massachusetts 2017 Mathematics
// Curriculum Framework (grades 3-5: OA, NBT, NF, MD, G).
// Every question carries a `teach` hint: how to think about THIS problem,
// without giving away the answer.
import type { Difficulty, Question } from './types';
import { pick, ri, shuffle } from '../util/rng';

export const MATH_TOPICS: Record<string, string> = {
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
};

/** Format with thousands commas: 12345 -> "12,345". */
export const fmt = (n: number) => n.toLocaleString('en-US');

type Gen = (d: Difficulty) => Omit<Question, 'id' | 'subject' | 'topic' | 'difficulty'>;

function num(prompt: string, answer: number, explanation: string, teach: string) {
  return { prompt, input: 'number' as const, answer: String(answer), explanation, teach };
}

function choice(prompt: string, answer: string, wrong: string[], explanation: string, teach: string) {
  const uniqueWrong = [...new Set(wrong.filter((w) => w !== answer))].slice(0, 3);
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

/** Decimal to a clean string: 4.5 -> "4.5", 4.25 -> "4.25". */
function dec(n: number): string {
  return String(Math.round(n * 100) / 100);
}

const PLACE_NAMES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands'];

const GENERATORS: Record<string, { levels: Difficulty[]; gen: Gen }> = {
  'mult-facts': {
    levels: [1],
    gen: () => {
      const a = ri(3, 12);
      const b = ri(3, 12);
      return num(
        `${a} x ${b} = ?`,
        a * b,
        `${a} groups of ${b} make ${a * b}.`,
        `"${a} x ${b}" means ${a} groups of ${b}. You can skip-count by ${b}, ${a} times: ${b}, ${b * 2}... Or use a fact you know, like ${a} x 10, and adjust.`,
      );
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
        `Break ${a} into tens and ones: ${parts.join(' + ')}. Multiply EACH part by ${b}, then add your answers together.`,
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
        `Break ${fmt(a)} into its places: ${parts.map(fmt).join(' + ')}. Multiply each part by ${b}, then add all the parts up.`,
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
            `${a} x ${b} = ?`,
            a * b,
            `${a / 10} x ${b / 10} = ${(a / 10) * (b / 10)}, then add two zeros: ${fmt(a * b)}.`,
            `Ignore the zeros first: what is ${a / 10} x ${b / 10}? Then count the zeros in both numbers (two) and put them on the end.`,
          );
        }
        const a = ri(12, 99);
        return num(
          `${a} x 10 = ?`,
          a * 10,
          `Times 10 moves every digit one place left: ${a} becomes ${a * 10}.`,
          'Multiplying by 10 makes every digit move one place to the left. An easy way: put a zero on the end.',
        );
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
        ones === 0
          ? `Work out ${a} x ${tens / 10} first, then put a zero on the end.`
          : `Split ${b} into ${tens} + ${ones}. Find ${a} x ${tens} (hint: ${a} x ${tens / 10}, then add a zero). Find ${a} x ${ones}. Add the two answers.`,
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
        `${a} x ${b} = ?`,
        a * b,
        `${a} x ${tens} = ${fmt(a * tens)}${ones ? ` and ${a} x ${ones} = ${fmt(a * ones)}. Add them: ${fmt(a * b)}` : ''}.`,
        `Split ${b} into ${tens}${ones ? ` + ${ones}` : ''}. Multiply ${a} by each part${ones ? ', then add the two answers' : ''}. Line up the places carefully!`,
      );
    },
  },

  'div-facts': {
    levels: [1],
    gen: () => {
      const b = ri(2, 12);
      const q = ri(2, 12);
      return num(
        `${b * q} / ${b} = ?`,
        q,
        `${b} x ${q} = ${b * q}, so ${b * q} / ${b} = ${q}.`,
        `Division is the opposite of multiplying. Ask yourself: ${b} times WHAT equals ${b * q}? Count up by ${b}s until you reach ${b * q}.`,
      );
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
        `Find the biggest number of ${dv}s that fit into ${n} without going over. Multiply to check. Whatever is left over is the remainder (R). The remainder must be smaller than ${dv}.`,
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
        `Divide one place at a time, from the left. How many ${dv}s fit into the first digit (or first two digits)? Write that down, subtract, bring down the next digit, and repeat.`,
      );
    },
  },

  'div-2digit': {
    levels: [3],
    gen: () => {
      const dv = ri(11, 25);
      const q = ri(12, 60);
      return num(
        `${fmt(dv * q)} / ${dv} = ?`,
        q,
        `${dv} x ${q} = ${fmt(dv * q)}, so the answer is ${q}.`,
        `Estimate first: about how many ${dv}s make ${fmt(dv * q)}? Start with ${dv} x 10 = ${dv * 10}. Is that too small or too big? Keep trying bigger or smaller numbers until you land exactly on ${fmt(dv * q)}.`,
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
          `Line up the places and add, carrying when a column is 10 or more: ${fmt(a + b)}.`,
          'Line the numbers up by place (ones under ones, tens under tens). Add each column starting from the ones. If a column adds up to 10 or more, carry the 1 to the next column.',
        );
      }
      if (b > a) [a, b] = [b, a];
      return num(
        `${fmt(a)} - ${fmt(b)} = ?`,
        a - b,
        `Line up the places and subtract, regrouping when needed. Check: ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}.`,
        'Line the numbers up by place and subtract each column, starting with the ones. If the top digit is smaller, borrow 1 from the next column (it becomes 10 more). Check by adding your answer back.',
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
          `In ${fmt(bigger)}, how many times greater is the first ${digit} than the second ${digit}?`,
          10,
          `The first ${digit} is worth ${fmt(digit * 1000)} and the second is worth ${fmt(digit * 100)}. Each place is 10 times the place to its right.`,
          `Work out what each ${digit} is WORTH. The first is in the thousands place, the second in the hundreds place. How many times bigger is the first value?`,
        );
      }
      const len = d === 1 ? 4 : 6;
      const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, len);
      const n = Number(digits.join(''));
      const idx = ri(0, len - 1);
      const digit = digits[idx];
      const place = PLACE_NAMES[len - 1 - idx];
      const value = digit * 10 ** (len - 1 - idx);
      return num(
        `What is the VALUE of the digit ${digit} in ${fmt(n)}?`,
        value,
        `The ${digit} is in the ${place} place, so it is worth ${fmt(value)}.`,
        `Count the places from the RIGHT: ones, tens, hundreds, thousands... Find which place the ${digit} is in. Its value is ${digit} with zeros for every place to its right.`,
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
        `Find the ${name}s place. Look at the digit just to its RIGHT. If that digit is 5 or more, round up. If it's 4 or less, keep it the same. Then change all the digits after it to zeros.`,
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
      const label = { '>': '>   greater than', '<': '<   less than', '=': '=   equal to' };
      const words = { '>': 'greater than', '<': 'less than', '=': 'equal to' }[sym];
      return choice(
        `Which symbol goes in the blank?\n${fmt(a)}   ______   ${fmt(b)}`,
        label[sym],
        [label['>'], label['<'], label['=']],
        `${fmt(a)} ${sym} ${fmt(b)}. Compare from the biggest place first: ${fmt(a)} is ${words} ${fmt(b)}.`,
        'Read it from left to right: is the FIRST number greater than, less than, or equal to the SECOND number? Compare the digits from the left. The first place where they are different tells you which is bigger. The open side of > or < always faces the BIGGER number!',
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
          `How many factors does ${n} have?`,
          fs.length,
          `The factors of ${n} are ${fs.join(', ')}. That's ${fs.length}.`,
          `Factors are numbers that multiply together to make ${n}. List them in pairs: 1 x ${n}, 2 x ?, 3 x ?... Stop when the pairs start repeating. Count every number you found.`,
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
          `Which number is a FACTOR of ${n}?`,
          String(ans),
          wrong.map(String),
          `${ans} x ${n / ans} = ${n}, so ${ans} is a factor of ${n}.`,
          `A factor divides into ${n} evenly, with nothing left over. Try each choice: does ${n} split into equal groups of that size?`,
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
          `Which number is a MULTIPLE of ${k}?`,
          String(m),
          wrong,
          `${k} x ${m / k} = ${m}, so ${m} is a multiple of ${k}.`,
          `Multiples of ${k} are the numbers you say when you skip-count by ${k}: ${k}, ${k * 2}, ${k * 3}... Which choice is on that list?`,
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
      return choice(
        `Is ${n} PRIME or COMPOSITE?`,
        isPrime ? 'Prime' : 'Composite',
        [isPrime ? 'Composite' : 'Prime'],
        isPrime
          ? `${n} can only be divided evenly by 1 and ${n}, so it is prime.`
          : `${f} x ${n / f} = ${n}, so ${n} has more than two factors. It is composite.`,
        `A PRIME number can only be divided evenly by 1 and itself. A COMPOSITE number has other factors too. Try dividing ${n} by 2, 3, 5 and 7. Does any of them go in evenly?`,
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
          `What comes next?\n${seq.join(', ')}, ?`,
          start + step * 4,
          `The rule is "add ${step}". ${seq[3]} + ${step} = ${start + step * 4}.`,
          'Find the RULE. How much does the number go up from one to the next? Check that it is the same every time, then do it once more to the last number.',
        );
      }
      const start = ri(1, 5);
      const mult = ri(2, 4);
      const seq = [0, 1, 2, 3].map((i) => start * mult ** i);
      const next = start * mult ** 4;
      return num(
        `What comes next?\n${seq.join(', ')}, ?`,
        next,
        `The rule is "multiply by ${mult}". ${seq[3]} x ${mult} = ${next}.`,
        'These numbers grow faster and faster, so the rule is probably MULTIPLY, not add. What do you multiply each number by to get the next one?',
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
            `${a} + ${b} x ${c} = ?`,
            a + b * c,
            `Multiply first: ${b} x ${c} = ${b * c}. Then add: ${a} + ${b * c} = ${a + b * c}.`,
            'Order of operations: do multiplying and dividing BEFORE adding and subtracting, even if they come later in the problem.',
          );
        }
        return num(
          `(${a} + ${b}) x ${c} = ?`,
          (a + b) * c,
          `Parentheses first: ${a} + ${b} = ${a + b}. Then ${a + b} x ${c} = ${(a + b) * c}.`,
          'Order of operations: always do what is inside the (parentheses) FIRST. Then do the rest.',
        );
      }
      const e = ri(1, Math.min(9, a + b * c - 1));
      return num(
        `${a} + ${b} x ${c} - ${e} = ?`,
        a + b * c - e,
        `Multiply first: ${b} x ${c} = ${b * c}. Then left to right: ${a} + ${b * c} - ${e} = ${a + b * c - e}.`,
        'Do the multiplying FIRST. Then do the adding and subtracting from LEFT to RIGHT.',
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
          `${den} x ${k} = ${den * k}, so multiply the top by ${k} too: ${nu} x ${k} = ${nu * k}.`,
          `Equivalent fractions are the same amount cut into different size pieces. What did the bottom number get multiplied by to go from ${den} to ${den * k}? Do the SAME to the top number.`,
        );
      }
      return num(
        `${nu * k}/${den * k} = ${nu}/?`,
        den,
        `${nu * k} / ${k} = ${nu}, so divide the bottom by ${k} too: ${den * k} / ${k} = ${den}.`,
        `What did the top number get divided by to go from ${nu * k} to ${nu}? Do the SAME to the bottom number.`,
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
        `It's hard to compare pieces of different sizes. Rewrite both fractions so they have the SAME bottom number (try ${common}). Then just compare the top numbers. You can also compare each one to 1/2.`,
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
        const teach = `When the bottom numbers are the same, the pieces are the same size. Just add or subtract the TOP numbers, and keep the bottom number ${den}.`;
        if (Math.random() < 0.5) {
          return num(`${a}/${den} + ${b}/${den} = ?/${den}`, a + b, `Same bottom number, so just add the tops: ${a} + ${b} = ${a + b}. Answer: ${a + b}/${den}.`, teach);
        }
        const big = a + b;
        return num(`${big}/${den} - ${b}/${den} = ?/${den}`, a, `Same bottom number, so just subtract the tops: ${big} - ${b} = ${a}. Answer: ${a}/${den}.`, teach);
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
        `Add the wholes: ${w1} + ${w2} = ${w1 + w2}. Add the fractions: ${n1}/${den} + ${n2}/${den} = ${n1 + n2}/${den}. Answer: ${ans}.`,
        'Add the whole numbers together. Then add the fractions (same bottom number, so add the tops and keep the bottom). Put the two parts together.',
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
      return choice(
        `${a}/${b} + ${c}/${d} = ?`,
        ans,
        wrong,
        `Use ${common} as the bottom: ${a}/${b} = ${(a * common) / b}/${common} and ${c}/${d} = ${(c * common) / d}/${common}. Add the tops: ${top}/${common}${ans !== `${top}/${common}` ? ` = ${ans}` : ''}.`,
        `You can't add pieces of different sizes! First rewrite both fractions with the same bottom number (${common} works). Then add the tops. Simplify if you can. Never add the bottom numbers together.`,
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
        `${k} x ${nu}/${den} = ?/${den}`,
        k * nu,
        `${k} groups of ${nu}/${den}: multiply the top, ${k} x ${nu} = ${k * nu}. Answer: ${k * nu}/${den}.`,
        `${k} x ${nu}/${den} means ${k} groups of ${nu}/${den}. The piece size (bottom number) stays ${den}. Multiply only the TOP number by ${k}.`,
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
          `${t} tenths is the same as ${t * 10} hundredths, so ${t}/10 = ${t * 10}/100.`,
          'One tenth is the same as 10 hundredths (like 1 dime = 10 pennies). So multiply the top and bottom by 10.',
        );
      }
      if (kind === 1) {
        const h = ri(11, 99);
        const ans = (h / 100).toFixed(2);
        return choice(
          `Write ${h}/100 as a decimal.`,
          ans,
          [(h / 10).toFixed(1), `0.0${h}`, `${h}.0`],
          `Hundredths go two places after the decimal point: ${h}/100 = ${ans}.`,
          'Hundredths means two places after the decimal point. Think of money: 100 cents is one dollar, so how would you write that many cents in dollars?',
        );
      }
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
        `Make them the same length first: add a zero to the end of ${a} so it has two decimal places. Then compare them like whole numbers. A longer decimal is NOT always bigger!`,
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
      return choice(
        `${dec(x)} ${add ? '+' : '-'} ${dec(y)} = ?`,
        ans,
        wrong,
        `Line up the decimal points and ${add ? 'add' : 'subtract'} each column: ${dec(x)} ${add ? '+' : '-'} ${dec(y)} = ${ans}.`,
        `Write the numbers one above the other with the DECIMAL POINTS lined up. Fill empty spots with zeros. Then ${add ? 'add' : 'subtract'} like normal, and keep the decimal point in the same place.`,
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
      if (d === 3) {
        const area = l * w;
        return num(
          `A rectangle has an area of ${area} square feet. One side is ${w} feet. How long is the other side?`,
          l,
          `Area = length x width, so ${area} / ${w} = ${l} feet.`,
          `Area = length x width. You know the area and one side, so ask: ${w} times WHAT equals ${area}? That's a division problem.`,
        );
      }
      if (Math.random() < 0.5) {
        return num(
          `A rectangle is ${l} m long and ${w} m wide. What is its AREA in square meters?`,
          l * w,
          `Area = length x width = ${l} x ${w} = ${l * w} square meters.`,
          'AREA is how many squares cover the inside of the shape. For a rectangle, multiply the length by the width.',
        );
      }
      return num(
        `A rectangle is ${l} m long and ${w} m wide. What is its PERIMETER in meters?`,
        2 * (l + w),
        `Perimeter = all the sides added: ${l} + ${w} + ${l} + ${w} = ${2 * (l + w)} meters.`,
        'PERIMETER is the distance all the way AROUND the outside. A rectangle has 4 sides: two long ones and two short ones. Add all four.',
      );
    },
  },

  'volume': {
    levels: [2, 3],
    gen: (d) => {
      const l = ri(2, d === 2 ? 6 : 12);
      const w = ri(2, d === 2 ? 5 : 9);
      const h = ri(2, d === 2 ? 4 : 8);
      return num(
        `A box is ${l} cm long, ${w} cm wide and ${h} cm tall. What is its VOLUME in cubic cm?`,
        l * w * h,
        `Volume = length x width x height = ${l} x ${w} x ${h} = ${l * w * h} cubic cm.`,
        `Volume is how many little cubes fit inside. Find how many cubes cover the bottom (${l} x ${w}), then multiply by how many layers tall it is (${h}).`,
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
          'Compare the angle to 90 degrees (a square corner). Smaller than 90 is ACUTE ("a cute little angle"). Exactly 90 is RIGHT. Bigger than 90 is OBTUSE.',
        );
      }
      if (Math.random() < 0.5) {
        const a = ri(5, 34) * 5;
        return num(
          `A straight line is 180 degrees. It is split into two angles. One is ${a} degrees. What is the other?`,
          180 - a,
          `180 - ${a} = ${180 - a} degrees.`,
          'The two angles together make the whole straight line, 180 degrees. So take away the part you know from 180.',
        );
      }
      const a = ri(2, 16) * 5;
      return num(
        `A right angle (90 degrees) is split into two angles. One is ${a} degrees. What is the other?`,
        90 - a,
        `90 - ${a} = ${90 - a} degrees.`,
        'The two angles together make 90 degrees. Take away the part you know from 90.',
      );
    },
  },

  'word-problems': {
    levels: [1, 2, 3],
    gen: (d) => {
      const MULT_TEACH = 'Look for clue words. "Each", "every" and "times as many" usually mean MULTIPLY: equal groups put together.';
      if (d === 1) {
        const a = ri(12, 60);
        const b = ri(5, 30);
        if (Math.random() < 0.5) {
          return num(
            `A knight has ${a} coins. He finds ${b} more. How many coins does he have now?`,
            a + b,
            `${a} + ${b} = ${a + b} coins.`,
            '"Finds more" means the amount gets BIGGER, so you add the two numbers together.',
          );
        }
        return num(
          `A wizard has ${a + b} potions. She gives away ${b}. How many are left?`,
          a,
          `${a + b} - ${b} = ${a} potions.`,
          '"Gives away" and "left" mean the amount gets SMALLER, so you subtract.',
        );
      }
      if (d === 2) {
        const t = ri(0, 3);
        if (t === 0) {
          const piles = ri(3, 8);
          const each = ri(12, 125);
          return num(`A dragon has ${piles} piles of gold. Each pile has ${each} coins. How many coins in all?`, piles * each, `${piles} x ${each} = ${fmt(piles * each)} coins.`, MULT_TEACH);
        }
        if (t === 1) {
          const q = ri(4, 9);
          const each = ri(6, 15);
          return num(
            `${q * each} arrows are shared equally into ${q} quivers. How many arrows in each quiver?`,
            each,
            `${q * each} / ${q} = ${each} arrows each.`,
            '"Shared equally" means split into equal groups. That is DIVISION: total divided by the number of groups.',
          );
        }
        if (t === 2) {
          const a = ri(3, 9);
          const b = ri(2, 6);
          return num(`A goblin has ${a} gems. A troll has ${b} times as many. How many gems does the troll have?`, a * b, `"${b} times as many" means multiply: ${a} x ${b} = ${a * b}.`, MULT_TEACH);
        }
        const have = ri(120, 600);
        const spend = ri(40, have - 20);
        return num(
          `You have ${have} gold and spend ${spend} on a new sword. How much gold is left?`,
          have - spend,
          `${have} - ${spend} = ${have - spend} gold.`,
          '"Spend" and "left" mean the amount goes DOWN, so subtract what you spent from what you had.',
        );
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
          'This one has TWO steps. Step 1: find the total cost (how many potions times the price of each). Step 2: change is what you paid minus the total cost.',
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
          `Divide the people by how many fit in each boat. Careful! If anyone is left over (a remainder), they still need a boat. Nobody gets left behind!`,
        );
      }
      const rows = ri(3, 7);
      const cols = ri(4, 9);
      const lost = ri(2, rows * cols - 5);
      return num(
        `A wizard plants ${rows} rows of ${cols} magic beans. Then ${lost} beans are eaten by a mouse. How many beans are left?`,
        rows * cols - lost,
        `${rows} x ${cols} = ${rows * cols} beans. ${rows * cols} - ${lost} = ${rows * cols - lost}.`,
        'TWO steps. Step 1: rows of beans is equal groups, so multiply to find how many were planted. Step 2: some were eaten, so subtract.',
      );
    },
  },
};

/** Topics that have a generator for the given difficulty. */
export function mathTopicsFor(d: Difficulty): string[] {
  return Object.keys(GENERATORS).filter((k) => GENERATORS[k].levels.includes(d));
}

export function mathTopicLevels(topic: string): Difficulty[] {
  return GENERATORS[topic]?.levels ?? [];
}

export function makeMathQuestion(topic: string, d: Difficulty): Question {
  const g = GENERATORS[topic];
  const level = g.levels.includes(d) ? d : g.levels.reduce((best, l) => (Math.abs(l - d) < Math.abs(best - d) ? l : best), g.levels[0]);
  const q = g.gen(level);
  return { ...q, id: `m:${topic}:${q.prompt}`, subject: 'math', topic, difficulty: level };
}
