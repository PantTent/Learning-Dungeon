import Phaser from 'phaser';
import { playMusic, sfx } from '../audio/audio';
import { GAMES, UNLOCK_PRICE, type GameInfo } from '../hub/games';
import { chooseFree, loadOwnership, owns, saveOwnership, type Ownership } from '../hub/ownership';
import { tr } from '../i18n';
import { isDevCode } from '../state/profile';
import { openKeyboard } from '../ui/keyboard';
import { parentGate } from '../ui/parentGate';
import { C, H, W, button, langButton, panel, soundButton, sprite, toast, txt } from '../ui/widgets';
import { menuBackground } from './TitleScene';

/** First screen: pick which game to play. One game is free; more can be unlocked. */
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
    const sub = this.own.free || this.own.devAll ? tr('Tap a game to play.') : tr('Choose your first game. It is free!');
    txt(this, W / 2, 112, sub, 19, C.dim).setOrigin(0.5);

    const cw = 270;
    const gap = 24;
    const x0 = W / 2 - (GAMES.length * cw + (GAMES.length - 1) * gap) / 2;
    GAMES.forEach((g, i) => this.card(g, x0 + i * (cw + gap), 140, cw));

    button(this, W - 70, H - 32, 110, 40, this.own.devAll ? tr('DEV ON') : tr('Code'), () => this.enterCode(), { size: 15, color: 0x3a3450 });
  }

  private card(g: GameInfo, x: number, y: number, w: number) {
    const built = !!g.scene;
    const mine = owns(this.own, g.id);
    const h = 340;
    panel(this, x, y, w, h, built ? C.panel : 0x1a1526, built ? g.color : 0x3a3054);
    const icon = sprite(this, x + w / 2, y + 86, g.icon, 7);
    if (built) {
      this.tweens.add({ targets: icon, y: icon.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      if (g.id === 'dungeon') sprite(this, x + w / 2 + 70, y + 120, 'enemy_slime', 4).setFlipX(true);
    } else {
      icon.setAlpha(0.35);
      txt(this, x + w / 2, y + 86, '?', 54, '#ffd24a').setOrigin(0.5);
    }
    txt(this, x + w / 2, y + 172, tr(g.name), g.name.length > 14 ? 24 : 26, built ? '#ffffff' : C.dim).setOrigin(0.5);
    txt(this, x + w / 2, y + 204, tr(g.blurb), 16, built ? C.text : C.dim, { align: 'center', wordWrap: { width: w - 36 } }).setOrigin(0.5, 0);

    const by = y + h - 42;
    if (!built) {
      button(this, x + w / 2, by, w - 40, 52, tr('Coming soon'), () => {}, { size: 20, color: 0x3a3450 }).setEnabled(false);
    } else if (mine) {
      button(this, x + w / 2, by, w - 40, 56, tr('Play'), () => this.play(g), { size: 26, color: 0x2f9a4a });
    } else if (!this.own.free) {
      button(this, x + w / 2, by, w - 40, 56, tr('Play for free'), () => this.confirmFree(g), { size: 22, color: 0x2f9a4a });
    } else {
      button(this, x + w / 2, by, w - 40, 56, tr('Unlock - {price}', { price: UNLOCK_PRICE }), () => this.unlock(g), { size: 20, color: 0xb07a10 });
    }
  }

  private play(g: GameInfo) {
    sfx('click');
    this.scene.start(g.scene!);
  }

  /** The free pick can't be changed later, so make sure. */
  private confirmFree(g: GameInfo) {
    const c = this.add.container(0, 0).setDepth(100);
    c.add(this.add.rectangle(0, 0, W, H, 0, 0.7).setOrigin(0).setInteractive());
    c.add(panel(this, W / 2 - 300, H / 2 - 130, 600, 260, C.panel, g.color));
    c.add(txt(this, W / 2, H / 2 - 80, tr('Make {game} your free game?', { game: tr(g.name) }), 26, '#ffd24a', { align: 'center', wordWrap: { width: 540 } }).setOrigin(0.5));
    c.add(txt(this, W / 2, H / 2 - 22, tr('You can only pick one free game. More games can be unlocked later.'), 17, C.dim, { align: 'center', wordWrap: { width: 520 } }).setOrigin(0.5));
    c.add(button(this, W / 2 - 130, H / 2 + 70, 220, 60, tr('Yes, play it!'), () => {
      chooseFree(this.own, g.id);
      this.play(g);
    }, { color: 0x2f9a4a, size: 22 }));
    c.add(button(this, W / 2 + 130, H / 2 + 70, 220, 60, tr('Not yet'), () => c.destroy(), { size: 22, color: 0x3a3450 }));
  }

  /** Buying a game: grown-ups only. Store purchases come later. */
  private unlock(g: GameInfo) {
    parentGate(this, () => {
      const c = this.add.container(0, 0).setDepth(100);
      c.add(this.add.rectangle(0, 0, W, H, 0, 0.7).setOrigin(0).setInteractive());
      c.add(panel(this, W / 2 - 300, H / 2 - 110, 600, 220, C.panel, g.color));
      c.add(txt(this, W / 2, H / 2 - 50, tr('Unlocking {game} is coming soon!', { game: tr(g.name) }), 24, '#ffd24a', { align: 'center', wordWrap: { width: 540 } }).setOrigin(0.5));
      c.add(txt(this, W / 2, H / 2 + 4, tr('Purchases will work once the game is in the app store.'), 17, C.dim, { align: 'center', wordWrap: { width: 520 } }).setOrigin(0.5));
      c.add(button(this, W / 2, H / 2 + 66, 200, 56, tr('OK'), () => c.destroy(), { size: 22 }));
    });
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
