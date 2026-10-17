import { defaultLearningSettings, groupReport, newLearningStats, QuestionEngine } from './engine';
import { allGroupIds, topicGroups, type Grade } from './curriculum';
import { ladderFor, ladderGrades, ladderRange } from './ladders';
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

  it('a grade 4 child who keeps missing multiplying drops back to the basics', () => {
    const stats = newLearningStats();
    const settings = { ...defaultLearningSettings(), grade: 4 as Grade, groups: ['multiply'], mathPercent: 100 };
    const e = new QuestionEngine(stats, settings);
    const first = e.next();
    expect(['mult-2x1', 'mult-big', 'mult-facts']).toContain(first.topic);
    for (let i = 0; i < 40; i++) e.record(e.next(), false);
    stats.retry = []; // (missed questions come back later; ignore them here)
    const after = Array.from({ length: 30 }, () => e.next().topic);
    expect(after.every((t) => t === 'e-doubles' || t === 'e-mult')).toBe(true);
    expect(groupReport(stats, settings, 'multiply').strength).toBe('practice');
    expect(groupReport(stats, settings, 'multiply').grade).toBe(2);
  });

  it('then climbs back up, and can go one step past the grade', () => {
    const stats = newLearningStats();
    const settings = { ...defaultLearningSettings(), grade: 4 as Grade, groups: ['multiply'], mathPercent: 100 };
    const e = new QuestionEngine(stats, settings);
    for (let i = 0; i < 40; i++) e.record(e.next(), false);
    for (let i = 0; i < 80; i++) e.record(e.next(), true);
    const steps = ladderFor('multiply', 'en');
    const { max } = ladderRange(steps, 4);
    expect(Math.floor(stats.ladder!.multiply)).toBe(max);
    expect(steps[max].g).toBe(5);
    expect(groupReport(stats, settings, 'multiply').strength).toBe('strong');
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
    expect(ladderGrades(ladderFor('multiply', 'en'))).toEqual([2, 3, 4, 5]);
  });

  it('reading groups climb by difficulty too', () => {
    const settings = { ...defaultLearningSettings(), grade: 3 as Grade, mathPercent: 0, groups: allGroupIds('en') };
    const e = new QuestionEngine(newLearningStats(), settings);
    for (let i = 0; i < 200; i++) {
      const q = e.next();
      expect(q.subject).toBe('reading');
      e.record(q, false);
    }
    (e as unknown as { stats: { retry: unknown[] } }).stats.retry = [];
    expect(Array.from({ length: 30 }, () => e.next().difficulty).every((d) => d === 1)).toBe(true);
  });
});
