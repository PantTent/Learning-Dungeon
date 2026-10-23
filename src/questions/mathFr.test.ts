// The grade 3-6 math questions in French: clean French text, Quebec
// typography, and answers that are still right.
import { MATH_TOPICS, MATH_TOPICS_FR, makeMathQuestion, mathTopicLevels } from './math';
import { mentionsNumber } from './mathEarly';
import { isCorrect, normalize } from './engine';
import { topicLabel } from './labels';
import type { Question } from './types';
import { setLang, setUnits } from '../i18n';

const NEW = ['percent', 'ratio', 'integers', 'decimal-muldiv', 'fractions-mixed', 'exponents'];
const N = 250;

/** French number to a JS number: "1 500" -> 1500, "3,25" -> 3.25, "−5" -> -5, "3,25 m" -> 3.25. */
const val = (s: string) =>
  Number(
    s
      .replace(/−/g, '-')
      .replace(/(\d)[   ](?=\d{3}(?!\d))/g, '$1')
      .replace(',', '.')
      .replace(/[^\d.-]/g, ''),
  );
/** "2 1/4" -> 2.25, "7/4" -> 1.75. */
const frac = (s: string) => {
  const m = s.match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
  return m ? Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]) : val(s);
};
const SUP: Record<string, number> = { '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6 };
const power = (s: string) => {
  const m = s.match(/^(\d+)([²³⁴⁵⁶])$/)!;
  return Number(m[1]) ** SUP[m[2]];
};
const product = (s: string) => s.split(' × ').reduce((p, x) => p * Number(x), 1);
/** A number written in French: 12, 1 500, 3,25, −4. */
const NUM = '−?\\d+(?:[ \\u00a0]\\d{3})*(?:,\\d+)?';
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ENGLISH = /(?<!\p{L})(how many|how much|what is|what|which|times|groups? of|the|and|is|are|of|each|left|right|write|round|wholes?|gold|coins|feet|inches|yards|cups|pounds|degrees|they|equal to|greater|less|squared|percent|ratio|rope|helmets?|knights?|potions? cost)(?!\p{L})/iu;

function texts(q: Question) {
  return [q.prompt, q.explanation, q.teach ?? '', ...(q.choices ?? [])];
}

function checkFrench(q: Question, ctx: string) {
  for (const s of texts(q)) {
    expect(s, ctx).not.toMatch(/NaN|undefined|Infinity|null|\[object/);
    expect(s, `${ctx} :: English left over: ${s}`).not.toMatch(ENGLISH);
    // Quebec style: no space before ? or ! after a word or number (a lone "?" after a sign is the blank).
    expect(s, `${ctx} :: ${s}`).not.toMatch(/[\p{L}\d)»%°][  ][?!]/u);
    // A non-breaking space before every colon.
    expect(s, `${ctx} :: ${s}`).not.toMatch(/[^ ]:/);
    // French signs and numbers: ×, ÷, decimal comma, spaced thousands.
    expect(s, `${ctx} :: ${s}`).not.toMatch(/\d x \d|\d ?x ?\d|\d \/ \d|\d\.\d/);
    expect(s, `${ctx} :: ${s}`).not.toMatch(/(?<![\d,])\d{4,}/);
  }
  expect(q.prompt.trim().length, ctx).toBeGreaterThan(3);
  expect(q.explanation.trim().length, ctx).toBeGreaterThan(3);
  expect(q.teach?.trim().length, ctx).toBeGreaterThan(10);

  if (q.input === 'number') {
    expect(q.answer, ctx).toMatch(/^\d+$/);
    expect(Number.isFinite(Number(q.answer)), ctx).toBe(true);
    expect(isCorrect(q, q.answer), ctx).toBe(true);
    // The hint never says the answer (small numbers can be part of the method in the old topics).
    if ((NEW.includes(q.topic) || Number(q.answer) > 12) && !mentionsNumber(q.prompt, q.answer)) {
      expect(mentionsNumber(q.teach!, q.answer), `${ctx} :: teach gives it away: ${q.teach}`).toBe(false);
    }
  } else {
    expect(q.choices, ctx).toBeDefined();
    expect(q.choices!.length, ctx).toBeGreaterThanOrEqual(2);
    expect(q.choices!.length, ctx).toBeLessThanOrEqual(4);
    expect(q.choices, ctx).toContain(q.answer);
    // Unique, even the way the answer checker sees them ("3,5" vs "35").
    expect(new Set(q.choices!.map(normalize)).size, `${ctx} :: ${q.choices!.join(' | ')}`).toBe(q.choices!.length);
    for (const c of q.choices!) expect(isCorrect(q, c), `${ctx} :: ${c}`).toBe(c === q.answer);
    // A numeric answer is not written in the hint (unless the question shows it too).
    if (/\d/.test(q.answer) && !q.prompt.includes(q.answer)) {
      const re = new RegExp(`(^|[^\\d,/])${esc(q.answer)}(?![\\d,/]|[ \\u00a0]\\d)`);
      expect(re.test(q.teach!), `${ctx} :: teach gives it away: ${q.teach}`).toBe(false);
    }
  }
}

/** Recompute the right answer from the numbers in a French prompt. Returns false when no rule applies. */
function checkAnswer(q: Question): boolean {
  const p = q.prompt;
  const ans = q.input === 'number' ? Number(q.answer) : q.answer;
  const others = (q.choices ?? []).filter((c) => c !== q.answer);
  let m: RegExpMatchArray | null;
  // Plain arithmetic: "a × b = ?", "a ÷ b = ?", "a + b = ?", "a − b = ?".
  if ((m = p.match(new RegExp(`^(${NUM}) ([×÷+−]) (${NUM}) = \\?$`)))) {
    const [a, op, b] = [val(m[1]), m[2], val(m[3])];
    const want = op === '×' ? a * b : op === '÷' ? a / b : op === '+' ? a + b : a - b;
    if (/reste/.test(q.answer)) {
      expect(q.answer).toBe(`${Math.floor(a / b)} reste ${a % b}`);
    } else {
      expect(val(q.answer), p).toBeCloseTo(want, 9);
      if (q.choices) expect(new Set(q.choices.map(val)).size, p).toBe(q.choices.length);
    }
    return true;
  }
  switch (q.topic) {
    case 'rounding': {
      m = p.match(new RegExp(`^Arrondis (${NUM}) (.+) près\\.$`))!;
      const place = { 'à la dizaine': 10, 'à la centaine': 100, 'à l’unité de mille': 1000, 'à la dizaine de mille': 10000, 'à la centaine de mille': 100000 }[m[2]]!;
      expect(ans).toBe(Math.round(val(m[1]) / place) * place);
      return true;
    }
    case 'compare': {
      const [a, b] = p.split('\n')[1].split('______').map(val);
      expect(q.answer.startsWith(a > b ? '>' : a < b ? '<' : '='), p).toBe(true);
      return true;
    }
    case 'fractions-compare': {
      const [, a, b, c, d] = p.match(/(\d+)\/(\d+)\s+ou\s+(\d+)\/(\d+)/)!.map(Number);
      expect(q.answer).toBe(a * d > b * c ? `${a}/${b}` : a * d < b * c ? `${c}/${d}` : 'Elles sont égales');
      return true;
    }
    case 'measurement': {
      m = p.match(/^(\d+) (\S+) = \? (\S+)$/)!;
      const f: Record<string, number> = {
        'heures>minutes': 60, 'minutes>secondes': 60, 'pieds>pouces': 12, 'verges>pieds': 3, 'semaines>jours': 7, 'mètres>centimètres': 100,
        'centimètres>millimètres': 10, 'jours>heures': 24, 'livres>onces': 16, 'gallons>pintes': 4, 'pintes>tasses': 4, 'verges>pouces': 36,
        'gallons>chopines': 8, 'kilogrammes>grammes': 1000, 'litres>millilitres': 1000, 'kilomètres>mètres': 1000, 'mètres>millimètres': 1000,
      };
      expect(f[`${m[2]}>${m[3]}`], p).toBeDefined();
      expect(ans).toBe(Number(m[1]) * f[`${m[2]}>${m[3]}`]);
      return true;
    }
    case 'percent':
      if ((m = p.match(new RegExp(`^Combien font (\\d+) % de (${NUM})\\?$`)))) return expect(ans).toBe((Number(m[1]) * val(m[2])) / 100), true;
      if ((m = p.match(/(\d+) carrés sont coloriés/))) return expect(ans).toBe(Number(m[1])), true;
      if ((m = p.match(/égale à (\d+) %/))) {
        expect(frac(q.answer)).toBeCloseTo(Number(m[1]) / 100, 9);
        for (const w of others) expect(Math.abs(frac(w) - Number(m[1]) / 100) > 1e-9, w).toBe(true);
        return true;
      }
      if ((m = p.match(/^Écris (\d+) % en nombre décimal/))) return expect(val(q.answer)).toBeCloseTo(Number(m[1]) / 100, 9), true;
      if ((m = p.match(/coûte (\d+) pièces d’or\. La boutique fait un rabais de (\d+) %/))) return expect(ans).toBe(Number(m[1]) * (1 - Number(m[2]) / 100)), true;
      if ((m = p.match(/a (\d+) chevaliers\. (\d+) d’entre eux/))) return expect(ans).toBe((Number(m[2]) * 100) / Number(m[1])), true;
      return false;
    case 'ratio':
      if ((m = p.match(/^Il y a (\d+) .+ et (\d+) /))) return expect(ans).toBe(`${m[1]} : ${m[2]}`), true;
      if ((m = p.match(/^Pour (\d+) .+, il y a (\d+) .+ Il y a (\d+) /))) return expect(ans).toBe((Number(m[3]) / Number(m[1])) * Number(m[2])), true;
      if ((m = p.match(/^(\d+) : (\d+) = \? : (\d+)$/))) return expect(ans).toBe((Number(m[1]) * Number(m[3])) / Number(m[2])), true;
      if ((m = p.match(/^(\d+) : (\d+) = (\d+) : \?$/))) return expect(ans).toBe((Number(m[2]) * Number(m[3])) / Number(m[1])), true;
      if ((m = p.match(/équivalent à (\d+) : (\d+)\?$/))) {
        const [a, b] = [Number(m[1]), Number(m[2])];
        const same = (r: string) => {
          const [x, y] = r.split(' : ').map(Number);
          return x * b === y * a;
        };
        expect(same(q.answer)).toBe(true);
        for (const w of others) expect(same(w), w).toBe(false);
        return true;
      }
      if ((m = p.match(/^(\d+) potions coûtent (\d+) pièces d’or\. Combien coûte 1 /))) return expect(ans).toBe(Number(m[2]) / Number(m[1])), true;
      if ((m = p.match(/^(\d+) potions coûtent (\d+) pièces d’or\. Combien coûtent (\d+)/))) return expect(ans).toBe((Number(m[2]) / Number(m[1])) * Number(m[3])), true;
      if ((m = p.match(/vole (\d+) \S+ en (\d+) heures/))) return expect(ans).toBe(Number(m[1]) / Number(m[2])), true;
      return false;
    case 'integers': {
      const cv = (q.choices ?? []).map(val);
      if (p.includes('plus FROIDE') || p.includes('plus PETIT?')) return expect(val(q.answer)).toBe(Math.min(...cv)), true;
      if (p.includes('plus GRAND?')) return expect(val(q.answer)).toBe(Math.max(...cv)), true;
      if ((m = p.match(/^Pars de (−?\d+) .+ Fais (\d+) bonds vers la (gauche|droite)/))) return expect(val(q.answer)).toBe(val(m[1]) + (m[3] === 'gauche' ? -1 : 1) * Number(m[2])), true;
      if (p.startsWith('Place ces nombres')) {
        const list = p.split('\n')[1].split(', ').map(val).sort((x, y) => x - y);
        return expect(q.answer.split(', ').map(val)).toEqual(list), true;
      }
      if ((m = p.match(/^Il fait (−?\d+) °\w dehors\. La température baisse de (\d+) degrés/))) return expect(val(q.answer)).toBe(val(m[1]) - Number(m[2])), true;
      if ((m = p.match(/il faisait (−?\d+) °\w\. À midi, il faisait (−?\d+) °/))) return expect(ans).toBe(val(m[2]) - val(m[1])), true;
      return false;
    }
    case 'decimal-muldiv':
      if ((m = p.match(new RegExp(`^Une corde mesure (${NUM}) \\S+\\. On la coupe en (\\d+)`)))) {
        expect(val(q.answer)).toBeCloseTo(val(m[1]) / Number(m[2]), 9);
        expect(new Set(q.choices!.map(val)).size).toBe(q.choices!.length);
        return true;
      }
      return false;
    case 'fractions-mixed':
      if ((m = p.match(/^Écris (\d+)\/(\d+) sous forme de nombre fractionnaire/))) {
        const v = Number(m[1]) / Number(m[2]);
        expect(frac(q.answer)).toBeCloseTo(v, 9);
        for (const w of others) expect(Math.abs(frac(w) - v) > 1e-9, w).toBe(true);
        return true;
      }
      if ((m = p.match(/^(\d+)\/(\d+), ça fait combien d’entiers/))) return expect(ans).toBe(Number(m[1]) / Number(m[2])), true;
      if ((m = p.match(/^(\d+) (\d+)\/(\d+) = \?\/(\d+)$/))) return expect(ans).toBe(Number(m[1]) * Number(m[3]) + Number(m[2])), true;
      if ((m = p.match(/\n(.+)  ou  (.+)$/))) {
        const [a, b] = [frac(m[1]), frac(m[2])];
        return expect(q.answer).toBe(a - b > 1e-9 ? m[1] : b - a > 1e-9 ? m[2] : 'Ils sont égaux'), true;
      }
      return false;
    case 'exponents':
      if ((m = p.match(/^(\d+[²³⁴⁵⁶]) = \?$/))) return expect(ans).toBe(power(m[1])), true;
      if ((m = p.match(/^Combien fait (\d+) au carré/))) return expect(ans).toBe(Number(m[1]) ** 2), true;
      if ((m = p.match(/égal à (\d+) × (\d+)\?$/))) return expect(power(q.answer)).toBe(Number(m[1]) * Number(m[2])), true;
      if ((m = p.match(/égal à (\d+[²³⁴⁵⁶])\?$/))) {
        expect(product(q.answer)).toBe(power(m[1]));
        for (const w of others) expect(w.includes('+') ? Number(w.split(' + ')[0]) * w.split(' + ').length : product(w), w).not.toBe(power(m[1]));
        return true;
      }
      if ((m = p.match(new RegExp(`^(\\d+)ⁿ = (${NUM})\\.`)))) return expect(Number(m[1]) ** Number(ans)).toBe(val(m[2])), true;
      if ((m = p.match(/\n(.+)  ou  (.+)$/))) {
        const [a, b] = [power(m[1]), power(m[2])];
        return expect(q.answer).toBe(a > b ? m[1] : a < b ? m[2] : 'Ils sont égaux'), true;
      }
      if ((m = p.match(/^(\d+)² \+ (\d+)² = \?$/))) return expect(ans).toBe(Number(m[1]) ** 2 + Number(m[2]) ** 2), true;
      return false;
  }
  return false;
}

describe('grade 3-6 math in French', () => {
  beforeAll(() => setLang('fr'));
  afterAll(() => {
    setLang('en');
    setUnits('imperial');
  });

  for (const topic of Object.keys(MATH_TOPICS)) {
    it(`${topic} reads as clean French`, () => {
      setLang('fr');
      for (const units of ['metric', 'imperial'] as const) {
        setUnits(units);
        for (const d of mathTopicLevels(topic)) {
          for (let i = 0; i < N; i++) {
            const factors = topic.endsWith('-table') ? [[5], [3, 7], [1], [12], [2, 9]][i % 5] : undefined;
            const q = makeMathQuestion(topic, d, factors);
            const ctx = `${topic} d${d} ${units} | ${q.prompt}`;
            checkFrench(q, ctx);
            expect(q.id.startsWith(`m:${topic}:`)).toBe(true);
          }
        }
      }
    });
  }

  for (const topic of Object.keys(MATH_TOPICS)) {
    it(`${topic} answers are right in French`, () => {
      setLang('fr');
      setUnits('metric');
      let checked = 0;
      let total = 0;
      for (const d of mathTopicLevels(topic)) {
        for (let i = 0; i < N; i++) {
          const q = makeMathQuestion(topic, d);
          total++;
          if (checkAnswer(q)) checked++;
          else if (NEW.includes(q.topic)) throw new Error(`no French checker for ${q.prompt}`);
        }
      }
      // Every new grade 6 question is checked; older topics are checked where the prompt is plain arithmetic.
      if (NEW.includes(topic)) expect(checked).toBe(total);
    });
  }

  it('the explanation shows the answer', () => {
    setLang('fr');
    const flat = (s: string) => s.replace(/(\d)[  ](?=\d{3}(?!\d))/g, '$1');
    for (const topic of Object.keys(MATH_TOPICS)) {
      for (const d of mathTopicLevels(topic)) {
        for (let i = 0; i < 60; i++) {
          const q = makeMathQuestion(topic, d);
          if (q.input === 'number') expect(mentionsNumber(flat(q.explanation), q.answer), `${topic}: ${q.prompt} -> ${q.explanation}`).toBe(true);
        }
      }
    }
  });

  it('topic names are French for parents', () => {
    for (const t of Object.keys(MATH_TOPICS)) {
      setLang('fr');
      expect(topicLabel(t)).toBe(MATH_TOPICS_FR[t]);
      expect(topicLabel(t)).not.toMatch(ENGLISH);
      setLang('en');
      expect(topicLabel(t)).toBe(MATH_TOPICS[t]);
    }
  });

  it('English stays English', () => {
    setLang('en');
    for (const topic of Object.keys(MATH_TOPICS)) {
      for (const d of mathTopicLevels(topic)) {
        const q = makeMathQuestion(topic, d);
        for (const s of texts(q)) expect(s, `${topic}: ${s}`).not.toMatch(/ |(?<!\p{L})(Combien|Quel|Quelle|donc|est)(?!\p{L})/u);
      }
    }
  });
});
