import { defaultLearningSettings, newLearningStats, QuestionEngine } from './engine';
import { groupsForGrade, mathTopicsForGrade, topicGroups, type Grade } from './curriculum';
import { ladderFor } from './ladders';
import { EARLY_GENERATORS } from './mathEarly';
import { makeMathQuestion, mathTopicLevels } from './math';
import { getUnits, regionName, setLang, setRegion } from '../i18n';

describe('Nova Scotia school program', () => {
  beforeEach(() => setRegion('ns'));
  afterAll(() => {
    setRegion('home');
    setLang('en');
  });

  it('has a ladder of real topics for every math group, easiest first, in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      setLang(lang);
      for (const g of topicGroups(lang).filter((x) => x.subject === 'math')) {
        const steps = ladderFor(g.id, lang);
        expect(steps.length, `${lang} ${g.id}`).toBeGreaterThan(0);
        for (let i = 1; i < steps.length; i++) expect(steps[i].g).toBeGreaterThanOrEqual(steps[i - 1].g);
        for (const st of steps) {
          for (const t of st.topics) {
            expect(g.topics, `${g.id} owns ${t}`).toContain(t);
            expect(mathTopicLevels(t).length || EARLY_GENERATORS[t]?.levels.length, t).toBeTruthy();
          }
        }
      }
    }
  });

  it('keeps later topics out of the early grades', () => {
    setLang('en');
    const upTo = (g: Grade) => new Set(ladderFor('fractions', 'en').filter((s) => s.g <= g).flatMap((s) => s.topics));
    expect(upTo(2).size).toBe(0); // fractions start in grade 3
    const all = (['multiply', 'divide', 'add-sub', 'numbers', 'fractions', 'decimals', 'measure', 'word'] as const).flatMap((id) =>
      ladderFor(id, 'en').flatMap((s) => s.topics),
    );
    // Adding fractions, angles and order of operations come after grade 5 in Nova Scotia.
    for (const t of ['fractions-add', 'fractions-unlike', 'fractions-mult', 'angles', 'order-ops', 'mult-3x2']) expect(all).not.toContain(t);
    expect(mathTopicsForGrade(2, 'en')).not.toContain('e-money');
    expect(mathTopicsForGrade(3, 'en')).toContain('e-money');
    setLang('fr');
    expect(groupsForGrade(1, 'fr').map((g) => g.id)).not.toContain('fr-mult');
    expect(ladderFor('fr-mesure', 'fr').filter((s) => s.g === 2).flatMap((s) => s.topics)).not.toContain('e-money');
  });

  it('grade 3 times tables and sharing stay within 5 x 5', () => {
    for (const lang of ['en', 'fr'] as const) {
      setLang(lang);
      for (let i = 0; i < 300; i++) {
        for (const topic of ['e-mult', 'e-div']) {
          const q = makeMathQuestion(topic, 3);
          const nums = (q.prompt.match(/\d+/g) ?? []).map(Number);
          if (topic === 'e-mult') expect(Number(q.answer), q.prompt).toBeLessThanOrEqual(25);
          else expect(Math.max(...nums), q.prompt).toBeLessThanOrEqual(25);
        }
      }
    }
  });

  it('serves only grade-appropriate math for a grade 3 child in French', () => {
    setLang('fr');
    const settings = { ...defaultLearningSettings('fr'), grade: 3 as Grade, mathPercent: 100 };
    const e = new QuestionEngine(newLearningStats(), settings);
    const ok = new Set(mathTopicsForGrade(3, 'fr'));
    for (let i = 0; i < 200; i++) {
      const q = e.next();
      if (q.subject === 'math') expect(ok.has(q.topic) || q.topic.startsWith('e-'), q.topic).toBe(true);
      e.record(q, true);
    }
  });

  it('uses metric units and the right names', () => {
    setLang('en');
    expect(getUnits()).toBe('metric');
    expect(regionName('ns', 'en')).toBe('Nova Scotia');
    expect(regionName('ns', 'fr')).toBe('Nouvelle-Écosse');
    expect(regionName('home', 'fr')).toBe('Québec');
  });
});
