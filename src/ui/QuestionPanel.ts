import Phaser from 'phaser';
import type { Question } from '../questions/types';
import { isCorrect, teacherHelp } from '../questions/engine';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { duckMusic, sfx } from '../audio/audio';
import { inApp } from '../util/platform';
import { topicLabel } from '../questions/labels';
import { fmtNum, getLang, speechLang, tr } from '../i18n';
import { C, H, W, button, panel, txt } from './widgets';
import { PaperPanel } from './paperPanel';

const debugHook: { q?: Question; choicePos: { x: number; y: number }[] } = { choicePos: [] };
(window as unknown as { __ld: typeof debugHook }).__ld = debugHook;

let speechToken = 0;

/**
 * Read text out loud. With `duck`, the music goes down to a quarter while
 * the voice speaks, then comes back. The Android app has no browser voice,
 * so it uses the phone's own text-to-speech.
 */
export function speak(text: string, duck = false) {
  const token = ++speechToken;
  const up = () => duck && token === speechToken && duckMusic(false);
  if (duck) {
    duckMusic(true);
    // If the device never says it finished, bring the music back anyway.
    setTimeout(up, 1500 + text.length * 180);
  }
  const words = speechText(text);
  if (inApp()) {
    void TextToSpeech.stop()
      .catch(() => undefined)
      .then(() => TextToSpeech.speak({ text: words, lang: speechLang(), rate: duck ? 0.8 : 0.95 }))
      .then(up, up);
    return;
  }
  try {
    const synth = window.speechSynthesis;
    if (!synth) return up();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(words);
    u.lang = speechLang();
    u.rate = duck ? 0.8 : 0.92;
    u.onend = up;
    u.onerror = up;
    synth.speak(u);
  } catch {
    /* Speech not available on this device. */
    up();
  }
}

/** Spell out math symbols so the speech voice reads them in the current language. */
export function speechText(text: string): string {
  if (getLang() === 'fr') {
    return text
      .replace(/ x /g, ' fois ')
      .replace(/×/g, ' fois ')
      .replace(/÷/g, ' divisé par ')
      .replace(/ \/ /g, ' divisé par ')
      .replace(/(\d)\/(\d)/g, '$1 sur $2')
      .replace(/_+/g, ' blanc ')
      .replace(/¢/g, ' cents')
      .replace(/\$/g, ' dollars');
  }
  return text
    .replace(/ x /g, ' times ')
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/ \/ /g, ' divided by ')
    .replace(/(\d)\/(\d)/g, '$1 over $2')
    .replace(/_+/g, ' blank ');
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
  private paper?: PaperPanel;

  constructor(
    private scene: Phaser.Scene,
    private q: Question,
    private opts: {
      header?: string;
      readAloud?: boolean;
      done: (correct: boolean) => void;
      /** Text for other games (default: battle wording). {answer}/{given} are filled in. */
      result?: { right: string; wrong: string; go: string };
    },
  ) {
    this.root = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);
    this.root.once('destroy', () => this.paper?.close());
    this.build();
    // Exposed for automated play-testing.
    debugHook.q = q;
  }

  private build() {
    const { scene, q, root } = this;
    const shade = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    root.add(shade);
    root.add(panel(scene, 40, 18, W - 80, H - 36, 0x1d1730, 0xffd24a));

    const topicName = topicLabel(q.topic);
    const tagColor = q.subject === 'math' ? '#7fd3ff' : '#ffb36b';
    root.add(txt(scene, 64, 32, `${q.subject === 'math' ? tr('MATH') : tr('READING')}  -  ${topicName}`, 16, tagColor));
    if (this.opts.header) root.add(txt(scene, W - 64, 32, this.opts.header, 16, '#ffd24a').setOrigin(1, 0));
    // Missed questions come back on purpose; say so, so it doesn't feel like a glitch.
    if (q.isRetry) root.add(txt(scene, W / 2 + 60, 32, tr("Let's try this one again!"), 16, '#ffb36b').setOrigin(0.5, 0));

    if (q.input === 'text') {
      this.buildSpelling();
      return;
    }
    const isNumber = q.input === 'number';
    const promptW = isNumber ? 470 : W - 270;
    const long = q.prompt.length > 170;
    const prompt = txt(scene, 64, 62, q.prompt, long ? 19 : q.prompt.length > 90 ? 23 : 30, C.text, {
      wordWrap: { width: promptW, useAdvancedWrap: true },
      lineSpacing: 6,
    });
    root.add(prompt);

    // Read-aloud and teacher help: right column for choices, under the question for the number pad.
    if (isNumber) {
      const y = Math.min(345, Math.max(prompt.y + prompt.height + 34, 320));
      root.add(button(scene, 120, y, 100, 46, tr('Say'), () => speak(q.prompt), { size: 18, color: 0x2e5a7a }));
      root.add(button(scene, 310, y, 250, 46, tr('I need a teacher!'), () => this.showTeacher(), { size: 19, color: 0x7a4ab0 }));
    } else {
      root.add(button(scene, W - 130, 84, 130, 40, tr('Say'), () => speak(q.prompt), { size: 17, color: 0x2e5a7a }));
      root.add(button(scene, W - 130, 142, 130, 58, tr('I need a\nteacher!'), () => this.showTeacher(), { size: 17, color: 0x7a4ab0 }));
    }
    if (this.opts.readAloud) speak(q.prompt);

    if (isNumber) this.buildNumberPad();
    else this.buildChoices(Math.max(prompt.y + prompt.height + 24, long ? 300 : 230));
  }

  /**
   * Spelling test: the word is read out loud (music turned down), the child
   * types it on a letter keyboard. "Say it again" repeats the word.
   */
  private buildSpelling() {
    const { scene, root, q } = this;
    const word = q.say ?? q.answer;
    const sayIt = () => speak(word, true);
    root.add(txt(scene, 64, 66, q.prompt, 28, C.text, { wordWrap: { width: 600, useAdvancedWrap: true } }));
    root.add(button(scene, W - 150, 84, 210, 52, tr('Say it again'), sayIt, { size: 20, color: 0x2e5a7a }));
    root.add(button(scene, W - 150, 146, 210, 52, tr('I need a teacher!'), () => this.showTeacher(), { size: 17, color: 0x7a4ab0 }));
    scene.time.delayedCall(350, sayIt);

    root.add(panel(scene, 110, 176, 560, 64, 0x0f0b1a, 0x7fd3ff));
    this.display = txt(scene, 390, 208, '?', 38, '#ffffff').setOrigin(0.5);
    root.add(this.display);

    const rows = ['qwertyuiop', 'asdfghjkl', "zxcvbnm'"];
    if (getLang() === 'fr') rows.push('éèêàâçîôûë');
    const kw = 70;
    const kh = 56;
    rows.forEach((row, r) => {
      const x0 = 70 + (r === 1 ? 38 : r === 2 ? 76 : 0) + kw / 2;
      [...row].forEach((ch, i) =>
        root.add(button(scene, x0 + i * (kw + 6), 290 + r * (kh + 8), kw, kh, ch, () => this.letter(ch), { size: 26 })),
      );
    });
    const right = 70 + 76 + 8 * (kw + 6);
    root.add(button(scene, right + 52, 290 + 2 * (kh + 8), 110, kh, tr('DEL'), () => this.letter('DEL'), { size: 20, color: 0x8a3a3a }));
    root.add(button(scene, W - 120, 220, 150, 64, tr('GO'), () => this.letter('GO'), { size: 28, color: 0x2f9a4a }));

    const onKey = (e: KeyboardEvent) => {
      if (this.answered) return;
      if (/^[\p{L}'-]$/u.test(e.key)) this.letter(e.key.toLowerCase());
      else if (e.key === 'Backspace') this.letter('DEL');
      else if (e.key === 'Enter') this.letter('GO');
    };
    scene.input.keyboard?.on('keydown', onKey);
    this.root.once('destroy', () => scene.input.keyboard?.off('keydown', onKey));
  }

  private letter(k: string) {
    if (this.answered) return;
    if (k === 'DEL') this.typed = this.typed.slice(0, -1);
    else if (k === 'GO') {
      if (this.typed.trim().length) this.submit(this.typed);
      return;
    } else if (this.typed.length < 24) this.typed += k;
    this.display?.setText(this.typed.length ? this.typed : '?');
  }

  /** Explains how to think about the question, without giving the answer. */
  private showTeacher() {
    if (this.answered) return;
    sfx('teacher');
    const { scene, q } = this;
    const help = teacherHelp(q);
    const t = scene.add.container(0, 0).setDepth(3200).setScrollFactor(0);
    t.add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive());
    t.add(panel(scene, 90, 70, W - 180, H - 140, 0x241a3a, 0xb98aff));
    const teacher = scene.add.image(160, 150, 'hero_mage').setScale(6).setFlipX(true);
    t.add(teacher);
    scene.tweens.add({ targets: teacher, y: 142, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    t.add(txt(scene, 220, 96, tr('Teacher says:'), 26, '#d7b8ff'));
    t.add(
      txt(scene, 220, 140, help, 21, '#ffffff', { wordWrap: { width: W - 340, useAdvancedWrap: true }, lineSpacing: 6 }),
    );
    t.add(button(scene, W / 2 - 110, H - 112, 170, 54, tr('Read it to me'), () => speak(help), { size: 18, color: 0x2e5a7a }));
    t.add(button(scene, W / 2 + 110, H - 112, 200, 54, tr('Got it! Let me try'), () => t.destroy(), { size: 18, color: 0x2f9a4a }));
    this.root.once('destroy', () => t.destroy());
    if (this.opts.readAloud) speak(help);
  }

  private buildNumberPad() {
    const { scene, root } = this;
    // Answer box on the left under the question, keypad on the right.
    root.add(panel(scene, 70, 380, 420, 70, 0x0f0b1a, 0x7fd3ff));
    this.display = txt(scene, 280, 415, '?', 40, '#ffffff').setOrigin(0.5);
    root.add(this.display);
    // Scrap paper for working it out in columns.
    root.add(button(scene, 280, 486, 220, 44, tr('Use Paper'), () => {
      if (this.answered) return;
      this.paper = new PaperPanel(scene, this.q, (ans) => {
        this.typed = ans.slice(0, 9);
        this.display?.setText(fmtNum(Number(this.typed)));
      });
    }, { size: 19, color: 0x7a6a3a }));

    const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'DEL', '0', 'GO'];
    const kx = 560;
    const ky = 120;
    const kw = 104;
    const kh = 82;
    keys.forEach((k, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const color = k === 'GO' ? 0x2f9a4a : k === 'DEL' ? 0x8a3a3a : 0x4b3a78;
      const label = k === 'DEL' ? tr('DEL') : k === 'GO' ? tr('GO') : k;
      const b = button(scene, kx + col * (kw + 10) + kw / 2, ky + row * (kh + 10) + kh / 2, kw, kh, label, () => this.key(k), {
        color,
        size: label.length > 4 ? 20 : label.length > 1 ? 22 : 34,
      });
      root.add(b);
    });

    // Physical keyboard support (handy on tablets with keyboards and for testing).
    const onKey = (e: KeyboardEvent) => {
      // The scrap paper has its own keys while it's open.
      if (this.answered || (this.paper && !this.paper.destroyed)) return;
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
    this.display?.setText(this.typed.length ? fmtNum(Number(this.typed)) : '?');
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
    sfx(correct ? 'correct' : 'wrong');
    this.showResult(correct, given);
  }

  private showResult(correct: boolean, given: string) {
    const { scene, q } = this;
    const res = scene.add.container(0, 0).setDepth(3100).setScrollFactor(0);
    res.add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0).setInteractive());
    res.add(panel(scene, 110, 90, W - 220, H - 180, correct ? 0x123a22 : 0x3a1a22, correct ? 0x5ef07a : 0xff8a6b));

    const title = correct ? pickOne([tr('Correct!'), tr('Awesome!'), tr('You got it!'), tr('Great job!'), tr('Nailed it!')]) : tr('Not quite!');
    const head = txt(scene, W / 2, 130, title, 44, correct ? C.good : '#ffb36b').setOrigin(0.5);
    res.add(head);
    scene.tweens.add({ targets: head, scale: { from: 0.6, to: 1 }, duration: 260, ease: 'Back.Out' });

    const r = this.opts.result;
    const vals = { given: display(given, q), answer: display(q.answer, q) };
    const answerLine = correct
      ? r
        ? r.right.replace('{answer}', vals.answer)
        : tr('Answer: {answer}\nFULL damage!', { answer: vals.answer })
      : r
        ? r.wrong.replace('{given}', vals.given).replace('{answer}', vals.answer)
        : tr('You said: {given}\nRight answer: {answer}\n(Half damage this time)', vals);
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
    if (!correct) speakIfOn(this.opts.readAloud, tr('The answer is {answer}. {explanation}', { answer: q.answer, explanation: q.explanation }));

    const go = button(scene, W / 2, H - 135, 260, 64, correct ? (this.opts.result?.go ?? tr('Attack!')) : tr('Got it'), () => {
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
  if (q.input === 'number' && /^\d+$/.test(ans)) return fmtNum(Number(ans));
  return ans;
}

function pickOne<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

function speakIfOn(on: boolean | undefined, s: string) {
  if (on) speak(s);
}

