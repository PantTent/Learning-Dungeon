import Phaser from 'phaser';
import { buildTextures } from '../art/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    buildTextures(this);
    this.scene.start('Title');
  }
}
