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
