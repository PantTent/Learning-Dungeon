// Shared bits for the Animal Kingdom Quest screens.
import Phaser from 'phaser';
import { getLang, tr } from '../i18n';
import { QuestionEngine } from '../questions/engine';
import { QuestionPanel } from '../ui/QuestionPanel';
import { C, H, W, button, panel, txt } from '../ui/widgets';
import { sfx } from '../audio/audio';
import { animal, FOODS, quest, type QuestDef, type Text } from './data';
import { accept, canTurnIn, eat, maxHearts, progress, questReady, saveAnimals, turnIn, xpToNext, type AnimalSave } from './state';
import { say } from '../space/ui';

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

/** A 32x32 ground tile: light grass in the village, deep green in the jungle, sand in the desert. */
export function grassTexture(scene: Phaser.Scene, kind: 'village' | 'jungle' | 'desert' | 'forest' | 'snow' | 'beach'): string {
  const key = `agrass_${kind}`;
  if (scene.textures.exists(key)) return key;
  const [a, b, c] = {
    village: ['#7ccb4c', '#5fb03f', '#a6e45e'],
    jungle: ['#3f8a34', '#2f6e2a', '#5aa040'],
    desert: ['#e8c98a', '#d6b06c', '#f4dca4'],
    forest: ['#2f5e3a', '#264d30', '#3e7a4c'],
    snow: ['#e8f0f8', '#d2e0ee', '#ffffff'],
    beach: ['#f0d9a0', '#e2c486', '#fbe8bc'],
  }[kind];
  const tex = scene.textures.createCanvas(key, 32, 32)!;
  const ctx = tex.getContext();
  const rand = rng({ village: 7, jungle: 11, desert: 13, forest: 17, snow: 19, beach: 23 }[kind]);
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
    c.add(panel(scene, W / 2 - 330, 40, 660, 470, 0x1d1730, 0xb8864a));
    c.add(txt(scene, W / 2, 68, tr('Backpack'), 28, '#ffd24a').setOrigin(0.5));
    c.add(txt(scene, W / 2, 102, tr('Hearts: {n} / {max}. Tap a food to eat it.', { n: s.hearts, max: maxHearts(s) }), 16, C.text).setOrigin(0.5));
    // Foods you have come first; five to a row.
    const list = [...FOODS].sort((a, b) => Number((s.foods[b.id] ?? 0) > 0) - Number((s.foods[a.id] ?? 0) > 0));
    list.forEach((f, i) => {
      const x = W / 2 - 248 + (i % 5) * 124;
      const y = 180 + Math.floor(i / 5) * 140;
      const n = s.foods[f.id] ?? 0;
      const b = button(scene, x, y, 112, 124, '', () => {
        const got = eat(s, f.id);
        if (got) {
          saveAnimals(s);
          onChange();
        }
        draw();
      }, { color: n ? 0x3d3266 : 0x241e36 });
      b.setEnabled(n > 0 && s.hearts < maxHearts(s));
      c.add(b);
      c.add(scene.add.image(x, y - 22, f.icon).setScale(4.4).setAlpha(n ? 1 : 0.35));
      c.add(txt(scene, x, y + 22, tx(f.name), 13, n ? '#ffffff' : C.dim, { align: 'center', wordWrap: { width: 106 } }).setOrigin(0.5));
      c.add(txt(scene, x, y + 48, `x${n}  ·  ${f.heal >= 99 ? tr('All hearts') : tr('+{n} hearts', { n: f.heal })}`, 12, '#ff9a9a').setOrigin(0.5));
    });
    c.add(txt(scene, W / 2, 448, tr('Careful: apples you eat no longer count for a quest!'), 14, '#ffb36b').setOrigin(0.5));
    c.add(button(scene, W / 2, 484, 180, 40, tr('Close'), () => c.destroy(), { size: 18, color: 0x3a3450 }));
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

/**
 * Talking to a quest giver: offer the quest (boss quests wait until the
 * hero is ready, unless they ask for it), cheer them on, or take the
 * finished quest and give the rewards.
 */
export function questTalk(scene: Phaser.Scene, s: AnimalSave, q: QuestDef, done: () => void) {
  const name = tx(q.giverName);
  const state = s.quests[q.id];
  const offer = () =>
    dialog(scene, q.sprite, name, tx(q.ask), [
      { label: tr('Not now'), color: 0x3a3450, fn: done },
      { label: tr('Yes, I will!'), fn: () => {
        accept(s, q.id);
        saveAnimals(s);
        sfx('click');
        say(scene, tr('New quest: {q}', { q: tx(q.title) }), '#ffd24a');
        done();
      } },
    ]);
  if (state === 'new' && !questReady(s, q.id)) {
    const b = q.boss!;
    const helpers = b.after.map((id) => tx(quest(id).giverName)).join(tr(' and '));
    dialog(scene, q.sprite, name, tr('{quest}: this is a big challenge! First help {helpers}, or come back at level {lv}. You are level {n} now.', { quest: tx(q.title), helpers, lv: b.level, n: s.level }), [
      { label: tr('I feel ready!'), color: 0xb02a4a, fn: offer },
      { label: tr('Okay!'), fn: done },
    ]);
  } else if (state === 'new') offer();
  else if (canTurnIn(s, q.id)) {
    const r = turnIn(s, q.id)!;
    saveAnimals(s);
    sfx('levelup');
    const extra = r.levels ? ` ${tr('You are now level {n}!', { n: s.level })}` : '';
    dialog(scene, q.sprite, name, `${tx(q.thanks)}\n${tr('+{a} acorns, +{x} XP.', { a: r.acorns, x: r.xp })}${extra}`, [{ label: tr('Yay!'), fn: done }]);
  } else if (state === 'active') {
    dialog(scene, q.sprite, name, tr('{task} So far: {n} of {need}.', { task: tx(q.title), n: progress(s, q.id), need: q.need }), [{ label: tr('On my way!'), fn: done }]);
  } else {
    dialog(scene, q.sprite, name, tr('Thank you again for your help, {name}!', { name: s.name }), [{ label: tr('Bye!'), fn: done }]);
  }
}
