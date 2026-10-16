import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FR, fmtDec, fmtNum, getLang, setLang, tr } from './index';
import { GAMES } from '../hub/games';
import { ANIMALS, CROPS } from '../farm/data';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'preview2d' || f === 'preview3d' ? [] : sourceFiles(p);
    return p.endsWith('.ts') && !p.endsWith('.test.ts') ? [p] : [];
  });
}

/** Every tr('...') literal in the game. */
function trKeys(): { key: string; file: string }[] {
  const out: { key: string; file: string }[] = [];
  for (const file of sourceFiles(join(__dirname, '..'))) {
    const src = readFileSync(file, 'utf8');
    const re = /\btr\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;
    for (const m of src.matchAll(re)) {
      // Unescape the JS string literal.
      const key = JSON.parse(`"${m[2].replace(/\\'/g, "'").replace(/"/g, '\\"')}"`) as string;
      out.push({ key, file });
    }
  }
  return out;
}

describe('translations', () => {
  it('every tr() string has French', () => {
    const missing = trKeys().filter(({ key }) => !FR[key]?.trim());
    expect(missing.map((m) => `${m.file.split('/src/')[1]}: ${m.key}`)).toEqual([]);
  });

  it('every game card has French', () => {
    for (const g of GAMES) for (const s of [g.name, g.blurb]) expect(FR[s], s).toBeTruthy();
  });

  it('every crop and farm animal has French', () => {
    for (const x of [...CROPS, ...ANIMALS]) expect(FR[x.name], x.name).toBeTruthy();
  });

  it('French keeps the same {placeholders}', () => {
    for (const [en, fr] of Object.entries(FR)) {
      const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
      expect(ph(fr), en).toBe(ph(en));
    }
  });

  it('French has no space before ? or !', () => {
    for (const fr of Object.values(FR)) expect(/ [?!]/.test(fr), fr).toBe(false);
  });

  it('tr() is never called with a template literal', () => {
    for (const file of sourceFiles(join(__dirname, '..'))) {
      expect(/\btr\(\s*`/.test(readFileSync(file, 'utf8')), file).toBe(false);
    }
  });

  it('formats numbers per language', () => {
    const before = getLang();
    setLang('en');
    expect(fmtNum(12345)).toBe('12,345');
    expect(fmtDec(3.5)).toBe('3.5');
    expect(tr('{n} gold', { n: 5 })).toBe('5 gold');
    setLang('fr');
    expect(fmtNum(12345)).toBe('12 345');
    expect(fmtNum(999)).toBe('999');
    expect(fmtDec(3.5)).toBe('3,5');
    setLang(before);
  });
});
