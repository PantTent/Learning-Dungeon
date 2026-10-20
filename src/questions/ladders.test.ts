import { defaultLearningSettings, groupReport, newLearningStats, QuestionEngine } from './engine';
import { allGroupIds, topicGroups, type Grade } from './curriculum';
import { gradeRange, ladderFor, ladderGrades } from './ladders';
import { EARLY_GENERATORS } from './mathEarly';
import { mathTopicLevels } from './math';
import { setLang } from '../i18n';

describe('skill ladders', () => {
  afterAll(() => setLang('en'));

  it('every group in both languages has a ladder of real topics, easiest first', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const g of topicGroups(lang)) {
        const steps = ladderFor(g.id, lang);
        expect(steps.length, `${lang} ${g.id}`).toBeGreaterThan(0);
        for (let i = 1; i < steps.length; i++) expect(steps[i].g).toBeGreaterThanOrEqual(steps[i - 1].g);
        for (const st of steps) {
          for (const t of st.topics) {
            if (g.subject === 'math') expect(mathTopicLevels(t).length || EARLY_GENERATORS[t]?.levels.length, `${g.id}: ${t}`).toBeTruthy();
          }
        }
      }
    }
  });

  it('a grade 4 child who keeps missing multiplying drops a grade at a time', () => {
    const stats = newLearningStats();
    const settings = { ...defaultLearningSettings(), grade: 4 as Grade, groups: ['multiply'], mathPercent: 100 };
    const e = new QuestionEngine(stats, settings);
    const first = e.next();
    expect(ladderFor('multiply', 'en').filter((s) => s.g === 4).flatMap((s) => s.topics)).toContain(first.topic);
    // 10 answers under 75% right: down one grade.
    for (let i = 0; i < 10; i++) e.record(e.next(), i < 5);
    expect(groupReport(stats, settings, 'multiply').grade).toBe(3);
    for (let i = 0; i < 40; i++) e.record(e.next(), false);
    stats.retry = []; // (missed questions come back later; ignore them here)
    const after = Array.from({ length: 30 }, () => e.next().topic);
    expect(after.every((t) => t === 'e-doubles')).toBe(true);
    expect(groupReport(stats, settings, 'multiply').strength).toBe('practice');
    expect(groupReport(stats, settings, 'multiply').grade).toBe(1);
  });

  it('stays on a grade between 75% and 95%, and climbs after 20 answers at 95%+', () => {
    const stats = newLearningStats();
    stats.gradeAt = { multiply: 3 };
    const settings = { ...defaultLearningSettings(), grade: 4 as Grade, groups: ['multiply'], mathPercent: 100 };
    const e = new QuestionEngine(stats, settings);
    // 85% right for a long time: no change.
    for (let i = 0; i < 60; i++) e.record(e.next(), i % 7 !== 0);
    expect(groupReport(stats, settings, 'multiply').grade).toBe(3);
    // Right answers until the last 20 are 95%+ right: up to grade 4.
    let n = 0;
    while (groupReport(stats, settings, 'multiply').grade === 3 && n < 30) {
      e.record(e.next(), true);
      n++;
    }
    expect(n).toBeLessThan(30);
    expect(groupReport(stats, settings, 'multiply').grade).toBe(4);
    // Moving up needs 20 answers on the new grade: 19 is not enough yet.
    for (let i = 0; i < 19; i++) e.record(e.next(), true);
    expect(groupReport(stats, settings, 'multiply').grade).toBe(4);
    e.record(e.next(), true);
    expect(groupReport(stats, settings, 'multiply').grade).toBe(5);
    // And one grade past the child's own grade at most.
    for (let i = 0; i < 100; i++) e.record(e.next(), true);
    expect(groupReport(stats, settings, 'multiply').grade).toBe(5);
    expect(gradeRange(ladderFor('multiply', 'en'), 4).hi).toBe(5);
    expect(groupReport(stats, settings, 'multiply').strength).toBe('strong');
  });

  it('old saves (step numbers) turn into grades', () => {
    const stats = newLearningStats();
    stats.ladder = { 'add-sub': 0 };
    const settings = { ...defaultLearningSettings(), grade: 4 as Grade, groups: ['add-sub'], mathPercent: 100 };
    expect(groupReport(stats, settings, 'add-sub').grade).toBe(1);
  });

  it('a parent can pin a group to an easier grade', () => {
    const stats = newLearningStats();
    const settings = { ...defaultLearningSettings(), grade: 4 as Grade, groups: ['multiply'], mathPercent: 100, levels: { multiply: 3 as Grade } };
    const e = new QuestionEngine(stats, settings);
    for (let i = 0; i < 60; i++) {
      const q = e.next();
      expect(['mult-facts', 'mult-2x1']).toContain(q.topic);
      e.record(q, true);
    }
    expect(groupReport(stats, settings, 'multiply').pinned).toBe(true);
    expect(ladderGrades(ladderFor('multiply', 'en'))).toEqual([1, 2, 3, 4, 5]);
  });

  it('reading groups climb by difficulty too', () => {
    const settings = { ...defaultLearningSettings(), grade: 3 as Grade, mathPercent: 0, groups: allGroupIds('en') };
    const e = new QuestionEngine(newLearningStats(), settings);
    // (Each group needs 10 misses per grade it drops.)
    for (let i = 0; i < 600; i++) {
      const q = e.next();
      expect(q.subject).toBe('reading');
      e.record(q, false);
    }
    (e as unknown as { stats: { retry: unknown[] } }).stats.retry = [];
    // Every group is down at its easiest grade (grade 1 for most, grade 2 for figurative language).
    for (let i = 0; i < 30; i++) {
      const q = e.next();
      expect(q.difficulty, q.group).toBe(ladderFor(q.group!, 'en')[0].d);
    }
  });
});

describe('adapting to the child', () => {
  it('a weak group stays on grade 1 adding & subtracting until it is above 75%', () => {
    const stats = newLearningStats();
    stats.gradeAt = { 'add-sub': 1 };
    const settings = { ...defaultLearningSettings('en'), grade: 4 as Grade, groups: ['add-sub'], mathPercent: 100 };
    const e = new QuestionEngine(stats, settings);
    const grade1 = ladderFor('add-sub', 'en').filter((s) => s.g === 1).flatMap((s) => s.topics);
    for (let i = 0; i < 80; i++) {
      stats.retry = [];
      const q = e.next();
      expect(grade1).toContain(q.topic);
      e.record(q, i % 5 !== 0); // 80% right: good, but not 95%
    }
    expect(groupReport(stats, settings, 'add-sub').grade).toBe(1);
    for (let i = 0; i < 20; i++) {
      stats.retry = [];
      e.record(e.next(), true);
    }
    expect(groupReport(stats, settings, 'add-sub').grade).toBe(2);
  });
});
