import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { GRADES, groupsForGrade, type TopicGroup } from '../questions/curriculum';
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

    c.add(txt(this, W / 2, 26, `What do you want to practice today, ${p.name}?`, 28, '#ffd24a').setOrigin(0.5));

    c.add(txt(this, W / 2 - 170, 76, 'Grade:', 22).setOrigin(1, 0.5));
    GRADES.forEach((g, i) => {
      c.add(button(this, W / 2 - 110 + i * 82, 76, 72, 42, `${g}`, () => {
        s.grade = g;
        this.draw();
      }, { size: 22, color: s.grade === g ? 0x2f9a4a : 0x4b3a78 }));
    });
    c.add(txt(this, W / 2 + 140, 76, s.grade === 4 ? '(the full grade 4 set)' : s.grade === 3 ? '(easier)' : '(harder)', 15, C.dim).setOrigin(0, 0.5));

    const groups = groupsForGrade(s.grade);
    this.column(c, 24, 'Math', groups.filter((g) => g.subject === 'math'));
    this.column(c, W / 2 + 6, 'Reading', groups.filter((g) => g.subject === 'reading'));

    const visible = new Set(groups.map((g) => g.id));
    const chosen = s.groups.filter((id) => visible.has(id)).length;
    c.add(txt(this, 40, H - 52, chosen ? `${chosen} topic group${chosen === 1 ? '' : 's'} picked` : 'Pick at least one topic!', 18, chosen ? C.dim : C.bad).setOrigin(0, 0.5));
    const go = button(this, W - 150, H - 50, 250, 64, "Let's go!", () => {
      saveProfile(p);
      this.scene.start('Dungeon');
    }, { color: 0x2f9a4a, size: 28 });
    go.setEnabled(chosen > 0);
    c.add(go);
    c.add(button(this, W / 2 - 40, H - 50, 150, 48, 'Back', () => {
      saveProfile(p);
      this.scene.start('Title');
    }, { size: 20, color: 0x3a3450 }));
  }

  private column(c: Phaser.GameObjects.Container, x: number, title: string, groups: TopicGroup[]) {
    const s = current().settings;
    const colW = W / 2 - 30;
    c.add(panel(this, x, 106, colW, 360, 0x1d1730, title === 'Math' ? 0x4a7ad0 : 0xd07a3a));
    c.add(txt(this, x + 16, 118, title, 24, title === 'Math' ? '#7fd3ff' : '#ffb36b'));
    const all = groups.every((g) => s.groups.includes(g.id));
    c.add(button(this, x + colW - 70, 134, 110, 34, all ? 'None' : 'All', () => {
      const ids = groups.map((g) => g.id);
      s.groups = all ? s.groups.filter((id) => !ids.includes(id)) : [...new Set([...s.groups, ...ids])];
      this.draw();
    }, { size: 16, color: 0x3a3450 }));

    const chipW = (colW - 48) / 2;
    groups.forEach((g, i) => {
      const on = s.groups.includes(g.id);
      const cx = x + 16 + (i % 2) * (chipW + 16) + chipW / 2;
      const cy = 184 + Math.floor(i / 2) * 66;
      c.add(button(this, cx, cy, chipW, 56, `${on ? '✔ ' : ''}${g.label}`, () => {
        s.groups = on ? s.groups.filter((id) => id !== g.id) : [...s.groups, g.id];
        this.draw();
      }, { size: g.label.length > 18 ? 15 : 17, color: on ? 0x2f7a3a : 0x2a2340, textColor: on ? '#ffffff' : C.dim }));
    });
  }
}
