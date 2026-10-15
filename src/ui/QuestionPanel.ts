import Phaser from 'phaser';
import type { Question } from '../questions/types';
import { isCorrect } from '../questions/engine';
import { MATH_TOPICS } from '../questions/math';
import { READING_TOPICS } from '../questions/readingBank';
import { C, H, W, button, panel, txt } from './widgets';

const debugHook: { q?: Question; choicePos: { x: number; y: number }[] } = { choicePos: [] };
(window as unknown as { __ld: typeof debugHook }).__ld = debugHook;

export function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(
      text.replace(/ x /g, ' times ').replace(/ \/ /g, ' divided by ').replace(/(\d)\/(\d)/g, '$1 over $2').replace(/\?/g, '?'),
    );
    u.rate = 0.92;
    synth.speak(u);
  } catch {
    /* Speech not available on this device. */
  }
}

/**
 * Full-screen question overlay. Shows the question, takes an answer
 * (number pad or multiple choice), then shows right/wrong + the correct
 * answer and explanation before calling `done`.
 */
export class QuestionPanel {
  private root: Phaser.GameObjects.Container;
  private typed = '';
  private display?: Phaser.GameObjects.Text;
  private answered = false;

  constructor(
    private scene: Phaser.Scene,
    private q: Question,
    private opts: { header?: string; readAloud?: boolean; done: (correct: boolean) => void },
  ) {
    this.root = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);
    this.build();
    // Exposed for automated play-testing.
    debugHook.q = q;
  }

  private build() {
    const { scene, q, root } = this;
    const shade = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    root.add(shade);
    root.add(panel(scene, 40, 18, W - 80, H - 36, 0x1d1730, 0xffd24a));

    const topicName = (q.subject === 'math' ? MATH_TOPICS : READING_TOPICS)[q.topic] ?? q.topic;
    const tagColor = q.subject === 'math' ? '#7fd3ff' : '#ffb36b';
    root.add(txt(scene, 64, 32, `${q.subject === 'math' ? 'MATH' : 'READING'}  -  ${topicName}`, 16, tagColor));
    if (this.opts.header) root.add(txt(scene, W - 64, 32, this.opts.header, 16, '#ffd24a').setOrigin(1, 0));

    const isNumber = q.input === 'number';
    const promptW = isNumber ? 470 : W - 150;
    const long = q.prompt.length > 170;
    const prompt = txt(scene, 64, 62, q.prompt, long ? 19 : q.prompt.length > 90 ? 23 : 30, C.text, {
      wordWrap: { width: promptW, useAdvancedWrap: true },
      lineSpacing: 6,
    });
    root.add(prompt);

    const speaker = button(scene, W - 86, 78, 56, 44, 'Say', () => speak(q.prompt), { size: 16, color: 0x2e5a7a });
    root.add(speaker);
    if (this.opts.readAloud) speak(q.prompt);

    if (isNumber) this.buildNumberPad();
    else this.buildChoices(Math.max(prompt.y + prompt.height + 24, long ? 300 : 230));
  }

  private buildNumberPad() {
    const { scene, root } = this;
    // Answer box on the left under the question, keypad on the right.
    root.add(panel(scene, 70, 380, 420, 70, 0x0f0b1a, 0x7fd3ff));
    this.display = txt(scene, 280, 415, '?', 40, '#ffffff').setOrigin(0.5);
    root.add(this.display);

    const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'DEL', '0', 'GO'];
    const kx = 560;
    const ky = 120;
    const kw = 104;
    const kh = 82;
    keys.forEach((k, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const color = k === 'GO' ? 0x2f9a4a : k === 'DEL' ? 0x8a3a3a : 0x4b3a78;
      const b = button(scene, kx + col * (kw + 10) + kw / 2, ky + row * (kh + 10) + kh / 2, kw, kh, k, () => this.key(k), {
        color,
        size: k.length > 1 ? 22 : 34,
      });
      root.add(b);
    });

    // Physical keyboard support (handy on tablets with keyboards and for testing).
    const onKey = (e: KeyboardEvent) => {
      if (this.answered) return;
      if (/^[0-9]$/.test(e.key)) this.key(e.key);
      else if (e.key === 'Backspace') this.key('DEL');
      else if (e.key === 'Enter') this.key('GO');
    };
    scene.input.keyboard?.on('keydown', onKey);
    this.root.once('destroy', () => scene.input.keyboard?.off('keydown', onKey));
  }

  private key(k: string) {
    if (this.answered) return;
    if (k === 'DEL') this.typed = this.typed.slice(0, -1);
    else if (k === 'GO') {
      if (this.typed.length) this.submit(this.typed);
      return;
    } else if (this.typed.length < 9) this.typed += k;
    this.display?.setText(this.typed.length ? Number(this.typed).toLocaleString('en-US') : '?');
  }

  private buildChoices(top: number) {
    const { scene, root, q } = this;
    const choices = q.choices ?? [];
    debugHook.choicePos = [];
    const cols = choices.length <= 2 ? choices.length : 2;
    const bw = cols === 1 ? 500 : 400;
    const bh = 76;
    const gap = 18;
    const totalW = cols * bw + (cols - 1) * gap;
    const rows = Math.ceil(choices.length / cols);
    const y0 = Math.min(top, H - 40 - rows * (bh + gap));
    choices.forEach((ch, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const b = button(
        scene,
        W / 2 - totalW / 2 + col * (bw + gap) + bw / 2,
        y0 + row * (bh + gap) + bh / 2,
        bw,
        bh,
        ch,
        () => this.submit(ch),
        { size: ch.length > 20 ? 22 : 28, color: 0x3d3266 },
      );
      root.add(b);
      debugHook.choicePos[i] = { x: b.x, y: b.y };
    });
  }

  private submit(given: string) {
    if (this.answered) return;
    this.answered = true;
    const correct = isCorrect(this.q, given);
    this.showResult(correct, given);
  }

  private showResult(correct: boolean, given: string) {
    const { scene, q } = this;
    const res = scene.add.container(0, 0).setDepth(3100).setScrollFactor(0);
    res.add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0).setInteractive());
    res.add(panel(scene, 110, 90, W - 220, H - 180, correct ? 0x123a22 : 0x3a1a22, correct ? 0x5ef07a : 0xff8a6b));

    const title = correct ? pickOne(['Correct!', 'Awesome!', 'You got it!', 'Great job!', 'Nailed it!']) : 'Not quite!';
    const head = txt(scene, W / 2, 130, title, 44, correct ? C.good : '#ffb36b').setOrigin(0.5);
    res.add(head);
    scene.tweens.add({ targets: head, scale: { from: 0.6, to: 1 }, duration: 260, ease: 'Back.Out' });

    const answerLine = correct
      ? `Answer: ${display(q.answer, q)}\nFULL damage!`
      : `You said: ${display(given, q)}\nRight answer: ${display(q.answer, q)}\n(Half damage this time)`;
    const ans = txt(scene, W / 2, 190, answerLine, 23, '#ffffff', {
      align: 'center',
      wordWrap: { width: W - 280, useAdvancedWrap: true },
      lineSpacing: 4,
    }).setOrigin(0.5, 0);
    res.add(ans);
    res.add(
      txt(scene, W / 2, ans.y + ans.height + 18, q.explanation, 20, '#e8e0ff', {
        align: 'center',
        wordWrap: { width: W - 280, useAdvancedWrap: true },
        lineSpacing: 4,
      }).setOrigin(0.5, 0),
    );
    if (!correct) speakIfOn(this.opts.readAloud, `The answer is ${q.answer}. ${q.explanation}`);

    const go = button(scene, W / 2, H - 135, 260, 64, correct ? 'Attack!' : 'Got it', () => {
      res.destroy();
      this.root.destroy();
      this.opts.done(correct);
    }, { color: correct ? 0x2f9a4a : 0x8a5a2a, size: 28 });
    go.setAlpha(0).disableInteractive();
    res.add(go);
    // Short pause so the child actually reads the result before tapping on.
    scene.time.delayedCall(correct ? 350 : 900, () => {
      go.setInteractive({ useHandCursor: true });
      scene.tweens.add({ targets: go, alpha: 1, duration: 200 });
    });
  }
}

function display(ans: string, q: Question): string {
  if (q.input === 'number' && /^\d+$/.test(ans)) return Number(ans).toLocaleString('en-US');
  return ans;
}

function pickOne<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

function speakIfOn(on: boolean | undefined, s: string) {
  if (on) speak(s);
}

