export type Subject = 'math' | 'reading';

/** 1 = warm-up, 2 = on grade level, 3 = stretch */
export type Difficulty = 1 | 2 | 3;

export interface Question {
  /** Stable id so missed questions can be re-asked later. */
  id: string;
  subject: Subject;
  /** Short topic key used for the parent report, e.g. "mult-2x2" or "synonyms". */
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  /**
   * 'number' = child types the answer on a number pad.
   * 'choice' = child taps one of `choices`.
   */
  input: 'number' | 'choice';
  /** Always a string. For 'number' questions it is the digits only, e.g. "322". */
  answer: string;
  /** For 'choice' questions: 2-4 options, one of which equals `answer`. */
  choices?: string[];
  /** Shown after answering, right or wrong. One or two short kid-friendly sentences. */
  explanation: string;
  /**
   * "I need a teacher!" help for THIS question: how to think about it,
   * without giving away the answer. Falls back to a topic lesson if missing.
   */
  teach?: string;
}

/** A hand-written question before it gets an id/subject attached. */
export interface BankItem {
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  answer: string;
  /** Wrong options only (the answer is mixed in at random). 2-3 entries. */
  wrong: string[];
  explanation: string;
}
