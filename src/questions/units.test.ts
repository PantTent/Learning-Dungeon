import { makeMathQuestion } from './math';
import { setLang, setUnits } from '../i18n';

const METRIC = /(?<!\p{L})(cm|centimeters?|meters?|millimeters?|kilo\p{L}+|liters?|milliliters?|grams?|km|centimètres?|mètres?)(?!\p{L})|\d m(?!\p{L})/iu;
// (No letter right before, so names like "Émile" don't count as "mile".)
const US = /(?<!\p{L})(inch|inches|in\.|feet|foot|ft|yards?|miles?|pounds?|ounces?|gallons?|quarts?|pints?|cups?|pouces?|pieds?|verges?)(?!\p{L})/iu;

function texts(topic: string, d: 1 | 2 | 3) {
  const q = makeMathQuestion(topic, d);
  return [q.prompt, q.explanation, q.teach ?? '', ...(q.choices ?? [])].join(' ');
}

describe('measuring units', () => {
  afterAll(() => setUnits('imperial'));

  for (const lang of ['en', 'fr'] as const) {
    it(`US units use inches and feet, never centimeters (${lang})`, () => {
      setLang(lang);
      setUnits('imperial');
      const topics: [string, 1 | 2 | 3][] = lang === 'en'
        ? [['measurement', 1], ['measurement', 2], ['area-perimeter', 1], ['area-perimeter', 3], ['volume', 2], ['e-measure', 2], ['e-measure', 3]]
        : [['e-measure', 2], ['e-measure', 3]];
      for (const [t, d] of topics) for (let i = 0; i < 60; i++) expect(texts(t, d)).not.toMatch(METRIC);
    });

    it(`metric uses centimeters and meters, never inches (${lang})`, () => {
      setLang(lang);
      setUnits('metric');
      const topics: [string, 1 | 2 | 3][] = lang === 'en'
        ? [['measurement', 1], ['measurement', 2], ['area-perimeter', 1], ['area-perimeter', 3], ['volume', 2], ['e-measure', 2], ['e-measure', 3]]
        : [['e-measure', 2], ['e-measure', 3]];
      for (const [t, d] of topics) for (let i = 0; i < 60; i++) expect(texts(t, d)).not.toMatch(US);
    });
  }
  afterAll(() => setLang('en'));
});
