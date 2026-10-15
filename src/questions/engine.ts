// Picks the next question for the child, adapting difficulty per subject
// and bringing missed questions back a few turns later for another try.
import type { Difficulty, Question, Subject } from './types';
import { makeMathQuestion, mathTopicsFor } from './math';
import { READING_BANK } from './readingBank';
import { clamp, pick, shuffle } from '../util/rng';

export interface TopicStat {
  asked: number;
  correct: number;
}

export interface LearningStats {
  /** Adaptive level per subject, 1.0 - 3.49 (rounded to choose difficulty). */
  level: Record<Subject, number>;
  topics: Record<string, TopicStat & { subject: Subject }>;
  /** Questions answered wrong, waiting to be asked again. */
  retry: { q: Question; due: number }[];
  recent: string[];
  totalAsked: number;
  totalCorrect: number;
  /** Per-day totals, key "YYYY-MM-DD". */
  days: Record<string, TopicStat>;
}

export interface LearningSettings {
  /** 0-100: share of questions that are math (the rest are reading). */
  mathPercent: number;
  readAloud: boolean;
}

export function newLearningStats(): LearningStats {
  return {
    level: { math: 1.6, reading: 1.6 },
    topics: {},
    retry: [],
    recent: [],
    totalAsked: 0,
    totalCorrect: 0,
    days: {},
  };
}

export function defaultLearningSettings(): LearningSettings {
  return { mathPercent: 60, readAloud: false };
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pickDifficulty(level: number): Difficulty {
  // Occasionally give an easier one to keep confidence up.
  if (Math.random() < 0.15) return clamp(Math.floor(level) - 1, 1, 3) as Difficulty;
  const base = Math.floor(level);
  const frac = level - base;
  return clamp(Math.random() < frac ? base + 1 : base, 1, 3) as Difficulty;
}

/** Normalize a typed answer so "1,200" and " 1200 " both match "1200". */
export function normalize(ans: string): string {
  return ans.trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
}

export function isCorrect(q: Question, given: string): boolean {
  return normalize(given) === normalize(q.answer);
}

export class QuestionEngine {
  constructor(
    private stats: LearningStats,
    private settings: LearningSettings,
  ) {}

  next(opts: { minDifficulty?: Difficulty } = {}): Question {
    const due = this.stats.retry.findIndex((r) => r.due <= this.stats.totalAsked);
    if (due >= 0 && !opts.minDifficulty) {
      const [r] = this.stats.retry.splice(due, 1);
      return r.q;
    }
    const subject: Subject = Math.random() * 100 < this.settings.mathPercent ? 'math' : 'reading';
    let d = pickDifficulty(this.stats.level[subject]);
    if (opts.minDifficulty && d < opts.minDifficulty) d = opts.minDifficulty;
    const q = subject === 'math' ? this.mathQuestion(d) : this.readingQuestion(d);
    this.stats.recent.push(q.id);
    if (this.stats.recent.length > 60) this.stats.recent.shift();
    return q;
  }

  private mathQuestion(d: Difficulty): Question {
    // Favor topics the child is weaker at.
    const topics = mathTopicsFor(d);
    const weights = topics.map((t) => {
      const s = this.stats.topics[t];
      if (!s || s.asked < 3) return 1.5;
      return 0.6 + (1 - s.correct / s.asked) * 2;
    });
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let topic = topics[0];
    for (let i = 0; i < topics.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        topic = topics[i];
        break;
      }
    }
    for (let tries = 0; tries < 5; tries++) {
      const q = makeMathQuestion(topic, d);
      if (!this.stats.recent.includes(q.id)) return q;
    }
    return makeMathQuestion(topic, d);
  }

  private readingQuestion(d: Difficulty): Question {
    const recent = new Set(this.stats.recent);
    let pool = READING_BANK.map((item, i) => ({ item, i })).filter((x) => x.item.difficulty === d && !recent.has(`r:${x.i}`));
    if (pool.length === 0) pool = READING_BANK.map((item, i) => ({ item, i })).filter((x) => !recent.has(`r:${x.i}`));
    if (pool.length === 0) pool = READING_BANK.map((item, i) => ({ item, i }));
    const { item, i } = pick(pool);
    return {
      id: `r:${i}`,
      subject: 'reading',
      topic: item.topic,
      difficulty: item.difficulty,
      prompt: item.prompt,
      input: 'choice',
      answer: item.answer,
      choices: shuffle([item.answer, ...item.wrong]),
      explanation: item.explanation,
    };
  }

  record(q: Question, correct: boolean): void {
    const s = this.stats;
    s.totalAsked++;
    if (correct) s.totalCorrect++;
    const t = (s.topics[q.topic] ??= { asked: 0, correct: 0, subject: q.subject });
    t.asked++;
    if (correct) t.correct++;
    const day = (s.days[today()] ??= { asked: 0, correct: 0 });
    day.asked++;
    if (correct) day.correct++;

    s.level[q.subject] = clamp(s.level[q.subject] + (correct ? 0.12 : -0.22), 1, 3.49);

    if (!correct && !s.retry.some((r) => r.q.id === q.id)) {
      // Ask it again in a few questions with fresh answer order.
      const again = { ...q, choices: q.choices ? shuffle([...q.choices]) : undefined };
      s.retry.push({ q: again, due: s.totalAsked + 3 + Math.floor(Math.random() * 4) });
      if (s.retry.length > 15) s.retry.shift();
    }
  }
}
