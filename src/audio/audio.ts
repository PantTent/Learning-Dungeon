// All game audio is synthesized with the Web Audio API: retro sound effects
// and little chiptune songs. No audio files to download or license.

type Wave = OscillatorType;

let ctx: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let meter: AnalyserNode;

export type SoundMode = 'all' | 'sfx' | 'off';
const PREF_KEY = 'learning-dungeon.sound';

function loadMode(): SoundMode {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === 'all' || v === 'sfx' || v === 'off') return v;
  } catch {
    /* storage blocked */
  }
  return 'all';
}

let mode: SoundMode = loadMode();

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  meter = ctx.createAnalyser();
  meter.fftSize = 2048;
  master.connect(meter).connect(ctx.destination);
  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus.connect(master);
  sfxBus.connect(master);
  applyMode();
  return ctx;
}

function applyMode() {
  if (!ctx) return;
  musicBus.gain.value = mode === 'all' ? 0.55 : 0;
  sfxBus.gain.value = mode === 'off' ? 0 : 0.9;
}

/** Browsers only allow sound after a tap; call this from the first tap. */
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
  if (pendingSong && !current) playMusic(pendingSong);
}

/** How loud the game is right now (0 = silent). Used by automated tests. */
export function audioLevel(): number {
  if (!ctx || !meter) return 0;
  const buf = new Float32Array(meter.fftSize);
  meter.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += v * v;
  return Math.sqrt(sum / buf.length);
}

export function getSoundMode(): SoundMode {
  return mode;
}

/** All on -> music off -> everything off -> all on. */
export function cycleSoundMode(): SoundMode {
  mode = mode === 'all' ? 'sfx' : mode === 'sfx' ? 'off' : 'all';
  try {
    localStorage.setItem(PREF_KEY, mode);
  } catch {
    /* ignore */
  }
  applyMode();
  return mode;
}

export function soundModeLabel(m: SoundMode = mode): string {
  return m === 'all' ? 'Sound: ON' : m === 'sfx' ? 'Music: OFF' : 'Sound: OFF';
}

// ------------------------------------------------------------------ synth helpers

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** "A4" -> 440 Hz. Flats are written as sharps (Bb = A#). */
export function freq(note: string): number {
  const m = note.match(/^([A-G]#?)(\d)$/);
  if (!m) return 440;
  const semis = NOTE_INDEX[m[1]] + (Number(m[2]) + 1) * 12;
  return 440 * 2 ** ((semis - 69) / 12);
}

interface ToneOpts {
  type?: Wave;
  vol?: number;
  attack?: number;
  release?: number;
  slideTo?: number;
  vibrato?: number;
  bus?: GainNode;
}

function tone(f: number, start: number, dur: number, o: ToneOpts = {}) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(f, start);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), start + dur);
  if (o.vibrato) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 7;
    lg.gain.value = o.vibrato;
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(start);
    lfo.stop(start + dur + 0.1);
  }
  const vol = o.vol ?? 0.2;
  const a = o.attack ?? 0.005;
  const r = o.release ?? Math.min(0.08, dur / 2);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + a);
  g.gain.setValueAtTime(vol, Math.max(start + a, start + dur - r));
  g.gain.linearRampToValueAtTime(0, start + dur);
  osc.connect(g).connect(o.bus ?? sfxBus);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

let noiseBuf: AudioBuffer | null = null;
function noise(start: number, dur: number, o: { vol?: number; filter?: number; filterTo?: number; type?: BiquadFilterType; bus?: GainNode } = {}) {
  if (!ctx) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? 'lowpass';
  f.frequency.setValueAtTime(o.filter ?? 2000, start);
  if (o.filterTo) f.frequency.exponentialRampToValueAtTime(o.filterTo, start + dur);
  const g = ctx.createGain();
  const vol = o.vol ?? 0.3;
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.connect(f).connect(g).connect(o.bus ?? sfxBus);
  src.start(start, Math.random() * 0.5);
  src.stop(start + dur + 0.02);
}

function arp(notes: string[], start: number, step: number, o: ToneOpts = {}) {
  notes.forEach((n, i) => tone(freq(n), start + i * step, step * 1.6, o));
}

// ------------------------------------------------------------------ sound effects

export type Sfx =
  | 'click' | 'correct' | 'wrong' | 'slash' | 'arrow' | 'fire' | 'frost' | 'arcane' | 'holy'
  | 'shadow' | 'nature' | 'fel' | 'hit' | 'crit' | 'hurt' | 'die' | 'heal' | 'summon'
  | 'levelup' | 'victory' | 'defeat' | 'coin' | 'chest' | 'equip' | 'encounter' | 'stairs'
  | 'roar' | 'potion' | 'teacher' | 'power' | 'boom' | 'ready' | 'lightning';

export function sfx(name: Sfx) {
  const c = ensure();
  if (!c || mode === 'off') return;
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime + 0.01;
  switch (name) {
    case 'click':
      tone(1200, t, 0.04, { type: 'square', vol: 0.06 });
      break;
    case 'correct':
      arp(['C5', 'E5', 'G5', 'C6'], t, 0.07, { type: 'triangle', vol: 0.22 });
      tone(freq('C6'), t + 0.28, 0.25, { type: 'square', vol: 0.06 });
      break;
    case 'wrong':
      // Gentle "uh-oh", not a harsh buzzer.
      tone(freq('E4'), t, 0.16, { type: 'triangle', vol: 0.22 });
      tone(freq('C4'), t + 0.17, 0.28, { type: 'triangle', vol: 0.22 });
      break;
    case 'slash':
      noise(t, 0.16, { filter: 6000, filterTo: 800, type: 'bandpass', vol: 0.5 });
      tone(500, t, 0.1, { type: 'sawtooth', vol: 0.05, slideTo: 150 });
      break;
    case 'arrow':
      tone(2200, t, 0.12, { type: 'triangle', vol: 0.12, slideTo: 600 });
      noise(t, 0.08, { filter: 8000, type: 'highpass', vol: 0.15 });
      break;
    case 'fire':
      noise(t, 0.45, { filter: 600, filterTo: 3000, vol: 0.35 });
      tone(180, t, 0.4, { type: 'sawtooth', vol: 0.06, slideTo: 90 });
      break;
    case 'frost':
      arp(['B6', 'F#6', 'D6', 'B5'], t, 0.04, { type: 'sine', vol: 0.12 });
      noise(t, 0.35, { filter: 9000, type: 'highpass', vol: 0.12 });
      break;
    case 'arcane':
      tone(300, t, 0.35, { type: 'sine', vol: 0.18, slideTo: 1200, vibrato: 30 });
      tone(600, t, 0.35, { type: 'triangle', vol: 0.06, slideTo: 2400 });
      break;
    case 'holy':
      arp(['C6', 'G6', 'E6', 'C7'], t, 0.05, { type: 'sine', vol: 0.14 });
      tone(freq('G5'), t, 0.4, { type: 'triangle', vol: 0.08 });
      break;
    case 'shadow':
      tone(220, t, 0.4, { type: 'sawtooth', vol: 0.08, slideTo: 70, vibrato: 12 });
      noise(t, 0.35, { filter: 400, vol: 0.2 });
      break;
    case 'nature':
      arp(['D5', 'F#5', 'A5'], t, 0.05, { type: 'triangle', vol: 0.12 });
      noise(t, 0.3, { filter: 1500, filterTo: 300, type: 'bandpass', vol: 0.2 });
      break;
    case 'fel':
      tone(140, t, 0.4, { type: 'square', vol: 0.08, slideTo: 420, vibrato: 20 });
      noise(t, 0.4, { filter: 900, filterTo: 2500, vol: 0.25 });
      break;
    case 'hit':
      noise(t, 0.12, { filter: 1800, filterTo: 300, vol: 0.45 });
      tone(160, t, 0.1, { type: 'square', vol: 0.12, slideTo: 60 });
      break;
    case 'crit':
      noise(t, 0.18, { filter: 3000, filterTo: 300, vol: 0.55 });
      tone(160, t, 0.12, { type: 'square', vol: 0.14, slideTo: 50 });
      tone(freq('A6'), t + 0.05, 0.18, { type: 'square', vol: 0.08 });
      tone(freq('E7'), t + 0.12, 0.2, { type: 'square', vol: 0.06 });
      break;
    case 'hurt':
      tone(220, t, 0.18, { type: 'square', vol: 0.12, slideTo: 90 });
      noise(t, 0.1, { filter: 1200, vol: 0.25 });
      break;
    case 'die':
      tone(600, t, 0.4, { type: 'square', vol: 0.1, slideTo: 80 });
      noise(t + 0.05, 0.3, { filter: 1500, filterTo: 200, vol: 0.2 });
      break;
    case 'heal':
    case 'potion':
      arp(['C5', 'E5', 'G5', 'B5', 'E6'], t, 0.06, { type: 'sine', vol: 0.15 });
      break;
    case 'summon':
      tone(120, t, 0.5, { type: 'sawtooth', vol: 0.08, slideTo: 600 });
      noise(t, 0.5, { filter: 300, filterTo: 4000, vol: 0.2 });
      break;
    case 'levelup': {
      const s = 0.09;
      arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], t, s, { type: 'square', vol: 0.09 });
      ['C5', 'E5', 'G5', 'C6'].forEach((n) => tone(freq(n), t + 6 * s, 0.7, { type: 'triangle', vol: 0.12 }));
      tone(freq('C6'), t + 6 * s, 0.7, { type: 'square', vol: 0.06, vibrato: 6 });
      break;
    }
    case 'victory': {
      const s = 0.12;
      const lead: [string, number][] = [['G5', 1], ['G5', 1], ['G5', 1], ['G5', 3], ['D#5', 3], ['F5', 3], ['G5', 2], ['F5', 1], ['G5', 6]];
      let at = t;
      for (const [n, len] of lead) {
        tone(freq(n), at, len * s * 0.95, { type: 'square', vol: 0.09 });
        at += len * s;
      }
      tone(freq('C4'), t, 9 * s, { type: 'triangle', vol: 0.16 });
      tone(freq('G3'), t + 9 * s, 12 * s, { type: 'triangle', vol: 0.16 });
      break;
    }
    case 'defeat':
      ['E4', 'D#4', 'D4', 'C#4'].forEach((n, i) => tone(freq(n), t + i * 0.28, 0.32, { type: 'triangle', vol: 0.16 }));
      break;
    case 'coin':
      tone(freq('B5'), t, 0.07, { type: 'square', vol: 0.08 });
      tone(freq('E6'), t + 0.07, 0.22, { type: 'square', vol: 0.08 });
      break;
    case 'chest':
      tone(200, t, 0.15, { type: 'triangle', vol: 0.15, slideTo: 120 });
      arp(['G5', 'C6', 'E6', 'G6', 'C7'], t + 0.12, 0.06, { type: 'square', vol: 0.07 });
      break;
    case 'equip':
      noise(t, 0.06, { filter: 5000, type: 'highpass', vol: 0.25 });
      tone(freq('A5'), t, 0.08, { type: 'square', vol: 0.06 });
      tone(freq('E6'), t + 0.06, 0.1, { type: 'square', vol: 0.06 });
      break;
    case 'encounter':
      arp(['C4', 'C5', 'C4', 'C5', 'G4', 'G5'], t, 0.045, { type: 'square', vol: 0.08 });
      noise(t, 0.3, { filter: 500, filterTo: 6000, vol: 0.15 });
      break;
    case 'stairs':
      ['G4', 'E4', 'C4', 'G3'].forEach((n, i) => tone(freq(n), t + i * 0.08, 0.12, { type: 'triangle', vol: 0.15 }));
      break;
    case 'roar':
      tone(90, t, 0.9, { type: 'sawtooth', vol: 0.16, slideTo: 60, vibrato: 18 });
      tone(135, t, 0.9, { type: 'square', vol: 0.06, slideTo: 80, vibrato: 25 });
      noise(t, 0.9, { filter: 700, filterTo: 200, vol: 0.3 });
      break;
    case 'power':
      // Rising charge-up whoosh.
      tone(110, t, 0.9, { type: 'sawtooth', vol: 0.08, slideTo: 880 });
      tone(220, t, 0.9, { type: 'square', vol: 0.04, slideTo: 1760, vibrato: 10 });
      noise(t, 0.9, { filter: 300, filterTo: 6000, vol: 0.2 });
      break;
    case 'boom':
      noise(t, 0.9, { filter: 2500, filterTo: 60, vol: 0.7 });
      tone(90, t, 0.7, { type: 'sine', vol: 0.4, slideTo: 30 });
      tone(180, t, 0.25, { type: 'square', vol: 0.12, slideTo: 50 });
      break;
    case 'ready':
      arp(['G5', 'C6', 'E6', 'G6', 'C7'], t, 0.05, { type: 'square', vol: 0.07 });
      tone(freq('C7'), t + 0.25, 0.3, { type: 'sine', vol: 0.12, vibrato: 8 });
      break;
    case 'lightning':
      // Crackle and zap.
      for (let i = 0; i < 5; i++) noise(t + i * 0.035, 0.05, { filter: 3000 + i * 800, type: 'highpass', vol: 0.35 });
      tone(1800, t, 0.25, { type: 'sawtooth', vol: 0.06, slideTo: 200 });
      break;
    case 'teacher':
      arp(['E5', 'G5', 'C6'], t, 0.08, { type: 'sine', vol: 0.14 });
      break;
  }
}

// ------------------------------------------------------------------ music

/**
 * A song is a few tracks of space-separated steps (eighth notes):
 * "C5" plays a note, "-" holds the previous note, "." is a rest.
 */
interface Track {
  wave: Wave;
  vol: number;
  steps: string;
}

interface Song {
  bpm: number;
  tracks: Track[];
}

const rep = (s: string, n: number) => Array(n).fill(s).join(' ');

export const SONGS: Record<string, Song> = {
  // Bright, heroic menu theme in C major.
  title: {
    bpm: 112,
    tracks: [
      {
        wave: 'square',
        vol: 0.07,
        steps: [
          'C5 - E5 - G5 - - . A5 - G5 - E5 - - .',
          'F5 - A5 - C6 - - . B5 - A5 - G5 - - .',
          'E5 - G5 - C6 - - . D6 - C6 - B5 - A5 -',
          'G5 - - - E5 - D5 - C5 - - - - - . .',
        ].join(' '),
      },
      {
        wave: 'triangle',
        vol: 0.16,
        steps: [rep('C3 . G3 .', 4), rep('F3 . C4 .', 4), rep('A2 . E3 .', 4), 'G2 . D3 . G2 . D3 . C3 . G3 . C3 . G3 .'].join(' '),
      },
      {
        wave: 'square',
        vol: 0.025,
        steps: [rep('E4 G4 C5 G4', 4), rep('F4 A4 C5 A4', 4), rep('E4 A4 C5 A4', 4), rep('D4 G4 B4 G4', 2) + ' ' + rep('E4 G4 C5 G4', 2)].join(' '),
      },
    ],
  },
  // Mysterious, calm cave music in A minor.
  dungeon: {
    bpm: 84,
    tracks: [
      {
        wave: 'triangle',
        vol: 0.13,
        steps: [
          'A4 - - - C5 - B5 - A5 - - - E5 - - -',
          'F5 - - - E5 - D5 - E5 - - - - - . .',
          'A4 - - - C5 - E5 - G5 - - - F5 - E5 -',
          'D5 - - - B4 - G4 - A4 - - - - - . .',
        ].join(' '),
      },
      {
        wave: 'triangle',
        vol: 0.15,
        steps: [rep('A2 - - - E3 - - -', 2), rep('F2 - - - C3 - - -', 2), rep('A2 - - - E3 - - -', 2), rep('G2 - - - D3 - - -', 1), 'E2 - - - E3 - - -'].join(' '),
      },
      {
        wave: 'square',
        vol: 0.018,
        steps: [rep('. A5 . E5', 4), rep('. A5 . F5', 4), rep('. C6 . E5', 4), rep('. B5 . G5', 2) + ' ' + rep('. B5 . E5', 2)].join(' '),
      },
    ],
  },
  // Cheerful, flute-like forest music in G major.
  forest: {
    bpm: 100,
    tracks: [
      {
        wave: 'triangle',
        vol: 0.15,
        steps: [
          'G5 - B5 - D6 - B5 - A5 - G5 - E5 - - -',
          'D5 - E5 - G5 - - - A5 - B5 - A5 - - -',
          'G5 - B5 - D6 - E6 - D6 - B5 - G5 - A5 -',
          'B5 - A5 - G5 - E5 - G5 - - - - - . .',
        ].join(' '),
      },
      {
        wave: 'triangle',
        vol: 0.15,
        steps: [rep('G2 . D3 .', 4), rep('C3 . G3 .', 4), rep('E2 . B2 .', 4), 'D2 . A2 . D2 . A2 . G2 . D3 . G2 . D3 .'].join(' '),
      },
      {
        wave: 'square',
        vol: 0.02,
        steps: [rep('B4 D5 G5 D5', 4), rep('C5 E5 G5 E5', 4), rep('B4 E5 G5 E5', 4), rep('A4 D5 F#5 D5', 2) + ' ' + rep('B4 D5 G5 D5', 2)].join(' '),
      },
    ],
  },
  // Fast, exciting battle music in E minor.
  battle: {
    bpm: 150,
    tracks: [
      {
        wave: 'square',
        vol: 0.07,
        steps: [
          'E5 - - E5 G5 - A5 - B5 - - - A5 - G5 -',
          'F#5 - - F#5 A5 - B5 - C6 - B5 - A5 - F#5 -',
          'E5 - - E5 G5 - A5 - B5 - - - D6 - C6 -',
          'B5 - A5 - G5 - F#5 - E5 - - - - - . .',
        ].join(' '),
      },
      {
        wave: 'triangle',
        vol: 0.18,
        steps: [rep('E2 E3 E2 E3', 4), rep('D2 D3 D2 D3', 4), rep('C2 C3 C2 C3', 4), rep('B1 B2 B1 B2', 4)].join(' '),
      },
      {
        wave: 'square',
        vol: 0.025,
        steps: [rep('B4 E5 G5 E5', 4), rep('A4 D5 F#5 D5', 4), rep('G4 C5 E5 C5', 4), rep('F#4 B4 D#5 B4', 4)].join(' '),
      },
    ],
  },
  // Big, serious boss music in D minor.
  boss: {
    bpm: 160,
    tracks: [
      {
        wave: 'sawtooth',
        vol: 0.05,
        steps: [
          'D5 - D5 - F5 - D5 - G5 - F5 - E5 - C5 -',
          'D5 - D5 - F5 - A5 - G#5 - - - A5 - - -',
          'A#5 - A5 - G5 - F5 - G5 - F5 - E5 - D5 -',
          'C#5 - D5 - E5 - C#5 - A4 - - - - - . .',
        ].join(' '),
      },
      {
        wave: 'triangle',
        vol: 0.2,
        steps: [rep('D2 D2 D3 D2', 4), rep('D2 D2 D3 D2', 2) + ' ' + rep('E2 E2 E3 E2', 2), rep('A#1 A#1 A#2 A#1', 4), rep('A1 A1 A2 A1', 4)].join(' '),
      },
      {
        wave: 'square',
        vol: 0.02,
        steps: [rep('A4 D5 F5 D5', 4), rep('A4 D5 F5 D5', 2) + ' ' + rep('B4 E5 G#5 E5', 2), rep('A#4 D5 F5 D5', 4), rep('A4 C#5 E5 C#5', 4)].join(' '),
      },
    ],
  },
};

interface ParsedNote {
  step: number;
  len: number;
  f: number;
}

export function parseTrack(steps: string): { notes: ParsedNote[]; length: number } {
  const tokens = steps.trim().split(/\s+/);
  const notes: ParsedNote[] = [];
  tokens.forEach((tok, i) => {
    if (tok === '-' && notes.length && notes[notes.length - 1].step + notes[notes.length - 1].len === i) {
      notes[notes.length - 1].len++;
    } else if (tok !== '.' && tok !== '-') {
      notes.push({ step: i, len: 1, f: freq(tok) });
    }
  });
  return { notes, length: tokens.length };
}

let current: string | null = null;
let pendingSong: string | null = null;
let timer: number | null = null;
let songGain: GainNode | null = null;

/** Start a looping song (no-op if it's already playing). */
export function playMusic(name: keyof typeof SONGS | string) {
  pendingSong = name;
  if (current === name) return;
  stopMusic();
  const c = ensure();
  if (!c || c.state !== 'running') return; // starts on the first tap via unlockAudio()
  const song = SONGS[name];
  if (!song) return;
  current = name;
  const bus = c.createGain();
  bus.connect(musicBus);
  songGain = bus;
  const stepDur = 60 / song.bpm / 2;
  const parsed = song.tracks.map((t) => ({ t, ...parseTrack(t.steps) }));
  const loopSteps = Math.max(...parsed.map((p) => p.length));
  let loopStart = c.currentTime + 0.1;
  let scheduledUntil = loopStart;
  const schedule = () => {
    if (!ctx) return;
    // Keep about half a second of notes queued up.
    while (scheduledUntil < ctx.currentTime + 0.5) {
      const from = Math.round((scheduledUntil - loopStart) / stepDur);
      const to = from + 4;
      for (const p of parsed) {
        for (const n of p.notes) {
          if (n.step >= from && n.step < to) {
            tone(n.f, loopStart + n.step * stepDur, n.len * stepDur * 0.92, { type: p.t.wave, vol: p.t.vol, bus, release: 0.04 });
          }
        }
      }
      scheduledUntil = loopStart + to * stepDur;
      if (to >= loopSteps) {
        loopStart += loopSteps * stepDur;
        scheduledUntil = loopStart;
      }
    }
  };
  schedule();
  timer = window.setInterval(schedule, 100);
}

export function stopMusic() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  current = null;
  // Quick fade so already-queued notes don't keep playing.
  if (songGain && ctx) {
    const g = songGain;
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    window.setTimeout(() => g.disconnect(), 400);
  }
  songGain = null;
}
