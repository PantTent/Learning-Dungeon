// Play timer set by a grown-up: how many minutes of games are left. It only
// counts down while a game is open (not on the menus), and when it reaches 0
// the games stay locked until a grown-up adds more time.

export interface PlayTime {
  /** The timer is on (off = no limit). */
  on: boolean;
  /** Play time left, in milliseconds. */
  leftMs: number;
}

const KEY = 'learning-arcade.playtime.v1';
export const MAX_MINUTES = 600;

export function loadPlayTime(): PlayTime {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<PlayTime>;
      return { on: !!p.on, leftMs: Math.max(0, Number(p.leftMs) || 0) };
    }
  } catch {
    /* storage blocked */
  }
  return { on: false, leftMs: 0 };
}

export function savePlayTime(p: PlayTime): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked */
  }
}

/** Minutes typed by a grown-up, kept to 1..MAX_MINUTES (0 or junk = nothing). */
export function cleanMinutes(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(MAX_MINUTES, Math.floor(n));
}

/** Start the timer with exactly this many minutes. */
export function setMinutes(p: PlayTime, minutes: number): boolean {
  const m = cleanMinutes(minutes);
  if (!m) return false;
  p.on = true;
  p.leftMs = m * 60000;
  return true;
}

/** Add minutes to what is left (turns the timer on). */
export function addMinutes(p: PlayTime, minutes: number): boolean {
  const m = cleanMinutes(minutes);
  if (!m) return false;
  p.on = true;
  p.leftMs = Math.min(MAX_MINUTES * 60000, p.leftMs + m * 60000);
  return true;
}

/** No limit any more. */
export function turnOff(p: PlayTime): void {
  p.on = false;
  p.leftMs = 0;
}

/** The timer is on and the time is used up: no games until more time is added. */
export const isLocked = (p: PlayTime) => p.on && p.leftMs <= 0;

/** Count down while playing. Returns true when time just ran out. */
export function spend(p: PlayTime, ms: number): boolean {
  if (!p.on || p.leftMs <= 0) return false;
  p.leftMs = Math.max(0, p.leftMs - Math.max(0, ms));
  return p.leftMs === 0;
}

/** "12:05" (minutes:seconds), or "1:02:05" past an hour. */
export function clockText(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
