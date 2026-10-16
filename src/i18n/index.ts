// Language support. Every piece of on-screen English goes through tr(), which
// looks it up in the current language's dictionary (keyed by the English
// text) and fills in {placeholders}. Missing translations fall back to
// English, and a test checks that every translated literal has a French entry.
import { FR_BATTLE } from './fr/battle';
import { FR_DATA } from './fr/data';
import { FR_DUNGEON } from './fr/dungeon';
import { FR_MENUS } from './fr/menus';

export type Lang = 'en' | 'fr';

export const LANGS: { id: Lang; label: string; speech: string }[] = [
  { id: 'en', label: 'English', speech: 'en-US' },
  { id: 'fr', label: 'Français', speech: 'fr-CA' },
];

export const FR: Record<string, string> = { ...FR_DATA, ...FR_MENUS, ...FR_DUNGEON, ...FR_BATTLE };

const KEY = 'learning-dungeon.lang';
let lang: Lang = 'en';
try {
  const saved = globalThis.localStorage?.getItem(KEY);
  if (saved === 'en' || saved === 'fr') lang = saved;
} catch {
  /* storage blocked */
}

export function getLang(): Lang {
  return lang;
}

export function setLang(l: Lang): void {
  lang = l;
  try {
    globalThis.localStorage?.setItem(KEY, l);
  } catch {
    /* storage blocked */
  }
}

export function speechLang(): string {
  return LANGS.find((l) => l.id === lang)!.speech;
}

/** Translate an English UI string. `params` fill {name} placeholders. */
export function tr(en: string, params?: Record<string, string | number>): string {
  let s = lang === 'fr' ? (FR[en] ?? en) : en;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
  return s;
}

/** Pick between hand-written English and French text. */
export function L(en: string, fr: string): string {
  return lang === 'fr' ? fr : en;
}

/** Whole numbers: 12,345 in English, 12 345 in French. */
export function fmtNum(n: number): string {
  const neg = n < 0;
  const digits = String(Math.abs(Math.trunc(n)));
  const sep = lang === 'fr' ? ' ' : ',';
  const out = digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return neg ? `-${out}` : out;
}

/** Decimals: 3.5 in English, 3,5 in French. */
export function fmtDec(n: number, places?: number): string {
  const s = places === undefined ? String(n) : n.toFixed(places);
  return lang === 'fr' ? s.replace('.', ',') : s;
}
