import { EARLY_GENERATORS, EARLY_TOPICS, earlyTopicsFor, makeEarlyQuestion, mentionsNumber } from './mathEarly';
import { setLang, type Lang } from '../i18n';
import type { Difficulty, Question } from './types';

const N = 200;
const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
const SHAPE_SIDES: Record<string, number> = { tri: 3, sq: 4, rect: 4, pent: 5, hex: 6, oct: 8, circle: 0 };
const TIME_FACTS: Record<string, number> = { mh: 60, mhalf: 30, mq: 15, dw: 7, my: 12, hd: 24 };

/** Recompute the right answer from the question key. */
function expected(topic: string, key: string, lang: Lang): string {
  const [kind] = key.split(':');
  const n = nums(key);
  const fr = lang === 'fr';
  switch (topic) {
    case 'e-count':
      return String(kind === 'after' ? n[0] + 1 : kind === 'before' ? n[0] - 1 : n[0]);
    case 'e-add':
      return String(n[0] + n[1]);
    case 'e-sub':
      return String(n[0] - n[1]);
    case 'e-missing': {
      if (/^\d+\+\?=\d+$/.test(key) || /^\?\+\d+=\d+$/.test(key)) return String(n[1] - n[0]);
      if (/^\?-\d+=\d+$/.test(key)) return String(n[0] + n[1]);
      if (/^\d+-\?=\d+$/.test(key)) return String(n[0] - n[1]);
      throw new Error(key);
    }
    case 'e-compare':
      if (kind === 'sym') return n[0] > n[1] ? '>' : n[0] < n[1] ? '<' : '=';
      return String(kind === 'big' ? Math.max(...n) : Math.min(...n));
    case 'e-place':
      if (kind.startsWith('p')) return String(Math.floor(n[1] / n[0]) % 10);
      return String(100 * n[0] + 10 * n[1] + n[2]);
    case 'e-skip': {
      const [step, start] = n;
      return String(start + (key.endsWith(':u') ? 4 : -4) * step);
    }
    case 'e-doubles':
      return String(kind === 'half' ? n[0] / 2 : 2 * n[0]);
    case 'e-even-odd':
      if (kind === 'eo') return n[0] % 2 === 0 ? (fr ? 'Pair' : 'Even') : fr ? 'Impair' : 'Odd';
      expect(n[0] % 2 === 0, key).toBe(kind === 'we');
      for (const w of n.slice(1)) expect(w % 2 === 0, key).toBe(kind === 'wo');
      return String(n[0]);
    case 'e-money':
      if (kind === 'c') return String(25 * n[0] + 10 * n[1] + 5 * n[2]);
      if (kind === 'mk') return String(n[1] / n[0]);
      if (kind === 'ch1') return String(100 - n[1]);
      if (kind === 'ch5') return String(5 - n[1]);
      if (kind === 'add') return String(n[0] + n[1]);
      if (kind === 'dl') return String(2 * n[0] + n[1]);
      throw new Error(key);
    case 'e-time':
      if (kind === 'later') return String(n[0] + n[1]);
      if (kind === 'earlier') return String(n[0] - n[1]);
      if (kind === 'sum') return String(n[0] + n[1]);
      if (kind === 'until') return String(n[2] - n[1]);
      return String(TIME_FACTS[key.split(':')[1]]);
    case 'e-shapes': {
      const id = key.split(':')[1];
      if (kind === 'cube') return String({ f: 6, v: 8, e: 12 }[id]);
      if (kind === 'tot') return String(SHAPE_SIDES[id.split(',')[0]] * n[0]);
      if (kind === 'which') return '';
      return String(SHAPE_SIDES[id]);
    }
    case 'e-mult':
      return String(n[0] * n[1]);
    case 'e-div':
      return String(n[0] / n[1]);
    case 'e-fractions':
      if (kind === 'fr') return String(n[1] / n[0]);
      if (kind === 'cmp') return `1/${Math.min(n[0], n[1])}`;
      return fr ? ['un demi', 'un tiers', 'un quart'][n[0] - 2] : ['one half', 'one third', 'one quarter'][n[0] - 2];
    case 'e-measure':
      if (kind === 'cmm') return '100';
      if (kind === 'kmm') return '1000';
      if (kind === 'mcm') return String(100 * n[0]);
      if (kind === 'add') return String(n[0] + n[1]);
      if (kind === 'diff') return String(n[0] - n[1]);
      if (kind === 'long') return `${Math.max(n[0], n[1])} cm`;
      if (kind === 'short') return `${Math.min(n[0], n[1])} cm`;
      return '';
    case 'e-word': {
      const [a, b] = n.slice(-2);
      return String(kind === 'add' ? a + b : kind === 'sub' ? a - b : kind === 'mult' ? a * b : a / b);
    }
  }
  throw new Error(`no checker for ${topic}`);
}

const flat = (s: string) => s.replace(/(\d)[ ,\u00a0\u202f](?=\d{3}(?!\d))/g, '$1');

function checkQuestion(q: Question, topic: string, lang: Lang) {
  const prefix = `m:${topic}:`;
  expect(q.id.startsWith(prefix)).toBe(true);
  expect(q.subject).toBe('math');
  expect(q.topic).toBe(topic);
  const key = q.id.slice(prefix.length);
  const ctx = `${lang} ${q.id} | ${q.prompt}`;
  for (const s of [q.prompt, q.explanation, q.teach ?? '']) {
    expect(s.trim().length, ctx).toBeGreaterThan(3);
    expect(s, ctx).not.toMatch(/NaN|undefined|Infinity|null|\[object/);
  }
  expect(q.explanation.length, ctx).toBeLessThanOrEqual(170);
  expect(q.teach!.length, ctx).toBeLessThanOrEqual(220);
  // The explanation tells the answer.
  expect(flat(q.explanation).toLowerCase(), ctx).toContain(q.answer.toLowerCase());

  if (q.input === 'number') {
    expect(q.answer, ctx).toMatch(/^\d+$/);
    expect(mentionsNumber(q.teach!, q.answer), `teach gives away answer: ${ctx} | ${q.teach}`).toBe(false);
    expect(q.choices).toBeUndefined();
  } else {
    expect(q.choices, ctx).toBeDefined();
    expect(q.choices!.length, ctx).toBeGreaterThanOrEqual(2);
    expect(q.choices!.length, ctx).toBeLessThanOrEqual(4);
    expect(q.choices, ctx).toContain(q.answer);
    expect(new Set(q.choices).size, ctx).toBe(q.choices!.length);
    expect(q.teach!.toLowerCase(), ctx).not.toContain(q.answer.toLowerCase().length > 2 ? q.answer.toLowerCase() : '\u0000');
  }

  const want = expected(topic, key, lang);
  if (want !== '') expect(q.answer, ctx).toBe(want);

  if (lang === 'fr') {
    // Quebec style: no space before ? or ! after a word (a lone "?" after a
    // number or sign is the blank to fill in).
    for (const s of [q.prompt, q.explanation, q.teach!]) {
      expect(s, `${ctx} :: ${s}`).not.toMatch(/[A-Za-zÀ-ÿ»)'’] [?!]/);
    }
  }
  // Numbers of 1000 or more use fmtNum (French "1 000", English "1,000").
  for (const s of [q.prompt]) {
    expect(s, ctx).not.toMatch(/\d{4,}/);
  }
}

describe('early math generators (Quebec 1re-3e annee)', () => {
  afterAll(() => setLang('en'));

  it('every topic has a label in both languages and a generator', () => {
    expect(Object.keys(EARLY_TOPICS).sort()).toEqual(Object.keys(EARLY_GENERATORS).sort());
    for (const t of Object.values(EARLY_TOPICS)) {
      expect(t.en.length).toBeGreaterThan(2);
      expect(t.fr.length).toBeGreaterThan(2);
    }
  });

  it('levels match the plan', () => {
    const lv = (t: string) => EARLY_GENERATORS[t].levels;
    for (const t of ['e-count', 'e-add', 'e-sub', 'e-missing', 'e-compare', 'e-place', 'e-skip', 'e-shapes', 'e-word']) expect(lv(t)).toEqual([1, 2, 3]);
    expect(lv('e-doubles')).toEqual([1, 2]);
    for (const t of ['e-even-odd', 'e-money', 'e-time', 'e-fractions', 'e-measure']) expect(lv(t)).toEqual([2, 3]);
    expect(lv('e-mult')).toEqual([3]);
    expect(lv('e-div')).toEqual([3]);
    expect(earlyTopicsFor(1)).toContain('e-add');
    expect(earlyTopicsFor(1)).not.toContain('e-mult');
  });

  for (const lang of ['en', 'fr'] as Lang[]) {
    for (const topic of Object.keys(EARLY_GENERATORS)) {
      for (const d of EARLY_GENERATORS[topic].levels) {
        it(`${topic} level ${d} (${lang}) is correct and well-formed`, () => {
          setLang(lang);
          try {
            for (let i = 0; i < N; i++) {
              const q = makeEarlyQuestion(topic, d as Difficulty);
              expect(q.difficulty).toBe(d);
              checkQuestion(q, topic, lang);
            }
          } finally {
            setLang('en');
          }
        });
      }
    }
  }

  it('stays in range for each school year', () => {
    const maxFor: Record<number, number> = { 1: 50, 2: 100, 3: 1000 };
    for (const d of [1, 2, 3] as Difficulty[]) {
      for (const topic of ['e-count', 'e-add', 'e-sub', 'e-missing', 'e-compare']) {
        for (let i = 0; i < 300; i++) {
          const q = makeEarlyQuestion(topic, d);
          const all = [...nums(flat(q.prompt)), ...(q.input === 'number' ? [Number(q.answer)] : [])];
          for (const v of all) expect(v, q.prompt).toBeLessThanOrEqual(maxFor[d]);
          if (d === 1 && (topic === 'e-add' || topic === 'e-sub')) for (const v of all) expect(v, q.prompt).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it('same key gives the same id, in both languages', () => {
    const seen = new Map<string, string>();
    for (const lang of ['en', 'fr'] as Lang[]) {
      setLang(lang);
      for (let i = 0; i < 3000; i++) {
        const topic = Object.keys(EARLY_GENERATORS)[i % Object.keys(EARLY_GENERATORS).length];
        const levels = EARLY_GENERATORS[topic].levels;
        const q = makeEarlyQuestion(topic, levels[i % levels.length]);
        // An id always maps to the same answer (choice answers differ by language).
        const sig = `${lang}|${q.answer}`;
        if (seen.has(`${lang}|${q.id}`)) expect(seen.get(`${lang}|${q.id}`), q.id).toBe(sig);
        seen.set(`${lang}|${q.id}`, sig);
      }
    }
    setLang('en');
    const a = makeEarlyQuestion('e-add', 1);
    const key = a.id.slice('m:e-add:'.length);
    expect(a.id).toBe(`m:e-add:${key}`);
    expect(a.prompt.replace(/\D+/g, ' ').trim()).toBe(key.replace(/\D+/g, ' ').trim());
  });

  it('falls back to the nearest supported level', () => {
    expect(makeEarlyQuestion('e-mult', 1).difficulty).toBe(3);
    expect(makeEarlyQuestion('e-doubles', 3).difficulty).toBe(2);
  });

  it('French money and numbers use Quebec notation', () => {
    setLang('fr');
    try {
      for (let i = 0; i < 400; i++) {
        const q = makeEarlyQuestion('e-money', (2 + (i % 2)) as Difficulty);
        expect(q.prompt, q.prompt).not.toMatch(/\$\d|\d¢|\d\$/);
      }
      let saw1000 = false;
      for (let i = 0; i < 400; i++) {
        const q = makeEarlyQuestion('e-measure', 3);
        if (q.id === 'm:e-measure:kmm') {
          saw1000 = true;
          expect(q.explanation).toMatch(/1[\u00a0 ]000/);
        }
      }
      expect(saw1000).toBe(true);
    } finally {
      setLang('en');
    }
    for (let i = 0; i < 200; i++) {
      const q = makeEarlyQuestion('e-money', 3);
      expect(q.prompt, q.prompt).not.toMatch(/\d[ \u00a0]\$|\d[ \u00a0]¢/);
    }
  });
});
