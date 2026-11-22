import { create } from 'zustand';
import type { GameModeId, Player, Question, Vote, VoteChoice } from '../types';

export type LocalPhase = 'pass' | 'vote' | 'waiting' | 'reveal';

interface GameState {
  mode: GameModeId;
  kind: 'local' | 'online';
  deck: Question[];
  index: number; // current question index
  players: Player[];
  solo: boolean;
  currentPlayerIdx: number;
  votes: Vote[]; // votes for the current round
  phase: LocalPhase;
  skips: number;
  shownAt: number;
  startSession: (p: { mode: GameModeId; kind: 'local' | 'online'; deck: Question[]; players: Player[] }) => void;
  beginTurn: () => void;
  castVote: (choice: VoteChoice) => void;
  reveal: () => void;
  next: () => void;
  skipQuestion: () => void;
  reset: () => void;
}

export const useGame = create<GameState>((set, get) => ({
  mode: 'classic',
  kind: 'local',
  deck: [],
  index: 0,
  players: [],
  solo: false,
  currentPlayerIdx: 0,
  votes: [],
  phase: 'vote',
  skips: 0,
  shownAt: Date.now(),

  startSession: ({ mode, kind, deck, players }) =>
    set({
      mode, kind, deck, players,
      index: 0, votes: [], skips: 0,
      solo: players.length <= 1,
      currentPlayerIdx: 0,
      phase: players.length <= 1 ? 'vote' : 'pass',
      shownAt: Date.now(),
    }),

  beginTurn: () => set({ phase: 'vote', shownAt: Date.now() }),

  castVote: (choice) => {
    const s = get();
    const player = s.players[s.currentPlayerIdx];
    if (!player) return;
    if (s.votes.some((v) => v.playerId === player.id)) return; // no duplicate votes
    const votes = [...s.votes, { playerId: player.id, choice, answeredAt: Date.now() }];
    if (votes.length >= s.players.length) {
      set({ votes, phase: 'reveal' });
    } else if (s.currentPlayerIdx + 1 >= s.players.length) {
      set({ votes, phase: 'reveal' });
    } else {
      set({ votes, currentPlayerIdx: s.currentPlayerIdx + 1, phase: 'pass' });
    }
  },

  reveal: () => set({ phase: 'reveal' }),

  next: () => {
    const s = get();
    if (s.index + 1 >= s.deck.length) return;
    set({
      index: s.index + 1,
      votes: [],
      currentPlayerIdx: 0,
      phase: s.solo ? 'vote' : 'pass',
      shownAt: Date.now(),
    });
  },

  skipQuestion: () => {
    const s = get();
    set({ skips: s.skips + 1 });
    get().next();
  },

  reset: () =>
    set({ deck: [], index: 0, players: [], votes: [], phase: 'vote', skips: 0, solo: false, currentPlayerIdx: 0 }),
}));
