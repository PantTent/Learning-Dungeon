import { defaultLearningSettings, newLearningStats, QuestionEngine, upgradeSettings } from './engine';
import { GRADES_FR, mathTopicsForGrade, SPELLING_GROUPS, TOPIC_GROUPS_FR } from './curriculum';
import { READING_BANK_FR } from './readingBankFr';
import { READING_BANK_FR_UPPER } from './readingBankFrUpper';
import { mathTopicLevels } from './math';
import { topicLabel } from './labels';
import { setLang } from '../i18n';

describe('French questions', () => {
  afterAll(() => setLang('en'));

  it('every French group topic exists', () => {
    const reading = new Set([...READING_BANK_FR, ...READING_BANK_FR_UPPER].map((b) => b.topic));
    for (const g of TOPIC_GROUPS_FR) {
      for (const t of g.topics) expect(g.subject === 'math' ? mathTopicLevels(t).length > 0 : SPELLING_GROUPS.includes(g.id) || reading.has(t), t).toBe(true);
    }
    for (const grade of GRADES_FR) for (const t of mathTopicsForGrade(grade, 'fr')) expect(mathTopicLevels(t).length, t).toBeGreaterThan(0);
  });

  it.each(GRADES_FR)('grade %i gives only French questions from its own program', (grade) => {
    setLang('fr');
    const settings = { ...defaultLearningSettings('fr'), grade };
    const e = new QuestionEngine(newLearningStats(), settings);
    let reading = 0;
    let upper = 0;
    for (let i = 0; i < 400; i++) {
      const q = e.next();
      if (q.subject === 'math') {
        // 1re-3e: the early questions only. 4e-6e: mostly the bigger ones.
        if (grade <= 2) expect(q.topic.startsWith('e-'), q.topic).toBe(true);
        if (!q.topic.startsWith('e-')) upper++;
      } else {
        reading++;
        expect(/^(rf|ru|sp):/.test(q.id), q.id).toBe(true);
        expect(q.topic.startsWith('fr-')).toBe(true);
        if (q.id.startsWith('ru:')) upper++;
        if (grade <= 2) expect(q.id.startsWith('ru:')).toBe(false);
      }
      expect(topicLabel(q.topic)).not.toBe(q.topic);
      e.record(q, i % 4 !== 0);
    }
    expect(reading).toBeGreaterThan(50);
    if (grade >= 4) expect(upper).toBeGreaterThan(100);
  });

  it('older French saves get the new fractions group turned on', () => {
    const f = upgradeSettings({ lang: 'fr', grade: 4, groups: ['fr-nombres', 'fr-mult', 'fr-vocab'] });
    expect(f.groups).toContain('fr-fractions');
    expect(f.groups).not.toContain('fr-dictee');
    // Once known, turning it off sticks.
    const g = upgradeSettings({ ...f, groups: ['fr-nombres'] });
    expect(g.groups).toEqual(['fr-nombres']);
  });

  it('old English saves stay English and keep valid grades', () => {
    const s = upgradeSettings({ grade: 4, groups: ['multiply'] });
    expect(s.lang).toBe('en');
    expect(s.grade).toBe(4);
    const f = upgradeSettings({ lang: 'fr', grade: 5, groups: ['multiply'] });
    expect(f.grade).toBe(5);
    expect(f.groups.every((g) => g.startsWith('fr-'))).toBe(true);
  });
});
