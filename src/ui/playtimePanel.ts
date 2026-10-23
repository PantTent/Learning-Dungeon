// Grown-ups set the play timer here: type the minutes, then set or add them.
import Phaser from 'phaser';
import { sfx } from '../audio/audio';
import { tr } from '../i18n';
import { addMinutes, cleanMinutes, clockText, isLocked, loadPlayTime, savePlayTime, setMinutes, turnOff } from '../util/playtime';
import { C, H, W, button, panel, txt } from './widgets';

/** Open the play timer panel (call it after the grown-up check). */
export function openPlaytimePanel(scene: Phaser.Scene, onClose: () => void = () => {}): void {
  let typed = '30';
  const c = scene.add.container(0, 0).setDepth(8000);
  const close = () => {
    scene.input.keyboard?.off('keydown', onKey);
    c.destroy();
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('DEL');
    else if (e.key === 'Escape') close();
  };
  const press = (k: string) => {
    if (k === 'DEL') typed = typed.slice(0, -1);
    else if (k === 'CLR') typed = '';
    else if (typed.length < 3) typed = typed === '0' ? k : typed + k;
    sfx('click');
    draw();
  };
  scene.input.keyboard?.on('keydown', onKey);

  const draw = () => {
    c.removeAll(true);
    const p = loadPlayTime();
    const n = cleanMinutes(Number(typed));
    c.add(scene.add.rectangle(0, 0, W, H, 0, 0.8).setOrigin(0).setInteractive());
    c.add(panel(scene, W / 2 - 340, 20, 680, H - 40, 0x1d1730, 0xffd24a));
    c.add(txt(scene, W / 2, 52, tr('Play timer'), 30, '#ffd24a').setOrigin(0.5));
    c.add(txt(scene, W / 2, 84, tr('Choose how many minutes your child can play. The clock only runs while a game is open. When time is up, the game saves and goes back to the menu, and the games stay locked until you add more time.'), 14, C.dim, { align: 'center', wordWrap: { width: 620 } }).setOrigin(0.5, 0));
    const status = !p.on ? tr('The timer is off: no time limit.') : isLocked(p) ? tr('Time is up: the games are locked.') : tr('Play time left: {time}', { time: clockText(p.leftMs) });
    c.add(txt(scene, W / 2, 172, status, 20, !p.on ? C.text : isLocked(p) ? '#ff8a6b' : C.good).setOrigin(0.5));

    // The minutes box and a number pad.
    const lx = W / 2 - 160;
    c.add(txt(scene, lx, 204, tr('Minutes'), 16, '#ffe9a0').setOrigin(0.5));
    const g = scene.add.graphics();
    g.fillStyle(0x0f0b1a, 1).fillRoundedRect(lx - 90, 220, 180, 50, 10);
    g.lineStyle(3, 0x7fd3ff, 1).strokeRoundedRect(lx - 90, 220, 180, 50, 10);
    c.add(g);
    c.add(txt(scene, lx, 245, typed || '0', 30).setOrigin(0.5));
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];
    keys.forEach((k, i) => {
      const label = k === 'DEL' ? '⌫' : k === 'CLR' ? tr('Clear') : k;
      c.add(button(scene, lx - 62 + (i % 3) * 62, 300 + Math.floor(i / 3) * 48, 56, 42, label, () => press(k), { size: k.length > 1 ? 14 : 20, color: 0x4b3a78 }));
    });

    // Quick picks and what to do with the minutes.
    const rx = W / 2 + 150;
    [15, 30, 45, 60].forEach((m, i) => {
      c.add(button(scene, rx - 66 + (i % 2) * 132, 226 + Math.floor(i / 2) * 46, 120, 38, tr('{n} min', { n: m }), () => {
        typed = String(m);
        sfx('click');
        draw();
      }, { size: 16, color: Number(typed) === m ? 0x2f9a4a : 0x3a3450 }));
    });
    const done = (msg: string) => {
      sfx('levelup');
      draw();
      const t = txt(scene, W / 2 + 150, 300, msg, 16, C.good).setOrigin(0.5).setDepth(8001);
      scene.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 500, onComplete: () => t.destroy() });
    };
    const set = button(scene, rx, 334, 260, 42, n ? tr('Set to {n} minutes', { n }) : tr('Type the minutes'), () => {
      const pt = loadPlayTime();
      if (!setMinutes(pt, n)) return;
      savePlayTime(pt);
      done(tr('Play time set!'));
    }, { size: 16, color: 0x2f9a4a });
    set.setEnabled(n > 0);
    c.add(set);
    if (p.on) {
      const add = button(scene, rx, 382, 260, 42, n ? tr('Add {n} minutes', { n }) : tr('Type the minutes'), () => {
        const pt = loadPlayTime();
        if (!addMinutes(pt, n)) return;
        savePlayTime(pt);
        done(tr('Play time added!'));
      }, { size: 16, color: 0x2e5a7a });
      add.setEnabled(n > 0);
      c.add(add);
      c.add(button(scene, rx, 430, 260, 42, tr('Turn the timer off'), () => {
        const pt = loadPlayTime();
        turnOff(pt);
        savePlayTime(pt);
        done(tr('No time limit now.'));
      }, { size: 16, color: 0x6a3a3a }));
    }
    c.add(button(scene, rx, 482, 160, 42, tr('Done'), close, { size: 18, color: 0x3a3450 }));
  };
  draw();
}
