// Display names for question topics (parent report, question header).
import { MATH_TOPICS } from './math';
import { READING_TOPICS } from './readingBank';
import { READING_TOPICS_FR } from './readingBankFr';
import { EARLY_TOPICS } from './mathEarly';
import { getLang } from '../i18n';

export function topicLabel(topic: string): string {
  const early = EARLY_TOPICS[topic];
  if (early) return getLang() === 'fr' ? early.fr : early.en;
  return MATH_TOPICS[topic] ?? READING_TOPICS[topic] ?? READING_TOPICS_FR[topic] ?? topic;
}
