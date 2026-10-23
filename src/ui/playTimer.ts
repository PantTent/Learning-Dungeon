// The play timer while a game is open: a small clock in the corner, a
// heads-up at 5 minutes and 1 minute, and when time is up the game is saved
// and the player goes back to the game picker. Plain HTML on top of the game,
// so it looks the same in every game.
import Phaser from 'phaser';
import { saveAnimals, type AnimalSave } from '../animal/state';
import { saveFarm, type FarmSave } from '../farm/state';
import { tr } from '../i18n';
import { saveSpace, type SpaceSave } from '../space/state';
import { current, saveProfile } from '../state/profile';
import { clockText, isLocked, loadPlayTime, savePlayTime, spend } from '../util/playtime';
import { W } from './widgets';

/** Screens that are not a game: the clock does not run there. */
const MENUS = new Set(['Boot', 'Hub', 'Parent']);

/** Make sure the open game's latest state is saved before leaving it. */
function saveScene(scene: Phaser.Scene): void {
  const key = scene.scene.key;
  const any = scene as unknown as { f?: FarmSave; s?: SpaceSave & AnimalSave };
  try {
    if (key.startsWith('Farm') && any.f) saveFarm(any.f);
    else if (key.startsWith('Space') && any.s) saveSpace(any.s);
    else if (key.startsWith('Animal') && any.s) saveAnimals(any.s);
    else if (!key.startsWith('Farm') && !key.startsWith('Space') && !key.startsWith('Animal')) saveProfile(current());
  } catch {
    /* nothing to save on this screen */
  }
}

function games(game: Phaser.Game): Phaser.Scene[] {
  return game.scene.getScenes(true).filter((s) => !MENUS.has(s.scene.key));
}

/** Send every open game back to the game picker (saved first). */
export function leaveToHub(game: Phaser.Game, data: object = {}): void {
  const open = games(game);
  if (!open.length) return;
  for (const s of open) saveScene(s);
  open.slice(1).forEach((s) => s.scene.stop());
  open[0].scene.start('Hub', data);
}

export function installPlayTimer(game: Phaser.Game): void {
  const pill = document.createElement('div');
  Object.assign(pill.style, {
    position: 'fixed', zIndex: '40', pointerEvents: 'none', display: 'none', fontFamily: '"Trebuchet MS", "Segoe UI", Roboto, Verdana, sans-serif',
    color: '#fff', background: 'rgba(29,23,48,.82)', border: '2px solid #7fd3ff', borderRadius: '999px', padding: '0 .6em', lineHeight: '1.5',
    whiteSpace: 'nowrap',
  });
  const note = document.createElement('div');
  Object.assign(note.style, {
    position: 'fixed', zIndex: '41', pointerEvents: 'none', display: 'none', fontFamily: pill.style.fontFamily, color: '#ffd24a',
    background: 'rgba(29,23,48,.92)', border: '3px solid #ffd24a', borderRadius: '14px', padding: '.3em .9em', textAlign: 'center',
    transform: 'translateX(-50%)',
  });
  document.body.append(pill, note);

  let last = Date.now();
  let noteUntil = 0;
  let warned = new Set<number>();

  const place = () => {
    const r = game.canvas.getBoundingClientRect();
    const k = r.width / W;
    pill.style.fontSize = `${Math.max(11, 15 * k)}px`;
    pill.style.right = `${window.innerWidth - r.right + 10 * k}px`;
    pill.style.bottom = `${window.innerHeight - r.bottom + 44 * k}px`;
    note.style.fontSize = `${Math.max(14, 24 * k)}px`;
    note.style.left = `${r.left + r.width / 2}px`;
    note.style.top = `${r.top + 70 * k}px`;
  };
  const say = (msg: string) => {
    note.textContent = msg;
    note.style.display = 'block';
    noteUntil = Date.now() + 4000;
  };

  const tick = () => {
    const now = Date.now();
    // Asleep or in the background: that time does not count.
    const dt = document.hidden ? 0 : Math.min(5000, now - last);
    last = now;
    const p = loadPlayTime();
    const playing = games(game).length > 0;
    if (noteUntil && now > noteUntil) {
      note.style.display = 'none';
      noteUntil = 0;
    }
    if (!p.on || !playing) {
      pill.style.display = 'none';
      if (!p.on) warned = new Set();
      return;
    }
    if (isLocked(p)) {
      pill.style.display = 'none';
      leaveToHub(game, { timeUp: true });
      return;
    }
    // Saved every second, so closing the app never gives time back.
    const over = spend(p, dt);
    savePlayTime(p);
    if (over) {
      pill.style.display = 'none';
      note.style.display = 'none';
      leaveToHub(game, { timeUp: true });
      return;
    }
    // Heads-up before the end.
    for (const min of [5, 1]) {
      if (p.leftMs <= min * 60000 && p.leftMs > (min - 0.5) * 60000 && !warned.has(min)) {
        warned.add(min);
        say(min === 1 ? tr('1 minute of play time left!') : tr('{n} minutes of play time left!', { n: min }));
      }
    }
    if (p.leftMs > 5 * 60000) warned = new Set();
    const lastMinute = p.leftMs <= 60000;
    pill.textContent = `⏱ ${clockText(p.leftMs)}`;
    pill.style.borderColor = lastMinute ? '#ff6a6a' : p.leftMs <= 5 * 60000 ? '#ffd24a' : '#7fd3ff';
    pill.style.color = lastMinute ? '#ffb0b0' : '#fff';
    pill.style.display = 'block';
    place();
  };
  setInterval(tick, 1000);
  window.addEventListener('resize', place);
  // Leaving the app saves the time used so far.
  document.addEventListener('visibilitychange', () => {
    last = Date.now();
  });
}
