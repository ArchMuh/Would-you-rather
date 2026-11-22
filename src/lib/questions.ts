import { ALL_QUESTIONS } from '../data/questions';
import type { CategoryId, Difficulty, GameModeId, Question } from '../types';

export interface DeckFilter {
  mode: GameModeId;
  category?: CategoryId | 'all';
  maxIntensity?: number; // 1-5, inclusive
  difficulty?: Difficulty;
  count: number;
  excludeIds?: string[]; // recently played
  customQuestions?: Question[];
}

/** Seeded PRNG (mulberry32) so daily decks are deterministic. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function modePool(mode: GameModeId, custom: Question[]): Question[] {
  switch (mode) {
    case 'custom':
      return custom;
    case 'quick':
    case 'daily':
    case 'classic':
      // Ungated modes never draw from gated decks (adult / heat)
      return ALL_QUESTIONS.filter((q) => q.category !== 'adult' && q.category !== 'heat');
    default:
      return ALL_QUESTIONS.filter((q) => q.category === mode);
  }
}

/** Build a shuffled deck for a session, excluding recently played ids. */
export function buildDeck(filter: DeckFilter): Question[] {
  let pool = modePool(filter.mode, filter.customQuestions ?? []);

  if (filter.category && filter.category !== 'all') {
    pool = pool.filter((q) => q.category === filter.category);
  }
  if (filter.maxIntensity != null) {
    pool = pool.filter((q) => q.intensity <= filter.maxIntensity!);
  }
  if (filter.difficulty != null) {
    pool = pool.filter((q) => q.difficulty === filter.difficulty);
  }

  const exclude = new Set(filter.excludeIds ?? []);
  const fresh = pool.filter((q) => !exclude.has(q.id));
  // If everything was played recently, fall back to the full pool.
  const source = fresh.length >= filter.count ? fresh : pool;
  if (filter.mode === 'heat') {
    // Ramp: order by intensity ascending (flirty -> sensual -> desire -> invitation),
    // shuffling within each intensity level so sessions vary.
    return source
      .map((q) => ({ q, key: q.intensity + Math.random() }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.q)
      .slice(0, filter.count);
  }
  if (filter.mode === 'adult') {
    // Weight the adult deck toward arousing 'intimate'-tagged questions (~2x)
    return source
      .map((q) => ({ q, key: Math.random() * (q.tags.includes('intimate') ? 1 : 2) }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.q)
      .slice(0, filter.count);
  }
  return shuffle(source).slice(0, filter.count);
}

/** Deterministic daily question for a date key (YYYY-MM-DD). */
export function dailyQuestion(dateKey: string, custom: Question[]): Question {
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) seed = (seed * 31 + dateKey.charCodeAt(i)) | 0;
  const rand = seededRandom(seed);
  const pool = ALL_QUESTIONS.filter((q) => q.category !== 'adult' && q.category !== 'heat');
  return pool[Math.floor(rand() * pool.length)];
}

export function getQuestionById(id: string, custom: Question[]): Question | undefined {
  return custom.find((q) => q.id === id) ?? ALL_QUESTIONS.find((q) => q.id === id);
}

export function questionCount(): number {
  return ALL_QUESTIONS.length;
}
