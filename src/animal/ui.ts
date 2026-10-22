// Shared bits for the Animal Kingdom Quest screens.
import Phaser from 'phaser';
import { getLang, tr } from '../i18n';
import { QuestionEngine } from '../questions/engine';
import { QuestionPanel } from '../ui/QuestionPanel';
import { C, H, W, button, panel, txt } from '../ui/widgets';
import { animal, FOODS, type Text } from './data';
import { eat, maxHearts, saveAnimals, xpToNext, type AnimalSave } from './state';

export { keyVector, say, Stick } from '../space/ui';

export const tx = (t: Text) => (getLang() === 'fr' ? t.fr : t.en);

/** Ask one question with the hero's own learning settings. */
export function ask(scene: Phaser.Scene, s: AnimalSave, header: string, result: { right: string; wrong: string; go: string }, done: (correct: boolean) => void) {
  const engine = new QuestionEngine(s.learning, s.settings);
  const q = engine.next();
  new QuestionPanel(scene, q, {
    header,
    readAloud: s.settings.readAloud,
    result,
    done: (correct) => {
      engine.record(q, correct);
      saveAnimals(s);
      done(correct);
    },
  });
}

/** Seeded random numbers (so grass looks the same every time). */
function rng(seed: number) {
  let v = seed;
  return () => {
    v = (v * 1664525 + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

/** A 32x32 grass tile, lighter in the village, deeper green in the jungle. */
export function grassTexture(scene: Phaser.Scene, kind: 'village' | 'jungle'): string {
  const key = `agrass_${kind}`;
  if (scene.textures.exists(key)) return key;
  const [a, b, c] = kind === 'village' ? ['#7ccb4c', '#5fb03f', '#a6e45e'] : ['#3f8a34', '#2f6e2a', '#5aa040'];
  const tex = scene.textures.createCanvas(key, 32, 32)!;
  const ctx = tex.getContext();
  const rand = rng(kind === 'village' ? 7 : 11);
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = rand() < 0.5 ? b : c;
    const x = Math.floor(rand() * 32);
    const y = Math.floor(rand() * 32);
    ctx.fillRect(x, y, 1, rand() < 0.3 ? 2 : 1);
  }
  tex.refresh();
  return key;
}

/**
 * The top bar: who you are, hearts, level and acorns, plus a Backpack
 * button (eat food) and a Games button. Fixed on screen.
 */
export function topBar(scene: Phaser.Scene, s: AnimalSave, onChange: () => void): Phaser.GameObjects.Container {
  const a = animal(s.animal);
  const c = scene.add.container(0, 0).setDepth(2000).setScrollFactor(0);
  c.add(panel(scene, 8, 8, 420, 70, 0x1d1730, a.color));
  c.add(scene.add.image(44, 43, a.sprite).setScale(3.2));
  c.add(txt(scene, 80, 14, `${s.name}  ·  ${tx(a.name)}  ·  ${tr('Level {n}', { n: s.level })}`, 17, '#ffd24a'));
  // Hearts: one icon and the numbers, plus a bar.
  const max = maxHearts(s);
  c.add(scene.add.image(90, 47, 'prop_heart').setScale(1.8));
  const g = scene.add.graphics();
  g.fillStyle(0x0b0812, 1).fillRoundedRect(104, 39, 170, 16, 5);
  g.fillStyle(0xe0504a, 1).fillRoundedRect(104, 39, Math.max(6, (170 * s.hearts) / max), 16, 5);
  c.add(g);
  c.add(txt(scene, 189, 47, `${s.hearts} / ${max}`, 13, '#ffffff').setOrigin(0.5));
  c.add(scene.add.image(298, 47, 'item_acorn').setScale(1.8));
  c.add(txt(scene, 312, 47, `${s.acorns}`, 16, '#ffe9a0').setOrigin(0, 0.5));
  // XP bar under it.
  const xg = scene.add.graphics();
  const need = xpToNext(s.level);
  xg.fillStyle(0x0b0812, 1).fillRoundedRect(80, 62, 334, 8, 3);
  xg.fillStyle(0xb98aff, 1).fillRoundedRect(80, 62, Math.max(4, (334 * s.xp) / need), 8, 3);
  c.add(xg);
  c.add(button(scene, 520, 36, 150, 50, tr('Backpack'), () => backpack(scene, s, onChange), { size: 18, color: 0x8a5a2a }));
  c.add(button(scene, W - 66, 36, 116, 44, tr('Games'), () => {
    saveAnimals(s);
    scene.scene.start('Hub');
  }, { size: 16, color: 0x3a3450 }));
  return c;
}

/** The backpack: tap a food to eat it and get hearts back. */
export function backpack(scene: Phaser.Scene, s: AnimalSave, onChange: () => void) {
  const c = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);
  const draw = () => {
    c.removeAll(true);
    c.add(scene.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
    c.add(panel(scene, W / 2 - 300, 90, 600, 340, 0x1d1730, 0xb8864a));
    c.add(txt(scene, W / 2, 120, tr('Backpack'), 28, '#ffd24a').setOrigin(0.5));
    c.add(txt(scene, W / 2, 156, tr('Hearts: {n} / {max}. Tap a food to eat it.', { n: s.hearts, max: maxHearts(s) }), 16, C.text).setOrigin(0.5));
    FOODS.forEach((f, i) => {
      const x = W / 2 - 210 + i * 140;
      const n = s.foods[f.id] ?? 0;
      const b = button(scene, x, 250, 120, 120, '', () => {
        const got = eat(s, f.id);
        if (got) {
          saveAnimals(s);
          onChange();
        }
        draw();
      }, { color: n ? 0x3d3266 : 0x241e36 });
      b.setEnabled(n > 0 && s.hearts < maxHearts(s));
      c.add(b);
      c.add(scene.add.image(x, 236, f.icon).setScale(5).setAlpha(n ? 1 : 0.35));
      c.add(txt(scene, x, 290, `${tx(f.name)} x${n}`, 14, n ? '#ffffff' : C.dim).setOrigin(0.5));
      c.add(txt(scene, x, 326, f.heal >= 99 ? tr('All hearts') : tr('+{n} hearts', { n: f.heal }), 13, '#ff9a9a').setOrigin(0.5));
    });
    c.add(txt(scene, W / 2, 360, tr('Careful: apples you eat no longer count for a quest!'), 14, '#ffb36b').setOrigin(0.5));
    c.add(button(scene, W / 2, 400, 180, 44, tr('Close'), () => c.destroy(), { size: 18, color: 0x3a3450 }));
  };
  draw();
}

/** A speech bubble from a villager, with up to two buttons. */
export function dialog(
  scene: Phaser.Scene,
  sprite: string,
  who: string,
  text: string,
  buttons: { label: string; color?: number; fn: () => void }[],
) {
  const c = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);
  c.add(scene.add.rectangle(0, 0, W, H, 0, 0.5).setOrigin(0).setInteractive());
  c.add(panel(scene, 60, H - 250, W - 120, 230, 0x1d1730, 0xffd24a));
  c.add(scene.add.image(130, H - 160, sprite).setScale(5));
  c.add(txt(scene, 200, H - 236, who, 22, '#ffd24a'));
  c.add(txt(scene, 200, H - 204, text, 18, C.text, { wordWrap: { width: W - 300 }, lineSpacing: 4 }));
  buttons.forEach((b, i) => {
    c.add(button(scene, W - 180 - (buttons.length - 1 - i) * 220, H - 60, 200, 48, b.label, () => {
      c.destroy();
      b.fn();
    }, { size: 18, color: b.color ?? 0x2f9a4a }));
  });
  return c;
}
