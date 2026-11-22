import { supabase, isSupabaseConfigured } from './supabase';
import { getJSON, setJSON } from './storage';
import type { GameModeId, VoteChoice } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type RoomStatus = 'lobby' | 'playing' | 'closed';

export interface RoomState {
  id: string;
  code: string;
  status: RoomStatus;
  mode: GameModeId;
  currentRound: number;
  totalRounds: number;
  questionIds: string[];
  votingOpen: boolean;
}

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  connected: boolean;
}

export interface RoomSnapshot {
  room: RoomState;
  players: RoomPlayer[];
  votes: { round: number; playerId: string; choice: VoteChoice }[];
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous chars

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Device-persisted identity used for reconnection. */
export async function playerToken(): Promise<string> {
  const existing = await getJSON<string | null>('player_token', null);
  if (existing) return existing;
  const token = uuid();
  await setJSON('player_token', token);
  return token;
}

export async function createRoom(params: {
  name: string;
  avatar: string;
  mode: GameModeId;
  questionIds: string[];
  totalRounds: number;
}): Promise<{ roomId: string; code: string; playerId: string; hostToken: string }> {
  const token = await playerToken();
  const { data, error } = await supabase().rpc('create_room', {
    p_name: params.name,
    p_avatar: params.avatar,
    p_token: token,
    p_mode: params.mode,
    p_question_ids: params.questionIds,
    p_total_rounds: params.totalRounds,
    p_code: generateRoomCode(),
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return { roomId: row.room_id, code: row.code, playerId: row.player_id, hostToken: row.host_token };
}

export async function joinRoom(params: {
  code: string;
  name: string;
  avatar: string;
}): Promise<{ roomId: string; playerId: string; reconnected: boolean }> {
  const token = await playerToken();
  const { data, error } = await supabase().rpc('join_room', {
    p_code: params.code.toUpperCase().trim(),
    p_name: params.name,
    p_avatar: params.avatar,
    p_token: token,
  });
  if (error) throw new Error(mapRoomError(error.message));
  const row = data?.[0];
  return { roomId: row.room_id, playerId: row.player_id, reconnected: row.reconnected };
}

export async function submitVote(params: {
  roomId: string;
  playerId: string;
  round: number;
  choice: VoteChoice;
}): Promise<void> {
  const token = await playerToken();
  const { error } = await supabase().rpc('submit_vote', {
    p_room_id: params.roomId,
    p_player_id: params.playerId,
    p_token: token,
    p_round: params.round,
    p_choice: params.choice,
  });
  if (error) throw new Error(mapRoomError(error.message));
}

export async function hostAction(
  roomId: string,
  hostToken: string,
  action: 'start' | 'end_voting' | 'next_round' | 'close',
): Promise<void> {
  const { error } = await supabase().rpc('host_action', {
    p_room_id: roomId,
    p_host_token: hostToken,
    p_action: action,
  });
  if (error) throw new Error(mapRoomError(error.message));
}

export async function leaveRoom(roomId: string, playerId: string): Promise<void> {
  const token = await playerToken();
  try {
    await supabase().rpc('leave_room', { p_room_id: roomId, p_player_id: playerId, p_token: token });
  } catch {
    // leaving is best-effort
  }
}

export async function fetchSnapshot(roomId: string): Promise<RoomSnapshot> {
  const sb = supabase();
  const [{ data: room, error: e1 }, { data: players, error: e2 }, { data: votes, error: e3 }] =
    await Promise.all([
      sb.from('rooms').select('*').eq('id', roomId).single(),
      sb.from('room_players').select('*').eq('room_id', roomId).order('joined_at'),
      sb.from('votes').select('round, player_id, choice').eq('room_id', roomId),
    ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  if (e3) throw new Error(e3.message);
  return {
    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      mode: room.mode,
      currentRound: room.current_round,
      totalRounds: room.total_rounds,
      questionIds: room.question_ids,
      votingOpen: room.voting_open,
    },
    players: (players ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.is_host,
      connected: p.connected,
    })),
    votes: (votes ?? []).map((v: any) => ({ round: v.round, playerId: v.player_id, choice: v.choice })),
  };
}

/** Subscribe to live changes for a room. Returns an unsubscribe function. */
export function subscribeRoom(roomId: string, onChange: () => void): () => void {
  const channel: RealtimeChannel = supabase()
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe();
  return () => {
    void supabase().removeChannel(channel);
  };
}

function mapRoomError(message: string): string {
  if (message.includes('room_not_found')) return 'roomNotFound';
  if (message.includes('room_full')) return 'roomFull';
  if (message.includes('room_closed')) return 'roomClosed';
  if (message.includes('duplicate_vote')) return 'ok'; // idempotent resubmission
  return message;
}

export { isSupabaseConfigured };
