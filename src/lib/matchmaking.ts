import type { Player, Vote } from '../types';

export interface PairMatch {
  a: Player;
  b: Player;
  same: number;
  total: number; // rounds where both answered
  pct: number; // 0-100
}

export interface MatchResults {
  pairs: PairMatch[]; // sorted best first
  best: PairMatch | null;
  oddOneOut: { player: Player; avgPct: number } | null;
}

/** Pair every player against every other based on their recorded per-round picks. */
export function computeMatches(players: Player[], history: Vote[][]): MatchResults {
  const named = players.filter((p) => p.name.trim().length > 0);
  const pairs: PairMatch[] = [];
  for (let i = 0; i < named.length; i++) {
    for (let j = i + 1; j < named.length; j++) {
      let same = 0;
      let total = 0;
      for (const round of history) {
        const va = round.find((v) => v.playerId === named[i].id)?.choice;
        const vb = round.find((v) => v.playerId === named[j].id)?.choice;
        if (va == null || vb == null) continue;
        total++;
        if (va === vb) same++;
      }
      if (total === 0) continue;
      pairs.push({ a: named[i], b: named[j], same, total, pct: Math.round((same / total) * 100) });
    }
  }
  pairs.sort((x, y) => y.pct - x.pct || y.same - x.same);

  let oddOneOut: MatchResults['oddOneOut'] = null;
  if (named.length >= 3 && pairs.length > 0) {
    // Lowest average compatibility across all their pairs
    let worst: { player: Player; avgPct: number } | null = null;
    for (const p of named) {
      const mine = pairs.filter((m) => m.a.id === p.id || m.b.id === p.id);
      if (mine.length === 0) continue;
      const avg = Math.round(mine.reduce((s, m) => s + m.pct, 0) / mine.length);
      if (!worst || avg < worst.avgPct) worst = { player: p, avgPct: avg };
    }
    oddOneOut = worst;
  }

  return { pairs, best: pairs[0] ?? null, oddOneOut };
}

export type VerdictTier = 'perfect' | 'great' | 'sparks' | 'opposites';

export function verdictTier(pct: number): VerdictTier {
  if (pct >= 80) return 'perfect';
  if (pct >= 60) return 'great';
  if (pct >= 40) return 'sparks';
  return 'opposites';
}
