// A small error log kept on the device. When something breaks (a crash or a
// freeze), it is saved here so a grown-up can send a report later. Nothing is
// sent anywhere on its own.

export interface ErrorEntry {
  /** When it happened (ms since 1970). */
  t: number;
  kind: 'error' | 'freeze' | 'report';
  message: string;
  /** First lines of the stack trace. */
  stack?: string;
  /** Screens that were open. */
  scenes: string[];
  /** What happened just before (newest last). */
  crumbs: string[];
  version: string;
}

const KEY = 'learning-errors.v1';
const MAX_ENTRIES = 12;
const MAX_CRUMBS = 25;

declare const __APP_VERSION__: string;
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

const crumbs: string[] = [];

/** Remember a small step (like "open Dungeon" or "open chest") for the next report. */
export function crumb(text: string, now = Date.now()): void {
  const time = new Date(now).toTimeString().slice(0, 8);
  crumbs.push(`${time} ${text}`);
  if (crumbs.length > MAX_CRUMBS) crumbs.shift();
}

export function recentCrumbs(): string[] {
  return [...crumbs];
}

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadErrors(): ErrorEntry[] {
  try {
    const raw = storage()?.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as ErrorEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveErrors(list: ErrorEntry[]): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(list.slice(-MAX_ENTRIES)));
  } catch {
    /* storage full or blocked */
  }
}

export function clearErrors(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
}

/** Short stack: the first few lines, without long web addresses. */
export function shortStack(stack?: string): string | undefined {
  if (!stack) return undefined;
  return stack
    .split('\n')
    .slice(0, 7)
    .map((l) => l.trim().replace(/\(?(https?|capacitor|file):\/\/[^)\s]*\/([^/)\s]+)\)?/g, '($2)'))
    .join('\n');
}

/**
 * Save an error. The same message again within a few seconds (a broken screen
 * errors every frame) is not saved twice. Returns the entry, or undefined if
 * it was a repeat.
 */
export function recordError(
  kind: ErrorEntry['kind'],
  message: string,
  stack: string | undefined,
  scenes: string[],
  now = Date.now(),
): ErrorEntry | undefined {
  const list = loadErrors();
  const last = list[list.length - 1];
  if (last && last.kind === kind && last.message === message && now - last.t < 5000) return undefined;
  const entry: ErrorEntry = { t: now, kind, message: message.slice(0, 300), stack: shortStack(stack), scenes, crumbs: recentCrumbs(), version: APP_VERSION };
  list.push(entry);
  saveErrors(list);
  return entry;
}

/** The report as plain text, ready to paste into an email or a message. */
export function reportText(entries: ErrorEntry[], note: string, device: string, now = Date.now()): string {
  const lines = ['Learning Dungeon problem report', `Sent: ${new Date(now).toISOString()}`, `Version: ${APP_VERSION}`, `Device: ${device}`];
  if (note.trim()) lines.push('', `What happened: ${note.trim()}`);
  if (!entries.length) lines.push('', 'No errors were saved on this device.');
  for (const e of entries.slice(-5).reverse()) {
    lines.push('', `--- ${e.kind.toUpperCase()} at ${new Date(e.t).toISOString()} (version ${e.version})`);
    lines.push(`Screen: ${e.scenes.join(', ') || '?'}`);
    lines.push(`Message: ${e.message}`);
    if (e.stack) lines.push(`Where:\n${e.stack}`);
    if (e.crumbs.length) lines.push(`Before that:\n${e.crumbs.slice(-10).join('\n')}`);
  }
  return lines.join('\n');
}
