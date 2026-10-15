import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { CreateScene } from './scenes/CreateScene';
import { DungeonScene } from './scenes/DungeonScene';
import { InventoryScene } from './scenes/InventoryScene';
import { ParentScene } from './scenes/ParentScene';
import { ShopScene, TravelScene } from './scenes/ShopScene';
import { TitleScene } from './scenes/TitleScene';
import { H, W } from './ui/widgets';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#14101e',
  pixelArt: true,
  dom: { createContainer: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  scene: [BootScene, TitleScene, CreateScene, DungeonScene, BattleScene, InventoryScene, ShopScene, TravelScene, ParentScene],
});

// Handy for debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
