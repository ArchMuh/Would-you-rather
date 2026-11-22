import { create } from 'zustand';
import { getJSON, setJSON } from '../lib/storage';
import type { AnsweredRecord, GameModeId, Question, VoteChoice } from '../types';

export interface GameHistoryEntry {
  id: string;
  mode: GameModeId;
  kind: 'local' | 'online';
  players: string[];
  rounds: number;
  at: number;
}

interface ProgressState {
  hydrated: boolean;
  favorites: string[];
  answered: AnsweredRecord[];
  history: GameHistoryEntry[];
  customQuestions: Question[];
  reportedIds: string[];
  unlockedAchievements: Record<string, number>;
  daily: { lastDate: string | null; streak: number };
  hydrate: () => Promise<void>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  recordAnswer: (r: AnsweredRecord) => void;
  recordGame: (g: GameHistoryEntry) => void;
  addCustomQuestion: (q: Question) => void;
  deleteCustomQuestion: (id: string) => void;
  reportQuestion: (id: string) => void;
  unlockAchievement: (id: string) => void;
  markDailyDone: (dateKey: string) => void;
}

const DEFAULTS = {
  favorites: [] as string[],
  answered: [] as AnsweredRecord[],
  history: [] as GameHistoryEntry[],
  customQuestions: [] as Question[],
  reportedIds: [] as string[],
  unlockedAchievements: {} as Record<string, number>,
  daily: { lastDate: null as string | null, streak: 0 },
};

const MAX_ANSWERED = 2000;
const MAX_HISTORY = 200;

export const useProgress = create<ProgressState>((set, get) => ({
  hydrated: false,
  ...DEFAULTS,
  hydrate: async () => {
    const saved = await getJSON('progress', DEFAULTS);
    set({ ...DEFAULTS, ...saved, hydrated: true });
  },
  toggleFavorite: (id) => {
    const favs = get().favorites;
    set({ favorites: favs.includes(id) ? favs.filter((f) => f !== id) : [id, ...favs] });
    persist(get);
  },
  isFavorite: (id) => get().favorites.includes(id),
  recordAnswer: (r) => {
    set({ answered: [r, ...get().answered].slice(0, MAX_ANSWERED) });
    persist(get);
  },
  recordGame: (g) => {
    set({ history: [g, ...get().history].slice(0, MAX_HISTORY) });
    persist(get);
  },
  addCustomQuestion: (q) => {
    set({ customQuestions: [q, ...get().customQuestions] });
    persist(get);
  },
  deleteCustomQuestion: (id) => {
    set({ customQuestions: get().customQuestions.filter((q) => q.id !== id) });
    persist(get);
  },
  reportQuestion: (id) => {
    if (!get().reportedIds.includes(id)) {
      set({ reportedIds: [...get().reportedIds, id] });
      persist(get);
    }
  },
  unlockAchievement: (id) => {
    if (!get().unlockedAchievements[id]) {
      set({ unlockedAchievements: { ...get().unlockedAchievements, [id]: Date.now() } });
      persist(get);
    }
  },
  markDailyDone: (dateKey) => {
    const { daily } = get();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = daily.lastDate === yesterday ? daily.streak + 1 : 1;
    set({ daily: { lastDate: dateKey, streak } });
    persist(get);
  },
}));

function persist(get: () => ProgressState) {
  const s = get();
  void setJSON('progress', {
    favorites: s.favorites,
    answered: s.answered,
    history: s.history,
    customQuestions: s.customQuestions,
    reportedIds: s.reportedIds,
    unlockedAchievements: s.unlockedAchievements,
    daily: s.daily,
  });
}
