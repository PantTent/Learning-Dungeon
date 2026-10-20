// "Use Paper": a sheet of scrap paper for working a problem out in columns,
// like at school. Boxes above the numbers hold carries and borrows, tapping
// a digit crosses it out, and the answer goes in the boxes under the line.
// "Submit" copies the answer into the question's answer box (the child still
// presses GO to answer).
import Phaser from 'phaser';
import type { Question } from '../questions/types';
import { tr } from '../i18n';
import { H, W, button, txt } from './widgets';
import { parseColumns, type Op } from '../questions/columns';

interface Box {
  value: string;
  max: number;
}

/** Ink and paper colors. */
const INK = '#1a1424';
const PAPER = 0xfdfbf2;
const LINES = 0xc8d8f0;

export class PaperPanel {
  private root: Phaser.GameObjects.Container;
  private sheet?: Phaser.GameObjects.Container;
  private cols: number;
  private a: string;
  private b: string;
  private op: Op | '';
  /** Numbers come from the question (fixed) or the child writes them in. */
  private given: boolean;
  private carry: Box[];
  private topRow: Box[];
  private bottomRow: Box[];
  /** Extra working rows (for multiplying big numbers), then the answer row last. */
  private work: Box[][];
  private struck = new Set<string>();
  private sel: { row: Box[]; i: number } | null = null;

  constructor(
    private scene: Phaser.Scene,
    q: Question,
    private onSubmit: (answer: string) => void,
  ) {
    const p = parseColumns(q.prompt);
    this.given = !!p;
    this.a = p?.a ?? '';
    this.b = p?.b ?? '';
    this.op = p?.op ?? '';
    const width = p ? Math.max(p.a.length, p.b.length) + (p.op === '×' ? Math.min(p.b.length, 3) : 1) : 5;
    this.cols = Math.min(8, Math.max(3, width));
    const row = (max: number) => Array.from({ length: this.cols }, () => ({ value: '', max }));
    this.carry = row(2);
    this.topRow = row(1);
    this.bottomRow = row(1);
    this.work = [row(1)];
    this.root = scene.add.container(0, 0).setDepth(3300).setScrollFactor(0);
    this.root.add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
    this.buildKeys();
    this.draw();
    // Start in the ones column of the answer.
    this.select(this.answerRow(), this.cols - 1);
  }

  private answerRow(): Box[] {
    return this.work[this.work.length - 1];
  }

  /** Cell size and where column i sits (numbers line up on the right). */
  private colX(i: number) {
    const cw = this.cols > 6 ? 46 : 54;
    const x0 = 360 - (this.cols * cw) / 2;
    return { x: x0 + i * cw + cw / 2, cw };
  }

  private draw() {
    const { scene } = this;
    this.sheet?.destroy();
    const s = scene.add.container(0, 0);
    this.sheet = s;
    this.root.add(s);
    // The page, with faint blue lines like a notebook.
    const top = 18;
    const rowsH = 4 + this.work.length;
    const pageH = Math.min(H - 36, 150 + rowsH * 62);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(124, top + 6, 480, pageH, 8);
    g.fillStyle(PAPER, 1).fillRoundedRect(120, top, 480, pageH, 8);
    g.lineStyle(1, LINES, 1);
    for (let y = top + 40; y < top + pageH - 10; y += 31) g.lineBetween(130, y, 590, y);
    g.lineStyle(2, 0xf0a0a0, 1).lineBetween(160, top + 8, 160, top + pageH - 8);
    s.add(g);
    s.add(txt(scene, 360, top + 12, this.given ? tr('Work it out here!') : tr('Write the numbers, then work it out!'), 17, '#5a4a7a').setOrigin(0.5, 0));

    let y = top + 70;
    // Little boxes for carrying and borrowing.
    this.boxRow(s, this.carry, y, 40, 36, 20);
    y += 56;
    this.numberRow(s, this.topRow, this.a, 'a', y);
    y += 56;
    if (this.op) s.add(txt(scene, this.colX(0).x - this.colX(0).cw, y, this.op, 40, INK).setOrigin(0.5));
    if (!this.given) this.opPicker(s, y);
    this.numberRow(s, this.bottomRow, this.b, 'b', y);
    y += 34;
    const left = this.colX(0).x - this.colX(0).cw * 1.4;
    const right = this.colX(this.cols - 1).x + this.colX(0).cw / 2;
    const line = scene.add.graphics();
    line.lineStyle(4, 0x1a1424, 1).lineBetween(left, y, right, y);
    s.add(line);
    y += 38;
    this.work.forEach((row, r) => {
      this.boxRow(s, row, y, 44, 48, 30);
      // A thin line above the final answer when there are working rows.
      if (r === this.work.length - 2) {
        const l2 = scene.add.graphics();
        l2.lineStyle(3, 0x1a1424, 1).lineBetween(left, y + 31, right, y + 31);
        s.add(l2);
        y += 8;
      }
      y += 58;
    });

    // Paper buttons.
    const by = top + pageH - 30;
    s.add(button(scene, 220, by, 150, 40, tr('+ Row'), () => this.addRow(), { size: 16, color: 0x5a6a8a }).setEnabled(this.work.length < 4));
    s.add(button(scene, 400, by, 170, 46, tr('SUBMIT'), () => this.submit(), { size: 22, color: 0x7ac030, textColor: INK }));
    s.add(button(scene, 548, by, 80, 40, tr('Close'), () => this.close(), { size: 15, color: 0x7a5a5a }));
  }

  /** A row of boxes the child can type in. */
  private boxRow(s: Phaser.GameObjects.Container, row: Box[], y: number, w: number, h: number, size: number) {
    row.forEach((box, i) => {
      const { x } = this.colX(i);
      const on = this.sel?.row === row && this.sel.i === i;
      const g = this.scene.add.graphics();
      g.fillStyle(on ? 0xfff0a0 : 0xffffff, 1).fillRect(x - w / 2, y - h / 2, w, h);
      g.lineStyle(on ? 4 : 2, on ? 0xe0a020 : 0x1a1424, 1).strokeRect(x - w / 2, y - h / 2, w, h);
      s.add(g);
      s.add(txt(this.scene, x, y, box.value, box.max > 1 && box.value.length > 1 ? size - 4 : size, INK).setOrigin(0.5));
      const z = this.scene.add.zone(x, y, w + 4, h + 4).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.select(row, i));
      s.add(z);
    });
  }

  /** The numbers being worked on: printed (tap to cross out) or boxes to write them in. */
  private numberRow(s: Phaser.GameObjects.Container, row: Box[], digits: string, key: string, y: number) {
    if (!this.given) {
      this.boxRow(s, row, y, 44, 48, 30);
      return;
    }
    const pad = this.cols - digits.length;
    [...digits].forEach((d, k) => {
      const i = pad + k;
      const { x } = this.colX(i);
      s.add(txt(this.scene, x, y, d, 40, INK).setOrigin(0.5));
      const id = `${key}${i}`;
      if (this.struck.has(id)) {
        const g = this.scene.add.graphics();
        g.lineStyle(4, 0xd02a2a, 1).lineBetween(x - 16, y + 20, x + 16, y - 20);
        s.add(g);
      }
      const z = this.scene.add.zone(x, y, 46, 50).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => {
        if (this.struck.has(id)) this.struck.delete(id);
        else this.struck.add(id);
        // Borrowing: after crossing out, write in the box above.
        if (key === 'a' && this.struck.has(id)) this.sel = { row: this.carry, i };
        this.draw();
      });
      s.add(z);
    });
  }

  /** When the child writes the numbers in, they pick the sign too. */
  private opPicker(s: Phaser.GameObjects.Container, y: number) {
    (['+', '−', '×'] as Op[]).forEach((op, k) => {
      s.add(button(this.scene, 140, y - 44 + k * 44, 34, 38, op, () => {
        this.op = op;
        this.draw();
      }, { size: 20, color: this.op === op ? 0x2f9a4a : 0x5a4a7a }));
    });
  }

  private buildKeys() {
    const { scene, root } = this;
    const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'DEL', '0', 'CLR'];
    const kx = 640;
    const ky = 150;
    keys.forEach((k, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const label = k === 'DEL' ? tr('DEL') : k === 'CLR' ? tr('Clear') : k;
      root.add(button(scene, kx + col * 98 + 44, ky + row * 86 + 38, 88, 76, label, () => this.key(k), {
        size: k.length > 1 ? 18 : 32,
        color: k === 'DEL' ? 0x8a3a3a : k === 'CLR' ? 0x6a5a2a : 0x4b3a78,
      }));
    });
    root.add(txt(scene, 787, 112, tr('Tap a box, then a number'), 15, '#ffe9a0').setOrigin(0.5));
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) this.key(e.key);
      else if (e.key === 'Backspace') this.key('DEL');
      else if (e.key === 'Enter') this.submit();
      else if (e.key === 'Escape') this.close();
      else if (e.key === 'ArrowLeft' && this.sel) this.select(this.sel.row, Math.max(0, this.sel.i - 1));
      else if (e.key === 'ArrowRight' && this.sel) this.select(this.sel.row, Math.min(this.cols - 1, this.sel.i + 1));
    };
    scene.input.keyboard?.on('keydown', onKey);
    root.once('destroy', () => scene.input.keyboard?.off('keydown', onKey));
  }

  private select(row: Box[], i: number) {
    this.sel = { row, i };
    this.draw();
  }

  private key(k: string) {
    const sel = this.sel;
    if (!sel) return;
    const box = sel.row[sel.i];
    if (k === 'DEL') box.value = box.value.slice(0, -1);
    else if (k === 'CLR') box.value = '';
    else if (box.value.length < box.max) {
      box.value += k;
      // One digit per box: numbers are written left to right, answers right to left.
      const writing = sel.row === this.topRow || sel.row === this.bottomRow;
      if (box.max === 1) {
        if (writing && sel.i < this.cols - 1) this.sel = { row: sel.row, i: sel.i + 1 };
        else if (!writing && sel.i > 0) this.sel = { row: sel.row, i: sel.i - 1 };
      }
    }
    this.draw();
  }

  private addRow() {
    if (this.work.length >= 4) return;
    this.work.splice(this.work.length - 1, 0, Array.from({ length: this.cols }, () => ({ value: '', max: 1 })));
    this.draw();
  }

  /** The answer row as a number: empty boxes on the left are ignored, gaps count as 0. */
  answer(): string {
    const digits = this.answerRow().map((b) => b.value);
    const first = digits.findIndex((d) => d !== '');
    if (first < 0) return '';
    let end = digits.length;
    while (end > first && digits[end - 1] === '') end--;
    return digits.slice(first, end).map((d) => d || '0').join('').replace(/^0+(?=\d)/, '');
  }

  private submit() {
    const a = this.answer();
    this.close();
    if (a) this.onSubmit(a);
  }

  close() {
    this.root.destroy();
  }

  get destroyed() {
    return !this.root.active;
  }
}
