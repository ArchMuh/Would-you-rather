import { create } from 'zustand';
import {
  RoomSnapshot, fetchSnapshot, subscribeRoom, isSupabaseConfigured,
} from '../lib/rooms';

interface OnlineState {
  configured: boolean;
  roomId: string | null;
  playerId: string | null;
  hostToken: string | null;
  snapshot: RoomSnapshot | null;
  connecting: boolean;
  error: string | null;
  setSession: (p: { roomId: string; playerId: string; hostToken?: string | null }) => void;
  refresh: () => Promise<void>;
  attach: () => () => void;
  clear: () => void;
}

export const useOnline = create<OnlineState>((set, get) => ({
  configured: isSupabaseConfigured,
  roomId: null,
  playerId: null,
  hostToken: null,
  snapshot: null,
  connecting: false,
  error: null,

  setSession: ({ roomId, playerId, hostToken }) =>
    set({ roomId, playerId, hostToken: hostToken ?? null, error: null }),

  refresh: async () => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      const snapshot = await fetchSnapshot(roomId);
      set({ snapshot, error: null });
    } catch (e: any) {
      set({ error: e?.message ?? 'error' });
    }
  },

  attach: () => {
    const { roomId } = get();
    if (!roomId) return () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void get().refresh(), 120);
    };
    const unsubscribe = subscribeRoom(roomId, debounced);
    void get().refresh();
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  },

  clear: () => set({ roomId: null, playerId: null, hostToken: null, snapshot: null, error: null }),
}));
