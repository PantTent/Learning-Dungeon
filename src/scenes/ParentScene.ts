import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { getClass } from '../data/classes';
import { MATH_TOPICS } from '../questions/math';
import { READING_TOPICS } from '../questions/readingBank';
import { loadProfiles, saveProfile, type Profile } from '../state/profile';
import { C, H, W, button, panel, txt } from '../ui/widgets';

/** Progress report + settings for grown-ups. */
export class ParentScene extends Phaser.Scene {
  private index = 0;
  private layer?: Phaser.GameObjects.Container;
  private scrollY = 0;

  constructor() {
    super('Parent');
  }

  create() {
    playMusic('title');
    this.index = 0;
    this.scrollY = 0;
    this.cameras.main.setBackgroundColor(0x14101e);
    this.draw();
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scroll(dy));
    let lastY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (lastY = p.y));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      this.scroll(lastY - p.y);
      lastY = p.y;
    });
  }

  private scroll(dy: number) {
    if (!this.layer) return;
    const list = this.layer.getByName('list') as Phaser.GameObjects.Container | null;
    if (!list) return;
    const max = Math.max(0, (list.getData('height') as number) - 300);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, max);
    list.y = -this.scrollY;
  }

  private draw() {
    this.layer?.destroy();
    const c = this.add.container(0, 0);
    this.layer = c;
    const profiles = loadProfiles();
    c.add(txt(this, 24, 14, 'Parent Dashboard', 28, '#ffd24a'));
    c.add(button(this, W - 80, 34, 120, 46, 'Back', () => this.scene.start('Title'), { size: 20, color: 0x3a3450 }));
    if (!profiles.length) {
      c.add(txt(this, W / 2, H / 2, 'No heroes yet. Create one from the title screen!', 22, C.dim).setOrigin(0.5));
      return;
    }
    this.index = Math.min(this.index, profiles.length - 1);
    profiles.forEach((p, i) => {
      c.add(button(this, 360 + i * 140, 34, 130, 42, p.name, () => {
        this.index = i;
        this.scrollY = 0;
        this.draw();
      }, { size: 18, color: i === this.index ? 0x2f9a4a : 0x4b3a78 }));
    });
    const p = profiles[this.index];
    this.summary(c, p);
    this.settings(c, p);
    this.topicList(c, p);
  }

  private summary(c: Phaser.GameObjects.Container, p: Profile) {
    const L = p.learning;
    const pct = L.totalAsked ? Math.round((100 * L.totalCorrect) / L.totalAsked) : 0;
    c.add(panel(this, 16, 66, 440, 128));
    c.add(txt(this, 32, 76, `${p.name} - Level ${p.level} ${getClass(p.classId).name} - Grade ${p.settings.grade}`, 20));
    c.add(txt(this, 32, 106, `Questions answered: ${L.totalAsked}   Correct: ${L.totalCorrect} (${pct}%)`, 16, C.text));
    c.add(txt(this, 32, 130, `Math level: ${L.level.math.toFixed(1)} / 3    Reading level: ${L.level.reading.toFixed(1)} / 3`, 16, C.dim));
    const days = Object.entries(L.days).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 4);
    c.add(
      txt(this, 32, 154, days.length ? 'Recent: ' + days.map(([d, s]) => `${d.slice(5)} ${s.correct}/${s.asked}`).join(',  ') : 'No play days yet.', 14, C.dim),
    );
  }

  private settings(c: Phaser.GameObjects.Container, p: Profile) {
    c.add(panel(this, 470, 66, W - 486, 128));
    c.add(txt(this, 486, 76, 'Question mix (% math, rest is reading)', 16, C.text));
    [100, 75, 60, 50, 25, 0].forEach((v, i) => {
      c.add(button(this, 520 + i * 72, 122, 64, 38, `${v}`, () => {
        p.settings.mathPercent = v;
        saveProfile(p);
        this.draw();
      }, { size: 16, color: p.settings.mathPercent === v ? 0x2f9a4a : 0x4b3a78 }));
    });
    c.add(button(this, 600, 168, 240, 36, `Read questions aloud: ${p.settings.readAloud ? 'ON' : 'OFF'}`, () => {
      p.settings.readAloud = !p.settings.readAloud;
      saveProfile(p);
      this.draw();
    }, { size: 15, color: p.settings.readAloud ? 0x2f9a4a : 0x4b3a78 }));
  }

  private topicList(c: Phaser.GameObjects.Container, p: Profile) {
    const mask = this.make.graphics({}, false).fillRect(0, 206, W, H - 206);
    const list = this.add.container(0, 0).setName('list');
    list.setMask(mask.createGeometryMask());
    c.add(list);
    const entries = Object.entries(p.learning.topics).sort((a, b) => a[1].correct / a[1].asked - b[1].correct / b[1].asked);
    let y = 212;
    list.add(txt(this, 24, y, entries.length ? 'By topic (weakest first) - drag to scroll' : 'Topic results appear here after a few battles.', 17, '#ffd24a'));
    y += 32;
    for (const [topic, s] of entries) {
      const label = (s.subject === 'math' ? MATH_TOPICS : READING_TOPICS)[topic] ?? topic;
      const pct = s.asked ? s.correct / s.asked : 0;
      const color = pct >= 0.8 ? 0x3ed34a : pct >= 0.6 ? 0xffc23a : 0xe0504a;
      list.add(txt(this, 24, y, `${s.subject === 'math' ? 'Math' : 'Reading'}: ${label}`, 16, C.text));
      const g = this.add.graphics();
      g.fillStyle(0x0b0812, 1).fillRoundedRect(420, y + 3, 360, 16, 4);
      g.fillStyle(color, 1).fillRoundedRect(420, y + 3, Math.max(6, 360 * pct), 16, 4);
      list.add(g);
      list.add(txt(this, 800, y, `${Math.round(pct * 100)}%  (${s.correct}/${s.asked})`, 15, C.dim));
      y += 28;
    }
    list.setData('height', y - 206);
  }
}
