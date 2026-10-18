// "Move my save" window. Built from plain HTML (not the game canvas) so the
// code can be copied and pasted with the device's normal text box.
import { tr } from '../i18n';
import { applySave, decodeSave, describeSave, exportSave } from '../state/transfer';

const CSS = `
.ld-move { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,.78); display: flex; align-items: center; justify-content: center;
  font-family: "Trebuchet MS", "Segoe UI", Roboto, Verdana, sans-serif; color: #f2ecff; -webkit-user-select: text; user-select: text; touch-action: auto; }
.ld-move .box { width: min(760px, 94vw); max-height: 94vh; overflow: auto; background: #1d1730; border: 3px solid #b98aff; border-radius: 14px; padding: 16px 20px; box-sizing: border-box; }
.ld-move h2 { margin: 0 0 4px; color: #ffd24a; font-size: 24px; text-align: center; }
.ld-move h3 { margin: 14px 0 6px; color: #7fd3ff; font-size: 18px; }
.ld-move p { margin: 4px 0; color: #a99cc8; font-size: 15px; }
.ld-move textarea { width: 100%; height: 70px; box-sizing: border-box; border-radius: 8px; border: 2px solid #5b4a82; background: #0f0b1a; color: #f2ecff;
  font: 13px monospace; padding: 8px; resize: none; word-break: break-all; }
.ld-move .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; align-items: center; }
.ld-move button { font: inherit; font-size: 17px; color: #fff; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; background: #4b3a78; }
.ld-move button.go { background: #2f9a4a; } .ld-move button.warn { background: #b07a10; } .ld-move button.quiet { background: #3a3450; }
.ld-move .msg { font-size: 15px; min-height: 20px; } .ld-move .good { color: #5ef07a; } .ld-move .bad { color: #ff6b6b; }
`;

function el<T extends HTMLElement = HTMLElement>(tag: string, props: Record<string, unknown> = {}, ...kids: (Node | string)[]): T {
  const e = Object.assign(document.createElement(tag), props) as T;
  e.append(...kids);
  return e;
}

export function openTransferPanel(onClose?: () => void): void {
  if (!document.getElementById('ld-move-css')) document.head.append(el('style', { id: 'ld-move-css', textContent: CSS }));
  const close = () => {
    root.remove();
    onClose?.();
  };

  // --- send: make a code from this device's saves
  const out = el<HTMLTextAreaElement>('textarea', { readOnly: true, placeholder: tr('Your save code will appear here.') });
  const outMsg = el('div', { className: 'msg' });
  const copyBtn = el('button', { className: 'go', textContent: tr('Make my save code') });
  copyBtn.onclick = async () => {
    try {
      out.value = await exportSave();
      out.select();
      let copied = false;
      try {
        await navigator.clipboard.writeText(out.value);
        copied = true;
      } catch {
        copied = document.execCommand?.('copy') ?? false;
      }
      outMsg.className = 'msg good';
      outMsg.textContent = copied
        ? tr('Copied! Now open the game on the other device (or the app) and paste it there.')
        : tr('Select the code above and copy it, then paste it on the other device.');
    } catch {
      outMsg.className = 'msg bad';
      outMsg.textContent = tr('Something went wrong making the code.');
    }
  };

  // --- receive: paste a code to load its saves here
  const input = el<HTMLTextAreaElement>('textarea', { placeholder: tr('Paste a save code here') });
  const inMsg = el('div', { className: 'msg' });
  const pasteBtn = el('button', { className: 'quiet', textContent: tr('Paste') });
  pasteBtn.onclick = async () => {
    try {
      input.value = await navigator.clipboard.readText();
    } catch {
      input.focus();
      inMsg.className = 'msg';
      inMsg.textContent = tr('Press and hold in the box, then choose Paste.');
    }
  };
  const loadBtn = el('button', { className: 'warn', textContent: tr('Load this save') });
  const confirmRow = el('div', { className: 'row' });
  loadBtn.onclick = async () => {
    confirmRow.replaceChildren();
    try {
      const values = await decodeSave(input.value);
      const { heroes, farm } = describeSave(values);
      const parts = [heroes.length ? tr('Heroes: {list}', { list: heroes.join(', ') }) : tr('No heroes'), farm ? tr('Farm: {name}', { name: farm }) : ''].filter(Boolean);
      inMsg.className = 'msg';
      inMsg.textContent = `${parts.join('  ·  ')}. ${tr('This replaces the heroes and farm on this device.')}`;
      const yes = el('button', { className: 'go', textContent: tr('Yes, load it') });
      yes.onclick = () => {
        applySave(values);
        inMsg.className = 'msg good';
        inMsg.textContent = tr('Loaded! Starting the game again...');
        setTimeout(() => location.reload(), 700);
      };
      const no = el('button', { className: 'quiet', textContent: tr('Cancel') });
      no.onclick = () => {
        confirmRow.replaceChildren();
        inMsg.textContent = '';
      };
      confirmRow.append(yes, no);
    } catch {
      inMsg.className = 'msg bad';
      inMsg.textContent = tr('That is not a save code. Copy the whole code and try again.');
    }
  };

  const closeBtn = el('button', { className: 'quiet', textContent: tr('Close') });
  closeBtn.onclick = close;
  const box = el(
    'div',
    { className: 'box' },
    el('h2', { textContent: tr('Move my save') }),
    el('p', { textContent: tr('Moves heroes, the farm and unlocked games between devices, or between the website and the app.') }),
    el('h3', { textContent: tr('1. On the device that has the save') }),
    out,
    el('div', { className: 'row' }, copyBtn),
    outMsg,
    el('h3', { textContent: tr('2. On the device that should get it') }),
    input,
    el('div', { className: 'row' }, pasteBtn, loadBtn),
    inMsg,
    confirmRow,
    el('div', { className: 'row' }, closeBtn),
  );
  const root = el('div', { className: 'ld-move' }, box);
  // Keep taps and keys inside the window (away from the game underneath).
  for (const ev of ['pointerdown', 'pointerup', 'keydown', 'touchstart'] as const) root.addEventListener(ev, (e) => e.stopPropagation());
  document.body.append(root);
}
