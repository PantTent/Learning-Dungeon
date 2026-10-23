// Catches crashes and freezes, keeps the game running, and lets a grown-up
// send a report. Built from plain HTML so it still works if the game screen
// is broken.
import Phaser from 'phaser';
import { tr } from '../i18n';
import { clearErrors, crumb, loadErrors, recordError, reportText } from '../util/errorLog';

const CSS = `
.ld-err { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.78); display: flex; align-items: center; justify-content: center;
  font-family: "Trebuchet MS", "Segoe UI", Roboto, Verdana, sans-serif; color: #f2ecff; -webkit-user-select: text; user-select: text; touch-action: auto; }
.ld-err .box { width: min(720px, 94vw); max-height: 94vh; overflow: auto; background: #1d1730; border: 3px solid #ff9a5a; border-radius: 14px; padding: 16px 20px; box-sizing: border-box; }
.ld-err h2 { margin: 0 0 6px; color: #ffd24a; font-size: 24px; text-align: center; }
.ld-err p { margin: 6px 0; color: #c9bde6; font-size: 16px; }
.ld-err textarea { width: 100%; box-sizing: border-box; border-radius: 8px; border: 2px solid #5b4a82; background: #0f0b1a; color: #f2ecff; font: 13px monospace; padding: 8px; resize: vertical; }
.ld-err .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; align-items: center; justify-content: center; }
.ld-err button { font: inherit; font-size: 17px; color: #fff; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; background: #4b3a78; }
.ld-err button.go { background: #2f9a4a; } .ld-err button.warn { background: #b07a10; } .ld-err button.quiet { background: #3a3450; }
.ld-err .msg { font-size: 15px; min-height: 20px; text-align: center; color: #5ef07a; }
`;

function el<T extends HTMLElement = HTMLElement>(tag: string, props: Record<string, unknown> = {}, ...kids: (Node | string)[]): T {
  const e = Object.assign(document.createElement(tag), props) as T;
  e.append(...kids);
  return e;
}

function button(text: string, cls: string, fn: () => void): HTMLButtonElement {
  const b = el<HTMLButtonElement>('button', { className: cls, textContent: text });
  b.onclick = fn;
  return b;
}

let open: HTMLElement | null = null;

function show(box: HTMLElement): void {
  if (!document.getElementById('ld-err-css')) document.head.append(el('style', { id: 'ld-err-css', textContent: CSS }));
  open?.remove();
  const root = el('div', { className: 'ld-err' }, box);
  for (const ev of ['pointerdown', 'pointerup', 'keydown', 'touchstart'] as const) root.addEventListener(ev, (e) => e.stopPropagation());
  document.body.append(root);
  open = root;
}

function close(): void {
  open?.remove();
  open = null;
}

/** Leave whatever broke and go back to the game picker (or reload if that fails too). */
function backToGames(game: Phaser.Game): void {
  close();
  try {
    for (const s of game.scene.getScenes(true)) s.scene.stop();
    game.scene.start('Hub');
  } catch {
    location.reload();
  }
}

/** The report window: a note box, the report text, and ways to send it. */
export function openReportPanel(onClose?: () => void): void {
  const note = el<HTMLTextAreaElement>('textarea', { rows: 2, placeholder: tr('What happened? (for example: it froze when I opened a chest)') });
  const out = el<HTMLTextAreaElement>('textarea', { rows: 7, readOnly: true });
  const msg = el('div', { className: 'msg' });
  const text = () => reportText(loadErrors(), note.value, navigator.userAgent);
  const refresh = () => (out.value = text());
  note.oninput = refresh;
  refresh();
  const done = () => {
    close();
    onClose?.();
  };
  const share = button(tr('Share'), 'go', async () => {
    try {
      await navigator.share({ title: 'Learning Dungeon problem report', text: text() });
    } catch {
      /* cancelled */
    }
  });
  const email = button(tr('Email'), 'go', () => {
    const body = encodeURIComponent(text().slice(0, 1800));
    // Opens the device's email app; the grown-up picks who to send it to.
    location.href = `mailto:?subject=${encodeURIComponent('Learning Dungeon problem report')}&body=${body}`;
  });
  const copy = button(tr('Copy'), 'quiet', async () => {
    out.select();
    let ok = false;
    try {
      await navigator.clipboard.writeText(text());
      ok = true;
    } catch {
      ok = document.execCommand?.('copy') ?? false;
    }
    msg.textContent = ok ? tr('Copied! Paste it into a message or an email.') : tr('Select the text above and copy it.');
  });
  const clear = button(tr('Clear the log'), 'quiet', () => {
    clearErrors();
    refresh();
    msg.textContent = tr('The log is empty now.');
  });
  const row = el('div', { className: 'row' });
  if (typeof navigator.share === 'function') row.append(share);
  row.append(email, copy);
  show(
    el(
      'div',
      { className: 'box' },
      el('h2', { textContent: tr('Report a problem') }),
      el('p', { textContent: tr('This report says what went wrong in the game. Send it to the person who made the game so it can be fixed. It has no names or saves in it.') }),
      note,
      out,
      row,
      msg,
      el('div', { className: 'row' }, clear, button(tr('Close'), 'quiet', done)),
    ),
  );
}

/** "Oops!" window shown after a crash or a freeze. */
function oops(game: Phaser.Game, freeze: boolean): void {
  if (open) return;
  show(
    el(
      'div',
      { className: 'box' },
      el('h2', { textContent: tr('Oops! Something went wrong.') }),
      el('p', { textContent: freeze ? tr('The game stopped for a moment.') : tr('The game hit a problem. Your progress is saved.') }),
      el(
        'div',
        { className: 'row' },
        button(tr('Back to the games'), 'go', () => backToGames(game)),
        button(tr('Keep playing'), 'quiet', close),
        button(tr('Send a report'), 'warn', () => openReportPanel()),
      ),
    ),
  );
}

const sceneKeys = (game: Phaser.Game) => {
  try {
    return game.scene.getScenes(true).map((s) => s.scene.key);
  } catch {
    return [];
  }
};

/**
 * Must run before the game is created: wraps each game frame so one error
 * does not stop the whole game (that is what made it freeze), saves the
 * error, and shows the "Oops!" window.
 */
export function installErrorCatcher(): (game: Phaser.Game) => void {
  let theGame: Phaser.Game | undefined;
  const handle = (err: unknown, kind: 'error' | 'freeze' = 'error') => {
    const e = err instanceof Error ? err : new Error(String(err));
    const entry = recordError(kind, e.message || String(err), e.stack, theGame ? sceneKeys(theGame) : []);
    console.error(err);
    if (entry && theGame) oops(theGame, kind === 'freeze');
  };
  const proto = Phaser.Game.prototype as unknown as { step: (time: number, delta: number) => void };
  const step = proto.step;
  proto.step = function (this: Phaser.Game, time: number, delta: number) {
    try {
      step.call(this, time, delta);
    } catch (err) {
      handle(err);
    }
  };
  window.addEventListener('error', (ev) => {
    if (ev.error || ev.message) handle(ev.error ?? ev.message);
  });
  window.addEventListener('unhandledrejection', (ev) => handle(ev.reason));

  return (game: Phaser.Game) => {
    theGame = game;
    // Note each screen that opens, for the report.
    game.events.once(Phaser.Core.Events.READY, () => {
      for (const s of game.scene.scenes) s.events.on(Phaser.Scenes.Events.CREATE, () => crumb(`open ${s.scene.key}`));
    });
    // Freeze check: the game draws about 60 frames a second. If no frame is
    // drawn for 8 seconds while the screen is showing, save a "freeze".
    let lastFrame = game.loop.frame;
    let lastChange = Date.now();
    setInterval(() => {
      if (document.visibilityState !== 'visible') {
        lastChange = Date.now();
        return;
      }
      if (game.loop.frame !== lastFrame) {
        lastFrame = game.loop.frame;
        lastChange = Date.now();
      } else if (Date.now() - lastChange > 8000) {
        lastChange = Date.now();
        handle(new Error('The game stopped drawing for 8 seconds'), 'freeze');
      }
    }, 2000);
  };
}
