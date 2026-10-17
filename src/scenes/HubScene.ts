import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { GAMES, unlockPrice, type GameInfo } from '../hub/games';
import { comingSoon } from '../ui/unlockPrompt';
import { hasFullGame, loadOwnership, saveOwnership, type Ownership } from '../hub/ownership';
import { getLang, tr } from '../i18n';
import { isDevCode } from '../state/profile';
import { openKeyboard } from '../ui/keyboard';
import { parentGate } from '../ui/parentGate';
import { C, H, W, button, langButton, panel, soundButton, sprite, toast, txt } from '../ui/widgets';
import { menuBackground } from './TitleScene';
import { androidBrowser, APK_URL } from '../util/platform';

/** First screen: pick which game to play. Every game is free to try; the full games can be unlocked. */
export class HubScene extends Phaser.Scene {
  private own!: Ownership;

  constructor() {
    super('Hub');
  }

  create() {
    playMusic('title');
    menuBackground(this);
    this.own = loadOwnership();
    soundButton(this, W - 76, 30, 130, 40);
    langButton(this, 96, 30, 172, 40, () => this.scene.restart());
    const title = txt(this, W / 2, 70, tr('Pick a game!'), 44, '#ffd24a').setOrigin(0.5);
    title.setStroke('#5a2a00', 8);
    txt(this, W / 2, 112, tr('Every game is free to try!'), 19, C.dim).setOrigin(0.5);

    const cw = 270;
    const gap = 24;
    const x0 = W / 2 - (GAMES.length * cw + (GAMES.length - 1) * gap) / 2;
    GAMES.forEach((g, i) => this.card(g, x0 + i * (cw + gap), 132, cw));

    const built = GAMES.filter((g) => g.scene);
    if (!built.every((g) => hasFullGame(this.own, g.id))) {
      button(this, W / 2, H - 28, 380, 40, tr('Unlock every game - {price}', { price: unlockPrice(getLang(), 'all') }), () => this.unlock(), { size: 17, color: 0xb07a10 });
    }
    button(this, W - 70, H - 32, 110, 40, this.own.devAll ? tr('DEV ON') : tr('Code'), () => this.enterCode(), { size: 15, color: 0x3a3450 });
    // Playing in a browser on an Android tablet? Offer the app.
    if (androidBrowser()) {
      button(this, 118, H - 32, 210, 40, tr('Get the Android app'), () => window.open(APK_URL, '_blank'), { size: 15, color: 0x2e5a7a });
    }
  }

  private card(g: GameInfo, x: number, y: number, w: number) {
    const built = !!g.scene;
    const full = hasFullGame(this.own, g.id);
    const h = 336;
    panel(this, x, y, w, h, built ? C.panel : 0x1a1526, built ? g.color : 0x3a3054);
    const icon = sprite(this, x + w / 2, y + 66, g.icon, 6);
    if (built) {
      this.tweens.add({ targets: icon, y: icon.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      if (g.id === 'dungeon') sprite(this, x + w / 2 + 64, y + 96, 'enemy_slime', 3.5).setFlipX(true);
      if (g.id === 'farm') sprite(this, x + w / 2 + 70, y + 92, 'crop_carrot', 3);
    } else {
      icon.setAlpha(0.35);
      txt(this, x + w / 2, y + 66, '?', 54, '#ffd24a').setOrigin(0.5);
    }
    txt(this, x + w / 2, y + 136, tr(g.name), 26, built ? '#ffffff' : C.dim).setOrigin(0.5);
    txt(this, x + w / 2, y + 160, tr(g.blurb), 15, built ? C.text : C.dim, { align: 'center', wordWrap: { width: w - 36 } }).setOrigin(0.5, 0);

    if (!built) {
      button(this, x + w / 2, y + h - 34, w - 40, 48, tr('Coming soon'), () => {}, { size: 20, color: 0x3a3450 }).setEnabled(false);
      return;
    }
    if (full) txt(this, x + w / 2, y + 250, tr('Full game unlocked'), 16, C.good).setOrigin(0.5);
    else {
      button(this, x + w / 2, y + 250, w - 60, 34, tr('Full game - {price}', { price: unlockPrice(getLang()) }), () => this.unlock(), { size: 15, color: 0xb07a10 });
    }
    const label = full ? tr('Play') : tr('Play free');
    button(this, x + w / 2, y + h - 34, w - 40, 48, label, () => this.play(g), { size: label.length > 12 ? 20 : 24, color: 0x2f9a4a });
  }

  private play(g: GameInfo) {
    sfx('click');
    this.scene.start(g.scene!);
  }

  /** Buying: grown-ups only. Store purchases come later. */
  private unlock() {
    parentGate(this, () => comingSoon(this));
  }

  /** The developer code unlocks every game. */
  private enterCode() {
    openKeyboard(this, tr('Type a secret code'), '', false, (code) => {
      if (!code.trim()) return;
      if (isDevCode(code)) {
        this.own.devAll = true;
        saveOwnership(this.own);
        toast(this, tr('Developer mode ON! Every game is unlocked.'), C.good);
        this.time.delayedCall(900, () => this.scene.restart());
      } else toast(this, tr('That code does not work.'), C.bad);
    });
  }
}
