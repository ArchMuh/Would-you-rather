import type { CategoryId, Difficulty, Question } from '../../types';

/** [optionA.en, optionA.ar, optionB.en, optionB.ar, intensity?, difficulty?, tags?] */
export type Raw = [string, string, string, string, (1 | 2 | 3 | 4 | 5)?, Difficulty?, string[]?];

export function build(category: CategoryId, prefix: string, rows: Raw[]): Question[] {
  return rows.map((r, i) => ({
    id: `${prefix}-${String(i + 1).padStart(3, '0')}`,
    optionA: { en: r[0], ar: r[1] },
    optionB: { en: r[2], ar: r[3] },
    category,
    intensity: r[4] ?? 2,
    difficulty: r[5] ?? 2,
    tags: r[6] ?? [],
  }));
}
