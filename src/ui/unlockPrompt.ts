// "This is part of the full game" panel. A grown-up can go on to unlock it
// (store purchases are not connected yet).
import Phaser from 'phaser';
import { sfx } from '../audio/audio';
import { GAMES, unlockPrice } from '../hub/games';
import { getLang, tr } from '../i18n';
import { parentGate } from './parentGate';
import { C, H, W, button, panel, txt } from './widgets';

export function fullGamePrompt(scene: Phaser.Scene, gameId: string, reason: string, onClose?: () => void): void {
  const game = GAMES.find((g) => g.id === gameId);
  const c = scene.add.container(0, 0).setDepth(8000).setScrollFactor(0);
  const close = () => {
    c.destroy();
    onClose?.();
  };
  sfx('click');
  c.add(scene.add.rectangle(0, 0, W, H, 0, 0.75).setOrigin(0).setInteractive());
  c.add(panel(scene, W / 2 - 330, H / 2 - 170, 660, 340, 0x1d1730, 0xffd24a));
  c.add(txt(scene, W / 2, H / 2 - 128, tr('Part of the full game!'), 32, '#ffd24a').setOrigin(0.5));
  c.add(txt(scene, W / 2, H / 2 - 70, reason, 19, C.text, { align: 'center', wordWrap: { width: 580 } }).setOrigin(0.5));
  c.add(
    txt(scene, W / 2, H / 2 - 4, tr('Ask a grown-up to unlock {game}: {price}, or every game for {all}.', {
      game: tr(game?.name ?? ''),
      price: unlockPrice(getLang()),
      all: unlockPrice(getLang(), 'all'),
    }), 16, C.dim, { align: 'center', wordWrap: { width: 580 } }).setOrigin(0.5),
  );
  c.add(button(scene, W / 2 - 140, H / 2 + 100, 240, 60, tr('Ask a grown-up'), () => {
    c.destroy();
    parentGate(scene, () => comingSoon(scene, onClose), onClose);
  }, { size: 20, color: 0xb07a10 }));
  c.add(button(scene, W / 2 + 140, H / 2 + 100, 220, 60, tr('Not now'), close, { size: 20, color: 0x3a3450 }));
}

/** Shown to grown-ups until the app store purchase is connected. */
export function comingSoon(scene: Phaser.Scene, onClose?: () => void): void {
  const c = scene.add.container(0, 0).setDepth(8000).setScrollFactor(0);
  c.add(scene.add.rectangle(0, 0, W, H, 0, 0.75).setOrigin(0).setInteractive());
  c.add(panel(scene, W / 2 - 300, H / 2 - 110, 600, 220, C.panel, 0xffd24a));
  c.add(txt(scene, W / 2, H / 2 - 50, tr('Purchases are coming soon!'), 26, '#ffd24a').setOrigin(0.5));
  c.add(txt(scene, W / 2, H / 2 + 4, tr('Purchases will work once the game is in the app store.'), 17, C.dim, { align: 'center', wordWrap: { width: 520 } }).setOrigin(0.5));
  c.add(button(scene, W / 2, H / 2 + 66, 200, 56, tr('OK'), () => {
    c.destroy();
    onClose?.();
  }, { size: 22 }));
}
