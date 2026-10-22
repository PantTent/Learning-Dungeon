import Phaser from 'phaser';
import './ui/containerFix';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { CreateScene } from './scenes/CreateScene';
import { DungeonScene } from './scenes/DungeonScene';
import { HubScene } from './scenes/HubScene';
import { FarmScene } from './scenes/FarmScene';
import { FarmSetupScene } from './scenes/FarmSetupScene';
import { SpaceBaseScene } from './scenes/SpaceBaseScene';
import { SpaceFlightScene } from './scenes/SpaceFlightScene';
import { SpaceMapScene } from './scenes/SpaceMapScene';
import { SpaceSetupScene } from './scenes/SpaceSetupScene';
import { InventoryScene } from './scenes/InventoryScene';
import { ParentScene } from './scenes/ParentScene';
import { PracticeScene } from './scenes/PracticeScene';
import { SpellbookScene } from './scenes/SpellbookScene';
import { ShopScene, TravelScene } from './scenes/ShopScene';
import { TitleScene } from './scenes/TitleScene';
import { H, W } from './ui/widgets';
import { unlockAudio } from './audio/audio';
import { inApp } from './util/platform';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#14101e',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  scene: [BootScene, HubScene, TitleScene, CreateScene, DungeonScene, BattleScene, InventoryScene, ShopScene, TravelScene, ParentScene, PracticeScene, SpellbookScene, FarmSetupScene, FarmScene, SpaceSetupScene, SpaceBaseScene, SpaceFlightScene, SpaceMapScene],
});

// Browsers only allow sound after the player taps or presses a key.
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Rotating a tablet: wait for the new screen size to settle, then refit.
const refit = () => [50, 300, 800].forEach((ms) => setTimeout(() => game.scale.refresh(), ms));
window.addEventListener('orientationchange', refit);
window.addEventListener('resize', refit);
screen.orientation?.addEventListener?.('change', refit);

// The website can be installed to the home screen and played offline.
// (The Android app already has everything inside it.)
if (import.meta.env.PROD && !inApp() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Handy for debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
