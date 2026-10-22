// Phaser checks taps against each object's OWN scroll factor, but a
// Container only passes its scroll factor to its children when drawing.
// So a button inside a fixed-on-screen container (HUDs, question panels)
// can't be tapped once the camera has scrolled. Here a container hands its
// scroll factor down to everything inside it, including later additions.
import Phaser from 'phaser';

type WithChildren = Phaser.GameObjects.GameObject & { scrollFactorX: number; scrollFactorY: number; list?: Phaser.GameObjects.GameObject[] };

function spread(o: WithChildren, x: number, y: number) {
  o.scrollFactorX = x;
  o.scrollFactorY = y;
  o.list?.forEach((c) => spread(c as WithChildren, x, y));
}

const proto = Phaser.GameObjects.Container.prototype as unknown as {
  addHandler: (this: WithChildren, child: WithChildren) => void;
  setScrollFactor: (this: WithChildren, x: number, y?: number) => WithChildren;
};
const add = proto.addHandler;
proto.addHandler = function (child) {
  add.call(this, child);
  if (this.scrollFactorX !== 1 || this.scrollFactorY !== 1) spread(child, this.scrollFactorX, this.scrollFactorY);
};
proto.setScrollFactor = function (x, y = x) {
  spread(this, x, y);
  return this;
};
