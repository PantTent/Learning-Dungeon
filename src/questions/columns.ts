// Spotting column problems ("275 + 341") for the scrap paper.

export type Op = '+' | '−' | '×';

/** The two numbers and the sign, when the question is written as "A + B". */
export function parseColumns(prompt: string): { a: string; b: string; op: Op } | null {
  const n = String.raw`(\d{1,3}(?:[,   ]\d{3})+|\d+)`;
  const m = new RegExp(`${n}\\s*([+\\-−x×])\\s*${n}(?![\\d/])`).exec(prompt);
  if (!m) return null;
  const clean = (s: string) => s.replace(/[^\d]/g, '');
  const op: Op = m[2] === '+' ? '+' : m[2] === 'x' || m[2] === '×' ? '×' : '−';
  const a = clean(m[1]);
  const b = clean(m[3]);
  if (a.length > 7 || b.length > 7) return null;
  return { a, b, op };
}

/**
 * The two whole numbers in a question that is not written as "A + B" (like a
 * story problem), bigger one first, so the scrap paper can start with them.
 * Only when there are exactly two (and no decimals or fractions).
 */
export function twoNumbers(prompt: string): { a: string; b: string } | null {
  if (/\d[.,]\d|\d\/\d/.test(prompt.replace(/(\d)[,\u00a0\u202f ](\d{3})/g, '$1$2'))) return null;
  const nums = [...prompt.matchAll(/\d{1,3}(?:[,\u00a0\u202f ]\d{3})+|\d+/g)].map((m) => m[0].replace(/[^\d]/g, ''));
  if (nums.length !== 2 || nums.some((n) => n.length > 7)) return null;
  const [x, y] = nums;
  return Number(x) >= Number(y) ? { a: x, b: y } : { a: y, b: x };
}
