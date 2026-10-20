import Phaser from 'phaser';
import { playMusic } from '../audio/audio';
import { defaultGrade, gradeLabel, gradesFor, groupsForGrade, SPELLING_GROUPS, type Grade, type TopicGroup } from '../questions/curriculum';
import { groupReport, newLearningStats, QuestionEngine, type LearningSettings, type Strength } from '../questions/engine';
import { sizedQuestion, sizeKind, SIZES, type GroupOptions } from '../questions/custom';
import { topicLabel } from '../questions/labels';
import { ladderFor, ladderGrades } from '../questions/ladders';
import { parentGate } from '../ui/parentGate';
import { openKeyboard } from '../ui/keyboard';
import { parseWordList } from '../questions/spelling';
import { tr } from '../i18n';
import { current, saveProfile } from '../state/profile';
import { C, W, H, button, panel, txt } from '../ui/widgets';
import { menuBackground } from './TitleScene';

/**
 * A plain text box over the game for pasting a whole list at once (e.g. the
 * teacher's email). One word per line, or commas between words.
 */
function pasteList(initial: string, onSave: (text: string) => void) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:1000;font-family:sans-serif';
  const box = document.createElement('div');
  box.style.cssText = 'background:#1d1730;border:3px solid #d07a3a;border-radius:12px;padding:16px;width:min(560px,92vw);color:#fff';
  const title = document.createElement('div');
  title.textContent = tr('Paste or type the words, one per line (or with commas):');
  title.style.cssText = 'margin-bottom:8px;font-size:16px';
  const area = document.createElement('textarea');
  area.value = initial;
  area.style.cssText = 'width:100%;height:min(260px,45vh);font-size:18px;box-sizing:border-box;border-radius:8px;padding:8px';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;margin-top:10px';
  const btn = (label: string, color: string, fn: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `background:${color};color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:17px`;
    b.onclick = fn;
    row.appendChild(b);
  };
  btn(tr('Cancel'), '#3a3450', () => wrap.remove());
  btn(tr('Save'), '#2f9a4a', () => {
    wrap.remove();
    onSave(area.value);
  });
  box.append(title, area, row);
  wrap.appendChild(box);
  document.body.appendChild(wrap);
  area.focus();
}

/** Badge text and color for a group's strength. */
function strengthBadge(st: Strength): { label: string; color: string } {
  switch (st) {
    case 'strong':
      return { label: tr('\u2605 Strong'), color: '#5ef07a' };
    case 'good':
      return { label: tr('Good'), color: '#ffe066' };
    case 'practice':
      return { label: tr('Needs practice'), color: '#ff9a6b' };
    default:
      return { label: tr('New'), color: '#a99cc8' };
  }
}

/** "Grade 3 level" / "niveau 3e". */
function levelText(g: Grade, lang: 'en' | 'fr'): string {
  return tr('Grade {g} level', { g: gradeLabel(g, lang) });
}

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
      const step = grades.length > 3 ? 62 : 82;
      c.add(button(this, W / 2 - 110 + i * step, 76, step - 10, 42, gradeLabel(g, s.lang), () => {
        s.grade = g;
        this.draw();
      }, { size: 22, color: s.grade === g ? 0x2f9a4a : 0x4b3a78 }));
    });
    const mid = defaultGrade(s.lang);
    const hint = s.grade === mid ? tr('(the full grade {g} set)', { g: gradeLabel(s.grade, s.lang) }) : s.grade < mid ? tr('(easier)') : tr('(harder)');
    c.add(txt(this, W / 2 - 110 + grades.length * (grades.length > 3 ? 62 : 82) - 26, 76, hint, 15, C.dim).setOrigin(0, 0.5));

    const groups = groupsForGrade(s.grade, s.lang);
    this.column(c, 24, 'math', groups.filter((g) => g.subject === 'math'));
    this.column(c, W / 2 + 6, 'reading', groups.filter((g) => g.subject === 'reading'));

    const visible = new Set(groups.map((g) => g.id));
    const chosen = s.groups.filter((id) => visible.has(id)).length;
    c.add(txt(this, 40, 482, chosen === 1 ? tr('1 topic group picked') : chosen ? tr('{n} topic groups picked', { n: chosen }) : tr('Pick at least one topic!'), 15, chosen ? C.dim : C.bad).setOrigin(0, 0.5));
    c.add(button(this, 384, H - 28, 280, 44, tr('Skills & levels (grown-ups)'), () => parentGate(this, () => this.skills()), { size: 16, color: 0x5a3a8a }));
    const go = button(this, W - 150, H - 40, 250, 60, tr("Let's go!"), () => {
      saveProfile(p);
      this.scene.start('Dungeon');
    }, { color: 0x2f9a4a, size: 28 });
    go.setEnabled(chosen > 0);
    c.add(go);
    c.add(button(this, 120, H - 28, 150, 44, tr('Back'), () => {
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
    c.add(txt(this, x + 120, 126, tr('Tap a topic for more choices'), 13, C.dim));
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
      const cy = 184 + Math.floor(i / 2) * 64;
      // The topic opens its choices; the little box turns it on or off.
      c.add(button(this, cx, cy, chipW, 56, '', () => this.groupOptions(g), { color: on ? 0x2f5a3a : 0x2a2340 }));
      const bx = cx - chipW / 2 + 22;
      c.add(this.checkbox(bx, cy, on, () => this.toggle(g.id)));
      const name = txt(this, bx + 20, cy - 9, `${g.label}  \u203a`, 16, on ? '#ffffff' : C.dim).setOrigin(0, 0.5);
      for (let size = 15; name.width > chipW - 50 && size >= 11; size--) name.setFontSize(size);
      c.add(name);
      // How they're doing, and the level they're on now (or what was picked).
      const rep = groupReport(current().learning, s, g.id);
      const badge = strengthBadge(rep.strength);
      const level = choiceSummary(g.id, s) ?? `${levelText(rep.grade, s.lang)}${rep.pinned ? ` (${tr('pinned')})` : ''}`;
      const sub = txt(this, bx + 20, cy + 14, `${badge.label}  \u00b7  ${level}`, 12, badge.color).setOrigin(0, 0.5);
      for (let size = 11; sub.width > chipW - 50 && size >= 9; size--) sub.setFontSize(size);
      c.add(sub);
    });
  }

  /** A small tick box: tap it to turn something on or off. */
  private checkbox(x: number, y: number, on: boolean, onTap: () => void, size = 26): Phaser.GameObjects.Container {
    const box = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(on ? 0x2f9a4a : 0x0f0b1a, 1).fillRoundedRect(-size / 2, -size / 2, size, size, 5);
    g.lineStyle(2, on ? 0xb8ffb0 : 0x8a80a2, 1).strokeRoundedRect(-size / 2, -size / 2, size, size, 5);
    box.add(g);
    if (on) box.add(txt(this, 0, 1, '\u2714', size * 0.7, '#ffffff').setOrigin(0.5));
    box.setSize(size + 14, size + 14).setInteractive({ useHandCursor: true }).on('pointerup', onTap);
    return box;
  }

  private toggle(id: string) {
    const s = current().settings;
    s.groups = s.groups.includes(id) ? s.groups.filter((x) => x !== id) : [...s.groups, id];
    this.draw();
  }

  /** Grown-ups (or kids) can type in this week's spelling test words. */
  private spellingWords() {
    const p = current();
    const s = p.settings;
    const group = s.lang === 'fr' ? 'fr-dictee' : 'spell';
    const c = this.add.container(0, 0).setDepth(100);
    const save = (words: string[]) => {
      s.spellWords = words;
      // Adding words turns the spelling test on.
      if (words.length && !s.groups.includes(group)) s.groups.push(group);
      saveProfile(p);
      redraw();
    };
    const redraw = () => {
      c.removeAll(true);
      const words = s.spellWords ?? [];
      c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.8).setOrigin(0).setInteractive());
      c.add(panel(this, 30, 16, W - 60, H - 32, 0x1d1730, 0xd07a3a));
      c.add(txt(this, 60, 44, tr('Spelling words for {name}', { name: p.name }), 26, '#ffd24a').setOrigin(0, 0.5));
      const on = s.groups.includes(group);
      c.add(this.checkbox(W - 270, 44, on, () => {
        this.toggle(group);
        redraw();
      }, 24));
      c.add(txt(this, W - 250, 44, tr('Use this topic'), 18, on ? '#ffffff' : C.dim).setOrigin(0, 0.5));
      c.add(txt(this, W / 2, 76, words.length
        ? tr('These words come up in spelling questions. Tap a word to take it off.')
        : tr("No list yet, so spelling uses words for the child's grade. Add this week's words from school!"), 15, C.dim, { align: 'center', wordWrap: { width: W - 120 } }).setOrigin(0.5));
      const cols = 5;
      const cw = (W - 100) / cols;
      words.forEach((w, i) => {
        const x = 50 + (i % cols) * cw + cw / 2;
        const y = 118 + Math.floor(i / cols) * 34;
        if (y > H - 110) return;
        c.add(button(this, x, y, cw - 8, 30, `${w}  \u2715`, () => save(words.filter((o) => o !== w)), { size: 15, color: 0x3d3266 }));
      });
      if (words.length > 40) c.add(txt(this, W / 2, H - 98, tr('(+{n} more)', { n: words.length - 40 }), 14, C.dim).setOrigin(0.5));
      const by = H - 56;
      c.add(button(this, 150, by, 200, 48, tr('Add a word'), () =>
        openKeyboard(this, tr('Type a spelling word'), '', false, (v) => save(parseWordList([...words, v].join('\n'))), [], { maxLen: 20, accents: true }),
      { size: 18, color: 0x2e5a7a }));
      c.add(button(this, 370, by, 210, 48, tr('Paste a list'), () => pasteList(words.join('\n'), (text) => save(parseWordList(text))), { size: 18, color: 0x2e5a7a }));
      c.add(button(this, 580, by, 180, 48, tr('Clear list'), () => save([]), { size: 18, color: 0x8a3a3a }).setEnabled(words.length > 0));
      c.add(button(this, W - 130, by, 170, 48, tr('Done'), () => {
        c.destroy();
        this.draw();
      }, { size: 22, color: 0x2f9a4a }));
    };
    redraw();
  }

  /**
   * Grown-ups: how each topic group is going, and its level. "Auto" moves
   * with the answers; or pin a group to one grade (e.g. easier multiplying).
   */
  private skills() {
    const p = current();
    const s = p.settings;
    const c = this.add.container(0, 0).setDepth(100);
    const redraw = () => {
      c.removeAll(true);
      c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.8).setOrigin(0).setInteractive());
      c.add(panel(this, 16, 12, W - 32, H - 24, 0x1d1730, 0xb98aff));
      c.add(txt(this, W / 2, 38, tr('Skills & levels for {name}', { name: p.name }), 24, '#ffd24a').setOrigin(0.5));
      c.add(txt(this, W / 2, 66, tr('Auto: questions get easier or harder with the answers. Tap a level to pin it.'), 14, C.dim).setOrigin(0.5));
      const groups = groupsForGrade(s.grade, s.lang);
      const half = Math.ceil(groups.length / 2);
      groups.forEach((g, i) => {
        const col = i < half ? 0 : 1;
        const row = i < half ? i : i - half;
        const x = 34 + col * 456;
        const y = 88 + row * 54;
        const rep = groupReport(p.learning, s, g.id);
        const badge = strengthBadge(rep.strength);
        const bg = this.add.graphics();
        bg.fillStyle(g.subject === 'math' ? 0x1f2a48 : 0x3a2618, 1).fillRoundedRect(x, y, 440, 48, 8);
        c.add(bg);
        const name = txt(this, x + 10, y + 4, g.label, 15);
        for (let size = 14; name.width > 170 && size >= 11; size--) name.setFontSize(size);
        c.add(name);
        const acc = rep.answered ? `${Math.round(rep.accuracy * 100)}% (${rep.answered})` : '';
        c.add(txt(this, x + 10, y + 37, `${badge.label}  ${acc}`, 12, badge.color).setOrigin(0, 0.5));
        c.add(txt(this, x + 186, y + 24, levelText(rep.grade, s.lang), 13, '#e8e0ff').setOrigin(0, 0.5));
        // Level button: Auto -> each grade on the ladder (up to one above) -> Auto.
        const options = ladderGrades(ladderFor(g.id, s.lang)).filter((gr) => gr <= s.grade + 1);
        const pinned = s.levels?.[g.id];
        const label = pinned ? tr('Pinned: {g}', { g: gradeLabel(pinned, s.lang) }) : tr('Auto');
        c.add(button(this, x + 372, y + 24, 124, 36, label, () => {
          s.levels ??= {};
          const k = pinned ? options.indexOf(pinned) : -1;
          const next = options[k + 1];
          if (next) s.levels[g.id] = next;
          else delete s.levels[g.id];
          saveProfile(p);
          redraw();
        }, { size: 14, color: pinned ? 0xb07a10 : 0x2f7a3a }));
      });
      c.add(button(this, W / 2, H - 42, 200, 48, tr('Done'), () => {
        c.destroy();
        this.draw();
      }, { size: 22, color: 0x2f9a4a }));
    };
    redraw();
  }

  /**
   * More choices for one topic: number sizes and times tables for
   * multiplying, dividing, adding and subtracting; question types for the
   * rest; the word list for spelling tests.
   */
  private groupOptions(g: TopicGroup) {
    if (SPELLING_GROUPS.includes(g.id)) {
      this.spellingWords();
      return;
    }
    const p = current();
    const s = p.settings;
    const kind = sizeKind(g.id);
    const fr = s.lang === 'fr';
    const c = this.add.container(0, 0).setDepth(100);
    const opts = (): GroupOptions => (s.options ??= {})[g.id] ?? {};
    const set = (o: GroupOptions) => {
      (s.options ??= {})[g.id] = o;
      if (!s.groups.includes(g.id)) s.groups.push(g.id);
      redraw();
    };
    const flip = <T,>(list: T[] | undefined, v: T) => (list ?? []).includes(v) ? (list ?? []).filter((x) => x !== v) : [...(list ?? []), v];
    const row = (x: number, y: number, w: number, label: string, on: boolean, fn: () => void, size = 17) => {
      c.add(this.checkbox(x + 14, y, on, fn, 24));
      const t = txt(this, x + 34, y, label, size, on ? '#ffffff' : C.dim).setOrigin(0, 0.5);
      for (let k = size; t.width > w - 40 && k >= 11; k--) t.setFontSize(k);
      c.add(t);
      c.add(this.add.zone(x + 34 + t.width / 2, y, t.width, 30).setInteractive({ useHandCursor: true }).on('pointerup', fn));
    };
    const redraw = () => {
      c.removeAll(true);
      const o = opts();
      const on = s.groups.includes(g.id);
      c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.8).setOrigin(0).setInteractive());
      c.add(panel(this, 24, 14, W - 48, H - 28, 0x1d1730, g.subject === 'math' ? 0x4a7ad0 : 0xd07a3a));
      c.add(txt(this, 48, 30, g.label, 26, '#ffd24a'));
      row(W - 300, 46, 260, tr('Use this topic'), on, () => {
        this.toggle(g.id);
        redraw();
      }, 18);

      if (kind) {
        // ---- number sizes (left)
        const sizes = SIZES[kind];
        c.add(txt(this, 48, 78, tr('Number sizes (pick one or more):'), 18, '#7fd3ff'));
        row(48, 112, 420, tr('Automatic (follows the level)'), !o.sizes?.length, () => set({ ...o, sizes: [] }));
        sizes.forEach((d, i) => row(48, 146 + i * 32, 430, fr ? d.fr : d.en, !!o.sizes?.includes(d.id), () => set({ ...o, sizes: flip(o.sizes, d.id) })));
        let y = 146 + sizes.length * 32 + 4;
        if (kind === 'addsub') {
          c.add(txt(this, 48, y, tr('Which kind?'), 18, '#7fd3ff'));
          const ops: ('add' | 'sub')[] = o.ops?.length ? o.ops : ['add', 'sub'];
          const flipOp = (v: 'add' | 'sub') => (flip(ops, v).length ? flip(ops, v) : ops);
          row(48, y + 34, 200, tr('Adding'), ops.includes('add'), () => set({ ...o, ops: flipOp('add') }));
          row(250, y + 34, 220, tr('Subtracting'), ops.includes('sub'), () => set({ ...o, ops: flipOp('sub') }));
          y += 64;
        }
        // ---- times tables (right)
        if (kind === 'mul' || kind === 'div') {
          const key = kind === 'mul' ? 'multiply' : 'divide';
          const chosen = s.focus[key];
          c.add(txt(this, 520, 78, kind === 'mul' ? tr('Times tables (the 1-digit number):') : tr('Divide by:'), 18, '#7fd3ff'));
          row(520, 112, 300, tr('All of them'), !chosen.length, () => {
            s.focus[key] = [];
            set(o);
          });
          for (let n = 1; n <= 12; n++) {
            const col = (n - 1) % 4;
            const r = Math.floor((n - 1) / 4);
            row(520 + col * 96, 150 + r * 40, 96, `${kind === 'mul' ? (fr ? '×' : 'x') : fr ? '÷' : '/'}${n}`, chosen.includes(n), () => {
              s.focus[key] = flip(chosen, n).sort((a, b) => a - b);
              set(o);
            }, 18);
          }
        }
        // ---- what the questions will look like
        const examples = examplesFor(g.id, s);
        const top = Math.max(y, 290) + 4;
        c.add(panel(this, 48, top, W - 96, 104, 0x0f0b1a, 0x5a4a7a));
        const ey = top + 10;
        c.add(txt(this, 64, ey, tr('The questions will look like this:'), 16, '#ffe9a0'));
        c.add(txt(this, 64, ey + 24, examples.join('      '), 24, '#ffffff', { wordWrap: { width: W - 140 } }));
        c.add(txt(this, 64, ey + 64, o.sizes?.length ? tr('Only these sizes: questions will not get harder.') : tr('Automatic: questions get easier or harder with the answers.'), 14, C.dim));
      } else {
        // ---- question types
        const types = groupTypes(g.id, s.lang);
        const chosen = o.topics ?? [];
        c.add(txt(this, 48, 78, tr('Question types (pick one or more):'), 18, '#7fd3ff'));
        row(48, 116, 420, tr('All types'), !chosen.length, () => set({ ...o, topics: [] }));
        types.forEach((t, i) => {
          const col = i % 2;
          const r = Math.floor(i / 2);
          row(48 + col * 440, 156 + r * 38, 430, topicLabel(t), chosen.includes(t), () => set({ ...o, topics: flip(chosen, t) }));
        });
        c.add(txt(this, 48, H - 108, tr('Questions still get easier or harder with the answers, using only these types.'), 14, C.dim));
      }
      c.add(button(this, W / 2, H - 44, 220, 48, tr('Done'), () => {
        saveProfile(p);
        c.destroy();
        this.draw();
      }, { size: 22, color: 0x2f9a4a }));
    };
    redraw();
  }
}

/** Question types a group can ask (in its ladder, for this language). */
function groupTypes(groupId: string, lang: 'en' | 'fr'): string[] {
  return [...new Set(ladderFor(groupId, lang).flatMap((st) => st.topics))];
}

/** Short text for a topic chip when grown-up choices are set (undefined = none). */
function choiceSummary(groupId: string, s: LearningSettings): string | undefined {
  const o = s.options?.[groupId];
  const kind = sizeKind(groupId);
  const tables = groupId === 'divide' ? s.focus.divide : groupId === 'multiply' || groupId === 'fr-mult' ? s.focus.multiply : [];
  const parts: string[] = [];
  if (kind && o?.sizes?.length) parts.push(SIZES[kind].filter((d) => o.sizes!.includes(d.id)).map((d) => d.id.replace('x', '\u00d7').replace('by', '\u00f7')).join(', '));
  if (tables.length) parts.push(`${groupId === 'divide' ? '\u00f7' : '\u00d7'}${tables.join(',')}`);
  if (o?.topics?.length) parts.push(tr('{n} types', { n: o.topics.length }));
  if (SPELLING_GROUPS.includes(groupId) && s.spellWords?.length) parts.push(tr('my list ({n})', { n: s.spellWords.length }));
  return parts.length ? parts.join(' \u00b7 ') : undefined;
}

/** Three sample questions for the options window. */
function examplesFor(groupId: string, s: LearningSettings): string[] {
  const tables = groupId === 'divide' ? s.focus.divide : groupId === 'multiply' || groupId === 'fr-mult' ? s.focus.multiply : [];
  const o = s.options?.[groupId];
  if (o?.sizes?.length) return [0, 1, 2].map(() => sizedQuestion(groupId, o, tables)!.prompt.replace(' = ?', ''));
  const e = new QuestionEngine(newLearningStats(), { ...s, groups: [groupId], mathPercent: 100 });
  return [0, 1, 2].map(() => e.next().prompt.replace(' = ?', '').split('\n')[0]).map((t) => (t.length > 26 ? t.slice(0, 24) + '...' : t));
}
