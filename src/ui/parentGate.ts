// "Grown-ups only" check before purchases and parent settings. The grown-up
// types their birth year; anyone under 18 (or a child guessing) is turned away.
import Phaser from 'phaser';
import { sfx } from '../audio/audio';
import { tr } from '../i18n';
import { isAdultBirthYear } from '../hub/gate';
import { C, H, W, button, panel, toast, txt } from './widgets';


export function parentGate(scene: Phaser.Scene, onPass: () => void, onCancel?: () => void): void {
  const c = scene.add.container(0, 0).setDepth(9000);
  c.add(scene.add.rectangle(0, 0, W, H, 0, 0.8).setOrigin(0).setInteractive());
  c.add(panel(scene, W / 2 - 330, 24, 660, H - 48, 0x1d1730, 0xffd24a));
  c.add(txt(scene, W / 2, 58, tr('Grown-ups only'), 30, '#ffd24a').setOrigin(0.5));
  c.add(txt(scene, W / 2, 96, tr('Please type the year you were born.'), 18, C.dim).setOrigin(0.5));

  let typed = '';
  const box = scene.add.graphics();
  box.fillStyle(0x0f0b1a, 1).fillRoundedRect(W / 2 - 110, 120, 220, 56, 10);
  box.lineStyle(3, 0x7fd3ff, 1).strokeRoundedRect(W / 2 - 110, 120, 220, 56, 10);
  c.add(box);
  const shown = txt(scene, W / 2, 148, '----', 32).setOrigin(0.5);
  c.add(shown);
  const refresh = () => shown.setText(typed.padEnd(4, '-'));

  const close = () => {
    scene.input.keyboard?.off('keydown', onKey);
    c.destroy();
  };
  const submit = () => {
    if (isAdultBirthYear(Number(typed))) {
      sfx('click');
      close();
      onPass();
    } else {
      sfx('wrong');
      close();
      toast(scene, tr('Sorry, that part is for grown-ups!'), C.bad);
      onCancel?.();
    }
  };
  const press = (k: string) => {
    if (k === 'DEL') typed = typed.slice(0, -1);
    else if (typed.length < 4) typed += k;
    refresh();
    if (typed.length === 4) scene.time.delayedCall(150, submit);
  };
  const onKey = (e: KeyboardEvent) => {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('DEL');
    else if (e.key === 'Escape') {
      close();
      onCancel?.();
    }
  };
  scene.input.keyboard?.on('keydown', onKey);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0'];
  keys.forEach((k, i) => {
    const x = W / 2 - 110 + (i % 3) * 110;
    const y = 222 + Math.floor(i / 3) * 66;
    c.add(button(scene, x, y, 96, 56, k === 'DEL' ? tr('DEL') : k, () => press(k), { size: k === 'DEL' ? 16 : 26, color: k === 'DEL' ? 0x8a3a3a : 0x4b3a78 }));
  });
  c.add(button(scene, W / 2 + 110, 222 + 3 * 66, 96, 56, tr('Cancel'), () => {
    close();
    onCancel?.();
  }, { size: 16, color: 0x3a3450 }));
}
