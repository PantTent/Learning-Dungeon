// Big friendly on-screen keyboard (hero names, secret codes). Works on every
// device, and a real keyboard can type too.
import Phaser from 'phaser';
import { getLang, tr } from '../i18n';
import { button, panel, txt, W } from './widgets';

/** Big friendly on-screen keyboard (hero name or secret code). */
export function openKeyboard(
  scene: Phaser.Scene,
  title: string,
  initial: string,
  nameCase: boolean,
  onDone: (value: string) => void,
  randomNames: string[] = [],
  opts: { maxLen?: number; accents?: boolean } = {},
) {
  const maxLen = opts.maxLen ?? 12;
  const c = scene.add.container(0, 0).setDepth(500);
  c.add(scene.add.rectangle(0, 0, W, 540, 0x000000, 0.75).setOrigin(0).setInteractive());
  c.add(panel(scene, 40, 20, W - 80, 500, 0x1d1730, 0x7fd3ff));
  c.add(txt(scene, W / 2, 50, title, 26, '#ffd24a').setOrigin(0.5));
  const g = scene.add.graphics();
  g.fillStyle(0x0f0b1a, 1).fillRoundedRect(W / 2 - 200, 78, 400, 58, 10);
  g.lineStyle(3, 0x7fd3ff, 1).strokeRoundedRect(W / 2 - 200, 78, 400, 58, 10);
  c.add(g);
  const shown = txt(scene, W / 2, 107, '', 32).setOrigin(0.5);
  c.add(shown);
  let name = initial;
  const refresh = () => shown.setText(name.length ? name : ' ');
  refresh();
  const type = (k: string) => {
    if (k === 'DEL') name = name.slice(0, -1);
    else if (k === 'SPACE') {
      if (name.length && name.length < maxLen && !name.endsWith(' ')) name += ' ';
    } else if (name.length < maxLen) name += nameCase && (name.length === 0 || name.endsWith(' ')) ? k.toUpperCase() : k.toLowerCase();
    refresh();
  };
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  // French names often have accents (Léa, Zoé, François).
  if ((nameCase || opts.accents) && getLang() === 'fr') rows.push('ÉÈÊËÀÂÇÏÎÔ');
  const kw = 70;
  const kh = 60;
  rows.forEach((row, r) => {
    const x0 = W / 2 - (row.length * (kw + 8)) / 2 + kw / 2;
    [...row].forEach((ch, i) => c.add(button(scene, x0 + i * (kw + 8), 182 + r * (kh + 10), kw, kh, ch, () => type(ch), { size: 26 })));
  });
  c.add(button(scene, W / 2 + 4 * 78 + 30, 182 + 2 * 70, 116, kh, tr('Delete'), () => type('DEL'), { size: 20, color: 0x8a3a3a }));
  c.add(button(scene, W / 2 - 4 * 78 - 30, 182 + 2 * 70, 116, kh, tr('Space'), () => type('SPACE'), { size: 20, color: 0x3a3450 }));
  if (nameCase && randomNames.length) {
    c.add(button(scene, W / 2 - 180, 460, 200, 60, tr('Random name'), () => {
      name = randomNames[Math.floor(Math.random() * randomNames.length)];
      refresh();
    }, { size: 20, color: 0x2e5a7a }));
  }
  const onKey = (e: KeyboardEvent) => {
    if (/^\p{L}$/u.test(e.key)) type(e.key);
    else if (e.key === 'Backspace') type('DEL');
    else if (e.key === ' ') type('SPACE');
    else if (e.key === 'Enter') done();
  };
  const done = () => {
    scene.input.keyboard?.off('keydown', onKey);
    c.destroy();
    onDone(name);
  };
  scene.input.keyboard?.on('keydown', onKey);
  c.add(button(scene, W / 2 + 140, 460, 220, 60, tr('Done'), done, { size: 24, color: 0x2f9a4a }));
}
