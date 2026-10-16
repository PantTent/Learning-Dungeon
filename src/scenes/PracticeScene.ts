import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { defaultGrade, gradeLabel, gradesFor, groupsForGrade, topicGroups, type TopicGroup } from '../questions/curriculum';
import { tr } from '../i18n';
import { current, saveProfile } from '../state/profile';
import { C, W, H, button, panel, txt } from '../ui/widgets';
import { menuBackground } from './TitleScene';

/**
 * "What do you want to practice today?" Shown every time a hero is played,
 * so the child (or parent) can pick the grade and the topics.
 */
export class PracticeScene extends Phaser.Scene {
  private layer?: Phaser.GameObjects.Container;

  constructor() {
    super('Practice');
  }

  create() {
    playMusic('title');
    menuBackground(this);
    this.draw();
  }

  private draw() {
    this.layer?.destroy();
    const p = current();
    const s = p.settings;
    const c = this.add.container(0, 0);
    this.layer = c;

    c.add(txt(this, W / 2, 26, tr('What do you want to practice today, {name}?', { name: p.name }), 28, '#ffd24a').setOrigin(0.5));

    c.add(txt(this, W / 2 - 170, 76, tr('Grade:'), 22).setOrigin(1, 0.5));
    const grades = gradesFor(s.lang);
    grades.forEach((g, i) => {
      c.add(button(this, W / 2 - 110 + i * 82, 76, 72, 42, gradeLabel(g, s.lang), () => {
        s.grade = g;
        this.draw();
      }, { size: 22, color: s.grade === g ? 0x2f9a4a : 0x4b3a78 }));
    });
    const mid = defaultGrade(s.lang);
    const hint = s.grade === mid ? tr('(the full grade {g} set)', { g: gradeLabel(s.grade, s.lang) }) : s.grade < mid ? tr('(easier)') : tr('(harder)');
    c.add(txt(this, W / 2 + 140, 76, hint, 15, C.dim).setOrigin(0, 0.5));

    const groups = groupsForGrade(s.grade, s.lang);
    this.column(c, 24, 'math', groups.filter((g) => g.subject === 'math'));
    this.column(c, W / 2 + 6, 'reading', groups.filter((g) => g.subject === 'reading'));

    const visible = new Set(groups.map((g) => g.id));
    const chosen = s.groups.filter((id) => visible.has(id)).length;
    c.add(txt(this, 40, H - 52, chosen === 1 ? tr('1 topic group picked') : chosen ? tr('{n} topic groups picked', { n: chosen }) : tr('Pick at least one topic!'), 18, chosen ? C.dim : C.bad).setOrigin(0, 0.5));
    const go = button(this, W - 150, H - 50, 250, 64, tr("Let's go!"), () => {
      saveProfile(p);
      this.scene.start('Dungeon');
    }, { color: 0x2f9a4a, size: 28 });
    go.setEnabled(chosen > 0);
    c.add(go);
    c.add(button(this, W / 2 - 40, H - 50, 150, 48, tr('Back'), () => {
      saveProfile(p);
      this.scene.start('Title');
    }, { size: 20, color: 0x3a3450 }));
  }

  private column(c: Phaser.GameObjects.Container, x: number, subject: 'math' | 'reading', groups: TopicGroup[]) {
    const s = current().settings;
    const colW = W / 2 - 30;
    const isMath = subject === 'math';
    c.add(panel(this, x, 106, colW, 360, 0x1d1730, isMath ? 0x4a7ad0 : 0xd07a3a));
    c.add(txt(this, x + 16, 118, isMath ? tr('Math') : tr('Reading'), 24, isMath ? '#7fd3ff' : '#ffb36b'));
    const all = groups.every((g) => s.groups.includes(g.id));
    c.add(button(this, x + colW - 70, 134, 110, 34, all ? tr('None') : tr('All'), () => {
      const ids = groups.map((g) => g.id);
      s.groups = all ? s.groups.filter((id) => !ids.includes(id)) : [...new Set([...s.groups, ...ids])];
      this.draw();
    }, { size: 16, color: 0x3a3450 }));

    const chipW = (colW - 48) / 2;
    groups.forEach((g, i) => {
      const on = s.groups.includes(g.id);
      const cx = x + 16 + (i % 2) * (chipW + 16) + chipW / 2;
      const cy = 184 + Math.floor(i / 2) * 66;
      const focus = g.id === 'multiply' ? s.focus.multiply : g.id === 'divide' ? s.focus.divide : [];
      const label = focus.length ? `${g.label} (${focus.join(', ')})` : g.label;
      c.add(button(this, cx, cy, chipW, 56, `${on ? '✔ ' : ''}${label}`, () => {
        s.groups = on ? s.groups.filter((id) => id !== g.id) : [...s.groups, g.id];
        this.draw();
      }, { size: label.length > 18 ? 15 : 17, color: on ? 0x2f7a3a : 0x2a2340, textColor: on ? '#ffffff' : C.dim }));
    });

    // Focus practice: drill specific times tables (e.g. only the 5s).
    // Only the English groups have 'multiply' / 'divide'.
    if (isMath && s.lang === 'en') {
      const bw = (colW - 48) / 2;
      const m = s.focus.multiply;
      const d = s.focus.divide;
      c.add(button(this, x + 16 + bw / 2, 434, bw, 40, m.length ? tr('x tables: {list}', { list: m.join(', ') }) : tr('x tables: all'), () => this.focusPicker('multiply'), { size: 15, color: 0x5a3a8a }));
      c.add(button(this, x + 32 + bw * 1.5, 434, bw, 40, d.length ? tr('/ facts: {list}', { list: d.join(', ') }) : tr('/ facts: all'), () => this.focusPicker('divide'), { size: 15, color: 0x5a3a8a }));
    }
  }

  /** Pick "everything for the grade" or specific tables, like only the 5s. */
  private focusPicker(kind: 'multiply' | 'divide') {
    const s = current().settings;
    const c = this.add.container(0, 0).setDepth(100);
    const redraw = () => {
      c.removeAll(true);
      const chosen = s.focus[kind];
      c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.75).setOrigin(0).setInteractive());
      c.add(panel(this, 90, 40, W - 180, H - 80, 0x1d1730, 0xb98aff));
      c.add(txt(this, W / 2, 70, kind === 'multiply' ? tr('Multiplying: what should we practice?') : tr('Dividing: what should we practice?'), 24, '#ffd24a').setOrigin(0.5));
      c.add(button(this, W / 2, 128, 420, 52, tr('Everything for grade {g}', { g: gradeLabel(s.grade, s.lang) }), () => {
        s.focus[kind] = [];
        redraw();
      }, { size: 20, color: chosen.length ? 0x2a2340 : 0x2f7a3a }));
      c.add(txt(this, W / 2, 178, kind === 'multiply' ? tr('Or only these times tables:') : tr('Or only dividing by:'), 19, C.dim).setOrigin(0.5));
      for (let n = 1; n <= 12; n++) {
        const on = chosen.includes(n);
        const col = (n - 1) % 6;
        const row = Math.floor((n - 1) / 6);
        c.add(button(this, W / 2 - 5 * 52 + col * 104, 230 + row * 74, 90, 62, `${kind === 'multiply' ? 'x' : '/'}${n}`, () => {
          s.focus[kind] = on ? chosen.filter((v) => v !== n) : [...chosen, n].sort((a, b) => a - b);
          if (!s.groups.includes(kind)) s.groups.push(kind);
          redraw();
        }, { size: 24, color: on ? 0x2f7a3a : 0x3d3266 }));
      }
      c.add(txt(this, W / 2, 396, chosen.length
            ? kind === 'multiply'
              ? tr('Every multiplying question will use: {list}', { list: chosen.join(', ') })
              : tr('Every dividing question will use: {list}', { list: chosen.join(', ') })
            : tr('All the multiplying and dividing for the grade.'), 17, '#ffe9a0').setOrigin(0.5));
      const only = s.groups.length === 1 && s.groups[0] === kind;
      c.add(button(this, W / 2 - 150, 452, 330, 52, only ? tr('\u2714 Only practicing this') : tr('Practice ONLY this'), () => {
        s.groups = only ? s.groups.concat(topicGroups(s.lang).map((g) => g.id).filter((id) => id !== kind)) : [kind];
        redraw();
      }, { size: 19, color: only ? 0x2f7a3a : 0x7a4ab0 }));
      c.add(button(this, W / 2 + 160, 452, 200, 52, tr('Done'), () => {
        c.destroy();
        this.draw();
      }, { size: 24, color: 0x2f9a4a }));
    };
    redraw();
  }
}
