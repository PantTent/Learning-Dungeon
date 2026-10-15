import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { CreateScene } from './scenes/CreateScene';
import { DungeonScene } from './scenes/DungeonScene';
import { InventoryScene } from './scenes/InventoryScene';
import { ParentScene } from './scenes/ParentScene';
import { PracticeScene } from './scenes/PracticeScene';
import { ShopScene, TravelScene } from './scenes/ShopScene';
import { TitleScene } from './scenes/TitleScene';
import { H, W } from './ui/widgets';
import { unlockAudio } from './audio/audio';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#14101e',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  scene: [BootScene, TitleScene, CreateScene, DungeonScene, BattleScene, InventoryScene, ShopScene, TravelScene, ParentScene, PracticeScene],
});

// Browsers only allow sound after the player taps or presses a key.
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Handy for debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
