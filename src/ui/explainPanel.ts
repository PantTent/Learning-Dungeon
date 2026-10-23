// After a wrong answer: a voice explains the mistake and how to do it right,
// with a picture for simple math (8 apples and 2 more apples come together).
// "Got it" stays grey until the explanation is finished.
import Phaser from 'phaser';
import type { Question } from '../questions/types';
import { equation, mathVisual, story, THINGS, type MathVisual, type Thing } from '../questions/visual';
import { tr } from '../i18n';
import { sfx } from '../audio/audio';
import { H, W, button, panel, txt } from './widgets';
import { speak } from './QuestionPanel';

interface Step {
  say: string;
  /** Moves the picture; returns how long that takes (ms). */
  act?: () => number;
}

/** Middle of the picture area. */
const CY = 262;

export function showWrongExplanation(scene: Phaser.Scene, q: Question, given: string, answer: string, answerLine: string, done: () => void): void {
  const root = scene.add.container(0, 0).setDepth(3100).setScrollFactor(0);
  root.add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
  root.add(panel(scene, 70, 26, W - 140, H - 52, 0x2a1a30, 0xffb36b));
  const head = txt(scene, W / 2, 58, tr("Let's figure it out!"), 32, '#ffb36b').setOrigin(0.5);
  root.add(head);
  scene.tweens.add({ targets: head, scale: { from: 0.6, to: 1 }, duration: 260, ease: 'Back.Out' });
  root.add(txt(scene, W / 2, 86, answerLine, 16, '#ffffff', { align: 'center', wordWrap: { width: W - 220 }, lineSpacing: 2 }).setOrigin(0.5, 0));

  const v = mathVisual(q.prompt);
  const thing = THINGS[Math.floor(Math.random() * THINGS.length)];
  const intro = tr('You said {given}, but the answer is {answer}.', { given, answer });

  // The words on screen follow the voice.
  const caption = txt(scene, W / 2, v ? 404 : 200, '', v ? 20 : 24, '#ffe9a0', { align: 'center', wordWrap: { width: W - 220, useAdvancedWrap: true }, lineSpacing: 4 }).setOrigin(0.5, 0);
  root.add(caption);
  let pic: Phaser.GameObjects.Container | undefined;
  const eqText = txt(scene, W / 2, 372, v ? equation(v) : '', 34, '#ffffff').setOrigin(0.5).setAlpha(0);
  root.add(eqText);

  const steps = (): Step[] => {
    if (!v) return [{ say: intro }, { say: q.explanation }];
    pic?.destroy();
    pic = scene.add.container(0, 0);
    root.addAt(pic, 3);
    eqText.setAlpha(0);
    const acts = pictureSteps(scene, pic, v, thing);
    const words = story(v, thing);
    return [{ say: intro }, ...words.map((say, i) => ({ say, act: i === words.length - 1 ? () => showEq(scene, eqText) : acts[i] }))];
  };

  // Buttons: hear it again any time; "Got it" only once the explanation is done.
  let finished = false;
  const go = button(scene, W / 2 + 120, H - 66, 220, 54, tr('Listen...'), () => {
    if (!finished) return;
    run.token++;
    root.destroy();
    done();
  }, { color: 0x2f9a4a, size: 22 });
  go.setEnabled(false);
  root.add(go);
  const again = button(scene, W / 2 - 150, H - 66, 200, 48, tr('Hear it again'), () => {
    sfx('click');
    play();
  }, { color: 0x2e5a7a, size: 18 });
  root.add(again);
  const unlock = () => {
    if (finished) return;
    finished = true;
    go.label.setText(tr('Got it'));
    go.setEnabled(true);
    scene.tweens.add({ targets: go, scale: 1.06, duration: 400, yoyo: true, repeat: 1 });
  };

  const run = { token: 0 };
  const play = () => {
    const token = ++run.token;
    const list = steps();
    let i = 0;
    const next = () => {
      if (token !== run.token) return;
      if (i >= list.length) return unlock();
      const st = list[i++];
      caption.setText(st.say);
      const moves = st.act?.() ?? 0;
      // Wait for the voice and the picture, and for enough time to read it
      // (some devices have no voice, or never say they finished).
      const minMs = Math.max(moves, 600 + st.say.length * 45);
      const maxMs = Math.max(moves, 2500 + st.say.length * 110);
      let spoke = false;
      let waited = false;
      let moved = false;
      const advance = () => {
        if (moved || token !== run.token) return;
        moved = true;
        scene.time.delayedCall(250, next);
      };
      scene.time.delayedCall(minMs, () => {
        waited = true;
        if (spoke) advance();
      });
      scene.time.delayedCall(maxMs, advance);
      speak(st.say, true, () => {
        spoke = true;
        if (waited) advance();
      });
    };
    next();
  };
  root.once('destroy', () => (run.token = -1));
  play();
}

function showEq(scene: Phaser.Scene, t: Phaser.GameObjects.Text): number {
  sfx('correct');
  scene.tweens.add({ targets: t, alpha: 1, scale: { from: 0.5, to: 1 }, duration: 400, ease: 'Back.Out' });
  return 500;
}

// ------------------------------------------------------------------ pictures

/** Scale so a sprite is about `px` pixels big. */
function fit(scene: Phaser.Scene, key: string, px: number): number {
  const f = scene.textures.getFrame(key);
  return px / Math.max(f?.width ?? 16, f?.height ?? 16);
}

/** Spots for n things in rows, centered on (cx, cy). */
function grid(n: number, cx: number, cy: number, gap: number, perRow: number): { x: number; y: number }[] {
  const rows = Math.ceil(n / perRow);
  const cols = Math.min(n, perRow);
  return Array.from({ length: n }, (_x, i) => ({
    x: cx + ((i % perRow) - (cols - 1) / 2) * gap,
    y: cy + (Math.floor(i / perRow) - (rows - 1) / 2) * gap,
  }));
}

function pop(scene: Phaser.Scene, pic: Phaser.GameObjects.Container, key: string, x: number, y: number, scale: number, delay: number): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, key).setScale(0);
  pic.add(img);
  scene.tweens.add({ targets: img, scale, duration: 220, delay, ease: 'Back.Out', onStart: () => delay > 0 && sfx('click') });
  return img;
}

/** Little numbers that count the things one by one. */
function countUp(scene: Phaser.Scene, pic: Phaser.GameObjects.Container, imgs: Phaser.GameObjects.Image[], from: number, gap: number, delay = 0): number {
  imgs.forEach((img, i) => {
    // Placed when it is counted, so it sits on the thing even after it moved.
    scene.time.delayedCall(delay + i * gap, () => {
      if (!pic.active) return;
      const n = txt(scene, img.x, img.y - 22, `${from + i}`, 14, '#ffffff').setOrigin(0.5).setStroke('#120a1c', 4);
      pic.add(n);
      scene.tweens.add({ targets: img, scale: img.scale * 1.2, duration: 100, yoyo: true });
    });
  });
  return delay + imgs.length * gap + 200;
}

function box(scene: Phaser.Scene, pic: Phaser.GameObjects.Container, cx: number, cy: number, w: number, h: number) {
  const g = scene.add.graphics();
  g.lineStyle(3, 0x7fd3ff, 0.9).strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
  g.fillStyle(0x7fd3ff, 0.08).fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
  g.setAlpha(0);
  pic.add(g);
  scene.tweens.add({ targets: g, alpha: 1, duration: 250 });
  return g;
}

/** One picture move for each sentence of the story (the last one shows the sum). */
function pictureSteps(scene: Phaser.Scene, pic: Phaser.GameObjects.Container, v: MathVisual, t: Thing): (() => number)[] {
  const key = t.sprite;
  const size = 30;
  const sc = fit(scene, key, size);
  const gap = 36;
  if (v.op === 'add') {
    let a: Phaser.GameObjects.Image[] = [];
    let b: Phaser.GameObjects.Image[] = [];
    const L = W / 2 - 190;
    const R = W / 2 + 190;
    return [
      () => {
        box(scene, pic, L, CY, 5 * gap + 16, Math.ceil(v.a / 5) * gap + 20);
        a = grid(v.a, L, CY, gap, 5).map((p, i) => pop(scene, pic, key, p.x, p.y, sc, i * 70));
        return 300 + v.a * 70;
      },
      () => {
        pic.add(txt(scene, W / 2, CY, '+', 44, '#ffd24a').setOrigin(0.5));
        box(scene, pic, R, CY, 5 * gap + 16, Math.ceil(v.b / 5) * gap + 20);
        b = grid(v.b, R, CY, gap, 5).map((p, i) => pop(scene, pic, key, p.x, p.y, sc, i * 70));
        return 300 + v.b * 70;
      },
      () => {
        // Everything moves together into one group, then we count.
        pic.each((o: Phaser.GameObjects.GameObject) => {
          if (!(o instanceof Phaser.GameObjects.Image)) scene.tweens.add({ targets: o, alpha: 0, duration: 300 });
        });
        const spots = grid(v.r, W / 2, CY, gap, 10);
        [...a, ...b].forEach((img, i) => scene.tweens.add({ targets: img, x: spots[i].x, y: spots[i].y, duration: 700, ease: 'Sine.InOut' }));
        return countUp(scene, pic, [...a, ...b], 1, 110, 800);
      },
    ];
  }
  if (v.op === 'missing') {
    const spots = grid(v.r, W / 2, CY, gap, 10);
    let ghosts: Phaser.GameObjects.Image[] = [];
    return [
      () => {
        spots.slice(0, v.a).forEach((p, i) => pop(scene, pic, key, p.x, p.y, sc, i * 70));
        return 300 + v.a * 70;
      },
      () => {
        ghosts = spots.slice(v.a).map((p, i) => pop(scene, pic, key, p.x, p.y, sc, i * 90).setAlpha(0.25).setTint(0x8888aa));
        return 300 + v.b * 90;
      },
      () => {
        ghosts.forEach((g, i) => scene.tweens.add({ targets: g, alpha: 1, duration: 200, delay: i * 400, onStart: () => g.clearTint() }));
        return countUp(scene, pic, ghosts, v.a + 1, 400);
      },
    ];
  }
  if (v.op === 'sub') {
    const spots = grid(v.a, W / 2, CY, gap, 10);
    let all: Phaser.GameObjects.Image[] = [];
    return [
      () => {
        all = spots.map((p, i) => pop(scene, pic, key, p.x, p.y, sc, i * 60));
        return 300 + v.a * 60;
      },
      () => {
        // The ones taken away go red and leave.
        all.slice(v.r).forEach((img, i) => {
          img.setTint(0xff8a8a);
          scene.tweens.add({ targets: img, x: W - 110, y: CY + 60 + (i % 3) * 10, alpha: 0, angle: 90, duration: 700, delay: 300 + i * 150 });
        });
        return 1100 + v.b * 150;
      },
      () => countUp(scene, pic, all.slice(0, v.r), 1, 110),
    ];
  }
  if (v.op === 'mul') {
    const per = Math.min(5, v.b);
    const bw = Math.min(160, (W - 260 - (v.a - 1) * 12) / v.a);
    const g2 = Math.min(gap, (bw - 12) / per);
    const isc = fit(scene, key, Math.min(size, g2 - 4));
    const bh = Math.ceil(v.b / per) * g2 + 22;
    const centers = Array.from({ length: v.a }, (_x, i) => W / 2 + (i - (v.a - 1) / 2) * (bw + 12));
    return [
      () => {
        centers.forEach((cx, k) => {
          scene.time.delayedCall(k * 350, () => {
            box(scene, pic, cx, CY - 10, bw, bh);
            grid(v.b, cx, CY - 10, g2, per).forEach((p, i) => pop(scene, pic, key, p.x, p.y, isc, i * 40));
          });
        });
        return v.a * 350 + 400;
      },
      () => {
        // Skip counting: one number under each group.
        centers.forEach((cx, k) => {
          const n = txt(scene, cx, CY + bh / 2 + 8, `${(k + 1) * v.b}`, 20, '#ffd24a').setOrigin(0.5).setAlpha(0);
          pic.add(n);
          scene.tweens.add({ targets: n, alpha: 1, duration: 200, delay: k * 450 });
        });
        return v.a * 450 + 200;
      },
      () => 300,
    ];
  }
  // Division: share a things into b groups, one at a time.
  const pileSize = v.a > 20 ? 22 : 26;
  const psc = fit(scene, key, pileSize);
  const pile = grid(v.a, W / 2, 196, pileSize + 4, 15);
  const per = Math.min(5, v.r);
  const bw = Math.min(150, (W - 260 - (v.b - 1) * 12) / v.b);
  const g2 = Math.min(30, (bw - 12) / per);
  const bh = Math.ceil(v.r / per) * g2 + 20;
  const by = 300;
  const centers = Array.from({ length: v.b }, (_x, i) => W / 2 + (i - (v.b - 1) / 2) * (bw + 12));
  let imgs: Phaser.GameObjects.Image[] = [];
  return [
    () => {
      imgs = pile.map((p, i) => pop(scene, pic, key, p.x, p.y, psc, i * 40));
      return 300 + v.a * 40;
    },
    () => {
      centers.forEach((cx) => box(scene, pic, cx, by, bw, bh));
      const spots = centers.map((cx) => grid(v.r, cx, by, g2, per));
      const each = Math.max(90, Math.min(220, 3200 / v.a));
      imgs.forEach((img, i) => {
        const p = spots[i % v.b][Math.floor(i / v.b)];
        scene.tweens.add({ targets: img, x: p.x, y: p.y, scale: fit(scene, key, Math.min(pileSize, g2 - 4)), duration: 260, delay: 300 + i * each });
      });
      return 600 + v.a * each;
    },
    () => {
      centers.forEach((cx, k) => {
        const n = txt(scene, cx, by + bh / 2 + 10, `${v.r}`, 20, '#ffd24a').setOrigin(0.5).setAlpha(0);
        pic.add(n);
        scene.tweens.add({ targets: n, alpha: 1, duration: 200, delay: k * 200 });
      });
      return v.b * 200 + 200;
    },
  ];
}
