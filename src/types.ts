export type Language = 'en' | 'ar';

export type CategoryId =
  | 'classic'
  | 'friends'
  | 'couples'
  | 'deep'
  | 'extreme'
  | 'funny'
  | 'adult' | 'heat';

export type GameModeId =
  | 'classic'
  | 'friends'
  | 'couples'
  | 'deep'
  | 'extreme'
  | 'funny'
  | 'adult' | 'heat'
  | 'custom'
  | 'quick'
  | 'daily';

export type Difficulty = 1 | 2 | 3; // 1 light, 2 medium, 3 hard

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface Question {
  id: string;
  optionA: LocalizedText;
  optionB: LocalizedText;
  category: CategoryId;
  difficulty: Difficulty;
  /** 1 = light/fun, 5 = very intense */
  intensity: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  /** true for user-created questions */
  custom?: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // avatar key from AVATARS
}

export type VoteChoice = 'A' | 'B';

export interface Vote {
  playerId: string;
  choice: VoteChoice;
  answeredAt: number; // ms timestamp
}

export interface RoundResult {
  questionId: string;
  votes: Vote[];
  revealedAt: number;
}

export interface GameSession {
  id: string;
  mode: GameModeId;
  kind: 'local' | 'online';
  questionIds: string[];
  currentIndex: number;
  players: Player[];
  results: RoundResult[];
  startedAt: number;
  endedAt?: number;
}

export interface AnsweredRecord {
  questionId: string;
  choice: VoteChoice;
  majorityChoice: VoteChoice | null; // null when unknown (solo local)
  mode: GameModeId;
  at: number;
  timeToAnswerMs: number;
}

export interface Achievement {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  icon: string; // emoji
  unlockedAt?: number;
}

export interface CustomQuestionDraft {
  optionA: string;
  optionB: string;
  category: CategoryId;
  intensity: Question['intensity'];
}
