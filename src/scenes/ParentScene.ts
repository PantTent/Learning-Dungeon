import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { getClass } from '../data/classes';
import { allGroupIds, defaultGrade, gradeLabel, gradesFor } from '../questions/curriculum';
import { topicLabel } from '../questions/labels';
import { LANGS, fmtDec, fmtNum, setLang, tr, type Lang } from '../i18n';
import { loadProfiles, saveProfile, type Profile } from '../state/profile';
import { C, H, W, button, panel, txt } from '../ui/widgets';

/** Top of the scrolling topic list (the panels sit above it). */
const TOP = 246;

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
    const max = Math.max(0, (list.getData('height') as number) - (H - TOP));
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, max);
    list.y = -this.scrollY;
  }

  private draw() {
    this.layer?.destroy();
    const c = this.add.container(0, 0);
    this.layer = c;
    const profiles = loadProfiles();
    c.add(txt(this, 24, 14, tr('Parent Dashboard'), 28, '#ffd24a'));
    c.add(button(this, W - 80, 34, 120, 46, tr('Back'), () => this.scene.start('Title'), { size: 20, color: 0x3a3450 }));
    if (!profiles.length) {
      c.add(txt(this, W / 2, H / 2, tr('No heroes yet. Create one from the title screen!'), 22, C.dim).setOrigin(0.5));
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
    c.add(panel(this, 16, 66, 440, TOP - 78));
    c.add(txt(this, 32, 76, p.name, 22));
    c.add(
      txt(this, 32, 106, tr('Level {n} {cls} - Grade {g}', { n: p.level, cls: tr(getClass(p.classId).name), g: gradeLabel(p.settings.grade) }), 17, C.text),
    );
    c.add(txt(this, 32, 134, tr('Questions answered: {n}   Correct: {c} ({pct}%)', { n: fmtNum(L.totalAsked), c: fmtNum(L.totalCorrect), pct }), 16, C.text));
    c.add(txt(this, 32, 158, tr('Math level: {m} / 3    Reading level: {r} / 3', { m: fmtDec(L.level.math, 1), r: fmtDec(L.level.reading, 1) }), 16, C.dim));
    const days = Object.entries(L.days).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 4);
    c.add(
      txt(this, 32, 186, days.length ? tr('Recent: {list}', { list: days.map(([d, s]) => `${d.slice(5)} ${s.correct}/${s.asked}`).join(',  ') }) : tr('No play days yet.'), 14, C.dim, {
        wordWrap: { width: 410 },
      }),
    );
  }

  private settings(c: Phaser.GameObjects.Container, p: Profile) {
    const S = p.settings;
    c.add(panel(this, 470, 66, W - 486, TOP - 78));
    c.add(txt(this, 486, 74, tr('Question mix (% math, rest is reading)'), 16, C.text));
    [100, 75, 60, 50, 25, 0].forEach((v, i) => {
      c.add(button(this, 520 + i * 72, 114, 64, 34, `${v}`, () => {
        p.settings.mathPercent = v;
        saveProfile(p);
        this.draw();
      }, { size: 16, color: p.settings.mathPercent === v ? 0x2f9a4a : 0x4b3a78 }));
    });

    // School grade, in the hero's own language (1re-3e or 3-5).
    c.add(txt(this, 486, 158, tr('Grade:'), 17).setOrigin(0, 0.5));
    gradesFor(S.lang).forEach((g, i) => {
      c.add(button(this, 584 + i * 46, 158, 40, 34, gradeLabel(g, S.lang), () => {
        S.grade = g;
        saveProfile(p);
        this.draw();
      }, { size: 16, color: S.grade === g ? 0x2f9a4a : 0x4b3a78 }));
    });
    c.add(button(this, 880, 158, 128, 36, S.readAloud ? tr('Read aloud: ON') : tr('Read aloud: OFF'), () => {
      S.readAloud = !S.readAloud;
      saveProfile(p);
      this.draw();
    }, { size: 14, color: S.readAloud ? 0x2f9a4a : 0x4b3a78 }));

    // Questions language: switching starts that language's grades and topics.
    c.add(txt(this, 486, 202, tr('Questions in:'), 17).setOrigin(0, 0.5));
    LANGS.forEach((l, i) => {
      c.add(button(this, 712 + i * 128, 202, 116, 34, l.label, () => this.setHeroLang(p, l.id), {
        size: 16,
        color: S.lang === l.id ? 0x2f9a4a : 0x4b3a78,
      }));
    });
  }

  private setHeroLang(p: Profile, lang: Lang) {
    const S = p.settings;
    if (S.lang === lang) return;
    S.lang = lang;
    S.grade = defaultGrade(lang);
    S.groups = [...allGroupIds(lang)];
    S.focus = { multiply: [], divide: [] };
    setLang(lang);
    saveProfile(p);
    this.draw();
  }

  private topicList(c: Phaser.GameObjects.Container, p: Profile) {
    const mask = this.make.graphics({}, false).fillRect(0, TOP, W, H - TOP);
    const list = this.add.container(0, 0).setName('list');
    list.setMask(mask.createGeometryMask());
    c.add(list);
    const entries = Object.entries(p.learning.topics).sort((a, b) => a[1].correct / a[1].asked - b[1].correct / b[1].asked);
    let y = TOP + 6;
    list.add(txt(this, 24, y, entries.length ? tr('By topic (weakest first) - drag to scroll') : tr('Topic results appear here after a few battles.'), 17, '#ffd24a'));
    y += 32;
    for (const [topic, s] of entries) {
      const label = topicLabel(topic);
      const pct = s.asked ? s.correct / s.asked : 0;
      const color = pct >= 0.8 ? 0x3ed34a : pct >= 0.6 ? 0xffc23a : 0xe0504a;
      list.add(txt(this, 24, y, tr('{subject}: {topic}', { subject: s.subject === 'math' ? tr('Math') : tr('Reading'), topic: label }), 16, C.text));
      const g = this.add.graphics();
      g.fillStyle(0x0b0812, 1).fillRoundedRect(420, y + 3, 360, 16, 4);
      g.fillStyle(color, 1).fillRoundedRect(420, y + 3, Math.max(6, 360 * pct), 16, 4);
      list.add(g);
      list.add(txt(this, 800, y, `${Math.round(pct * 100)}%  (${s.correct}/${s.asked})`, 15, C.dim));
      y += 28;
    }
    list.setData('height', y - TOP);
  }
}
