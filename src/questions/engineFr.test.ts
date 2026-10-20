import { defaultLearningSettings, newLearningStats, QuestionEngine, upgradeSettings } from './engine';
import { GRADES_FR, mathTopicsForGrade, SPELLING_GROUPS, TOPIC_GROUPS_FR } from './curriculum';
import { READING_BANK_FR } from './readingBankFr';
import { EARLY_GENERATORS } from './mathEarly';
import { topicLabel } from './labels';
import { setLang } from '../i18n';

describe('French questions', () => {
  afterAll(() => setLang('en'));

  it('every French group topic exists', () => {
    const reading = new Set(READING_BANK_FR.map((b) => b.topic));
    for (const g of TOPIC_GROUPS_FR) {
      for (const t of g.topics) expect(g.subject === 'math' ? !!EARLY_GENERATORS[t] : SPELLING_GROUPS.includes(g.id) || reading.has(t), t).toBe(true);
    }
    for (const grade of GRADES_FR) for (const t of mathTopicsForGrade(grade, 'fr')) expect(EARLY_GENERATORS[t], t).toBeTruthy();
  });

  it.each(GRADES_FR)('grade %i gives only French questions, at most one level up', (grade) => {
    setLang('fr');
    const settings = { ...defaultLearningSettings('fr'), grade };
    const e = new QuestionEngine(newLearningStats(), settings);
    let reading = 0;
    for (let i = 0; i < 400; i++) {
      const q = e.next();
      if (q.subject === 'math') expect(q.topic.startsWith('e-'), q.topic).toBe(true);
      else {
        reading++;
        expect(q.id.startsWith('rf:')).toBe(true);
        expect(q.topic.startsWith('fr-')).toBe(true);
      }
      expect(q.difficulty <= grade + 1, `${q.topic} d${q.difficulty}`).toBe(true);
      expect(topicLabel(q.topic)).not.toBe(q.topic);
      e.record(q, i % 4 !== 0);
    }
    expect(reading).toBeGreaterThan(50);
  });

  it('old English saves stay English and keep valid grades', () => {
    const s = upgradeSettings({ grade: 4, groups: ['multiply'] });
    expect(s.lang).toBe('en');
    expect(s.grade).toBe(4);
    const f = upgradeSettings({ lang: 'fr', grade: 5, groups: ['multiply'] });
    expect(f.grade).toBe(2);
    expect(f.groups.every((g) => g.startsWith('fr-'))).toBe(true);
  });
});
